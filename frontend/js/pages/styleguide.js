/**
 * Controlador de styleguide.html
 * Renderiza tokens, átomos y moléculas usando los MISMOS componentes que usarán las pantallas.
 * Los datos de ejemplo provienen del seed de dentalcare_bd.sql.
 */
import { h, mount } from '../core/dom.js';
import { validators } from '../core/validators.js';
import { formatCOP, formatDate } from '../core/format.js';
import {
  Icon,
  ICON_NAMES,
  Button,
  setButtonLoading,
  Input,
  Select,
  Checkbox,
  Radio,
  Switch,
  Badge,
  StatusBadge,
  ESTADOS,
  Avatar,
  Spinner,
  Link,
} from '../components/atoms/index.js';
import {
  FormField,
  PasswordField,
  setFieldError,
  validateForm,
  clearFormErrors,
  SearchBar,
  KpiCard,
  Tabs,
  Pagination,
  toast,
  confirmDialog,
  TimeSlot,
  setTimeSlotSelected,
  Tooth,
  ToothLegend,
  setToothFace,
  getToothFaces,
  FACE_LABELS,
  TOOTH_ESTADOS,
} from '../components/molecules/index.js';
import { renderOrganisms } from './styleguide-organisms.js';

const $ = (selector) => document.querySelector(selector);
const rootStyles = getComputedStyle(document.documentElement);
const token = (name) => rootStyles.getPropertyValue(name).trim();
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function block(title, ...content) {
  return h('div', { class: 'sg-block' }, h('p', { class: 'sg-subtitle' }, title), ...content);
}

function card(title, subtitle, ...content) {
  return h(
    'div',
    { class: 'sg-card' },
    title && h('h4', { class: 'sg-card__title' }, title),
    subtitle && h('p', { class: 'sg-card__subtitle' }, subtitle),
    ...content,
  );
}

/* ------------------------------------------------------------------ */
/* Datos de ejemplo (seed de dentalcare_bd.sql)                        */
/* ------------------------------------------------------------------ */

const PACIENTES = [
  { id: 11, nombre: 'Andrés Galvis', documento: '1036000101', eps: 'Sura' },
  { id: 12, nombre: 'Carolina Villa', documento: '1036000102', eps: 'Sura' },
  { id: 13, nombre: 'Mateo Londoño', documento: '1036000103', eps: 'Sanitas' },
  { id: 14, nombre: 'Daniela Cardona', documento: '1036000104', eps: 'Sura' },
  { id: 15, nombre: 'Sebastián Marín', documento: '1036000105', eps: 'Compensar' },
  { id: 16, nombre: 'Camila Restrepo', documento: '1036000106', eps: 'Sura' },
  { id: 17, nombre: 'Nicolás Arango', documento: '1036000107', eps: 'Coomeva' },
  { id: 18, nombre: 'Mariana Zapata', documento: '1036000108', eps: 'Sura' },
  { id: 19, nombre: 'Alejandro Henao', documento: '1036000109', eps: 'Sanitas' },
  { id: 20, nombre: 'Valeria Duque', documento: '1036000110', eps: 'Sura' },
  { id: 23, nombre: 'Samuel Cano', documento: '1036000113', eps: 'Sura' },
  { id: 30, nombre: 'Salomé Vargas', documento: '1036000120', eps: 'Sura' },
];

const ESPECIALISTAS = [
  { value: 1, label: 'Dr. Roberto Martínez · Odontología General' },
  { value: 2, label: 'Dra. Sofía López · Ortodoncia' },
  { value: 3, label: 'Dr. Andrés Ramírez · Endodoncia' },
];

/** Tabla `odontograma` agrupada por diente (id_diente = número FDI). */
const ODONTOGRAMA = {
  16: { VESTIBULAR: { estado: 'PENDIENTE', diagnostico: 'Caries incipiente' }, DISTAL: { estado: 'REEMPLAZO_REQUERIDO', diagnostico: 'Obturación en amalgama desadaptada' } },
  11: { INCISAL: { estado: 'EN_OBSERVACION', diagnostico: 'Desgaste leve por bruxismo' } },
  12: { VESTIBULAR: { estado: 'EN_OBSERVACION', diagnostico: 'Mancha blanca por desmineralización' } },
  21: { MESIAL: { estado: 'PENDIENTE', diagnostico: 'Fractura de esmalte por traumatismo' } },
  36: { OCLUSAL: { estado: 'REALIZADO', diagnostico: 'Caries restaurada con resina' }, LINGUAL: { estado: 'REALIZADO', diagnostico: 'Cálculo dental subgingival severo' } },
  46: { OCLUSAL: { estado: 'EN_PROCESO', diagnostico: 'Tratamiento de conducto requerido' } },
};

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ================================================================== */
/* 01 · FUNDAMENTOS                                                    */
/* ================================================================== */

