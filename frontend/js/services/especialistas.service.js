import { USE_MOCK } from '../core/config.js';
import { validators, compose } from '../core/validators.js';
import { PERMISOS } from '../core/permissions.js';
import { toMinutes } from '../core/agenda.js';
import { http } from './http.js';
import { ApiError } from './api-error.js';
import { mockRequest, findOr404, nextId, nowSql, assertValid, pick, audit, especialistaConNombre } from './mock/db.js';
import { hashPassword } from './mock/password.js';

/**
 * Servicio de especialistas y sus horarios (RF-ESP-*, RN-02).
 *
 *   list({ soloActivos })     → especialistas con nombre (JOIN personal + usuario)
 *   get(id)                   → especialista + horarios
 *   create(data)              → crea usuario (rol ESPECIALISTA) + personal + especialista
 *   update(id, data)
 *   cambiarEstado(id, estado) → activa/inactiva su usuario (no se borran: tienen citas e historias)
 *   horarios(id) · addHorario(id, data) · removeHorario(idHorario)
 */

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const ROL_ESPECIALISTA = 3;
const HORA = /^\d{2}:\d{2}(:\d{2})?$/;

const REGLAS_CREAR = {
  nombres: compose(validators.required(), validators.maxLength(100)),
  apellidos: compose(validators.required(), validators.maxLength(100)),
  tipo_documento: validators.required(),
  numero_documento: compose(validators.required(), validators.documento()),
  telefono: compose(validators.required(), validators.telefono()),
  especialidad: compose(validators.required(), validators.maxLength(100)),
  registro_medico: compose(validators.required(), validators.maxLength(50)),
  email: compose(validators.required(), validators.email()),
  password: compose(validators.required(), validators.password()),
};

function conHorarios(db, especialista) {
  return { ...especialistaConNombre(db, especialista), horarios: db.horario.filter((h) => h.id_especialista === especialista.id_especialista) };
}

function assertUnicos(db, data, idPersonal) {
  const fields = {};
  if (data.email && db.usuario.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) fields.email = 'Ese correo ya tiene una cuenta.';
  if (data.numero_documento && db.personal.some((p) => p.numero_documento === data.numero_documento && p.id_personal !== idPersonal)) fields.numero_documento = 'Ya existe personal con ese documento.';
  if (data.registro_medico && db.especialista.some((e) => e.registro_medico === data.registro_medico && e.id_personal !== idPersonal)) fields.registro_medico = 'Registro médico repetido.';
  if (Object.keys(fields).length) throw new ApiError(409, 'Hay datos que ya están registrados.', { fields, code: 'DUPLICATE' });
}

