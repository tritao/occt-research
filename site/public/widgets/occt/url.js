// @ts-check

export function detectSitePrefix() {
  // Supports GitHub Pages base paths by inferring the prefix before `/occt/`.
  // Example: `/my-repo/occt/...` -> `/my-repo`
  try {
    const p = String(window.location?.pathname || '/');
    const idx = p.indexOf('/occt/');
    if (idx <= 0) return '';
    return p.slice(0, idx);
  } catch {
    return '';
  }
}

export function resolveUrl(u) {
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const prefix = detectSitePrefix();
  if (u.startsWith('/')) return `${prefix}${u}`;
  return `${prefix}/${u}`;
}

export async function fetchJson(url) {
  const res = await fetch(resolveUrl(url));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

