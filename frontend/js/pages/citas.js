/**
 * Citas y agenda (RF-CIT-01…07, HU-05, HU-06):
 *   pages/admin/citas.html       → lista + calendario de todos los odontólogos, agendar
 *   pages/asistente/agenda.html  → calendario + lista, agendar y confirmar solicitudes
 *   pages/doctor/agenda.html     → SU agenda; desde una cita abre la ficha del paciente
 *
 * Organismos: Calendar (vistas día/semana/mes/lista), DataTable (filtros por estado) y BookingWizard.
 */
import { h } from '../core/dom.js';
import { toISODate } from '../core/dates.js';
import { can, PERMISOS } from '../core/permissions.js';
import { Button } from '../components/atoms/index.js';
import { FormField, Tabs, toast } from '../components/molecules/index.js';
import { Calendar, DataTable, BookingWizard, openModalForm } from '../components/organisms/index.js';
import { citasService, especialistasService, pacientesService, serviciosService } from '../services/index.js';
import { createAppPage, loadInto, errorMessage } from './_shared/app-page.js';
import { card, crumbs, withFieldErrors } from './_shared/ui.js';
import { CITA_FILTER, citaColumns, citaActions, citaSummary, allowedTransitions, applyTransition, transitionLabel, fichaUrl } from './_shared/citas.js';

const CONFIG = {
  ADMINISTRADOR: { activeId: 'citas', title: 'Citas', subtitle: 'Todas las citas del consultorio.', tab: 'lista' },
  RECEPCIONISTA: { activeId: 'agenda', title: 'Agenda', subtitle: 'Agenda de los odontólogos, solicitudes por confirmar y agendamiento.', tab: 'calendario' },
  ESPECIALISTA: { activeId: 'agenda', title: 'Mi agenda', subtitle: 'Tus citas. Elige una para abrir la ficha del paciente.', tab: 'calendario' },
};

