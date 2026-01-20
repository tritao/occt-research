// @ts-check
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

function detectTheme() {
  try {
    const t = String(document?.documentElement?.getAttribute('data-theme') || '').trim().toLowerCase();
    if (t === 'dark' || t === 'light') return t;
  } catch {}
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function createThreeViewer(container, setStatus) {
  const theme = detectTheme();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme === 'dark' ? 0x1b2330 : 0xf3f4f6);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1e6);
  camera.position.set(20, 18, 20);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.replaceChildren(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(12, 18, 10);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xbad6ff, 0.55);
  fill.position.set(-14, 10, 6);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(-6, 16, -14);
  scene.add(rim);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  let current = null;
  let currentEdges = null;
  let currentMeshUrl = null;
  let meshLoadId = 0;
  let lastLoadOk = true;
  let retryTimer = null;
  let retryDelayMs = 600;
  let wantEdges = true;
  let wantWireframe = false;
  let wantBaseVisible = true;
  let wantAxesVisible = true;
  let wantGridVisible = true;
  const defaultCameraPos = camera.position.clone();
  const defaultTarget = new THREE.Vector3(0, 0, 0);
  let lastFitTarget = defaultTarget.clone();
  let lastFitDist = 25;

  const grid = new THREE.GridHelper(
    50,
    10,
    theme === 'dark' ? 0x2f3b50 : 0xd1d5db,
    theme === 'dark' ? 0x202a3a : 0xe5e7eb,
  );
  grid.position.y = 0;
  grid.material.transparent = true;
  grid.material.opacity = theme === 'dark' ? 0.18 : 0.6;
  grid.visible = wantGridVisible;
  scene.add(grid);

  const axes = new THREE.AxesHelper(5);
  axes.material.transparent = true;
  axes.material.opacity = 0.6;
  axes.visible = wantAxesVisible;
  scene.add(axes);

  const material = new THREE.MeshStandardMaterial({
    color: 0x7fb4ff,
    roughness: 0.28,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  function fitToObject(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 1.6;
    lastFitTarget = center.clone();
    lastFitDist = dist;

    camera.position.set(center.x + dist, center.y + dist * 0.8, center.z + dist);
    camera.near = Math.max(0.001, dist / 1000);
    camera.far = Math.max(1000, dist * 10);
    camera.updateProjectionMatrix();

    controls.target.copy(center);
    controls.update();
  }

  function resetView() {
    camera.position.copy(defaultCameraPos);
    controls.target.copy(defaultTarget);
    camera.near = 0.01;
    camera.far = 1e6;
    camera.updateProjectionMatrix();
    controls.update();
  }

  function fitView() {
    if (current) {
      fitToObject(current);
      return;
    }
    camera.position.set(lastFitTarget.x + lastFitDist, lastFitTarget.y + lastFitDist * 0.8, lastFitTarget.z + lastFitDist);
    controls.target.copy(lastFitTarget);
    controls.update();
  }

  function setWireframe(on) {
    material.wireframe = on;
  }

  function clearEdges() {
    if (!currentEdges) return;
    try {
      if (current) current.remove(currentEdges);
    } catch {}
    try {
      currentEdges.geometry?.dispose?.();
    } catch {}
    try {
      currentEdges.material?.dispose?.();
    } catch {}
    currentEdges = null;
  }

  function clearMesh() {
    if (!current) return;
    try {
      scene.remove(current);
    } catch {}
    try {
      current.geometry?.dispose?.();
    } catch {}
    current = null;
    clearEdges();
  }

  function setEdges(on) {
    if (!current) return;
    if (on) {
      if (!currentEdges) {
        const edgesGeom = new THREE.EdgesGeometry(current.geometry, 30);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x0a0f16, transparent: true, opacity: 0.65 });
        currentEdges = new THREE.LineSegments(edgesGeom, lineMat);
        currentEdges.renderOrder = 10;
        current.add(currentEdges);
      }
    } else if (currentEdges) {
      clearEdges();
    }
  }

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  resize();

  function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  async function setMeshFromData(data) {
    currentMeshUrl = null;
    const positions = data?.positions;
    const indices = data?.indices;
    if (!Array.isArray(positions) || !Array.isArray(indices) || positions.length < 9 || indices.length < 3) {
      setStatus('No mesh: invalid format');
      return;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geom.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    geom.computeVertexNormals();

    if (current) {
      scene.remove(current);
      current.geometry.dispose();
    }
    clearEdges();
    current = new THREE.Mesh(geom, material);
    current.visible = wantBaseVisible;
    scene.add(current);
    fitToObject(current);
    setWireframe(wantWireframe);
    setEdges(wantEdges);
    setStatus('');
  }

  async function setMeshFromUrl(meshJsonUrl) {
    const url = String(meshJsonUrl || '');
    if (url && url === currentMeshUrl && current && lastLoadOk) {
      // Avoid flicker and unnecessary network work on UI toggles.
      setWireframe(wantWireframe);
      setEdges(wantEdges);
      setStatus('');
      return;
    }

    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
      retryDelayMs = 600;
    }

    currentMeshUrl = url;
    const loadId = ++meshLoadId;
    setStatus('Loading mesh…');
    let data;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        // Permanent missing mesh: don't retry and don't keep a stale previous mesh.
        if (res.status === 404 || res.status === 410) {
          if (loadId !== meshLoadId) return;
          lastLoadOk = false;
          clearMesh();
          setStatus(`Mesh not found (HTTP ${res.status}). Try switching Input/Result.`);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      data = await res.json();
    } catch (e) {
      if (loadId !== meshLoadId) return;
      lastLoadOk = false;
      // Keep the last good mesh visible (server restarts / transient failures should not blank the view).
      setStatus(`Mesh load failed: ${String(e)} (retrying…)`);
      retryTimer = setTimeout(() => {
        retryTimer = null;
        retryDelayMs = Math.min(5000, Math.floor(retryDelayMs * 1.6));
        void setMeshFromUrl(currentMeshUrl);
      }, retryDelayMs);
      return;
    }
    if (loadId !== meshLoadId) return;
    lastLoadOk = true;
    retryDelayMs = 600;
    await setMeshFromData(data);
  }

  function setWireframeSticky(on) {
    wantWireframe = Boolean(on);
    setWireframe(wantWireframe);
  }

  function setEdgesSticky(on) {
    wantEdges = Boolean(on);
    if (!current && wantEdges) return;
    setEdges(wantEdges);
  }

  function setBaseVisible(on) {
    wantBaseVisible = Boolean(on);
    if (!current) return;
    current.visible = wantBaseVisible;
  }

  function setAxesVisible(on) {
    wantAxesVisible = Boolean(on);
    axes.visible = wantAxesVisible;
  }

  function setGridVisible(on) {
    wantGridVisible = Boolean(on);
    grid.visible = wantGridVisible;
  }

  return {
    scene,
    camera,
    renderer,
    setMeshFromData,
    setMeshFromUrl,
    setWireframe: setWireframeSticky,
    setEdges: setEdgesSticky,
    setBaseVisible,
    setAxesVisible,
    setGridVisible,
    fitObject: (obj) => {
      if (!obj) return;
      fitToObject(obj);
    },
    fitView,
    resetView,
  };
}
