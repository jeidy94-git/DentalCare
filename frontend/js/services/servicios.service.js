import { USE_MOCK } from '../core/config.js';
import { validators, compose } from '../core/validators.js';
import { PERMISOS } from '../core/permissions.js';
import { http } from './http.js';
import { ApiError } from './api-error.js';
import { mockRequest, findOr404, nextId, assertValid, pick, audit } from './mock/db.js';

/**
 * Servicio del catálogo de tratamientos (tabla `servicio`, RF-TRA-*).
 *
 *   list({ soloActivos })   → el PACIENTE solo ve los activos
 *   get(id) · create(data) · update(id, data)
 *   cambiarEstado(id, 'ACTIVO'|'INACTIVO')
 *   remove(id)              → 409 si ya se usó en citas (en ese caso, inactivarlo)
 */

const CAMPOS = ['codigo_servicio', 'nombre_servicio', 'descripcion', 'precio_base'];
const REGLAS = {
  codigo_servicio: compose(validators.required(), validators.pattern(/^[A-Z0-9-]{3,20}$/, 'Usa mayúsculas, números y guiones (3 a 20).')),
  nombre_servicio: compose(validators.required(), validators.maxLength(100)),
  precio_base: (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? null : 'El precio debe ser mayor a 0.'),
};

function assertCodigoUnico(db, codigo, idActual) {
  if (db.servicio.some((s) => s.codigo_servicio === codigo && s.id_servicio !== idActual)) {
    throw new ApiError(409, 'Ya existe un tratamiento con ese código.', { fields: { codigo_servicio: 'Código repetido.' }, code: 'DUPLICATE' });
  }
}

const mock = {
  list: ({ soloActivos = false } = {}) =>
    mockRequest(({ db, user }) => db.servicio.filter((s) => (soloActivos || user.rol === 'PACIENTE' ? s.estado === 'ACTIVO' : true))),

  get: (id) => mockRequest(({ db }) => findOr404(db.servicio, 'id_servicio', id, 'El tratamiento')),

  create: (data) =>
    mockRequest(
      ({ db, user }) => {
        const row = pick(data, CAMPOS);
        if (row.codigo_servicio) row.codigo_servicio = row.codigo_servicio.toUpperCase();
        assertValid(row, REGLAS);
        assertCodigoUnico(db, row.codigo_servicio);
        const servicio = { id_servicio: nextId(db.servicio, 'id_servicio'), ...row, descripcion: row.descripcion ?? null, precio_base: Number(row.precio_base), estado: 'ACTIVO' };
        db.servicio.push(servicio);
        audit(db, user, 'CREAR', 'servicio', `${servicio.codigo_servicio} ${servicio.nombre_servicio}`);
        return servicio;
      },
      { permiso: PERMISOS.GESTIONAR_SERVICIOS, write: true },
    ),

  update: (id, data) =>
    mockRequest(
      ({ db, user }) => {
        const servicio = findOr404(db.servicio, 'id_servicio', id, 'El tratamiento');
        const cambios = pick(data, CAMPOS);
        if (cambios.codigo_servicio) cambios.codigo_servicio = cambios.codigo_servicio.toUpperCase();
        if (cambios.precio_base !== undefined) cambios.precio_base = Number(cambios.precio_base);
        assertValid({ ...servicio, ...cambios }, REGLAS);
        assertCodigoUnico(db, cambios.codigo_servicio ?? servicio.codigo_servicio, servicio.id_servicio);
        Object.assign(servicio, cambios);
        audit(db, user, 'ACTUALIZAR', 'servicio', `${servicio.codigo_servicio}: ${Object.keys(cambios).join(', ')}`);
        return servicio;
      },
      { permiso: PERMISOS.GESTIONAR_SERVICIOS, write: true },
    ),

  cambiarEstado: (id, estado) =>
    mockRequest(
      ({ db, user }) => {
        if (!['ACTIVO', 'INACTIVO'].includes(estado)) throw new ApiError(400, 'Estado no válido.', { code: 'VALIDATION' });
        const servicio = findOr404(db.servicio, 'id_servicio', id, 'El tratamiento');
        servicio.estado = estado;
        audit(db, user, `SERVICIO_${estado}`, 'servicio', servicio.codigo_servicio);
        return servicio;
      },
      { permiso: PERMISOS.GESTIONAR_SERVICIOS, write: true },
    ),

  remove: (id) =>
    mockRequest(
      ({ db, user }) => {
        const servicio = findOr404(db.servicio, 'id_servicio', id, 'El tratamiento');
        if (db.cita.some((c) => c.id_servicio === servicio.id_servicio)) {
          throw new ApiError(409, 'Este tratamiento ya se usó en citas: inactívalo en lugar de eliminarlo.', { code: 'HAS_REFERENCES' });
        }
        db.servicio.splice(db.servicio.indexOf(servicio), 1);
        audit(db, user, 'ELIMINAR', 'servicio', servicio.codigo_servicio);
        return { id_servicio: servicio.id_servicio };
      },
      { permiso: PERMISOS.GESTIONAR_SERVICIOS, write: true },
    ),
};

const remote = {
  list: (params) => http.get('/servicios', params),
  get: (id) => http.get(`/servicios/${id}`),
  create: (data) => http.post('/servicios', data),
  update: (id, data) => http.put(`/servicios/${id}`, data),
  cambiarEstado: (id, estado) => http.patch(`/servicios/${id}/estado`, { estado }),
  remove: (id) => http.delete(`/servicios/${id}`),
};

export const serviciosService = USE_MOCK ? mock : remote;
