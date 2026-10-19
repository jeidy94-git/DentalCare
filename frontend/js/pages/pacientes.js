/**
 * Pacientes (RF-PAC-01/02/03, HU-03) — pages/admin|asistente|doctor/pacientes.html.
 *
 *  - Administrador y recepción (GESTIONAR_PACIENTES): registrar, editar y eliminar.
 *  - Odontólogo: consulta la lista y abre la ficha clínica (historia.html?id=…).
 */
import { h } from '../core/dom.js';
import { validators } from '../core/validators.js';
import { formatDate } from '../core/format.js';
import { can, PERMISOS } from '../core/permissions.js';
import { Avatar, Button } from '../components/atoms/index.js';
import { FormField, confirmDialog } from '../components/molecules/index.js';
import { DataTable, openModalForm, patientQuickFields } from '../components/organisms/index.js';
import { pacientesService } from '../services/index.js';
import { createAppPage, loadInto } from './_shared/app-page.js';
import { crumbs, fullName, runAction, withFieldErrors } from './_shared/ui.js';
import { fichaUrl } from './_shared/citas.js';

/** Formulario completo: los campos del alta rápida + dirección y EPS. */
function pacienteFields(initial = {}) {
  const grid = patientQuickFields(initial);
  grid.append(
    FormField({ label: 'Dirección', name: 'direccion', optional: true, value: initial.direccion, validate: validators.maxLength(150) }),
    FormField({ label: 'EPS / aseguradora', name: 'eps_aseguradora', optional: true, value: initial.eps_aseguradora, validate: validators.maxLength(100) }),
  );
  return grid;
}

async function init() {
  const page = createAppPage({ activeId: 'pacientes', title: 'Pacientes' });
  if (!page) return;
  const { user, layout } = page;
  const gestiona = can(user, PERMISOS.GESTIONAR_PACIENTES);
  const esOdontologo = user.rol === 'ESPECIALISTA';

  layout.update({
    subtitle: gestiona ? 'Registro y datos de contacto de los pacientes del consultorio.' : 'Consulta los pacientes y abre su ficha clínica.',
    breadcrumbs: crumbs(user, { label: 'Pacientes' }),
  });

  const pacientes = await loadInto(layout, () => pacientesService.list(), 'Cargando pacientes…');
  if (!pacientes) return;

  const reload = async () => table.setRows(await pacientesService.list());

  async function editar(p) {
    const saved = await openModalForm({
      title: p ? `Editar a ${fullName(p)}` : 'Registrar paciente',
      description: p ? 'Actualiza los datos del paciente.' : 'Los campos marcados son obligatorios.',
      size: 'lg',
      submitLabel: p ? 'Guardar cambios' : 'Registrar paciente',
      fields: () => pacienteFields(p ?? {}),
      onSubmit: withFieldErrors((data) => (p ? pacientesService.update(p.id_paciente, data) : pacientesService.create(data))),
    });
    if (!saved) return;
    await runAction(reload, p ? 'Los datos del paciente se actualizaron.' : `${fullName(saved)} quedó registrado(a).`, p ? 'Paciente actualizado' : 'Paciente registrado');
  }

  async function eliminar(p) {
    const ok = await confirmDialog({
      title: 'Eliminar paciente',
      message: `Se eliminará a ${fullName(p)} y su historia clínica vacía. Si tiene citas o pagos registrados, no se podrá eliminar.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      icon: 'trash',
    });
    if (ok) await runAction(async () => (await pacientesService.remove(p.id_paciente), reload()), 'El paciente fue eliminado.');
  }

  const table = DataTable({
    caption: 'Pacientes registrados',
    rows: pacientes,
    rowKey: 'id_paciente',
    rowLabel: fullName,
    pageSize: 10,
    initialSort: { key: 'paciente', dir: 'asc' },
    search: { label: 'Buscar paciente', placeholder: 'Nombre, documento o correo…', keys: [fullName, 'numero_documento', 'email'] },
    toolbar: gestiona ? [Button({ label: 'Nuevo paciente', icon: 'plus', onClick: () => editar(null) })] : [],
    columns: [
      {
        key: 'paciente',
        label: 'Paciente',
        sortable: true,
        value: (p) => `${p.apellidos} ${p.nombres}`,
        render: (p) => h('span', { class: 'cell-person' }, Avatar({ name: fullName(p), size: 'sm' }), h('span', {}, fullName(p))),
      },
      { key: 'documento', label: 'Documento', value: (p) => `${p.tipo_documento} ${p.numero_documento}` },
      { key: 'telefono', label: 'Celular' },
      { key: 'email', label: 'Correo', value: (p) => p.email ?? '—' },
      { key: 'eps', label: 'EPS', value: (p) => p.eps_aseguradora ?? '—' },
      { key: 'registro', label: 'Registro', sortable: true, value: (p) => p.fecha_registro ?? '', render: (p) => (p.fecha_registro ? formatDate(p.fecha_registro) : '—') },
    ],
    actions: (p) =>
      [
        esOdontologo && { icon: 'file-text', label: 'Ver ficha clínica', onClick: () => location.assign(fichaUrl(p.id_paciente)) },
        gestiona && { icon: 'edit', label: 'Editar', onClick: () => editar(p) },
        gestiona && { icon: 'trash', label: 'Eliminar', variant: 'danger', onClick: () => eliminar(p) },
      ].filter(Boolean),
    emptyMessage: 'No hay pacientes que coincidan con la búsqueda.',
  });

  layout.setContent(table);
}

init();
