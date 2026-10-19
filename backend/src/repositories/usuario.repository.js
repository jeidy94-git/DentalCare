import { pool } from '../config/db.js';

/**
 * Repositorio de `usuario` (con su rol, su ficha de personal o de paciente y sus permisos).
 * Un repositorio SOLO habla con la base: no valida, no decide permisos y no arma respuestas
 * (eso es de services/auth.service.js).
 */

/** Cuenta para el login, incluido el hash. Es la ÚNICA consulta que lee `password_hash`. */
export async function buscarPorEmail(email) {
  const [rows] = await pool.query(
    `SELECT u.id_usuario, u.password_hash, u.estado, r.estado AS rol_estado
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
      WHERE u.email = ?`,
    [email],
  );
  return rows[0] ?? null;
}

/**
 * Datos de la sesión de un usuario: cuenta, rol, ficha (personal o paciente) y los permisos de su
 * rol, leídos de `rol_permiso` (la matriz corregida en B-03). Devuelve la fila tal cual o null.
 */
export async function buscarSesion(idUsuario) {
  const [rows] = await pool.query(
    `SELECT u.id_usuario, u.email, u.estado, r.nombre_rol AS rol, r.estado AS rol_estado,
            pe.id_personal, pe.nombres AS personal_nombres, pe.apellidos AS personal_apellidos, pe.cargo,
            es.id_especialista,
            pa.id_paciente, pa.nombres AS paciente_nombres, pa.apellidos AS paciente_apellidos,
            (SELECT GROUP_CONCAT(p.nombre_permiso ORDER BY p.nombre_permiso)
               FROM rol_permiso rp
               JOIN permiso p ON p.id_permiso = rp.id_permiso
              WHERE rp.id_rol = u.id_rol) AS permisos
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
       LEFT JOIN personal pe ON pe.id_usuario = u.id_usuario
       LEFT JOIN especialista es ON es.id_personal = pe.id_personal
       LEFT JOIN paciente pa ON pa.id_usuario = u.id_usuario
      WHERE u.id_usuario = ?`,
    [idUsuario],
  );
  return rows[0] ?? null;
}