const PALETTES = [
  { title: 'Primario (teal clínico)', prefix: '--color-primary', steps: [50, 100, 200, 500, 600, 700, 800, 900] },
  { title: 'Secundario (azul médico)', prefix: '--color-secondary', steps: [50, 100, 200, 500, 600, 700, 800] },
  { title: 'Neutros', prefix: '--color-neutral', steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { title: 'Éxito', prefix: '--color-success', steps: [50, 100, 600, 700] },
  { title: 'Advertencia', prefix: '--color-warning', steps: [50, 100, 600, 700] },
  { title: 'Peligro', prefix: '--color-danger', steps: [50, 100, 600, 700] },
];

const SEMANTIC = [
  '--color-brand',
  '--color-accent',
  '--color-bg',
  '--color-bg-app',
  '--color-surface',
  '--color-border',
  '--color-text',
  '--color-text-secondary',
  '--color-text-muted',
];

function swatch(name) {
  return h(
    'div',
    { class: 'sg-swatch' },
    h('div', { class: 'sg-swatch__color', style: { background: `var(${name})` } }),
    h(
      'div',
      { class: 'sg-swatch__meta' },
      h('span', { class: 'sg-swatch__name' }, name.replace('--color-', '')),
      h('span', { class: 'sg-swatch__value' }, token(name)),
    ),
  );
}

function renderColors() {
  const palettes = PALETTES.map(({ title, prefix, steps }) =>
    h(
      'div',
      { class: 'sg-palette' },
      h('p', { class: 'sg-subtitle' }, title),
      h('div', { class: 'sg-swatches' }, steps.map((step) => swatch(`${prefix}-${step}`))),
    ),
  );
  const semantic = h(
    'div',
    { class: 'sg-palette' },
    h('p', { class: 'sg-subtitle' }, 'Alias semánticos (usar en componentes)'),
    h('div', { class: 'sg-swatches' }, SEMANTIC.map(swatch)),
  );
  mount($('#sg-colors'), h('div', { class: 'sg-card' }, palettes), h('div', { class: 'sg-card' }, semantic));
}

function renderTypography() {
  const sizes = [
    ['--text-3xl', 'Agenda del día', 'var(--font-semibold)'],
    ['--text-2xl', 'Historia clínica', 'var(--font-semibold)'],
    ['--text-xl', 'Próximas citas', 'var(--font-semibold)'],
    ['--text-lg', 'Odontograma del paciente', 'var(--font-medium)'],
    ['--text-base', 'Texto base para formularios y contenido general del sistema.', 'var(--font-regular)'],
    ['--text-sm', 'Texto de tablas, etiquetas y controles.', 'var(--font-regular)'],
    ['--text-xs', 'Texto de ayuda, metadatos y badges.', 'var(--font-regular)'],
  ];
  mount(
    $('#sg-type'),
    sizes.map(([name, sample, weight]) =>
      h(
        'div',
        { class: 'sg-type-row' },
        h('span', { class: 'sg-type-row__token' }, `${name} · ${token(name)}`),
        h('span', { style: { fontSize: `var(${name})`, fontWeight: weight } }, sample),
      ),
    ),
  );
}

function renderSpacing() {
  mount(
    $('#sg-spacing'),
    h('p', { class: 'sg-subtitle' }, 'Espaciado'),
    [1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((n) =>
      h(
        'div',
        { class: 'sg-space-row' },
        h('span', {}, `--space-${n}`),
        h('span', { class: 'sg-space-bar', style: { width: `var(--space-${n})` } }),
      ),
    ),
  );
  mount(
    $('#sg-radius'),
    ['sm', 'md', 'lg', 'xl', 'full'].map((r) =>
      h('div', { class: 'sg-shape', style: { borderRadius: `var(--radius-${r})` } }, `radius-${r}`),
    ),
  );
  mount(
    $('#sg-shadows'),
    ['xs', 'sm', 'md', 'lg'].map((s) =>
      h('div', { class: 'sg-shape', style: { boxShadow: `var(--shadow-${s})`, borderRadius: 'var(--radius-md)', border: 'none' } }, `shadow-${s}`),
    ),
  );
}

/* ================================================================== */
/* 02 · ÁTOMOS                                                         */
/* ================================================================== */

function renderIcons() {
  mount(
    $('#sg-icons'),
    ICON_NAMES.map((name) => h('div', { class: 'sg-icon', title: name }, Icon({ name, size: 24 }), name)),
  );
}

function renderButtons() {
  const demoLoading = Button({
    label: 'Guardar paciente',
    icon: 'check',
    onClick: () => {
      setButtonLoading(demoLoading, true);
      setTimeout(() => setButtonLoading(demoLoading, false), 1500);
    },
  });

  mount(
    $('#sg-buttons'),
    block(
      'Variantes',
      h('div', { class: 'sg-row' }, ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success'].map((variant) => Button({ label: capitalize(variant), variant }))),
    ),
    block(
      'Tamaños',
      h('div', { class: 'sg-row' }, Button({ label: 'Pequeño', size: 'sm' }), Button({ label: 'Mediano' }), Button({ label: 'Grande', size: 'lg' })),
    ),
    block(
      'Con ícono',
      h(
        'div',
        { class: 'sg-row' },
        Button({ label: 'Nueva cita', icon: 'plus' }),
        Button({ label: 'Buscar', icon: 'search', variant: 'outline' }),
        Button({ label: 'Siguiente', iconRight: 'chevron-right', variant: 'secondary' }),
        Button({ label: 'Eliminar', icon: 'trash', variant: 'danger' }),
      ),
    ),
    block(
      'Solo ícono (acciones de tabla)',
      h(
        'div',
        { class: 'sg-row' },
        Button({ icon: 'eye', variant: 'ghost', ariaLabel: 'Ver detalle' }),
        Button({ icon: 'edit', variant: 'ghost', ariaLabel: 'Editar' }),
        Button({ icon: 'trash', variant: 'ghost', ariaLabel: 'Eliminar' }),
        Button({ icon: 'bell', variant: 'outline', ariaLabel: 'Notificaciones' }),
        Button({ icon: 'plus', ariaLabel: 'Agregar', size: 'sm' }),
      ),
    ),
    block(
      'Estados',
      h(
        'div',
        { class: 'sg-row' },
        Button({ label: 'Deshabilitado', disabled: true }),
        Button({ label: 'Cargando', loading: true }),
        demoLoading,
        h('span', { class: 'sg-note' }, '← clic para simular envío'),
      ),
    ),
    block('Bloque (100% de ancho)', h('div', { style: { maxWidth: '360px' } }, Button({ label: 'Iniciar sesión', block: true, size: 'lg' }))),
  );
}

function renderControls() {
  mount(
    $('#sg-controls'),
    block(
      'Input · estados',
      h(
        'div',
        { class: 'sg-grid-3' },
        Input({ placeholder: 'Normal', 'aria-label': 'Ejemplo normal' }),
        Input({ icon: 'mail', placeholder: 'Con ícono', 'aria-label': 'Ejemplo con ícono' }),
        Input({ value: '10A6', invalid: true, 'aria-label': 'Ejemplo inválido' }),
        Input({ value: 'RM-1001', readonly: true, 'aria-label': 'Ejemplo solo lectura' }),
        Input({ placeholder: 'Deshabilitado', disabled: true, 'aria-label': 'Ejemplo deshabilitado' }),
        Input({ placeholder: 'Pequeño', size: 'sm', 'aria-label': 'Ejemplo pequeño' }),
        Input({ type: 'date', value: '2026-10-20', 'aria-label': 'Fecha' }),
        Input({ type: 'time', value: '08:00', 'aria-label': 'Hora' }),
        Select({ options: ESPECIALISTAS, value: 2, 'aria-label': 'Odontólogo' }),
      ),
    ),
    block(
      'Casillas, radios y switches',
      h(
        'div',
        { class: 'sg-grid-3' },
        h(
          'fieldset',
          { class: 'u-stack', style: { border: 'none', padding: 0 } },
          h('legend', { class: 'label', style: { marginBottom: 'var(--space-2)' } }, 'Permisos del rol'),
          Checkbox({ label: 'Crear cita', checked: true }),
          Checkbox({ label: 'Cancelar cita', checked: true }),
          Checkbox({ label: 'Ver historia clínica' }),
          Checkbox({ label: 'Gestionar usuarios', disabled: true }),
        ),
        h(
          'fieldset',
          { class: 'u-stack', style: { border: 'none', padding: 0 } },
          h('legend', { class: 'label', style: { marginBottom: 'var(--space-2)' } }, 'Modalidad de pago'),
          Radio({ label: 'Contado', name: 'modalidad', value: 'CONTADO', checked: true }),
          Radio({ label: 'Crédito (cuotas)', name: 'modalidad', value: 'CREDITO' }),
          Radio({ label: 'Otra (no disponible)', name: 'modalidad', value: 'OTRA', disabled: true }),
        ),
        h(
          'div',
          { class: 'u-stack' },
          h('span', { class: 'label' }, 'Estado'),
          Switch({ label: 'Rol activo', checked: true }),
          Switch({ label: 'Recordatorio 48 h' }),
          Switch({ label: 'Bloqueado', checked: true, disabled: true }),
        ),
      ),
    ),
  );
}

function renderBadges() {
  const groups = [
    ['Citas', ['PROGRAMADA', 'PENDIENTE_CONFIRMACION', 'COMPLETADA', 'CANCELADA']],
    ['Odontograma / tratamientos', ['PENDIENTE', 'EN_PROCESO', 'EN_OBSERVACION', 'REALIZADO', 'REEMPLAZO_REQUERIDO']],
    ['Pagos y registros', ['PENDIENTE', 'PAGADO', 'ACTIVO', 'INACTIVO']],
  ];
  mount(
    $('#sg-badges'),
    block(
      'Variantes',
      h(
        'div',
        { class: 'sg-row' },
        ['neutral', 'primary', 'info', 'success', 'warning', 'danger'].map((variant) => Badge({ label: capitalize(variant), variant })),
        Badge({ label: 'Pequeño', variant: 'info', size: 'sm' }),
        Badge({ label: '3', variant: 'count' }),
      ),
    ),
    groups.map(([title, codes]) => block(`Estados · ${title}`, h('div', { class: 'sg-row' }, codes.map((code) => StatusBadge(code))))),
    h('p', { class: 'sg-note', style: { marginTop: 'var(--space-4)' } }, `${Object.keys(ESTADOS).length} estados mapeados en ESTADOS (badge.js).`),
  );
}

function renderAvatars() {
  const people = ['Laura Gómez', 'Carlos Pérez', 'Dr. Roberto Martínez', 'Dra. Sofía López', 'Dr. Andrés Ramírez', 'Carolina Villa'];
  mount(
    $('#sg-avatars'),
    block('Tamaños', h('div', { class: 'sg-row' }, ['xs', 'sm', 'md', 'lg', 'xl'].map((size) => Avatar({ name: 'Andrés Galvis', size })))),
    block('Color estable por nombre', h('div', { class: 'sg-row' }, people.map((name) => Avatar({ name, size: 'lg' })))),
  );
}

function renderMisc() {
  mount(
    $('#sg-misc'),
    block(
      'Spinner',
      h('div', { class: 'sg-row' }, Spinner({ size: 'sm' }), Spinner(), Spinner({ size: 'lg' }), h('span', { class: 'sg-note' }, 'Cargando agenda…')),
    ),
    block(
      'Enlaces',
      h(
        'div',
        { class: 'sg-row' },
        Link({ href: '#', label: '¿Olvidaste tu contraseña?' }),
        Link({ href: '#', label: 'Volver al listado', icon: 'chevron-left', variant: 'muted' }),
        Link({ href: '#', label: 'Ver historia clínica', icon: 'file-text', size: 'sm' }),
      ),
    ),
  );
}

/* ================================================================== */
/* 03 · MOLÉCULAS                                                      */
/* ================================================================== */

function patientForm() {
  const result = h('pre', { class: 'sg-result', hidden: true });
  const submit = Button({ label: 'Registrar paciente', icon: 'check', type: 'submit' });

  const form = h(
    'form',
    { class: 'sg-form sg-form--2col', novalidate: true },
    FormField({ label: 'Nombres', name: 'nombres', required: true, placeholder: 'Ej. Andrés', autocomplete: 'given-name', validate: validators.maxLength(100) }),
    FormField({ label: 'Apellidos', name: 'apellidos', required: true, placeholder: 'Ej. Galvis', autocomplete: 'family-name', validate: validators.maxLength(100) }),
    FormField({
      label: 'Tipo de documento',
      name: 'tipo_documento',
      as: 'select',
      required: true,
      placeholder: 'Seleccione…',
      options: [
        { value: 'CC', label: 'Cédula de ciudadanía' },
        { value: 'TI', label: 'Tarjeta de identidad' },
        { value: 'CE', label: 'Cédula de extranjería' },
        { value: 'PA', label: 'Pasaporte' },
      ],
    }),
    FormField({ label: 'Número de documento', name: 'numero_documento', required: true, inputmode: 'numeric', placeholder: 'Ej. 1036000101', validate: validators.documento() }),
    FormField({ label: 'Fecha de nacimiento', name: 'fecha_nacimiento', type: 'date', required: true }),
    FormField({
      label: 'Género',
      name: 'genero',
      as: 'select',
      required: true,
      placeholder: 'Seleccione…',
      options: [
        { value: 'FEMENINO', label: 'Femenino' },
        { value: 'MASCULINO', label: 'Masculino' },
        { value: 'OTRO', label: 'Otro' },
      ],
    }),
    FormField({ label: 'Celular', name: 'telefono', type: 'tel', required: true, inputmode: 'numeric', placeholder: '3001110001', validate: validators.telefono() }),
    FormField({ label: 'Correo electrónico', name: 'email', type: 'email', optional: true, icon: 'mail', placeholder: 'paciente@correo.com', validate: validators.email() }),
    FormField({ label: 'EPS / Aseguradora', name: 'eps_aseguradora', optional: true, placeholder: 'Ej. Sura' }),
    FormField({ label: 'Dirección', name: 'direccion', optional: true, placeholder: 'Calle 10 # 43-12' }),
    FormField({
      label: 'Observaciones médicas',
      name: 'observaciones',
      as: 'textarea',
      optional: true,
      rows: 3,
      hint: 'Alergias, antecedentes u otra información relevante. Máximo 300 caracteres.',
      validate: validators.maxLength(300),
      className: 'sg-form__full',
    }),
    h(
      'div',
      { class: 'sg-form__actions sg-form__full' },
      Button({ label: 'Limpiar', variant: 'outline', type: 'reset' }),
      submit,
    ),
  );

  form.addEventListener('reset', () => {
    clearFormErrors(form);
    result.hidden = true;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm(form)) {
      toast.error('Revisa los campos marcados en rojo.', 'Formulario incompleto');
      return;
    }
    setButtonLoading(submit, true);
    await wait(900);
    setButtonLoading(submit, false);
    const data = Object.fromEntries(new FormData(form));
    result.textContent = JSON.stringify(data, null, 2);
    result.hidden = false;
    toast.success(`${data.nombres} ${data.apellidos} quedó disponible para agendamiento.`, 'Paciente registrado');
  });

  return card('Registrar paciente', 'HU-03 · RF-PAC-01 · campos de la tabla paciente.', form, result);
}

function loginForm() {
  const submit = Button({ label: 'Ingresar', type: 'submit', block: true });
  const passwordField = PasswordField({ label: 'Contraseña', name: 'password', required: true, placeholder: '••••••••' });

  const form = h(
    'form',
    { class: 'sg-form', novalidate: true },
    FormField({ label: 'Correo electrónico', name: 'email', type: 'email', icon: 'mail', required: true, autocomplete: 'username', placeholder: 'usuario@dentalcare.com', validate: validators.email() }),
    passwordField,
    submit,
    h('p', { class: 'sg-note' }, 'Demo: admin@dentalcare.com / Admin2026*'),
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm(form)) return;
    setButtonLoading(submit, true);
    await wait(800);
    setButtonLoading(submit, false);
    const { email, password } = Object.fromEntries(new FormData(form));
    if (email === 'admin@dentalcare.com' && password === 'Admin2026*') {
      toast.success('Redirigiendo al panel del Administrador…', 'Bienvenida, Laura');
    } else {
      // RF-ACC-02: mensaje genérico, sin revelar si el correo existe.
      setFieldError(passwordField, 'Correo o contraseña incorrectos.');
    }
  });

  return card('Iniciar sesión', 'HU-02 · error genérico (RF-ACC-02).', form);
}

