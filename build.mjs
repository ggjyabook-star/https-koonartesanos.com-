// Generador del sitio estático de Koon Artesanos.
// Lee data/*.json y escribe todas las páginas HTML pre-renderizadas en dist/ (SEO completo:
// títulos y descripciones únicos, canonical, Open Graph, JSON-LD, sitemap.xml, robots.txt).
import fs from 'fs';
import path from 'path';

const OUT = 'dist';
const store = JSON.parse(fs.readFileSync('data/store.json', 'utf8'));
const products = JSON.parse(fs.readFileSync('data/products.json', 'utf8'));
const categories = JSON.parse(fs.readFileSync('data/categories.json', 'utf8'));
const blog = JSON.parse(fs.readFileSync('data/blog.json', 'utf8'));
const byHandle = Object.fromEntries(products.map(p => [p.handle, p]));
const catBySlug = Object.fromEntries(categories.map(c => [c.slug, c]));
const SITE = store.url.replace(/\/$/, '');
const TODAY = new Date().toISOString().slice(0, 10);
const money = n => '$' + Number(n).toLocaleString('es-MX');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const abs = u => (u && u.startsWith('http')) ? u : SITE + u;
const COLOR_HEX = { 'Aqua obscuro': '#1f6f78', 'Azul cobalto': '#1e3f8a', 'Burgundy': '#6b1f2b', 'Fiusha': '#c2185b', 'Gris oxford': '#4a4a4f', 'Mango': '#e3a02b', 'Moka': '#5b3a29', 'Morado': '#5a2d82', 'Naranja fuerte': '#e0561f', 'Negro': '#111111', 'Rojo quemado': '#a32a1c', 'Verde limón': '#8bb31d', 'Verde botella': '#1f4d3a', 'Caramel': '#b8763a', 'Taupe': '#8c7b6b', 'Taupe claro': '#a8998a', 'Nuty': '#c9a27e', 'Hueso': '#e9e2d3', 'Cajeta': '#a5672f', 'Gris medio': '#8d8d8d', 'Azul marino': '#1b2a4a', 'Mostaza': '#c9a227', 'Beige': '#d8c7ad', 'Alpha Nude': '#d9b8a3', 'Sonora Gris': '#9a9a99', 'Elite Marfil': '#efe6d6', 'Atena Azul': '#3b5f8f' };
const hexFor = v => COLOR_HEX[v] || (v.includes(' / ') ? COLOR_HEX[v.split(' / ')[0]] : null) || '#cfc7bc';

// ---------- iconos ----------
const I = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6h15l-1.5 8h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  wa: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 1.7.7 2.3.8 3.1.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2l-.5-.3z"/></svg>',
  fb: '<svg viewBox="0 0 24 24"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.7-4.5 4.5V11H7v4h2.5v7h4v-7H17l.5-4h-4V9c0-.6.4-1 .5-1z"/></svg>',
  ig: '<svg viewBox="0 0 24 24"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM21 8.1c-.1-1.6-.4-3-1.6-4.2S16.7 2.4 15.1 2.3C13.4 2.2 10.6 2.2 8.9 2.3 7.3 2.4 5.9 2.7 4.7 3.9S3.2 6.5 3.1 8.1C3 9.8 3 14.2 3.1 15.9c.1 1.6.4 3 1.6 4.2s2.6 1.5 4.2 1.6c1.7.1 6.5.1 8.2 0 1.6-.1 3-.4 4.2-1.6s1.5-2.6 1.6-4.2c.1-1.7.1-6.1 0-7.8zm-2 9.6a3.3 3.3 0 0 1-1.9 1.9c-1.3.5-4.4.4-5.1.4s-3.8.1-5.1-.4a3.3 3.3 0 0 1-1.9-1.9c-.5-1.3-.4-4.4-.4-5.7s-.1-4.4.4-5.7A3.3 3.3 0 0 1 6.9 4.4c1.3-.5 4.4-.4 5.1-.4s3.8-.1 5.1.4a3.3 3.3 0 0 1 1.9 1.9c.5 1.3.4 4.4.4 5.7s.1 4.4-.4 5.7z"/></svg>',
  amz: '<svg viewBox="0 0 24 24"><path d="M15.8 13.6c-.3.6-.9 1.4-2.1 1.7-.9.2-1.9-.2-2.2-1.1-.6-1.5.8-2.5 2.2-2.8.7-.2 1.5-.2 2.1-.2v.5c0 .7.1 1.3 0 1.9zm2.4 3.2c-.4-.5-.5-1.2-.5-2V9.6c0-2.2-1.6-3.5-4.7-3.5-2 0-4.4.7-5 3l2.6.3c.2-.9.9-1.4 2-1.4 1.3 0 1.9.6 1.9 1.9v.4c-3.4.1-7.4.6-7.4 4.1 0 2.1 1.5 3.5 3.7 3.5 1.5 0 2.7-.5 3.8-1.6.3.5.6 1 1.2 1.5l2.4-2zM3 18.5c3 1.8 6.2 2.7 9.7 2.7 3.1 0 6.3-.7 8.6-2.4.4-.3.1-.8-.4-.6-2.7 1.1-5.6 1.6-8.3 1.6-3.2 0-6.3-.8-9.1-2-.4-.2-.8.4-.5.7zm18.9-1.3c-.2-.3-1.9-.5-2.9 0-.2.1-.2.3 0 .3.8 0 1.9-.1 2.1.2.2.3-.2 1.3-.4 1.9-.1.2.1.3.3.1.9-.8 1.2-2.2.9-2.5z"/></svg>',
  leather: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7c3-3 13-3 16 0v10c-3 3-13 3-16 0z"/><path d="M8 9c2 1 6 1 8 0M8 15c2 1 6 1 8 0"/></svg>',
  hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 11V6a1.5 1.5 0 0 1 3 0v5M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V6a1.5 1.5 0 0 1 3 0v6M16 12V9a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.5L3 14a1.5 1.5 0 0 1 2.6-1.5L7 14"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m4 20 4-1 11-11-3-3L5 16z"/><path d="m13 7 3 3"/></svg>',
  mx: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3c3 3 3 15 0 18M3 12h18M5 7.5c4 2 10 2 14 0M5 16.5c4-2 10-2 14 0"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
  gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18v4H3zM5 13h14v8H5zM12 9v12M12 9c-2-4-6-4-6-1s4 1 6 1zm0 0c2-4 6-4 6-1s-4 1-6 1z"/></svg>',
};

// ---------- navegación ----------
const NAV = [
  { label: 'Nosotros', items: [['Quiénes somos', '/nosotros/'], ['Nuestro equipo', '/equipo/'], ['Piel genuina', '/piel-genuina/'], ['Tiendas y contacto', '/contacto/'], ['Blog', '/blog/']] },
  { label: 'Corporativo', items: [['Regalos corporativos', '/categoria/regalos-corporativos/'], ['Oficina', '/categoria/oficina/'], ['Cotiza tu proyecto', '/cotizar/']] },
  { label: 'Hotelería', items: [['Amenidades', '/categoria/hoteleria/'], ['Decoración para hotel', '/categoria/decoracion-hoteleria/']] },
  { label: 'Juegos', items: [['Juegos de mesa', '/categoria/juegos/'], ['Juegos del recuerdo', '/categoria/juegos-del-recuerdo/']] },
  { label: 'Artesanía', items: [['Artesanía mexicana', '/categoria/artesania/'], ['Huichol', '/categoria/huichol/'], ['Brocado', '/categoria/brocado/'], ['Papel amate', '/categoria/papel-amate/'], ['Bordado otomí', '/categoria/otomi/']] },
  { label: 'Personalización', items: [['Personaliza tu pieza', '/personalizacion/'], ['Productos personalizables', '/categoria/personalizacion/'], ['Proyectos especiales', '/categoria/proyectos-especiales/'], ['Decoración personalizada', '/categoria/decoracion-personalizada/']] },
  { label: 'Accesorios', items: [['Hogar', '/categoria/hogar/'], ['Viajes', '/categoria/viajes/'], ['Vinos', '/categoria/vinos/'], ['Hombre', '/categoria/hombre/'], ['Mujer', '/categoria/mujer/'], ['Otros accesorios', '/categoria/accesorios/']] },
  { label: 'Tatei', items: [['Catálogo Tatei', '/categoria/tatei/'], ['Juegos del recuerdo', '/categoria/juegos-del-recuerdo/'], ['Arte sagrado', '/categoria/arte-sagrado/'], ['Alianza Tatei', '/alianza-tatei/']] },
  { label: 'Lo nuevo', href: '/categoria/lo-nuevo/' },
];

const gtm = store.analytics.gtmId ? `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${store.analytics.gtmId}');</script>` : '';

