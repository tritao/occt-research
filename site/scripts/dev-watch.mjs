import chokidar from 'chokidar';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');

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

let syncing = false;
let syncQueued = false;
let syncTimer = null;

async function syncOnce() {
	if (syncing) {
		syncQueued = true;
		return;
	}
	syncing = true;
	try {
		await spawnChecked('npm', ['run', 'sync'], { cwd: siteRoot });
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

console.log('[watch] starting astro dev server...');
const astro = spawn('astro', ['dev'], { cwd: siteRoot, stdio: 'inherit' });

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
		astro.kill('SIGINT');
	} catch {}
	process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
astro.on('exit', (code) => shutdown(code ?? 0));

