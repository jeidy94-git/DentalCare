/**
 * Demos de organismos para styleguide.html (parte 04).
 * Usa los datos mock de js/data/mock (copia del seed de dentalcare_bd.sql + citas generadas).
 */
import { h, mount } from '../core/dom.js';
import { validators } from '../core/validators.js';
import { formatCOP, formatLongDate } from '../core/format.js';
import { toISODate, addDays } from '../core/dates.js';
import { timeOf } from '../core/agenda.js';
import { ROLES } from '../core/navigation.js';
import { Avatar, StatusBadge, Button, Switch } from '../components/atoms/index.js';
import { FormField, KpiCard, toast, confirmDialog } from '../components/molecules/index.js';
import {
  Topbar,
  Sidebar,
  DataTable,
  openModalForm,
  FieldError,
  patientQuickFields,
  Odontogram,
  Calendar,
  DashboardCharts,
  BookingWizard,
} from '../components/organisms/index.js';
import { PACIENTES, nombrePaciente } from '../data/mock/pacientes.js';
import { ESPECIALISTAS, HORARIOS, nombreEspecialista } from '../data/mock/especialistas.js';
import { SERVICIOS } from '../data/mock/servicios.js';
import { CITAS } from '../data/mock/citas.js';
import { odontogramaDePaciente } from '../data/mock/odontograma.js';
import { USUARIOS_DEMO, NOTIFICACIONES_DEMO } from '../data/mock/usuarios.js';

const $ = (selector) => document.querySelector(selector);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Estado compartido de la demo: lo que agenda el wizard aparece en la tabla y la agenda.
const db = { citas: [...CITAS], pacientes: [...PACIENTES] };
const pacienteById = (id) => db.pacientes.find((p) => p.id_paciente === id);
const servicioById = (id) => SERVICIOS.find((s) => s.id_servicio === id);
let table;
let calendar;

// KPIs de ejemplo por rol: [etiqueta, ícono, tono, valor]. También los usa la demo de templates.
export const KPIS_DEMO = {
  ADMINISTRADOR: [['Citas de hoy', 'calendar', 'primary', 12], ['Pacientes registrados', 'users', 'info', 40], ['Pagos pendientes', 'dollar', 'warning', formatCOP(2350000)]],
  RECEPCIONISTA: [['Próximas citas', 'calendar', 'primary', 9], ['Por confirmar', 'clock', 'warning', 4], ['Pagos del día', 'dollar', 'success', formatCOP(480000)]],
  ESPECIALISTA: [['Mi agenda hoy', 'calendar', 'primary', 7], ['Pacientes atendidos (mes)', 'users', 'success', 86], ['Tratamientos en curso', 'tooth', 'info', 5]],
  PACIENTE: [['Próxima cita', 'calendar', 'primary', '20 oct · 9:30'], ['Saldo pendiente', 'dollar', 'warning', formatCOP(90000)], ['Tratamientos', 'tooth', 'info', 2]],
};

/* ------------------------------------------------------------------ */
/* Topbar + Sidebar                                                    */
/* ------------------------------------------------------------------ */
function renderShell() {
  const frame = h('div', { class: 'sg-frame' });
  const log = h('p', { class: 'sg-result' }, 'Navegación: —');

  function build(role) {
    const user = USUARIOS_DEMO[role];
    const sidebar = Sidebar({
      role,
      activeId: role === 'ADMINISTRADOR' || role === 'ESPECIALISTA' ? 'dashboard' : 'inicio',
      id: 'sg-sidebar',
      // En el styleguide no se navega: se marca el ítem activo y se registra el clic.
      onNavigate: (item, event) => {
        event.preventDefault();
        log.textContent = `Navegación: ${item.label} → ${item.href}`;
      },
      onOpenChange: (open) => topbar.setMenuExpanded(open),
    });
    const topbar = Topbar({
      user,
      notifications: NOTIFICACIONES_DEMO,
      sidebarId: 'sg-sidebar',
      onMenuToggle: () => sidebar.toggle(),
      onLogout: () => toast.info('En la Fase A5 esto cierra la sesión y vuelve al login.', 'Cerrar sesión'),
      onProfileAction: (action) => toast.info(`Acción de perfil: ${action}.`),
    });

    mount(
      frame,
      sidebar,
      h(
        'div',
        { class: 'sg-frame__main' },
        topbar,
        h(
          'div',
          { class: 'sg-frame__content' },
          h('h2', { class: 'sg-frame__title' }, `Hola, ${user.nombre.split(' ').slice(0, 2).join(' ')}`),
          h('p', { class: 'text-secondary' }, `Vista de ${ROLES[role].label}. El menú lateral cambia según el rol.`),
          h('div', { class: 'sg-kpis' }, KPIS_DEMO[role].map(([label, icon, tone, value]) => KpiCard({ label, value, icon, tone }))),
        ),
      ),
    );
  }

  const roleSelect = FormField({
    label: 'Rol activo',
    as: 'select',
    value: 'ADMINISTRADOR',
    options: Object.entries(ROLES).map(([value, r]) => ({ value, label: `${r.label} (${value})` })),
    onChange: (event) => build(event.target.value),
  });

  build('ADMINISTRADOR');
  mount(
    $('#sg-shell'),
    h('div', { class: 'sg-toolbar' }, roleSelect, h('p', { class: 'sg-note' }, 'Achica la ventana (< 1024px) para ver el botón de menú y el panel deslizable.')),
    frame,
    log,
  );
}

