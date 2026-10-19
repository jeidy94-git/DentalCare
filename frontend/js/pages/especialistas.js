/**
 * Especialistas y horarios (RF-ESP-*, RN-02) — pages/admin/especialistas.html.
 * Crear un especialista crea también su usuario (rol ESPECIALISTA). No se eliminan: se inactivan,
 * porque tienen citas e historias asociadas.
 */
import { h } from '../core/dom.js';
import { validators } from '../core/validators.js';
import { describeSchedule } from '../core/agenda.js';
import { Avatar, Button, StatusBadge } from '../components/atoms/index.js';
import { FormField, PasswordField, confirmDialog, toast } from '../components/molecules/index.js';
import { DataTable, openModalForm, TIPOS_DOCUMENTO } from '../components/organisms/index.js';
import { especialistasService, DIAS_SEMANA } from '../services/index.js';
import { createAppPage, loadInto, errorMessage } from './_shared/app-page.js';
import { crumbs, runAction, withFieldErrors } from './_shared/ui.js';

const grid = (...fields) => h('div', { class: 'form-grid' }, fields);

function perfilFields(e = {}) {
  return [
    FormField({ label: 'Nombres', name: 'nombres', required: true, value: e.nombres, validate: validators.maxLength(100) }),
    FormField({ label: 'Apellidos', name: 'apellidos', required: true, value: e.apellidos, validate: validators.maxLength(100) }),
    FormField({ label: 'Celular', name: 'telefono', type: 'tel', inputmode: 'numeric', required: true, value: e.telefono, validate: validators.telefono() }),
    FormField({ label: 'Especialidad', name: 'especialidad', required: true, value: e.especialidad, validate: validators.maxLength(100) }),
    FormField({ label: 'Registro médico', name: 'registro_medico', required: true, value: e.registro_medico, validate: validators.maxLength(50) }),
  ];
}

const nuevoFields = () =>
  grid(
    ...perfilFields(),
    FormField({ label: 'Tipo de documento', name: 'tipo_documento', as: 'select', required: true, placeholder: 'Seleccione…', options: TIPOS_DOCUMENTO }),
    FormField({ label: 'Número de documento', name: 'numero_documento', inputmode: 'numeric', required: true, validate: validators.documento() }),
    FormField({ label: 'Correo (usuario de ingreso)', name: 'email', type: 'email', required: true, autocomplete: 'off', validate: validators.email() }),
    PasswordField({ label: 'Contraseña inicial', name: 'password', required: true, autocomplete: 'new-password', hint: 'Mín. 8 caracteres con mayúscula, minúscula, número y símbolo.', validate: validators.password() }),
  );

