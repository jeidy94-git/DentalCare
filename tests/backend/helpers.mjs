// Utilidades compartidas por las pruebas de la API (tests/backend/*.test.mjs).
// Levantan la app de Express en un puerto libre contra la base de backend/.env (o la de DB_PORT=…).
import { createRequire } from 'node:module';
import { deepStrictEqual } from 'node:assert';

export const backend = new URL('../../backend/', import.meta.url);
export const frontend = new URL('../../frontend/js/', import.meta.url);
const require = createRequire(new URL('package.json', backend)); // jsonwebtoken está en backend/node_modules
export const jwt = require('jsonwebtoken');

const { default: app } = await import(new URL('src/app.js', backend).href);
export const { pool } = await import(new URL('src/config/db.js', backend).href);
export const { env } = await import(new URL('src/config/env.js', backend).href);

/** Resultados: check('nombre', condición, detalle) y al final report(). */
const results = [];
export const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra !== '' ? '  · ' + extra : ''}`);
export const same = (a, b) => {
  try {
    deepStrictEqual(a, b);
    return true;
  } catch {
    return false;
  }
};

export function report() {
  console.log(results.join('\n'));
  const failed = results.filter((line) => line.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed}/${results.length} pruebas OK`);
  process.exitCode = failed ? 1 : 0;
}

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const BASE = `http://127.0.0.1:${server.address().port}/api`;

/** Apaga el servidor de prueba y el pool (al final, después de limpiar la base). */
export async function cerrar() {
  await pool.end();
  server.close();
}

/** Petición a la API → { status, body, headers, ms } */
export async function api(method, path, { token, body, raw, headers = {} } = {}) {
  const t0 = performance.now();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers, ms: performance.now() - t0 };
}

export const CUENTAS = {
  ADMINISTRADOR: ['admin@dentalcare.com', 'Admin2026*'],
  RECEPCIONISTA: ['recepcion@dentalcare.com', 'Recep2026*'],
  ESPECIALISTA: ['dr.roberto@dentalcare.com', 'DocRoberto2026*'],
  PACIENTE: ['andres.galvis@gmail.com', 'AndresG2026*'],
};

/** Inicia sesión en la API → { token, user } */
export const loginAs = async (rol) => (await api('POST', '/auth/login', { body: { email: CUENTAS[rol][0], password: CUENTAS[rol][1] } })).body;

export const isErrorShape = (body) => same(Object.keys(body ?? {}).sort(), ['code', 'fields', 'message', 'status']);

/* ---------- Fechas locales (la zona horaria la fija backend/src/config/env.js) ---------- */
const pad = (n) => String(n).padStart(2, '0');
export const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const sumarDias = (date, dias) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + dias);

/** Primer día de la semana `diaSemana` (0 = domingo … 6 = sábado) a partir de `desde` (incluido). */
export function proximo(diaSemana, desde) {
  let d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  while (d.getDay() !== diaSemana) d = sumarDias(d, 1);
  return d;
}