function layout(o) {
  const title = o.title.includes('Koon') || o.title.length > 52 ? o.title : `${o.title} | Koon Artesanos`;
  let desc = o.description || store.description;
  if (desc.length > 160) { const c = desc.slice(0, 158); const i = Math.max(c.lastIndexOf('. '), c.lastIndexOf(' ')); desc = c.slice(0, i > 60 ? i : 158).replace(/[,;:]$/, '') + (c[i] === '.' ? '.' : '…'); }
  const url = SITE + o.path;
  const og = abs(o.image || '/img/banners/Regalos-corporativos-de-lujo-en-piel.webp');
  const ld = [orgLd(), ...(o.jsonld || [])].map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="${o.noindex ? 'noindex,follow' : 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1'}">
<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:site_name" content="Koon Artesanos">
<meta property="og:locale" content="es_MX">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:alt" content="${esc(o.imageAlt || 'Koon Artesanos – artículos de piel genuina hechos a mano en México')}">
<meta name="twitter:card" content="summary_large_image">
${store.analytics.googleSiteVerification.map(v => `<meta name="google-site-verification" content="${v}">`).join('\n')}
<meta name="p:domain_verify" content="${store.analytics.pinterestVerification}">
<meta name="theme-color" content="#232323">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">

<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400&family=Philosopher:wght@400;700&display=swap">
<link rel="stylesheet" href="/assets/styles.css?v=${o.v}">
${o.head || ''}
${ld}
${gtm}
</head>
<body class="${o.bodyClass || ''}">
${gtm ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${store.analytics.gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>` : ''}
<script>window.KOON=${JSON.stringify({ whatsapp: store.whatsapp, shipping: store.shipping })}</script>
${header()}
<main id="contenido">
${o.body}
</main>
${footer()}
<a class="wa-float" href="https://wa.me/${store.whatsapp}?text=${encodeURIComponent('Hola Koon Artesanos, me gustaría recibir información.')}" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">${I.wa}</a>
<script src="/assets/app.js?v=${o.v}" defer></script>
</body>
</html>`;
}

function header() {
  return `<a class="sr-only" href="#contenido">Ir al contenido</a>
<div class="topbar"><div class="wrap">
  <ul><li><a href="mailto:${store.email}">${store.email}</a></li><li><a href="tel:${store.phonesE164[1]}">${store.phones[1]}</a></li><li><a href="${store.address.mapsUrl}" target="_blank" rel="noopener">${store.address.street}, ${store.address.colony}</a></li></ul>
  <ul><li><a href="/envios/">Envíos a todo México</a></li><li><a href="/cotizar/">Cotiza tu proyecto</a></li></ul>
</div></div>
<header class="header"><div class="wrap">
  <button class="icon-btn menu-toggle" aria-label="Abrir menú" aria-expanded="false">${I.menu}</button>
  <a class="logo" href="/" aria-label="Koon Artesanos – inicio"><span class="logo-k">KOON</span><span class="logo-a">ARTESANOS</span><sup>®</sup></a>
  <div class="header-actions">
    <button class="icon-btn search-toggle" aria-label="Buscar">${I.search}</button>
    <a class="icon-btn" href="/carrito/" aria-label="Carrito de compras">${I.cart}<span class="cart-count" data-n="0"></span></a>
  </div>
</div></header>
<div class="search-panel"><div class="wrap"><form action="/buscar/" method="get" role="search"><input type="search" name="q" placeholder="Buscar productos: backgammon, folder, portapasaporte…" aria-label="Buscar productos" required><button class="btn" type="submit">Buscar</button></form></div></div>
<nav class="nav" aria-label="Categorías"><div class="wrap"><ul>
${NAV.map(n => n.href ? `<li><a href="${n.href}">${n.label}</a></li>` : `<li><button type="button" aria-haspopup="true">${n.label}</button><ul class="sub">${n.items.map(([l, h]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></li>`).join('\n')}
</ul></div></nav>`;
}

function footer() {
  return `<footer class="footer"><div class="wrap">
<div class="footer-grid">
  <div><div class="logo logo-foot"><span class="logo-k">KOON</span><span class="logo-a">ARTESANOS</span><sup>®</sup></div><p>Somos una marca orgullosamente mexicana con ${store.yearsExperience} de experiencia, reconocida por diseñar y desarrollar proyectos especiales en piel, escuchando las ideas de cada cliente y transformando sus sueños en realidades.</p>
    <div class="social"><a href="${store.social.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${I.fb}</a><a href="${store.social.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${I.ig}</a><a href="${store.social.amazon}" target="_blank" rel="noopener" aria-label="Tienda en Amazon">${I.amz}</a></div></div>
  <div><h4>Tienda</h4><ul><li><a href="/categoria/regalos-corporativos/">Regalos corporativos</a></li><li><a href="/categoria/hoteleria/">Hotelería</a></li><li><a href="/categoria/juegos/">Juegos de mesa</a></li><li><a href="/personalizacion/">Personalización</a></li><li><a href="/categoria/viajes/">Viajes</a></li><li><a href="/categoria/lo-nuevo/">Lo nuevo</a></li><li><a href="/tienda/">Catálogo completo</a></li></ul></div>
  <div><h4>Ayuda</h4><ul><li><a href="/envios/">Envíos y entregas</a></li><li><a href="/politica-de-devoluciones/">Cambios y devoluciones</a></li><li><a href="/preguntas-frecuentes/">Preguntas frecuentes</a></li><li><a href="/cotizar/">Cotizaciones por volumen</a></li><li><a href="/aviso-de-privacidad/">Aviso de privacidad</a></li><li><a href="/terminos-y-condiciones/">Términos y condiciones</a></li></ul></div>
  <div><h4>Contacto</h4><ul><li><a href="${store.address.mapsUrl}" target="_blank" rel="noopener">${store.address.street}<br>${store.address.colony}, ${store.address.city}</a></li><li><a href="tel:${store.phonesE164[0]}">${store.phones[0]}</a> · <a href="tel:${store.phonesE164[1]}">${store.phones[1]}</a></li><li><a href="https://wa.me/${store.whatsapp}" target="_blank" rel="noopener">WhatsApp ${store.whatsappDisplay}</a></li><li><a href="mailto:${store.email}">${store.email}</a></li><li>${store.hours.join('<br>')}</li></ul></div>
</div>
<div class="copyright"><span>© ${new Date().getFullYear()} ${store.legalName} · Koon Artesanos®. Hecho a mano en México.</span><span>Precios en pesos mexicanos (MXN), IVA incluido.</span></div>
</div></footer>`;
}

// ---------- JSON-LD ----------
function orgLd() {
  return { '@context': 'https://schema.org', '@type': 'Organization', name: 'Koon Artesanos', legalName: store.legalName, url: SITE, logo: SITE + '/img/logo.webp', email: store.email, telephone: store.phonesE164[0], sameAs: Object.values(store.social), address: { '@type': 'PostalAddress', streetAddress: store.address.street, addressLocality: store.address.city, addressRegion: store.address.state, postalCode: store.address.zip, addressCountry: 'MX' }, contactPoint: [{ '@type': 'ContactPoint', telephone: store.phonesE164[0], contactType: 'customer service', areaServed: 'MX', availableLanguage: 'es' }] };
}
function crumbsLd(items) { return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) }; }
function crumbs(items) { return `<nav class="crumbs" aria-label="Migas de pan"><ol>${items.map(([n, u], i) => i === items.length - 1 ? `<li><span aria-current="page">${esc(n)}</span></li>` : `<li><a href="${u}">${esc(n)}</a></li>`).join('')}</ol></nav>`; }

// ---------- componentes ----------
function card(p, i = 0) {
  const img = p.images[0];
  const colors = p.optionName === 'Color' ? p.variants.map(v => v.value) : [];
  return `<article class="card" data-price="${p.price}" data-date="${Date.parse(p.createdAt)}" data-order="${i}">
  <div class="card-media">${p.isNew ? '<span class="badge">Nuevo</span>' : ''}${!p.available ? '<span class="badge soldout">Agotado</span>' : ''}<img src="${img.src}" alt="${esc(img.alt)}" width="600" height="600" loading="${i < 4 ? 'eager' : 'lazy'}"></div>
  <div class="card-body"><h3 class="card-title"><a href="/producto/${p.handle}/">${esc(p.title)}</a></h3>
  <div class="card-price">${money(p.price)}${p.maxPrice > p.price ? ' – ' + money(p.maxPrice) : ''}${p.compareAtPrice ? `<s>${money(p.compareAtPrice)}</s>` : ''}</div>
  ${colors.length > 1 ? `<div class="swatches" aria-label="${colors.length} colores">${colors.slice(0, 8).map(c => `<span class="swatch" style="background:${hexFor(c)}" title="${esc(c)}"></span>`).join('')}${colors.length > 8 ? `<span class="swatch-more">+${colors.length - 8}</span>` : ''}</div>` : (p.optionName === 'Forma' ? `<div class="card-meta">${p.variants.length} diseños</div>` : '')}
  </div></article>`;
}
function grid(list, id = '') { return `<div class="grid" ${id ? `id="${id}"` : ''}>${list.map((p, i) => card(p, i)).join('\n')}</div>`; }

function catCard(c, label) {
  const img = c.image || (byHandle[c.products[0]] || {}).images?.[0]?.src || '/img/banners/banner1.webp';
  return `<a class="cat-card" href="/categoria/${c.slug}/"><img src="${img}" alt="${esc(c.name)}" loading="lazy" width="600" height="450"><span class="cat-label"><span>${esc(label || c.group || 'Colección')}</span><strong>${esc(c.name)}</strong></span></a>`;
}

function quoteBox(text) {
  return `<aside class="quote-box"><h3>¿Pedido por volumen o con tu logo?</h3><p>${text || 'Cotizamos regalos corporativos, amenidades para hotel y proyectos especiales con grabado o bordado de tu marca. Respuesta en menos de 24 h hábiles.'}</p><a class="btn btn-block" href="/cotizar/">Cotiza aquí</a><p style="margin:10px 0 0"><a href="https://wa.me/${store.whatsapp}" target="_blank" rel="noopener">o escríbenos por WhatsApp →</a></p></aside>`;
}

const usp = `<section class="usp" aria-label="Beneficios"><div class="wrap"><ul>
<li>${I.leather}<span><strong>Piel 100% genuina</strong><br>seleccionada y curtida en México</span></li>
<li>${I.hand}<span><strong>Hecho a mano</strong><br>por artesanos mexicanos</span></li>
<li>${I.pen}<span><strong>Personalización</strong><br>grabado o bordado con tu logo</span></li>
<li>${I.truck}<span><strong>Envíos a todo México</strong><br>gratis desde ${money(store.shipping.freeFrom)}</span></li>
</ul></div></section>`;

// ---------- escritura ----------
function write(p, html) { const f = path.join(OUT, p.endsWith('/') ? p + 'index.html' : p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); }
function copyDir(src, dst) { fs.mkdirSync(dst, { recursive: true }); for (const e of fs.readdirSync(src, { withFileTypes: true })) { const s = path.join(src, e.name), d = path.join(dst, e.name); e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d); } }

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT + '/assets', { recursive: true });
copyDir('public', OUT);
fs.copyFileSync('src/styles.css', OUT + '/assets/styles.css');
fs.copyFileSync('src/app.js', OUT + '/assets/app.js');
const v = Date.now().toString(36);
const pages = []; // [path, priority, changefreq]
function page(p, html, prio = 0.6, freq = 'monthly', index = true) { write(p, html); if (index) pages.push([p, prio, freq]); }

// ---------- HOME ----------
{
  const slides = [
    { img: '/img/banners/personaliza_cada_detalle.webp', eyebrow: 'Hazlo único, personaliza', title: 'Cada detalle', text: 'Grabado o bordado de nombres, iniciales y logotipos sobre piel genuina hecha a mano.', href: '/personalizacion/', cta: 'Personaliza tu pieza' },
    { img: '/img/banners/Regalos-corporativos-de-lujo-en-piel.webp', eyebrow: 'Piel genuina y personalización con logo', title: 'Regalos ejecutivos en piel', text: 'Regalos corporativos que fortalecen relaciones y hacen inolvidable a tu marca.', href: '/categoria/regalos-corporativos/', cta: 'Ver regalos corporativos' },
    { img: '/img/banners/conquista_cada_jugada_con_estilo.webp', eyebrow: 'Conquista cada jugada', title: 'Con juegos premium', text: 'Backgammon, dominó, póker y cubiletes en piel para momentos que se comparten.', href: '/categoria/juegos/', cta: 'Ver juegos de mesa' },
    { img: '/img/banners/juegos-de-mesa-de-viaje_Koon-Artesanos.webp', eyebrow: 'Piel artesanal mexicana, juegos para los días largos', title: 'Verano sin prisa', text: 'Accesorios de viaje y juegos enrollables para llevar a donde vayas.', href: '/categoria/viajes/', cta: 'Ver accesorios de viaje' },
    { img: '/img/banners/arte_que_se_comparte_con_amor.webp', eyebrow: 'Koon Artesanos, arte que se comparte', title: 'Con amor', text: `${store.yearsExperience} diseñando piezas de piel genuina con artesanos mexicanos.`, href: '/nosotros/', cta: 'Conócenos' },
  ];
  const stars = products.filter(p => p.isStar).slice(0, 8);
  const news = products.filter(p => p.isNew && p.available).slice(0, 8);
  const origen = products.filter(p => /colecci[oó]n origen/i.test(p.title) || p.tags.some(t => /origen/i.test(t))).slice(0, 8);
  const featured = ['regalos-corporativos', 'juegos', 'hoteleria', 'personalizacion', 'artesania', 'mujer'].map(s => catBySlug[s]);
  const body = `
<section class="hero" aria-label="Destacados"><div class="slides">
${slides.map((s, i) => `<div class="hero-slide ${i === 0 ? 'is-active' : ''}"><img src="${s.img}" alt="" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} width="1920" height="865"><div class="wrap"><div class="hero-content"><span class="eyebrow">${s.eyebrow}</span>${i === 0 ? `<h1>${s.title}</h1>` : `<h2>${s.title}</h2>`}<p>${s.text}</p><a class="btn btn-light" href="${s.href}">${s.cta}</a></div></div></div>`).join('\n')}
</div><div class="hero-dots">${slides.map((s, i) => `<button type="button" class="${i === 0 ? 'is-active' : ''}" aria-label="Ir a la diapositiva ${i + 1}"></button>`).join('')}</div></section>
${usp}
<section class="section"><div class="wrap"><div class="section-head"><span class="eyebrow">Explora</span><h2>Regalos y accesorios de piel genuina hechos a mano en México</h2><p>Regalos corporativos, juegos de mesa, amenidades para hotel y accesorios personalizables. Piel 100% genuina trabajada por artesanos mexicanos.</p></div>
<div class="cat-grid">${featured.map(c => catCard(c)).join('')}</div></div></section>
<section class="section" style="padding-top:0"><div class="wrap"><div class="section-head"><span class="eyebrow">Productos exclusivos</span><h2>De piel, para regalar o para ti</h2></div>
<div class="tabs" data-tabs="home"><button type="button" class="is-active" data-tab="new">Nuevos productos</button><button type="button" data-tab="star">Productos estrella</button><button type="button" data-tab="origen">Colección Origen</button></div>
<div data-tab-panel="new" data-tab-group="home">${grid(news)}</div>
<div data-tab-panel="star" data-tab-group="home" hidden>${grid(stars)}</div>
<div data-tab-panel="origen" data-tab-group="home" hidden>${grid(origen)}</div>
<p style="text-align:center;margin-top:32px"><a class="btn btn-outline" href="/tienda/">Ver todo el catálogo</a></p></div></section>
<section class="section" style="background:var(--bg-2)"><div class="wrap"><div class="split">
<div><img src="/img/banners/banner1.webp" alt="Accesorios de piel genuina de Koon Artesanos" loading="lazy" width="800" height="600"></div>
<div><span class="eyebrow">Autenticidad</span><h2>Con piel genuina</h2><p>Nuestra piel es un símbolo de calidad y durabilidad, cuidadosamente seleccionada de reses que forman parte de la industria alimentaria. Este enfoque asegura la resistencia de nuestros productos y refleja nuestro compromiso con la sostenibilidad al aprovechar recursos que de otro modo se desperdiciarían.</p><p>Cada pieza se corta, cose y termina a mano en nuestro taller en la Ciudad de México.</p><a class="btn btn-outline" href="/piel-genuina/">Conoce nuestra piel</a></div>
</div></div></section>
<section class="section"><div class="wrap"><div class="features">
<div class="feature">${I.mx}<h3>Marca 100% mexicana</h3><p>Diseñamos y producimos en México con ${store.yearsExperience} de experiencia y un equipo de artesanos especializados.</p></div>
<div class="feature">${I.gift}<h3>Atención personalizada</h3><p>Asesores en CDMX, Guadalajara y Cancún para acompañar tu proyecto corporativo o de hotelería de principio a fin.</p></div>
<div class="feature">${I.pen}<h3>Personalización a la medida</h3><p>Más de 12 colores de piel de línea, grabado y bordado de logotipos, nombres o mensajes especiales.</p></div>
<div class="feature">${I.shield}<h3>Compra segura</h3><p>Pagos cifrados, envíos asegurados por ${store.shipping.carrier} y 10 días hábiles para cambios en productos de línea.</p></div>
</div></div></section>
<section class="parallax" style="background-image:url('/img/banners/banner3.webp')"><div class="wrap"><span class="eyebrow">Alianzas Koon</span><h2>Tatei · arte wixárika que se comparte con amor</h2><p>Juegos mexicanos y piezas sagradas elaboradas en chaquira por familias wixárikas. Un proyecto con causa que apoya a niñas y niños de la ribera del Lago de Chapala.</p><a class="btn btn-light" href="/categoria/tatei/">Descubre Tatei</a></div></section>
<section class="section"><div class="wrap"><div class="section-head"><span class="eyebrow">Nuestro blog</span><h2>Historias de piel, diseño y artesanía mexicana</h2></div>
<div class="post-grid">${blog.slice(0, 3).map(postCard).join('')}</div><p style="text-align:center;margin-top:28px"><a class="btn btn-outline" href="/blog/">Ver todos los artículos</a></p></div></section>
<section class="cta-strip"><div class="wrap"><div><h2>¿Regalos con tu logo o un proyecto especial?</h2><p>Cotizamos por volumen para empresas, hoteles y eventos. Te respondemos en menos de 24 horas hábiles.</p></div><a class="btn" href="/cotizar/">Solicitar cotización</a></div></section>`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Koon Artesanos', url: SITE, potentialAction: { '@type': 'SearchAction', target: SITE + '/buscar/?q={search_term_string}', 'query-input': 'required name=search_term_string' } },
    { '@context': 'https://schema.org', '@type': 'Store', name: 'Koon Artesanos', image: SITE + '/img/banners/banner1.webp', url: SITE, telephone: store.phonesE164[0], email: store.email, priceRange: '$$', currenciesAccepted: 'MXN', paymentAccepted: 'Tarjeta de crédito, débito, transferencia', address: orgLd().address, openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '10:00', closes: '18:00' }, { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '10:00', closes: '14:00' }] }];
  page('/', layout({ v, path: '/', title: 'Koon Artesanos | Regalos corporativos y piel genuina hecha a mano', description: 'Regalos corporativos, juegos de mesa, amenidades para hotel y accesorios de piel genuina hechos a mano en México. Personalización con grabado o bordado de tu logo.', body, jsonld: ld }), 1.0, 'weekly');
}