function resetPasswordForm() {
  const newPassword = PasswordField({
    label: 'Nueva contraseña',
    name: 'nueva',
    required: true,
    autocomplete: 'new-password',
    hint: 'Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.',
    validate: validators.password(),
  });
  const passwordInput = newPassword.querySelector('input');

  const form = h(
    'form',
    { class: 'sg-form', novalidate: true },
    newPassword,
    PasswordField({
      label: 'Confirmar contraseña',
      name: 'confirmacion',
      required: true,
      autocomplete: 'new-password',
      validate: validators.matches(() => passwordInput.value, 'Las contraseñas no coinciden.'),
    }),
    Button({ label: 'Restablecer contraseña', type: 'submit', variant: 'secondary', block: true }),
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (validateForm(form)) {
      toast.success('Ya puedes iniciar sesión con tu nueva contraseña.', 'Contraseña actualizada');
      form.reset();
    }
  });

  return card('Restablecer contraseña', 'Validadores password() y matches().', form);
}

function renderFormsDemo() {
  mount($('#sg-forms'), patientForm(), h('div', { class: 'u-stack', style: { gap: 'var(--space-4)' } }, loginForm(), resetPasswordForm()));
}

function renderSearch() {
  const list = h('ul', { class: 'sg-list', role: 'list' });
  const counter = h('p', { class: 'sg-note', 'aria-live': 'polite' });

  const renderResults = (term = '') => {
    const query = normalize(term);
    const results = PACIENTES.filter((p) => normalize(p.nombre).includes(query) || p.documento.includes(query));
    counter.textContent = term ? `${results.length} resultado(s) para "${term}"` : `${PACIENTES.length} pacientes`;
    mount(
      list,
      results.length
        ? results.map((p) =>
            h(
              'li',
              { class: 'sg-list__item' },
              Avatar({ name: p.nombre, size: 'sm' }),
              h('span', {}, p.nombre),
              h('span', { class: 'sg-list__meta' }, `CC ${p.documento} · ${p.eps}`),
            ),
          )
        : h('li', { class: 'sg-empty' }, 'Ningún paciente coincide con la búsqueda.'),
    );
  };

  renderResults();
  mount(
    $('#sg-search'),
    h('div', { class: 'u-stack' }, SearchBar({ placeholder: 'Buscar por nombre o documento…', label: 'Buscar paciente', onSearch: renderResults }), counter),
    list,
  );
}

