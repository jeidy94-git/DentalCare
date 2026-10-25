/**
 * Pagos (RF-PAG-01…04) — pages/admin/pagos.html, pages/asistente/pagos.html y pages/paciente/mis-pagos.html.
 *
 *  - Personal con REGISTRAR_PAGO: registra ventas (contado o crédito en cuotas) y abonos.
 *  - Paciente: ve SOLO sus ventas, sus abonos y su saldo (el servicio filtra por la sesión).
 *  - Cada venta es de un tratamiento (venta.id_servicio, B-11): se muestra en la tabla, al abonar y en el comprobante.
 * Los montos son pesos enteros: así se evitan errores de redondeo (0.1 + 0.2 !== 0.3).
 */
import { h } from '../core/dom.js';
import { formatCOP, formatCOPDecimal, formatDate, formatUSD } from '../core/format.js';
import { can, PERMISOS } from '../core/permissions.js';
import { Button, StatusBadge } from '../components/atoms/index.js';
import { FormField, KpiCard, toast } from '../components/molecules/index.js';
import { DataTable, openModalForm } from '../components/organisms/index.js';
import { ventasService, pacientesService, serviciosService, trmService } from '../services/index.js';
import { createAppPage, loadInto, errorMessage } from './_shared/app-page.js';
import { card, crumbs, dataList, fechaHora, fullName, notice, runAction, withFieldErrors } from './_shared/ui.js';

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

/**
 * Tarjeta "Equivalencia en dólares": TRM del día (trmService, API externa) + saldos en USD + conversor
 * para presupuestos de pacientes internacionales. Se carga APARTE de los pagos: si la API externa falla,
 * la página de pagos funciona igual y solo esta tarjeta muestra el aviso.
 */
