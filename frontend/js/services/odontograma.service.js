import { USE_MOCK } from '../core/config.js';
import { validators, compose } from '../core/validators.js';
import { PERMISOS } from '../core/permissions.js';
import { http } from './http.js';
import { mockRequest, findOr404, nextId, nowSql, assertValid, pick, audit, assertCanReadHistoria, assertRN01, historiaDe } from './mock/db.js';

/**
 * Servicio del odontograma (RF-PAC-04, HU-04, RN-01). Cada registro es un hallazgo en UNA cara de UNA pieza.
 *
 *   listByPaciente(idPaciente)   → hallazgos de la historia del paciente
 *   save(idPaciente, data)       → crea o reemplaza el hallazgo de esa pieza + cara (upsert)
 *   remove(idOdontograma)        → elimina un hallazgo
 */

/** Piezas válidas en numeración FDI: permanentes 11–48 y temporales 51–85. */
const FDI_VALIDOS = new Set([
  ...[1, 2, 3, 4].flatMap((q) => Array.from({ length: 8 }, (_, i) => q * 10 + i + 1)),
  ...[5, 6, 7, 8].flatMap((q) => Array.from({ length: 5 }, (_, i) => q * 10 + i + 1)),
]);
const CARAS = ['VESTIBULAR', 'LINGUAL', 'PALATINA', 'MESIAL', 'DISTAL', 'OCLUSAL', 'INCISAL'];
export const ESTADOS_TRATAMIENTO = ['PENDIENTE', 'EN_PROCESO', 'EN_OBSERVACION', 'REALIZADO', 'REEMPLAZO_REQUERIDO'];

const REGLAS = {
  id_diente: (v) => (FDI_VALIDOS.has(Number(v)) ? null : 'Pieza dental no válida (numeración FDI).'),
  cara_diente: (v) => (CARAS.includes(v) ? null : 'Cara del diente no válida.'),
  diagnostico: compose(validators.required('Escribe el diagnóstico.'), validators.maxLength(255)),
  estado_tratamiento: (v) => (ESTADOS_TRATAMIENTO.includes(v) ? null : 'Estado de tratamiento no válido.'),
};

const mock = {
  listByPaciente: (idPaciente) =>
    mockRequest(({ db, user }) => {
      assertCanReadHistoria(user, idPaciente);
      const historia = historiaDe(db, idPaciente);
      return db.odontograma.filter((r) => r.id_historia === historia.id_historia);
    }),

  save: (idPaciente, data) =>
    mockRequest(
      ({ db, user }) => {
        assertRN01(db, user, idPaciente);
        const historia = historiaDe(db, idPaciente);
        const row = pick(data, ['id_diente', 'cara_diente', 'diagnostico', 'estado_tratamiento']);
        row.id_diente = Number(row.id_diente);
        assertValid(row, REGLAS);
        const existente = db.odontograma.find((r) => r.id_historia === historia.id_historia && r.id_diente === row.id_diente && r.cara_diente === row.cara_diente);
        if (existente) {
          Object.assign(existente, row, { fecha_registro: nowSql() });
          audit(db, user, 'ACTUALIZAR', 'odontograma', `Pieza ${row.id_diente} ${row.cara_diente}: ${row.estado_tratamiento}`);
          return existente;
        }
        const registro = { id_odontograma: nextId(db.odontograma, 'id_odontograma'), id_historia: historia.id_historia, ...row, fecha_registro: nowSql() };
        db.odontograma.push(registro);
        audit(db, user, 'CREAR', 'odontograma', `Pieza ${row.id_diente} ${row.cara_diente}: ${row.estado_tratamiento}`);
        return registro;
      },
      { permiso: PERMISOS.EDITAR_HISTORIA_CLINICA, write: true },
    ),

  remove: (idOdontograma) =>
    mockRequest(
      ({ db, user }) => {
        const registro = findOr404(db.odontograma, 'id_odontograma', idOdontograma, 'El hallazgo');
        const historia = db.historia_clinica.find((hc) => hc.id_historia === registro.id_historia);
        assertRN01(db, user, historia.id_paciente);
        db.odontograma.splice(db.odontograma.indexOf(registro), 1);
        audit(db, user, 'ELIMINAR', 'odontograma', `Hallazgo #${registro.id_odontograma} (pieza ${registro.id_diente})`);
        return { id_odontograma: registro.id_odontograma };
      },
      { permiso: PERMISOS.EDITAR_HISTORIA_CLINICA, write: true },
    ),
};

const remote = {
  listByPaciente: (idPaciente) => http.get(`/pacientes/${idPaciente}/odontograma`),
  save: (idPaciente, data) => http.put(`/pacientes/${idPaciente}/odontograma`, data),
  remove: (idOdontograma) => http.delete(`/odontograma/${idOdontograma}`),
};

export const odontogramaService = USE_MOCK ? mock : remote;
