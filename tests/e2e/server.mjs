// Servidor estático mínimo para las pruebas E2E: sirve frontend/ en http://127.0.0.1:5600/
// node tests/e2e/server.mjs   (déjalo abierto en otra terminal)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../frontend/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

http
  .createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    // No servir nada fuera de frontend/ (../../ en la URL).
    if (!file.startsWith(ROOT)) return res.writeHead(403).end();
    fs.readFile(file, (error, data) => {
      if (error) return res.writeHead(404).end();
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' }).end(data);
    });
  })
  .listen(5600, '127.0.0.1', () => console.log('DentalCare en http://127.0.0.1:5600/'));
