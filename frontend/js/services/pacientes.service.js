import { USE_MOCK } from '../core/config.js';
import { validators, compose } from '../core/validators.js';
import { normalizeText } from '../core/format.js';
import { PERMISOS, can } from '../core/permissions.js';
import { http } from './http.js';
import { ApiError } from './api-error.js';
import { mockRequest, findOr404, nextId, nowSql, assertValid, pick, audit, assertOwnPaciente, forbidden } from './mock/db.js';

/**
 * Servicio de pacientes (RF-PAC-01/02/03, HU-03).
 *
 *   list({ q })        → pacientes (el rol PACIENTE solo se ve a sí mismo)
 *   get(id)            → paciente
 *   create(data)       → paciente nuevo (+ su historia clínica vacía, como haría una transacción)
 *   update(id, data)   → paciente actualizado (el PACIENTE solo cambia sus datos de contacto)
 *   remove(id)         → elimina si no tiene citas ni ventas (409 si las tiene)
 */

const CAMPOS = ['tipo_documento', 'numero_documento', 'nombres', 'apellidos', 'fecha_nacimiento', 'genero', 'telefono', 'email', 'departamento', 'municipio', 'direccion', 'eps_aseguradora'];
const CAMPOS_CONTACTO = ['telefono', 'email', 'departamento', 'municipio', 'direccion', 'eps_aseguradora'];
const optional = (rule) => (value) => (value === undefined || value === null || String(value).trim() === '' ? null : rule(value));

// Las MISMAS reglas que usa el formulario: el "servidor" no confía en lo que validó el navegador.
const REGLAS = {
  tipo_documento: compose(validators.required(), (v) => (['CC', 'TI', 'CE', 'PA', 'RC'].includes(v) ? null : 'Tipo de documento no válido.')),
  numero_documento: compose(validators.required(), validators.documento()),
  nombres: compose(validators.required(), validators.maxLength(100)),
  apellidos: compose(validators.required(), validators.maxLength(100)),
  fecha_nacimiento: compose(validators.required(), (v) => (v > nowSql().slice(0, 10) ? 'La fecha de nacimiento no puede ser futura.' : null)),
  genero: compose(validators.required(), (v) => (['MASCULINO', 'FEMENINO', 'OTRO'].includes(v) ? null : 'Género no válido.')),
  telefono: compose(validators.required(), validators.telefono()),
  email: optional(validators.email()),
  // Nombres DIVIPOLA elegidos de la lista de datos.gov.co (columnas nuevas: ver SUSTENTACION §14.6).
  departamento: optional(validators.maxLength(60)),
  municipio: optional(validators.maxLength(80)),
  direccion: optional(validators.maxLength(150)),
  eps_aseguradora: optional(validators.maxLength(100)),
};

function assertUnique(db, data, idActual) {
  const fields = {};
  if (data.numero_documento && db.paciente.some((p) => p.numero_documento === data.numero_documento && p.id_paciente !== idActual)) {
    fields.numero_documento = 'Ya existe un paciente con ese número de documento.';
  }
  const email = data.email?.toLowerCase();
  if (email && db.paciente.some((p) => p.email?.toLowerCase() === email && p.id_paciente !== idActual)) {
    fields.email = 'Ese correo ya está registrado para otro paciente.';
  }
  if (Object.keys(fields).length) throw new ApiError(409, 'Hay datos que ya están registrados.', { fields, code: 'DUPLICATE' });
}