async function init() {
  const role = document.body.dataset.role;
  const cfg = CONFIG[role];
  const page = createAppPage({ role, activeId: cfg.activeId, title: cfg.title, subtitle: cfg.subtitle });
  if (!page) return;
  const { user, layout } = page;
  const esOdontologo = user.rol === 'ESPECIALISTA';
  const agenda = can(user, PERMISOS.CREAR_CITA) && !esOdontologo;
  const filtroCitas = esOdontologo ? { id_especialista: user.id_especialista } : {};

  const agendarBtn = agenda && Button({ label: 'Agendar cita', icon: 'plus', onClick: () => showWizard() });
  layout.update({ breadcrumbs: crumbs(user, { label: cfg.title }), actions: agendarBtn ? [agendarBtn] : [] });

  const data = await loadInto(
    layout,
    async () => {
      const [citas, especialistas, pacientes, servicios] = await Promise.all([
        citasService.list(filtroCitas),
        especialistasService.list(),
        pacientesService.list(),
        agenda ? serviciosService.list({ soloActivos: true }) : [],
      ]);
      return { citas, especialistas, pacientes, servicios };
    },
    'Cargando la agenda…',
  );
  if (!data) return;

  const especialistas = esOdontologo ? data.especialistas.filter((e) => e.id_especialista === user.id_especialista) : data.especialistas;
  const horarios = especialistas.flatMap((e) => e.horarios);

  async function reload() {
    data.citas = await citasService.list(filtroCitas);
    table.setRows(data.citas);
    calendar.setCitas(data.citas, data.pacientes);
  }

  /** Al elegir una cita en el calendario: resumen + acciones permitidas para este rol. */
  async function onCitaSelect(cita) {
    const full = data.citas.find((c) => c.id_cita === cita.id_cita) ?? cita;
    const options = [...(esOdontologo ? [{ value: 'ficha', label: 'Abrir la ficha del paciente' }] : []), ...allowedTransitions(full, user).map((id) => ({ value: id, label: transitionLabel(id) }))];
    const result = await openModalForm({
      title: `Cita #${full.id_cita}`,
      submitLabel: options.length ? 'Continuar' : 'Cerrar',
      cancelLabel: options.length ? 'Cancelar' : 'Volver',
      fields: () => [citaSummary(full), options.length && FormField({ label: '¿Qué deseas hacer?', name: 'accion', as: 'select', required: true, placeholder: 'Selecciona una acción…', options })],
    });
    if (!result?.accion) return;
    if (result.accion === 'ficha') location.assign(fichaUrl(full.id_paciente));
    else await applyTransition(result.accion, full, reload, { ask: false });
  }

  const calendar = Calendar({
    especialistas,
    horarios,
    citas: data.citas,
    pacientes: data.pacientes,
    view: 'semana',
    especialistaId: esOdontologo ? user.id_especialista : 'ALL',
    onCitaSelect,
  });

  const table = DataTable({
    caption: esOdontologo ? 'Mis citas' : 'Citas del consultorio',
    rows: data.citas,
    rowKey: 'id_cita',
    rowLabel: (c) => `cita de ${c.paciente_nombre}`,
    pageSize: 10,
    initialSort: { key: 'fecha', dir: 'desc' },
    filter: CITA_FILTER,
    search: { label: 'Buscar cita', placeholder: 'Paciente, odontólogo o tratamiento…', keys: ['paciente_nombre', 'especialista_nombre', 'servicio_nombre', 'motivo'] },
    columns: citaColumns({ especialista: !esOdontologo }),
    actions: citaActions(user, reload),
    emptyMessage: 'No hay citas con esos filtros.',
  });

  const pendientes = () => data.citas.filter((c) => c.estado_cita === 'PENDIENTE_CONFIRMACION').length;
  const mainView = () =>
    Tabs({
      ariaLabel: 'Vista de la agenda',
      activeId: cfg.tab,
      tabs: [
        { id: 'calendario', label: 'Calendario', icon: 'calendar', content: calendar },
        // El contador son las solicitudes por confirmar: solo para quien puede confirmarlas.
        { id: 'lista', label: 'Lista', icon: 'file-text', count: (agenda && pendientes()) || undefined, content: table },
      ],
    });

  function showMain() {
    layout.update({ title: cfg.title, subtitle: cfg.subtitle, breadcrumbs: crumbs(user, { label: cfg.title }), actions: agendarBtn ? [agendarBtn] : [] });
    layout.setContent(mainView());
  }

  /** Agendamiento (BookingWizard) en la misma página: la ocupación se pide al abrirlo para que esté al día. */
  async function showWizard() {
    const volver = Button({ label: 'Volver a la agenda', icon: 'arrow-left', variant: 'outline', onClick: async () => (await reload(), showMain()) });
    layout.update({ title: 'Agendar cita', subtitle: 'Paso a paso: paciente, tratamiento, fecha y confirmación.', breadcrumbs: crumbs(user, { label: cfg.title, href: location.pathname }, { label: 'Agendar cita' }), actions: [volver] });
    const ocupacion = await loadInto(layout, () => citasService.ocupacion({ desde: toISODate() }), 'Consultando disponibilidad…');
    if (!ocupacion) return;
    layout.setContent(
      card(
        { title: 'Nueva cita', subtitle: 'Solo se ofrecen franjas dentro del horario del odontólogo y libres (RN-02).' },
        BookingWizard({
          pacientes: data.pacientes,
          especialistas: especialistas.filter((e) => e.estado === 'ACTIVO'),
          servicios: data.servicios,
          horarios,
          citas: ocupacion,
          onComplete: async (cita) => {
            const saved = await citasService.create(cita);
            toast.success(`${saved.paciente_nombre} · ${saved.especialista_nombre}`, 'Cita agendada');
            return saved;
          },
          onCreatePatient: withFieldErrors(async (paciente) => {
            const saved = await pacientesService.create(paciente);
            data.pacientes.push(saved);
            return saved;
          }),
        }),
      ),
    );
    layout.focusMain();
  }

  showMain();
}

init().catch((error) => toast.error(errorMessage(error)));
