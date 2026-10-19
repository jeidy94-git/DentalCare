/**
 * Demos de templates para styleguide.html (parte 05).
 * Cada template se muestra dentro de un marco (.sg-frame) que simula la ventana del navegador.
 */
import { h, mount } from '../core/dom.js';
import { validators } from '../core/validators.js';
import { formatDate, formatLongDate, toDate } from '../core/format.js';
import { timeOf } from '../core/agenda.js';
import { ROLES } from '../core/navigation.js';
import { Avatar, Button, Icon, Link, StatusBadge, Switch, setButtonLoading } from '../components/atoms/index.js';
import { FormField, PasswordField, KpiCard, Tabs, toast, validateForm, setFieldError } from '../components/molecules/index.js';
import { DataTable, Odontogram } from '../components/organisms/index.js';
import { DashboardLayout, AuthLayout, DetailLayout } from '../components/templates/index.js';
import { PACIENTES, nombrePaciente } from '../data/mock/pacientes.js';
import { ESPECIALISTAS, nombreEspecialista } from '../data/mock/especialistas.js';
import { SERVICIOS } from '../data/mock/servicios.js';
import { CITAS } from '../data/mock/citas.js';
import { odontogramaDePaciente } from '../data/mock/odontograma.js';
import { historiaDePaciente, tieneAlergias } from '../data/mock/historias.js';
import { USUARIOS_DEMO, NOTIFICACIONES_DEMO } from '../data/mock/usuarios.js';
import { KPIS_DEMO } from './styleguide-organisms.js';

const $ = (selector) => document.querySelector(selector);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const servicioById = (id) => SERVICIOS.find((s) => s.id_servicio === id);
const homeIdOf = (role) => (role === 'ADMINISTRADOR' || role === 'ESPECIALISTA' ? 'dashboard' : 'inicio');
// En el styleguide los enlaces no navegan: se registra el clic.
const fakeLink = (label, onClick) => ({ label, href: '#', onClick: (event) => { event.preventDefault(); onClick?.(); } });

/* ------------------------------------------------------------------ */
/* DashboardLayout                                                     */
/* ------------------------------------------------------------------ */
function upcomingFor(role, user) {
  const now = new Date();
  return CITAS.filter((c) => toDate(c.fecha_hora) >= now && c.estado_cita !== 'CANCELADA')
    .filter((c) => (role === 'ESPECIALISTA' ? c.id_especialista === user.id_especialista : role === 'PACIENTE' ? c.id_paciente === user.id_paciente : true))
    .slice(0, 5);
}

function homeContent(role, user) {
  const citas = upcomingFor(role, user);
  const pacienteDe = (c) => nombrePaciente(PACIENTES.find((p) => p.id_paciente === c.id_paciente));
  return [
    h('div', { class: 'page-kpis' }, KPIS_DEMO[role].map(([label, icon, tone, value]) => KpiCard({ label, value, icon, tone }))),
    h(
      'section',
      { class: 'card', 'aria-labelledby': 'sg-tpl-next' },
      h('div', { class: 'card__header' }, h('h2', { class: 'card__title', id: 'sg-tpl-next' }, 'Próximas citas'), h('span', { class: 'card__subtitle' }, 'Datos mock')),
      h(
        'ul',
        { class: 'sg-list', role: 'list' },
        citas.map((c) => {
          const who = role === 'PACIENTE' ? nombreEspecialista(ESPECIALISTAS, c.id_especialista) : pacienteDe(c);
          return h(
            'li',
            { class: 'sg-list__item' },
            Avatar({ name: who, size: 'sm' }),
            h('span', {}, who, h('br'), h('span', { class: 'text-muted text-xs' }, servicioById(c.id_servicio)?.nombre_servicio ?? c.motivo)),
            h('span', { class: 'sg-list__meta' }, `${formatDate(c.fecha_hora, { day: '2-digit', month: 'short' })} · ${timeOf(c.fecha_hora)}`),
            StatusBadge(c.estado_cita, { size: 'sm' }),
          );
        }),
      ),
    ),
  ];
}

