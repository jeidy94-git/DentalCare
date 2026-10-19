import { USE_MOCK } from '../core/config.js';
import { validators, compose } from '../core/validators.js';
import { PERMISOS, can } from '../core/permissions.js';
import { getDaySlots, suggestAlternatives, timeOf } from '../core/agenda.js';
import { http } from './http.js';
import { ApiError } from './api-error.js';
import {
  mockRequest,
  findOr404,
  nextId,
  nowSql,
  assertValid,
  pick,
  audit,
  assertOwnPaciente,
  forbidden,
  nombrePacienteDb,
  nombreEspecialistaDb,
  especialistaConNombre,
} from './mock/db.js';

/**
 * Servicio de citas (RF-CIT-01…07, HU-05, HU-06, RN-02).
 *
 *   list({ desde, hasta, id_especialista, id_paciente, estado })  → citas con nombres unidos (JOIN)
 *   get(id)
 *   disponibilidad({ id_especialista, fecha })  → franjas del día (sin datos de otros pacientes)
 *   alternativas({ id_especialista, fecha })    → RF-CIT-03
 *   create(data)        → RN-02 + franja libre; el PACIENTE crea en PENDIENTE_CONFIRMACION (HU-06)
 *   update(id, data)    → reprogramar / cambiar motivo (vuelve a validar RN-02)
 *   confirmar(id) · cancelar(id) · completar(id)  → cambios de estado permitidos
 *
 * Las citas no se eliminan: se CANCELAN (queda la traza de lo que pasó).
 */

const ESTADOS_ACTIVOS = ['PROGRAMADA', 'PENDIENTE_CONFIRMACION'];

/** Máquina de estados: desde qué estado se puede pasar a cuál. */
const TRANSICIONES = {
  PENDIENTE_CONFIRMACION: ['PROGRAMADA', 'CANCELADA'],
  PROGRAMADA: ['COMPLETADA', 'CANCELADA'],
  COMPLETADA: [],
  CANCELADA: [],
};

const REGLAS = {
  id_paciente: validators.required('Selecciona el paciente.'),
  id_especialista: validators.required('Selecciona el odontólogo.'),
  id_servicio: validators.required('Selecciona el tratamiento.'),
  fecha_hora: compose(validators.required('Selecciona la fecha y la hora.'), validators.pattern(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/, 'Fecha y hora no válidas.')),
  motivo: compose(validators.required('Escribe el motivo de la cita.'), validators.maxLength(255)),
};

const withNames = (db, c) => ({
  ...c,
  paciente_nombre: nombrePacienteDb(db, c.id_paciente),
  especialista_nombre: nombreEspecialistaDb(db, c.id_especialista),
  servicio_nombre: db.servicio.find((s) => s.id_servicio === c.id_servicio)?.nombre_servicio ?? null,
});

/** RN-02 y choques: lanza el error adecuado si la franja no se puede usar. */
function assertSlot(db, { id_especialista, id_paciente, fecha_hora }, idCitaActual) {
  const fecha = fecha_hora.slice(0, 10);
  const inicio = fecha_hora.slice(11, 16);
  // La cita que se está reprogramando no debe "ocupar" su propia franja.
  const citas = db.cita.filter((c) => c.id_cita !== idCitaActual);
  const slots = getDaySlots({ especialistaId: id_especialista, date: fecha, horarios: db.horario, citas });
  const slot = slots.find((s) => s.start === inicio);

  if (!slot || slot.status === 'blocked') {
    throw new ApiError(422, 'El odontólogo no tiene horario configurado en ese rango (RN-02).', { code: 'NO_SCHEDULE', fields: { fecha_hora: 'Fuera del horario del odontólogo.' } });
  }
  if (slot.status === 'past') throw new ApiError(422, 'No se pueden agendar citas en horas pasadas.', { code: 'PAST_SLOT', fields: { fecha_hora: 'Esa hora ya pasó.' } });
  if (slot.status === 'occupied') throw new ApiError(409, 'Esa franja ya está ocupada.', { code: 'SLOT_TAKEN', fields: { fecha_hora: 'Franja ocupada. Elige otra.' } });

  const choque = citas.some((c) => c.id_paciente === id_paciente && ESTADOS_ACTIVOS.includes(c.estado_cita) && c.fecha_hora.slice(0, 16) === fecha_hora.slice(0, 16));
  if (choque) throw new ApiError(409, 'El paciente ya tiene otra cita a esa hora.', { code: 'PATIENT_BUSY' });
}

