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
import { Avatar, Button, getControl } from '../components/atoms/index.js';
import { FormField, confirmDialog } from '../components/molecules/index.js';
import { DataTable, openModalForm, patientQuickFields } from '../components/organisms/index.js';
import { pacientesService, colombiaService } from '../services/index.js';
import { createAppPage, loadInto } from './_shared/app-page.js';
import { crumbs, fullName, runAction, withFieldErrors } from './_shared/ui.js';
import { fichaUrl } from './_shared/citas.js';

const FUENTE_DIVIPOLA = 'Lista oficial DIVIPOLA (DANE) consultada en datos.gov.co.';
const FUENTE_LOCAL = 'Sin conexión con datos.gov.co: se usa la lista guardada en la aplicación.';

/** Reemplaza las opciones de un select; conserva `selected` aunque no venga en la lista (dato ya guardado). */
function setOptions(select, items, placeholder, selected = '') {
  const nombres = items.map((it) => it.nombre);
  if (selected && !nombres.includes(selected)) nombres.unshift(selected);
  select.replaceChildren(h('option', { value: '' }, placeholder), ...nombres.map((nombre) => h('option', { value: nombre }, nombre)));
  select.value = selected;
}

/**
 * Departamento → municipio con la API de Datos Abiertos (colombiaService). Al elegir el departamento se
 * consultan SUS municipios. El servicio nunca deja la lista vacía: usa caché o el respaldo local.
 */
function ubicacionFields(initial = {}) {
  const deptoField = FormField({ label: 'Departamento', name: 'departamento', as: 'select', optional: true, disabled: true, options: [{ value: '', label: 'Cargando departamentos…' }], hint: FUENTE_DIVIPOLA });
  const mpioField = FormField({ label: 'Municipio', name: 'municipio', as: 'select', optional: true, disabled: true, options: [{ value: '', label: 'Primero elija el departamento' }] });
  const depto = getControl(deptoField);
  const mpio = getControl(mpioField);
  const hint = deptoField.querySelector('.field__hint');
  const codigos = new Map(); // nombre del departamento → código DANE (para pedir sus municipios)
  let turno = 0; // si el usuario cambia rápido de departamento, solo vale la ÚLTIMA respuesta

  const avisarOrigen = (origen) => (hint.textContent = origen === 'local' ? FUENTE_LOCAL : FUENTE_DIVIPOLA);

  async function cargarMunicipios(selected = '') {
    const mio = ++turno;
    const codigo = codigos.get(depto.value);
    mpio.disabled = true;
    if (!codigo) return setOptions(mpio, [], depto.value ? 'Municipio no disponible' : 'Primero elija el departamento', selected);
    setOptions(mpio, [], 'Cargando municipios…');
    try {
      const { items, origen } = await colombiaService.municipios(codigo);
      if (mio !== turno) return;
      setOptions(mpio, items, 'Seleccione el municipio…', selected);
      mpio.disabled = false;
      avisarOrigen(origen);
    } catch {
      if (mio === turno) setOptions(mpio, [], 'No se pudo cargar la lista', selected);
    }
  }

  depto.addEventListener('change', () => cargarMunicipios());

  colombiaService
    .departamentos()
    .then(({ items, origen }) => {
      for (const it of items) codigos.set(it.nombre, it.codigo);
      setOptions(depto, items, 'Seleccione el departamento…', initial.departamento ?? '');
      depto.disabled = false;
      avisarOrigen(origen);
      if (initial.departamento) cargarMunicipios(initial.municipio ?? '');
    })
    .catch(() => {
      // Mientras el select siga deshabilitado no viaja en el formulario: el dato guardado no se pierde.
      hint.textContent = 'No se pudo cargar la lista de departamentos.';
    });

  return [deptoField, mpioField];
}

/** Formulario completo: los campos del alta rápida + ubicación (API DIVIPOLA), dirección y EPS. */
function pacienteFields(initial = {}) {
  const grid = patientQuickFields(initial);
  grid.append(
    ...ubicacionFields(initial),
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
