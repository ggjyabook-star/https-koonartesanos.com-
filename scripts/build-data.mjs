// Limpia y normaliza el catálogo exportado de Shopify (data/raw_*.json) y genera
// data/products.json, data/categories.json y data/blog.json, listos para el build.
import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('data/raw_products.json', 'utf8'));
const rawBlogs = JSON.parse(fs.readFileSync('data/raw_blogs.json', 'utf8'));
const imageMap = fs.existsSync('data/image-map.json') ? JSON.parse(fs.readFileSync('data/image-map.json', 'utf8')) : { products: {}, blog: {} };
const overrides = JSON.parse(fs.readFileSync('data/overrides.json', 'utf8'));

// ---------- utilidades de texto ----------
const TYPOS = [
  [/\bancentral\b/gi, 'ancestral'], [/\binovamos\b/gi, 'innovamos'], [/\bartesanias\b/g, 'artesanías'],
  [/\bArtesanias\b/g, 'Artesanías'], [/\batencion\b/g, 'atención'], [/\beleccion\b/g, 'elección'],
  [/\barticulos\b/g, 'artículos'], [/\bAqui\b/g, 'Aquí'], [/\baqui\b/g, 'aquí'], [/\bestretégicamente\b/g, 'estratégicamente'],
  [/\bborado\b/g, 'bordado'], [/\bnahuatl\b/g, 'náhuatl'], [/\bde de\b/g, 'de'], [/\bacompañara\b/g, 'acompañará'],
  [/\bdomino\b/g, 'dominó'], [/\bwirrarika\b/gi, 'wixárika'], [/\bWirrárika\b/g, 'Wixárika'], [/\bportatil\b/g, 'portátil'],
  [/\bPortatil\b/g, 'Portátil'], [/\bpoker\b/g, 'póker'], [/\bautentica\b/g, 'auténtica'], [/\bPOLITICAS\b/g, 'POLÍTICAS'],
  [/\bcalidad manos\b/g, 'cálidas manos'], [/\s{2,}/g, ' '],
];
export function fixTypos(s) { if (!s) return s; for (const [re, rep] of TYPOS) s = s.replace(re, rep); return s.trim(); }

function stripHtml(html) {
  return (html || '').replace(/<\/(p|li|h[1-6]|div|br)>/gi, ' ').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').replace(/\s+([,.;:)])/g, '$1').trim();
}

function cleanHtml(html) {
  if (!html) return '';
  let h = html;
  h = h.replace(/\s(data-[a-z0-9-]+|class|style|align|id|dir|aria-[a-z]+)="[^"]*"/gi, '');
  h = h.replace(/<\/?span[^>]*>/gi, '');
  h = h.replace(/<\/?(font|o:p)[^>]*>/gi, '');
  h = h.replace(/<b>/gi, '<strong>').replace(/<\/b>/gi, '</strong>').replace(/<i>/gi, '<em>').replace(/<\/i>/gi, '</em>');
  h = h.replace(/<h[1-6][^>]*>\s*<strong>\s*Descripci[oó]n:?\s*<\/strong>\s*<\/h[1-6]>/gi, '');
  h = h.replace(/<p[^>]*>\s*(<strong>\s*)*C[oó]digo\s*(<\/strong>\s*)*(<strong>)?\s*:?\s*(<\/strong>)?\s*(<strong>)?[^<]*(<\/strong>)?\s*<\/p>/gi, '');
  h = h.replace(/<ul>\s*<\/ul>/gi, '').replace(/<p>\s*(<br\s*\/?>\s*)*<\/p>/gi, '');
  h = h.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
  h = h.replace(/<strong>\s*<\/strong>/gi, '').replace(/<em>\s*<\/em>/gi, '');
  h = h.replace(/<(p|li|ul|h3|h4)>\s+/g, '<$1>').replace(/\s+<\/(p|li)>/g, '</$1>');
  // Mueve los espacios fuera de las negritas/cursivas y garantiza espacio entre palabras.
  h = h.replace(/<(strong|em)>\s+/g, ' <$1>').replace(/\s+<\/(strong|em)>/g, '</$1> ');
  h = h.replace(/<\/(strong|em)>(?=[A-Za-zÁÉÍÓÚáéíóúñÑ0-9])/g, '</$1> ').replace(/(?<=[A-Za-zÁÉÍÓÚáéíóúñÑ0-9,.])<(strong|em)>/g, ' <$1>');
  h = h.replace(/\s+([,.;:)])/g, '$1').replace(/<(p|li)>\s+/g, '<$1>').replace(/\s{2,}/g, ' ');
  // Un párrafo cuyo contenido completo está en negritas se vuelve texto normal.
  h = h.replace(/<p><strong>([^<]*)<\/strong><\/p>/g, '<p>$1</p>');
  h = fixTypos(h);
  return h.trim();
}