function trmPanel(esPaciente) {
  const body = h('div', { class: 'trm', 'aria-live': 'polite' }, h('p', { class: 'trm__meta' }, 'Consultando la TRM del día…'));
  let trm = null;
  let resumen = null;
  let conversor = null; // se crea una sola vez: al recargar los saldos no se borra lo que el usuario escribió

  const converter = () => {
    const out = h('output', { class: 'trm__result', for: 'trm-cop' }, formatUSD(0));
    const field = FormField({
      label: 'Valor del presupuesto (COP)',
      id: 'trm-cop',
      name: 'trm_cop',
      type: 'number',
      inputmode: 'numeric',
      min: 0,
      step: 1000,
      placeholder: 'Ej.: 1500000',
      onInput: (e) => out.replaceChildren(formatUSD(trmService.aUSD(Math.max(0, Number(e.target.value) || 0), trm))),
    });
    return h('div', { class: 'trm__converter' }, field, h('p', { class: 'trm__equals' }, 'Equivale a ', out));
  };

  function paint() {
    if (!trm) return;
    const saldos = resumen && [
      [esPaciente ? 'Saldo pendiente' : 'Saldo por cobrar', `${formatUSD(trmService.aUSD(resumen.saldo_pendiente, trm))}`],
      [esPaciente ? 'Abonado hoy' : 'Recaudado hoy', `${formatUSD(trmService.aUSD(resumen.recaudado_hoy, trm))}`],
    ];
    conversor ??= converter();
    // replaceChildren es del DOM (no de h()): un `false` se volvería el texto "false", por eso el filter.
    const parts = [
      trm.desactualizada && notice(`No se pudo actualizar la tasa: se muestra la última consultada (vigente desde ${formatDate(trm.vigenteDesde)}).`, 'warning'),
      h('p', { class: 'trm__rate' }, '1 USD = ', h('strong', {}, formatCOPDecimal(trm.valor))),
      h('p', { class: 'trm__meta' }, `${trm.vigenteDesde ? `Vigente desde ${formatDate(trm.vigenteDesde)} · ` : ''}Fuente: ${trm.fuente}`),
      saldos && dataList(saldos),
      conversor,
    ];
    body.replaceChildren(...parts.filter(Boolean));
  }

  function load() {
    body.replaceChildren(h('p', { class: 'trm__meta' }, 'Consultando la TRM del día…'));
    trmService
      .actual()
      .then((value) => ((trm = value), paint()))
      .catch(() =>
        body.replaceChildren(
          notice('No fue posible consultar la TRM en este momento. Los pagos se siguen registrando en pesos.', 'warning'),
          Button({ label: 'Reintentar', icon: 'activity', variant: 'outline', size: 'sm', onClick: load }),
        ),
      );
  }
  load();

  return {
    el: card({ title: 'Equivalencia en dólares (USD)', subtitle: 'Referencia para pacientes internacionales con la TRM del día. Los pagos se registran en pesos.' }, body),
    setResumen: (r) => ((resumen = r), paint()),
    /** Valor en USD como texto, o null si aún no hay TRM. */
    usd: (cop) => (trm ? `${formatUSD(trmService.aUSD(cop, trm))} (TRM ${formatCOPDecimal(trm.valor)})` : null),
  };
}

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
      const [ventas, resumen, metodos, pacientes, servicios] = await Promise.all([
        ventasService.list(),
        ventasService.resumen(),
        ventasService.metodos(),
        registra ? pacientesService.list() : [],
        registra ? serviciosService.list({ soloActivos: true }) : [],
      ]);
      return { ventas, resumen, metodos, pacientes, servicios };
    },
    'Cargando pagos…',
  );
  if (!data) return;

  const kpiRow = h('div', { class: 'page-kpis' }, kpis(data.resumen, esPaciente));
  const trm = trmPanel(esPaciente);
  trm.setResumen(data.resumen);
  async function reload() {
    const [ventas, resumen] = await Promise.all([ventasService.list(), ventasService.resumen()]);
    table.setRows(ventas);
    kpiRow.replaceChildren(...kpis(resumen, esPaciente));
    trm.setResumen(resumen);
  }

  const metodoOptions = data.metodos.map((m) => ({ value: m.id_metodo, label: m.descripcion ? `${m.nombre_metodo.replace(/_/g, ' ').toLowerCase()} · ${m.descripcion}` : m.nombre_metodo }));

  /** Resumen de la venta que se está pagando (modal de abono y comprobante). */
  const resumenVenta = (v) => [
    ['Tratamiento', v.servicio_nombre],
    !esPaciente && ['Paciente', v.paciente_nombre],
    ['Valor total', formatCOP(v.monto_total)],
    ['Pagado', formatCOP(v.monto_pagado)],
    ['Saldo pendiente', formatCOP(v.saldo_pendiente)],
  ].filter(Boolean);

  async function nuevaVenta() {
    let cuotasField;
    let montoField;
    const saved = await openModalForm({
      title: 'Registrar venta',
      description: 'El valor total del tratamiento y cómo se va a pagar.',
      submitLabel: 'Registrar venta',
      fields: () => {
        cuotasField = FormField({ label: 'Número de cuotas', name: 'numero_cuotas', type: 'number', min: 2, max: 24, value: 2, hint: 'Entre 2 y 24.' });
        cuotasField.hidden = true;
        montoField = FormField({ label: 'Valor total (COP)', name: 'monto_total', type: 'number', inputmode: 'numeric', min: 1, step: 1000, required: true, hint: 'Se sugiere el precio base del tratamiento; puedes ajustarlo.', validate: (v) => (Number(v) > 0 ? null : 'Debe ser mayor a 0.') });
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
          FormField({
            label: 'Tratamiento',
            name: 'id_servicio',
            as: 'select',
            required: true,
            placeholder: 'Seleccione el tratamiento…',
            options: data.servicios.map((s) => ({ value: s.id_servicio, label: `${s.nombre_servicio} · ${formatCOP(s.precio_base)}` })),
            onChange: (e) => {
              const servicio = data.servicios.find((s) => s.id_servicio === Number(e.target.value));
              if (servicio) montoField._dcField.control.value = servicio.precio_base;
            },
          }),
          montoField,
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
    if (saved) await runAction(reload, `${saved.paciente_nombre} · ${saved.servicio_nombre} · ${formatCOP(saved.monto_total)}`, 'Venta registrada');
  }

  async function abonar(v) {
    const result = await openModalForm({
      title: `Registrar abono · venta #${v.id_venta}`,
      description: `${v.servicio_nombre ?? 'Tratamiento'} · ${v.paciente_nombre}`,
      submitLabel: 'Registrar abono',
      fields: () => [
        dataList(resumenVenta(v)),
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
      ],
      onSubmit: withFieldErrors((d) => ventasService.registrarAbono(v.id_venta, d)),
    });
    if (result) {
      const estado = result.venta.saldo_pendiente ? `saldo pendiente ${formatCOP(result.venta.saldo_pendiente)}.` : 'la venta quedó pagada.';
      await runAction(reload, `${result.venta.servicio_nombre}: ${estado}`, 'Abono registrado');
    }
  }

  async function detalle(v) {
    const venta = await ventasService.get(v.id_venta).catch((error) => toast.error(errorMessage(error)));
    if (!venta) return;
    await openModalForm({
      title: `Comprobante · venta #${venta.id_venta}`,
      description: venta.servicio_nombre ?? undefined,
      size: 'lg',
      submitLabel: 'Cerrar',
      cancelLabel: 'Volver',
      fields: () => [
        dataList([
          ['Tratamiento', venta.servicio_nombre],
          !esPaciente && ['Paciente', venta.paciente_nombre],
          ['Fecha', formatDate(venta.fecha_venta)],
          ['Modalidad', venta.modalidad_pago === 'CREDITO' ? `Crédito · ${venta.numero_cuotas} cuotas` : 'Contado'],
          ['Valor total', formatCOP(venta.monto_total)],
          ['Equivale a', trm.usd(venta.monto_total)],
          ['Pagado', formatCOP(venta.monto_pagado)],
          ['Saldo', formatCOP(venta.saldo_pendiente)],
          ['Estado', StatusBadge(venta.estado_venta, { size: 'sm' })],
        ].filter(Boolean)),
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
    search: esPaciente ? undefined : { label: 'Buscar venta', placeholder: 'Paciente, tratamiento o número de venta…', keys: ['paciente_nombre', 'servicio_nombre', (v) => String(v.id_venta)] },
    toolbar: registra ? [Button({ label: 'Registrar venta', icon: 'plus', onClick: nuevaVenta })] : [],
    columns: [
      { key: 'id_venta', label: 'N.º', sortable: true },
      !esPaciente && { key: 'paciente_nombre', label: 'Paciente', sortable: true },
      { key: 'servicio_nombre', label: 'Tratamiento', sortable: true, value: (v) => v.servicio_nombre ?? '—' },
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

  layout.setContent(kpiRow, trm.el, card({ title: esPaciente ? 'Mis tratamientos y abonos' : 'Ventas registradas' }, table));
}

init();