function assertRefs(db, data) {
  findOr404(db.paciente, 'id_paciente', data.id_paciente, 'El paciente');
  findOr404(db.especialista, 'id_especialista', data.id_especialista, 'El odontólogo');
  const servicio = findOr404(db.servicio, 'id_servicio', data.id_servicio, 'El tratamiento');
  if (servicio.estado !== 'ACTIVO') throw new ApiError(422, 'Ese tratamiento no está disponible.', { code: 'INACTIVE_SERVICE' });
}

const toNumbers = (data) => {
  for (const key of ['id_paciente', 'id_especialista', 'id_servicio']) if (data[key] !== undefined && data[key] !== '') data[key] = Number(data[key]);
  if (data.fecha_hora && data.fecha_hora.length === 16) data.fecha_hora += ':00';
  return data;
};

function changeState(id, estado) {
  return mockRequest(
    ({ db, user }) => {
      const cita = findOr404(db.cita, 'id_cita', id, 'La cita');
      assertOwnPaciente(user, cita.id_paciente);
      const allowed = {
        PROGRAMADA: ['ADMINISTRADOR', 'RECEPCIONISTA'].includes(user.rol), // confirmar una solicitud
        COMPLETADA: user.rol === 'ADMINISTRADOR' || (user.rol === 'ESPECIALISTA' && user.id_especialista === cita.id_especialista),
        CANCELADA: can(user, PERMISOS.CANCELAR_CITA),
      }[estado];
      if (!allowed) throw forbidden();
      if (!TRANSICIONES[cita.estado_cita]?.includes(estado)) {
        throw new ApiError(409, `Una cita ${cita.estado_cita.toLowerCase().replace('_', ' ')} no puede pasar a ${estado.toLowerCase()}.`, { code: 'INVALID_TRANSITION' });
      }
      cita.estado_cita = estado;
      audit(db, user, `CITA_${estado}`, 'cita', `Cita #${cita.id_cita}`);
      return withNames(db, cita);
    },
    { write: true },
  );
}

