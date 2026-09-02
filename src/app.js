/* Koon Artesanos – JS del sitio: menú, buscador, carrito (localStorage), producto y checkout. */
(function () {
  'use strict';
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const money = n => '$' + Number(n).toLocaleString('es-MX') + ' MXN';
  const STORE = window.KOON || {};

  /* ---------- Carrito ---------- */
  const Cart = {
    key: 'koon_cart_v1',
    get() { try { return JSON.parse(localStorage.getItem(this.key) || '[]'); } catch (e) { return []; } },
    set(items) { try { localStorage.setItem(this.key, JSON.stringify(items)); } catch (e) {} this.render(); },
    add(item) {
      const items = this.get();
      const same = items.find(i => i.handle === item.handle && i.variantId === item.variantId && (i.personalization || '') === (item.personalization || ''));
      if (same) same.qty = Math.min(99, same.qty + item.qty); else items.push(item);
      this.set(items);
      toast(`«${item.title}» se agregó al carrito.`, '/carrito/', 'Ver carrito');
    },
    update(idx, qty) { const items = this.get(); if (!items[idx]) return; if (qty <= 0) items.splice(idx, 1); else items[idx].qty = Math.min(99, qty); this.set(items); },
    remove(idx) { this.update(idx, 0); },
    clear() { this.set([]); },
    count() { return this.get().reduce((s, i) => s + i.qty, 0); },
    subtotal() { return this.get().reduce((s, i) => s + i.price * i.qty, 0); },
    shipping(sub) { const sh = STORE.shipping || { flatRate: 0, freeFrom: 0 }; return sub === 0 ? 0 : (sub >= sh.freeFrom ? 0 : sh.flatRate); },
    render() {
      const n = this.count();
      $$('.cart-count').forEach(el => { el.textContent = n; el.dataset.n = n; });
      if ($('#cart-page')) renderCartPage();
      if ($('#checkout-summary')) renderSummary('#checkout-summary');
    },
  };
  window.KoonCart = Cart;

  function toast(msg, href, label) {
    let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.innerHTML = msg + (href ? `<a href="${href}">${label || 'Ver'}</a>` : '');
    t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3500);
  }

  /* ---------- Menú móvil y buscador ---------- */
  const nav = $('.nav'), toggle = $('.menu-toggle');
  if (toggle) toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : ''; });
  $$('.nav > .wrap > ul > li > button').forEach(b => b.addEventListener('click', () => { const li = b.parentElement; const sub = $('.sub', li); if (sub) sub.style.display = sub.style.display === 'block' ? '' : 'block'; }));
  const sp = $('.search-panel'), sb = $('.search-toggle');
  if (sb) sb.addEventListener('click', () => { sp.classList.toggle('open'); if (sp.classList.contains('open')) $('input', sp).focus(); });

  /* ---------- Hero slider ---------- */
  const hero = $('.hero');
  if (hero) {
    const slides = $$('.slides > *', hero), dots = $$('.hero-dots button', hero); let i = 0, timer;
    const go = n => { i = (n + slides.length) % slides.length; slides.forEach((s, k) => s.classList.toggle('is-active', k === i)); dots.forEach((d, k) => d.classList.toggle('is-active', k === i)); };
    const auto = () => { clearInterval(timer); timer = setInterval(() => go(i + 1), 6000); };
    dots.forEach((d, k) => d.addEventListener('click', () => { go(k); auto(); }));
    if (slides.length > 1) auto();
  }

  /* ---------- Pestañas ---------- */
  $$('[data-tabs]').forEach(group => {
    const btns = $$('button', group);
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.classList.toggle('is-active', x === b));
      $$(`[data-tab-panel]`).filter(p => p.dataset.tabGroup === group.dataset.tabs).forEach(p => { p.hidden = p.dataset.tabPanel !== b.dataset.tab; });
    }));
  });

  /* ---------- Ordenar en categoría ---------- */
  const sortSel = $('#sort');
  if (sortSel) sortSel.addEventListener('change', () => {
    const grid = $('#product-grid'); const cards = $$('.card', grid);
    const v = sortSel.value;
    cards.sort((a, b) => {
      const pa = +a.dataset.price, pb = +b.dataset.price, da = +a.dataset.date, db = +b.dataset.date;
      if (v === 'price-asc') return pa - pb; if (v === 'price-desc') return pb - pa; if (v === 'new') return db - da; return (+a.dataset.order) - (+b.dataset.order);
    });
    cards.forEach(c => grid.appendChild(c));
  });

  /* ---------- Página de producto ---------- */
  const pp = $('#product-page');
  if (pp) {
    const P = JSON.parse($('#product-data').textContent);
    let variant = P.variants.find(v => v.available) || P.variants[0];
    const mainImg = $('.gallery-main img'), thumbs = $$('.thumbs button'), priceEl = $('.p-price .amount'), stock = $('.stock-note'), btn = $('#add-to-cart'), out = $('.opt-label output');
    function showImage(idx) { if (idx == null || !P.images[idx]) return; mainImg.src = P.images[idx].src; mainImg.alt = P.images[idx].alt; thumbs.forEach((t, k) => t.classList.toggle('is-active', k === idx)); }
    thumbs.forEach((t, k) => t.addEventListener('click', () => showImage(k)));
    function selectVariant(v) {
      variant = v; $$('.opt').forEach(o => o.classList.toggle('is-active', o.dataset.id === v.id));
      if (out) out.value = v.value; priceEl.textContent = money(v.price);
      stock.textContent = v.available ? 'Disponible · se elabora a mano' : 'Agotado en este color'; stock.classList.toggle('out', !v.available);
      btn.disabled = !v.available; if (v.image != null) showImage(v.image);
    }
    $$('.opt').forEach(o => o.addEventListener('click', () => selectVariant(P.variants.find(v => v.id === o.dataset.id))));
    selectVariant(variant);
    const qty = $('#qty'); $('#qty-minus').addEventListener('click', () => qty.value = Math.max(1, +qty.value - 1)); $('#qty-plus').addEventListener('click', () => qty.value = Math.min(99, +qty.value + 1));
    btn.addEventListener('click', () => {
      Cart.add({ handle: P.handle, title: P.title, variantId: variant.id, variant: variant.value, optionName: P.optionName, price: variant.price, qty: Math.max(1, +qty.value || 1), image: (P.images[variant.image != null ? variant.image : 0] || {}).src, personalization: ($('#personalization') || {}).value || '', url: location.pathname });
    });
    const waBtn = $('#buy-whatsapp');
    if (waBtn) waBtn.addEventListener('click', e => { e.preventDefault(); const msg = `Hola, me interesa: ${P.title} (${P.optionName}: ${variant.value}) × ${qty.value}. ${location.href}`; window.open(`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank'); });
  }

  /* ---------- Carrito ---------- */
  function renderCartPage() {
    const box = $('#cart-page'); const items = Cart.get();
    if (!items.length) { box.innerHTML = `<div class="empty"><h2>Tu carrito está vacío</h2><p>Descubre nuestras piezas de piel genuina hechas a mano.</p><a class="btn" href="/tienda/">Ver la tienda</a></div>`; $('#cart-summary') && ($('#cart-summary').hidden = true); return; }
    box.innerHTML = items.map((i, k) => `<div class="cart-line">
      <a href="${i.url || '/producto/' + i.handle + '/'}"><img src="${i.image || ''}" alt="${i.title}"></a>
      <div><div class="title"><a href="${i.url || '/producto/' + i.handle + '/'}">${i.title}</a></div>
        <div class="meta">${i.optionName}: ${i.variant}${i.personalization ? ' · Personalización: ' + escapeHtml(i.personalization) : ''} · ${money(i.price)} c/u</div>
        <div style="margin-top:8px;display:flex;gap:12px;align-items:center"><span class="qty"><button type="button" data-dec="${k}" aria-label="Menos">−</button><input type="number" min="1" max="99" value="${i.qty}" data-qty="${k}" aria-label="Cantidad"><button type="button" data-inc="${k}" aria-label="Más">+</button></span><button class="remove" data-remove="${k}">Quitar</button></div></div>
      <div class="line-total">${money(i.price * i.qty)}</div></div>`).join('');
    $$('[data-dec]', box).forEach(b => b.addEventListener('click', () => Cart.update(+b.dataset.dec, items[+b.dataset.dec].qty - 1)));
    $$('[data-inc]', box).forEach(b => b.addEventListener('click', () => Cart.update(+b.dataset.inc, items[+b.dataset.inc].qty + 1)));
    $$('[data-qty]', box).forEach(inp => inp.addEventListener('change', () => Cart.update(+inp.dataset.qty, +inp.value || 1)));
    $$('[data-remove]', box).forEach(b => b.addEventListener('click', () => Cart.remove(+b.dataset.remove)));
    $('#cart-summary') && ($('#cart-summary').hidden = false); renderSummary('#cart-summary');
  }
  function renderSummary(sel) {
    const el = $(sel); if (!el) return; const sub = Cart.subtotal(), sh = Cart.shipping(sub);
    const dl = $('dl', el); if (!dl) return;
    dl.innerHTML = `<dt>Subtotal</dt><dd>${money(sub)}</dd><dt>Envío${sh === 0 && sub > 0 ? ' (gratis)' : ''}</dt><dd>${sub === 0 ? '—' : money(sh)}</dd><div class="total" style="display:contents"><dt>Total</dt><dd>${money(sub + sh)}</dd></div>`;
    const note = $('.free-ship-note', el); if (note && STORE.shipping) { const falta = STORE.shipping.freeFrom - sub; note.textContent = sub > 0 && falta > 0 ? `Agrega ${money(falta)} más para envío gratis.` : (sub > 0 ? '¡Tu envío es gratis!' : ''); }
    const wa = $('.cart-whatsapp', el);
    if (wa) wa.onclick = e => { e.preventDefault(); const lines = Cart.get().map(i => `• ${i.qty} × ${i.title} (${i.optionName}: ${i.variant})${i.personalization ? ' – ' + i.personalization : ''}`).join('\n'); window.open(`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent('Hola, quiero hacer este pedido:\n' + lines + '\nSubtotal: ' + money(sub))}`, '_blank'); };
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /* ---------- Checkout ---------- */
  const form = $('#checkout-form');
  if (form) {
    if (!Cart.count()) { location.replace('/carrito/'); return; }
    const payBox = $('#pay-options'), err = $('#checkout-error'), submit = $('#checkout-submit');
    const LABELS = {
      mercadopago: ['Mercado Pago', 'Tarjeta de crédito/débito, hasta 12 meses sin intereses, OXXO y transferencia SPEI.'],
      stripe: ['Tarjeta de crédito o débito', 'Pago seguro con Visa, Mastercard o American Express (Stripe).'],
      transferencia: ['Transferencia bancaria', 'Te mostramos los datos bancarios al confirmar; enviamos tu pedido al recibir el comprobante.'],
    };
    fetch('/api/checkout').then(r => r.json()).then(cfg => {
      const provs = (cfg.providers || []).filter(p => LABELS[p]);
      if (!provs.length) throw new Error();
      payBox.innerHTML = provs.map((p, i) => `<label class="pay-option"><input type="radio" name="provider" value="${p}" ${i === 0 ? 'checked' : ''}><div><strong>${LABELS[p][0]}</strong><span>${LABELS[p][1]}</span></div></label>`).join('');
    }).catch(() => { payBox.innerHTML = `<div class="alert alert-info">Los pagos en línea aún no están activados. Puedes completar tu pedido por WhatsApp y te enviaremos una liga de pago.</div><a class="btn btn-wa btn-block" href="#" id="wa-order">Pedir por WhatsApp</a>`; submit.hidden = true; $('#wa-order').onclick = e => { e.preventDefault(); const lines = Cart.get().map(i => `• ${i.qty} × ${i.title} (${i.variant})`).join('\n'); window.open(`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent('Hola, quiero hacer este pedido:\n' + lines)}`, '_blank'); }; });
    form.addEventListener('submit', async e => {
      e.preventDefault(); err.hidden = true; submit.disabled = true; submit.textContent = 'Procesando…';
      const fd = new FormData(form); const customer = {}; ['name', 'email', 'phone', 'street', 'colony', 'city', 'state', 'zip', 'rfc'].forEach(k => customer[k] = fd.get(k) || '');
      try {
        const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: fd.get('provider'), customer, notes: fd.get('notes') || '', items: Cart.get().map(i => ({ handle: i.handle, variantId: i.variantId, qty: i.qty, personalization: i.personalization || '' })) }) });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Error al procesar el pago');
        if (data.transfer) { sessionStorage.setItem('koon_transfer', JSON.stringify(data)); }
        sessionStorage.setItem('koon_last_order', JSON.stringify({ id: data.orderId, items: Cart.get(), total: Cart.subtotal() + Cart.shipping(Cart.subtotal()) }));
        if (data.transfer) Cart.clear();
        location.href = data.url;
      } catch (ex) { err.textContent = ex.message; err.hidden = false; submit.disabled = false; submit.textContent = 'Continuar al pago'; }
    });
  }

  /* ---------- Gracias ---------- */
  const thanks = $('#thanks');
  if (thanks) {
    const q = new URLSearchParams(location.search);
    const last = JSON.parse(sessionStorage.getItem('koon_last_order') || 'null');
    if (q.get('pedido')) $('#order-id').textContent = q.get('pedido');
    if (q.get('transferencia')) { const t = JSON.parse(sessionStorage.getItem('koon_transfer') || 'null'); if (t) { $('#transfer-box').hidden = false; $('#transfer-info').textContent = t.transfer; $('#transfer-total').textContent = money(t.total); } }
    else if (!q.get('pendiente')) Cart.clear();
    if (last && last.items) $('#order-lines').innerHTML = last.items.map(i => `<li>${i.qty} × ${i.title} (${i.variant})</li>`).join('');
  }

  /* ---------- Búsqueda ---------- */
  const sr = $('#search-results');
  if (sr) {
    const q = (new URLSearchParams(location.search).get('q') || '').trim();
    $('#search-q').textContent = q; const inp = $('.search-panel input'); if (inp) inp.value = q;
    const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    fetch('/search-index.json').then(r => r.json()).then(idx => {
      const terms = norm(q).split(/\s+/).filter(Boolean);
      const hits = terms.length ? idx.filter(p => terms.every(t => norm(p.t + ' ' + p.c + ' ' + p.k).includes(t))) : [];
      $('#search-count').textContent = hits.length ? `${hits.length} resultado${hits.length > 1 ? 's' : ''}` : 'Sin resultados. Prueba con otra palabra o explora las categorías.';
      sr.innerHTML = hits.map(p => `<article class="card"><div class="card-media"><img src="${p.i}" alt="${p.t}" loading="lazy"></div><div class="card-body"><h3 class="card-title"><a href="/producto/${p.h}/">${p.t}</a></h3><div class="card-price">${money(p.p)}</div></div></article>`).join('');
    });
  }

  Cart.render();
})();
