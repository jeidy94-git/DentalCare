import mysql from 'mysql2/promise';
import { env } from './env.js';

/**
 * Pool de conexiones a MySQL / MariaDB.
 *
 * Abrir una conexión cuesta (TCP + autenticación). El pool mantiene hasta `connectionLimit` abiertas y
 * las presta a cada petición: `pool.query()` toma una libre, ejecuta y la devuelve sola. Si todas
 * están ocupadas, la petición espera en cola (waitForConnections) en vez de fallar.
 *
 * SIEMPRE consultas parametrizadas: `pool.query('… WHERE id = ?', [id])`. El driver envía el valor
 * aparte del SQL, así un texto como `' OR 1=1 --` es solo un dato y no puede cambiar la consulta
 * (inyección SQL, OWASP A03).
 */
export const pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  queueLimit: 0,
  charset: 'UTF8MB4_GENERAL_CI', // tildes y ñ; la misma intercalación de las tablas
  dateStrings: true, // DATE → '1990-02-14' y DATETIME → '2026-10-19 08:00:00', igual que el mock (sin corrimientos de zona horaria)
  decimalNumbers: true, // DECIMAL (precios, montos) como número y no como texto
});

/**
 * Ejecuta `work(conn)` dentro de una transacción: o se guardan TODOS los cambios o ninguno.
 * Todas las consultas deben usar `conn` (la misma conexión); si alguna falla se hace ROLLBACK
 * y el error sigue hacia el manejador central.
 */
export async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback().catch(() => {}); // si la conexión se cayó, el rollback también falla: el error importante es el original
    throw error;
  } finally {
    conn.release();
  }
}

/** Comprueba que la base responde (arranque del servidor y GET /api/health). */
export async function pingDb() {
  const [[row]] = await pool.query('SELECT VERSION() AS version');
  return row.version;
}