// ---------- CATEGORÍAS ----------
const catNav = (active) => `<div class="cat-nav">${['regalos-corporativos', 'oficina', 'hoteleria', 'juegos', 'personalizacion', 'hogar', 'viajes', 'vinos', 'hombre', 'mujer', 'artesania', 'tatei', 'lo-nuevo'].map(s => `<a href="/categoria/${s}/" class="${s === active ? 'is-active' : ''}">${catBySlug[s].name}</a>`).join('')}<a href="/tienda/" class="${active === '__all' ? 'is-active' : ''}">Todo</a></div>`;
const toolbar = (n) => `<div class="toolbar"><span>${n} producto${n === 1 ? '' : 's'}</span><label>Ordenar por <select id="sort"><option value="default">Destacados</option><option value="new">Novedades</option><option value="price-asc">Precio: menor a mayor</option><option value="price-desc">Precio: mayor a menor</option></select></label></div>`;

for (const c of categories) {
  const list = c.products.map(h => byHandle[h]);
  const crumbItems = [['Inicio', '/'], ['Tienda', '/tienda/'], [c.name, `/categoria/${c.slug}/`]];
  const seoText = c.seoText || '';
  const body = `
<section class="cat-hero">${c.image ? `<img src="${c.image}" alt="" width="1920" height="865">` : ''}<div class="wrap">${crumbs(crumbItems)}<span class="eyebrow" style="color:#f3d3a6">${esc(c.group || 'Colección')}</span><h1>${esc(c.h1)}</h1></div></section>
<div class="wrap"><div class="cat-intro"><div class="prose">${c.intro}</div>${c.quote ? quoteBox() : quoteBox('¿Buscas varias piezas para regalar o quieres tu logo o iniciales? Cotizamos personalización y pedidos por volumen.')}</div>
${catNav(c.slug)}
${toolbar(list.length)}
${list.length ? grid(list, 'product-grid') : '<p class="empty">Muy pronto tendremos productos en esta colección. <a href="/cotizar/">Cuéntanos qué necesitas</a>.</p>'}
${seoText ? `<div class="seo-text">${seoText}</div>` : ''}
</div>`;
  const ld = [crumbsLd(crumbItems), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: c.h1, description: c.seoDescription, url: SITE + `/categoria/${c.slug}/`, mainEntity: { '@type': 'ItemList', numberOfItems: list.length, itemListElement: list.slice(0, 30).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + `/producto/${p.handle}/`, name: p.title })) } }];
  page(`/categoria/${c.slug}/`, layout({ v, path: `/categoria/${c.slug}/`, title: c.seoTitle, description: c.seoDescription, image: c.image || (list[0] && list[0].images[0].src), body, jsonld: ld }), 0.8, 'weekly');
}