const mock = {
  list: ({ desde, hasta, id_especialista, id_paciente, estado } = {}) =>
    mockRequest(({ db, user }) => {
      const propio = user.rol === 'PACIENTE' ? user.id_paciente : id_paciente && Number(id_paciente);
      const estados = estado ? [].concat(estado) : null;
      return db.cita
        .filter(
          (c) =>
            (!propio || c.id_paciente === propio) &&
            (!id_especialista || c.id_especialista === Number(id_especialista)) &&
            (!estados || estados.includes(c.estado_cita)) &&
            (!desde || c.fecha_hora.slice(0, 10) >= desde) &&
            (!hasta || c.fecha_hora.slice(0, 10) <= hasta),
        )
        .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
        .map((c) => withNames(db, c));
    }),

  get: (id) =>
    mockRequest(({ db, user }) => {
      const cita = findOr404(db.cita, 'id_cita', id, 'La cita');
      assertOwnPaciente(user, cita.id_paciente);
      return withNames(db, cita);
    }),

  disponibilidad: ({ id_especialista, fecha }) =>
    mockRequest(({ db }) =>
      // Solo estado y hora: la franja ocupada NO revela qué paciente la tomó.
      getDaySlots({ especialistaId: Number(id_especialista), date: fecha, horarios: db.horario, citas: db.cita }).map(({ start, end, status }) => ({ start, end, status })),
    ),

  alternativas: ({ id_especialista, fecha }) =>
    mockRequest(({ db }) =>
      suggestAlternatives({
        especialistaId: Number(id_especialista),
        date: fecha,
        horarios: db.horario,
        citas: db.cita,
        especialistas: db.especialista.map((e) => especialistaConNombre(db, e)).filter((e) => e.estado === 'ACTIVO'),
      }),
    ),

  create: (data) =>
    mockRequest(
      ({ db, user }) => {
        const row = toNumbers(pick(data, ['id_paciente', 'id_especialista', 'id_servicio', 'fecha_hora', 'motivo']));
        if (user.rol === 'PACIENTE') row.id_paciente = user.id_paciente; // el paciente solo agenda para sí mismo
        assertValid(row, REGLAS);
        assertRefs(db, row);
        assertSlot(db, row);
        const cita = {
          id_cita: nextId(db.cita, 'id_cita'),
          ...row,
          // HU-06: lo que pide el paciente queda pendiente hasta que recepción lo confirme.
          estado_cita: user.rol === 'PACIENTE' ? 'PENDIENTE_CONFIRMACION' : 'PROGRAMADA',
          recordatorio_enviado: 0,
          mensaje_alerta: null,
          fecha_creacion: nowSql(),
        };
        db.cita.push(cita);
        audit(db, user, 'CREAR', 'cita', `Cita #${cita.id_cita} ${cita.fecha_hora} (${timeOf(cita.fecha_hora)})`);
        return withNames(db, cita);
      },
      { permiso: PERMISOS.CREAR_CITA, write: true },
    ),

  update: (id, data) =>
    mockRequest(
      ({ db, user }) => {
        const cita = findOr404(db.cita, 'id_cita', id, 'La cita');
        assertOwnPaciente(user, cita.id_paciente);
        if (!ESTADOS_ACTIVOS.includes(cita.estado_cita)) throw new ApiError(409, 'Solo se pueden modificar citas programadas o por confirmar.', { code: 'NOT_EDITABLE' });
        const cambios = toNumbers(pick(data, ['id_especialista', 'id_servicio', 'fecha_hora', 'motivo']));
        const merged = { ...cita, ...cambios };
        assertValid(merged, REGLAS);
        assertRefs(db, merged);
        const reprograma = merged.fecha_hora !== cita.fecha_hora || merged.id_especialista !== cita.id_especialista;
        if (reprograma) assertSlot(db, merged, cita.id_cita);
        Object.assign(cita, cambios);
        if (reprograma && user.rol === 'PACIENTE') cita.estado_cita = 'PENDIENTE_CONFIRMACION';
        audit(db, user, reprograma ? 'REPROGRAMAR' : 'ACTUALIZAR', 'cita', `Cita #${cita.id_cita}`);
        return withNames(db, cita);
      },
      { permiso: PERMISOS.CREAR_CITA, write: true },
    ),

  confirmar: (id) => changeState(id, 'PROGRAMADA'),
  cancelar: (id) => changeState(id, 'CANCELADA'),
  completar: (id) => changeState(id, 'COMPLETADA'),
};

const remote = {
  list: (params) => http.get('/citas', params),
  get: (id) => http.get(`/citas/${id}`),
  disponibilidad: (params) => http.get('/citas/disponibilidad', params),
  alternativas: (params) => http.get('/citas/alternativas', params),
  create: (data) => http.post('/citas', data),
  update: (id, data) => http.put(`/citas/${id}`, data),
  confirmar: (id) => http.patch(`/citas/${id}/estado`, { estado: 'PROGRAMADA' }),
  cancelar: (id) => http.patch(`/citas/${id}/estado`, { estado: 'CANCELADA' }),
  completar: (id) => http.patch(`/citas/${id}/estado`, { estado: 'COMPLETADA' }),
};

export const citasService = USE_MOCK ? mock : remote;