function renderKpis() {
  mount(
    $('#sg-kpis'),
    KpiCard({ label: 'Citas de hoy', value: 12, icon: 'calendar', tone: 'primary', trend: { value: '+3', direction: 'up' }, hint: 'vs. ayer', href: '#m-kpi' }),
    KpiCard({ label: 'Pacientes registrados', value: 40, icon: 'users', tone: 'info', trend: { value: '+12,5%', direction: 'up' }, hint: 'este mes' }),
    KpiCard({ label: 'Pagos pendientes', value: formatCOP(2350000), icon: 'dollar', tone: 'warning', trend: { value: '-8%', direction: 'down', positive: true }, hint: 'saldo por cobrar' }),
    KpiCard({ label: 'Cancelaciones', value: 2, icon: 'alert-circle', tone: 'danger', trend: { value: '+1', direction: 'up', positive: false }, hint: 'esta semana' }),
  );
}

function renderTabsDemo() {
  const citas = [
    { hora: '2026-10-20 08:00:00', paciente: 'Andrés Galvis', motivo: 'Valoración general y limpieza', estado: 'PROGRAMADA' },
    { hora: '2026-10-20 09:30:00', paciente: 'Mateo Londoño', motivo: 'Dolor agudo en pieza molar', estado: 'PENDIENTE_CONFIRMACION' },
    { hora: '2026-10-20 10:00:00', paciente: 'Sebastián Marín', motivo: 'Valoración y control odontológico', estado: 'PROGRAMADA' },
    { hora: '2026-10-20 11:00:00', paciente: 'Nicolás Arango', motivo: 'Control mensual de ortodoncia', estado: 'PROGRAMADA' },
  ];
  const pagos = [
    { paciente: 'Andrés Galvis', saldo: 90000, cuotas: 'Contado' },
    { paciente: 'Mateo Londoño', saldo: 100000, cuotas: 'Cuota 2 de 3' },
    { paciente: 'Sebastián Marín', saldo: 100000, cuotas: 'Cuota 2 de 3' },
  ];

  const citasList = () =>
    h(
      'ul',
      { class: 'sg-list', role: 'list' },
      citas.map((c) =>
        h(
          'li',
          { class: 'sg-list__item' },
          h('strong', { style: { minWidth: '4.5rem' } }, formatDate(c.hora, { hour: '2-digit', minute: '2-digit' })),
          h('span', {}, c.paciente, h('br'), h('span', { class: 'sg-note' }, c.motivo)),
          h('span', { class: 'sg-list__meta' }, StatusBadge(c.estado, { size: 'sm' })),
        ),
      ),
    );

  const pagosList = () =>
    h(
      'ul',
      { class: 'sg-list', role: 'list' },
      pagos.map((p) =>
        h(
          'li',
          { class: 'sg-list__item' },
          Avatar({ name: p.paciente, size: 'sm' }),
          h('span', {}, p.paciente, h('br'), h('span', { class: 'sg-note' }, p.cuotas)),
          h('strong', { class: 'sg-list__meta' }, formatCOP(p.saldo)),
        ),
      ),
    );

  const viewResult = h('p', { class: 'sg-result' }, 'Vista activa: semana');

  mount(
    $('#sg-tabs'),
    card(
      'Panel del Asistente',
      'Variante underline con contadores y paneles (HU-10).',
      Tabs({
        ariaLabel: 'Panel del asistente',
        tabs: [
          { id: 'citas', label: 'Próximas citas', icon: 'calendar', count: citas.length, content: citasList },
          { id: 'pagos', label: 'Pagos pendientes', icon: 'dollar', count: pagos.length, content: pagosList },
        ],
      }),
    ),
    card(
      'Vista de agenda',
      'Variante segmented sin paneles, controlada por onChange (RF-CIT-07).',
      Tabs({
        ariaLabel: 'Vista de la agenda',
        variant: 'segmented',
        activeId: 'semana',
        tabs: [
          { id: 'dia', label: 'Día' },
          { id: 'semana', label: 'Semana' },
          { id: 'mes', label: 'Mes' },
          { id: 'lista', label: 'Lista' },
        ],
        onChange: (id) => {
          viewResult.textContent = `Vista activa: ${id}`;
        },
      }),
      viewResult,
    ),
  );
}

