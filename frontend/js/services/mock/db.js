import { storage } from '../../core/storage.js';
import { MOCK_LATENCY } from '../../core/config.js';
import { getSession, handleUnauthorized } from '../../core/session.js';
import { can, PERMISOS } from '../../core/permissions.js';
import { ApiError } from '../api-error.js';
import { ROLES_SEED, PERMISOS_SEED, USUARIOS_SEED } from '../../data/mock/seguridad.js';
import { PACIENTES } from '../../data/mock/pacientes.js';
import { PERSONAL, ESPECIALISTAS, HORARIOS } from '../../data/mock/especialistas.js';
import { SERVICIOS } from '../../data/mock/servicios.js';
import { CITAS } from '../../data/mock/citas.js';
import { HISTORIAS } from '../../data/mock/historias.js';
import { CONSULTAS } from '../../data/mock/consultas.js';
import { ODONTOGRAMA } from '../../data/mock/odontograma.js';
import { METODOS_PAGO, VENTAS, PAGOS_VENTA } from '../../data/mock/ventas.js';
import { NOVEDADES } from '../../data/mock/novedades.js';

/**
 * Base de datos simulada: las mismas tablas de dentalcare_bd, guardadas como UN objeto JSON en
 * localStorage ("dentalcare:db"). Así lo que se agenda, registra o paga sobrevive a recargas y es
 * visible en todas las pantallas (y pestañas).
 *
 * Solo los servicios mock importan este archivo. Las páginas NUNCA lo usan directamente.
 */

const DB_KEY = 'db';
/** Subir este número cuando cambie la forma de las tablas: los datos viejos se descartan y se re-siembran. */
export const DB_VERSION = 1;

function seed() {
  return structuredClone({
    version: DB_VERSION,
    seededAt: new Date().toISOString(),
    rol: ROLES_SEED,
    permiso: PERMISOS_SEED,
    usuario: USUARIOS_SEED,
    personal: PERSONAL,
    // ESPECIALISTAS trae `nombre` y `telefono` unidos (JOIN); en la tabla solo van las columnas propias.
    especialista: ESPECIALISTAS.map(({ id_especialista, id_personal, especialidad, registro_medico }) => ({ id_especialista, id_personal, especialidad, registro_medico })),
    horario: HORARIOS,
    paciente: PACIENTES,
    historia_clinica: HISTORIAS,
    consulta: CONSULTAS,
    odontograma: ODONTOGRAMA,
    servicio: SERVICIOS,
    cita: CITAS,
    metodo_pago: METODOS_PAGO,
    venta: VENTAS,
    pago_venta: PAGOS_VENTA,
    novedad_operativa: NOVEDADES,
    log_auditoria: [],
    // No existe en la BD: tokens de recuperación de contraseña (HU-01). Se agrega en la Fase B.
    password_reset: [],
  });
}

let cache = null;
let watching = false;

/** Tablas en memoria (se cargan de localStorage la primera vez, o se siembran desde los mocks). */
export function getDb() {
  if (!cache) {
    const stored = storage.get(DB_KEY);
    if (stored?.version === DB_VERSION) {
      cache = stored;
    } else {
      cache = seed();
      persist();
    }
  }
  if (!watching) {
    // Otra pestaña guardó cambios: se descarta la copia en memoria y se relee en la próxima petición.
    storage.onChange(DB_KEY, () => (cache = null));
    watching = true;
  }
  return cache;
}

function persist() {
  try {
    storage.set(DB_KEY, cache);
  } catch {
    throw new ApiError(507, 'El almacenamiento del navegador está lleno. Restablece los datos de demostración.', { code: 'STORAGE_FULL' });
  }
}

/** Vuelve a los datos semilla (botón "Restablecer datos de demostración" y pruebas). */
export function resetDb() {
  cache = seed();
  persist();
}

/* ------------------------------------------------------------------ */
/* Latencia simulada                                                   */
/* ------------------------------------------------------------------ */
let latency = { ...MOCK_LATENCY };

/** Las pruebas automáticas usan setMockLatency(0) para no esperar. */
export function setMockLatency(min, max = min) {
  latency = { min, max };
}

const networkDelay = () => new Promise((resolve) => setTimeout(resolve, latency.min + Math.random() * (latency.max - latency.min)));

/* ------------------------------------------------------------------ */
/* "Petición" simulada                                                 */
/* ------------------------------------------------------------------ */

/**
 * Ejecuta una operación del mock como si fuera una petición HTTP al backend:
 *  1. espera la latencia de red (150–300 ms);
 *  2. autentica (401 si no hay sesión) y autoriza (403 si el rol no tiene el permiso);
 *  3. ejecuta el handler, que lee/modifica las tablas y puede lanzar ApiError (400, 404, 409…);
 *  4. si escribió y todo salió bien → guarda en localStorage (commit);
 *     si falló → descarta la copia en memoria (rollback): lo guardado sigue intacto;
 *  5. devuelve una COPIA (structuredClone): quien llama no puede modificar la "base de datos" por
 *     referencia, igual que con datos que llegan por la red.
 *
 * @param {(ctx: {db: object, user: object|null}) => any} handler
 * @param {{auth?: boolean, permiso?: string, write?: boolean}} [options]
 */
