// @ts-check
import { el } from './dom.js';
import { initOnPageEvents } from './init.js';
import { fetchJson, resolveUrl } from './url.js';
import { createThreeViewer } from './viewer.js';

function sessionRegistryUrl() {
  return resolveUrl('/occt/draw/index.json');
}

function sessionIndexUrl(sessionId) {
  const safe = encodeURIComponent(String(sessionId || ''));
  return resolveUrl(`/occt/draw/${safe}/index.json`);
}

function meshUrl(sessionId, meshFile) {
  const s = encodeURIComponent(String(sessionId || ''));
  const m = encodeURIComponent(String(meshFile || ''));
  return resolveUrl(`/occt/draw/${s}/${m}`);
}

function titleize(s) {
  const v = String(s || '').replace(/[_-]+/g, ' ').trim();
  return v ? v.replace(/\b([a-z])/g, (m) => m.toUpperCase()) : 'Step';
}

async function initOne(root) {
  const sessionSel = root.querySelector('select[data-dse-session]');
  const stepSel = root.querySelector('select[data-dse-step]');
  const viewerEl = root.querySelector('[data-dse-viewer]');
  const viewerTitleEl = root.querySelector('[data-dse-viewer-title]');
  const viewerStatusEl = root.querySelector('[data-dse-viewer-status]');
  const logEl = root.querySelector('[data-dse-log]');
  const logWrapEl = root.querySelector('[data-dse-log-wrap]');
  const fitBtn = root.querySelector('button[data-dse-fit]');
  const resetBtn = root.querySelector('button[data-dse-reset]');
  const wireEl = root.querySelector('input[data-dse-wireframe]');
  const edgesEl = root.querySelector('input[data-dse-edges]');

  if (!sessionSel || !stepSel || !viewerEl) return;
  if (root.dataset.dseInitialized === '1') return;
  root.dataset.dseInitialized = '1';

  const setStatus = (msg) => {
    if (!viewerStatusEl) return;
    viewerStatusEl.textContent = msg || '';
  };

  const viewer = createThreeViewer(viewerEl, setStatus);
  const updateTitle = (sessionId, stepId) => {
    if (!viewerTitleEl) return;
    viewerTitleEl.textContent = `${sessionId || 'Session'} · ${stepId || 'Step'}`;
  };

  const applyViewerOptions = () => {
    viewer.setWireframe(Boolean(wireEl?.checked));
    viewer.setEdges(Boolean(edgesEl?.checked));
  };

  wireEl?.addEventListener('change', applyViewerOptions);
  edgesEl?.addEventListener('change', applyViewerOptions);
  fitBtn?.addEventListener('click', () => viewer.fitView());
  resetBtn?.addEventListener('click', () => viewer.resetView());

  let sessions = [];
  try {
    const reg = await fetchJson(sessionRegistryUrl());
    sessions = Array.isArray(reg?.sessions) ? reg.sessions : [];
  } catch (e) {
    setStatus(`Failed to load draw registry: ${String(e)}`);
    return;
  }

  const ids = sessions.map((s) => String(s?.session || '')).filter(Boolean);
  if (!ids.length) {
    setStatus('No draw sessions published yet. Use tools/draw_to_site.py to publish one.');
    return;
  }

  sessionSel.replaceChildren(...ids.map((id) => el('option', { value: id }, [titleize(id)])));

  let currentSession = ids[0];
  let currentIndex = null;

  const loadLog = async (sessionId, idx) => {
    const logFile = idx?.log;
    if (!logWrapEl || !logEl) return;
    if (!logFile) {
      logWrapEl.style.display = 'none';
      return;
    }
    try {
      const url = resolveUrl(`/occt/draw/${encodeURIComponent(sessionId)}/${encodeURIComponent(logFile)}`);
      const res = await fetch(url);
      const text = await res.text();
      logEl.textContent = text;
      logWrapEl.style.display = '';
    } catch (e) {
      logWrapEl.style.display = '';
      logEl.textContent = `Failed to load log: ${String(e)}`;
    }
  };

  const loadSession = async (sessionId) => {
    currentSession = String(sessionId || '');
    setStatus('Loading session…');
    try {
      const idx = await fetchJson(sessionIndexUrl(currentSession));
      currentIndex = idx;
    } catch (e) {
      setStatus(`Failed to load session index: ${String(e)}`);
      return;
    }

    const steps = Array.isArray(currentIndex?.steps) ? currentIndex.steps : [];
    if (!steps.length) {
      setStatus('Session has no steps.');
      return;
    }

    stepSel.replaceChildren(
      ...steps.map((s) => {
        const id = String(s?.id || '');
        return el('option', { value: id }, [id ? titleize(id) : 'Step']);
      }),
    );

    await loadLog(currentSession, currentIndex);

    // Load first step
    await loadStep(steps[0]?.id || '');
    setStatus('');
  };

  const loadStep = async (stepId) => {
    const steps = Array.isArray(currentIndex?.steps) ? currentIndex.steps : [];
    const st = steps.find((s) => String(s?.id) === String(stepId)) || steps[0];
    if (!st) return;
    updateTitle(currentSession, st.id);
    applyViewerOptions();
    viewer.setMeshFromUrl(meshUrl(currentSession, st.mesh));
  };

  sessionSel.addEventListener('change', () => void loadSession(sessionSel.value));
  stepSel.addEventListener('change', () => void loadStep(stepSel.value));

  await loadSession(currentSession);
}

export function initDrawSessionExplorer() {
  for (const root of Array.from(document.querySelectorAll('[data-dse]'))) {
    void initOne(root);
  }
}

initOnPageEvents(initDrawSessionExplorer);