function renderDashboardTemplate() {
  const frame = h('div', { class: 'sg-frame sg-frame--template' });
  const log = h('p', { class: 'sg-result' }, 'Página: inicio');

  function build(role) {
    const user = USUARIOS_DEMO[role];
    const homeId = homeIdOf(role);
    let navToken = 0;

    const home = () => {
      navToken += 1;
      layout.sidebar.setActive(homeId);
      layout.update({
        title: `Hola, ${user.nombre.split(' ').slice(0, 2).join(' ')}`,
        subtitle: `Panel de ${ROLES[role].label} · ${formatLongDate(new Date())}`,
        breadcrumbs: [],
        actions: role === 'ADMINISTRADOR' ? [] : [Button({ label: role === 'PACIENTE' ? 'Solicitar cita' : 'Agendar cita', icon: 'plus', size: 'sm' })],
      });
      layout.setContent(homeContent(role, user));
      log.textContent = 'Página: inicio';
    };

    const goTo = async (item) => {
      if (item.id === homeId) return home();
      const token = ++navToken;
      layout.update({
        title: item.label,
        subtitle: `Pantalla de ${ROLES[role].label} que se construye en la fase A6.`,
        breadcrumbs: [fakeLink('Inicio', home), { label: item.label }],
        actions: [],
      });
      layout.setLoading(true, `Cargando ${item.label.toLowerCase()}…`);
      log.textContent = `Página: ${item.href} (cargando…)`;
      await wait(700);
      // Si el usuario ya navegó a otra página mientras "cargaba", esta respuesta se descarta.
      if (token !== navToken) return;
      layout.setContent(
        h(
          'section',
          { class: 'card' },
          h('h2', { class: 'card__title' }, item.label),
          h('p', { class: 'text-sm text-secondary' }, 'Aquí la página monta sus organismos (tabla, agenda, formularios…). El marco — sidebar, topbar, migas y título — no cambia: lo pone el template.'),
        ),
      );
      log.textContent = `Página: ${item.href}`;
    };

    const layout = DashboardLayout({
      role,
      user,
      activeId: homeId,
      notifications: NOTIFICACIONES_DEMO,
      sidebarId: 'sg-tpl-sidebar',
      mainId: 'sg-tpl-main',
      syncDocumentTitle: false,
      onNavigate: (item, event) => {
        event.preventDefault();
        goTo(item);
      },
      onLogout: () => toast.info('En la fase A5 esto cierra la sesión y vuelve al login.', 'Cerrar sesión'),
      onProfileAction: (action) => toast.info(`Acción de perfil: ${action}.`),
    });
    home();
    mount(frame, layout);
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
    $('#sg-tpl-dashboard'),
    h('div', { class: 'sg-toolbar' }, roleSelect, h('p', { class: 'sg-note' }, 'Haz clic en el marco y pulsa Tab: lo primero que aparece es "Saltar al contenido principal".')),
    frame,
    log,
  );
}

