// @ts-check

export function detectSitePrefix() {
  // Supports GitHub Pages base paths by inferring the prefix.
  //
  // Primary signal: the widget module URL, which always includes the base prefix.
  // Example: `https://host/my-repo/widgets/occt/url.js` -> `/my-repo`
  try {
    const p = new URL(import.meta.url).pathname;
    const idx = p.indexOf('/widgets/');
    if (idx > 0) return p.slice(0, idx);
  } catch {}

  // Fallback: infer prefix from current page URL by looking for `/occt/`.
  // Example: `/my-repo/occt/...` -> `/my-repo`
  try {
    const p = String(window.location?.pathname || '/');
    const idx = p.indexOf('/occt/');
    if (idx > 0) return p.slice(0, idx);
  } catch {
    return '';
  }
  return '';
}

export function resolveUrl(u) {
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const prefix = detectSitePrefix();
  if (prefix && (u === prefix || u.startsWith(`${prefix}/`))) return u;
  if (u.startsWith('/')) return `${prefix}${u}`;
  return `${prefix}/${u}`;
}

export async function fetchJson(url) {
  const res = await fetch(resolveUrl(url));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