const mock = {
  list: ({ q } = {}) =>
    mockRequest(({ db, user }) => {
      let rows = user.rol === 'PACIENTE' ? db.paciente.filter((p) => p.id_paciente === user.id_paciente) : db.paciente;
      if (q) {
        const term = normalizeText(q);
        rows = rows.filter((p) => normalizeText(`${p.nombres} ${p.apellidos} ${p.numero_documento} ${p.email ?? ''}`).includes(term));
      }
      return [...rows].sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, 'es'));
    }),

  get: (id) =>
    mockRequest(({ db, user }) => {
      assertOwnPaciente(user, id);
      return findOr404(db.paciente, 'id_paciente', id, 'El paciente');
    }),

  create: (data) =>
    mockRequest(
      ({ db, user }) => {
        const row = pick(data, CAMPOS);
        assertValid(row, REGLAS);
        assertUnique(db, row);
        const paciente = { id_paciente: nextId(db.paciente, 'id_paciente'), id_usuario: null, ...row, fecha_registro: nowSql() };
        db.paciente.push(paciente);
        db.historia_clinica.push({
          id_historia: nextId(db.historia_clinica, 'id_historia'),
          id_paciente: paciente.id_paciente,
          antecedentes_medicos: null,
          alergias: null,
          observaciones: 'Historia clínica aperturada en sistema',
          fecha_apertura: nowSql(),
        });
        audit(db, user, 'CREAR', 'paciente', `Paciente #${paciente.id_paciente} ${paciente.nombres} ${paciente.apellidos}`);
        return paciente;
      },
      { permiso: PERMISOS.GESTIONAR_PACIENTES, write: true },
    ),

  update: (id, data) =>
    mockRequest(
      ({ db, user }) => {
        const esPropio = user.rol === 'PACIENTE' && user.id_paciente === Number(id);
        if (!esPropio && !can(user, PERMISOS.GESTIONAR_PACIENTES)) throw forbidden();
        const paciente = findOr404(db.paciente, 'id_paciente', id, 'El paciente');
        const cambios = pick(data, esPropio ? CAMPOS_CONTACTO : CAMPOS);
        // Cambió el departamento sin enviar municipio: el anterior ya no le corresponde.
        if (cambios.departamento !== undefined && cambios.departamento !== paciente.departamento && cambios.municipio === undefined) cambios.municipio = null;
        const merged = { ...paciente, ...cambios };
        assertValid(merged, REGLAS);
        assertUnique(db, merged, paciente.id_paciente);
        Object.assign(paciente, cambios);
        audit(db, user, 'ACTUALIZAR', 'paciente', `Paciente #${paciente.id_paciente}: ${Object.keys(cambios).join(', ')}`);
        return paciente;
      },
      { write: true },
    ),

  remove: (id) =>
    mockRequest(
      ({ db, user }) => {
        const paciente = findOr404(db.paciente, 'id_paciente', id, 'El paciente');
        // Integridad referencial: igual que una FOREIGN KEY, no se borra un paciente con historial.
        if (db.cita.some((c) => c.id_paciente === paciente.id_paciente) || db.venta.some((v) => v.id_paciente === paciente.id_paciente)) {
          throw new ApiError(409, 'No se puede eliminar: el paciente tiene citas o pagos registrados.', { code: 'HAS_REFERENCES' });
        }
        const historia = db.historia_clinica.find((hc) => hc.id_paciente === paciente.id_paciente);
        db.paciente.splice(db.paciente.indexOf(paciente), 1);
        if (historia) {
          db.historia_clinica.splice(db.historia_clinica.indexOf(historia), 1);
          db.odontograma = db.odontograma.filter((r) => r.id_historia !== historia.id_historia);
        }
        audit(db, user, 'ELIMINAR', 'paciente', `Paciente #${paciente.id_paciente}`);
        return { id_paciente: paciente.id_paciente };
      },
      { permiso: PERMISOS.GESTIONAR_PACIENTES, write: true },
    ),
};

const remote = {
  list: (params) => http.get('/pacientes', params),
  get: (id) => http.get(`/pacientes/${id}`),
  create: (data) => http.post('/pacientes', data),
  update: (id, data) => http.put(`/pacientes/${id}`, data),
  remove: (id) => http.delete(`/pacientes/${id}`),
};

export const pacientesService = USE_MOCK ? mock : remote;
