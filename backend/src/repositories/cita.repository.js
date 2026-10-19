import { pool } from '../config/db.js';

/** Repositorio de `cita`: solo SQL parametrizado (las reglas RN-02 están en services/citas.service.js). */

/**
 * Columnas que se devuelven al frontend: las de la tabla más los nombres unidos (JOIN), igual que
 * `withNames` del mock (frontend/js/services/citas.service.js).
 */
const SELECT_CITA = `
  SELECT c.id_cita, c.id_paciente, c.id_especialista, c.id_servicio, c.fecha_hora, c.motivo, c.estado_cita,
         c.recordatorio_enviado, c.mensaje_alerta, c.fecha_creacion,
         CONCAT(pa.nombres, ' ', pa.apellidos) AS paciente_nombre,
         CONCAT(pe.nombres, ' ', pe.apellidos) AS especialista_nombre,
         s.nombre_servicio AS servicio_nombre
    FROM cita c
    JOIN paciente pa ON pa.id_paciente = c.id_paciente
    JOIN especialista e ON e.id_especialista = c.id_especialista
    JOIN personal pe ON pe.id_personal = e.id_personal
    JOIN servicio s ON s.id_servicio = c.id_servicio`;

/** Estados que ocupan la franja y siguen "vivos" (se pueden confirmar, cancelar o completar). */
export const ESTADOS_ACTIVOS = ['PROGRAMADA', 'PENDIENTE_CONFIRMACION'];

/** Filtro de fechas: `desde` y `hasta` son días 'AAAA-MM-DD' y los dos se incluyen completos. */
function rangoFechas(where, params, { desde, hasta }) {
  if (desde) {
    where.push('c.fecha_hora >= ?');
    params.push(desde); // '2026-10-20' se compara como '2026-10-20 00:00:00'
  }
  if (hasta) {
    where.push('c.fecha_hora < DATE_ADD(?, INTERVAL 1 DAY)'); // hasta el último segundo de ese día
    params.push(hasta);
  }
}

/**
 * Listado ordenado por fecha y hora.
 * @param {{ desde?: string, hasta?: string, idEspecialista?: number, idPaciente?: number, estados?: string[] }} filtros
 */
export async function listar({ desde, hasta, idEspecialista, idPaciente, estados } = {}) {
  const where = [];
  const params = [];
  rangoFechas(where, params, { desde, hasta });
  if (idEspecialista !== undefined) {
    where.push('c.id_especialista = ?');
    params.push(idEspecialista);
  }
  if (idPaciente !== undefined) {
    where.push('c.id_paciente = ?');
    params.push(idPaciente);
  }
  if (estados?.length) {
    where.push('c.estado_cita IN (?)'); // mysql2 convierte la lista en ('A', 'B'), cada valor escapado
    params.push(estados);
  }
  // Como en pacientes: solo se concatenan fragmentos FIJOS; los valores van siempre como `?`.
  const [rows] = await pool.query(`${SELECT_CITA} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY c.fecha_hora, c.id_cita`, params);
  return rows;
}

export async function buscarPorId(idCita, db = pool) {
  const [rows] = await db.query(`${SELECT_CITA} WHERE c.id_cita = ?`, [idCita]);
  return rows[0] ?? null;
}

/**
 * Franjas ocupadas para el asistente de agendamiento: SOLO odontólogo, fecha y estado. No trae
 * paciente, motivo ni tratamiento (minimización de datos, Ley 1581 de 2012): cualquier rol, incluso
 * un paciente, puede ver qué horas están tomadas sin saber por quién.
 */
export async function ocupacion({ desde, hasta } = {}) {
  const where = ['c.estado_cita IN (?)'];
  const params = [ESTADOS_ACTIVOS];
  rangoFechas(where, params, { desde, hasta });
  const [rows] = await pool.query(`SELECT c.id_especialista, c.fecha_hora, c.estado_cita FROM cita c WHERE ${where.join(' AND ')} ORDER BY c.fecha_hora, c.id_cita`, params);
  return rows;
}

/**
 * Horas ('HH:MM') que un odontólogo ya tiene tomadas en un día. Cuenta todo lo que no está
 * CANCELADO (igual que la agenda del frontend): una cita completada también usó esa franja.
 * Se llama dentro de la transacción del agendamiento, después de `bloquear` al odontólogo.
 */
export async function horasOcupadas(conn, idEspecialista, fecha) {
  const [rows] = await conn.query(
    `SELECT DATE_FORMAT(fecha_hora, '%H:%i') AS hora FROM cita
      WHERE id_especialista = ? AND estado_cita <> 'CANCELADA'
        AND fecha_hora >= ? AND fecha_hora < DATE_ADD(?, INTERVAL 1 DAY)`,
    [idEspecialista, fecha, fecha],
  );
  return rows.map((row) => row.hora);
}

/** ¿El paciente ya tiene otra cita activa a esa misma hora (con cualquier odontólogo)? */
export async function pacienteOcupado(conn, idPaciente, fechaHora) {
  const [[row]] = await conn.query('SELECT EXISTS(SELECT 1 FROM cita WHERE id_paciente = ? AND estado_cita IN (?) AND fecha_hora = ?) AS ocupado', [
    idPaciente,
    ESTADOS_ACTIVOS,
    fechaHora,
  ]);
  return Boolean(row.ocupado);
}

/** @returns {Promise<number>} id_cita nuevo */
export async function crear(conn, { id_paciente, id_especialista, id_servicio, fecha_hora, motivo, estado_cita }) {
  const [result] = await conn.query(
    'INSERT INTO cita (id_paciente, id_especialista, id_servicio, fecha_hora, motivo, estado_cita) VALUES (?, ?, ?, ?, ?, ?)',
    [id_paciente, id_especialista, id_servicio, fecha_hora, motivo, estado_cita],
  );
  return result.insertId;
}

/**
 * Lee la cita BLOQUEANDO su fila (FOR UPDATE) hasta el fin de la transacción: si dos personas
 * cambian el estado de la misma cita a la vez, la segunda espera y ve el estado que dejó la primera.
 */
export async function bloquearParaEstado(conn, idCita) {
  const [rows] = await conn.query('SELECT id_cita, id_paciente, id_especialista, estado_cita FROM cita WHERE id_cita = ? FOR UPDATE', [idCita]);
  return rows[0] ?? null;
}

export async function actualizarEstado(conn, idCita, estado) {
  await conn.query('UPDATE cita SET estado_cita = ? WHERE id_cita = ?', [estado, idCita]);
}