function renderPaginationDemo() {
  const log = h('p', { class: 'sg-result' }, 'onChange → (sin cambios)');
  const pagination = Pagination({
    total: 40,
    pageSize: 10,
    onChange: (page) => {
      log.textContent = `onChange → página ${page}`;
    },
  });

  mount(
    $('#sg-pagination'),
    block(
      '40 citas · 10 por página',
      pagination,
      log,
      h(
        'div',
        { class: 'sg-row', style: { marginTop: 'var(--space-3)' } },
        Button({ label: 'Simular filtro (7 resultados)', variant: 'outline', size: 'sm', icon: 'filter', onClick: () => pagination.update({ total: 7, page: 1 }) }),
        Button({ label: 'Restablecer', variant: 'ghost', size: 'sm', onClick: () => pagination.update({ total: 40 }) }),
      ),
    ),
    block('237 registros · página 6 (puntos suspensivos a ambos lados)', Pagination({ total: 237, pageSize: 10, page: 6 })),
    block('Sin registros', Pagination({ total: 0 })),
  );
}

function renderFeedbackDemo() {
  const dialogLog = h('p', { class: 'sg-result' }, 'Resultado: —');
  let failNext = true;

  mount(
    $('#sg-feedback'),
    card(
      'Toast',
      'Se pausa al pasar el mouse. En móvil aparece arriba.',
      h(
        'div',
        { class: 'sg-row' },
        Button({ label: 'Éxito', variant: 'success', onClick: () => toast.success('La cita del 20 de octubre a las 9:30 a. m. quedó agendada.', 'Cita registrada') }),
        Button({ label: 'Información', variant: 'secondary', onClick: () => toast.info('Recordatorio enviado al paciente 48 h antes.') }),
        Button({ label: 'Advertencia', variant: 'outline', onClick: () => toast.warning('El Dr. Roberto no tiene horario configurado el sábado.', 'Sin disponibilidad') }),
        Button({ label: 'Error', variant: 'danger', onClick: () => toast.error('No fue posible conectar con el servidor. Intenta de nuevo.', 'Error de red') }),
      ),
    ),
    card(
      'ConfirmDialog',
      'Promesa que resuelve true/false. Con onConfirm asíncrono muestra carga y errores dentro del modal.',
      h(
        'div',
        { class: 'sg-row' },
        Button({
          label: 'Cancelar cita',
          variant: 'danger',
          icon: 'x',
          onClick: async () => {
            const ok = await confirmDialog({
              title: '¿Cancelar la cita?',
              message: 'La cita de Andrés Galvis del 20 oct. a las 8:00 a. m. se cancelará y el horario quedará libre.',
              confirmLabel: 'Sí, cancelar cita',
              cancelLabel: 'Volver',
              variant: 'danger',
            });
            dialogLog.textContent = `Resultado: ${ok}`;
            if (ok) toast.success('Se notificó al paciente y al odontólogo.', 'Cita cancelada');
          },
        }),
        Button({
          label: 'Inactivar rol (async)',
          variant: 'outline',
          icon: 'shield',
          onClick: async () => {
            const ok = await confirmDialog({
              title: '¿Inactivar el rol Recepcionista?',
              message: 'Los usuarios asociados a este rol también quedarán inactivos (RF-ROL-06). El primer intento simula un error del servidor.',
              confirmLabel: 'Inactivar',
              variant: 'danger',
              onConfirm: async () => {
                await wait(1200);
                if (failNext) {
                  failNext = false;
                  throw new Error('No se pudo inactivar el rol: tiempo de espera agotado. Intenta de nuevo.');
                }
              },
            });
            dialogLog.textContent = `Resultado: ${ok}`;
            if (ok) toast.success('El rol y sus usuarios quedaron inactivos.', 'Rol inactivado');
          },
        }),
        Button({
          label: 'Confirmar cita',
          icon: 'check',
          onClick: async () => {
            const ok = await confirmDialog({
              title: 'Confirmar solicitud de cita',
              message: 'Mateo Londoño solicitó cita para el 20 oct. a las 9:30 a. m. con el Dr. Roberto Martínez.',
              confirmLabel: 'Confirmar',
              variant: 'success',
            });
            dialogLog.textContent = `Resultado: ${ok}`;
          },
        }),
      ),
      dialogLog,
    ),
  );
}

