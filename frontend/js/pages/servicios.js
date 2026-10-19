/**
 * Tratamientos (catálogo `servicio`, RF-TRA-*) — pages/admin/servicios.html.
 * Un tratamiento ya usado en citas no se elimina (409): se inactiva para que no se ofrezca en citas nuevas.
 */
import { h } from '../core/dom.js';
import { validators } from '../core/validators.js';
import { formatCOP } from '../core/format.js';
import { Button, StatusBadge } from '../components/atoms/index.js';
import { FormField, confirmDialog } from '../components/molecules/index.js';
import { DataTable, openModalForm } from '../components/organisms/index.js';
import { serviciosService } from '../services/index.js';
import { createAppPage, loadInto } from './_shared/app-page.js';
import { crumbs, runAction, withFieldErrors } from './_shared/ui.js';

const precioValido = (v) => (Number(v) > 0 ? null : 'El precio debe ser mayor a 0.');

const servicioFields = (s = {}) =>
  h(
    'div',
    { class: 'form-grid' },
    FormField({ label: 'Código', name: 'codigo_servicio', required: true, value: s.codigo_servicio, hint: 'Ej. SERV-006 (mayúsculas, números y guiones).', validate: validators.pattern(/^[A-Z0-9-]{3,20}$/, 'Usa mayúsculas, números y guiones (3 a 20).') }),
    FormField({ label: 'Nombre', name: 'nombre_servicio', required: true, value: s.nombre_servicio, validate: validators.maxLength(100) }),
    FormField({ label: 'Precio base (COP)', name: 'precio_base', type: 'number', inputmode: 'numeric', min: 1, step: 1000, required: true, value: s.precio_base, validate: precioValido }),
    FormField({ label: 'Descripción', name: 'descripcion', as: 'textarea', rows: 2, optional: true, value: s.descripcion, validate: validators.maxLength(255) }),
  );

async function init() {
  const page = createAppPage({ activeId: 'servicios', title: 'Tratamientos', subtitle: 'Catálogo de servicios que se ofrecen al agendar y se cobran en las ventas.' });
  if (!page) return;
  const { user, layout } = page;
  layout.update({ breadcrumbs: crumbs(user, { label: 'Tratamientos' }) });

  const rows = await loadInto(layout, () => serviciosService.list(), 'Cargando tratamientos…');
  if (!rows) return;
  const reload = async () => table.setRows(await serviciosService.list());

  async function editar(s) {
    const saved = await openModalForm({
      title: s ? `Editar ${s.nombre_servicio}` : 'Nuevo tratamiento',
      submitLabel: s ? 'Guardar cambios' : 'Crear tratamiento',
      fields: () => servicioFields(s ?? {}),
      onSubmit: withFieldErrors((data) => (s ? serviciosService.update(s.id_servicio, data) : serviciosService.create(data))),
    });
    if (saved) await runAction(reload, saved.nombre_servicio, s ? 'Tratamiento actualizado' : 'Tratamiento creado');
  }

  async function cambiarEstado(s) {
    const activar = s.estado !== 'ACTIVO';
    await runAction(async () => (await serviciosService.cambiarEstado(s.id_servicio, activar ? 'ACTIVO' : 'INACTIVO'), reload()), activar ? `${s.nombre_servicio} se ofrece de nuevo al agendar.` : `${s.nombre_servicio} ya no se ofrece en citas nuevas.`);
  }

  async function eliminar(s) {
    const ok = await confirmDialog({
      title: 'Eliminar tratamiento',
      message: `¿Eliminar "${s.nombre_servicio}"? Si ya se usó en citas no se podrá eliminar; en ese caso, inactívalo.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      icon: 'trash',
    });
    if (ok) await runAction(async () => (await serviciosService.remove(s.id_servicio), reload()), 'Tratamiento eliminado.');
  }

  const table = DataTable({
    caption: 'Catálogo de tratamientos',
    rows,
    rowKey: 'id_servicio',
    rowLabel: (s) => s.nombre_servicio,
    initialSort: { key: 'codigo_servicio', dir: 'asc' },
    search: { label: 'Buscar tratamiento', placeholder: 'Código o nombre…', keys: ['codigo_servicio', 'nombre_servicio', 'descripcion'] },
    filter: { label: 'Filtrar por estado', key: 'estado', options: [{ value: 'ACTIVO', label: 'Activos' }, { value: 'INACTIVO', label: 'Inactivos' }] },
    toolbar: [Button({ label: 'Nuevo tratamiento', icon: 'plus', onClick: () => editar(null) })],
    columns: [
      { key: 'codigo_servicio', label: 'Código', sortable: true },
      { key: 'nombre_servicio', label: 'Tratamiento', sortable: true },
      { key: 'descripcion', label: 'Descripción', value: (s) => s.descripcion ?? '—' },
      { key: 'precio_base', label: 'Precio base', sortable: true, align: 'right', render: (s) => formatCOP(s.precio_base) },
      { key: 'estado', label: 'Estado', sortable: true, render: (s) => StatusBadge(s.estado, { size: 'sm' }) },
    ],
    actions: (s) => [
      { icon: 'edit', label: 'Editar', onClick: () => editar(s) },
      s.estado === 'ACTIVO' ? { icon: 'eye-off', label: 'Inactivar', onClick: () => cambiarEstado(s) } : { icon: 'eye', label: 'Activar', onClick: () => cambiarEstado(s) },
      { icon: 'trash', label: 'Eliminar', variant: 'danger', onClick: () => eliminar(s) },
    ],
  });

  layout.setContent(table);
}

init();
