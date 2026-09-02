// POST /api/webhook-mercadopago — Mercado Pago notifica aquí los pagos.
// En el panel de Mercado Pago: Tu integración → Webhooks → URL https://TU-DOMINIO/api/webhook-mercadopago
// Evento: Pagos. Copia la "Clave secreta" en MP_WEBHOOK_SECRET para validar la firma.
import crypto from 'crypto';
import { json, readBody, sendMail } from './_lib.js';

function validSignature(req, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // sin secreto configurado no se valida (recomendado configurarlo)
  const sig = req.headers['x-signature'] || '';
  const reqId = req.headers['x-request-id'] || '';
  const parts = Object.fromEntries(sig.split(',').map(p => p.trim().split('=')));
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId};request-id:${reqId};ts:${parts.ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return hmac === parts.v1;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  if (!process.env.MP_ACCESS_TOKEN) return json(res, 500, { error: 'Mercado Pago no configurado' });
  const body = await readBody(req).catch(() => ({}));
  const url = new URL(req.url, 'http://x');
  const dataId = (body.data && body.data.id) || url.searchParams.get('data.id') || url.searchParams.get('id');
  const type = body.type || body.action || url.searchParams.get('type') || url.searchParams.get('topic');
  if (!dataId || !/payment/.test(String(type))) return json(res, 200, { ignored: true });
  if (!validSignature(req, String(dataId))) return json(res, 401, { error: 'Firma inválida' });

  try {
    const { MercadoPagoConfig, Payment } = await import('mercadopago');
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const p = await new Payment(client).get({ id: dataId });
    const m = p.metadata || {};
    const summary = `PAGO ${String(p.status).toUpperCase()} (Mercado Pago)\nPedido: ${p.external_reference || m.order_id}\nPago: ${p.id} · ${p.payment_method_id} · ${p.status_detail}\nTotal: ${Number(p.transaction_amount).toLocaleString('es-MX')} ${p.currency_id}\nCliente: ${p.payer && p.payer.email}\nArtículos: ${Array.isArray(m.items) ? m.items.join('; ') : ''}\nDatos: ${JSON.stringify(m.customer || {})}\nNotas: ${m.notes || ''}`;
    console.log('[PEDIDO MP]', summary);
    if (p.status === 'approved') await sendMail(`✅ Pago aprobado ${p.external_reference || m.order_id} (Mercado Pago)`, summary);
  } catch (e) { console.error('webhook MP error', e.message); }
  return json(res, 200, { received: true });
}
