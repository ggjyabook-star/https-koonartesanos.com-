// Utilidades compartidas por las funciones serverless (Vercel).
// Valida el carrito contra el catálogo real (nunca se confía en los precios enviados por el navegador).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
let _products, _store;
function loadJson(name) {
  const candidates = [path.join(process.cwd(), 'data', name), path.join(here, '..', 'data', name)];
  for (const f of candidates) if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  throw new Error('No se encontró data/' + name);
}
export function products() { return _products || (_products = loadJson('products.json')); }
export function store() { return _store || (_store = loadJson('store.json')); }

export function siteUrl() { return (process.env.SITE_URL || store().url || '').replace(/\/$/, ''); }

export function providers() {
  return (process.env.PAYMENT_PROVIDERS || 'transferencia').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

// Recalcula el pedido a partir de handles + variantes + cantidades.
export function buildOrder(body) {
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) throw new Error('El carrito está vacío.');
  if (items.length > 50) throw new Error('Demasiados artículos en el carrito.');
  const catalog = products();
  const lines = [];
  for (const it of items) {
    const p = catalog.find(x => x.handle === it.handle);
    if (!p) throw new Error('Producto no encontrado: ' + it.handle);
    const v = p.variants.find(x => x.id === it.variantId) || p.variants[0];
    if (!v || !v.available || !p.available) throw new Error(`"${p.title}" no está disponible actualmente.`);
    const qty = Math.max(1, Math.min(99, parseInt(it.qty, 10) || 1));
    const personalization = String(it.personalization || '').slice(0, 120);
    lines.push({ handle: p.handle, title: p.title, variant: v.value, optionName: p.optionName, variantId: v.id, sku: v.sku || p.code || null, unitPrice: v.price, qty, total: v.price * qty, personalization, image: p.images[0] ? p.images[0].src : null });
  }
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const sh = store().shipping;
  const shipping = subtotal >= sh.freeFrom ? 0 : sh.flatRate;
  const customer = sanitizeCustomer(body.customer || {});
  return { lines, subtotal, shipping, total: subtotal + shipping, currency: 'MXN', customer, notes: String(body.notes || '').slice(0, 500), createdAt: new Date().toISOString(), id: 'KOON-' + Date.now().toString(36).toUpperCase() };
}

function sanitizeCustomer(c) {
  const s = (v, n) => String(v || '').trim().slice(0, n);
  const out = { name: s(c.name, 80), email: s(c.email, 120), phone: s(c.phone, 30), street: s(c.street, 160), colony: s(c.colony, 80), city: s(c.city, 80), state: s(c.state, 60), zip: s(c.zip, 10), rfc: s(c.rfc, 20) };
  if (!out.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.email)) throw new Error('Nombre y correo electrónico válidos son obligatorios.');
  if (!out.street || !out.city || !out.state || !/^\d{5}$/.test(out.zip)) throw new Error('Completa la dirección de envío (calle, ciudad, estado y código postal de 5 dígitos).');
  return out;
}

export function money(n) { return '$' + Number(n).toLocaleString('es-MX') + ' MXN'; }

// Aviso de pedido por correo (Resend). Si no hay API key, sólo se registra en logs.
export async function notifyOrder(order, status, extra = {}) {
  const st = store();
  const text = [
    `Pedido ${order.id} · ${status}`,
    `Cliente: ${order.customer.name} <${order.customer.email}> ${order.customer.phone}`,
    `Envío: ${order.customer.street}, ${order.customer.colony}, ${order.customer.city}, ${order.customer.state}, CP ${order.customer.zip}`,
    order.customer.rfc ? `RFC: ${order.customer.rfc}` : '',
    '',
    ...order.lines.map(l => `- ${l.qty} × ${l.title} (${l.optionName}: ${l.variant})${l.personalization ? ' · Personalización: ' + l.personalization : ''} — ${money(l.total)}`),
    '',
    `Subtotal: ${money(order.subtotal)}  Envío: ${money(order.shipping)}  TOTAL: ${money(order.total)}`,
    order.notes ? `Notas: ${order.notes}` : '',
    Object.keys(extra).length ? JSON.stringify(extra) : '',
  ].filter(Boolean).join('\n');
  console.log('[PEDIDO]', text);
  await sendMail(`Pedido ${order.id} · ${status} · ${money(order.total)}`, text, order.customer.email);
}

export async function sendMail(subject, text, replyTo) {
  if (!process.env.RESEND_API_KEY) return;
  const st = store();
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.ORDER_FROM_EMAIL || `pedidos@${new URL(siteUrl() || st.url).hostname}`, to: [process.env.ORDER_NOTIFY_EMAIL || st.email], reply_to: replyTo || undefined, subject, text }),
    });
  } catch (e) { console.error('No se pudo enviar el correo:', e.message); }
}

export function json(res, status, data) { res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); }

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}
export async function readRaw(req) { const chunks = []; for await (const c of req) chunks.push(c); return Buffer.concat(chunks); }
