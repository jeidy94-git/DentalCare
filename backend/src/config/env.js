import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

/**
 * Variables de entorno (archivo backend/.env, que NO se sube a git; la plantilla es .env.example).
 *
 * Las credenciales y el secreto del JWT nunca van en el código: cambian entre equipos (el XAMPP de
 * cada aprendiz, el servidor de producción) y quien lea el repositorio no debe conocerlos.
 * Si falta algo indispensable el servidor NO arranca: es mejor un error claro al iniciar que un
 * login que falla a medianoche.
 */

// Ruta absoluta: funciona igual con `npm start` desde backend/ que con `node backend/src/server.js` desde la raíz.
// Las variables ya definidas en el sistema tienen prioridad (así las pruebas apuntan a otra base sin editar .env).
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

/*
 * Zona horaria del consultorio. La agenda decide qué franjas "ya pasaron" con la hora del servidor:
 * si el servidor estuviera en UTC (lo normal en la nube), a las 7 p. m. de Bogotá ya sería "mañana"
 * y se bloquearían citas válidas. Node aplica el cambio de TZ apenas se asigna.
 */
process.env.TZ = process.env.TZ?.trim() || 'America/Bogota';

function required(name) {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') throw new Error(`Falta la variable de entorno ${name}. Copia backend/.env.example como backend/.env y complétala.`);
  return value.trim();
}

function integer(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`La variable ${name} debe ser un entero positivo (valor actual: "${raw}").`);
  return value;
}

const jwtSecret = required('JWT_SECRET');
// Con HS256 el secreto es la llave que firma TODOS los tokens: uno corto se adivina por fuerza bruta.
if (jwtSecret.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres (genera uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))").');

export const env = Object.freeze({
  port: integer('PORT', 3000),
  timeZone: process.env.TZ,
  db: Object.freeze({
    host: process.env.DB_HOST?.trim() || '127.0.0.1',
    port: integer('DB_PORT', 3306),
    user: required('DB_USER'),
    password: process.env.DB_PASSWORD ?? '', // XAMPP trae root sin contraseña: vacío es válido
    database: required('DB_NAME'),
    connectionLimit: integer('DB_CONNECTION_LIMIT', 10),
  }),
  jwt: Object.freeze({
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN?.trim() || '8h', // una jornada, igual que SESSION_TTL_MS del frontend
  }),
  /** Orígenes (protocolo + host + puerto) desde los que el navegador puede llamar a la API. */
  corsOrigins: (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
});
