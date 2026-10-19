import { USE_MOCK } from '../core/config.js';
import { PERMISOS, can } from '../core/permissions.js';
import { http } from './http.js';
import { ApiError } from './api-error.js';
import { mockRequest, findOr404, nextId, nowSql, pick, audit, assertOwnPaciente, forbidden, nombrePacienteDb } from './mock/db.js';

/**
 * Servicio de ventas y pagos/abonos (RF-PAG-01…04; tablas `venta`, `pago_venta`, `metodo_pago`).
 *
 *   metodos()                         → métodos de pago
 *   list({ id_paciente, estado })     → ventas con nombre del paciente (el PACIENTE solo ve las suyas)
 *   get(id)                           → venta + sus pagos
 *   create(data)                      → venta (plan de pago CONTADO o CREDITO en cuotas)
 *   registrarAbono(idVenta, data)     → abono ≤ saldo; si el saldo llega a 0 la venta queda PAGADO
 *   resumen()                         → totales para los dashboards (RF-PAG-04)
 *
 * Los montos se manejan en pesos enteros (COP no usa centavos en la práctica) para evitar errores de
 * redondeo de punto flotante (0.1 + 0.2 !== 0.3).
 */

const recalcular = (venta) => {
  venta.saldo_pendiente = venta.monto_total - venta.monto_pagado; // columna GENERADA en MySQL
  venta.estado_venta = venta.saldo_pendiente <= 0 ? 'PAGADO' : 'PENDIENTE';
  return venta;
};

const withNames = (db, venta) => ({ ...venta, paciente_nombre: nombrePacienteDb(db, venta.id_paciente) });

const pagosDe = (db, idVenta) =>
  db.pago_venta
    .filter((p) => p.id_venta === idVenta)
    .map((p) => ({ ...p, metodo: db.metodo_pago.find((m) => m.id_metodo === p.id_metodo)?.nombre_metodo ?? '—' }))
    .sort((a, b) => a.fecha_pago.localeCompare(b.fecha_pago));

const pesos = (value) => Math.round(Number(value));

/** Ver ventas: el personal con REGISTRAR_PAGO, o el paciente (solo las suyas). */
function assertCanRead(user) {
  if (user.rol !== 'PACIENTE' && !can(user, PERMISOS.REGISTRAR_PAGO)) throw forbidden('No tienes permiso para ver pagos.');
}

