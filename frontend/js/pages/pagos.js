/**
 * Pagos (RF-PAG-01…04) — pages/admin/pagos.html, pages/asistente/pagos.html y pages/paciente/mis-pagos.html.
 *
 *  - Personal con REGISTRAR_PAGO: registra ventas (contado o crédito en cuotas) y abonos.
 *  - Paciente: ve SOLO sus ventas, sus abonos y su saldo (el servicio filtra por la sesión).
 * Los montos son pesos enteros: así se evitan errores de redondeo (0.1 + 0.2 !== 0.3).
 */
import { h } from '../core/dom.js';
import { formatCOP, formatDate } from '../core/format.js';
import { can, PERMISOS } from '../core/permissions.js';
import { Button, StatusBadge } from '../components/atoms/index.js';
import { FormField, KpiCard, toast } from '../components/molecules/index.js';
import { DataTable, openModalForm } from '../components/organisms/index.js';
import { ventasService, pacientesService } from '../services/index.js';
import { createAppPage, loadInto, errorMessage } from './_shared/app-page.js';
import { card, crumbs, dataList, fechaHora, fullName, runAction, withFieldErrors } from './_shared/ui.js';

const CONFIG = {
  ADMINISTRADOR: { activeId: 'pagos', title: 'Pagos', subtitle: 'Ventas, abonos y saldos por cobrar.' },
  RECEPCIONISTA: { activeId: 'pagos', title: 'Pagos', subtitle: 'Registra ventas y abonos de los pacientes.' },
  PACIENTE: { activeId: 'pagos', title: 'Mis pagos', subtitle: 'Tus tratamientos, abonos y saldo pendiente.' },
};

const MODALIDADES = [
  { value: 'CONTADO', label: 'Contado (un pago)' },
  { value: 'CREDITO', label: 'Crédito (en cuotas)' },
];

const kpis = (r, esPaciente) => [
  KpiCard({ label: esPaciente ? 'Saldo pendiente' : 'Saldo por cobrar', value: formatCOP(r.saldo_pendiente), icon: 'dollar', tone: r.saldo_pendiente ? 'warning' : 'success' }),
  KpiCard({ label: 'Ventas pendientes', value: r.ventas_pendientes, icon: 'credit-card', tone: 'info' }),
  KpiCard({ label: esPaciente ? 'Abonado hoy' : 'Recaudado hoy', value: formatCOP(r.recaudado_hoy), icon: 'check-circle', tone: 'success' }),
];

