// Previsualiza una hoja de estilos candidata sobre el sitio ya generado, sin tocar src/.
// Copia el CSS a dist/assets/styles.css e inyecta en el <head> el <link> de Google Fonts que
// la propia hoja declara en su comentario de cabecera.
//   node scripts/preview-design.mjs <ruta-al-css>
//   node scripts/preview-design.mjs --restore     → vuelve a la hoja de src/
import fs from 'fs';
import path from 'path';

const DIST = 'dist';
const arg = process.argv[2];
if (!arg) { console.error('Uso: node scripts/preview-design.mjs <ruta.css> | --restore'); process.exit(1); }

const src = arg === '--restore' ? 'src/styles.css' : arg;
const css = fs.readFileSync(src, 'utf8');
fs.writeFileSync(path.join(DIST, 'assets', 'styles.css'), css);

// El <link> de fuentes declarado en el comentario de cabecera del CSS candidato.
const m = css.match(/https:\/\/fonts\.googleapis\.com\/css2\?[^\s"'<>)]+/);
const fontHref = m ? m[0] : null;

const pages = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : (p.endsWith('.html') && pages.push(p)); } })(DIST);

let touched = 0;
for (const f of pages) {
  let html = fs.readFileSync(f, 'utf8');
  html = html.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*">/,
    fontHref ? `<link rel="stylesheet" href="${fontHref}">` : '$&');
  fs.writeFileSync(f, html); touched++;
}
console.log(`Aplicado ${src} a ${touched} páginas.${fontHref ? ' Fuentes: ' + fontHref.replace('https://fonts.googleapis.com/css2?family=', '') : ' (sin cambio de fuentes)'}`);