// ---------- TIENDA (todo) ----------
{
  const list = products.filter(p => p.available).concat(products.filter(p => !p.available));
  const crumbItems = [['Inicio', '/'], ['Tienda', '/tienda/']];
  const body = `<div class="page-head"><div class="wrap">${crumbs(crumbItems)}<h1>Catálogo completo de artículos de piel</h1><p style="margin:6px 0 0;color:var(--muted)">${products.length} diseños de piel genuina hechos a mano en México. Personalizables con grabado o bordado.</p></div></div>
<div class="wrap">${catNav('__all')}${toolbar(list.length)}${grid(list, 'product-grid')}</div>`;
  page('/tienda/', layout({ v, path: '/tienda/', title: 'Catálogo de Artículos de Piel Genuina Hechos a Mano | Koon Artesanos', description: `Explora los ${products.length} diseños de Koon Artesanos: regalos corporativos, juegos de mesa, accesorios de oficina, viaje, hogar y artesanía mexicana en piel genuina.`, body, jsonld: [crumbsLd(crumbItems)] }), 0.9, 'weekly');
}

// ---------- PRODUCTOS ----------
const shippingTab = `<p><strong>Envío a todo México</strong> por ${store.shipping.carrier} con guía rastreable. Costo de ${money(store.shipping.flatRate)}; <strong>gratis en compras desde ${money(store.shipping.freeFrom)}</strong>. Los productos de línea se entregan en ${store.shipping.deliveryDays}; los personalizados o hechos a la medida en ${store.shipping.customDeliveryDays}.</p>
<p><strong>Cambios:</strong> tienes 10 días hábiles a partir de la recepción para cambiar productos de línea en perfectas condiciones. Los artículos personalizados (grabado, bordado o colores especiales) no admiten cambio. Consulta la <a href="/politica-de-devoluciones/">política de cambios y devoluciones</a> y la <a href="/envios/">información de envíos</a>.</p>`;

for (const p of products) {
  const primaryCat = p.categories.map(s => catBySlug[s]).filter(Boolean).sort((a, b) => a.products.length - b.products.length)[0] || catBySlug.hogar;
  const crumbItems = [['Inicio', '/'], ['Tienda', '/tienda/'], [primaryCat.name, `/categoria/${primaryCat.slug}/`], [p.title, `/producto/${p.handle}/`]];
  const related = products.filter(x => x.handle !== p.handle && x.available && x.categories.includes(primaryCat.slug)).slice(0, 4);
  const related2 = related.length < 4 ? products.filter(x => x.handle !== p.handle && x.available && !related.includes(x) && x.categories.some(c => p.categories.includes(c))).slice(0, 4 - related.length) : [];
  const rel = related.concat(related2);
  const data = { handle: p.handle, title: p.title, optionName: p.optionName, images: p.images.map(i => ({ src: i.src, alt: i.alt })), variants: p.variants };
  const isTatei = p.categories.includes('tatei');
  const body = `
<div class="wrap">${crumbs(crumbItems)}</div>
<div class="wrap product" id="product-page">
  <div class="gallery">
    <div class="gallery-main"><img src="${p.images[0].src}" alt="${esc(p.images[0].alt)}" width="1000" height="1000" fetchpriority="high"></div>
    ${p.images.length > 1 ? `<div class="thumbs">${p.images.map((im, i) => `<button type="button" class="${i === 0 ? 'is-active' : ''}" aria-label="Ver imagen ${i + 1}"><img src="${im.src}" alt="${esc(im.alt)}" loading="lazy" width="72" height="72"></button>`).join('')}</div>` : ''}
  </div>
  <div class="p-info">
    <span class="eyebrow">${esc(primaryCat.name)}</span>
    <h1 class="p-title">${esc(p.title)}</h1>
    ${p.code ? `<div class="p-code">Código ${esc(p.code)}</div>` : ''}
    <div class="p-price"><span class="amount">${money(p.price)}</span>${p.compareAtPrice ? `<s>${money(p.compareAtPrice)}</s>` : ''}</div>
    <div class="p-tax">IVA incluido · ${p.price >= store.shipping.freeFrom ? '<strong>Envío gratis</strong>' : 'Envío ' + money(store.shipping.flatRate) + ' (gratis desde ' + money(store.shipping.freeFrom) + ')'}</div>
    <p class="stock-note"></p>
    <div class="opt-label"><span>${p.optionName}</span><output></output></div>
    <div class="opts" role="radiogroup" aria-label="${p.optionName}">${p.variants.map(vv => `<button type="button" class="opt" data-id="${vv.id}" data-available="${vv.available}" role="radio">${p.optionName === 'Color' ? `<span class="swatch" style="background:${hexFor(vv.value)}"></span>` : ''}${esc(vv.value)}</button>`).join('')}</div>
    <div class="field"><label for="personalization">Personalización con grabado (opcional)</label><input id="personalization" maxlength="60" placeholder="Nombre, iniciales o frase corta"><small>Máximo 60 caracteres. Para logotipos o bordado, <a href="/cotizar/">solicita una cotización</a>.</small></div>
    <div class="opt-label"><span>Cantidad</span></div>
    <div class="buy-row"><span class="qty"><button type="button" id="qty-minus" aria-label="Menos">−</button><input id="qty" type="number" min="1" max="99" value="1" aria-label="Cantidad"><button type="button" id="qty-plus" aria-label="Más">+</button></span><button class="btn btn-lg" id="add-to-cart" type="button">Agregar al carrito</button></div>
    <a class="btn btn-wa btn-block" id="buy-whatsapp" href="https://wa.me/${store.whatsapp}" target="_blank" rel="noopener">Comprar por WhatsApp</a>
    <ul class="p-notes">
      <li>${I.hand.replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-3px;margin-right:6px"')}Pieza hecha a mano en piel genuina; pueden existir ligeras variaciones de tono y textura que la hacen única.</li>
      <li>${I.truck.replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-3px;margin-right:6px"')}Entrega en ${isTatei ? 'más de 7 días hábiles por su elaboración artesanal' : store.shipping.deliveryDays} (productos personalizados: ${store.shipping.customDeliveryDays}).</li>
      <li>${I.shield.replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-3px;margin-right:6px"')}10 días hábiles para cambios en productos de línea. <a href="/politica-de-devoluciones/">Ver política</a>.</li>
    </ul>
  </div>
</div>
<div class="wrap p-desc">
  <div class="tabs" data-tabs="pd"><button type="button" class="is-active" data-tab="desc">Descripción</button><button type="button" data-tab="specs">Especificaciones</button><button type="button" data-tab="ship">Envío y cambios</button></div>
  <div class="prose" data-tab-panel="desc" data-tab-group="pd">${p.descriptionHtml || '<p>' + esc(p.description) + '</p>'}</div>
  <div data-tab-panel="specs" data-tab-group="pd" hidden><table class="specs">
    ${p.code ? `<tr><th>Código</th><td>${esc(p.code)}</td></tr>` : ''}
    <tr><th>Material</th><td>Piel genuina${isTatei ? ' y chaquira wixárika' : ''}</td></tr>
    ${p.specs.dimensiones ? `<tr><th>Dimensiones (largo × ancho × alto)</th><td>${esc(p.specs.dimensiones)}</td></tr>` : ''}
    ${p.specs.medidas ? `<tr><th>Medidas</th><td>${esc(p.specs.medidas)}</td></tr>` : ''}
    ${p.specs.peso ? `<tr><th>Peso</th><td>${esc(p.specs.peso)}</td></tr>` : ''}
    ${p.specs.incluye ? `<tr><th>Incluye</th><td>${esc(p.specs.incluye)}</td></tr>` : ''}
    <tr><th>${p.optionName === 'Color' ? 'Colores disponibles' : 'Diseños disponibles'}</th><td>${p.variants.map(vv => esc(vv.value)).join(', ')}</td></tr>
    <tr><th>Personalización</th><td>Grabado de nombre, iniciales o logotipo; bordado bajo cotización</td></tr>
    <tr><th>Origen</th><td>Hecho a mano en Ciudad de México</td></tr>
  </table></div>
  <div class="prose" data-tab-panel="ship" data-tab-group="pd" hidden>${shippingTab}</div>
</div>
${rel.length ? `<section class="section" style="background:var(--bg-2)"><div class="wrap"><div class="section-head"><span class="eyebrow">También te puede gustar</span><h2>Más de ${esc(primaryCat.name.toLowerCase())}</h2></div>${grid(rel)}</div></section>` : ''}
<script type="application/json" id="product-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  const ld = [crumbsLd(crumbItems), {
    '@context': 'https://schema.org', '@type': 'Product', name: p.title, description: p.seoDescription.replace(/…$/, ''), sku: p.code || p.handle, brand: { '@type': 'Brand', name: 'Koon Artesanos' }, image: p.images.slice(0, 5).map(i => abs(i.src)), url: SITE + `/producto/${p.handle}/`, material: 'Piel genuina', category: primaryCat.name, countryOfOrigin: 'MX',
    offers: p.variants.length > 1 ? { '@type': 'AggregateOffer', priceCurrency: 'MXN', lowPrice: p.price, highPrice: p.maxPrice, offerCount: p.variants.length, availability: p.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: SITE + `/producto/${p.handle}/`, seller: { '@type': 'Organization', name: 'Koon Artesanos' } }
      : { '@type': 'Offer', priceCurrency: 'MXN', price: p.price, availability: p.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: SITE + `/producto/${p.handle}/`, itemCondition: 'https://schema.org/NewCondition', shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: p.price >= store.shipping.freeFrom ? 0 : store.shipping.flatRate, currency: 'MXN' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'MX' } } },
  }];
  page(`/producto/${p.handle}/`, layout({ v, path: `/producto/${p.handle}/`, title: p.seoTitle, description: p.seoDescription, image: p.images[0].src, imageAlt: p.images[0].alt, ogType: 'product', body, jsonld: ld }), 0.7, 'weekly');
}

// ---------- BLOG ----------
function postCard(a) { return `<article class="post-card">${a.image ? `<a href="/blog/${a.handle}/" tabindex="-1"><img src="${a.image}" alt="${esc(a.imageAlt)}" loading="lazy" width="600" height="375"></a>` : ''}<time datetime="${a.date}">${fmtDate(a.date)} · ${a.readingMinutes} min de lectura</time><h3><a href="/blog/${a.handle}/">${esc(a.title)}</a></h3><p>${esc(a.excerpt.length > 150 ? a.excerpt.slice(0, 147) + '…' : a.excerpt)}</p></article>`; }
function fmtDate(d) { const [y, m, dd] = d.split('-'); return `${+dd} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][+m - 1]} de ${y}`; }
{
  const crumbItems = [['Inicio', '/'], ['Blog', '/blog/']];
  page('/blog/', layout({ v, path: '/blog/', title: 'Blog de Koon Artesanos | Piel, diseño y artesanía mexicana', description: 'Artículos sobre piel genuina, regalos corporativos, juegos de mesa artesanales y las técnicas huichol, brocado, papel amate y bordado otomí que usamos en nuestras piezas.', body: `<div class="page-head"><div class="wrap">${crumbs(crumbItems)}<h1>Blog Koon</h1><p style="margin:6px 0 0;color:var(--muted)">Historias de piel, diseño, tradición y artesanía mexicana.</p></div></div><div class="wrap section"><div class="post-grid">${blog.map(postCard).join('')}</div></div>`, jsonld: [crumbsLd(crumbItems)] }), 0.6, 'weekly');
  for (const a of blog) {
    const crumbItems = [['Inicio', '/'], ['Blog', '/blog/'], [a.title, `/blog/${a.handle}/`]];
    const others = blog.filter(x => x.handle !== a.handle).slice(0, 3);
    const body = `<div class="wrap"><div class="article-hero">${crumbs(crumbItems)}<h1>${esc(a.title)}</h1><p class="post-meta">${fmtDate(a.date)} · ${a.author} · ${a.readingMinutes} min de lectura</p>${a.image ? `<img src="${a.image}" alt="${esc(a.imageAlt)}" width="1200" height="600">` : ''}</div></div>
