import app from './app.js';
import { env } from './config/env.js';
import { pool, pingDb } from './config/db.js';

/** Punto de entrada: `npm start` (o `npm run dev`, que reinicia al guardar un archivo). */
const server = app.listen(env.port, async () => {
  console.log(`API DentalCare en http://localhost:${env.port}/api`);
  try {
    console.log(`Base de datos: ${env.db.database} en ${env.db.host}:${env.db.port} (${await pingDb()})`);
  } catch (error) {
    // El servidor sigue arriba y responde 503: así el frontend muestra un mensaje en vez de "sin conexión".
    console.error(`No se pudo conectar a la base ${env.db.database} en ${env.db.host}:${env.db.port}: ${error.code ?? error.message}`);
    console.error('¿Está encendido MySQL/MariaDB (XAMPP) y se importó database/dentalcare_bd_v2.sql?');
  }
});

server.on('error', (error) => {
  console.error(error.code === 'EADDRINUSE' ? `El puerto ${env.port} ya está en uso. Cambia PORT en backend/.env.` : error);
  process.exit(1);
});

/** Ctrl+C: termina las peticiones en curso y cierra las conexiones del pool antes de salir. */
function apagar() {
  server.close(() => pool.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(0), 3000).unref(); // si algo se queda colgado, no esperar para siempre
}
process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
