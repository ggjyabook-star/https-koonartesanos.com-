// POST /api/webhook-stripe  — Stripe avisa aquí cuando un pago se completa.
// Configura el endpoint en Stripe → Developers → Webhooks con el evento checkout.session.completed
// y copia el "Signing secret" en STRIPE_WEBHOOK_SECRET.
import { json, readRaw, sendMail } from './_lib.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return json(res, 500, { error: 'Stripe no configurado' });
  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;
  try {
    const raw = await readRaw(req);
    event = stripe.webhooks.constructEvent(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) { return json(res, 400, { error: 'Firma inválida: ' + e.message }); }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object;
    const m = s.metadata || {};
    const summary = `PAGO CONFIRMADO (Stripe)\nPedido: ${m.order_id}\nTotal: ${(s.amount_total / 100).toLocaleString('es-MX')} ${String(s.currency).toUpperCase()}\nCliente: ${s.customer_details && s.customer_details.email}\nArtículos: ${m.items}\nDatos: ${m.customer}\nNotas: ${m.notes || ''}`;
    console.log('[PEDIDO PAGADO]', summary);
    await sendMail(`✅ Pago confirmado ${m.order_id} (Stripe)`, summary);
  }
  return json(res, 200, { received: true });
}
