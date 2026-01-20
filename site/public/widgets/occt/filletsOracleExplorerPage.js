// @ts-check
import { el, fmt, listKV } from './dom.js';
import { initOnPageEvents } from './init.js';
import { fetchJson, resolveUrl } from './url.js';
import { createThreeViewer } from './viewer.js';

function titleizeCaseId(id) {
  const s = String(id || '').replace(/_/g, ' ').trim();
  if (!s) return 'Case';
  return s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function meshKindLabel(kind) {
  return kind === 'result' ? 'Result' : 'Input';
}

function meshUrl(caseName, kind) {
  const safe = encodeURIComponent(caseName);
  return resolveUrl(`/occt/artifacts/fillets/${safe}/${kind}.mesh.json`);
}

function statusBadge(kind, text) {
  const cls =
    kind === 'ok'
      ? 'foe__badge foe__badge--ok'
      : kind === 'bad'
        ? 'foe__badge foe__badge--bad'
        : 'foe__badge foe__badge--warn';
  return el('span', { class: cls }, [text]);
}

function computeStripeSummary(c) {
  const contours = Array.isArray(c?.build?.contours) ? c.build.contours : [];
  const names = contours.map((x) => String(x?.stripe_status_name || x?.stripe_status || 'N/A'));
  const unique = Array.from(new Set(names)).filter((s) => s && s !== 'N/A');
  if (!unique.length) return 'N/A';
  if (unique.length === 1) return unique[0];
  return unique.join(', ');
}

function renderCompare(primaryId, primary, compareId, compare, diffOnly) {
  const pBuild = primary?.build || {};
  const pResult = primary?.result || {};
  const cBuild = compare?.build || {};
  const cResult = compare?.result || {};

  const pTitle = titleizeCaseId(primaryId);
  const cTitle = titleizeCaseId(compareId);

  const header = el('div', { class: 'foe__cardHeader' }, [
    el('div', {}, [el('h3', { class: 'foe__cardTitle' }, ['Compare']), el('div', { class: 'foe__cardId' }, ['Primary vs Compare'])]),
  ]);

  const rows = [
    ['kind', primary?.kind, compare?.kind],
    ['is_done', pBuild.is_done, cBuild.is_done],
    ['did_throw', pBuild.did_throw, cBuild.did_throw],
    ['exception', pBuild.exception, cBuild.exception],
    ['stripe_status', computeStripeSummary(primary), computeStripeSummary(compare)],
    ['nb_contours', pBuild.nb_contours, cBuild.nb_contours],
    ['nb_faulty_contours', pBuild.nb_faulty_contours, cBuild.nb_faulty_contours],
    ['nb_faulty_vertices', pBuild.nb_faulty_vertices, cBuild.nb_faulty_vertices],
    ['has_result', pBuild.has_result, cBuild.has_result],
    ['result.is_valid', pResult.is_valid, cResult.is_valid],
    [
      'result.counts',
      pResult.counts
        ? `solids=${pResult.counts.solids}, faces=${pResult.counts.faces}, edges=${pResult.counts.edges}, vertices=${pResult.counts.vertices}`
        : null,
      cResult.counts
        ? `solids=${cResult.counts.solids}, faces=${cResult.counts.faces}, edges=${cResult.counts.edges}, vertices=${cResult.counts.vertices}`
        : null,
    ],
  ];

  const tableBody = el(
    'tbody',
    {},
    rows
      .map(([k, pv, cv]) => {
        const p = fmt(pv);
        const c = fmt(cv);
        const differs = p !== c;
        if (diffOnly && !differs) return null;
        return el('tr', { class: differs ? 'foe__diff' : '' }, [
          el('td', { class: 'foe__k' }, [k]),
          el('td', { class: 'foe__v' }, [p]),
          el('td', { class: 'foe__v' }, [c]),
        ]);
      })
      .filter(Boolean),
  );

  const table = el('table', { class: 'foe__table foe__compare' }, [
    el('thead', {}, [el('tr', {}, [el('th', {}, ['metric']), el('th', {}, [pTitle]), el('th', {}, [cTitle])])]),
    tableBody,
  ]);

  const contoursP = Array.isArray(pBuild.contours) ? pBuild.contours : [];
  const contoursC = Array.isArray(cBuild.contours) ? cBuild.contours : [];

  const contoursTable = (label, contours) =>
    el('table', { class: 'foe__table' }, [
      el('thead', {}, [
        el('tr', {}, [el('th', {}, [label]), el('th', {}, ['nb_edges']), el('th', {}, ['stripe_status']), el('th', {}, ['computed_surface_types'])]),
      ]),
      el(
        'tbody',
        {},
        contours.map((row) =>
          el('tr', {}, [
            el('td', {}, [fmt(row.ic)]),
            el('td', {}, [fmt(row.nb_edges)]),
            el('td', {}, [fmt(row.stripe_status_name || row.stripe_status)]),
            el('td', {}, [listKV(row.computed_surface_types)]),
          ]),
        ),
      ),
    ]);

  const mkBadges = (c) => {
    const b = c?.build || {};
    const r = c?.result || {};
    return el('div', { class: 'foe__badges' }, [
      statusBadge(String(c?.kind) === 'fillet' ? 'ok' : 'warn', String(c?.kind || 'case')),
      statusBadge(b.is_done ? 'ok' : 'bad', b.is_done ? 'done' : 'not done'),
      statusBadge(r.is_valid ? 'ok' : 'warn', r.is_valid ? 'valid' : 'invalid'),
    ]);
  };

  const details = el('details', { class: 'foe__details', open: false }, [
    el('summary', {}, ['Contours (per contour status + surface types)']),
    el('div', { class: 'foe__out' }, [
      el('div', { class: 'foe__card' }, [
        el('div', { class: 'foe__cardHeader' }, [
          el('div', {}, [el('h3', { class: 'foe__cardTitle' }, [pTitle]), el('div', { class: 'foe__cardId' }, [primaryId])]),
          mkBadges(primary),
        ]),
        contoursTable('ic', contoursP),
      ]),
      el('div', { class: 'foe__card' }, [
        el('div', { class: 'foe__cardHeader' }, [
          el('div', {}, [el('h3', { class: 'foe__cardTitle' }, [cTitle]), el('div', { class: 'foe__cardId' }, [compareId])]),
          mkBadges(compare),
        ]),
        contoursTable('ic', contoursC),
      ]),
    ]),
  ]);

  return el('div', { class: 'foe__card' }, [header, table, details]);
}

function renderSingle(caseId, c) {
  const build = c?.build || {};
  const result = c?.result || {};
  const title = titleizeCaseId(caseId);

  const badges = el('div', { class: 'foe__badges' }, [
    statusBadge(String(c?.kind) === 'fillet' ? 'ok' : 'warn', String(c?.kind || 'case')),
    statusBadge(build.is_done ? 'ok' : 'bad', build.is_done ? 'done' : 'not done'),
    statusBadge(result.is_valid ? 'ok' : 'warn', result.is_valid ? 'valid' : 'invalid'),
  ]);

  const header = el('div', { class: 'foe__cardHeader' }, [
    el('div', {}, [el('h3', { class: 'foe__cardTitle' }, [title]), el('div', { class: 'foe__cardId' }, [caseId])]),
    badges,
  ]);

  const rows = [
    ['stripe_status', computeStripeSummary(c)],
    ['nb_contours', build.nb_contours],
    ['nb_faulty_contours', build.nb_faulty_contours],
    ['nb_faulty_vertices', build.nb_faulty_vertices],
    ['exception', build.exception],
  ];

  const summary = el('table', { class: 'foe__table foe__compare' }, [
    el(
      'tbody',
      {},
      rows.map(([k, v]) => el('tr', {}, [el('td', { class: 'foe__k' }, [String(k)]), el('td', { class: 'foe__v' }, [fmt(v)])])),
    ),
  ]);

  const contours = Array.isArray(build.contours) ? build.contours : [];
  const contourTable = el('table', { class: 'foe__table' }, [
    el('thead', {}, [el('tr', {}, [el('th', {}, ['ic']), el('th', {}, ['nb_edges']), el('th', {}, ['stripe_status']), el('th', {}, ['computed_surface_types'])])]),
    el(
      'tbody',
      {},
      contours.map((row) =>
        el('tr', {}, [
          el('td', {}, [fmt(row.ic)]),
          el('td', {}, [fmt(row.nb_edges)]),
          el('td', {}, [fmt(row.stripe_status_name || row.stripe_status)]),
          el('td', {}, [listKV(row.computed_surface_types)]),
        ]),
      ),
    ),
  ]);

  const details = el('details', { class: 'foe__details', open: false }, [el('summary', {}, ['Contours']), contourTable]);
  return el('div', { class: 'foe__card' }, [header, summary, details]);
}

async function initOne(root) {
  const oracleUrl = root.dataset.oracleUrl || '/occt/oracles/fillets.json';

  const primarySel = root.querySelector('select[data-foe-primary]');
  const compareSel = root.querySelector('select[data-foe-compare]');
  const out = root.querySelector('[data-foe-out]');
  const viewerEl = root.querySelector('[data-foe-viewer]');
  const viewerStatusEl = root.querySelector('[data-foe-viewer-status]');
  const viewerTitleEl = root.querySelector('[data-foe-viewer-title]');
  const diffOnlyEl = root.querySelector('input[data-foe-diff-only]');
  const meshKindEls = Array.from(root.querySelectorAll('input[data-foe-mesh-kind]'));
  const viewTargetEls = Array.from(root.querySelectorAll('input[data-foe-view-target]'));
  const fitBtn = root.querySelector('button[data-foe-fit]');
  const resetBtn = root.querySelector('button[data-foe-reset]');
  const wireEl = root.querySelector('input[data-foe-wireframe]');
  const edgesEl = root.querySelector('input[data-foe-edges]');
  const downloadEl = root.querySelector('a[data-foe-download]');

  if (!primarySel || !compareSel || !out || !viewerEl) return;
  if (root.dataset.foeInitialized === '1') return;

  const setStatus = (msg) => {
    if (!viewerStatusEl) return;
    viewerStatusEl.textContent = msg || '';
  };

  let data;
  try {
    root.dataset.foeInitialized = '1';
    data = await fetchJson(oracleUrl);
  } catch (e) {
    delete root.dataset.foeInitialized;
    out.textContent = `Failed to load oracle JSON: ${String(e)}`;
    setStatus('');
    return;
  }

  const cases = data?.cases || {};
  const names = Object.keys(cases).sort();
  if (!names.length) {
    out.textContent = 'No cases found in oracle JSON.';
    setStatus('');
    return;
  }

  const viewer = createThreeViewer(viewerEl, setStatus);

  const setOptions = (select, ids, selected) => {
    select.replaceChildren();
    for (const id of ids) {
      const opt = el('option', { value: id }, [titleizeCaseId(id)]);
      opt.title = id;
      if (id === selected) opt.selected = true;
      select.appendChild(opt);
    }
  };

  setOptions(primarySel, names, names[0]);
  setOptions(compareSel, names, names.length > 1 ? names[1] : names[0]);

  const getMeshKind = () => (meshKindEls.find((n) => n.checked) || {}).value || 'input';
  const getViewTarget = () => (viewTargetEls.find((n) => n.checked) || {}).value || 'primary';
  const getDiffOnly = () => Boolean(diffOnlyEl?.checked);

  const updateViewerTitle = (caseId, meshKind, target) => {
    if (!viewerTitleEl) return;
    const who = target === 'compare' ? 'Compare' : 'Primary';
    const title = titleizeCaseId(caseId);
    viewerTitleEl.textContent = `${who} · ${meshKindLabel(meshKind)} · ${title}`;
    viewerTitleEl.title = `${who} · ${meshKindLabel(meshKind)} · ${caseId}`;
  };

  const render = () => {
    out.replaceChildren();
    const primaryName = primarySel.value;
    const compareName = compareSel.value;

    const hasCompare = Boolean(compareName && compareName !== primaryName);
    const diffOnly = getDiffOnly();
    if (hasCompare) out.appendChild(renderCompare(primaryName, cases[primaryName] || {}, compareName, cases[compareName] || {}, diffOnly));
    else out.appendChild(renderSingle(primaryName, cases[primaryName] || {}));

    const meshKind = getMeshKind();
    const target = getViewTarget();
    const targetCase = target === 'compare' && hasCompare ? compareName : primaryName;
    updateViewerTitle(targetCase, meshKind, target);

    const url = meshUrl(targetCase, meshKind);
    viewer.setMeshFromUrl(url);
    viewer.setWireframe(Boolean(wireEl?.checked));
    viewer.setEdges(Boolean(edgesEl?.checked));

    if (downloadEl) {
      downloadEl.href = url;
      downloadEl.download = `${targetCase}.${meshKind}.mesh.json`;
      downloadEl.textContent = `Download ${meshKindLabel(meshKind)}`;
      downloadEl.title = url;
    }
  };

  primarySel.addEventListener('change', render);
  compareSel.addEventListener('change', render);
  for (const el of meshKindEls) el.addEventListener('change', render);
  for (const el of viewTargetEls) el.addEventListener('change', render);
  diffOnlyEl?.addEventListener('change', render);
  wireEl?.addEventListener('change', render);
  edgesEl?.addEventListener('change', render);
  fitBtn?.addEventListener('click', () => viewer.fitView());
  resetBtn?.addEventListener('click', () => viewer.resetView());

  render();
}

export function initFilletsOracleExplorer() {
  for (const root of Array.from(document.querySelectorAll('[data-foe]'))) {
    void initOne(root);
  }
}

initOnPageEvents(initFilletsOracleExplorer);

