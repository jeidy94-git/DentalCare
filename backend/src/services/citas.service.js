import { withTransaction } from '../config/db.js';
import { ApiError, forbidden, noExiste } from '../utils/api-error.js';
import { PERMISOS, puede } from '../utils/permisos.js';
import { validar, reglas, pick, aId, normalizarFechaHora } from '../utils/validators.js';
import { diaSemana, franjasDelDia } from './agenda.js';
import * as citaRepo from '../repositories/cita.repository.js';
import * as pacienteRepo from '../repositories/paciente.repository.js';
import * as especialistaRepo from '../repositories/especialista.repository.js';
import * as servicioRepo from '../repositories/servicio.repository.js';
import * as auditoria from '../repositories/auditoria.repository.js';

/**
 * Citas (RF-CIT-01…07, HU-05, HU-06, RN-02). Mismo contrato que el mock de
 * frontend/js/services/citas.service.js: mismas validaciones, mismos códigos de error y mismo formato.
 * `sesion` es { user, permisos } del usuario que hace la petición (lo deja verifyToken).
 *
 * Las citas no se eliminan: se CANCELAN (queda la traza de lo que pasó).
 */

const ESTADOS = ['PENDIENTE_CONFIRMACION', 'PROGRAMADA', 'COMPLETADA', 'CANCELADA'];

/** Máquina de estados: desde qué estado se puede pasar a cuál (la misma del mock). */
const TRANSICIONES = {
  PENDIENTE_CONFIRMACION: ['PROGRAMADA', 'CANCELADA'],
  PROGRAMADA: ['COMPLETADA', 'CANCELADA'],
  COMPLETADA: [],
  CANCELADA: [],
};

const CAMPOS = ['id_paciente', 'id_especialista', 'id_servicio', 'fecha_hora', 'motivo'];

const REGLAS = {
  id_paciente: [reglas.requerido('Selecciona el paciente.'), reglas.id()],
  id_especialista: [reglas.requerido('Selecciona el odontólogo.'), reglas.id()],
  id_servicio: [reglas.requerido('Selecciona el tratamiento.'), reglas.id()],
  fecha_hora: [reglas.requerido('Selecciona la fecha y la hora.'), reglas.texto(19), reglas.fechaHora()],
  motivo: [reglas.requerido('Escribe el motivo de la cita.'), reglas.texto(255)],
};

/* ------------------------------------------------------------------ */
/* Filtros de la URL                                                   */
/* ------------------------------------------------------------------ */

const REGLAS_RANGO = {
  desde: [reglas.texto(10), reglas.fecha()],
  hasta: [reglas.texto(10), reglas.fecha()],
};

/** desde/hasta válidos y en orden (los dos son opcionales). */
const errorRango = ({ desde, hasta }, fields) => (!fields.desde && !fields.hasta && desde && hasta && hasta < desde ? { hasta: 'La fecha final no puede ser anterior a la inicial.' } : {});

/** Ya validados: '' cuenta como "sin filtro". */
const rango = (query) => ({ desde: query.desde?.trim() || undefined, hasta: query.hasta?.trim() || undefined });

/**
 * `estado` puede llegar como 'PROGRAMADA', como 'PROGRAMADA,PENDIENTE_CONFIRMACION' (así lo envía
 * http.js con una lista) o repetido (?estado=A&estado=B). Todo se vuelve una lista de valores válidos.
 */
