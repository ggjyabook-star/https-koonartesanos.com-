// POST /api/checkout
// Recibe el carrito + datos del cliente, recalcula el total en el servidor y crea la sesión de pago
// en la pasarela elegida. Devuelve { url } para redirigir al cliente, o los datos de transferencia.
import { buildOrder, providers, siteUrl, notifyOrder, json, readBody, store } from './_lib.js';

export default async function handler(req, res) {
  if (req.method === 'GET') return json(res, 200, { providers: providers().filter(p => p !== 'transferencia' || !!process.env.BANK_TRANSFER_INFO), shipping: store().shipping });
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  let order, body;
  try { body = await readBody(req); order = buildOrder(body); }
  catch (e) { return json(res, 400, { error: e.message }); }

  const provider = String(body.provider || providers()[0] || '').toLowerCase();
  if (!providers().includes(provider)) return json(res, 400, { error: 'Método de pago no disponible: ' + provider });
  const base = siteUrl();
  const success = `${base}/gracias/?pedido=${order.id}`;
  const cancel = `${base}/carrito/?cancelado=1`;

  try {
    if (provider === 'stripe') {
      if (!process.env.STRIPE_SECRET_KEY) throw new Error('Falta STRIPE_SECRET_KEY');
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const line_items = order.lines.map(l => ({
        quantity: l.qty,
        price_data: { currency: 'mxn', unit_amount: l.unitPrice * 100, product_data: { name: l.title, description: `${l.optionName}: ${l.variant}${l.personalization ? ' · ' + l.personalization : ''}`, images: l.image ? [l.image.startsWith('http') ? l.image : base + l.image] : [] } },
      }));
      if (order.shipping > 0) line_items.push({ quantity: 1, price_data: { currency: 'mxn', unit_amount: order.shipping * 100, product_data: { name: 'Envío (' + store().shipping.carrier + ')' } } });
      const session = await stripe.checkout.sessions.create({
        mode: 'payment', line_items, customer_email: order.customer.email, locale: 'es-419',
        success_url: success + '&session_id={CHECKOUT_SESSION_ID}', cancel_url: cancel,
        metadata: { order_id: order.id, customer: JSON.stringify(order.customer).slice(0, 490), items: order.lines.map(l => `${l.qty}x ${l.handle} [${l.variant}]${l.personalization ? ' ' + l.personalization : ''}`).join('; ').slice(0, 490), notes: order.notes.slice(0, 490) },
        payment_intent_data: { description: `Pedido ${order.id} – Koon Artesanos` },
      });
      await notifyOrder(order, 'INICIADO (Stripe, pendiente de pago)', { stripeSession: session.id });
      return json(res, 200, { url: session.url, orderId: order.id });
    }

    if (provider === 'mercadopago') {
      if (!process.env.MP_ACCESS_TOKEN) throw new Error('Falta MP_ACCESS_TOKEN');
      const { MercadoPagoConfig, Preference } = await import('mercadopago');
      const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
      const items = order.lines.map(l => ({ id: l.handle, title: `${l.title} (${l.variant})`.slice(0, 250), description: l.personalization || undefined, quantity: l.qty, unit_price: l.unitPrice, currency_id: 'MXN', picture_url: l.image ? (l.image.startsWith('http') ? l.image : base + l.image) : undefined, category_id: 'others' }));
      if (order.shipping > 0) items.push({ id: 'envio', title: 'Envío (' + store().shipping.carrier + ')', quantity: 1, unit_price: order.shipping, currency_id: 'MXN' });
      const [name, ...rest] = order.customer.name.split(' ');
      const pref = await new Preference(client).create({ body: {
        items, external_reference: order.id, statement_descriptor: 'KOON ARTESANOS',
        payer: { name, surname: rest.join(' ') || undefined, email: order.customer.email, phone: order.customer.phone ? { number: order.customer.phone } : undefined, address: { street_name: order.customer.street, zip_code: order.customer.zip } },
        back_urls: { success, failure: cancel, pending: success + '&pendiente=1' }, auto_return: 'approved',
        notification_url: `${base}/api/webhook-mercadopago`,
        metadata: { order_id: order.id, customer: order.customer, items: order.lines.map(l => `${l.qty}x ${l.handle} [${l.variant}]${l.personalization ? ' ' + l.personalization : ''}`), notes: order.notes },
      } });
      await notifyOrder(order, 'INICIADO (Mercado Pago, pendiente de pago)', { preferenceId: pref.id });
      return json(res, 200, { url: pref.init_point, orderId: order.id });
    }

    if (provider === 'transferencia') {
      if (!process.env.BANK_TRANSFER_INFO) throw new Error('La transferencia bancaria no está configurada.');
      await notifyOrder(order, 'PENDIENTE DE TRANSFERENCIA');
      return json(res, 200, { orderId: order.id, transfer: process.env.BANK_TRANSFER_INFO, total: order.total, url: `${base}/gracias/?pedido=${order.id}&transferencia=1` });
    }
    return json(res, 400, { error: 'Proveedor no soportado' });
  } catch (e) {
    console.error('checkout error', e);
    return json(res, 500, { error: 'No se pudo iniciar el pago: ' + (e.message || 'error desconocido') });
  }
}
