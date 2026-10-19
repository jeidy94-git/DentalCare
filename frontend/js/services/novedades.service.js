import { USE_MOCK } from '../core/config.js';
import { validators, compose } from '../core/validators.js';
import { PERMISOS, can } from '../core/permissions.js';
import { TIPOS_NOVEDAD } from '../data/mock/novedades.js';
import { http } from './http.js';
import { mockRequest, findOr404, nextId, nowSql, assertValid, pick, audit, forbidden } from './mock/db.js';

/**
 * Servicio de novedades operativas (RF-NOV-01/02; tabla `novedad_operativa`).
 * Solo el personal (no los pacientes) registra y consulta novedades.
 *
 *   tipos()                      → catálogo de tipos
 *   list({ tipo })               → novedades con el nombre de quien la registró
 *   get(id) · create(data)       → el responsable es el usuario de la sesión (no lo elige el cliente)
 *   update(id, data)             → su autor o el administrador
 *   remove(id)                   → solo el administrador
 */

export { TIPOS_NOVEDAD };

const REGLAS = {
  tipo_novedad: (v) => (TIPOS_NOVEDAD.includes(v) ? null : 'Elige un tipo de novedad.'),
  descripcion: compose(validators.required('Describe la novedad.'), validators.minLength(10, 'Describe la novedad (mínimo 10 caracteres).'), validators.maxLength(1000)),
};

const withNames = (db, n) => {
  const p = db.personal.find((x) => x.id_personal === n.id_personal);
  return { ...n, responsable: p ? `${p.nombres} ${p.apellidos}` : '—', cargo: p?.cargo ?? null };
};

const mock = {
  tipos: () => mockRequest(() => TIPOS_NOVEDAD, { permiso: PERMISOS.REGISTRAR_NOVEDAD }),

  list: ({ tipo } = {}) =>
    mockRequest(
      ({ db }) =>
        db.novedad_operativa
          .filter((n) => !tipo || n.tipo_novedad === tipo)
          .sort((a, b) => b.fecha_registro.localeCompare(a.fecha_registro) || b.id_novedad - a.id_novedad)
          .map((n) => withNames(db, n)),
      { permiso: PERMISOS.REGISTRAR_NOVEDAD },
    ),

  get: (id) => mockRequest(({ db }) => withNames(db, findOr404(db.novedad_operativa, 'id_novedad', id, 'La novedad')), { permiso: PERMISOS.REGISTRAR_NOVEDAD }),

  create: (data) =>
    mockRequest(
      ({ db, user }) => {
        const row = pick(data, ['tipo_novedad', 'descripcion']);
        assertValid(row, REGLAS);
        if (!user.id_personal) throw forbidden('Solo el personal del centro registra novedades.');
        const novedad = { id_novedad: nextId(db.novedad_operativa, 'id_novedad'), id_personal: user.id_personal, ...row, fecha_registro: nowSql() };
        db.novedad_operativa.push(novedad);
        audit(db, user, 'CREAR', 'novedad_operativa', `Novedad #${novedad.id_novedad} (${novedad.tipo_novedad})`);
        return withNames(db, novedad);
      },
      { permiso: PERMISOS.REGISTRAR_NOVEDAD, write: true },
    ),

  update: (id, data) =>
    mockRequest(
      ({ db, user }) => {
        const novedad = findOr404(db.novedad_operativa, 'id_novedad', id, 'La novedad');
        if (novedad.id_personal !== user.id_personal && !can(user, PERMISOS.GESTIONAR_NOVEDADES)) throw forbidden('Solo quien registró la novedad o el administrador pueden editarla.');
        const cambios = pick(data, ['tipo_novedad', 'descripcion']);
        assertValid({ ...novedad, ...cambios }, REGLAS);
        Object.assign(novedad, cambios);
        audit(db, user, 'ACTUALIZAR', 'novedad_operativa', `Novedad #${novedad.id_novedad}`);
        return withNames(db, novedad);
      },
      { permiso: PERMISOS.REGISTRAR_NOVEDAD, write: true },
    ),

  remove: (id) =>
    mockRequest(
      ({ db, user }) => {
        const novedad = findOr404(db.novedad_operativa, 'id_novedad', id, 'La novedad');
        db.novedad_operativa.splice(db.novedad_operativa.indexOf(novedad), 1);
        audit(db, user, 'ELIMINAR', 'novedad_operativa', `Novedad #${novedad.id_novedad}`);
        return { id_novedad: novedad.id_novedad };
      },
      { permiso: PERMISOS.GESTIONAR_NOVEDADES, write: true },
    ),
};

const remote = {
  tipos: () => http.get('/novedades/tipos'),
  list: (params) => http.get('/novedades', params),
  get: (id) => http.get(`/novedades/${id}`),
  create: (data) => http.post('/novedades', data),
  update: (id, data) => http.put(`/novedades/${id}`, data),
  remove: (id) => http.delete(`/novedades/${id}`),
};

export const novedadesService = USE_MOCK ? mock : remote;
