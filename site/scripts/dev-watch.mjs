import chokidar from 'chokidar';
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');
const docsRoot = path.join(siteRoot, 'src', 'content', 'docs');

function spawnChecked(command, args, options) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: 'inherit', ...options });
		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
		});
	});
}

async function listFilesRecursive(rootDir) {
	const out = [];
	async function walk(dir) {
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const ent of entries) {
			const full = path.join(dir, ent.name);
			if (ent.isDirectory()) await walk(full);
			else if (ent.isFile()) out.push(path.relative(rootDir, full));
		}
	}
	await walk(rootDir);
	out.sort();
	return out;
}

let astro = null;
let restartingAstro = false;
function startAstro() {
	console.log('[watch] starting astro dev server...');
	restartingAstro = false;
	astro = spawn('astro', ['dev'], { cwd: siteRoot, stdio: 'inherit' });
	astro.on('exit', (code) => {
		if (restartingAstro) return;
		shutdown(code ?? 0);
	});
}

async function stopAstro() {
	if (!astro) return;
	return new Promise((resolve) => {
		const proc = astro;
		astro = null;
		restartingAstro = true;
		proc.once('exit', () => resolve());
		try {
			proc.kill('SIGINT');
		} catch {
			resolve();
		}
	});
}

let syncing = false;
let syncQueued = false;
let syncTimer = null;
let lastDocsSnapshot = null;

async function syncOnce() {
	if (syncing) {
		syncQueued = true;
		return;
	}
	syncing = true;
	try {
		await spawnChecked('npm', ['run', 'sync'], { cwd: siteRoot });
		const after = await listFilesRecursive(docsRoot);
		const afterKey = after.join('\n');

		if (lastDocsSnapshot && lastDocsSnapshot !== afterKey) {
			console.log('[watch] docs tree changed; restarting astro dev server...');
			await stopAstro();
			startAstro();
		}
		lastDocsSnapshot = afterKey;
	} finally {
		syncing = false;
		if (syncQueued) {
			syncQueued = false;
			queueSync();
		}
	}
}

function queueSync() {
	if (syncTimer) clearTimeout(syncTimer);
	syncTimer = setTimeout(() => {
		syncTimer = null;
		void syncOnce();
	}, 200);
}

const watchTargets = [
	path.join(repoRoot, 'notes'),
	path.join(repoRoot, 'repros'),
	path.join(repoRoot, 'backlog', 'docs'),
];

const ignored = [
	'**/.git/**',
	'**/.cache/**',
	'**/.local/**',
	'**/.venv/**',
	'**/build-occt/**',
	'**/occt/**',
];

console.log('[watch] initial sync...');
await syncOnce();

startAstro();

const watcher = chokidar.watch(watchTargets, {
	ignoreInitial: true,
	ignored,
	awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
});

watcher.on('all', (eventName, changedPath) => {
	console.log(`[watch] ${eventName}: ${path.relative(repoRoot, changedPath)}`);
	queueSync();
});

function shutdown(code) {
	try {
		void watcher.close();
	} catch {}
	try {
		astro?.kill('SIGINT');
	} catch {}
	process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
