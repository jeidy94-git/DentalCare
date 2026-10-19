import { pool } from '../config/db.js';

/** Repositorio de `paciente`: solo SQL parametrizado (las reglas están en services/pacientes.service.js). */

/** Columnas que el cliente puede enviar al crear (las demás las pone la base o el servidor). */
export const CAMPOS = ['tipo_documento', 'numero_documento', 'nombres', 'apellidos', 'fecha_nacimiento', 'genero', 'telefono', 'email', 'departamento', 'municipio', 'direccion', 'eps_aseguradora'];

/** Columnas que se devuelven al frontend: las mismas del mock (frontend/js/data/mock/pacientes.js). */
const COLUMNAS = `id_paciente, id_usuario, tipo_documento, numero_documento, nombres, apellidos, fecha_nacimiento, genero,
                  telefono, email, departamento, municipio, direccion, eps_aseguradora, fecha_registro`;

/** En LIKE, % y _ son comodines: si el usuario busca "50%" se escapan para que valgan como texto. */
const escaparLike = (texto) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Listado ordenado por apellidos y nombres.
 * @param {{ q?: string, idPaciente?: number }} filtros
 *   q           texto en nombres, apellidos, documento o correo. La intercalación utf8mb4_general_ci de
 *               la tabla ignora mayúsculas y tildes: "londono" encuentra "Londoño", como el mock.
 *   idPaciente  solo ese paciente (el rol PACIENTE se ve únicamente a sí mismo).
 */
export async function listar({ q, idPaciente } = {}) {
  const where = [];
  const params = [];
  if (idPaciente !== undefined) {
    where.push('id_paciente = ?');
    params.push(idPaciente);
  }
  if (q) {
    where.push(`CONCAT_WS(' ', nombres, apellidos, numero_documento, IFNULL(email, '')) LIKE ?`);
    params.push(`%${escaparLike(q)}%`);
  }
  // Solo se concatenan textos FIJOS escritos aquí; los valores del usuario van siempre como `?`.
  const [rows] = await pool.query(`SELECT ${COLUMNAS} FROM paciente ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY apellidos, nombres`, params);
  return rows;
}

/** `db` es el pool o la conexión de una transacción (`conn`), para leer lo que esa transacción escribió. */
export async function buscarPorId(idPaciente, db = pool) {
  const [rows] = await db.query(`SELECT ${COLUMNAS} FROM paciente WHERE id_paciente = ?`, [idPaciente]);
  return rows[0] ?? null;
}

/** ¿Qué datos únicos ya están tomados? → { documento: bool, email: bool } */
export async function duplicados({ numero_documento, email }) {
  const [[row]] = await pool.query(
    `SELECT EXISTS(SELECT 1 FROM paciente WHERE numero_documento = ?) AS documento,
            EXISTS(SELECT 1 FROM paciente WHERE ? IS NOT NULL AND email = ?) AS email`,
    [numero_documento, email, email],
  );
  return { documento: Boolean(row.documento), email: Boolean(row.email) };
}

/**
 * Inserta el paciente y abre su historia clínica vacía. El servicio lo llama dentro de una
 * transacción (`conn`): un paciente sin historia sería un dato a medias.
 * @returns {Promise<number>} id_paciente nuevo
 */
export async function crear(conn, datos) {
  const [result] = await conn.query(
    `INSERT INTO paciente (${CAMPOS.join(', ')}) VALUES (${CAMPOS.map(() => '?').join(', ')})`,
    CAMPOS.map((campo) => datos[campo] ?? null),
  );
  await conn.query(`INSERT INTO historia_clinica (id_paciente, observaciones) VALUES (?, 'Historia clínica aperturada en sistema')`, [result.insertId]);
  return result.insertId;
}

/**
 * Bloquea la fila del paciente hasta el fin de la transacción (SELECT … FOR UPDATE).
 * Lo usa el agendamiento para que dos citas simultáneas del MISMO paciente se revisen en fila.
 */
export async function bloquear(conn, idPaciente) {
  await conn.query('SELECT id_paciente FROM paciente WHERE id_paciente = ? FOR UPDATE', [idPaciente]);
}
