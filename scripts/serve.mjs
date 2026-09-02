// Servidor local sencillo para previsualizar dist/ (sin funciones de pago).
// Para probar los pagos localmente usa: npx vercel dev
import http from 'http';
import fs from 'fs';
import path from 'path';
const root = path.resolve('dist');
const port = process.env.PORT || 4321;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.startsWith('/api/')) { res.writeHead(501, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Las funciones /api sólo corren en Vercel (usa `npx vercel dev`).', providers: [] })); }
  let f = path.join(root, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f = f + '.html';
  if (!fs.existsSync(f)) { f = path.join(root, '404.html'); res.statusCode = 404; }
  res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream');
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log(`Tienda en http://localhost:${port}`));