function leerEstados(valor) {
  if (valor === undefined) return { estados: undefined };
  const estados = [].concat(valor).flatMap((v) => String(v).split(',')).map((v) => v.trim()).filter(Boolean);
  return { estados, error: estados.some((e) => !ESTADOS.includes(e)) ? 'Estado no válido.' : null };
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

/**
 * Listado con filtros: desde, hasta, id_especialista, id_paciente, estado.
 *   - PACIENTE: solo sus citas (el id_paciente de la URL se ignora).
 *   - Personal con CREAR_CITA, VER_HISTORIA_CLINICA o GESTIONAR_PACIENTES: todas.
 */
export async function listar(sesion, query = {}) {
  const { estados, error } = leerEstados(query.estado);
  validar(query, { ...REGLAS_RANGO, id_especialista: [reglas.id()], id_paciente: [reglas.id()] }, (data, fields) => ({
    ...errorRango(data, fields),
    ...(error && { estado: error }),
  }));

  const filtros = {
    ...rango(query),
    idEspecialista: aId(query.id_especialista) ?? undefined,
    idPaciente: aId(query.id_paciente) ?? undefined,
    estados,
  };

  if (sesion.user.rol === 'PACIENTE') filtros.idPaciente = sesion.user.id_paciente ?? 0;
  else if (!puede(sesion, PERMISOS.CREAR_CITA, PERMISOS.VER_HISTORIA_CLINICA, PERMISOS.GESTIONAR_PACIENTES)) throw forbidden();

  return citaRepo.listar(filtros);
}

/** Franjas ocupadas (sin datos del paciente) para el asistente de agendamiento. */
export async function ocupacion(query = {}) {
  validar(query, REGLAS_RANGO, errorRango);
  return citaRepo.ocupacion(rango(query));
}

/* ------------------------------------------------------------------ */
/* Agendar (RN-02)                                                     */
/* ------------------------------------------------------------------ */

/** Paciente, odontólogo y tratamiento existen y pueden recibir la cita (mismo orden que el mock). */
async function verificarReferencias({ id_paciente, id_especialista, id_servicio }) {
  if (!(await pacienteRepo.buscarPorId(id_paciente))) throw noExiste('El paciente');

  const especialista = await especialistaRepo.buscarPorId(id_especialista);
  if (!especialista) throw noExiste('El odontólogo');
  if (especialista.estado !== 'ACTIVO') throw new ApiError(422, 'Ese odontólogo no está disponible.', { code: 'INACTIVE_SPECIALIST', fields: { id_especialista: 'Elige otro odontólogo.' } });

  const servicio = await servicioRepo.buscarPorId(id_servicio);
  if (!servicio) throw noExiste('El tratamiento');
  if (servicio.estado !== 'ACTIVO') throw new ApiError(422, 'Ese tratamiento no está disponible.', { code: 'INACTIVE_SERVICE' });
}

/**
 * RN-02 y choques. Corre DENTRO de la transacción, después de bloquear al odontólogo y al paciente,
 * para que nadie tome la franja entre la revisión y el INSERT.
 */
async function verificarFranja(conn, { id_paciente, id_especialista, fecha_hora }) {
  const fecha = fecha_hora.slice(0, 10);
  const inicio = fecha_hora.slice(11, 16);
  const horarios = await especialistaRepo.horariosDelDia(id_especialista, diaSemana(fecha), conn);
  const ocupadas = await citaRepo.horasOcupadas(conn, id_especialista, fecha);
  const franja = franjasDelDia({ fecha, horarios, ocupadas }).find((f) => f.inicio === inicio);

  // Sin franja = el odontólogo no atiende ese día, la hora cae fuera de sus rangos o no es :00/:30.
  if (!franja || franja.estado === 'fuera_de_horario') {
    throw new ApiError(422, 'El odontólogo no tiene horario configurado en ese rango (RN-02).', { code: 'NO_SCHEDULE', fields: { fecha_hora: 'Fuera del horario del odontólogo.' } });
  }
  if (franja.estado === 'pasada') throw new ApiError(422, 'No se pueden agendar citas en horas pasadas.', { code: 'PAST_SLOT', fields: { fecha_hora: 'Esa hora ya pasó.' } });
  if (franja.estado === 'ocupada') throw new ApiError(409, 'Esa franja ya está ocupada.', { code: 'SLOT_TAKEN', fields: { fecha_hora: 'Franja ocupada. Elige otra.' } });

  if (await citaRepo.pacienteOcupado(conn, id_paciente, fecha_hora)) throw new ApiError(409, 'El paciente ya tiene otra cita a esa hora.', { code: 'PATIENT_BUSY' });
}

/**
 * Agenda una cita. El PACIENTE solo agenda para sí mismo y su solicitud queda en
 * PENDIENTE_CONFIRMACION hasta que recepción la confirme (HU-06); el personal la crea PROGRAMADA.
 */
export async function agendar(sesion, body) {
  const datos = pick(body, CAMPOS);
  if (sesion.user.rol === 'PACIENTE') {
    if (!sesion.user.id_paciente) throw forbidden('Tu cuenta no tiene una ficha de paciente asociada.');
    datos.id_paciente = sesion.user.id_paciente; // lo que haya enviado se ignora
  }
  validar(datos, REGLAS);

  const cita = {
    id_paciente: aId(datos.id_paciente),
    id_especialista: aId(datos.id_especialista),
    id_servicio: aId(datos.id_servicio),
    fecha_hora: normalizarFechaHora(datos.fecha_hora),
    motivo: datos.motivo,
    estado_cita: sesion.user.rol === 'PACIENTE' ? 'PENDIENTE_CONFIRMACION' : 'PROGRAMADA',
  };
  await verificarReferencias(cita);

  return withTransaction(async (conn) => {
    // Primero los bloqueos, en el MISMO orden siempre (odontólogo y luego paciente): si cada petición
    // bloqueara en otro orden, dos podrían esperarse mutuamente (deadlock).
    await especialistaRepo.bloquear(conn, cita.id_especialista);
    await pacienteRepo.bloquear(conn, cita.id_paciente);
    await verificarFranja(conn, cita);

    const id = await citaRepo.crear(conn, cita);
    await auditoria.registrar(
      { idUsuario: sesion.user.id_usuario, accion: 'CREAR', tabla: 'cita', detalles: `Cita #${id} ${cita.fecha_hora} · paciente #${cita.id_paciente} · odontólogo #${cita.id_especialista} · ${cita.estado_cita}` },
      conn,
    );
    return citaRepo.buscarPorId(id, conn);
  });
}

/* ------------------------------------------------------------------ */
/* Cambios de estado                                                   */
/* ------------------------------------------------------------------ */

/** ¿Quién puede llevar una cita a cada estado? (la misma regla del mock) */
const PUEDE_PASAR_A = {
  // Confirmar una solicitud del paciente es tarea de recepción.
  PROGRAMADA: (sesion) => ['ADMINISTRADOR', 'RECEPCIONISTA'].includes(sesion.user.rol),
  // Completar: el administrador o el odontólogo de ESA cita.
  COMPLETADA: (sesion, cita) => sesion.user.rol === 'ADMINISTRADOR' || (sesion.user.rol === 'ESPECIALISTA' && sesion.user.id_especialista === cita.id_especialista),
  CANCELADA: (sesion) => puede(sesion, PERMISOS.CANCELAR_CITA),
};

const REGLAS_ESTADO = {
  estado: [reglas.requerido('Indica el nuevo estado.'), reglas.texto(30), reglas.unoDe(Object.keys(PUEDE_PASAR_A), 'Estado no válido.')],
};

/** Confirmar (PROGRAMADA), completar (COMPLETADA) o cancelar (CANCELADA), con auditoría. */
export async function cambiarEstado(sesion, idCita, body = {}) {
  const id = aId(idCita);
  if (!id) throw noExiste('La cita');
  validar(body, REGLAS_ESTADO);
  const estado = body.estado.trim();

  return withTransaction(async (conn) => {
    const cita = await citaRepo.bloquearParaEstado(conn, id);
    if (!cita) throw noExiste('La cita');
    if (sesion.user.rol === 'PACIENTE' && cita.id_paciente !== sesion.user.id_paciente) throw forbidden('Solo puedes consultar tu propia información.');
    if (!PUEDE_PASAR_A[estado](sesion, cita)) throw forbidden();
    if (!TRANSICIONES[cita.estado_cita]?.includes(estado)) {
      throw new ApiError(409, `Una cita ${cita.estado_cita.toLowerCase().replace('_', ' ')} no puede pasar a ${estado.toLowerCase()}.`, { code: 'INVALID_TRANSITION' });
    }

    await citaRepo.actualizarEstado(conn, id, estado);
    await auditoria.registrar({ idUsuario: sesion.user.id_usuario, accion: `CITA_${estado}`, tabla: 'cita', detalles: `Cita #${id}: ${cita.estado_cita} → ${estado}` }, conn);
    return citaRepo.buscarPorId(id, conn);
  });
}
