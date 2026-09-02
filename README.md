# Tienda en línea · Koon Artesanos

Sitio de comercio electrónico completo, **pre-renderizado (HTML estático)** para máximo SEO y velocidad,
con carrito de compras y **pagos mediante funciones serverless** (Stripe y/o Mercado Pago) listas para activar
con solo cargar tus llaves.

- 165 productos, 23 categorías y 18 artículos del blog importados y corregidos (textos, títulos, colores, SEO).
- Imágenes de producto y blog descargadas a `public/img/` (el sitio no depende de Shopify).
- Páginas: inicio, catálogo, categorías, producto, blog, nosotros, equipo, piel genuina, personalización,
  Tatei, contacto/tiendas, cotizador, envíos, FAQ, políticas, carrito, checkout, gracias, buscador y 404.
- SEO: títulos y descripciones únicos, canonical, Open Graph, JSON-LD (Organization, Store, Product, Breadcrumb,
  BlogPosting, FAQPage, CollectionPage), `sitemap.xml`, `robots.txt`, redirecciones 301 desde las URLs antiguas.

---

## 1. Requisitos

- [Node.js](https://nodejs.org) 18 o superior (ya instalado: v24).
- Cuenta en [Vercel](https://vercel.com) (gratis) para publicar el sitio y las funciones de pago.

## 2. Ver el sitio en tu computadora

```bash
npm run dev
```

Abre <http://localhost:4321>. (Los pagos no funcionan en este modo; ver punto 4.)

## 3. Configurar los pagos (lo único que falta)

1. Copia `.env.example` a `.env` y llena las llaves de la pasarela que vayas a usar.
2. En `PAYMENT_PROVIDERS` escribe, separadas por coma, las opciones que verá el cliente:
   `mercadopago`, `stripe`, `transferencia` (una, dos o las tres).

### Mercado Pago (recomendado en México: tarjetas, MSI, OXXO, SPEI)
1. Entra a <https://www.mercadopago.com.mx/developers/panel/app> → crea una aplicación → **Credenciales de producción**.
2. Copia el **Access Token** en `MP_ACCESS_TOKEN`.
3. En **Webhooks** registra `https://TU-DOMINIO/api/webhook-mercadopago` con el evento **Pagos** y copia la
   *clave secreta* en `MP_WEBHOOK_SECRET`.

### Stripe (tarjetas internacionales)
1. <https://dashboard.stripe.com/apikeys> → copia la **Secret key** en `STRIPE_SECRET_KEY`.
2. **Developers → Webhooks → Add endpoint**: `https://TU-DOMINIO/api/webhook-stripe`, evento
   `checkout.session.completed`. Copia el *Signing secret* en `STRIPE_WEBHOOK_SECRET`.

### Transferencia bancaria
Escribe en `BANK_TRANSFER_INFO` el banco, beneficiario y CLABE. El cliente los verá al confirmar el pedido y
recibirás el aviso por correo/logs para enviar al recibir el comprobante.

### Aviso de pedidos por correo (opcional)
Crea una cuenta en <https://resend.com>, verifica tu dominio y pon la llave en `RESEND_API_KEY`.
Los pedidos llegan a `ORDER_NOTIFY_EMAIL`. Sin esta llave, los pedidos quedan registrados en los *logs* de Vercel
y en el panel de la pasarela (Mercado Pago / Stripe), que es donde de todos modos ves cada pago.

## 4. Publicar en Vercel

```bash
npm i -g vercel
vercel login
vercel
```

Luego, en el proyecto de Vercel → **Settings → Environment Variables**, agrega las variables de tu `.env`
y vuelve a desplegar con `vercel --prod`. Para probar los pagos en local: `vercel dev`.

Por último apunta el dominio `koonartesanos.com` al proyecto (Vercel → Domains). Las URLs antiguas de la tienda
(`/shop/juegos`, `/layouts/Nosotros`, `/blogs/...`, `/products/...`) redirigen automáticamente a las nuevas.

## 5. Editar productos, precios y textos

| Qué                          | Dónde                                                           |
|------------------------------|-----------------------------------------------------------------|
| Datos de contacto, envío, horarios, tiendas, asesores | `data/store.json` |
| Costo de envío y umbral de envío gratis | `data/store.json` → `shipping` |
| Textos e imágenes de categorías | `data/categories-src.json` |
| Correcciones a un producto (título, SEO, descripción, categorías) | `data/overrides.json` |
| Textos de envíos, FAQ y políticas | `src/content.json` |
| Estilos / colores del sitio  | `src/styles.css` (variables al inicio) |
| Catálogo completo            | `data/raw_products.json` (exportado de Shopify) → se limpia con `npm run data` |

Después de cualquier cambio ejecuta `npm run build` (Vercel lo hace solo en cada despliegue).

Para agregar un producto nuevo, copia un bloque de `data/raw_products.json` con el mismo formato, coloca sus
fotos en `public/img/products/` y corre `npm run build`.

## 6. Estructura

```
api/            funciones serverless (checkout, webhooks)
data/           catálogo, categorías, tienda (JSON)
public/         imágenes, favicon, logo
scripts/        build-data (limpieza), download-images, serve, check
src/            styles.css, app.js, content.json
build.mjs       generador de páginas → dist/
vercel.json     redirecciones 301, cabeceras, configuración
```

## 7. Notas sobre suposiciones

- **Envío**: se fijó en $250 MXN y gratis a partir de $5,000 MXN; cámbialo en `data/store.json`.
- **Precios**: se muestran con IVA incluido, tal como en la tienda anterior.
- Las tarifas de personalización (bordado de logo, colores especiales) se manejan por cotización.
