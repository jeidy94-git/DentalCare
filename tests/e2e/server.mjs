// Servidor estático mínimo para las pruebas E2E: sirve frontend/ en http://127.0.0.1:5600/
// node tests/e2e/server.mjs         (déjalo abierto en otra terminal)
// node tests/e2e/server.mjs --api   igual, pero entrega js/core/config.js con USE_MOCK = false: el frontend
//                                   habla con el backend real (http://localhost:3000/api) sin editar el archivo.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../frontend/', import.meta.url));
const USE_API = process.argv.includes('--api');
const CONFIG = path.join(ROOT, 'js', 'core', 'config.js');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

http
  .createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    // No servir nada fuera de frontend/ (../../ en la URL).
    if (!file.startsWith(ROOT)) return res.writeHead(403).end();
    fs.readFile(file, (error, data) => {
      if (error) return res.writeHead(404).end();
      if (USE_API && file === CONFIG) {
        const source = data.toString('utf8');
        if (!source.includes('export const USE_MOCK = true;')) return res.writeHead(500).end('config.js cambió: revisa tests/e2e/server.mjs');
        data = source.replace('export const USE_MOCK = true;', 'export const USE_MOCK = false;');
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' }).end(data);
    });
  })
  .listen(5600, '127.0.0.1', () => console.log(`DentalCare en http://127.0.0.1:5600/ ${USE_API ? '(USE_MOCK = false → API en http://localhost:3000/api)' : '(modo mock)'}`));