/* ------------------------------------------------------------------ */
/* DataTable                                                           */
/* ------------------------------------------------------------------ */
function tableRows() {
  const from = toISODate(addDays(new Date(), -30));
  const to = toISODate(addDays(new Date(), 30));
  return db.citas.filter((c) => c.fecha_hora.slice(0, 10) >= from && c.fecha_hora.slice(0, 10) <= to);
}

function renderTable() {
  const showDetail = (c) =>
    toast.info(`${nombrePaciente(pacienteById(c.id_paciente))} · ${c.motivo} · ${nombreEspecialista(ESPECIALISTAS, c.id_especialista)}`, `Cita #${c.id_cita} · ${formatLongDate(c.fecha_hora)} ${timeOf(c.fecha_hora)}`);

  const editMotivo = async (c) => {
    const result = await openModalForm({
      title: `Editar cita #${c.id_cita}`,
      description: `${nombrePaciente(pacienteById(c.id_paciente))} · ${formatLongDate(c.fecha_hora)} ${timeOf(c.fecha_hora)}`,
      fields: () => FormField({ label: 'Motivo', name: 'motivo', as: 'textarea', rows: 3, required: true, value: c.motivo, validate: validators.maxLength(255) }),
      onSubmit: async () => wait(500),
    });
    if (!result) return;
    c.motivo = result.motivo;
    table.setRows(tableRows());
    toast.success('El motivo de la cita se actualizó.', `Cita #${c.id_cita}`);
  };

  const cancelCita = async (c) => {
    const ok = await confirmDialog({
      title: '¿Cancelar la cita?',
      message: `${nombrePaciente(pacienteById(c.id_paciente))} · ${formatLongDate(c.fecha_hora)} a las ${timeOf(c.fecha_hora)}. El horario quedará libre.`,
      confirmLabel: 'Sí, cancelar',
      cancelLabel: 'Volver',
      variant: 'danger',
    });
    if (!ok) return;
    c.estado_cita = 'CANCELADA';
    refreshAll();
    toast.success('Se notificó al paciente y al odontólogo.', 'Cita cancelada');
  };

  table = DataTable({
    caption: 'Citas de los últimos y próximos 30 días',
    rows: tableRows(),
    rowKey: 'id_cita',
    pageSize: 8,
    initialSort: { key: 'fecha', dir: 'asc' },
    search: {
      placeholder: 'Buscar por paciente, motivo u odontólogo…',
      keys: [(c) => nombrePaciente(pacienteById(c.id_paciente)), 'motivo', (c) => nombreEspecialista(ESPECIALISTAS, c.id_especialista)],
    },
    filter: {
      label: 'Filtrar por estado',
      key: 'estado_cita',
      options: [
        { value: 'PROGRAMADA', label: 'Programadas' },
        { value: 'PENDIENTE_CONFIRMACION', label: 'Por confirmar' },
        { value: 'COMPLETADA', label: 'Completadas' },
        { value: 'CANCELADA', label: 'Canceladas' },
      ],
    },
    columns: [
      { key: 'fecha', label: 'Fecha', sortable: true, value: (c) => c.fecha_hora, render: (c) => h('span', {}, formatLongDate(c.fecha_hora).replace(/ de \d{4}$/, ''), h('br'), h('span', { class: 'cell-muted' }, timeOf(c.fecha_hora))) },
      {
        key: 'paciente',
        label: 'Paciente',
        sortable: true,
        value: (c) => nombrePaciente(pacienteById(c.id_paciente)),
        render: (c) => {
          const name = nombrePaciente(pacienteById(c.id_paciente));
          return h('span', { class: 'cell-person' }, Avatar({ name, size: 'sm' }), h('span', { class: 'cell-person__name' }, name));
        },
      },
      { key: 'odontologo', label: 'Odontólogo', sortable: true, value: (c) => nombreEspecialista(ESPECIALISTAS, c.id_especialista) },
      { key: 'tratamiento', label: 'Tratamiento', sortable: true, value: (c) => servicioById(c.id_servicio)?.nombre_servicio },
      { key: 'estado', label: 'Estado', sortable: true, value: (c) => c.estado_cita, render: (c) => StatusBadge(c.estado_cita, { size: 'sm' }) },
    ],
    rowLabel: (c) => `cita de ${nombrePaciente(pacienteById(c.id_paciente))}`,
    actions: (c) => [
      { icon: 'eye', label: 'Ver detalle', onClick: showDetail },
      { icon: 'edit', label: 'Editar', onClick: editMotivo, hidden: c.estado_cita === 'CANCELADA' || c.estado_cita === 'COMPLETADA' },
      { icon: 'x', label: 'Cancelar', onClick: cancelCita, hidden: c.estado_cita === 'CANCELADA' || c.estado_cita === 'COMPLETADA' },
    ],
    toolbar: [Button({ label: 'Nueva cita', icon: 'plus', size: 'sm', onClick: () => $('#o-wizard').scrollIntoView({ behavior: 'smooth' }) })],
  });

  mount($('#sg-table'), table);
}

