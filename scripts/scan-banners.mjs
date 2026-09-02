// Detecta las fotos que traen incrustado el letrero "Nuevo producto" (un gráfico superpuesto por la
// tienda anterior) para no usarlas como imagen principal ni mostrarlas primero en la galería.
//
// Método: coincidencia de plantilla. El letrero es siempre el mismo gráfico, así que se recorta la zona
// superior derecha y se compara en escala de grises contra una referencia conocida, deslizando la
// plantilla en una pequeña ventana por si la posición varía un poco. El error medio separa con holgura:
// las fotos con letrero quedan por debajo de 50 y las limpias por encima de 80.
//
// Uso:  node scripts/scan-banners.mjs            → escribe data/banner-scan.json
//       node scripts/scan-banners.mjs --apply    → además reordena las imágenes en data/products.json
import fs from 'fs';
import sharp from 'sharp';

const REF_FILE = 'public/img/products/porta-ipad-1.webp';
const CROP = { x: 0.40, y: 0.0, w: 0.60, h: 0.13 };  // zona del letrero, en proporción de la imagen
const TW = 180, TH = 40;                              // tamaño normalizado de la plantilla
const MAX_ERR = 50;                                   // error medio máximo para darlo por coincidencia
const OFFSETS = [-0.04, -0.02, 0, 0.02, 0.04];        // ventana de búsqueda horizontal

async function cropGray(file, x, y, w, h) {
  const m = await sharp(file).metadata();
  const left = Math.max(0, Math.min(m.width - 2, Math.round(m.width * x)));
  const top = Math.max(0, Math.min(m.height - 2, Math.round(m.height * y)));
  const width = Math.max(1, Math.min(m.width - left, Math.round(m.width * w)));
  const height = Math.max(1, Math.min(m.height - top, Math.round(m.height * h)));
  const { data } = await sharp(file).extract({ left, top, width, height })
    .resize(TW, TH, { fit: 'fill' }).greyscale().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return data;
}

let REF = null;
async function refTemplate() { return REF || (REF = await cropGray(REF_FILE, CROP.x, CROP.y, CROP.w, CROP.h)); }

export async function scanImage(file) {
  const ref = await refTemplate();
  let best = Infinity;
  for (const dx of OFFSETS) {
    for (const dy of [0, 0.015]) {
      let a;
      try { a = await cropGray(file, CROP.x + dx, CROP.y + dy, CROP.w, CROP.h); } catch (e) { continue; }
      let sum = 0;
      for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - ref[i]);
      best = Math.min(best, sum / a.length);
    }
  }
  return { file, err: +best.toFixed(1), banner: best < MAX_ERR };
}

if (process.argv[1] && process.argv[1].endsWith('scan-banners.mjs')) {
  const apply = process.argv.includes('--apply');
  const products = JSON.parse(fs.readFileSync('data/products.json', 'utf8'));
  const report = [];
  const queue = products.slice();
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      const marks = [];
      for (let i = 0; i < p.images.length; i++) {
        const f = 'public' + p.images[i].src;
        if (!fs.existsSync(f)) { marks.push(null); continue; }
        try { marks.push(await scanImage(f)); } catch (e) { marks.push(null); }
      }
      const flagged = marks.map((m, i) => (m && m.banner ? i : -1)).filter(i => i >= 0);
      if (flagged.length) report.push({
        handle: p.handle, title: p.title, images: p.images.length, flagged,
        clean: marks.map((m, i) => (m && !m.banner ? i : -1)).filter(i => i >= 0),
        err: flagged.map(i => marks[i].err),
      });
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  report.sort((a, b) => a.handle.localeCompare(b.handle));
  fs.writeFileSync('data/banner-scan.json', JSON.stringify(report, null, 1));
  const primary = report.filter(r => r.flagged.includes(0));
  console.log(`Fotos con letrero en ${report.length} productos · imagen PRINCIPAL afectada en ${primary.length}`);
  for (const r of report) console.log(`  ${r.handle}: letrero en [${r.flagged}] (err ${r.err}) · limpias [${r.clean}]`);
  const noClean = report.filter(r => !r.clean.length);
  if (noClean.length) console.log(`SIN foto limpia: ${noClean.map(r => r.handle).join(', ')}`);

  if (apply) {
    let moved = 0, total = 0;
    const byHandle = Object.fromEntries(report.map(r => [r.handle, r]));
    for (const p of products) {
      const r = byHandle[p.handle];
      if (!r || !r.clean.length) continue;
      const ordered = [...r.clean, ...r.flagged];   // primero las limpias; las del letrero, al final
      if (ordered[0] !== 0) moved++;
      total += r.flagged.length;
      const idxMap = new Map(ordered.map((oldI, newI) => [oldI, newI]));
      p.images = ordered.map(i => p.images[i]);
      for (const v of p.variants) if (v.image != null) v.image = idxMap.has(v.image) ? idxMap.get(v.image) : null;
      p.images.forEach((im, i) => { im.alt = i === 0 ? `${p.title} de piel genuina hecho a mano por Koon Artesanos` : `${p.title} – vista ${i + 1}`; });
    }
    fs.writeFileSync('data/products.json', JSON.stringify(products, null, 1));
    console.log(`Aplicado: ${moved} productos cambiaron de foto principal; ${total} fotos con letrero movidas al final.`);
  }
}
