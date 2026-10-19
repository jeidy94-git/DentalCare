import { pool } from '../config/db.js';

/** Repositorio de `servicio` (catálogo de tratamientos). */

export async function buscarPorId(idServicio) {
  const [rows] = await pool.query('SELECT id_servicio, nombre_servicio, estado FROM servicio WHERE id_servicio = ?', [idServicio]);
  return rows[0] ?? null;
}

/** Catálogo completo o solo lo que se puede agendar (ACTIVO). */
export async function listar({ soloActivos = false } = {}) {
  const [rows] = await pool.query(
    `SELECT id_servicio, codigo_servicio, nombre_servicio, descripcion, precio_base, estado FROM servicio
      ${soloActivos ? "WHERE estado = 'ACTIVO'" : ''} ORDER BY id_servicio`,
  );
  return rows;
}