/* ------------------------------------------------------------------ */
/* ModalForm                                                           */
/* ------------------------------------------------------------------ */
function renderModal() {
  const log = h('p', { class: 'sg-result' }, 'Resultado: —');

  const quickPatient = async () => {
    const result = await openModalForm({
      title: 'Registrar paciente',
      description: 'Alta rápida (RF-CIT-02). Los demás datos se completan después.',
      submitLabel: 'Registrar paciente',
      fields: () => patientQuickFields(),
      onSubmit: async (data) => {
        await wait(700);
        if (db.pacientes.some((p) => p.numero_documento === data.numero_documento)) {
          throw new FieldError('numero_documento', 'Ya existe un paciente con este documento.');
        }
        return { ...data, id_paciente: Math.max(...db.pacientes.map((p) => p.id_paciente)) + 1 };
      },
    });
    log.textContent = `Resultado: ${result ? JSON.stringify(result) : 'null (cancelado)'}`;
    if (result) {
      db.pacientes.push(result);
      toast.success(`${result.nombres} ${result.apellidos} quedó registrado.`, 'Paciente registrado');
    }
  };

  const editService = async () => {
    const s = SERVICIOS[3];
    const result = await openModalForm({
      title: 'Editar tratamiento',
      description: `${s.codigo_servicio} · RF-TRA-02`,
      fields: () =>
        h(
          'div',
          { class: 'form-grid' },
          FormField({ label: 'Nombre', name: 'nombre_servicio', required: true, value: s.nombre_servicio, validate: validators.maxLength(100) }),
          FormField({
            label: 'Precio base (COP)',
            name: 'precio_base',
            type: 'number',
            min: 0,
            step: 1000,
            required: true,
            value: s.precio_base,
            validate: (v) => (Number(v) > 0 ? null : 'El precio debe ser mayor a 0.'),
          }),
          FormField({ label: 'Descripción', name: 'descripcion', as: 'textarea', rows: 3, value: s.descripcion, optional: true, className: 'form-grid__full' }),
        ),
      onSubmit: async (data) => {
        await wait(700);
        if (Number(data.precio_base) > 5000000) throw new Error('El servidor rechazó el cambio: el precio supera el máximo permitido (simulado).');
        return data;
      },
    });
    log.textContent = `Resultado: ${result ? JSON.stringify(result) : 'null (cancelado)'}`;
    if (result) toast.success(`${result.nombre_servicio}: ${formatCOP(result.precio_base)}`, 'Tratamiento actualizado');
  };

  mount(
    $('#sg-modal'),
    h(
      'div',
      { class: 'sg-row' },
      Button({ label: 'Alta rápida de paciente', icon: 'plus', onClick: quickPatient }),
      Button({ label: 'Editar tratamiento', icon: 'edit', variant: 'outline', onClick: editService }),
      h('span', { class: 'sg-note' }, 'Un precio mayor a $ 5.000.000 simula un error del servidor.'),
    ),
    log,
  );
}