async function init() {
  const role = document.body.dataset.role;
  const cfg = CONFIG[role];
  const page = createAppPage({ role, activeId: cfg.activeId, title: cfg.title, subtitle: cfg.subtitle });
  if (!page) return;
  const { user, layout } = page;
  const esPaciente = user.rol === 'PACIENTE';
  const registra = can(user, PERMISOS.REGISTRAR_PAGO);
  layout.update({ breadcrumbs: crumbs(user, { label: cfg.title }) });

  const data = await loadInto(
    layout,
    async () => {
      const [ventas, resumen, metodos, pacientes] = await Promise.all([ventasService.list(), ventasService.resumen(), ventasService.metodos(), registra ? pacientesService.list() : []]);
      return { ventas, resumen, metodos, pacientes };
    },
    'Cargando pagos…',
  );
  if (!data) return;

  const kpiRow = h('div', { class: 'page-kpis' }, kpis(data.resumen, esPaciente));
  async function reload() {
    const [ventas, resumen] = await Promise.all([ventasService.list(), ventasService.resumen()]);
    table.setRows(ventas);
    kpiRow.replaceChildren(...kpis(resumen, esPaciente));
  }

  const metodoOptions = data.metodos.map((m) => ({ value: m.id_metodo, label: m.descripcion ? `${m.nombre_metodo.replace(/_/g, ' ').toLowerCase()} · ${m.descripcion}` : m.nombre_metodo }));

  async function nuevaVenta() {
    let cuotasField;
    const saved = await openModalForm({
      title: 'Registrar venta',
      description: 'El valor total del tratamiento y cómo se va a pagar.',
      submitLabel: 'Registrar venta',
      fields: () => {
        cuotasField = FormField({ label: 'Número de cuotas', name: 'numero_cuotas', type: 'number', min: 2, max: 24, value: 2, hint: 'Entre 2 y 24.' });
        cuotasField.hidden = true;
        return h(
          'div',
          { class: 'form-grid' },
          FormField({
            label: 'Paciente',
            name: 'id_paciente',
            as: 'select',
            required: true,
            placeholder: 'Seleccione el paciente…',
            options: [...data.pacientes].sort((a, b) => fullName(a).localeCompare(fullName(b), 'es')).map((p) => ({ value: p.id_paciente, label: `${fullName(p)} · ${p.numero_documento}` })),
          }),
          FormField({ label: 'Valor total (COP)', name: 'monto_total', type: 'number', inputmode: 'numeric', min: 1, step: 1000, required: true, validate: (v) => (Number(v) > 0 ? null : 'Debe ser mayor a 0.') }),
          FormField({
            label: 'Modalidad',
            name: 'modalidad_pago',
            as: 'select',
            required: true,
            value: 'CONTADO',
            options: MODALIDADES,
            onChange: (e) => (cuotasField.hidden = e.target.value !== 'CREDITO'),
          }),
          cuotasField,
        );
      },
      onSubmit: withFieldErrors((d) => ventasService.create(d)),
    });
    if (saved) await runAction(reload, `${saved.paciente_nombre} · ${formatCOP(saved.monto_total)}`, 'Venta registrada');
  }

  async function abonar(v) {
    const result = await openModalForm({
      title: `Registrar abono · venta #${v.id_venta}`,
      description: `${v.paciente_nombre} · saldo pendiente ${formatCOP(v.saldo_pendiente)}`,
      submitLabel: 'Registrar abono',
      fields: () =>
        h(
          'div',
          { class: 'form-grid' },
          FormField({
            label: 'Valor del abono (COP)',
            name: 'monto_abonado',
            type: 'number',
            inputmode: 'numeric',
            min: 1,
            max: v.saldo_pendiente,
            step: 1,
            required: true,
            value: v.modalidad_pago === 'CONTADO' ? v.saldo_pendiente : undefined,
            validate: (x) => (Number(x) > 0 && Number(x) <= v.saldo_pendiente ? null : `Entre $1 y ${formatCOP(v.saldo_pendiente)}.`),
          }),
          FormField({ label: 'Método de pago', name: 'id_metodo', as: 'select', required: true, placeholder: 'Seleccione…', options: metodoOptions }),
        ),
      onSubmit: withFieldErrors((d) => ventasService.registrarAbono(v.id_venta, d)),
    });
    if (result) await runAction(reload, result.venta.saldo_pendiente ? `Saldo pendiente: ${formatCOP(result.venta.saldo_pendiente)}.` : 'La venta quedó pagada.', 'Abono registrado');
  }

  async function detalle(v) {
    const venta = await ventasService.get(v.id_venta).catch((error) => toast.error(errorMessage(error)));
    if (!venta) return;
    await openModalForm({
      title: `Venta #${venta.id_venta}`,
      description: esPaciente ? undefined : venta.paciente_nombre,
      size: 'lg',
      submitLabel: 'Cerrar',
      cancelLabel: 'Volver',
      fields: () => [
        dataList([
          ['Fecha', formatDate(venta.fecha_venta)],
          ['Modalidad', venta.modalidad_pago === 'CREDITO' ? `Crédito · ${venta.numero_cuotas} cuotas` : 'Contado'],
          ['Valor total', formatCOP(venta.monto_total)],
          ['Pagado', formatCOP(venta.monto_pagado)],
          ['Saldo', formatCOP(venta.saldo_pendiente)],
          ['Estado', StatusBadge(venta.estado_venta, { size: 'sm' })],
        ]),
        h('h3', { class: 'card__title' }, 'Abonos'),
        venta.pagos.length
          ? h(
              'ul',
              { class: 'item-list', role: 'list' },
              venta.pagos.map((p) =>
                h(
                  'li',
                  { class: 'item-list__item' },
                  h('span', { class: 'item-list__main' }, h('span', { class: 'item-list__title' }, formatCOP(p.monto_abonado)), h('span', { class: 'item-list__meta' }, `Cuota ${p.numero_cuota_actual} · ${p.metodo.replace(/_/g, ' ').toLowerCase()}`)),
                  h('span', { class: 'item-list__aside' }, fechaHora(p.fecha_pago)),
                ),
              ),
            )
          : h('p', { class: 'item-list__empty' }, 'Aún no hay abonos.'),
      ],
    });
  }

  const table = DataTable({
    caption: esPaciente ? 'Mis ventas' : 'Ventas',
    rows: data.ventas,
    rowKey: 'id_venta',
    rowLabel: (v) => `venta #${v.id_venta}`,
    initialSort: { key: 'fecha', dir: 'desc' },
    filter: { label: 'Filtrar por estado', key: 'estado_venta', options: [{ value: 'PENDIENTE', label: 'Pendientes' }, { value: 'PAGADO', label: 'Pagadas' }] },
    search: esPaciente ? undefined : { label: 'Buscar venta', placeholder: 'Paciente o número de venta…', keys: ['paciente_nombre', (v) => String(v.id_venta)] },
    toolbar: registra ? [Button({ label: 'Registrar venta', icon: 'plus', onClick: nuevaVenta })] : [],
    columns: [
      { key: 'id_venta', label: 'N.º', sortable: true },
      !esPaciente && { key: 'paciente_nombre', label: 'Paciente', sortable: true },
      { key: 'fecha', label: 'Fecha', sortable: true, value: (v) => v.fecha_venta, render: (v) => formatDate(v.fecha_venta) },
      { key: 'modalidad', label: 'Modalidad', value: (v) => (v.modalidad_pago === 'CREDITO' ? `Crédito (${v.numero_cuotas})` : 'Contado') },
      { key: 'total', label: 'Total', align: 'right', sortable: true, value: (v) => v.monto_total, render: (v) => formatCOP(v.monto_total) },
      { key: 'saldo', label: 'Saldo', align: 'right', sortable: true, value: (v) => v.saldo_pendiente, render: (v) => formatCOP(v.saldo_pendiente) },
      { key: 'estado', label: 'Estado', sortable: true, value: (v) => v.estado_venta, render: (v) => StatusBadge(v.estado_venta, { size: 'sm' }) },
    ].filter(Boolean),
    actions: (v) => [
      { icon: 'eye', label: 'Ver detalle y abonos', onClick: () => detalle(v) },
      registra && v.estado_venta === 'PENDIENTE' && { icon: 'dollar', label: 'Registrar abono', onClick: () => abonar(v) },
    ].filter(Boolean),
    emptyMessage: esPaciente ? 'No tienes ventas registradas.' : 'No hay ventas con esos filtros.',
  });

  layout.setContent(kpiRow, card({ title: esPaciente ? 'Mis tratamientos y abonos' : 'Ventas registradas' }, table));
}

init();
