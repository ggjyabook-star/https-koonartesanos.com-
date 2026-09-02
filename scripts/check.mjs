// Verifica el sitio generado: enlaces internos rotos, imágenes faltantes, títulos/descripciones duplicados o largos.
import fs from 'fs';
import path from 'path';
const OUT = 'dist';
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : (p.endsWith('.html') && files.push(p)); } })(OUT);
const exists = u => { const p = u.split(/[?#]/)[0]; if (!p.startsWith('/')) return true; const f = path.join(OUT, p); return fs.existsSync(f) || fs.existsSync(path.join(f, 'index.html')) || fs.existsSync(f + '.html'); };
const titles = {}, descs = {}; let broken = 0, missingImg = 0, longT = 0, longD = 0, noH1 = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || ''; const d = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  (titles[t] = titles[t] || []).push(f); (descs[d] = descs[d] || []).push(f);
  if (t.length > 70) longT++; if (d.length > 165) longD++;
  if (!/<h1[\s>]/.test(html)) { noH1++; console.log('Sin H1:', f); }
  for (const m of html.matchAll(/href="([^"]+)"/g)) { const u = m[1]; if (u.startsWith('/') && !exists(u)) { broken++; if (broken < 15) console.log('Enlace roto:', u, 'en', f); } }
  for (const m of html.matchAll(/<img[^>]+src="([^"]+)"/g)) { const u = m[1]; if (u.startsWith('/') && !exists(u)) { missingImg++; if (missingImg < 15) console.log('Imagen faltante:', u, 'en', f); } }
}
const dupT = Object.entries(titles).filter(([, v]) => v.length > 1), dupD = Object.entries(descs).filter(([, v]) => v.length > 1);
console.log(`Páginas: ${files.length} · enlaces rotos: ${broken} · imágenes faltantes: ${missingImg} · sin H1: ${noH1}`);
console.log(`Títulos duplicados: ${dupT.length} · descripciones duplicadas: ${dupD.length} · títulos >70: ${longT} · descripciones >165: ${longD}`);
dupT.slice(0, 5).forEach(([t, v]) => console.log('  título dup:', t, '→', v.length));
dupD.slice(0, 5).forEach(([t, v]) => console.log('  desc dup:', t.slice(0, 60), '→', v.length));
