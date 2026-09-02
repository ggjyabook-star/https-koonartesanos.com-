// Compara las clases que genera build.mjs con las que estiliza una hoja candidata.
import fs from 'fs';
const build = fs.readFileSync('build.mjs', 'utf8');
const used = new Set();
for (const m of build.matchAll(/class="([^"$]*)"/g)) for (const c of m[1].split(/\s+/)) if (c && !c.includes('{')) used.add(c);
for (const m of build.matchAll(/className:\s*'([^']+)'/g)) for (const c of m[1].split(/\s+/)) used.add(c);
const files = process.argv.slice(2);
const rows = [];
for (const f of files) {
  const css = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const styled = new Set();
  for (const m of css.matchAll(/\.([A-Za-z][\w-]*)/g)) styled.add(m[1]);
  const missing = [...used].filter(c => !styled.has(c)).sort();
  rows.push({ f: f.split(/[\/]/).pop(), missing });
}
console.log(`Clases usadas en build.mjs: ${used.size}`);
for (const r of rows) console.log(`${r.f.padEnd(16)} faltan ${String(r.missing.length).padStart(2)}: ${r.missing.join(' ') || '—'}`);