function renderToothDemo() {
  const examples = [
    { fdi: 16, caption: '16 · 2 hallazgos' },
    { fdi: 11, caption: '11 · incisal' },
    { fdi: 21, caption: '21 · mesial' },
    { fdi: 36, caption: '36 · inferior' },
    { fdi: 46, caption: '46 · en proceso' },
    { fdi: 55, caption: '55 · temporal' },
    { fdi: 48, caption: '48 · ausente', ausente: true },
    { fdi: 12, caption: '12 · solo lectura', readonly: true },
  ];

  const gallery = h(
    'div',
    { class: 'sg-teeth' },
    examples.map(({ fdi, caption, ausente, readonly }) =>
      h(
        'div',
        { class: 'sg-teeth__item' },
        Tooth({
          fdi,
          faces: ODONTOGRAMA[fdi],
          ausente,
          readonly,
          onFaceClick: ({ fdi: n, faceLabel, data }) =>
            toast.info(data ? `${data.diagnostico} (${ESTADOS[data.estado]?.label ?? data.estado})` : 'Sin hallazgos registrados.', `Diente ${n} · ${faceLabel}`),
        }),
        caption,
      ),
    ),
  );

  const sizes = h('div', { class: 'sg-teeth' }, ['sm', 'md', 'lg'].map((size) => h('div', { class: 'sg-teeth__item' }, Tooth({ fdi: 36, faces: ODONTOGRAMA[36], size }), size)));

  // Laboratorio: registrar un hallazgo en una cara (flujo de HU-04)
  const panel = h('div', { class: 'sg-tooth-lab__panel' });
  let selection = null;

  const lab = Tooth({
    fdi: 46,
    size: 'lg',
    faces: ODONTOGRAMA[46],
    onFaceClick: (detail) => {
      selection = detail;
      renderPanel();
    },
  });

  function renderPanel() {
    if (!selection) {
      mount(panel, h('p', { class: 'sg-note' }, 'Selecciona una cara del diente 46 para registrar un hallazgo.'));
      return;
    }
    const current = getToothFaces(lab)[selection.face];
    const estado = FormField({
      label: 'Estado',
      as: 'select',
      value: current?.estado ?? '',
      options: [{ value: '', label: 'Sin hallazgo' }, ...Object.entries(TOOTH_ESTADOS).map(([value, label]) => ({ value, label }))],
    });
    const diagnostico = FormField({ label: 'Diagnóstico', value: current?.diagnostico ?? '', placeholder: 'Ej. Caries incipiente', validate: validators.maxLength(100) });

    mount(
      panel,
      h('p', { class: 'sg-subtitle' }, `Diente ${selection.fdi} · cara ${FACE_LABELS[selection.face].toLowerCase()}`),
      h(
        'div',
        { class: 'u-stack' },
        estado,
        diagnostico,
        h(
          'div',
          { class: 'sg-row' },
          Button({
            label: 'Aplicar',
            size: 'sm',
            icon: 'check',
            onClick: () => {
              const value = estado.querySelector('select').value;
              const text = diagnostico.querySelector('input').value.trim();
              if (value && !text) {
                setFieldError(diagnostico, 'Describe el hallazgo.');
                return;
              }
              setToothFace(lab, selection.face, value ? { estado: value, diagnostico: text } : null);
              toast.success(`Cara ${FACE_LABELS[selection.face].toLowerCase()} actualizada.`, `Diente ${selection.fdi}`);
            },
          }),
        ),
      ),
    );
  }
  renderPanel();

  mount(
    $('#sg-tooth'),
    block('Hallazgos del seed (clic en una cara)', gallery),
    block('Tamaños', sizes),
    block('Registrar hallazgo (flujo HU-04)', h('div', { class: 'sg-tooth-lab' }, lab, panel)),
    block('Leyenda', ToothLegend()),
  );
}