<article class="article"><div class="prose">${a.contentHtml}</div>
<div class="cta-strip" style="margin-top:40px;border-radius:6px"><div class="wrap"><div><h2>¿Te inspiró este artículo?</h2><p>Descubre piezas de piel genuina hechas a mano y personalízalas con tu nombre o logo.</p></div><a class="btn" href="/tienda/">Ver la tienda</a></div></div></article>
<section class="section" style="background:var(--bg-2)"><div class="wrap"><div class="section-head"><h2>Sigue leyendo</h2></div><div class="post-grid">${others.map(postCard).join('')}</div></div></section>`;
    const ld = [crumbsLd(crumbItems), { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: a.title, description: a.seoDescription, image: a.image ? abs(a.image) : undefined, datePublished: a.date, dateModified: a.date, author: { '@type': 'Organization', name: 'Koon Artesanos' }, publisher: { '@type': 'Organization', name: 'Koon Artesanos', logo: { '@type': 'ImageObject', url: SITE + '/img/logo.webp' } }, mainEntityOfPage: SITE + `/blog/${a.handle}/`, inLanguage: 'es-MX' }];
    page(`/blog/${a.handle}/`, layout({ v, path: `/blog/${a.handle}/`, title: a.title, description: a.seoDescription, image: a.image, imageAlt: a.imageAlt, ogType: 'article', body, jsonld: ld }), 0.5, 'yearly');
  }
}

// ---------- PÁGINAS DE CONTENIDO ----------
function simplePage(p, title, h1, desc, inner, opts = {}) {
  const crumbItems = [['Inicio', '/'], [h1, p]];
  page(p, layout({ v, path: p, title, description: desc, body: `<div class="page-head"><div class="wrap">${crumbs(crumbItems)}<h1>${esc(h1)}</h1>${opts.sub ? `<p style="margin:6px 0 0;color:var(--muted)">${opts.sub}</p>` : ''}</div></div><div class="wrap section">${inner}</div>`, jsonld: [crumbsLd(crumbItems), ...(opts.jsonld || [])], noindex: opts.noindex, image: opts.image }), opts.prio || 0.5, 'monthly', !opts.noindex);
}
const CONTENT = JSON.parse(fs.readFileSync('src/content.json', 'utf8'));

// Nosotros
simplePage('/nosotros/', 'Quiénes somos | Koon Artesanos, más de 20 años de artesanía en piel', 'Un proyecto de sueños', 'Koon Artesanos es una marca mexicana con más de 20 años diseñando y produciendo artículos de piel genuina hechos a mano. Conoce nuestra historia, líneas de negocio y materiales.', `
<div class="split"><div><img src="/img/banners/arte_que_se_comparte_con_amor.webp" alt="Artesanos de Koon trabajando la piel" width="800" height="600"></div>
<div class="prose"><span class="eyebrow">Koon Artesanos</span><h2>Diseño, innovación y un producto hecho a mano</h2><p>Koon Artesanos es una marca mexicana con ${store.yearsExperience} de experiencia en el diseño y desarrollo de productos de piel genuina. Nos enfocamos en crear artículos de alta calidad, hechos a mano, que reflejen las ideas y los sueños de nuestros clientes.</p><p><strong>Nuestro distintivo es la calidad.</strong> Koon es diseño que inspira, exigencia en cada costura y arte que se comparte con amor. Nuestra distinción: alta calidad, personalización a la medida y trabajo artesanal.</p></div></div>
<div class="stats" style="margin:56px 0"><div><strong>20+</strong><span>años de experiencia</span></div><div><strong>${products.length}</strong><span>diseños en catálogo</span></div><div><strong>12+</strong><span>colores de piel de línea</span></div><div><strong>100%</strong><span>hecho en México</span></div></div>
<div class="split rev"><div><img src="/img/banners/compu.webp" alt="Accesorios de piel para oficina de Koon Artesanos" loading="lazy" width="800" height="600"></div>
<div class="prose"><span class="eyebrow">Diseñamos e innovamos</span><h2>Piezas únicas</h2><p>Diseñar es mucho más que elaborar un boceto: se trata de atender necesidades, encontrar soluciones y lograr resultados increíbles con diseños de calidad. Elevamos el diseño al punto en que se convierte en arte, elaborado por cálidas manos que transforman los materiales más extraordinarios.</p></div></div>
<section style="margin-top:56px"><div class="section-head"><span class="eyebrow">Nuestras</span><h2>Líneas de negocio</h2><p>Fusión perfecta entre el diseño, la funcionalidad, la originalidad y la artesanía.</p></div>
<div class="cat-grid">${['regalos-corporativos', 'hoteleria', 'juegos', 'artesania', 'personalizacion', 'hogar', 'viajes', 'accesorios'].map(s => catCard(catBySlug[s])).join('')}</div></section>
<section style="margin-top:56px"><div class="section-head"><span class="eyebrow">Nuestros</span><h2>Materiales</h2></div>
<div class="features">${[['Piel genuina', 'Seleccionada de reses de la industria alimentaria, curtida y acabada en México.'], ['Piel sintética', 'Alternativa vegana de alta resistencia para proyectos que lo requieran.'], ['Sintético de alto desempeño', 'Para amenidades de hotel y uso intensivo.'], ['Tela, chapa de madera y acrílico', 'Combinaciones para proyectos especiales y decoración.']].map(([t, d]) => `<div class="feature">${I.leather}<h3>${t}</h3><p>${d}</p></div>`).join('')}</div></section>
<p style="text-align:center;margin-top:48px"><a class="btn" href="/equipo/">Conoce a nuestro equipo</a> <a class="btn btn-outline" href="/piel-genuina/">Nuestra piel</a></p>`, { prio: 0.6, image: '/img/banners/arte_que_se_comparte_con_amor.webp' });

// Equipo
simplePage('/equipo/', 'Nuestro equipo | Koon Artesanos', 'Aprendemos todo de todos', 'La riqueza de Koon Artesanos está en sus colaboradores: artesanos que transforman la piel en historia. Somos una marca incluyente que integra a personas con discapacidad auditiva.', `
<div class="split"><div><img src="/img/banners/banner3.webp" alt="Equipo de artesanos de Koon" width="800" height="600"></div><div class="prose"><span class="eyebrow">Equipo Koon</span><h2>Nuestro valor y esencia</h2><p>La riqueza de nuestra empresa se encuentra en cada uno de nuestros colaboradores. Nuestros artesanos transforman la materia en historia: cada producto lleva consigo la dedicación de cada uno de ellos.</p><p><strong>Pasión y amor por cada cosa que realizamos.</strong></p></div></div>
<section style="margin-top:56px"><div class="section-head"><span class="eyebrow">Nuestra filosofía</span><h2>Arte que se comparte con amor</h2></div>
<div class="features">${[['Elevar el diseño', 'al punto en que se convierte en arte.'], ['Arte elaborado', 'por nuestras cálidas manos y corazón.'], ['Manos y corazón', 'que transforman los materiales más extraordinarios.'], ['Koon Artesanos', 'arte que se comparte con amor.']].map(([t, d]) => `<div class="feature">${I.hand}<h3>${t}</h3><p>${d}</p></div>`).join('')}</div></section>
<section class="band" style="margin-top:56px;border-radius:6px"><div class="wrap"><span class="eyebrow">Estamos a favor</span><h2>De la inclusión</h2><p>Somos una marca incluyente y con responsabilidad social. Integramos a personas con discapacidad auditiva en un proyecto artesanal lleno de creatividad, donde desarrollamos sus capacidades y echamos a volar su imaginación.</p><a class="btn btn-light" href="/cotizar/">Trabaja con nosotros en tu proyecto</a></div></section>`, { image: '/img/banners/banner3.webp' });

// Piel genuina
simplePage('/piel-genuina/', 'Piel genuina: calidad, durabilidad y sostenibilidad | Koon Artesanos', 'Autenticidad con piel genuina', 'Nuestra piel genuina proviene de reses de la industria alimentaria: un recurso aprovechado de forma sostenible que garantiza resistencia, textura suave y acabados elegantes.', `
<div class="split"><div><img src="/img/banners/banner1.webp" alt="Textura de piel genuina Koon Artesanos" width="800" height="600"></div><div class="prose"><span class="eyebrow">Nuestra piel</span><h2>Un símbolo de calidad y durabilidad</h2><p>Nuestra piel genuina es cuidadosamente seleccionada de reses que forman parte de la industria alimentaria. Este enfoque no solo asegura la resistencia de nuestros productos, sino que también refleja nuestro compromiso con la sostenibilidad al aprovechar recursos que de otro modo se desperdiciarían.</p></div></div>
<div class="split rev" style="margin-top:56px"><div><img src="/img/banners/ipad.webp" alt="Porta iPad de piel genuina" loading="lazy" width="800" height="600"></div><div class="prose"><span class="eyebrow">Diseñamos productos exclusivos de alta calidad</span><h2>Elaborados con piel genuina</h2><p>Cada pieza está diseñada para adaptarse a cualquier espacio, en tu hogar o en la oficina, añadiendo un toque único y especial. La textura suave y el acabado elegante no solo realzan la estética del entorno, sino que garantizan durabilidad y sofisticación: funcionalidad, estilo y buen gusto en un mismo objeto.</p></div></div>
<section style="margin-top:56px"><div class="section-head"><span class="eyebrow">Colores de línea</span><h2>Elige el color de tu piel</h2><p>Disponibles en la mayoría de nuestros productos. Colores adicionales bajo pedido.</p></div>
<div class="color-grid">${['Negro', 'Gris oxford', 'Moka', 'Rojo quemado', 'Burgundy', 'Azul cobalto', 'Aqua obscuro', 'Verde limón', 'Verde botella', 'Mango', 'Naranja fuerte', 'Fiusha', 'Morado', 'Caramel', 'Taupe'].map(c => `<div class="color-chip"><i style="background:${hexFor(c)}"></i>${c}</div>`).join('')}</div>
<p style="font-size:.85rem;color:var(--muted);margin-top:14px">Los colores en pantalla son ilustrativos; la piel natural presenta variaciones de tono que hacen única a cada pieza.</p></section>
<section style="margin-top:48px"><div class="section-head"><h2>Cuidados de la piel</h2></div><div class="prose" style="margin:0 auto"><ul><li>Limpia con un paño suave y seco; evita productos abrasivos o alcohol.</li><li>Mantén tus piezas alejadas de la humedad y de la exposición prolongada al sol.</li><li>Aplica crema o acondicionador para piel una o dos veces al año para conservar su flexibilidad.</li><li>Guarda las piezas en un lugar ventilado; si es posible, dentro de su bolsa de tela.</li></ul></div></section>`, { image: '/img/banners/banner1.webp' });

// Personalización
{
  const list = catBySlug.personalizacion.products.map(h => byHandle[h]).slice(0, 8);
  simplePage('/personalizacion/', 'Personalización en piel: grabado y bordado | Koon Artesanos', 'Diseñamos piezas únicas', 'Personaliza cualquier producto de piel genuina: elige entre más de 12 colores, agrega un grabado con tu nombre o iniciales, o borda el logotipo de tu empresa. Cotiza en línea.', `
