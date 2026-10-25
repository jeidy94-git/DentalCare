import { pool } from '../config/db.js';

/**
 * Repositorio de `usuario` (con su rol, su ficha de personal o de paciente y sus permisos).
 * Un repositorio SOLO habla con la base: no valida, no decide permisos y no arma respuestas
 * (eso es de services/auth.service.js).
 */

/** Cuenta para el login, incluido el hash. Solo esta y buscarHash (cambio de contraseña) leen `password_hash`. */
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

/* ---------- Perfil propio (GET/PUT /api/auth/perfil, PUT /api/auth/password) ---------- */

/** Identidad y contacto de la cuenta: la ficha es la de personal o la de paciente, según el rol. */
export async function buscarPerfil(idUsuario) {
  const [rows] = await pool.query(
    `SELECT u.id_usuario, u.email, r.nombre_rol AS rol,
            COALESCE(pa.nombres, pe.nombres) AS nombres, COALESCE(pa.apellidos, pe.apellidos) AS apellidos,
            COALESCE(pa.tipo_documento, pe.tipo_documento) AS tipo_documento,
            COALESCE(pa.numero_documento, pe.numero_documento) AS numero_documento,
            COALESCE(pa.telefono, pe.telefono) AS telefono,
            pa.id_paciente, pa.direccion
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
       LEFT JOIN personal pe ON pe.id_usuario = u.id_usuario
       LEFT JOIN paciente pa ON pa.id_usuario = u.id_usuario
      WHERE u.id_usuario = ?`,
    [idUsuario],
  );
  return rows[0] ?? null;
}

/** ¿Otra cuenta (o, si es paciente, otra ficha de paciente) ya usa ese correo? */
export async function correoEnUso(email, idUsuario) {
  const [rows] = await pool.query(
    `SELECT 1 FROM usuario WHERE email = ? AND id_usuario <> ?
     UNION ALL
     SELECT 1 FROM paciente WHERE email = ? AND (id_usuario IS NULL OR id_usuario <> ?)
     LIMIT 1`,
    [email, idUsuario, email, idUsuario],
  );
  return rows.length > 0;
}

/**
 * Datos de contacto propios: el correo de la cuenta y el celular de su ficha. El paciente además
 * guarda la dirección y el correo en su ficha (`personal` no tiene dirección). Va en una transacción.
 */
export async function actualizarContacto(conn, { idUsuario, esPaciente, email, telefono, direccion }) {
  await conn.query('UPDATE usuario SET email = ? WHERE id_usuario = ?', [email, idUsuario]);
  if (esPaciente) {
    await conn.query('UPDATE paciente SET telefono = ?, email = ?, direccion = ? WHERE id_usuario = ?', [telefono, email, direccion, idUsuario]);
  } else {
    await conn.query('UPDATE personal SET telefono = ? WHERE id_usuario = ?', [telefono, idUsuario]);
  }
}

/** Hash actual de la cuenta (solo para comprobar la contraseña actual al cambiarla). */
export async function buscarHash(idUsuario) {
  const [rows] = await pool.query('SELECT password_hash FROM usuario WHERE id_usuario = ?', [idUsuario]);
  return rows[0]?.password_hash ?? null;
}

export async function actualizarPassword(idUsuario, passwordHash) {
  await pool.query('UPDATE usuario SET password_hash = ? WHERE id_usuario = ?', [passwordHash, idUsuario]);
}