const mock = {
  list: ({ soloActivos = false } = {}) =>
    mockRequest(({ db }) => db.especialista.map((e) => conHorarios(db, e)).filter((e) => !soloActivos || e.estado === 'ACTIVO')),

  get: (id) => mockRequest(({ db }) => conHorarios(db, findOr404(db.especialista, 'id_especialista', id, 'El especialista'))),

  async create(data) {
    const row = pick(data, Object.keys(REGLAS_CREAR));
    assertValid(row, REGLAS_CREAR);
    // El hash se calcula ANTES de la "transacción": la contraseña nunca se guarda en claro.
    const password_hash = await hashPassword(row.password);
    return mockRequest(
      ({ db, user }) => {
        assertUnicos(db, row);
        const usuario = { id_usuario: nextId(db.usuario, 'id_usuario'), id_rol: ROL_ESPECIALISTA, email: row.email.toLowerCase(), password_hash, estado: 'ACTIVO', fecha_creacion: nowSql() };
        const personal = {
          id_personal: nextId(db.personal, 'id_personal'),
          id_usuario: usuario.id_usuario,
          tipo_documento: row.tipo_documento,
          numero_documento: row.numero_documento,
          nombres: row.nombres,
          apellidos: row.apellidos,
          cargo: row.especialidad,
          telefono: row.telefono,
        };
        const especialista = { id_especialista: nextId(db.especialista, 'id_especialista'), id_personal: personal.id_personal, especialidad: row.especialidad, registro_medico: row.registro_medico };
        db.usuario.push(usuario);
        db.personal.push(personal);
        db.especialista.push(especialista);
        audit(db, user, 'CREAR', 'especialista', `${personal.nombres} ${personal.apellidos} (${especialista.especialidad})`);
        return conHorarios(db, especialista);
      },
      { permiso: PERMISOS.GESTIONAR_ESPECIALISTAS, write: true },
    );
  },

  update: (id, data) =>
    mockRequest(
      ({ db, user }) => {
        const especialista = findOr404(db.especialista, 'id_especialista', id, 'El especialista');
        const personal = db.personal.find((p) => p.id_personal === especialista.id_personal);
        const cambiosEsp = pick(data, ['especialidad', 'registro_medico']);
        const cambiosPer = pick(data, ['nombres', 'apellidos', 'telefono']);
        const reglas = Object.fromEntries(Object.keys({ ...cambiosEsp, ...cambiosPer }).map((k) => [k, REGLAS_CREAR[k]]));
        assertValid({ ...cambiosEsp, ...cambiosPer }, reglas);
        assertUnicos(db, cambiosEsp, especialista.id_personal);
        Object.assign(especialista, cambiosEsp);
        Object.assign(personal, cambiosPer, cambiosEsp.especialidad ? { cargo: cambiosEsp.especialidad } : {});
        audit(db, user, 'ACTUALIZAR', 'especialista', `Especialista #${especialista.id_especialista}`);
        return conHorarios(db, especialista);
      },
      { permiso: PERMISOS.GESTIONAR_ESPECIALISTAS, write: true },
    ),

  cambiarEstado: (id, estado) =>
    mockRequest(
      ({ db, user }) => {
        if (!['ACTIVO', 'INACTIVO'].includes(estado)) throw new ApiError(400, 'Estado no válido.', { code: 'VALIDATION' });
        const especialista = findOr404(db.especialista, 'id_especialista', id, 'El especialista');
        const personal = db.personal.find((p) => p.id_personal === especialista.id_personal);
        db.usuario.find((u) => u.id_usuario === personal.id_usuario).estado = estado;
        audit(db, user, `USUARIO_${estado}`, 'usuario', `Especialista #${especialista.id_especialista}`);
        return conHorarios(db, especialista);
      },
      { permiso: PERMISOS.GESTIONAR_ESPECIALISTAS, write: true },
    ),

  horarios: (id) => mockRequest(({ db }) => db.horario.filter((h) => h.id_especialista === Number(id))),

  addHorario: (id, data) =>
    mockRequest(
      ({ db, user }) => {
        const especialista = findOr404(db.especialista, 'id_especialista', id, 'El especialista');
        const row = pick(data, ['dia_semana', 'hora_inicio', 'hora_fin']);
        assertValid(row, {
          dia_semana: (v) => (DIAS_SEMANA.includes(v) ? null : 'Día no válido.'),
          hora_inicio: (v) => (HORA.test(v ?? '') ? null : 'Hora no válida.'),
          hora_fin: (v) => (HORA.test(v ?? '') ? null : 'Hora no válida.'),
        });
        const [inicio, fin] = [toMinutes(row.hora_inicio), toMinutes(row.hora_fin)];
        if (fin <= inicio) throw new ApiError(400, 'La hora final debe ser posterior a la inicial.', { fields: { hora_fin: 'Debe ser posterior a la hora de inicio.' }, code: 'VALIDATION' });
        if (inicio % 30 || fin % 30) throw new ApiError(400, 'Las horas deben coincidir con franjas de 30 minutos.', { code: 'VALIDATION' });
        const cruce = db.horario.some((h) => h.id_especialista === especialista.id_especialista && h.dia_semana === row.dia_semana && inicio < toMinutes(h.hora_fin) && toMinutes(h.hora_inicio) < fin);
        if (cruce) throw new ApiError(409, 'Ese rango se cruza con otro horario del mismo día.', { code: 'OVERLAP' });
        const horario = { id_horario: nextId(db.horario, 'id_horario'), id_especialista: especialista.id_especialista, dia_semana: row.dia_semana, hora_inicio: row.hora_inicio.slice(0, 5) + ':00', hora_fin: row.hora_fin.slice(0, 5) + ':00' };
        db.horario.push(horario);
        audit(db, user, 'CREAR', 'horario', `Especialista #${especialista.id_especialista}: ${horario.dia_semana} ${horario.hora_inicio}–${horario.hora_fin}`);
        return horario;
      },
      { permiso: PERMISOS.GESTIONAR_ESPECIALISTAS, write: true },
    ),

  removeHorario: (idHorario) =>
    mockRequest(
      ({ db, user }) => {
        const horario = findOr404(db.horario, 'id_horario', idHorario, 'El horario');
        // RN-02 en sentido inverso: no dejar citas futuras "huérfanas" fuera de horario.
        const hoy = nowSql().slice(0, 10);
        const [inicio, fin] = [toMinutes(horario.hora_inicio), toMinutes(horario.hora_fin)];
        const afectadas = db.cita.filter((c) => {
          if (c.id_especialista !== horario.id_especialista || c.fecha_hora.slice(0, 10) < hoy || !['PROGRAMADA', 'PENDIENTE_CONFIRMACION'].includes(c.estado_cita)) return false;
          const dia = DIAS_SEMANA[(new Date(`${c.fecha_hora.slice(0, 10)}T00:00:00`).getDay() + 6) % 7];
          const m = toMinutes(c.fecha_hora.slice(11, 16));
          return dia === horario.dia_semana && m >= inicio && m < fin;
        });
        if (afectadas.length) throw new ApiError(409, `Hay ${afectadas.length} cita(s) futura(s) en ese horario: reprográmalas primero.`, { code: 'HAS_APPOINTMENTS' });
        db.horario.splice(db.horario.indexOf(horario), 1);
        audit(db, user, 'ELIMINAR', 'horario', `Horario #${horario.id_horario}`);
        return { id_horario: horario.id_horario };
      },
      { permiso: PERMISOS.GESTIONAR_ESPECIALISTAS, write: true },
    ),
};

const remote = {
  list: (params) => http.get('/especialistas', params),
  get: (id) => http.get(`/especialistas/${id}`),
  create: (data) => http.post('/especialistas', data),
  update: (id, data) => http.put(`/especialistas/${id}`, data),
  cambiarEstado: (id, estado) => http.patch(`/especialistas/${id}/estado`, { estado }),
  horarios: (id) => http.get(`/especialistas/${id}/horarios`),
  addHorario: (id, data) => http.post(`/especialistas/${id}/horarios`, data),
  removeHorario: (idHorario) => http.delete(`/horarios/${idHorario}`),
};

export const especialistasService = USE_MOCK ? mock : remote;
