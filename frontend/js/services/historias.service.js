import { USE_MOCK } from '../core/config.js';
import { validators, compose } from '../core/validators.js';
import { PERMISOS } from '../core/permissions.js';
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
  assertCanReadHistoria,
  assertRN01,
  historiaDe,
  nombreEspecialistaDb,
  forbidden,
} from './mock/db.js';

/**
 * Servicio de historia clínica (RF-PAC-04/05, RN-01): antecedentes, alergias y consultas.
 *
 *   getByPaciente(idPaciente)   → historia + consultas (con fecha y odontólogo de cada cita)
 *   update(idPaciente, data)    → antecedentes / alergias / observaciones (RN-01)
 *   addConsulta(data)           → registra la atención de una cita y la marca COMPLETADA (RN-01)
 */

const CAMPOS = ['antecedentes_medicos', 'alergias', 'observaciones'];
const REGLAS_CONSULTA = {
  id_cita: validators.required(),
  motivo_consulta: compose(validators.required(), validators.maxLength(255)),
  diagnostico: validators.required('Escribe el diagnóstico.'),
  procedimiento_realizado: validators.required('Describe el procedimiento realizado.'),
};

function consultasDe(db, idPaciente) {
  const citas = new Map(db.cita.filter((c) => c.id_paciente === Number(idPaciente)).map((c) => [c.id_cita, c]));
  return db.consulta
    .filter((q) => citas.has(q.id_cita))
    .map((q) => {
      const cita = citas.get(q.id_cita);
      return { ...q, fecha_cita: cita.fecha_hora, id_especialista: cita.id_especialista, especialista_nombre: nombreEspecialistaDb(db, cita.id_especialista) };
    })
    .sort((a, b) => b.fecha_cita.localeCompare(a.fecha_cita));
}

const mock = {
  getByPaciente: (idPaciente) =>
    mockRequest(({ db, user }) => {
      assertCanReadHistoria(user, idPaciente);
      findOr404(db.paciente, 'id_paciente', idPaciente, 'El paciente');
      return { ...historiaDe(db, idPaciente), consultas: consultasDe(db, idPaciente) };
    }),

  update: (idPaciente, data) =>
    mockRequest(
      ({ db, user }) => {
        assertRN01(db, user, idPaciente);
        const historia = historiaDe(db, idPaciente);
        const cambios = pick(data, CAMPOS);
        assertValid(cambios, Object.fromEntries(CAMPOS.map((c) => [c, validators.maxLength(2000)])));
        Object.assign(historia, cambios);
        audit(db, user, 'ACTUALIZAR', 'historia_clinica', `Historia #${historia.id_historia}: ${Object.keys(cambios).join(', ')}`);
        return { ...historia, consultas: consultasDe(db, idPaciente) };
      },
      { permiso: PERMISOS.EDITAR_HISTORIA_CLINICA, write: true },
    ),

  addConsulta: (data) =>
    mockRequest(
      ({ db, user }) => {
        const row = pick(data, ['id_cita', 'motivo_consulta', 'diagnostico', 'procedimiento_realizado', 'prescripcion_medica']);
        row.id_cita = Number(row.id_cita);
        assertValid(row, REGLAS_CONSULTA);
        const cita = findOr404(db.cita, 'id_cita', row.id_cita, 'La cita');
        assertRN01(db, user, cita.id_paciente);
        if (user.rol === 'ESPECIALISTA' && cita.id_especialista !== user.id_especialista) throw forbidden('Solo el odontólogo de la cita puede registrar la consulta.');
        if (db.consulta.some((q) => q.id_cita === cita.id_cita)) throw new ApiError(409, 'Esa cita ya tiene una consulta registrada.', { code: 'DUPLICATE' });
        if (!['PROGRAMADA', 'COMPLETADA'].includes(cita.estado_cita)) throw new ApiError(409, 'La cita debe estar programada para registrar la consulta.', { code: 'NOT_EDITABLE' });
        const consulta = { id_consulta: nextId(db.consulta, 'id_consulta'), ...row, prescripcion_medica: row.prescripcion_medica ?? null, fecha_consulta: nowSql() };
        db.consulta.push(consulta);
        cita.estado_cita = 'COMPLETADA';
        audit(db, user, 'CREAR', 'consulta', `Consulta #${consulta.id_consulta} de la cita #${cita.id_cita}`);
        return consulta;
      },
      { permiso: PERMISOS.EDITAR_HISTORIA_CLINICA, write: true },
    ),
};

const remote = {
  getByPaciente: (idPaciente) => http.get(`/pacientes/${idPaciente}/historia`),
  update: (idPaciente, data) => http.put(`/pacientes/${idPaciente}/historia`, data),
  addConsulta: (data) => http.post('/consultas', data),
};

export const historiasService = USE_MOCK ? mock : remote;
