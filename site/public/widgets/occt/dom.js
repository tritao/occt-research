// @ts-check

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined) continue;
    if (k === 'class') node.className = String(v);
    else node.setAttribute(k, String(v));
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function fmt(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number' && v === -1) return 'N/A';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return '—';
    if (Number.isInteger(v)) return String(v);
    const abs = Math.abs(v);
    const sig = 7;
    let s;
    if (abs !== 0 && (abs >= 1e6 || abs < 1e-4)) s = v.toExponential(4);
    else s = v.toPrecision(sig);
    const parts = s.split('e');
    let mantissa = parts[0];
    if (mantissa.includes('.')) mantissa = mantissa.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
    if (parts.length === 2) return `${mantissa}e${parts[1].replace(/^\+/, '')}`;
    return mantissa;
  }
  if (typeof v === 'string') return v || '—';
  return JSON.stringify(v);
}

export function listKV(obj) {
  if (!obj || typeof obj !== 'object') return '—';
  const entries = Object.entries(obj);
  if (!entries.length) return '—';
  return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
}
