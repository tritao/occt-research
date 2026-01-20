// @ts-check
import * as THREE from 'three';
import { el, fmt } from './dom.js';
import { initOnPageEvents } from './init.js';
import { fetchJson, resolveUrl } from './url.js';
import { createThreeViewer } from './viewer.js';

function titleizeCaseId(id) {
  const s = String(id || '').replace(/_/g, ' ').trim();
  if (!s) return 'Case';
  return s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function meshUrl(caseName, kind) {
  const safe = encodeURIComponent(caseName);
  return resolveUrl(`/occt/artifacts/fillets/${safe}/${kind}.mesh.json`);
}

function modelUrl(caseName) {
  const safe = encodeURIComponent(caseName);
  return resolveUrl(`/occt/artifacts/fillets/${safe}/model.json`);
}

const COLORS = {
  spine: 0xffcc66,
  spineStart: 0x22c55e,
  spineEnd: 0xef4444,
  faceS1: 0x22c55e,
  faceS2: 0xfb923c,
  patchA: 0x7fb4ff,
  patchB: 0xa78bfa,
  patchC: 0x34d399,
  patchD: 0xf472b6,
  patchE: 0xfbbf24,
  onS1: 0x22c55e,
  onS2: 0xfb923c,
  points: 0xff4d4d,
  selected: 0x6366f1,
};

const PATCH_COLORS = [COLORS.patchA, COLORS.patchB, COLORS.patchC, COLORS.patchD, COLORS.patchE];

function makeLine(points, color, opacity = 1) {
  if (!Array.isArray(points) || points.length < 6) return null;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthTest: false,
    depthWrite: false,
  });
  const line = new THREE.Line(geom, mat);
  line.renderOrder = 30;
  return line;
}

function makeTube(points, color, radius = 0.05, opacity = 1) {
  if (!Array.isArray(points) || points.length < 6) return null;
  const vs = [];
  for (let i = 0; i + 2 < points.length; i += 3) {
    vs.push(new THREE.Vector3(Number(points[i]) || 0, Number(points[i + 1]) || 0, Number(points[i + 2]) || 0));
  }
  if (vs.length < 2) return null;
  const curve = new THREE.CatmullRomCurve3(vs, false, 'centripetal');
  const segments = Math.min(300, Math.max(20, vs.length * 6));
  const geom = new THREE.TubeGeometry(curve, segments, radius, 10, false);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = 35;
  return mesh;
}

function makeSphere(p, color, radius) {
  if (!Array.isArray(p) || p.length !== 3) return null;
  const geom = new THREE.SphereGeometry(radius, 12, 10);
  const mat = new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0);
  mesh.renderOrder = 40;
  return mesh;
}

function clearGroup(group) {
  for (const child of Array.from(group.children)) {
    group.remove(child);
    try {
      child.geometry?.dispose?.();
    } catch {}
    try {
      child.material?.dispose?.();
    } catch {}
  }
}