function truncate(s, n) {
  if (!s) return '';
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\-–]$/, '') + '…';
}

// Recorta en el límite de una oración completa si es posible; si no, en una palabra (sin puntos suspensivos).
function truncateSentence(s, n) {
  if (!s) return '';
  if (n < 25) return '';
  if (s.length <= n) return /[.!?]$/.test(s) ? s : s + '.';
  const cut = s.slice(0, n);
  const lastDot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.'));
  if (lastDot > n * 0.4) return cut.slice(0, lastDot + 1);
  const w = cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\-–(]+$/, '').replace(/\s+(de|del|la|el|los|las|y|o|con|para|por|en|un|una|que|su|sus|al|a)$/i, '');
  return w ? w + '.' : '';
}

function sentenceCase(t) {
  // Convierte títulos "Todo En Mayúsculas Iniciales" a estilo español, respetando nombres propios.
  const keep = new Set(['Koon', 'Artesanos', 'Tatei', 'TATEI', 'Premium', 'Origen', 'Colección', 'Serena', 'Armonía', 'Backgammon', 'Jenga', 'Rummy', 'Mantarraya', 'L', 'Huichol', 'Otomí', 'Brocado', 'México', 'Mujer', 'Hombre']);
  return t.split(' ').map((w, i) => {
    if (i === 0) return w;
    if (keep.has(w)) return w;
    if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(w)) return w.toLowerCase();
    return w;
  }).join(' ');
}

const COLOR_CANON = {
  'aqua obscuro': 'Aqua obscuro', 'azul cobalto': 'Azul cobalto', 'burgundy': 'Burgundy', 'fiusha': 'Fiusha', 'gris oxford': 'Gris oxford',
  'mango': 'Mango', 'moka': 'Moka', 'morado': 'Morado', 'naranja fuerte': 'Naranja fuerte', 'negro': 'Negro', 'rojo quemado': 'Rojo quemado',
  'verde limon': 'Verde limón', 'verde limón': 'Verde limón', 'verde botella': 'Verde botella', 'caramel': 'Caramel', 'taupe': 'Taupe', 'taupe2': 'Taupe claro',
  'nuty': 'Nuty', 'hueso': 'Hueso', 'cajeta': 'Cajeta', 'gris medio': 'Gris medio', 'azul marino': 'Azul marino', 'mostaza': 'Mostaza', 'mostaza koon': 'Mostaza',
  'beige': 'Beige', 'alpha nude': 'Alpha Nude', 'sonora gris': 'Sonora Gris', 'elite marfil': 'Elite Marfil', 'atena azul': 'Atena Azul',
};
export const COLOR_HEX = {
  'Aqua obscuro': '#1f6f78', 'Azul cobalto': '#1e3f8a', 'Burgundy': '#6b1f2b', 'Fiusha': '#c2185b', 'Gris oxford': '#4a4a4f', 'Mango': '#e3a02b',
  'Moka': '#5b3a29', 'Morado': '#5a2d82', 'Naranja fuerte': '#e0561f', 'Negro': '#111111', 'Rojo quemado': '#a32a1c', 'Verde limón': '#8bb31d',
  'Verde botella': '#1f4d3a', 'Caramel': '#b8763a', 'Taupe': '#8c7b6b', 'Taupe claro': '#a8998a', 'Nuty': '#c9a27e', 'Hueso': '#e9e2d3', 'Cajeta': '#a5672f',
  'Gris medio': '#8d8d8d', 'Azul marino': '#1b2a4a', 'Mostaza': '#c9a227', 'Beige': '#d8c7ad', 'Alpha Nude': '#d9b8a3', 'Sonora Gris': '#9a9a99',
  'Elite Marfil': '#efe6d6', 'Atena Azul': '#3b5f8f',
};
function canonColor(v) {
  const k = v.trim().toLowerCase();
  if (COLOR_CANON[k]) return COLOR_CANON[k];
  // Combinaciones "Aqua obscuro-Moka"
  if (k.includes('-')) return k.split('-').map(p => canonColor(p)).join(' / ');
  return v.trim().charAt(0).toUpperCase() + v.trim().slice(1);
}