const mock = {
  metodos: () => mockRequest(({ db }) => db.metodo_pago),

  list: ({ id_paciente, estado } = {}) =>
    mockRequest(({ db, user }) => {
      assertCanRead(user);
      const propio = user.rol === 'PACIENTE' ? user.id_paciente : id_paciente && Number(id_paciente);
      return db.venta
        .filter((v) => (!propio || v.id_paciente === propio) && (!estado || v.estado_venta === estado))
        .sort((a, b) => b.fecha_venta.localeCompare(a.fecha_venta))
        .map((v) => withNames(db, v));
    }),

  get: (id) =>
    mockRequest(({ db, user }) => {
      assertCanRead(user);
      const venta = findOr404(db.venta, 'id_venta', id, 'La venta');
      assertOwnPaciente(user, venta.id_paciente);
      return { ...withNames(db, venta), pagos: pagosDe(db, venta.id_venta) };
    }),

  create: (data) =>
    mockRequest(
      ({ db, user }) => {
        const row = pick(data, ['id_paciente', 'monto_total', 'modalidad_pago', 'numero_cuotas']);
        const fields = {};
        const monto = pesos(row.monto_total);
        const cuotas = row.modalidad_pago === 'CONTADO' ? 1 : Number(row.numero_cuotas);
        if (!(monto > 0)) fields.monto_total = 'El monto debe ser mayor a 0.';
        if (!['CONTADO', 'CREDITO'].includes(row.modalidad_pago)) fields.modalidad_pago = 'Elige contado o crédito.';
        else if (row.modalidad_pago === 'CREDITO' && !(Number.isInteger(cuotas) && cuotas >= 2 && cuotas <= 24)) fields.numero_cuotas = 'Entre 2 y 24 cuotas.';
        if (Object.keys(fields).length) throw new ApiError(400, 'Revisa los datos marcados.', { fields, code: 'VALIDATION' });
        findOr404(db.paciente, 'id_paciente', row.id_paciente, 'El paciente');

        const venta = recalcular({
          id_venta: nextId(db.venta, 'id_venta'),
          id_paciente: Number(row.id_paciente),
          monto_total: monto,
          monto_pagado: 0,
          modalidad_pago: row.modalidad_pago,
          numero_cuotas: cuotas,
          estado_venta: 'PENDIENTE',
          fecha_venta: nowSql(),
        });
        db.venta.push(venta);
        audit(db, user, 'CREAR', 'venta', `Venta #${venta.id_venta} por ${monto}`);
        return withNames(db, venta);
      },
      { permiso: PERMISOS.REGISTRAR_PAGO, write: true },
    ),

  registrarAbono: (idVenta, data) =>
    mockRequest(
      ({ db, user }) => {
        const venta = findOr404(db.venta, 'id_venta', idVenta, 'La venta');
        const monto = pesos(data?.monto_abonado);
        const idMetodo = Number(data?.id_metodo);
        if (venta.estado_venta === 'PAGADO') throw new ApiError(409, 'Esta venta ya está pagada.', { code: 'ALREADY_PAID' });
        if (!db.metodo_pago.some((m) => m.id_metodo === idMetodo)) throw new ApiError(400, 'Elige un método de pago.', { fields: { id_metodo: 'Elige un método de pago.' }, code: 'VALIDATION' });
        if (!(monto > 0)) throw new ApiError(400, 'El abono debe ser mayor a 0.', { fields: { monto_abonado: 'Debe ser mayor a 0.' }, code: 'VALIDATION' });
        if (monto > venta.saldo_pendiente) {
          throw new ApiError(422, 'El abono supera el saldo pendiente.', { fields: { monto_abonado: `El saldo es ${venta.saldo_pendiente}.` }, code: 'EXCEEDS_BALANCE' });
        }
        const pago = {
          id_pago: nextId(db.pago_venta, 'id_pago'),
          id_venta: venta.id_venta,
          id_metodo: idMetodo,
          monto_abonado: monto,
          numero_cuota_actual: db.pago_venta.filter((p) => p.id_venta === venta.id_venta).length + 1,
          fecha_pago: nowSql(),
        };
        db.pago_venta.push(pago);
        venta.monto_pagado += monto;
        recalcular(venta);
        audit(db, user, 'ABONO', 'pago_venta', `Venta #${venta.id_venta}: abono ${monto}, saldo ${venta.saldo_pendiente}`);
        return { venta: { ...withNames(db, venta), pagos: pagosDe(db, venta.id_venta) }, pago };
      },
      { permiso: PERMISOS.REGISTRAR_PAGO, write: true },
    ),

  resumen: () =>
    mockRequest(({ db, user }) => {
      assertCanRead(user);
      const ventas = user.rol === 'PACIENTE' ? db.venta.filter((v) => v.id_paciente === user.id_paciente) : db.venta;
      const ids = new Set(ventas.map((v) => v.id_venta));
      const hoy = nowSql().slice(0, 10);
      const pendientes = ventas.filter((v) => v.estado_venta === 'PENDIENTE');
      return {
        ventas_pendientes: pendientes.length,
        saldo_pendiente: pendientes.reduce((sum, v) => sum + v.saldo_pendiente, 0),
        recaudado_hoy: db.pago_venta.filter((p) => ids.has(p.id_venta) && p.fecha_pago.startsWith(hoy)).reduce((sum, p) => sum + p.monto_abonado, 0),
      };
    }),
};

const remote = {
  metodos: () => http.get('/metodos-pago'),
  list: (params) => http.get('/ventas', params),
  get: (id) => http.get(`/ventas/${id}`),
  create: (data) => http.post('/ventas', data),
  registrarAbono: (idVenta, data) => http.post(`/ventas/${idVenta}/pagos`, data),
  resumen: () => http.get('/ventas/resumen'),
};

export const ventasService = USE_MOCK ? mock : remote;