export async function mockRequest(handler, { auth = true, permiso, write = false } = {}) {
  await networkDelay();

  let user = null;
  if (auth) {
    const session = getSession();
    if (!session) {
      handleUnauthorized();
      throw new ApiError(401, 'Tu sesión terminó. Ingresa de nuevo.', { code: 'UNAUTHORIZED' });
    }
    user = session.user;
    if (permiso && !can(user, permiso)) throw new ApiError(403, 'No tienes permiso para realizar esta acción.', { code: 'FORBIDDEN' });
  }

  const db = getDb();
  try {
    const result = await handler({ db, user });
    if (write) persist();
    return result === undefined ? null : structuredClone(result);
  } catch (error) {
    if (write) cache = null;
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Utilidades para los servicios mock                                  */
/* ------------------------------------------------------------------ */
const pad = (n) => String(n).padStart(2, '0');

/** Fecha y hora local en formato DATETIME de MySQL: '2026-10-19 14:05:00'. */
export function nowSql(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Siguiente id (equivale a AUTO_INCREMENT). */
export const nextId = (rows, key) => rows.reduce((max, row) => Math.max(max, row[key]), 0) + 1;

/** Busca por id o lanza 404. */
export function findOr404(rows, key, id, label) {
  const row = rows.find((r) => r[key] === Number(id));
  if (!row) throw new ApiError(404, `${label} no existe.`, { code: 'NOT_FOUND' });
  return row;
}

/** Lanza 400 con errores por campo si alguno de los validadores falló. */
export function assertValid(data, rules) {
  const fields = {};
  for (const [field, validate] of Object.entries(rules)) {
    const message = validate(data[field]);
    if (message) fields[field] = message;
  }
  if (Object.keys(fields).length) throw new ApiError(400, 'Revisa los datos marcados.', { fields, code: 'VALIDATION' });
}

/** Copia solo las columnas permitidas (evita que el cliente escriba campos como id o estado a su antojo). */
export function pick(data = {}, keys) {
  return Object.fromEntries(keys.filter((key) => data[key] !== undefined).map((key) => [key, typeof data[key] === 'string' ? data[key].trim() : data[key]]));
}

/** Registra la operación en `log_auditoria` (tabla del seed; RNF-SEG-02). */
export function audit(db, user, accion, tabla, detalles = '') {
  db.log_auditoria.push({ id_log: nextId(db.log_auditoria, 'id_log'), id_usuario: user?.id_usuario ?? null, accion, tabla_afectada: tabla, detalles, fecha_evento: nowSql() });
  // localStorage tiene ~5 MB: en el mock solo se conservan los últimos registros.
  if (db.log_auditoria.length > MAX_AUDIT) db.log_auditoria.splice(0, db.log_auditoria.length - MAX_AUDIT);
}

const MAX_AUDIT = 300;

/* ---------- "JOIN" con las tablas relacionadas (lo que haría el SELECT del backend) ---------- */
export function nombrePacienteDb(db, idPaciente) {
  const p = db.paciente.find((x) => x.id_paciente === idPaciente);
  return p ? `${p.nombres} ${p.apellidos}` : '—';
}

export function especialistaConNombre(db, especialista) {
  const p = db.personal.find((x) => x.id_personal === especialista.id_personal);
  const usuario = db.usuario.find((u) => u.id_usuario === p?.id_usuario);
  return { ...especialista, nombre: p ? `${p.nombres} ${p.apellidos}` : '—', nombres: p?.nombres ?? null, apellidos: p?.apellidos ?? null, telefono: p?.telefono ?? null, estado: usuario?.estado ?? 'ACTIVO' };
}

export function nombreEspecialistaDb(db, idEspecialista) {
  const e = db.especialista.find((x) => x.id_especialista === idEspecialista);
  return e ? especialistaConNombre(db, e).nombre : '—';
}

/** El paciente solo puede tocar SUS datos: 403 si intenta ver o cambiar los de otro. */
export function assertOwnPaciente(user, idPaciente) {
  if (user?.rol === 'PACIENTE' && user.id_paciente !== Number(idPaciente)) throw forbidden('Solo puedes consultar tu propia información.');
}

export const forbidden = (message = 'No tienes permiso para realizar esta acción.') => new ApiError(403, message, { code: 'FORBIDDEN' });

/* ---------- Reglas de la historia clínica (compartidas por historias y odontograma) ---------- */

/** Leer: quien tiene VER_HISTORIA_CLINICA, o el propio paciente. */
export function assertCanReadHistoria(user, idPaciente) {
  if (user.rol === 'PACIENTE') return assertOwnPaciente(user, idPaciente);
  if (!can(user, PERMISOS.VER_HISTORIA_CLINICA)) throw forbidden('No tienes permiso para ver historias clínicas.');
}

/**
 * RN-01: solo el Doctor ASIGNADO o el Administrador editan la historia.
 * "Asignado" = el odontólogo tiene (o tuvo) una cita no cancelada con el paciente.
 */
export function assertRN01(db, user, idPaciente) {
  if (user.rol === 'ADMINISTRADOR') return;
  const asignado =
    user.rol === 'ESPECIALISTA' &&
    db.cita.some((c) => c.id_paciente === Number(idPaciente) && c.id_especialista === user.id_especialista && c.estado_cita !== 'CANCELADA');
  if (!asignado) throw forbidden('Solo el odontólogo asignado o el administrador pueden editar esta historia clínica (RN-01).');
}

export function historiaDe(db, idPaciente) {
  const historia = db.historia_clinica.find((hc) => hc.id_paciente === Number(idPaciente));
  if (!historia) throw new ApiError(404, 'El paciente no tiene historia clínica.', { code: 'NOT_FOUND' });
  return historia;
}