// ---------- categorías (por etiqueta de Shopify) ----------
const CATEGORIES = JSON.parse(fs.readFileSync('data/categories-src.json', 'utf8'));
const tagIndex = {};
for (const c of CATEGORIES) for (const t of c.tags) tagIndex[t.toLowerCase()] = tagIndex[t.toLowerCase()] || [];
for (const c of CATEGORIES) for (const t of c.tags) tagIndex[t.toLowerCase()].push(c.slug);

// ---------- productos ----------
function localImages(handle, images) {
  const local = imageMap.products[handle] || [];
  return images.map((im, i) => {
    const l = local[i];
    const exists = l && fs.existsSync('public' + l.file);
    return { src: exists ? l.file : im.url + (im.url.includes('?') ? '&' : '?') + 'width=1000', alt: '', w: im.width, h: im.height, remote: im.url };
  });
}

const products = [];
for (const p of raw) {
  const ov = overrides.products[p.handle] || {};
  let title = ov.title || fixTypos(p.title.replace(/\s*\|\s*Koon Artesanos\s*$/i, '').replace(/\s+\|\s+/g, ' | ').replace(/\bPREMIUM\b/g, 'Premium').trim());
  if (!/TATEI|Tatei/.test(title)) title = sentenceCase(title);
  const codeMatch = p.descriptionHtml.match(/C[oó]digo\s*(?:<\/strong>\s*<strong>)?\s*:?\s*(?:<\/strong>\s*<strong>)?\s*([0-9A-Z][0-9A-Z\-]*)/i);
  const code = ov.code || (codeMatch ? codeMatch[1].replace(/<[^>]+>/g, '').trim() : '');
  let descriptionHtml = ov.descriptionHtml || cleanHtml(p.descriptionHtml);
  const plain = fixTypos(stripHtml(descriptionHtml));
  const specs = {};
  const peso = plain.match(/Peso:\s*([\d.,]+\s*(?:kg|g|gr))/i); if (peso) specs.peso = peso[1].replace(/\s+/g, ' ');
  const dim = plain.match(/Dimensiones:\s*([\d.,]+\s*x\s*[\d.,]+(?:\s*x\s*[\d.,]+)?)/i); if (dim) specs.dimensiones = dim[1].replace(/\s*x\s*/g, ' × ') + ' cm';
  const medidas = plain.match(/Medidas:\s*([^.]+?)(?:\s+Las medidas|\.|$)/i); if (medidas && !dim) specs.medidas = medidas[1].trim();
  const incluye = descriptionHtml.match(/<li>(?:<strong>)?\s*Incluye:?\s+([^<]+)/i) || plain.match(/Incluye:?\s+([^.]+)/i); if (incluye) specs.incluye = incluye[1].trim();

  const images = localImages(p.handle, p.images.edges.map(e => e.node));
  images.forEach((im, i) => { im.alt = i === 0 ? `${title} de piel genuina hecho a mano por Koon Artesanos` : `${title} – vista ${i + 1}`; });
  const remoteIndex = new Map(images.map((im, i) => [im.remote.split('?')[0], i]));

  const optionNameRaw = (p.options[0] && p.options[0].name) || 'Opción';
  const optionName = /forma/i.test(optionNameRaw) ? 'Forma' : 'Color';
  const seen = new Set();
  const variants = [];
  for (const e of p.variants.edges) {
    const v = e.node;
    let val = v.selectedOptions.map(o => o.value).join(' / ');
    val = optionName === 'Color' ? canonColor(val) : val.trim().replace(/^Llavero\s+/i, '');
    if (seen.has(val)) continue; seen.add(val);
    const imgIdx = v.image ? remoteIndex.get(v.image.url.split('?')[0]) : undefined;
    variants.push({ id: v.id, value: val, price: Math.round(parseFloat(v.price.amount)), available: v.availableForSale, image: imgIdx !== undefined ? imgIdx : null, sku: v.sku || null });
  }
  const price = Math.round(parseFloat(p.priceRange.minVariantPrice.amount));
  const maxPrice = Math.round(parseFloat(p.priceRange.maxVariantPrice.amount));
  const compareAt = p.compareAtPriceRange && parseFloat(p.compareAtPriceRange.minVariantPrice.amount) > price ? Math.round(parseFloat(p.compareAtPriceRange.minVariantPrice.amount)) : null;

  const cats = new Set();
  for (const t of p.tags) for (const s of (tagIndex[t.toLowerCase()] || [])) cats.add(s);
  if (ov.categories) ov.categories.forEach(c => cats.add(c));
  if (!cats.size) cats.add('hogar');

  const isTatei = p.tags.includes('catalogo_tatei');
  const brand = isTatei ? 'Tatei by Koon Artesanos' : 'Koon Artesanos';
  const seoTitle = ov.seoTitle || [/piel|cuero/i.test(title) || isTatei ? `${title} | ${brand}` : `${title} de piel | ${brand}`, `${title} | Koon Artesanos`, title].find(t => t.length <= 65);
  // Descripción única por producto: se eliminan las frases genéricas repetidas en decenas de fichas.
  const BOILER = [/Pieza única hecha a mano con amor por artesanos mexicanos de excelente calidad para que dure toda la vida\.?/gi, /Combinando la vanguardia y la funcionalidad,? logramos que cada componente esté en armonía\.?/gi, /Lo que hace especial a cada producto es su fabricación 100% artesanal\.?/gi, /Un proyecto donde se crean Obras Maestras donde se honran los Juegos Mexicanos\.?/gi, /Manifiesta el cielo en la tierra integrando la sabiduría, fortaleza y justicia que observamos en la geometría sagrada de la naturaleza\.?/gi, /Cada juego revela una energía diferente\. Elige lo que deseas transmitir en un espacio\.?/gi];
  let baseDesc = plain.replace(/Hecho con piel 100% natural.*$/i, '').replace(/\*\s*El tiempo de entrega.*$/i, '').replace(/Descripción:\s*/i, '');
  for (const re of BOILER) baseDesc = baseDesc.replace(re, ' ');
  baseDesc = baseDesc.replace(/\s{2,}/g, ' ').trim();
  const nColors = optionName === 'Color' ? variants.length : 0;
  const tail = nColors > 1 ? ` Disponible en ${nColors} colores de piel.` : (optionName === 'Forma' ? ` ${variants.length} diseños disponibles.` : '');
  const lead = isTatei ? `${title}: arte wixárika en chaquira sobre piel, hecho a mano en México.` : `${title}. Piel genuina hecha a mano en México.`;
  const seoDescription = ov.seoDescription || `${lead} ${truncateSentence(baseDesc, 156 - lead.length - tail.length)}${tail}`.replace(/\s{2,}/g, ' ').replace(/\.\s*\./g, '.').trim();

  products.push({
    handle: p.handle, title, code, price, maxPrice, compareAtPrice: compareAt, currency: 'MXN', available: p.availableForSale,
    descriptionHtml, description: plain, specs, images, optionName, variants,
    categories: [...cats], tags: p.tags, type: p.productType, createdAt: p.createdAt,
    isNew: p.tags.map(t => t.toLowerCase()).includes('nuevo'), isStar: p.tags.includes('producto_estrella'),
    seoTitle, seoDescription,
  });
}
// Las fotos con el letrero "Nuevo producto" incrustado se mandan al final de la galería, para que la
// principal siempre sea una toma limpia. El listado lo produce `node scripts/scan-banners.mjs`.
if (fs.existsSync('data/banner-scan.json')) {
  const scan = Object.fromEntries(JSON.parse(fs.readFileSync('data/banner-scan.json', 'utf8')).map(r => [r.handle, r]));
  let moved = 0;
  for (const p of products) {
    const r = scan[p.handle];
    if (!r || !r.clean.length || r.flagged.length + r.clean.length !== p.images.length) continue;
    const ordered = [...r.clean, ...r.flagged];
    if (ordered[0] === 0) continue;
    const idxMap = new Map(ordered.map((oldI, newI) => [oldI, newI]));
    p.images = ordered.map(i => p.images[i]);
    for (const v of p.variants) if (v.image != null) v.image = idxMap.has(v.image) ? idxMap.get(v.image) : null;
    p.images.forEach((im, i) => { im.alt = i === 0 ? `${p.title} de piel genuina hecho a mano por Koon Artesanos` : `${p.title} – vista ${i + 1}`; });
    moved++;
  }
  if (moved) console.log(`Fotos con letrero reordenadas en ${moved} productos.`);
}