<div class="split"><div><img src="/img/pers/personalizacion-1.webp" alt="Grabado personalizado sobre piel genuina" width="800" height="450"></div><div class="prose"><span class="eyebrow">Personalización Koon</span><h2>Tu estilo, tu marca, tu pieza</h2><p>Nuestra pasión por la personalización nos permite ofrecer una amplia gama de opciones para que crees productos únicos que reflejen tu estilo y personalidad. Nos esforzamos por crear productos que no solo sean funcionales, sino verdaderas obras de arte.</p><p>Nuestro equipo de diseño trabajará contigo para llevar tu visión a la vida. Desde el diseño hasta la producción, nos aseguraremos de que tu producto sea de la más alta calidad y cumpla con tus expectativas.</p></div></div>
<section style="margin-top:56px"><div class="section-head"><span class="eyebrow">Personaliza con</span><h2>Tres formas de hacerla tuya</h2></div>
<div class="steps"><div class="step"><h3>Color de piel</h3><p>Elige entre más de 12 colores de línea o solicita un tono especial para tu proyecto.</p></div><div class="step"><h3>Grabado</h3><p>Nombres, iniciales, fechas o logotipos grabados en bajo relieve. Disponible al comprar en línea.</p></div><div class="step"><h3>Bordado</h3><p>Bordado en hilo de tu logotipo o diseño, ideal para regalos corporativos y hotelería. Bajo cotización.</p></div></div></section>
<section style="margin-top:56px"><div class="section-head"><span class="eyebrow">Colores de línea</span><h2>Selecciona el color de piel</h2></div>
<div class="color-grid">${['Negro', 'Gris oxford', 'Moka', 'Rojo quemado', 'Burgundy', 'Azul cobalto', 'Aqua obscuro', 'Verde limón', 'Verde botella', 'Mango', 'Naranja fuerte', 'Fiusha', 'Morado', 'Caramel', 'Taupe'].map(c => `<div class="color-chip"><i style="background:${hexFor(c)}"></i>${c}</div>`).join('')}</div>
<p style="font-size:.85rem;color:var(--muted);margin-top:14px">*Nuestros productos también se pueden personalizar con bordado en hilo; contáctanos para hacerlo a tu medida.</p></section>
<section style="margin-top:56px"><div class="section-head"><span class="eyebrow">Galería</span><h2>Personalización Koon</h2></div><div class="cat-grid">${[2, 3, 4, 5].map(n => `<img src="/img/pers/personalizacion-${n}.webp" alt="Ejemplo de personalización en piel ${n - 1}" loading="lazy" width="800" height="360" style="border-radius:6px;aspect-ratio:16/8;object-fit:cover">`).join('')}</div></section>
<section style="margin-top:56px"><div class="section-head"><h2>Productos personalizables</h2></div>${grid(list)}<p style="text-align:center;margin-top:28px"><a class="btn btn-outline" href="/categoria/personalizacion/">Ver todos los personalizables</a> <a class="btn" href="/cotizar/">Cotiza tu proyecto</a></p></section>`, { prio: 0.8, image: '/img/pers/personalizacion-1.webp' });
}

// Alianza Tatei
simplePage('/alianza-tatei/', 'Alianza Tatei y CreSer Chapala | Koon Artesanos', 'Alianza Tatei', 'Koon Artesanos y Tatei unen familias para crear obras maestras en chaquira wixárika que honran a los juegos mexicanos y apoyan a niñas y niños de la ribera del Lago de Chapala.', `
<div class="split"><div><img src="/img/banners/arte_que_se_comparte_con_amor.webp" alt="Piezas Tatei en chaquira wixárika" width="800" height="600"></div><div class="prose"><span class="eyebrow">Alianzas Koon</span><h2>Familias que se unen para crear obras maestras</h2><p>Proyecto de familias que se unen para crear obras maestras, honrando a los juegos mexicanos y enalteciendo a la Reina de México y América.</p><p>Colaboración entre Koon Artesanos, empresa de diseño en piel, y Tatei, que en la cultura wixárika significa <strong>Madre</strong>; sus creaciones son arte que manifiesta el cielo en la tierra.</p></div></div>
<div class="features" style="margin-top:48px"><div class="feature"><h3>Misión</h3><p>Transmitir paz en la cabeza y gozo en el corazón.</p></div><div class="feature"><h3>Visión</h3><p>Despertar una mente brillante y un corazón puro.</p></div><div class="feature"><h3>Intención</h3><p>Reconectar con la niñez y reconocernos en la esencia de jugar.</p></div></div>
<section class="band" style="margin-top:56px;border-radius:6px"><div class="wrap"><span class="eyebrow">Tatei, presente con sentido</span><h2>Date cuenta</h2><p>Tatei creó el juego del recuerdo «Date cuenta», que apoya a la Comunidad Rapabiyeme para sanar a niñas y niños con enfermedades renales de la fundación CreSer, que habitan alrededor del espejo de agua más grande de México, el Lago de Chapala, Jalisco.</p><p>Compartimos el sueño de seguir iluminando corazones en una región con el mayor índice de mortalidad por enfermedades renales del mundo. Hoy queremos construir una «Escuela de Saberes» en Mezcala, Jalisco, que sirva de «Centro que Une» para jugar, sanar, aprender, evolucionar y recordar. Vamos adelante por más sonrisas y agua pura para todos.</p><a class="btn btn-light" href="/categoria/tatei/">Ver el catálogo Tatei</a></div></section>`, { image: '/img/banners/arte_que_se_comparte_con_amor.webp' });

// Contacto / tiendas
{
  const ld = { '@context': 'https://schema.org', '@type': 'Store', name: 'Koon Artesanos – Tienda Lomas', address: orgLd().address, telephone: '+525555208690', email: 'lomas@koonartesanos.com', url: SITE + '/contacto/', openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '10:00', closes: '18:00' }, { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '10:00', closes: '14:00' }] };
  simplePage('/contacto/', 'Contacto y tiendas | Koon Artesanos', 'Tiendas y atención personalizada', `Visítanos en Prado Norte 540, Lomas de Chapultepec (CDMX), o en nuestras islas en Cuajimalpa y Puebla. Asesores en CDMX, Guadalajara y Cancún. Tel. ${store.phones[0]}.`, `