function kv(rows) {
  return el(
    'div',
    { class: 'cme__kv' },
    rows.flatMap(([k, v]) => [el('div', { class: 'cme__k' }, [String(k)]), el('div', { class: 'cme__v' }, [fmt(v)])]),
  );
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function spineArc(spinePoints) {
  const pts = Array.isArray(spinePoints) ? spinePoints : [];
  const n = Math.floor(pts.length / 3);
  const cum = new Float32Array(n);
  let total = 0;
  for (let i = 1; i < n; i++) {
    const ax = pts[(i - 1) * 3 + 0],
      ay = pts[(i - 1) * 3 + 1],
      az = pts[(i - 1) * 3 + 2];
    const bx = pts[i * 3 + 0],
      by = pts[i * 3 + 1],
      bz = pts[i * 3 + 2];
    const dx = bx - ax,
      dy = by - ay,
      dz = bz - az;
    total += Math.sqrt(dx * dx + dy * dy + dz * dz);
    cum[i] = total;
  }
  return { pts, n, cum, total };
}

function posAtFraction(arc, f) {
  const { pts, n, cum, total } = arc;
  if (!n) return new THREE.Vector3(0, 0, 0);
  if (n === 1) return new THREE.Vector3(pts[0], pts[1], pts[2]);
  const t = clamp01(f) * (total || 1);
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  const i = Math.max(1, lo);
  const t0 = cum[i - 1];
  const t1 = cum[i];
  const w = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
  const ax = pts[(i - 1) * 3 + 0],
    ay = pts[(i - 1) * 3 + 1],
    az = pts[(i - 1) * 3 + 2];
  const bx = pts[i * 3 + 0],
    by = pts[i * 3 + 1],
    bz = pts[i * 3 + 2];
  return new THREE.Vector3(ax + (bx - ax) * w, ay + (by - ay) * w, az + (bz - az) * w);
}

function extractSegmentPoints(arc, f0, f1) {
  const { pts, n, cum, total } = arc;
  if (!n) return [];
  const a = clamp01(Math.min(f0, f1));
  const b = clamp01(Math.max(f0, f1));
  const t0 = a * (total || 1);
  const t1 = b * (total || 1);
  const out = [];

  const pushVec = (v) => out.push(v.x, v.y, v.z);

  pushVec(posAtFraction(arc, a));
  for (let i = 1; i < n - 1; i++) {
    const ct = cum[i];
    if (ct > t0 && ct < t1) {
      out.push(pts[i * 3 + 0], pts[i * 3 + 1], pts[i * 3 + 2]);
    }
  }
  pushVec(posAtFraction(arc, b));
  return out.length >= 6 ? out : [];
}

function pickDefaultStripe(model) {
  const stripes = Array.isArray(model?.stripes) ? model.stripes : [];
  return stripes.length ? 0 : -1;
}

function isAuxStripe(stripe) {
  const ci = Number(stripe?.contour_index ?? -1);
  if (ci < 0) return true;
  const status = String(stripe?.stripe_status_name ?? '').trim().toLowerCase();
  if (status === 'n/a') return true;
  return false;
}

function visibleStripes(model, showAux) {
  const stripes = Array.isArray(model?.stripes) ? model.stripes : [];
  return showAux ? stripes : stripes.filter((s) => !isAuxStripe(s));
}

function pickDefaultVisibleStripe(model, showAux) {
  const stripes = visibleStripes(model, showAux);
  return stripes.length ? 0 : -1;
}

function pickDefaultCornerIndex(corners) {
  const list = Array.isArray(corners) ? corners : [];
  if (!list.length) return 0;
  let bestIndex = 0;
  let bestDegree = -Infinity;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    const refs = Array.isArray(c?.refs) ? c.refs : [];
    const degree = Number(c?.degree ?? refs.length) || 0;
    if (degree > bestDegree) {
      bestDegree = degree;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function computeStripeParamRange(stripe) {
  const surfData = Array.isArray(stripe?.surfData) ? stripe.surfData : [];
  if (!surfData.length) return { uMin: 0, uMax: 1 };
  const uMin = Math.min(...surfData.map((s) => Number(s?.ufspine ?? s?.FirstSpineParam ?? 0)));
  const uMax = Math.max(...surfData.map((s) => Number(s?.ulspine ?? s?.LastSpineParam ?? 1)));
  return { uMin, uMax: uMax > uMin ? uMax : uMin + 1 };
}

function uToFrac(u, range) {
  return clamp01((Number(u) - range.uMin) / (range.uMax - range.uMin));
}

function renderLegend(legendEl) {
  if (!legendEl) return;
  legendEl.replaceChildren(
    ...[
      ['Spine', COLORS.spine],
      ['Spine start', COLORS.spineStart],
      ['Spine end', COLORS.spineEnd],
      ['S1 face', COLORS.faceS1],
      ['S2 face', COLORS.faceS2],
      ['S1', COLORS.onS1],
      ['S2', COLORS.onS2],
      ['CommonPoints', COLORS.points],
      ['Selected', COLORS.selected],
    ].map(([label, color]) =>
      el('span', { class: 'cme__legendItem' }, [el('span', { class: 'cme__swatch', style: `--swatch:#${color.toString(16).padStart(6, '0')}` }, []), label]),
    ),
  );
}

function renderTour(tourTitleEl, tourBodyEl, step) {
  if (tourTitleEl) tourTitleEl.textContent = step?.title || 'Tour';
  if (!tourBodyEl) return;
  tourBodyEl.replaceChildren(
    el('p', {}, [step?.summary || '']),
    el('ul', {}, (step?.bullets || []).map((t) => el('li', {}, [t]))),
  );
}

function stepUiMeta(stepIndex, selection) {
  const idx = Math.max(0, Math.min(7, Number(stepIndex) || 0));
  /** @type {(k:string)=>boolean} */
  const has = (arr, k) => arr.includes(k);

  /** @type {{allowed:string[], relevant:string[], suggested:{ kind:string, surfDataIndex?:number|null }}} */
  const meta = {
    allowed: ['stripe', 'spine', 'surfData', 'corner'],
    relevant: ['stripe', 'spine', 'surfData', 'corner'],
    suggested: { kind: 'stripe' },
  };

  if (idx === 0) {
    meta.allowed = ['stripe'];
    meta.relevant = ['stripe'];
    meta.suggested = { kind: 'stripe' };
  } else if (idx === 1) {
    meta.allowed = ['stripe', 'spine'];
    meta.relevant = ['spine'];
    meta.suggested = { kind: 'spine' };
  } else if (idx === 2) {
    meta.allowed = ['stripe', 'spine', 'surfData'];
    meta.relevant = ['spine', 'surfData'];
    meta.suggested = { kind: 'spine' };
  } else if (idx === 3 || idx === 4 || idx === 5) {
    meta.allowed = ['stripe', 'surfData'];
    meta.relevant = ['surfData'];
    meta.suggested = { kind: 'surfData', surfDataIndex: selection?.surfDataIndex ?? 0 };
  } else if (idx === 6) {
    meta.allowed = ['stripe', 'corner'];
    meta.relevant = ['corner'];
    meta.suggested = { kind: 'corner' };
  } else if (idx === 7) {
    // Failure reading can still benefit from inspecting corner context.
    meta.allowed = ['stripe', 'spine', 'surfData', 'corner'];
    meta.relevant = ['stripe', 'spine', 'surfData'];
    meta.suggested = { kind: 'stripe' };
  }

  // Keep stripe clickable even in guided mode so users can change the contour context.
  if (!has(meta.allowed, 'stripe')) meta.allowed.push('stripe');
  return meta;
}

function shouldShowCornersCard(model, ui) {
  const corners = Array.isArray(model?.corners) ? model.corners : [];
  const guided = Boolean(ui?.guided);
  const stepIndex = Number(ui?.stepIndex ?? 0) || 0;
  const isCornerTourStep = stepIndex === 6 || stepIndex === 7;
  if (guided) return isCornerTourStep;
  return corners.length > 0;
}

function renderCorners(cornersWrapEl, cornersNoteEl, cornersEl, model, selection, onSelect, ui) {
  if (!cornersWrapEl || !cornersEl) return;
  const corners = Array.isArray(model?.corners) ? model.corners : [];
  const stepIndex = Number(ui?.stepIndex ?? 0) || 0;
  const guided = Boolean(ui?.guided);
  const showCard = shouldShowCornersCard(model, ui);
  const isCornerTourStep = guided && (stepIndex === 6 || stepIndex === 7);

  if (!showCard) {
    cornersWrapEl.style.display = 'none';
    return;
  }

  if (!corners.length) {
    cornersWrapEl.style.display = '';
    const stripes = Array.isArray(model?.stripes) ? model.stripes : [];
    const stripe = stripes[selection?.stripeIndex ?? 0] || null;
    const isClosed = Boolean(stripe?.spine?.endpoint_vertex_indices?.is_closed);
    if (cornersNoteEl) {
      cornersNoteEl.textContent = isClosed
        ? `No corners for this case: the selected stripe is a closed contour (no ends).${isCornerTourStep ? ' This tour step is most useful on corner cases where multiple stripe ends meet at a vertex.' : ''}`
        : `No corners exported for this case.${isCornerTourStep ? ' This tour step is most useful on corner cases where multiple stripe ends meet at a vertex.' : ''}`;
    }
    cornersEl.replaceChildren();
    return;
  }

  cornersWrapEl.style.display = '';

  const uiMeta = stepUiMeta(ui?.stepIndex ?? 0, selection);
  const allowed = new Set(uiMeta.allowed);

  const interesting = corners
    .map((c, i) => ({ c, i, degree: Number(c?.degree ?? (Array.isArray(c?.refs) ? c.refs.length : 0)) || 0 }))
    .sort((a, b) => b.degree - a.degree || a.i - b.i);

  const top = interesting.filter((x) => x.degree >= 2);
  const tail = interesting.filter((x) => x.degree < 2);

  if (cornersNoteEl) {
    if (!top.length) {
      cornersNoteEl.textContent =
        'No multi-stripe corners in this case (no vertex where multiple stripe ends meet). Step 7 is most useful on corner cases.';
    } else {
      cornersNoteEl.textContent = 'Pick a corner vertex to highlight the meeting stripe ends.';
    }
  }

  const makeCornerBtn = ({ c, i, degree }) => {
    const v = Number(c?.vertex_index ?? 0) || 0;
    const refs = Array.isArray(c?.refs) ? c.refs : [];
    const label = refs
      .slice(0, 4)
      .map((r) => `${String(r?.stripe_id || r?.stripe_index || '?')}:${String(r?.end || '?')}`)
      .join(', ');
    const disabledGuided = guided && !allowed.has('corner');
    return el(
      'button',
      {
        type: 'button',
        class: `ui-btn cme__cornerBtn${selection.kind === 'corner' && selection.cornerIndex === i ? ' is-active' : ''}`,
        disabled: disabledGuided ? 'true' : null,
        title: disabledGuided ? 'Guided mode: not part of the current tour step.' : '',
      },
      [`V${v} · degree ${degree}${label ? ` · ${label}` : ''}`],
    );
  };

  const stripeIndexForCorner = (corner) => {
    const refs = Array.isArray(corner?.refs) ? corner.refs : [];
    if (!refs.length) return null;
    const idx = Number(refs[0]?.stripe_index);
    return Number.isFinite(idx) ? idx : null;
  };

  cornersEl.replaceChildren(
    ...(top.length
      ? [
          el('div', { class: 'cme__muted' }, [`Corners (degree ≥ 2): ${top.length}`]),
          ...top.map((x) => {
            const b = makeCornerBtn(x);
            b.addEventListener('click', () =>
              onSelect({ kind: 'corner', cornerIndex: x.i, stripeIndex: stripeIndexForCorner(x.c) ?? selection?.stripeIndex ?? 0 }),
            );
            return b;
          }),
        ]
      : []),
    ...(tail.length
      ? [
          el('details', { class: 'cme__details' }, [
            el('summary', {}, [`Ends (degree 1): ${tail.length}`]),
            el(
              'div',
              { class: 'cme__corners' },
              tail.map((x) => {
                const b = makeCornerBtn(x);
                b.addEventListener('click', () =>
                  onSelect({ kind: 'corner', cornerIndex: x.i, stripeIndex: stripeIndexForCorner(x.c) ?? selection?.stripeIndex ?? 0 }),
                );
                return b;
              }),
            ),
          ]),
        ]
      : []),
  );
}

function renderInspector(kindEl, outEl, selection, model) {
  if (!outEl) return;
  const stripes = Array.isArray(model?.stripes) ? model.stripes : [];
  const stripe = stripes[selection.stripeIndex] || null;
  const surfData = stripe && Array.isArray(stripe.surfData) ? stripe.surfData : [];
  const sd = selection.surfDataIndex != null ? surfData[selection.surfDataIndex] : null;
  const corners = Array.isArray(model?.corners) ? model.corners : [];

  if (kindEl) kindEl.textContent = selection.kind || '';

  if (selection.kind === 'corner') {
    const c = corners[selection.cornerIndex] || null;
    const refs = c && Array.isArray(c?.refs) ? c.refs : [];
    outEl.replaceChildren(
      kv([
        ['vertex_index', c?.vertex_index],
        ['p', c?.p],
        ['degree', c?.degree ?? refs.length],
        ['refs', refs.map((r) => `${String(r?.stripe_id || r?.stripe_index)}:${String(r?.end || '')}`).join(', ')],
      ]),
    );
    return;
  }

  if (!stripe) {
    outEl.replaceChildren(el('p', {}, ['No stripe in model.json for this case.']));
    return;
  }

  if (selection.kind === 'stripe') {
    outEl.replaceChildren(
      kv([
        ['id', stripe.id],
        ['contour_index', stripe.contour_index],
        ['stripe_status', stripe.stripe_status_name ?? stripe.stripe_status],
        ['choix', stripe.choix],
        ['nb_edges', Array.isArray(stripe?.spine?.edge_indices) ? stripe.spine.edge_indices.length : 0],
        ['nb_patches', surfData.length],
        ['spine_points', Array.isArray(stripe?.spine?.polyline_points) ? stripe.spine.polyline_points.length / 3 : 0],
      ]),
    );
    return;
  }

  if (selection.kind === 'spine') {
    outEl.replaceChildren(
      kv([
        ['stripe_id', stripe.id],
        ['edge_indices', stripe?.spine?.edge_indices],
        ['endpoints.first', stripe?.spine?.endpoints?.first],
        ['endpoints.last', stripe?.spine?.endpoints?.last],
        ['breakpoints', stripe?.spine?.breakpoints],
      ]),
    );
    return;
  }

  if (selection.kind === 'surfData' && sd) {
    outEl.replaceChildren(
      kv([
        ['stripe_id', stripe.id],
        ['surfData.index', sd.index],
        ['ufspine', sd.ufspine],
        ['ulspine', sd.ulspine],
        ['IndexOfS1', sd.IndexOfS1],
        ['IndexOfS2', sd.IndexOfS2],
        ['Surf', sd.Surf],
        ['twistOnS1', sd.twistOnS1],
        ['twistOnS2', sd.twistOnS2],
        ['intf.on_s1.line', sd?.interferences?.on_s1?.line_index],
        ['intf.on_s2.line', sd?.interferences?.on_s2?.line_index],
      ]),
    );
    return;
  }

  if (selection.kind === 'commonPoint' && sd) {
    const cp = (sd.commonPoints || []).find((c) => String(c?.label) === String(selection.commonPointLabel));
    outEl.replaceChildren(
      kv([
        ['stripe_id', stripe.id],
        ['surfData.index', sd.index],
        ['commonPoint.label', cp?.label],
        ['p', cp?.p],
        ['tol', cp?.tol],
        ['param_spine', cp?.param_spine],
        ['is_vertex', cp?.is_vertex],
        ['is_on_arc', cp?.is_on_arc],
        ['arc_v1', cp?.arc_v1],
        ['arc_v2', cp?.arc_v2],
      ]),
    );
    return;
  }

  if (selection.kind === 'interference' && sd) {
    const intf = sd?.interferences?.[selection.interferenceSide || 'on_s1'] || null;
    outEl.replaceChildren(
      kv([
        ['stripe_id', stripe.id],
        ['surfData.index', sd.index],
        ['side', selection.interferenceSide],
        ['line_index', intf?.line_index],
        ['transition', intf?.transition],
        ['first', intf?.first],
        ['last', intf?.last],
        ['curve3d_on_face.points', Array.isArray(intf?.curve3d_on_face) ? intf.curve3d_on_face.length / 3 : 0],
        ['curve3d_on_surf.points', Array.isArray(intf?.curve3d_on_surf) ? intf.curve3d_on_surf.length / 3 : 0],
      ]),
    );
    return;
  }

  outEl.replaceChildren(el('p', {}, ['Select an object to inspect.']));
}

function renderTree(treeEl, model, selection, onSelect, showAux, ui) {
  if (!treeEl) return;
  const stripes = visibleStripes(model, showAux);
  if (!stripes.length) {
    treeEl.replaceChildren(el('p', {}, ['No stripes in this model.']));
    return;
  }

  const uiMeta = stepUiMeta(ui?.stepIndex ?? 0, selection);
  const allowed = new Set(uiMeta.allowed);
  const relevant = new Set(uiMeta.relevant);
  const guided = Boolean(ui?.guided);

  treeEl.replaceChildren(
    ...stripes.map((stripe, stripeIndex) => {
      const surfData = Array.isArray(stripe?.surfData) ? stripe.surfData : [];
      const summary = `${stripe.id || `Stripe ${stripeIndex + 1}`}${stripe?.stripe_status_name ? ` · ${stripe.stripe_status_name}` : ''}`;
      const node = el('details', { open: stripeIndex === selection.stripeIndex ? 'true' : null }, [
        el('summary', {}, [summary]),
        el('div', { class: 'cme__treeList' }, [
          (() => {
            const isSelectedStripe = stripeIndex === selection.stripeIndex;
            const suggested = isSelectedStripe ? uiMeta.suggested : null;
            const isSuggested = Boolean(suggested && suggested.kind === 'stripe');
            const isAllowed = allowed.has('stripe');
            const isRelevant = relevant.has('stripe');
            const isDimmed = !guided && isSelectedStripe && !isRelevant;
            const disabled = guided && !isAllowed;
            const title = disabled ? 'Guided mode: not part of the current tour step.' : '';
            return el(
              'button',
              {
                type: 'button',
                class: `cme__treeBtn${isDimmed ? ' is-dimmed' : ''}${isSuggested ? ' is-suggested' : ''}`,
                'data-kind': 'stripe',
                disabled: disabled ? 'true' : null,
                title,
                'aria-current': selection.kind === 'stripe' && selection.stripeIndex === stripeIndex ? 'true' : 'false',
              },
              ['Stripe', isSuggested ? el('span', { class: 'cme__badge' }, ['Suggested']) : null],
            );
          })(),
          (() => {
            const isSelectedStripe = stripeIndex === selection.stripeIndex;
            const suggested = isSelectedStripe ? uiMeta.suggested : null;
            const isSuggested = Boolean(suggested && suggested.kind === 'spine');
            const isAllowed = allowed.has('spine');
            const isRelevant = relevant.has('spine');
            const hasSpinePts = Array.isArray(stripe?.spine?.polyline_points) && stripe.spine.polyline_points.length >= 6;
            const disabledMissing = !hasSpinePts;
            const disabledGuided = guided && !isAllowed;
            const disabled = disabledMissing || disabledGuided;
            const isDimmed = !guided && isSelectedStripe && !isRelevant;
            const title = disabledMissing
              ? 'Not available for this case: no spine polyline exported.'
              : disabledGuided
                ? 'Guided mode: not part of the current tour step.'
                : '';
            return el(
              'button',
              {
                type: 'button',
                class: `cme__treeBtn${isDimmed ? ' is-dimmed' : ''}${isSuggested ? ' is-suggested' : ''}`,
                'data-kind': 'spine',
                disabled: disabled ? 'true' : null,
                title,
                'aria-current': selection.kind === 'spine' && selection.stripeIndex === stripeIndex ? 'true' : 'false',
              },
              ['Spine', isSuggested ? el('span', { class: 'cme__badge' }, ['Suggested']) : null],
            );
          })(),
          ...surfData.map((sd, i) =>
            (() => {
              const isSelectedStripe = stripeIndex === selection.stripeIndex;
              const suggested = isSelectedStripe ? uiMeta.suggested : null;
              const isSuggested = Boolean(suggested && suggested.kind === 'surfData' && Number(suggested.surfDataIndex ?? 0) === i);
              const isAllowed = allowed.has('surfData');
              const isRelevant = relevant.has('surfData');
              const disabledGuided = guided && !isAllowed;
              const disabled = disabledGuided;
              const isDimmed = !guided && isSelectedStripe && !isRelevant;
              const title = disabledGuided ? 'Guided mode: not part of the current tour step.' : '';
              return el(
                'button',
                {
                  type: 'button',
                  class: `cme__treeBtn${isDimmed ? ' is-dimmed' : ''}${isSuggested ? ' is-suggested' : ''}`,
                  'data-kind': 'surfData',
                  'data-surf': String(i),
                  disabled: disabled ? 'true' : null,
                  title,
                  'aria-current':
                    selection.kind === 'surfData' && selection.stripeIndex === stripeIndex && selection.surfDataIndex === i ? 'true' : 'false',
                },
                [`SurfData[${i}] uf=${fmt(sd.ufspine)} ul=${fmt(sd.ulspine)}`, isSuggested ? el('span', { class: 'cme__badge' }, ['Suggested']) : null],
              );
            })(),
          ),
        ]),
      ]);

      const summaryEl = node.querySelector('summary');
      summaryEl?.addEventListener('click', (ev) => {
        // Allow native details toggle, but also select the stripe.
        if (ev.target instanceof HTMLElement && ev.target.closest('button')) return;
        onSelect({ kind: 'stripe', stripeIndex, surfDataIndex: null, commonPointLabel: null, interferenceSide: null });
      });

      node.addEventListener('click', (ev) => {
        const btn = ev.target instanceof HTMLElement ? ev.target.closest('button[data-kind]') : null;
        if (!btn) return;
        if (/** @type {any} */ (btn).disabled) return;
        ev.preventDefault();
        ev.stopPropagation();
        const kind = btn.getAttribute('data-kind');
        if (kind === 'stripe') onSelect({ kind: 'stripe', stripeIndex, surfDataIndex: null, commonPointLabel: null, interferenceSide: null });
        else if (kind === 'spine') onSelect({ kind: 'spine', stripeIndex, surfDataIndex: null, commonPointLabel: null, interferenceSide: null });
        else if (kind === 'surfData')
          onSelect({ kind: 'surfData', stripeIndex, surfDataIndex: Number(btn.getAttribute('data-surf')) || 0, commonPointLabel: null, interferenceSide: null });
      });

      return node;
    }),
  );
}

function renderTimeline(timelineEl, rangeEl, stripe, selection, onSelect, ui) {
  if (!timelineEl || !rangeEl) return;
  const surfData = stripe && Array.isArray(stripe?.surfData) ? stripe.surfData : [];
  if (!stripe || !surfData.length) {
    rangeEl.textContent = '';
    timelineEl.replaceChildren();
    return;
  }
  const range = computeStripeParamRange(stripe);
  rangeEl.textContent = `${fmt(range.uMin)} → ${fmt(range.uMax)}`;

  const widths = surfData.map((sd) => Math.max(0.0001, Number(sd.ulspine) - Number(sd.ufspine)));
  const total = widths.reduce((a, b) => a + b, 0) || 1;
  const stepIndex = Number(ui?.stepIndex ?? 0) || 0;

  timelineEl.replaceChildren(
    ...surfData.map((sd, i) => {
      const color = PATCH_COLORS[i % PATCH_COLORS.length];
      const w = widths[i] / total;
      const isSelected =
        (selection.kind === 'surfData' && selection.surfDataIndex === i) ||
        (stepIndex === 2 && selection.kind === 'spine' && selection.surfDataIndex === i);
      const seg = el('div', {
        class: 'cme__seg',
        style: `--seg:#${color.toString(16).padStart(6, '0')}; flex:${w} 1 0`,
        role: 'listitem',
        title: `SurfData[${i}] uf=${fmt(sd.ufspine)} ul=${fmt(sd.ulspine)}`,
        'aria-selected': isSelected ? 'true' : 'false',
        'data-surf': String(i),
      });
      seg.addEventListener('click', () => onSelect({ kind: 'surfData', stripeIndex: selection.stripeIndex, surfDataIndex: i }));
      return seg;
    }),
  );
}

async function initOne(root) {
  const oracleUrl = root.dataset.oracleUrl || root.dataset.modelUrl || '/occt/oracles/fillets.json';

  const caseSel = root.querySelector('select[data-cme-case]');
  const viewerEl = root.querySelector('[data-cme-viewer]');
  const viewerTitleEl = root.querySelector('[data-cme-viewer-title]');
  const viewerStatusEl = root.querySelector('[data-cme-viewer-status]');
  const legendEl = root.querySelector('[data-cme-legend]');

  const stepSel = root.querySelector('select[data-cme-step]');
  const stepPrevBtn = root.querySelector('button[data-cme-step-prev]');
  const stepNextBtn = root.querySelector('button[data-cme-step-next]');
  const tourTitleEl = root.querySelector('[data-cme-tour-title]');
  const tourBodyEl = root.querySelector('[data-cme-tour-body]');
  const tourHighlightBtn = root.querySelector('button[data-cme-tour-highlight]');

  const toggleBaseEl = root.querySelector('input[data-cme-toggle-base]');
  const toggleSpineEl = root.querySelector('input[data-cme-show-spines]');
  const togglePatchesEl = root.querySelector('input[data-cme-show-patches]');
  const toggleIntfEl = root.querySelector('input[data-cme-show-interferences]');
  const toggleFacesEl = root.querySelector('input[data-cme-show-faces]');
  const togglePtsEl = root.querySelector('input[data-cme-show-points]');
  const togglePtLinksEl = root.querySelector('input[data-cme-show-point-links]');
  const toggleAuxEl = root.querySelector('input[data-cme-show-aux]');
  const guidedEl = root.querySelector('input[data-cme-guided]');

  const meshModeEls = Array.from(root.querySelectorAll('input[data-cme-mesh-mode]'));
  const fitBtn = root.querySelector('button[data-cme-fit]');
  const resetBtn = root.querySelector('button[data-cme-reset]');
  const wireEl = root.querySelector('input[data-cme-wireframe]');
  const edgesEl = root.querySelector('input[data-cme-edges]');
  const axesEl = root.querySelector('input[data-cme-axes]');
  const gridEl = root.querySelector('input[data-cme-grid]');
  const treeEl = root.querySelector('[data-cme-tree]');
  const cornersWrapEl = root.querySelector('[data-cme-corners-wrap]');
  const cornersNoteEl = root.querySelector('[data-cme-corners-note]');
  const cornersEl = root.querySelector('[data-cme-corners]');
  const timelineEl = root.querySelector('[data-cme-timeline]');
  const timelineRangeEl = root.querySelector('[data-cme-timeline-range]');
  const timelineHelpEl = root.querySelector('[data-cme-timeline-help]');
  const inspectorKindEl = root.querySelector('[data-cme-inspector-kind]');
  const inspectorEl = root.querySelector('[data-cme-inspector]');

  if (!caseSel || !viewerEl || !treeEl || !timelineEl || !timelineRangeEl || !inspectorEl) return;
  if (root.dataset.cmeInitialized === '1') return;

  const setStatus = (msg) => {
    if (!viewerStatusEl) return;
    viewerStatusEl.textContent = msg || '';
  };

  let data;
  try {
    root.dataset.cmeInitialized = '1';
    data = await fetchJson(oracleUrl);
  } catch (e) {
    delete root.dataset.cmeInitialized;
    inspectorEl.textContent = `Failed to load oracle JSON: ${String(e)}`;
    setStatus('');
    return;
  }

  const cases = data?.cases || {};
  const names = Object.keys(cases).sort();
  if (!names.length) {
    inspectorEl.textContent = 'No cases found in oracle JSON.';
    setStatus('');
    return;
  }

  caseSel.replaceChildren();
  for (const id of names) {
    const opt = el('option', { value: id }, [titleizeCaseId(id)]);
    opt.title = id;
    caseSel.appendChild(opt);
  }

  const viewer = createThreeViewer(viewerEl, setStatus);
  const overlays = {
    spine: new THREE.Group(),
    patches: new THREE.Group(),
    selection: new THREE.Group(),
    faces: new THREE.Group(),
  };
  overlays.spine.name = 'cme-spine';
  overlays.patches.name = 'cme-patches';
  overlays.selection.name = 'cme-selection';
  overlays.faces.name = 'cme-faces';
  viewer.scene.add(overlays.spine);
  viewer.scene.add(overlays.patches);
  viewer.scene.add(overlays.selection);
  viewer.scene.add(overlays.faces);

  renderLegend(legendEl);

  const modelCache = new Map();
  const arcCache = new Map();
  let currentCaseId = '';
  let currentMeshKind = 'result';
  let currentModel = null;
  let modelLoadToken = 0;

  const meshMode = () => (meshModeEls.find((n) => n.checked) || {}).value || 'auto';

  const desiredMeshKindForStep = (stepIndex) => {
    const idx = Number(stepIndex) || 0;
    if (idx >= 0 && idx <= 2) return 'input'; // steps 1–3
    if (idx >= 3 && idx <= 5) return 'result'; // steps 4–6
    return null; // do not force for later steps
  };

  const effectiveMeshKind = () => {
    const mode = meshMode();
    if (mode === 'input' || mode === 'result') return mode;
    const desired = desiredMeshKindForStep(state.stepIndex);
    return desired || currentMeshKind || 'result';
  };

  const updateTitle = (caseId, meshKind) => {
    if (!viewerTitleEl) return;
    viewerTitleEl.textContent = `Case · ${titleizeCaseId(caseId)} · ${meshKind}`;
    viewerTitleEl.title = `${caseId} · ${meshKind}`;
  };

  const loadModel = async (caseId) => {
    if (modelCache.has(caseId)) return modelCache.get(caseId);
    const url = modelUrl(caseId);
    const model = await fetchJson(url);
    modelCache.set(caseId, model);
    return model;
  };

  const applyViewerOptions = () => {
    viewer.setWireframe(Boolean(wireEl?.checked));
    viewer.setEdges(Boolean(edgesEl?.checked));
    viewer.setAxesVisible?.(Boolean(axesEl?.checked));
    viewer.setGridVisible?.(Boolean(gridEl?.checked));
  };

  const applyMesh = () => {
    updateTitle(currentCaseId, currentMeshKind);
    applyViewerOptions();
    viewer.setMeshFromUrl(meshUrl(currentCaseId, currentMeshKind));
  };

  const state = {
    stepIndex: 0,
    selection: /** @type {any} */ ({
      kind: 'stripe',
      stripeIndex: 0,
      surfDataIndex: null,
      cornerIndex: 0,
      interferenceSide: null,
      commonPointLabel: null,
    }),
  };
  let lastHighlightTarget = null;
  let pulseToken = 0;

  const pulse = (rootObj) => {
    if (!rootObj) return;
    const token = ++pulseToken;

    /** @type {Array<{ mat:any, opacity:number, color:any }>} */
    const mats = [];
    rootObj.traverse?.((obj) => {
      const m = obj?.material;
      if (!m) return;
      const list = Array.isArray(m) ? m : [m];
      for (const mat of list) {
        if (!mat) continue;
        mats.push({
          mat,
          opacity: typeof mat.opacity === 'number' ? mat.opacity : 1,
          color: mat.color ? mat.color.clone?.() ?? mat.color : null,
        });
        if (typeof mat.opacity === 'number') {
          mat.transparent = true;
        }
      }
    });

    const start = performance.now();
    const duration = 650;
    const tick = (now) => {
      if (token !== pulseToken) return;
      const t = Math.min(1, (now - start) / duration);
      const wave = Math.sin(t * Math.PI); // 0→1→0
      const boost = 0.25 + 0.75 * wave;

      for (const { mat, opacity } of mats) {
        if (typeof mat.opacity === 'number') mat.opacity = Math.max(0.08, opacity * boost);
      }

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        for (const { mat, opacity } of mats) {
          if (typeof mat.opacity === 'number') mat.opacity = opacity;
        }
      }
    };
    requestAnimationFrame(tick);
  };

  const tourSteps = [
    {
      title: '1. What You’re Looking At (Stripe = Contour)',
      summary: 'A fillet build is split into contours; each contour maps to one ChFiDS_Stripe.',
      bullets: ['Pick a stripe (contour) as the unit of work.', 'Status is contour-level (stripe_status_name).'],
      apply: () => {
        state.selection = { kind: 'stripe', stripeIndex: 0, surfDataIndex: null };
        // Keep tour steps deterministic: always set all relevant toggles so we don't inherit state
        // from previous steps (which makes step/case switches feel “stuck”).
        if (toggleBaseEl) toggleBaseEl.checked = true;
        if (edgesEl) edgesEl.checked = true;
        if (wireEl) wireEl.checked = false;
        if (toggleSpineEl) toggleSpineEl.checked = true; // faint stripe-level spine makes selection visible
        if (togglePatchesEl) togglePatchesEl.checked = false;
        if (toggleIntfEl) toggleIntfEl.checked = false;
        if (toggleFacesEl) toggleFacesEl.checked = false;
        if (togglePtsEl) togglePtsEl.checked = false;
        if (togglePtLinksEl) togglePtLinksEl.checked = false;
      },
    },
    {
      title: '2. Spine: The Guideline (Not Really C2)',
      summary: 'ChFiDS_Spine is an ordered edge chain; joints are the danger zones.',
      bullets: ['We draw the spine polyline.', 'Breakpoints mark edge junctions (continuity risk).'],
      apply: () => {
        state.selection = { kind: 'spine', stripeIndex: 0, surfDataIndex: null };
        if (toggleBaseEl) toggleBaseEl.checked = true;
        if (edgesEl) edgesEl.checked = true;
        if (wireEl) wireEl.checked = false;
        if (toggleSpineEl) toggleSpineEl.checked = true;
        if (togglePatchesEl) togglePatchesEl.checked = false;
        if (toggleIntfEl) toggleIntfEl.checked = false;
        if (toggleFacesEl) toggleFacesEl.checked = false;
        if (togglePtsEl) togglePtsEl.checked = false;
        if (togglePtLinksEl) togglePtLinksEl.checked = false;
      },
    },
    {
      title: '3. Spine Parameter = “Time Axis”',
      summary: 'Most structures reference a spine parameter interval; read everything against it.',
      bullets: ['Use the timeline under the viewer.', 'Click a segment to select a patch.', 'If you only see one segment, try “Cylinder Split Rim Radius 1”.'],
      apply: () => {
        // Keep selection on the spine, but pre-select a patch interval so step 2→3 has a visible change.
        state.selection = { kind: 'spine', stripeIndex: 0, surfDataIndex: 0 };
        if (toggleBaseEl) toggleBaseEl.checked = true;
        if (edgesEl) edgesEl.checked = true;
        if (wireEl) wireEl.checked = false;
        if (toggleSpineEl) toggleSpineEl.checked = true;
        if (togglePatchesEl) togglePatchesEl.checked = true;
        if (toggleIntfEl) toggleIntfEl.checked = false;
        if (toggleFacesEl) toggleFacesEl.checked = false;
        if (togglePtsEl) togglePtsEl.checked = false;
        if (togglePtLinksEl) togglePtLinksEl.checked = false;
      },
    },
    {
      title: '4. SurfData Patches: The Stripe’s Segments',
      summary: 'A stripe owns a sequence of SurfData patches; each patch owns a spine interval.',
      bullets: ['Timeline segments correspond to SurfData[i] ufspine→ulspine.', 'Selecting a patch highlights its spine range.'],
      apply: () => {
        state.selection = { kind: 'surfData', stripeIndex: 0, surfDataIndex: 0 };
        if (toggleBaseEl) toggleBaseEl.checked = true;
        if (edgesEl) edgesEl.checked = true;
        if (wireEl) wireEl.checked = false;
        if (toggleSpineEl) toggleSpineEl.checked = true;
        if (togglePatchesEl) togglePatchesEl.checked = true;
        if (toggleIntfEl) toggleIntfEl.checked = false;
        if (toggleFacesEl) toggleFacesEl.checked = false;
        if (togglePtsEl) togglePtsEl.checked = false;
        if (togglePtLinksEl) togglePtLinksEl.checked = false;
      },
    },
    {
      title: '5. Two Faces, Two Interferences (Trim Contracts)',
      summary: 'Each patch meets two support faces; each side has a FaceInterference (trim curves).',
      bullets: ['We draw interference curves for S1 (green) and S2 (orange).', 'These curves are “contracts” for trimming.'],
      apply: () => {
        state.selection = { kind: 'surfData', stripeIndex: 0, surfDataIndex: 0 };
        if (toggleBaseEl) toggleBaseEl.checked = true;
        if (edgesEl) edgesEl.checked = true;
        if (wireEl) wireEl.checked = false;
        if (toggleSpineEl) toggleSpineEl.checked = true;
        if (togglePatchesEl) togglePatchesEl.checked = true;
        if (toggleIntfEl) toggleIntfEl.checked = true;
        if (toggleFacesEl) toggleFacesEl.checked = true;
        if (togglePtsEl) togglePtsEl.checked = false;
        if (togglePtLinksEl) togglePtLinksEl.checked = false;
      },
    },
    {
      title: '6. Four CommonPoints: Patch End Constraints',
      summary: 'Each patch has 4 endpoints: First/Last × OnS1/OnS2.',
      bullets: ['We draw 4 markers for the selected patch.', 'These glue patches and corners.'],
      apply: () => {
        state.selection = { kind: 'surfData', stripeIndex: 0, surfDataIndex: 0 };
        if (toggleBaseEl) toggleBaseEl.checked = true;
        if (edgesEl) edgesEl.checked = true;
        if (wireEl) wireEl.checked = false;
        if (toggleSpineEl) toggleSpineEl.checked = true;
        if (togglePatchesEl) togglePatchesEl.checked = true;
        if (toggleIntfEl) toggleIntfEl.checked = false;
        if (toggleFacesEl) toggleFacesEl.checked = false;
        if (togglePtsEl) togglePtsEl.checked = true;
        if (togglePtLinksEl) togglePtLinksEl.checked = true;
      },
    },
    {
      title: '7. Stripe Ends + Corner Context',
      summary: 'Corners happen where stripe ends meet at a topological vertex.',
      bullets: [
        'Pick a corner from the Corners panel (degree ≥ 2).',
        'We draw small rays for each stripe end meeting at that vertex.',
        'If you see no corners, the selected stripe is likely a closed contour (no ends).',
      ],
      apply: () => {
        // Preserve the user's chosen corner when stepping away and back.
        const prevCorner = state.selection.kind === 'corner' ? state.selection.cornerIndex : null;
        state.selection = { kind: 'corner', cornerIndex: prevCorner ?? null, stripeIndex: state.selection.stripeIndex ?? 0, surfDataIndex: null };
        if (toggleBaseEl) toggleBaseEl.checked = true;
        if (edgesEl) edgesEl.checked = true;
        if (wireEl) wireEl.checked = false;
        if (toggleSpineEl) toggleSpineEl.checked = true;
        if (togglePatchesEl) togglePatchesEl.checked = true;
        if (toggleIntfEl) toggleIntfEl.checked = false;
        if (toggleFacesEl) toggleFacesEl.checked = false;
        if (togglePtsEl) togglePtsEl.checked = false;
        if (togglePtLinksEl) togglePtLinksEl.checked = false;
      },
    },
    {
      title: '8. Failure Reading (Startsol/Walking/Twisted)',
      summary: 'Statuses are contour-level; failures show up as “missing” downstream objects.',
      bullets: ['StartsolFailure: no SurfData emitted.', 'WalkingFailure: partial patches then stops.', 'TwistedSurface: patch flags twistOnS1/2.'],
      apply: () => {
        // Try to jump to a known failing case if present.
        const fail = ['single_edge_radius_100', 'single_edge_radius_1000', 'single_edge_radius_50'].find((c) => names.includes(c));
        if (fail) caseSel.value = fail;
        state.selection = { kind: 'stripe', stripeIndex: 0, surfDataIndex: null };
        if (toggleBaseEl) toggleBaseEl.checked = true;
        if (edgesEl) edgesEl.checked = true;
        if (wireEl) wireEl.checked = false;
        if (toggleSpineEl) toggleSpineEl.checked = true;
        if (togglePatchesEl) togglePatchesEl.checked = true;
        if (toggleIntfEl) toggleIntfEl.checked = true;
        if (toggleFacesEl) toggleFacesEl.checked = true;
        if (togglePtsEl) togglePtsEl.checked = true;
        if (togglePtLinksEl) togglePtLinksEl.checked = true;
      },
    },
  ];

  if (stepSel) {
    stepSel.replaceChildren(...tourSteps.map((s, i) => el('option', { value: String(i) }, [s.title])));
  }

  const applyCurrentStepState = (opts = {}) => {
    const allowCaseMutation = opts.allowCaseMutation !== false;
    const step = tourSteps[state.stepIndex];
    const beforeCase = caseSel.value;
    try {
      step?.apply?.();
    } catch {}
    if (!allowCaseMutation && caseSel.value !== beforeCase) {
      // Prevent step 8 from hijacking the case when the user explicitly switched cases.
      caseSel.value = currentCaseId;
    }
  };

  const select = (sel) => {
    state.selection = { ...state.selection, ...sel };
    renderAll();
  };

  const renderAll = () => {
    if (!currentModel) {
      clearGroup(overlays.spine);
      clearGroup(overlays.patches);
      clearGroup(overlays.selection);
      clearGroup(overlays.faces);
      renderTree(treeEl, null, state.selection, select, Boolean(toggleAuxEl?.checked), { stepIndex: state.stepIndex, guided: Boolean(guidedEl?.checked) });
      renderCorners(cornersWrapEl, cornersNoteEl, cornersEl, null, state.selection, select, { stepIndex: state.stepIndex, guided: Boolean(guidedEl?.checked) });
      if (timelineHelpEl) timelineHelpEl.textContent = '';
      renderTimeline(timelineEl, timelineRangeEl, null, state.selection, select, { stepIndex: state.stepIndex });
      renderInspector(inspectorKindEl, inspectorEl, state.selection, null);
      return;
    }

    const stripes = visibleStripes(currentModel, Boolean(toggleAuxEl?.checked));
    if (state.selection.stripeIndex < 0 || state.selection.stripeIndex >= stripes.length) {
      state.selection = { ...state.selection, stripeIndex: pickDefaultVisibleStripe(currentModel, Boolean(toggleAuxEl?.checked)) };
    }
    const stripe = stripes[state.selection.stripeIndex] || null;
    const corners = Array.isArray(currentModel?.corners) ? currentModel.corners : [];
    if (state.selection.kind === 'corner') {
      if (!corners.length) {
        state.selection = { ...state.selection, kind: 'stripe', cornerIndex: 0 };
      } else {
        const idx =
          state.selection.cornerIndex == null
            ? pickDefaultCornerIndex(corners)
            : Math.max(0, Math.min(corners.length - 1, Number(state.selection.cornerIndex) || 0));
        if (idx !== state.selection.cornerIndex) state.selection = { ...state.selection, cornerIndex: idx };
      }
    }

    // Tour card
    renderTour(tourTitleEl, tourBodyEl, tourSteps[state.stepIndex]);

    // Tree + timeline + inspector
    renderTree(treeEl, currentModel, state.selection, select, Boolean(toggleAuxEl?.checked), { stepIndex: state.stepIndex, guided: Boolean(guidedEl?.checked) });
    renderCorners(cornersWrapEl, cornersNoteEl, cornersEl, currentModel, state.selection, select, { stepIndex: state.stepIndex, guided: Boolean(guidedEl?.checked) });
    renderTimeline(timelineEl, timelineRangeEl, stripe, state.selection, select, { stepIndex: state.stepIndex });
    if (timelineHelpEl) {
      const sd = stripe && Array.isArray(stripe?.surfData) ? stripe.surfData : [];
      if (!stripe) timelineHelpEl.textContent = '';
      else if (!sd.length) timelineHelpEl.textContent = 'No SurfData patches in this stripe.';
      else if (sd.length === 1) timelineHelpEl.textContent = 'Only 1 SurfData patch in this stripe (nothing to switch).';
      else timelineHelpEl.textContent = 'Click a segment to select SurfData[i].';
    }
    renderInspector(inspectorKindEl, inspectorEl, state.selection, currentModel);

    // Viewer toggles
    applyViewerOptions();
    viewer.setBaseVisible(Boolean(toggleBaseEl?.checked));

    clearGroup(overlays.spine);
    clearGroup(overlays.patches);
    clearGroup(overlays.selection);
    clearGroup(overlays.faces);

    const spinePts = stripe?.spine?.polyline_points;
    const arc = spinePts ? arcCache.get(stripe.id) || spineArc(spinePts) : null;
    if (arc && stripe?.id && !arcCache.has(stripe.id)) arcCache.set(stripe.id, arc);
    const range = stripe ? computeStripeParamRange(stripe) : { uMin: 0, uMax: 1 };
    const surfData = stripe && Array.isArray(stripe?.surfData) ? stripe.surfData : [];

    if (toggleSpineEl?.checked && spinePts) {
      const isStripeFocus = state.selection.kind === 'stripe' && state.stepIndex === 0;
      const isSpineFocus = state.selection.kind === 'spine' && state.stepIndex >= 1;

      const spineObj =
        isSpineFocus
          ? makeTube(spinePts, COLORS.spine, 0.06, 0.9) ?? makeLine(spinePts, COLORS.spine, 0.95)
          : makeTube(spinePts, COLORS.spine, 0.04, 0.6) ?? makeLine(spinePts, COLORS.spine, 0.6);
      if (spineObj) overlays.spine.add(spineObj);

      // Stripe-focused marker: a single “you picked this stripe” dot, so step 1 is visible.
      if (isStripeFocus && arc && arc.n > 1) {
        const mid = posAtFraction(arc, 0.5);
        const radius = Math.max(0.06, (arc.total || 1) * 0.01);
        const s = makeSphere([mid.x, mid.y, mid.z], COLORS.selected, radius);
        if (s) overlays.spine.add(s);
      }

      // Endpoint markers: show on spine-focused steps to make a clear “start/end” concept.
      if (isSpineFocus && stripe?.spine?.endpoints?.first && stripe?.spine?.endpoints?.last) {
        const radius = Math.max(0.05, (arc?.total || 1) * 0.007);
        const s0 = makeSphere(stripe.spine.endpoints.first, COLORS.spineStart, radius);
        const s1 = makeSphere(stripe.spine.endpoints.last, COLORS.spineEnd, radius);
        if (s0) {
          s0.userData = { kind: 'spineEndpoint', which: 'first', stripeIndex: state.selection.stripeIndex };
          overlays.spine.add(s0);
        }
        if (s1) {
          s1.userData = { kind: 'spineEndpoint', which: 'last', stripeIndex: state.selection.stripeIndex };
          overlays.spine.add(s1);
        }
      }

      // Breakpoint markers (edge joints)
      const bps = Array.isArray(stripe?.spine?.breakpoints) ? stripe.spine.breakpoints : [];
      if (isSpineFocus && arc && bps.length && arc.n > 1) {
        const radius = Math.max(0.04, (arc.total || 1) * 0.004);
        for (const bp of bps) {
          const idx = Math.max(0, Math.min(arc.n - 1, Number(bp) - 1));
          // Skip endpoints; we render those separately.
          if (idx <= 0 || idx >= arc.n - 1) continue;
          const p = [arc.pts[idx * 3 + 0], arc.pts[idx * 3 + 1], arc.pts[idx * 3 + 2]];
          const s = makeSphere(p, COLORS.selected, radius);
          if (s) {
            s.userData = { kind: 'breakpoint', stripeIndex: state.selection.stripeIndex };
            overlays.spine.add(s);
          }
        }
      }
    }

    if (togglePatchesEl?.checked && arc && surfData.length) {
      for (let i = 0; i < surfData.length; i++) {
        const sd = surfData[i];
        const f0 = uToFrac(sd.ufspine, range);
        const f1 = uToFrac(sd.ulspine, range);
        const segPts = extractSegmentPoints(arc, f0, f1);
        const color = PATCH_COLORS[i % PATCH_COLORS.length];
        const line = makeLine(segPts, color, 0.75);
        if (line) overlays.patches.add(line);
      }
    }

    const isSurfSelected = state.selection.kind === 'surfData' && state.selection.surfDataIndex != null;
    const isStep3Preview = state.stepIndex === 2 && state.selection.kind === 'spine' && state.selection.surfDataIndex != null;
    const selSd = isSurfSelected || isStep3Preview ? surfData[state.selection.surfDataIndex] : null;
    if (selSd && arc) {
      const f0 = uToFrac(selSd.ufspine, range);
      const f1 = uToFrac(selSd.ulspine, range);
      const segPts = extractSegmentPoints(arc, f0, f1);
      const radius = isStep3Preview ? 0.07 : 0.085;
      const opacity = isStep3Preview ? 0.75 : 0.92;
      const hl = makeTube(segPts, COLORS.selected, radius, opacity) ?? makeLine(segPts, COLORS.selected, 1.0);
      if (hl) {
        hl.renderOrder = 80;
        overlays.selection.add(hl);
      }

      if (toggleIntfEl?.checked) {
        const i1 = selSd?.interferences?.on_s1;
        const i2 = selSd?.interferences?.on_s2;
        const c1 = Array.isArray(i1?.curve3d_on_face) && i1.curve3d_on_face.length >= 6 ? i1.curve3d_on_face : i1?.curve3d_on_surf;
        const c2 = Array.isArray(i2?.curve3d_on_face) && i2.curve3d_on_face.length >= 6 ? i2.curve3d_on_face : i2?.curve3d_on_surf;
        const l1 = makeTube(c1, COLORS.onS1, 0.03, 0.9) ?? makeLine(c1, COLORS.onS1, 0.9);
        const l2 = makeTube(c2, COLORS.onS2, 0.03, 0.9) ?? makeLine(c2, COLORS.onS2, 0.9);
        if (l1) overlays.selection.add(l1);
        if (l2) overlays.selection.add(l2);
      }

      if (toggleFacesEl?.checked && currentModel?.faces) {
        const faceList = Array.isArray(currentModel.faces) ? currentModel.faces : [];
        const findFace = (idx) => faceList.find((f) => Number(f?.index) === Number(idx)) || null;
        const f1 = findFace(selSd.IndexOfS1);
        const f2 = findFace(selSd.IndexOfS2);
        const p1 = Array.isArray(f1?.outer_wire_polyline) ? f1.outer_wire_polyline : [];
        const p2 = Array.isArray(f2?.outer_wire_polyline) ? f2.outer_wire_polyline : [];
        const a = makeTube(p1, COLORS.faceS1, 0.02, 0.55) ?? makeLine(p1, COLORS.faceS1, 0.55);
        const b = makeTube(p2, COLORS.faceS2, 0.02, 0.55) ?? makeLine(p2, COLORS.faceS2, 0.55);
        if (a) overlays.faces.add(a);
        if (b) overlays.faces.add(b);
      }

      if (togglePtsEl?.checked) {
        const cps = Array.isArray(selSd?.commonPoints) ? selSd.commonPoints : [];
        const radius = Math.max(0.04, (arc.total || 1) * 0.006);
        for (const cp of cps) {
          const s = makeSphere(cp?.p, COLORS.points, radius);
          if (s) {
            s.userData = { kind: 'commonPoint', stripeIndex: state.selection.stripeIndex, surfDataIndex: state.selection.surfDataIndex, label: cp?.label };
            overlays.selection.add(s);
          }
        }

        if (togglePtLinksEl?.checked) {
          const byLabel = new Map();
          for (const cp of cps) byLabel.set(String(cp?.label || ''), cp);

          const lineColor = 0x94a3b8; // neutral gray (cross-links)
          const link = (a, b, color, r, opacity) => {
            if (!a?.p || !b?.p) return;
            const pts = [a.p[0], a.p[1], a.p[2], b.p[0], b.p[1], b.p[2]];
            const obj = makeTube(pts, color, r, opacity) ?? makeLine(pts, color, opacity);
            if (obj) {
              obj.renderOrder = 70;
              overlays.selection.add(obj);
            }
          };

          const firstS1 = byLabel.get('first_on_s1');
          const lastS1 = byLabel.get('last_on_s1');
          const firstS2 = byLabel.get('first_on_s2');
          const lastS2 = byLabel.get('last_on_s2');

          // Along each side (teaches “two contracts”)
          link(firstS1, lastS1, COLORS.onS1, 0.018, 0.85);
          link(firstS2, lastS2, COLORS.onS2, 0.018, 0.85);

          // Across faces at each end (teaches “paired endpoints”)
          link(firstS1, firstS2, lineColor, 0.012, 0.55);
          link(lastS1, lastS2, lineColor, 0.012, 0.55);
        }
      }
    }

    if (state.selection.kind === 'corner' && corners.length) {
      const c = corners[state.selection.cornerIndex] || null;
      const p = Array.isArray(c?.p) ? c.p : null;
      if (p) {
        const arcScale = arc?.total || 10;
        const radius = Math.max(0.06, arcScale * 0.01);
        const s = makeSphere(p, COLORS.points, radius);
        if (s) {
          s.renderOrder = 90;
          overlays.selection.add(s);
        }

        const refs = Array.isArray(c?.refs) ? c.refs : [];
        for (let i = 0; i < refs.length; i++) {
          const r = refs[i] || {};
          const stripeIndex = Number(r?.stripe_index ?? 0) || 0;
          const end = String(r?.end || '');
          const st = (Array.isArray(currentModel?.stripes) ? currentModel.stripes : []).find((x) => Number(x?.index) === stripeIndex) || null;
          const pts = st?.spine?.polyline_points;
          if (!Array.isArray(pts) || pts.length < 6) continue;

          // Derive a direction along the spine near the endpoint to offset markers (avoid overlap).
          let ax = 0,
            ay = 0,
            az = 0,
            bx = 0,
            by = 0,
            bz = 0;
          if (end === 'end') {
            const n = pts.length;
            ax = Number(pts[n - 6] || 0);
            ay = Number(pts[n - 5] || 0);
            az = Number(pts[n - 4] || 0);
            bx = Number(pts[n - 3] || 0);
            by = Number(pts[n - 2] || 0);
            bz = Number(pts[n - 1] || 0);
          } else {
            ax = Number(pts[0] || 0);
            ay = Number(pts[1] || 0);
            az = Number(pts[2] || 0);
            bx = Number(pts[3] || 0);
            by = Number(pts[4] || 0);
            bz = Number(pts[5] || 0);
          }

          let dx = bx - ax,
            dy = by - ay,
            dz = bz - az;
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          dx /= len;
          dy /= len;
          dz /= len;

          const step = Math.max(0.5, Math.min(2.5, len * 3));
          const off = [Number(p[0]) + dx * step, Number(p[1]) + dy * step, Number(p[2]) + dz * step];
          const col = PATCH_COLORS[(stripeIndex - 1) % PATCH_COLORS.length] ?? COLORS.selected;

          const seg = [Number(p[0]), Number(p[1]), Number(p[2]), off[0], off[1], off[2]];
          const link = makeTube(seg, col, 0.02, 0.9) ?? makeLine(seg, col, 0.9);
          if (link) {
            link.renderOrder = 85;
            overlays.selection.add(link);
          }
          const m = makeSphere(off, col, radius * 0.55);
          if (m) {
            m.renderOrder = 86;
            overlays.selection.add(m);
          }
        }
      }
    }

    lastHighlightTarget = overlays.selection.children.length ? overlays.selection : overlays.spine;
  };

  const setCase = async (caseId) => {
    currentCaseId = String(caseId || '');
    currentMeshKind = effectiveMeshKind();
    updateTitle(currentCaseId, currentMeshKind);
    applyMesh();

    const token = ++modelLoadToken;
    inspectorEl.replaceChildren(el('p', {}, ['Loading model.json…']));
    try {
      const model = await loadModel(currentCaseId);
      if (token !== modelLoadToken) return;
      currentModel = model;
      // Keep the current tour step, but reset indices to a safe default for the new case.
      state.selection = {
        ...state.selection,
        stripeIndex: pickDefaultVisibleStripe(currentModel, Boolean(toggleAuxEl?.checked)),
        surfDataIndex: 0,
        cornerIndex: 0,
        commonPointLabel: null,
        interferenceSide: null,
      };
      applyCurrentStepState({ allowCaseMutation: false });
      renderAll();
    } catch (e) {
      if (token !== modelLoadToken) return;
      currentModel = null;
      clearGroup(overlays.spine);
      clearGroup(overlays.patches);
      clearGroup(overlays.selection);
      inspectorEl.textContent = `Failed to load model.json for ${currentCaseId}: ${String(e)}`;
    }
  };

  caseSel.addEventListener('change', () => void setCase(caseSel.value));
  for (const el of meshModeEls)
    el.addEventListener('change', () => {
      const mode = meshMode();
      const desired = desiredMeshKindForStep(state.stepIndex);
      if (mode === 'input' || mode === 'result') currentMeshKind = mode;
      else if (desired) currentMeshKind = desired;
      applyMesh();
    });
  wireEl?.addEventListener('change', applyViewerOptions);
  edgesEl?.addEventListener('change', applyViewerOptions);
  axesEl?.addEventListener('change', applyViewerOptions);
  gridEl?.addEventListener('change', applyViewerOptions);
  toggleBaseEl?.addEventListener('change', () => viewer.setBaseVisible(Boolean(toggleBaseEl.checked)));
  toggleSpineEl?.addEventListener('change', renderAll);
  togglePatchesEl?.addEventListener('change', renderAll);
  toggleIntfEl?.addEventListener('change', renderAll);
  toggleFacesEl?.addEventListener('change', renderAll);
  togglePtsEl?.addEventListener('change', renderAll);
  togglePtLinksEl?.addEventListener('change', renderAll);
  guidedEl?.addEventListener('change', renderAll);
  toggleAuxEl?.addEventListener('change', () => {
    state.selection = { ...state.selection, kind: 'stripe', stripeIndex: 0, surfDataIndex: null };
    renderAll();
  });

  fitBtn?.addEventListener('click', () => viewer.fitView());
  resetBtn?.addEventListener('click', () => viewer.resetView());

  // Basic picking for CommonPoints.
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  viewer.renderer.domElement.addEventListener('click', (ev) => {
    const rect = viewer.renderer.domElement.getBoundingClientRect();
    mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
    ray.setFromCamera(mouse, viewer.camera);
    const hits = ray.intersectObjects(overlays.selection.children, true);
    const hit = hits.find((h) => h?.object?.userData?.kind === 'commonPoint');
    if (!hit) return;
    const ud = hit.object.userData || {};
    select({ kind: 'commonPoint', stripeIndex: ud.stripeIndex, surfDataIndex: ud.surfDataIndex, commonPointLabel: ud.label });
  });

  const setStep = async (idx) => {
    state.stepIndex = Math.max(0, Math.min(tourSteps.length - 1, Number(idx) || 0));
    if (stepSel) stepSel.value = String(state.stepIndex);
    const step = tourSteps[state.stepIndex];
    try {
      step?.apply?.();
    } catch {}
    // Auto mesh mode: step-driven input/result defaults.
    if (meshMode() === 'auto') {
      const desired = desiredMeshKindForStep(state.stepIndex);
      if (desired && desired !== currentMeshKind) {
        currentMeshKind = desired;
        applyMesh();
      }
    }
    // Step 8 may have changed case.
    if (caseSel.value !== currentCaseId) await setCase(caseSel.value);
    renderAll();
  };

  stepSel?.addEventListener('change', () => void setStep(stepSel.value));
  stepPrevBtn?.addEventListener('click', () => void setStep(state.stepIndex - 1));
  stepNextBtn?.addEventListener('click', () => void setStep(state.stepIndex + 1));
  const highlightStep = async () => {
    await setStep(state.stepIndex);
    const target = lastHighlightTarget || overlays.selection || overlays.spine;
    pulse(target);
  };
  tourHighlightBtn?.addEventListener('click', () => void highlightStep());

  currentCaseId = caseSel.value;
  currentMeshKind = effectiveMeshKind();
  await setCase(currentCaseId);
  void setStep(0);
}

export function initChFiDSModelExplorer() {
  for (const root of Array.from(document.querySelectorAll('[data-cme]'))) {
    void initOne(root);
  }
}

initOnPageEvents(initChFiDSModelExplorer);
