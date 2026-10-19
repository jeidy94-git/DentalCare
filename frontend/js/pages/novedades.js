/**
 * Novedades operativas (RF-NOV-01/02) — pages/asistente/novedades.html y pages/doctor/novedades.html.
 * El responsable siempre es el usuario de la sesión (lo pone el servicio, no el formulario).
 * Cada quien edita SUS novedades; eliminar es solo del administrador.
 */
import { h } from '../core/dom.js';
import { validators, compose } from '../core/validators.js';
import { Badge, Button } from '../components/atoms/index.js';
import { FormField, confirmDialog } from '../components/molecules/index.js';
import { DataTable, openModalForm } from '../components/organisms/index.js';
import { novedadesService, TIPOS_NOVEDAD } from '../services/index.js';
import { createAppPage, loadInto } from './_shared/app-page.js';
import { crumbs, fechaHora, runAction, withFieldErrors } from './_shared/ui.js';

const tipoLabel = (tipo) => tipo.charAt(0) + tipo.slice(1).replace(/_/g, ' ').toLowerCase();
const TIPOS = TIPOS_NOVEDAD.map((t) => ({ value: t, label: tipoLabel(t) }));

const novedadFields = (n = {}) => [
  FormField({ label: 'Tipo de novedad', name: 'tipo_novedad', as: 'select', required: true, placeholder: 'Seleccione…', value: n.tipo_novedad, options: TIPOS }),
  FormField({
    label: 'Descripción',
    name: 'descripcion',
    as: 'textarea',
    rows: 4,
    required: true,
    value: n.descripcion,
    hint: 'Qué pasó, dónde (consultorio, equipo) y qué se necesita.',
    validate: compose(validators.minLength(10, 'Describe la novedad (mínimo 10 caracteres).'), validators.maxLength(1000)),
  }),
];

async function init() {
  const page = createAppPage({ activeId: 'novedades', title: 'Novedades', subtitle: 'Fallas de equipos, mantenimiento, inventario y soporte del sistema.' });
  if (!page) return;
  const { user, layout } = page;
  layout.update({ breadcrumbs: crumbs(user, { label: 'Novedades' }) });

  const rows = await loadInto(layout, () => novedadesService.list(), 'Cargando novedades…');
  if (!rows) return;
  const reload = async () => table.setRows(await novedadesService.list());
  const esAutor = (n) => n.id_personal === user.id_personal || user.rol === 'ADMINISTRADOR';

  async function editar(n) {
    const saved = await openModalForm({
      title: n ? 'Editar novedad' : 'Registrar novedad',
      description: n ? undefined : 'Quedará registrada a tu nombre con la fecha y hora actuales.',
      submitLabel: n ? 'Guardar cambios' : 'Registrar',
      fields: () => novedadFields(n ?? {}),
      onSubmit: withFieldErrors((data) => (n ? novedadesService.update(n.id_novedad, data) : novedadesService.create(data))),
    });
    if (saved) await runAction(reload, tipoLabel(saved.tipo_novedad), n ? 'Novedad actualizada' : 'Novedad registrada');
  }

  async function eliminar(n) {
    const ok = await confirmDialog({ title: 'Eliminar novedad', message: 'La novedad se eliminará del registro.', confirmLabel: 'Eliminar', variant: 'danger', icon: 'trash' });
    if (ok) await runAction(async () => (await novedadesService.remove(n.id_novedad), reload()), 'Novedad eliminada.');
  }

  const table = DataTable({
    caption: 'Novedades operativas',
    rows,
    rowKey: 'id_novedad',
    rowLabel: (n) => `novedad #${n.id_novedad}`,
    initialSort: { key: 'fecha', dir: 'desc' },
    search: { label: 'Buscar novedad', placeholder: 'Descripción o responsable…', keys: ['descripcion', 'responsable'] },
    filter: { label: 'Filtrar por tipo', key: 'tipo_novedad', options: TIPOS },
    toolbar: [Button({ label: 'Registrar novedad', icon: 'plus', onClick: () => editar(null) })],
    columns: [
      { key: 'fecha', label: 'Fecha', sortable: true, value: (n) => n.fecha_registro, render: (n) => fechaHora(n.fecha_registro) },
      { key: 'tipo', label: 'Tipo', sortable: true, value: (n) => n.tipo_novedad, render: (n) => Badge({ label: tipoLabel(n.tipo_novedad), size: 'sm', variant: 'info' }) },
      { key: 'descripcion', label: 'Descripción', className: 'cell-wrap' },
      { key: 'responsable', label: 'Responsable', sortable: true, render: (n) => h('span', {}, n.responsable, n.cargo && h('span', { class: 'cell-meta' }, n.cargo)) },
    ],
    actions: (n) =>
      [
        esAutor(n) && { icon: 'edit', label: 'Editar', onClick: () => editar(n) },
        user.rol === 'ADMINISTRADOR' && { icon: 'trash', label: 'Eliminar', variant: 'danger', onClick: () => eliminar(n) },
      ].filter(Boolean),
    emptyMessage: 'No hay novedades con esos filtros.',
  });

  layout.setContent(table);
}

init();