/* ------------------------------------------------------------------ */
/* AuthLayout                                                          */
/* ------------------------------------------------------------------ */
function renderAuthTemplate() {
  const frame = h('div', { class: 'sg-frame sg-frame--template' });
  let layout;
  let viewTabs;

  const VIEWS = {
    login: () => {
      const submit = Button({ label: 'Ingresar', type: 'submit', block: true });
      const password = PasswordField({ label: 'Contraseña', name: 'password', required: true });
      const form = h(
        'form',
        { class: 'auth-form', novalidate: true },
        FormField({ label: 'Correo electrónico', name: 'email', type: 'email', icon: 'mail', required: true, autocomplete: 'username', validate: validators.email() }),
        password,
        h('div', { class: 'auth-form__row' }, h('span'), Link({ href: '#', label: '¿Olvidaste tu contraseña?', size: 'sm', onClick: (e) => { e.preventDefault(); show('recover'); } })),
        submit,
      );
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateForm(form)) return;
        setButtonLoading(submit, true);
        await wait(700);
        setButtonLoading(submit, false);
        const { email, password: pwd } = Object.fromEntries(new FormData(form));
        if (email === 'admin@dentalcare.com' && pwd === 'Admin2026*') toast.success('En la fase A5 esto abre el panel según el rol.', 'Bienvenida, Laura');
        else setFieldError(password, 'Correo o contraseña incorrectos.'); // RF-ACC-02: mensaje genérico
      });
      return {
        title: 'Iniciar sesión',
        subtitle: 'Ingresa con tu correo y contraseña.',
        content: form,
        footer: h('span', {}, 'Demo: ', h('code', {}, 'admin@dentalcare.com'), ' / ', h('code', {}, 'Admin2026*')),
      };
    },

    recover: () => {
      const submit = Button({ label: 'Enviar enlace', type: 'submit', block: true });
      const form = h(
        'form',
        { class: 'auth-form', novalidate: true },
        FormField({ label: 'Correo electrónico', name: 'email', type: 'email', icon: 'mail', required: true, autocomplete: 'email', validate: validators.email() }),
        submit,
      );
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateForm(form)) return;
        setButtonLoading(submit, true);
        await wait(700);
        show('sent', { email: new FormData(form).get('email') });
      });
      return {
        title: 'Recuperar contraseña',
        subtitle: 'Te enviaremos un enlace para crear una contraseña nueva.',
        content: form,
        footer: Link({ href: '#', label: 'Volver a iniciar sesión', icon: 'arrow-left', size: 'sm', onClick: (e) => { e.preventDefault(); show('login'); } }),
      };
    },

    // Mismo mensaje exista o no el correo: no se revela quién está registrado.
    sent: ({ email = 'tu correo' } = {}) => ({
      title: 'Revisa tu correo',
      subtitle: '',
      content: h(
        'div',
        { class: 'auth-notice' },
        h('span', { class: 'auth-notice__icon', 'aria-hidden': 'true' }, Icon({ name: 'mail', size: 24 })),
        h('p', {}, 'Si ', h('strong', {}, email), ' está registrado, recibirás un enlace para restablecer tu contraseña. El enlace vence por seguridad.'),
        Button({ label: 'Abrir el enlace (simulado)', variant: 'outline', block: true, onClick: () => show('reset') }),
      ),
      footer: Link({ href: '#', label: 'Volver a iniciar sesión', icon: 'arrow-left', size: 'sm', onClick: (e) => { e.preventDefault(); show('login'); } }),
    }),

    reset: () => {
      const nueva = PasswordField({ label: 'Nueva contraseña', name: 'nueva', required: true, autocomplete: 'new-password', hint: 'Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.', validate: validators.password() });
      const nuevaInput = nueva.querySelector('input');
      const form = h(
        'form',
        { class: 'auth-form', novalidate: true },
        nueva,
        PasswordField({ label: 'Confirmar contraseña', name: 'confirmacion', required: true, autocomplete: 'new-password', validate: validators.matches(() => nuevaInput.value, 'Las contraseñas no coinciden.') }),
        Button({ label: 'Guardar contraseña', type: 'submit', block: true }),
      );
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!validateForm(form)) return;
        toast.success('Ya puedes iniciar sesión con tu nueva contraseña.', 'Contraseña actualizada');
        show('login');
      });
      return { title: 'Crear contraseña nueva', subtitle: 'Úsala para ingresar a DentalCare.', content: form, footer: null };
    },
  };

  function show(view, data, { focus = true } = {}) {
    layout.setView(VIEWS[view](data), { focus });
    viewTabs.selectTab(view === 'sent' ? 'recover' : view);
  }

  layout = AuthLayout({ title: '', mainId: 'sg-tpl-auth-main', syncDocumentTitle: false });
  viewTabs = Tabs({
    variant: 'segmented',
    ariaLabel: 'Vista del AuthLayout',
    tabs: [
      { id: 'login', label: 'Iniciar sesión' },
      { id: 'recover', label: 'Recuperar' },
      { id: 'reset', label: 'Restablecer' },
    ],
    onChange: (id) => show(id, undefined, { focus: false }),
  });
  show('login', undefined, { focus: false });
  mount(frame, layout);

  mount($('#sg-tpl-auth'), h('div', { class: 'sg-toolbar' }, viewTabs, h('p', { class: 'sg-note' }, 'Achica la ventana (< 960px): el panel de marca se oculta y el logo pasa a la tarjeta.')), frame);
}

/* ------------------------------------------------------------------ */
/* DetailLayout (dentro de DashboardLayout)                            */
/* ------------------------------------------------------------------ */
const ESTADOS_POR_TRATAR = ['PENDIENTE', 'EN_PROCESO', 'REEMPLAZO_REQUERIDO'];

function edad(fechaNacimiento, now = new Date()) {
  const nacimiento = toDate(fechaNacimiento);
  let years = now.getFullYear() - nacimiento.getFullYear();
  const cumpleEsteAnio = new Date(now.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());
  if (now < cumpleEsteAnio) years -= 1;
  return years;
}

