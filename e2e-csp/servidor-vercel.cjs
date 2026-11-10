// Sirve dist/constructora-frontend/browser con las cabeceras de vercel.json y el mismo reenvío a index.html que Vercel.
// Sirve para comprobar la CSP en un navegador de verdad, sin desplegar. Uso: node e2e-csp/servidor-vercel.cjs 4400
const http = require('http');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..', 'dist', 'constructora-frontend', 'browser');
const cabeceras = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8')).headers[0].headers;
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain', '.xml': 'application/xml',
  '.woff2': 'font/woff2' };

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let archivo = path.join(raiz, url);
  if (!archivo.startsWith(raiz) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
    archivo = path.join(raiz, 'index.html');
  }
  for (const { key, value } of cabeceras) res.setHeader(key, value);
  res.setHeader('Content-Type', tipos[path.extname(archivo)] || 'application/octet-stream');
  fs.createReadStream(archivo).pipe(res);
}).listen(Number(process.argv[2] || 4400), () => console.log('listo'));