async function init() {
  const page = createAppPage({ activeId: 'especialistas', title: 'Especialistas', subtitle: 'Odontólogos, sus datos profesionales y sus horarios de atención.' });
  if (!page) return;
  const { user, layout } = page;
  layout.update({ breadcrumbs: crumbs(user, { label: 'Especialistas' }) });

  const rows = await loadInto(layout, () => especialistasService.list(), 'Cargando especialistas…');
  if (!rows) return;
  const reload = async () => table.setRows(await especialistasService.list());

  async function crear() {
    const saved = await openModalForm({
      title: 'Nuevo especialista',
      description: 'Se crea también su usuario para ingresar al sistema.',
      size: 'lg',
      submitLabel: 'Crear especialista',
      fields: nuevoFields,
      onSubmit: withFieldErrors((data) => especialistasService.create(data)),
    });
    if (saved) await runAction(reload, `${saved.nombre} ya puede ingresar con su correo.`, 'Especialista creado');
  }

  async function editar(e) {
    const saved = await openModalForm({
      title: `Editar a ${e.nombre}`,
      size: 'lg',
      submitLabel: 'Guardar cambios',
      fields: () => grid(...perfilFields(e)),
      onSubmit: withFieldErrors((data) => especialistasService.update(e.id_especialista, data)),
    });
    if (saved) await runAction(reload, 'Los datos se actualizaron.', 'Especialista actualizado');
  }

  async function cambiarEstado(e) {
    const activar = e.estado !== 'ACTIVO';
    const ok = await confirmDialog({
      title: activar ? 'Activar especialista' : 'Inactivar especialista',
      message: activar ? `${e.nombre} podrá ingresar y recibir citas de nuevo.` : `${e.nombre} no podrá ingresar ni aparecerá para agendar citas nuevas. Sus citas e historias se conservan.`,
      confirmLabel: activar ? 'Activar' : 'Inactivar',
      variant: activar ? 'success' : 'danger',
    });
    if (ok) await runAction(async () => (await especialistasService.cambiarEstado(e.id_especialista, activar ? 'ACTIVO' : 'INACTIVO'), reload()), activar ? 'Especialista activado.' : 'Especialista inactivado.');
  }

  /** Horarios: lista con "Quitar" + formulario para agregar uno nuevo (RN-02). */
  async function horarios(e) {
    const actual = await especialistasService.get(e.id_especialista).catch((error) => toast.error(errorMessage(error)));
    if (!actual) return;
    const list = h('ul', { class: 'item-list', role: 'list', 'aria-label': `Horarios de ${e.nombre}` });
    const paint = (items) =>
      list.replaceChildren(
        ...(items.length
          ? items.map((hr) =>
              h(
                'li',
                { class: 'item-list__item' },
                h('span', { class: 'item-list__main' }, h('span', { class: 'item-list__title' }, hr.dia_semana), h('span', { class: 'item-list__meta' }, `${hr.hora_inicio.slice(0, 5)} – ${hr.hora_fin.slice(0, 5)}`)),
                Button({
                  label: 'Quitar',
                  icon: 'trash',
                  size: 'sm',
                  variant: 'ghost',
                  onClick: async () => {
                    if (await runAction(() => especialistasService.removeHorario(hr.id_horario), `Se quitó el horario del ${hr.dia_semana.toLowerCase()}.`)) {
                      paint((await especialistasService.get(e.id_especialista)).horarios);
                      reload();
                    }
                  },
                }),
              ),
            )
          : [h('li', { class: 'item-list__empty' }, 'Sin horario configurado: no se le pueden agendar citas.')]),
      );
    paint(actual.horarios);

    const added = await openModalForm({
      title: `Horario de ${e.nombre}`,
      description: 'Las citas solo se pueden agendar dentro de estos rangos (RN-02). Las horas van en franjas de 30 minutos.',
      submitLabel: 'Agregar horario',
      cancelLabel: 'Cerrar',
      fields: () => [
        list,
        grid(
          FormField({ label: 'Día', name: 'dia_semana', as: 'select', required: true, placeholder: 'Seleccione…', options: DIAS_SEMANA.map((d) => ({ value: d, label: d })) }),
          FormField({ label: 'Desde', name: 'hora_inicio', type: 'time', step: 1800, required: true }),
          FormField({ label: 'Hasta', name: 'hora_fin', type: 'time', step: 1800, required: true }),
        ),
      ],
      onSubmit: withFieldErrors((data) => especialistasService.addHorario(e.id_especialista, data)),
    });
    if (added) await runAction(reload, `${added.dia_semana} ${added.hora_inicio.slice(0, 5)}–${added.hora_fin.slice(0, 5)}`, 'Horario agregado');
  }

  const table = DataTable({
    caption: 'Especialistas',
    rows,
    rowKey: 'id_especialista',
    rowLabel: (e) => e.nombre,
    initialSort: { key: 'nombre', dir: 'asc' },
    search: { label: 'Buscar especialista', placeholder: 'Nombre o especialidad…', keys: ['nombre', 'especialidad', 'registro_medico'] },
    filter: { label: 'Filtrar por estado', key: 'estado', options: [{ value: 'ACTIVO', label: 'Activos' }, { value: 'INACTIVO', label: 'Inactivos' }] },
    toolbar: [Button({ label: 'Nuevo especialista', icon: 'plus', onClick: crear })],
    columns: [
      { key: 'nombre', label: 'Especialista', sortable: true, render: (e) => h('span', { class: 'cell-person' }, Avatar({ name: e.nombre, size: 'sm' }), h('span', {}, e.nombre)) },
      { key: 'especialidad', label: 'Especialidad', sortable: true },
      { key: 'registro_medico', label: 'Registro' },
      { key: 'telefono', label: 'Celular', value: (e) => e.telefono ?? '—' },
      { key: 'horario', label: 'Horario', value: (e) => describeSchedule(e.horarios, e.id_especialista) || 'Sin horario' },
      { key: 'estado', label: 'Estado', sortable: true, render: (e) => StatusBadge(e.estado, { size: 'sm' }) },
    ],
    actions: (e) => [
      { icon: 'clock', label: 'Horarios', onClick: () => horarios(e) },
      { icon: 'edit', label: 'Editar', onClick: () => editar(e) },
      e.estado === 'ACTIVO' ? { icon: 'x', label: 'Inactivar', variant: 'danger', onClick: () => cambiarEstado(e) } : { icon: 'check', label: 'Activar', onClick: () => cambiarEstado(e) },
    ],
  });

  layout.setContent(table);
}

init();
