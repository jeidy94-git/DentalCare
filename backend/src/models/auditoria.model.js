import { pool } from '../config/db.js';

/**
 * Registro en `log_auditoria` (RNF-SEG-02): quién hizo qué, sobre qué tabla y cuándo.
 *
 * `db` es el pool o la conexión de una transacción: si la operación se deshace (ROLLBACK), su
 * registro de auditoría también, y el log nunca cuenta algo que no pasó.
 * `idUsuario` es null cuando no se sabe quién fue (p. ej. un login con un correo que no existe).
 */
export async function registrar({ idUsuario = null, accion, tabla, detalles = null }, db = pool) {
  await db.query('INSERT INTO log_auditoria (id_usuario, accion, tabla_afectada, detalles) VALUES (?, ?, ?, ?)', [idUsuario, accion, tabla, detalles]);
}