/* ------------------------------------------------------------------ */
/* Odontogram                                                          */
/* ------------------------------------------------------------------ */
function renderOdontogram() {
  const container = h('div');
  const log = h('p', { class: 'sg-result' }, 'onChange: —');
  // Andrés Galvis (paciente 11): hallazgos del seed + algunos de ejemplo para enriquecer la demo.
  let records = [
    ...odontogramaDePaciente(11),
    { id_diente: 26, cara_diente: 'OCLUSAL', diagnostico: 'Caries profunda', estado_tratamiento: 'PENDIENTE', fecha_registro: '2026-10-02 09:10:00' },
    { id_diente: 46, cara_diente: 'OCLUSAL', diagnostico: 'Resina oclusal', estado_tratamiento: 'REALIZADO', fecha_registro: '2026-09-20 15:30:00' },
    { id_diente: 21, cara_diente: 'VESTIBULAR', diagnostico: 'Mancha por fluorosis leve', estado_tratamiento: 'EN_OBSERVACION', fecha_registro: '2026-09-20 15:40:00' },
  ];
  let ausentes = [18, 38];
  let readonly = false;

  const build = () =>
    mount(
      container,
      Odontogram({
        records,
        ausentes,
        readonly,
        readonlyReason: 'Solo el odontólogo asignado o el administrador pueden editar (RN-01).',
        onChange: (event) => {
          records = event.records;
          ausentes = event.ausentes;
          log.textContent = `onChange: ${event.type} · diente ${event.fdi} · ${event.records.length} hallazgos · ausentes [${event.ausentes.join(', ')}]`;
        },
      }),
    );

  build();
  mount(
    $('#sg-odontogram'),
    h(
      'div',
      { class: 'sg-toolbar' },
      h('p', {}, h('strong', {}, 'Paciente: '), 'Andrés Galvis · CC 1036000101'),
      Switch({
        label: 'Modo solo lectura (vista de paciente / RN-01)',
        onChange: (event) => {
          readonly = event.target.checked;
          build();
        },
      }),
    ),
    container,
    log,
  );
}

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */
function renderCalendar() {
  calendar = Calendar({
    especialistas: ESPECIALISTAS,
    horarios: HORARIOS,
    citas: db.citas,
    pacientes: db.pacientes,
    view: 'semana',
    onSlotSelect: (slot) =>
      toast.info(`${nombreEspecialista(ESPECIALISTAS, slot.especialistaId)} · ${formatLongDate(slot.date)} ${slot.start}. En la app esto abre el agendamiento.`, 'Franja libre'),
    onCitaSelect: (c) =>
      toast.info(`${nombrePaciente(pacienteById(c.id_paciente))} · ${c.motivo}`, `${timeOf(c.fecha_hora)} · ${nombreEspecialista(ESPECIALISTAS, c.id_especialista)}`),
  });
  mount($('#sg-calendar'), calendar);
}

/* ------------------------------------------------------------------ */
/* DashboardCharts                                                     */
/* ------------------------------------------------------------------ */
function renderCharts() {
  mount($('#sg-charts'), DashboardCharts({ citas: db.citas, servicios: SERVICIOS }));
}

/* ------------------------------------------------------------------ */
/* BookingWizard                                                       */
/* ------------------------------------------------------------------ */
function renderWizard() {
  mount(
    $('#sg-wizard'),
    BookingWizard({
      pacientes: db.pacientes,
      especialistas: ESPECIALISTAS,
      servicios: SERVICIOS,
      horarios: HORARIOS,
      citas: db.citas,
      onCreatePatient: async (p) => {
        await wait(300);
        db.pacientes.push(p);
        return p;
      },
      onComplete: async (cita) => {
        await wait(800);
        db.citas.push(cita);
        refreshAll();
        toast.success(`${nombrePaciente(pacienteById(cita.id_paciente))} · ${formatLongDate(cita.fecha_hora)} ${timeOf(cita.fecha_hora)}`, 'Cita agendada');
      },
    }),
  );
}

function refreshAll() {
  table?.setRows(tableRows());
  calendar?.setCitas(db.citas, db.pacientes);
}

export function renderOrganisms() {
  renderShell();
  renderTable();
  renderModal();
  renderOdontogram();
  renderCalendar();
  renderCharts();
  renderWizard();
}