function patientDetail(idPaciente, { simulateAllergy = false } = {}) {
  const p = PACIENTES.find((x) => x.id_paciente === idPaciente);
  const hc = historiaDePaciente(idPaciente);
  const citas = CITAS.filter((c) => c.id_paciente === idPaciente);
  const now = new Date();
  const proximas = citas.filter((c) => toDate(c.fecha_hora) >= now && c.estado_cita !== 'CANCELADA');
  const completadas = citas.filter((c) => c.estado_cita === 'COMPLETADA').reverse();
  const hallazgos = odontogramaDePaciente(idPaciente);
  const porTratar = hallazgos.filter((r) => ESTADOS_POR_TRATAR.includes(r.estado_tratamiento)).length;
  const fecha = (c) => formatDate(c.fecha_hora, { day: '2-digit', month: 'short', year: 'numeric' });

  const alertas = [];
  if (simulateAllergy) alertas.push({ tone: 'danger', title: 'Alergia a la penicilina (simulada).', text: 'Verificar antes de prescribir antibióticos o anestésicos.' });
  else if (tieneAlergias(hc)) alertas.push({ tone: 'danger', title: 'Alergias:', text: hc.alergias });

  const datos = [
    ['Nombres', p.nombres],
    ['Apellidos', p.apellidos],
    ['Documento', `${p.tipo_documento} ${p.numero_documento}`],
    ['Fecha de nacimiento', formatLongDate(p.fecha_nacimiento)],
    ['Género', p.genero === 'FEMENINO' ? 'Femenino' : p.genero === 'MASCULINO' ? 'Masculino' : 'Otro'],
    ['Teléfono', p.telefono],
    ['Correo electrónico', p.email],
    ['Dirección', p.direccion],
    ['EPS / aseguradora', p.eps_aseguradora],
  ];
  const dataList = (rows) => h('dl', { class: 'data-list' }, rows.map(([label, value]) => h('div', {}, h('dt', { class: 'data-list__label' }, label), h('dd', { class: 'data-list__value' }, value))));

  return DetailLayout({
    title: nombrePaciente(p),
    avatar: nombrePaciente(p),
    subtitle: `Paciente desde ${formatDate(p.fecha_registro)} · Historia clínica #${hc?.id_historia ?? '—'}`,
    badges: [StatusBadge('ACTIVO', { size: 'sm' })],
    actions: [
      Button({ label: 'Agendar cita', icon: 'plus', size: 'sm', onClick: () => toast.info('Abre el BookingWizard con el paciente ya elegido (fase A6).') }),
      Button({ label: 'Editar', icon: 'edit', size: 'sm', variant: 'outline', onClick: () => toast.info('Abre ModalForm con los datos del paciente (fase A6).') }),
    ],
    meta: [
      { icon: 'id-card', label: 'Documento', value: `${p.tipo_documento} ${p.numero_documento}` },
      { icon: 'user', label: 'Edad', value: `${edad(p.fecha_nacimiento)} años` },
      { icon: 'phone', label: 'Teléfono', value: p.telefono },
      { icon: 'mail', label: 'Correo', value: p.email },
    ],
    summary: [
      { label: 'Próxima cita', value: proximas[0] ? fecha(proximas[0]) : 'Sin citas', hint: proximas[0] ? `${timeOf(proximas[0].fecha_hora)} · ${servicioById(proximas[0].id_servicio)?.nombre_servicio ?? ''}` : undefined },
      { label: 'Última visita', value: completadas[0] ? fecha(completadas[0]) : '—', hint: completadas[0] ? nombreEspecialista(ESPECIALISTAS, completadas[0].id_especialista) : undefined },
      { label: 'Citas completadas', value: String(completadas.length) },
      { label: 'Hallazgos por tratar', value: String(porTratar), hint: `${hallazgos.length} registrados en el odontograma` },
    ],
    alerts: alertas,
    tabsLabel: 'Secciones de la ficha del paciente',
    tabs: [
      { id: 'datos', label: 'Datos personales', icon: 'user', content: () => dataList(datos) },
      {
        id: 'odontograma',
        label: 'Odontograma',
        icon: 'tooth',
        count: hallazgos.length,
        content: () => Odontogram({ records: hallazgos, onChange: (e) => toast.success(`Pieza ${e.fdi}: cambio registrado (${e.type}).`, 'Odontograma') }),
      },
      {
        id: 'citas',
        label: 'Citas',
        icon: 'calendar',
        count: citas.length,
        content: () =>
          DataTable({
            caption: `Citas de ${nombrePaciente(p)}`,
            rows: citas,
            rowKey: 'id_cita',
            pageSize: 6,
            initialSort: { key: 'fecha', dir: 'desc' },
            filter: {
              label: 'Filtrar por estado',
              key: 'estado_cita',
              options: [
                { value: 'PROGRAMADA', label: 'Programadas' },
                { value: 'COMPLETADA', label: 'Completadas' },
                { value: 'CANCELADA', label: 'Canceladas' },
              ],
            },
            columns: [
              { key: 'fecha', label: 'Fecha', sortable: true, value: (c) => c.fecha_hora, render: (c) => `${fecha(c)} · ${timeOf(c.fecha_hora)}` },
              { key: 'odontologo', label: 'Odontólogo', sortable: true, value: (c) => nombreEspecialista(ESPECIALISTAS, c.id_especialista) },
              { key: 'tratamiento', label: 'Tratamiento', value: (c) => servicioById(c.id_servicio)?.nombre_servicio },
              { key: 'estado', label: 'Estado', sortable: true, value: (c) => c.estado_cita, render: (c) => StatusBadge(c.estado_cita, { size: 'sm' }) },
            ],
          }),
      },
    ],
    aside: h(
      'section',
      { class: 'card', 'aria-labelledby': 'sg-tpl-hc' },
      h('div', { class: 'card__header' }, h('h2', { class: 'card__title', id: 'sg-tpl-hc' }, 'Historia clínica')),
      dataList([
        ['Antecedentes médicos', hc?.antecedentes_medicos ?? '—'],
        ['Alergias', simulateAllergy ? 'Penicilina (simulada)' : (hc?.alergias ?? '—')],
        ['Observaciones', hc?.observaciones ?? '—'],
        ['Apertura', hc ? formatDate(hc.fecha_apertura) : '—'],
      ]),
    ),
  });
}

