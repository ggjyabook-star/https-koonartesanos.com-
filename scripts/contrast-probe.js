// Sonda de contraste: se ejecuta en el navegador sobre una página ya renderizada.
// Recorre cada nodo de texto visible, resuelve el color de fondo real (subiendo por los ancestros
// hasta encontrar uno opaco) y calcula la relación de contraste WCAG. Devuelve los incumplimientos.
(() => {
  const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };
  const over = (fg, bg, a) => fg.map((c, i) => c * a + bg[i] * (1 - a));
  function bgOf(el) {
    let node = el, acc = null;
    while (node && node !== document.documentElement.parentNode) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0) { acc = acc ? over(acc.rgb, c.rgb, acc.a) : c.rgb; if (c.a >= 1) return acc; acc = { rgb: acc, a: 1 }; return acc.rgb; }
      node = node.parentElement;
    }
    return [255, 255, 255];
  }
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const bad = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!el.childNodes.length) continue;
    const txt = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    if (!txt) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const fg = parse(cs.color); if (!fg) continue;
    const bg = bgOf(el);
    const color = fg.a < 1 ? over(fg.rgb, bg, fg.a) : fg.rgb;
    const size = parseFloat(cs.fontSize), weight = +cs.fontWeight || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const got = ratio(color, bg);
    if (got < need) {
      const key = cs.color + '|' + bg.join(',') + '|' + large;
      if (seen.has(key)) continue; seen.add(key);
      bad.push({ txt: txt.slice(0, 42), sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''), color: cs.color, bg: `rgb(${bg.map(Math.round).join(',')})`, size: Math.round(size), got: +got.toFixed(2), need });
    }
  }
  return { url: location.pathname, fallos: bad.length, detalle: bad.slice(0, 14) };
})()