<div class="split" style="align-items:start"><div>
<div class="store-card"><span class="eyebrow">Contáctanos</span><h3>Atención a clientes</h3><ul><li><a href="tel:${store.phonesE164[0]}">${store.phones[0]}</a> · <a href="tel:${store.phonesE164[1]}">${store.phones[1]}</a></li><li>WhatsApp: <a href="https://wa.me/${store.whatsapp}" target="_blank" rel="noopener">${store.whatsappDisplay}</a></li><li><a href="mailto:${store.email}">${store.email}</a></li><li>${store.hours.join(' · ')}</li></ul>
<p style="margin-top:16px"><a class="btn btn-wa" href="https://wa.me/${store.whatsapp}" target="_blank" rel="noopener">Escribir por WhatsApp</a> <a class="btn btn-outline" href="/cotizar/">Solicitar cotización</a></p></div>
<div style="margin-top:20px" class="store-card"><h3>Envíos y cambios</h3><ul><li>Envíos a todo México por ${store.shipping.carrier}. <a href="/envios/">Ver información de envíos</a>.</li><li>Cambios en tienda o por paquetería dentro de 10 días hábiles. <a href="/politica-de-devoluciones/">Ver política</a>.</li></ul></div>
</div>
<div><iframe class="map" src="https://www.google.com/maps?q=Prado+Norte+540,+Lomas+de+Chapultepec,+Ciudad+de+M%C3%A9xico&output=embed" loading="lazy" title="Mapa de la tienda Koon Artesanos en Prado Norte 540" referrerpolicy="no-referrer-when-downgrade"></iframe></div></div>
<section style="margin-top:56px"><div class="section-head"><span class="eyebrow">Visítanos</span><h2>Nuestras tiendas</h2></div><div class="cat-grid">${store.stores.map(s => `<div class="store-card"><h3>${s.name}</h3><ul><li>${s.address}</li>${s.hours.map(h => `<li>${h}</li>`).join('')}${s.phone ? `<li><a href="tel:${s.phone.replace(/\s/g, '')}">${s.phone}</a></li>` : ''}${s.email ? `<li><a href="mailto:${s.email}">${s.email}</a></li>` : ''}${s.mapsUrl ? `<li><a href="${s.mapsUrl}" target="_blank" rel="noopener">Cómo llegar →</a></li>` : ''}</ul></div>`).join('')}</div></section>
<section style="margin-top:56px"><div class="section-head"><span class="eyebrow">Atención personalizada en</span><h2>Asesores de ventas</h2><p>Para regalos corporativos, hotelería y proyectos especiales.</p></div><div class="advisors">${store.advisors.map(a => `<div class="advisor"><span>${a.city}</span><strong>${a.name}</strong><a href="tel:${a.phone.replace(/\s/g, '')}">${a.phone}</a><br><a href="mailto:${a.email}">${a.email}</a></div>`).join('')}</div></section>`, { prio: 0.7, jsonld: [ld] });
}

// Cotizar
simplePage('/cotizar/', 'Cotiza regalos corporativos y proyectos en piel | Koon Artesanos', 'Solicita una cotización', 'Cotiza regalos corporativos con logo, amenidades para hotel o proyectos especiales en piel genuina. Cuéntanos qué necesitas y te respondemos en menos de 24 horas hábiles.', `
<div class="split" style="align-items:start"><div class="prose"><span class="eyebrow">Corporativo · Hotelería · Proyectos especiales</span><h2>Cuéntanos tu proyecto</h2><p>Llena el formulario y lo recibiremos por WhatsApp o correo; un asesor te contactará con propuesta y precios por volumen. También puedes llamarnos al <a href="tel:${store.phonesE164[0]}">${store.phones[0]}</a>.</p>
<ul><li>Personalización con grabado o bordado de tu logotipo.</li><li>Más de 12 colores de piel; tonos especiales bajo pedido.</li><li>Empaque de regalo y entregas a múltiples direcciones.</li><li>Facturación para empresas.</li></ul></div>
<form id="quote-form" class="store-card" onsubmit="return window.koonQuote(event)">
<div class="form-grid"><div class="field"><label for="q-name">Nombre*</label><input id="q-name" name="name" required></div><div class="field"><label for="q-company">Empresa</label><input id="q-company" name="company"></div>
<div class="field"><label for="q-email">Correo electrónico*</label><input id="q-email" name="email" type="email" required></div><div class="field"><label for="q-phone">Teléfono / WhatsApp*</label><input id="q-phone" name="phone" type="tel" required></div>
<div class="field full"><label for="q-type">Tipo de proyecto</label><select id="q-type" name="type"><option>Regalos corporativos</option><option>Hotelería / amenidades</option><option>Juegos personalizados</option><option>Proyecto especial / diseño a la medida</option><option>Bodas y eventos</option><option>Otro</option></select></div>
<div class="field"><label for="q-qty">Cantidad aproximada</label><input id="q-qty" name="qty" placeholder="Ej. 50 piezas"></div><div class="field"><label for="q-date">Fecha en que lo necesitas</label><input id="q-date" name="date" type="date"></div>
<div class="field full"><label for="q-msg">Detalles (productos de interés, colores, logotipo, presupuesto)*</label><textarea id="q-msg" name="msg" rows="4" required></textarea></div></div>
<p style="font-size:.8rem;color:var(--muted)">Al enviar aceptas nuestro <a href="/aviso-de-privacidad/">aviso de privacidad</a>.</p>
<button class="btn btn-wa btn-block" type="submit">Enviar por WhatsApp</button><button class="btn btn-outline btn-block" type="button" style="margin-top:8px" onclick="window.koonQuote(event,'mail')">Enviar por correo</button>
</form></div>
<script>window.koonQuote=function(e,mode){e.preventDefault();var f=document.getElementById('quote-form');if(!f.reportValidity())return false;var d=new FormData(f);var txt='Solicitud de cotización\\n'+['name:Nombre','company:Empresa','email:Correo','phone:Teléfono','type:Proyecto','qty:Cantidad','date:Fecha','msg:Detalles'].map(function(k){var p=k.split(':');return p[1]+': '+(d.get(p[0])||'-')}).join('\\n');if(mode==='mail'){location.href='mailto:${store.email}?subject='+encodeURIComponent('Cotización – '+(d.get('company')||d.get('name')))+'&body='+encodeURIComponent(txt);}else{window.open('https://wa.me/${store.whatsapp}?text='+encodeURIComponent(txt),'_blank');}return false;}</script>`, { prio: 0.7 });

// Envíos
simplePage('/envios/', 'Envíos y entregas a todo México | Koon Artesanos', 'Envíos y entregas', `Enviamos a todo México por ${store.shipping.carrier}. Envío de ${money(store.shipping.flatRate)} y gratis desde ${money(store.shipping.freeFrom)}. Productos de línea en ${store.shipping.deliveryDays}; personalizados en ${store.shipping.customDeliveryDays}.`, `<div class="prose">${CONTENT.envios.replace(/\{flat\}/g, money(store.shipping.flatRate)).replace(/\{free\}/g, money(store.shipping.freeFrom)).replace(/\{carrier\}/g, store.shipping.carrier).replace(/\{days\}/g, store.shipping.deliveryDays).replace(/\{cdays\}/g, store.shipping.customDeliveryDays).replace(/\{email\}/g, store.email)}</div>`);

// FAQ
{
  const faqs = CONTENT.faq.map(f => ({ q: f.q, a: f.a.replace(/\{flat\}/g, money(store.shipping.flatRate)).replace(/\{free\}/g, money(store.shipping.freeFrom)).replace(/\{carrier\}/g, store.shipping.carrier).replace(/\{days\}/g, store.shipping.deliveryDays).replace(/\{cdays\}/g, store.shipping.customDeliveryDays).replace(/\{email\}/g, store.email) }));
  simplePage('/preguntas-frecuentes/', 'Preguntas frecuentes | Koon Artesanos', 'Preguntas frecuentes', 'Resolvemos tus dudas sobre envíos, personalización con grabado o bordado, tiempos de entrega, cambios, cuidado de la piel y pedidos corporativos por volumen.', `<div class="faq prose">${faqs.map(f => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('')}</div><p style="margin-top:32px">¿No encontraste tu respuesta? <a href="https://wa.me/${store.whatsapp}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a> o a <a href="mailto:${store.email}">${store.email}</a>.</p>`, { jsonld: [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') } })) }] });
}