function renderDetailTemplate() {
  const frame = h('div', { class: 'sg-frame sg-frame--template sg-frame--tall' });
  const log = h('p', { class: 'sg-result' }, 'Migas: —');
  const role = 'ESPECIALISTA';
  let current = 11;
  let allergy = false;

  const layout = DashboardLayout({
    role,
    user: USUARIOS_DEMO[role],
    activeId: 'pacientes',
    notifications: NOTIFICACIONES_DEMO,
    sidebarId: 'sg-tpl-detail-sidebar',
    mainId: 'sg-tpl-detail-main',
    syncDocumentTitle: false,
    onNavigate: (item, event) => {
      event.preventDefault();
      log.textContent = `Sidebar: ${item.href}`;
    },
  });

  function render() {
    const p = PACIENTES.find((x) => x.id_paciente === current);
    // Sin `title`: el <h1> de la página es el nombre del paciente (lo pone DetailLayout).
    layout.update({
      breadcrumbs: [fakeLink('Inicio', () => (log.textContent = 'Migas: Inicio')), fakeLink('Pacientes', () => (log.textContent = 'Migas: Pacientes')), { label: nombrePaciente(p) }],
    });
    layout.setContent(patientDetail(current, { simulateAllergy: allergy }));
  }

  const patientSelect = FormField({
    label: 'Paciente',
    as: 'select',
    value: String(current),
    options: PACIENTES.slice(0, 10).map((p) => ({ value: String(p.id_paciente), label: `${nombrePaciente(p)} (#${p.id_paciente})` })),
    onChange: (event) => {
      current = Number(event.target.value);
      render();
    },
  });
  const allergySwitch = Switch({
    label: 'Simular alergia registrada',
    onChange: (event) => {
      allergy = event.target.checked;
      render();
    },
  });

  render();
  mount(frame, layout);
  mount($('#sg-tpl-detail'), h('div', { class: 'sg-toolbar' }, patientSelect, allergySwitch), frame, log);
}

export function renderTemplates() {
  renderDashboardTemplate();
  renderAuthTemplate();
  renderDetailTemplate();
}