function renderSlotsDemo() {
  const result = h('p', { class: 'sg-result' }, 'Selecciona una franja disponible.');
  const occupied = { '08:00': 'Andrés Galvis', '10:00': 'Mateo Londoño', '11:00': 'Nicolás Arango' };
  let selected = null;

  // Horario real (tabla horario): Lunes 08:00–12:00 y 14:00–18:00. 12:00–14:00 queda bloqueado.
  const slots = [];
  for (let minutes = 8 * 60; minutes < 15 * 60; minutes += 30) {
    const start = toHHMM(minutes);
    const end = toHHMM(minutes + 30);
    const status = minutes >= 12 * 60 && minutes < 14 * 60 ? 'blocked' : occupied[start] ? 'occupied' : 'available';
    slots.push(
      TimeSlot({
        start,
        end,
        status,
        detail: occupied[start],
        onSelect: (slot, el) => {
          if (selected) setTimeSlotSelected(selected, false);
          selected = el;
          setTimeSlotSelected(el, true);
          result.textContent = `Cita propuesta: lunes ${slot.start}–${slot.end} con Dr. Roberto Martínez`;
        },
      }),
    );
  }

  mount($('#sg-slots'), h('div', { class: 'sg-slots' }, slots), result);
}

function toHHMM(totalMinutes) {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */

function init() {
  mount($('#sg-logo'), Icon({ name: 'tooth', size: 22 }));
  // Fundamentos
  renderColors();
  renderTypography();
  renderSpacing();
  // Átomos
  renderIcons();
  renderButtons();
  renderControls();
  renderBadges();
  renderAvatars();
  renderMisc();
  // Moléculas
  renderFormsDemo();
  renderSearch();
  renderKpis();
  renderTabsDemo();
  renderPaginationDemo();
  renderFeedbackDemo();
  renderToothDemo();
  renderSlotsDemo();
  // Organismos
  renderOrganisms();
}

init();
