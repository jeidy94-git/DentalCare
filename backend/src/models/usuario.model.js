import { pool } from '../config/db.js';

/**
 * Consultas de la tabla `usuario` (con su rol) para la autenticación.
 * Los modelos solo hablan con la base: no validan ni deciden permisos (eso es del controlador).
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
 * Usuario de la sesión: el mismo objeto `user` que arma el mock (auth.service.js → buildUser) más
 * los permisos de su rol, leídos de `rol_permiso` (la matriz corregida en B-03).
 * Se consulta en CADA petición autenticada: si el administrador inactiva la cuenta o el rol, el
 * token deja de servir de inmediato aunque no haya vencido.
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
  const row = rows[0];
  if (!row) return null;

  const base = { id_usuario: row.id_usuario, rol: row.rol, email: row.email };
  const user =
    row.rol === 'PACIENTE'
      ? { ...base, nombre: row.id_paciente ? `${row.paciente_nombres} ${row.paciente_apellidos}` : row.email, cargo: 'Paciente', id_paciente: row.id_paciente }
      : {
          ...base,
          nombre: row.id_personal ? `${row.personal_nombres} ${row.personal_apellidos}` : row.email,
          cargo: row.cargo ?? row.rol,
          id_personal: row.id_personal,
          ...(row.id_especialista && { id_especialista: row.id_especialista }),
        };

  return {
    user,
    activo: row.estado === 'ACTIVO' && row.rol_estado === 'ACTIVO',
    permisos: row.permisos ? row.permisos.split(',') : [],
  };
}
