import { pool } from '../config/db.js';

/** Repositorio de `especialista` y de su `horario` (lo que necesita la agenda). */

/**
 * Odontólogos con los datos de su ficha de personal y el estado de su cuenta, como `especialistaConNombre`
 * del mock (frontend/js/services/mock/db.js).
 */
export async function listar() {
  const [rows] = await pool.query(
    `SELECT e.id_especialista, e.id_personal, e.especialidad, e.registro_medico,
            CONCAT(pe.nombres, ' ', pe.apellidos) AS nombre, pe.nombres, pe.apellidos, pe.telefono, u.estado
       FROM especialista e
       JOIN personal pe ON pe.id_personal = e.id_personal
       JOIN usuario u ON u.id_usuario = pe.id_usuario
      ORDER BY e.id_especialista`,
  );
  return rows;
}

/** Todos los rangos de atención (la agenda los agrupa por odontólogo). */
export async function horarios() {
  const [rows] = await pool.query('SELECT id_horario, id_especialista, dia_semana, hora_inicio, hora_fin FROM horario ORDER BY id_horario');
  return rows;
}

/** Odontólogo con su nombre y el estado de su cuenta (una cuenta INACTIVA no recibe citas). */
export async function buscarPorId(idEspecialista) {
  const [rows] = await pool.query(
    `SELECT e.id_especialista, CONCAT(pe.nombres, ' ', pe.apellidos) AS nombre, u.estado
       FROM especialista e
       JOIN personal pe ON pe.id_personal = e.id_personal
       JOIN usuario u ON u.id_usuario = pe.id_usuario
      WHERE e.id_especialista = ?`,
    [idEspecialista],
  );
  return rows[0] ?? null;
}

/**
 * Rangos de atención de un odontólogo en un día de la semana ('Lunes'…'Domingo', los valores del
 * CHECK chk_horario_dia), ordenados por hora de inicio.
 */
export async function horariosDelDia(idEspecialista, diaSemana, db = pool) {
  const [rows] = await db.query(
    `SELECT hora_inicio, hora_fin FROM horario
      WHERE id_especialista = ? AND dia_semana = ?
      ORDER BY hora_inicio`,
    [idEspecialista, diaSemana],
  );
  return rows;
}

/**
 * Bloquea la fila del odontólogo hasta el fin de la transacción (SELECT … FOR UPDATE): si otra
 * petición quiere agendar con el MISMO odontólogo, espera aquí a que esta termine. Así dos personas
 * no pueden tomar la misma franja al mismo tiempo.
 */
export async function bloquear(conn, idEspecialista) {
  await conn.query('SELECT id_especialista FROM especialista WHERE id_especialista = ? FOR UPDATE', [idEspecialista]);
}