products.sort((a, b) => (b.isStar - a.isStar) || (b.isNew - a.isNew) || (new Date(b.createdAt) - new Date(a.createdAt)));
fs.writeFileSync('data/products.json', JSON.stringify(products, null, 1));

// ---------- categorías con productos ----------
const categories = CATEGORIES.map(c => ({
  ...c,
  seoTitle: c.seoTitle.length <= 65 ? c.seoTitle : [c.seoTitle.replace(/\s*\|\s*Koon Artesanos$/, ''), `${c.h1} | Koon Artesanos`, c.h1].find(t => t.length <= 65),
  seoDescription: truncate(c.seoDescription, 158),
  products: products.filter(p => p.categories.includes(c.slug)).map(p => p.handle),
}));
fs.writeFileSync('data/categories.json', JSON.stringify(categories, null, 1));

// ---------- blog ----------
const blog = [];
for (const b of rawBlogs.blogs.edges) for (const e of b.node.articles.edges) {
  const a = e.node;
  const local = imageMap.blog[a.handle];
  const image = local && fs.existsSync('public' + local) ? local : (a.image ? a.image.url + '&width=1200' : null);
  let html = cleanHtml(a.contentHtml).replace(/<img([^>]*)src="([^"]+)"/g, (m, pre, src) => `<img${pre}src="${src}" loading="lazy"`);
  html = html.replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<a[^>]+href="\/cdn\/[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  // Reescribe los enlaces antiguos (Shopify / sitio anterior) a las rutas nuevas.
  const SHOP_MAP = { juegos: '/categoria/juegos/', regalos_corporativos: '/categoria/regalos-corporativos/', 'regalos-corporativos': '/categoria/regalos-corporativos/', personalizacion: '/personalizacion/', huichol: '/categoria/huichol/', hogar: '/categoria/hogar/', oficina: '/categoria/oficina/', otomi: '/categoria/otomi/', papel_amate: '/categoria/papel-amate/', brocado: '/categoria/brocado/', viajes: '/categoria/viajes/', hoteleria: '/categoria/hoteleria/', catalogo_general: '/tienda/', mujer: '/categoria/mujer/', hombre: '/categoria/hombre/', vinos: '/categoria/vinos/' };
  const handles = new Set(products.map(p => p.handle));
  html = html.replace(/href="([^"]+)"/gi, (m, href) => {
    const h = href.replace(/&amp;/g, '&');
    if (!/koonartesanos\.com/i.test(h) && !h.startsWith('/')) return m;
    let mm;
    if ((mm = h.match(/\/products\/([a-z0-9-]+)/i))) return `href="${handles.has(mm[1]) ? '/producto/' + mm[1] + '/' : '/tienda/'}"`;
    if ((mm = h.match(/\/blogs\/[a-z0-9-]+\/([a-z0-9-]+)/i))) return `href="/blog/${mm[1]}/"`;
    if ((mm = h.match(/\/shop\/([a-z0-9_-]+)/i))) return `href="${SHOP_MAP[mm[1]] || '/tienda/'}"`;
    if ((mm = h.match(/\/search\?query=([^&"]+)/i))) return `href="/buscar/?q=${mm[1]}"`;
    if (/\/collections\//i.test(h) || /\/pages\//i.test(h)) return 'href="/tienda/"';
    if (/^https?:\/\/(www\.)?koonartesanos\.com\/?$/i.test(h)) return 'href="/"';
    return m;
  });
  const plain = stripHtml(html);
  blog.push({
    handle: a.handle, title: fixTypos(a.title), date: a.publishedAt.slice(0, 10), author: (a.authorV2 && a.authorV2.name) || 'Koon Artesanos',
    image, imageAlt: (a.image && a.image.altText) || a.title, contentHtml: html, excerpt: fixTypos(a.excerpt || truncate(plain, 160)),
    seoDescription: truncateSentence(fixTypos((a.seo && a.seo.description) || plain), 158), tags: a.tags, readingMinutes: Math.max(1, Math.round(plain.split(' ').length / 200)),
  });
}
blog.sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync('data/blog.json', JSON.stringify(blog, null, 1));

console.log(`Productos: ${products.length} | Categorías: ${categories.length} | Artículos: ${blog.length}`);
for (const c of categories) console.log(`  ${c.slug.padEnd(28)} ${c.products.length}`);
console.log('Sin categoría:', products.filter(p => !p.categories.length).length, '| imágenes locales:', products.filter(p => p.images[0].src.startsWith('/img')).length);
