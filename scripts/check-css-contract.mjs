// Comprueba el contrato entre build.mjs y la hoja de estilos.
//
// 1) COBERTURA: qué clases emite build.mjs y no estiliza el CSS.
// 2) TRAMPA DEL ATAJO `padding`: build.mjs emite cajas con dos clases a la vez
//    (<div class="wrap section">, "wrap product", "wrap p-desc", "wrap empty"…).
//    Si la segunda clase usa el atajo `padding: X 0`, borra el padding lateral que da .wrap
//    y el contenido queda pegado al borde en móvil. En esas clases hay que usar longhands.
//
// Uso: node scripts/check-css-contract.mjs [ruta.css]
import fs from 'fs';

const cssFile = process.argv[2] || 'src/styles.css';
const build = fs.readFileSync('build.mjs', 'utf8');
const css = fs.readFileSync(cssFile, 'utf8');
const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');

// --- clases que aparecen en el HTML generado ---
const used = new Set();
const combos = new Set();          // clases que comparten caja con otra (p. ej. "wrap section")
for (const m of build.matchAll(/class="([^"$]*)"/g)) {
  const list = m[1].split(/\s+/).filter(c => c && !c.includes('{'));
  list.forEach(c => used.add(c));
  if (list.includes('wrap')) list.filter(c => c !== 'wrap').forEach(c => combos.add(c));
}

// --- cobertura ---
const styled = new Set();
for (const m of clean.matchAll(/\.([A-Za-z][\w-]*)/g)) styled.add(m[1]);
const HOOKS = new Set(['amount', 'cart-whatsapp', 'gallery', 'p-info', 'search-toggle', 'free-ship-note']);
const missing = [...used].filter(c => !styled.has(c) && !HOOKS.has(c)).sort();

// --- trampa del atajo padding en las clases que comparten caja con .wrap ---
const hazards = [];
for (const cls of combos) {
  const re = new RegExp(`(^|[},])\\s*([^{}]*\\.${cls.replace(/[-]/g, '\\-')}\\b[^{}]*)\\{([^}]*)\\}`, 'g');
  for (const m of clean.matchAll(re)) {
    const sel = m[2].trim(), body = m[3];
    if (/(^|;)\s*padding\s*:/.test(body)) {
      const val = body.match(/(?:^|;)\s*padding\s*:\s*([^;]+)/)[1].trim();
      const parts = val.split(/\s+(?![^(]*\))/);
      const horizontal = parts.length === 1 ? parts[0] : parts[1];
      if (/^0(px|rem|em|%)?$/.test(horizontal)) hazards.push({ sel, val, cls });
    }
  }
}

console.log(`Hoja: ${cssFile}`);
console.log(`Clases en build.mjs: ${used.size} · sin estilo: ${missing.length}${missing.length ? ' → ' + missing.join(' ') : ''}`);
if (hazards.length) {
  console.log(`\n⚠ ${hazards.length} regla(s) con el atajo \`padding\` sobre una caja que también lleva .wrap:`);
  for (const h of hazards) console.log(`   ${h.sel} { padding: ${h.val} }  → borra el padding lateral de .wrap; usa padding-top/padding-bottom`);
} else {
  console.log('Sin atajos `padding` peligrosos en las cajas que comparten clase con .wrap.');
}
process.exitCode = (missing.length || hazards.length) ? 1 : 0;