// Políticas
simplePage('/politica-de-devoluciones/', 'Política de cambios y devoluciones | Koon Artesanos', 'Política de cambios y devoluciones', 'Tienes 10 días hábiles a partir de la recepción de tu producto de línea para solicitar un cambio. Conoce las condiciones, el proceso de envío y las devoluciones de dinero.', `<div class="prose">${CONTENT.devoluciones.replace(/\{returns\}/g, store.returnsAddress).replace(/\{email\}/g, store.email)}</div>`, { prio: 0.4 });
simplePage('/aviso-de-privacidad/', 'Aviso de privacidad | Koon Artesanos', 'Aviso de privacidad', 'Aviso de privacidad de Koon Blanc, S.A. de C.V. (Koon Artesanos) conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.', `<div class="prose">${CONTENT.privacidad.replace(/\{email\}/g, store.email).replace(/\{returns\}/g, store.returnsAddress)}</div>`, { prio: 0.3 });
simplePage('/terminos-y-condiciones/', 'Términos y condiciones | Koon Artesanos', 'Términos y condiciones', 'Términos y condiciones de uso y compra en la tienda en línea de Koon Artesanos: pedidos, precios, pagos, envíos, cambios y propiedad intelectual.', `<div class="prose">${CONTENT.terminos.replace(/\{email\}/g, store.email)}</div>`, { prio: 0.3 });

// Carrito / checkout / gracias / buscar
simplePage('/carrito/', 'Tu carrito | Koon Artesanos', 'Tu carrito', 'Revisa los productos de tu carrito de compras en Koon Artesanos.', `<div class="cart-layout"><div id="cart-page"></div><aside class="summary" id="cart-summary"><h3>Resumen</h3><dl></dl><p class="free-ship-note" style="font-size:.85rem;color:var(--brand-2)"></p><a class="btn btn-block btn-lg" href="/checkout/">Proceder al pago</a><a class="btn btn-wa btn-block cart-whatsapp" href="#" style="margin-top:8px">Pedir por WhatsApp</a><p style="font-size:.8rem;color:var(--muted);margin:14px 0 0">Pagos seguros con tarjeta, Mercado Pago o transferencia. Precios con IVA incluido.</p></aside></div>`, { noindex: true });
simplePage('/checkout/', 'Finalizar compra | Koon Artesanos', 'Finalizar compra', 'Completa tus datos de envío y elige tu método de pago.', `<div class="cart-layout"><form id="checkout-form" novalidate>
<h2 style="font-size:1.2rem">Datos de contacto</h2><div class="form-grid"><div class="field"><label for="c-name">Nombre completo*</label><input id="c-name" name="name" required autocomplete="name"></div><div class="field"><label for="c-email">Correo electrónico*</label><input id="c-email" name="email" type="email" required autocomplete="email"></div><div class="field"><label for="c-phone">Teléfono*</label><input id="c-phone" name="phone" type="tel" required autocomplete="tel"></div><div class="field"><label for="c-rfc">RFC (solo si requieres factura)</label><input id="c-rfc" name="rfc" maxlength="13"></div></div>
<h2 style="font-size:1.2rem;margin-top:20px">Dirección de envío</h2><div class="form-grid"><div class="field full"><label for="c-street">Calle, número y referencias*</label><input id="c-street" name="street" required autocomplete="street-address"></div><div class="field"><label for="c-colony">Colonia*</label><input id="c-colony" name="colony" required></div><div class="field"><label for="c-zip">Código postal*</label><input id="c-zip" name="zip" required pattern="[0-9]{5}" inputmode="numeric" autocomplete="postal-code"></div><div class="field"><label for="c-city">Ciudad / municipio*</label><input id="c-city" name="city" required autocomplete="address-level2"></div><div class="field"><label for="c-state">Estado*</label><select id="c-state" name="state" required>${['Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'].map(s => `<option>${s}</option>`).join('')}</select></div><div class="field full"><label for="c-notes">Notas del pedido (grabado, horario de entrega, etc.)</label><textarea id="c-notes" name="notes" rows="3"></textarea></div></div>
<h2 style="font-size:1.2rem;margin-top:20px">Método de pago</h2><div id="pay-options" class="pay-options"><div class="alert alert-info">Cargando métodos de pago…</div></div>
<div id="checkout-error" class="alert alert-error" hidden></div>
<button class="btn btn-lg btn-block" id="checkout-submit" type="submit">Continuar al pago</button>
<p style="font-size:.8rem;color:var(--muted);margin-top:12px">Al continuar aceptas los <a href="/terminos-y-condiciones/">términos y condiciones</a> y el <a href="/aviso-de-privacidad/">aviso de privacidad</a>. Tus datos de pago se procesan de forma cifrada por la pasarela; nunca se almacenan en nuestro sitio.</p></form>
<aside class="summary" id="checkout-summary"><h3>Tu pedido</h3><dl></dl><p class="free-ship-note" style="font-size:.85rem;color:var(--brand-2)"></p><a href="/carrito/" style="font-size:.85rem;text-decoration:underline">Editar carrito</a></aside></div>`, { noindex: true });
simplePage('/gracias/', 'Gracias por tu pedido | Koon Artesanos', '¡Gracias por tu pedido!', 'Confirmación de pedido en Koon Artesanos.', `<div id="thanks" class="prose" style="margin:0 auto;text-align:center"><p style="font-size:1.1rem">Hemos recibido tu pedido <strong id="order-id"></strong>. Te enviaremos la confirmación y el número de guía a tu correo.</p>
<div id="transfer-box" class="alert alert-info" hidden style="text-align:left"><strong>Datos para tu transferencia</strong><p id="transfer-info" style="margin:8px 0"></p><p style="margin:0">Monto: <strong id="transfer-total"></strong>. Tu pedido se elabora y envía al recibir el comprobante.</p></div>
<ul id="order-lines" style="list-style:none;padding:0;color:var(--muted)"></ul>
<p>¿Dudas? Escríbenos por <a href="https://wa.me/${store.whatsapp}" target="_blank" rel="noopener">WhatsApp</a> o a <a href="mailto:${store.email}">${store.email}</a>.</p><a class="btn" href="/tienda/">Seguir comprando</a></div>`, { noindex: true });
simplePage('/buscar/', 'Buscar | Koon Artesanos', 'Resultados de búsqueda', 'Busca productos de piel genuina en Koon Artesanos.', `<p class="toolbar" style="padding-top:0">Buscaste: <strong id="search-q"></strong> · <span id="search-count"></span></p><div class="grid" id="search-results"></div>`, { noindex: true });

// 404
write('/404.html', layout({ v, path: '/404/', title: 'Página no encontrada | Koon Artesanos', description: 'La página que buscas no existe.', noindex: true, body: `<div class="wrap empty"><h1>No encontramos esa página</h1><p>Quizá el enlace cambió. Explora nuestras colecciones o usa el buscador.</p><p><a class="btn" href="/tienda/">Ver la tienda</a> <a class="btn btn-outline" href="/">Ir al inicio</a></p></div>` }));

// ---------- índice de búsqueda, sitemap, robots ----------
fs.writeFileSync(OUT + '/search-index.json', JSON.stringify(products.map(p => ({ h: p.handle, t: p.title, p: p.price, i: p.images[0].src, c: p.categories.map(s => catBySlug[s].name).join(' '), k: p.tags.join(' ') + ' ' + p.type + ' ' + p.variants.map(v => v.value).join(' ') }))));
fs.writeFileSync(OUT + '/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${pages.map(([p, prio, freq]) => { const prod = p.startsWith('/producto/') ? byHandle[p.split('/')[2]] : null; return `<url><loc>${SITE}${p}</loc><lastmod>${TODAY}</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority>${prod ? `<image:image><image:loc>${abs(prod.images[0].src)}</image:loc><image:title>${esc(prod.title)}</image:title></image:image>` : ''}</url>`; }).join('\n')}\n</urlset>`);
fs.writeFileSync(OUT + '/robots.txt', `User-agent: *\nAllow: /\nDisallow: /carrito/\nDisallow: /checkout/\nDisallow: /gracias/\nDisallow: /buscar/\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Sitio generado en ${OUT}/ · ${pages.length} páginas indexables (${products.length} productos, ${categories.length} categorías, ${blog.length} artículos).`);
