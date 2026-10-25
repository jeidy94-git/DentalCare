import { h, mount, appendChildren } from '../../core/dom.js';
import { appUrl, ROLES } from '../../core/navigation.js';
import { Spinner } from '../atoms/index.js';
import { Breadcrumbs } from '../molecules/index.js';
import { Topbar, Sidebar } from '../organisms/index.js';

const APP_NAME = 'DentalCare';

/**
 * Template: DashboardLayout — el "marco" de todas las pantallas internas (SRS 3.1).
 *
 *   ┌──────────┬───────────────────────────────────────┐
 *   │          │ Topbar                                │
 *   │ Sidebar  ├───────────────────────────────────────┤
 *   │ (por     │ <main> Breadcrumbs                    │
 *   │  rol)    │        Título ............... Acciones │
 *   │          │        [ contenido de la página ]     │
 *   └──────────┴───────────────────────────────────────┘
 *
 * Accesibilidad: un enlace "Saltar al contenido principal" es lo primero que se tabula
 * (WCAG 2.4.1), y `<main tabindex="-1">` puede recibir ese foco. Hay un solo <h1> por página.
 *
 * El template no sabe QUÉ muestra la página: recibe el contenido en `content` (slot)
 * y lo cambia con `setContent()`. Las páginas (fase A6) solo llenan los huecos.
 *
 * @param {object} props
 * @param {'ADMINISTRADOR'|'RECEPCIONISTA'|'ESPECIALISTA'|'PACIENTE'} props.role
 * @param {{nombre: string, email: string, rol: string}} props.user
 * @param {string} [props.activeId]                 Ítem activo del sidebar.
 * @param {string} [props.title]                    <h1> de la página. Si se omite, la página pone el suyo.
 * @param {string} [props.subtitle]
 * @param {Array<{label: string, href?: string}>} [props.breadcrumbs]
 * @param {Node[]} [props.actions]                  Botones a la derecha del título.
 * @param {Node|Node[]} [props.content]
 * @param {Array} [props.notifications]
 * @param {Function} [props.onNavigate]             Se pasa al Sidebar.
 * @param {Function} [props.onLogout]
 * @param {Function} [props.onProfileAction]
 * @param {string} [props.mainId='contenido-principal']
 * @param {string} [props.sidebarId='app-sidebar']
 * @param {boolean} [props.syncDocumentTitle=true]  Actualiza <title> con el título (WCAG 2.4.2).
 * @returns {HTMLElement}  Expone update(), setContent(), setLoading(), setUser(), focusMain(),
 *                         y las referencias main, topbar, sidebar.
 */
export function DashboardLayout({
  role,
  user,
  activeId,
  title,
  subtitle,
  breadcrumbs = [],
  actions = [],
  content = [],
  notifications = [],
  onNavigate,
  onLogout,
  onProfileAction,
  mainId = 'contenido-principal',
  sidebarId = 'app-sidebar',
  syncDocumentTitle = true,
} = {}) {
  /* ---------- Organismos del marco ---------- */
  const sidebar = Sidebar({
    role,
    activeId,
    id: sidebarId,
    onNavigate,
    onOpenChange: (open) => topbar.setMenuExpanded(open),
  });
  const topbar = Topbar({
    user,
    notifications,
    homeHref: ROLES[role] ? appUrl(ROLES[role].home) : '#',
    sidebarId,
    onMenuToggle: () => sidebar.toggle(),
    onLogout,
    onProfileAction,
  });

  /* ---------- Encabezado de página ---------- */
  const crumbs = Breadcrumbs({ items: breadcrumbs });
  const heading = h('h1', { class: 'page-header__title' });
  const subtitleEl = h('p', { class: 'page-header__subtitle' });
  const actionsEl = h('div', { class: 'page-header__actions' });
  const header = h(
    'div',
    { class: 'page-header' },
    crumbs,
    h('div', { class: 'page-header__row' }, h('div', { class: 'page-header__text' }, heading, subtitleEl), actionsEl),
  );

  const body = h('div', { class: 'app-shell__body' });
  const main = h(
    'main',
    { id: mainId, class: 'app-shell__main', tabindex: -1 },
    h('div', { class: 'app-shell__content' }, header, body),
  );

  const skipLink = h('a', { class: 'skip-link', href: `#${mainId}` }, 'Saltar al contenido principal');

  const root = h(
    'div',
    { class: 'app-shell' },
    skipLink,
    sidebar,
    h('div', { class: 'app-shell__column' }, topbar, main),
  );

  /**
   * Cambia solo las partes indicadas del encabezado:
   * update({ title: 'Pacientes', breadcrumbs: [...] }) deja intactos subtitle y actions.
   */
  function update(patch = {}) {
    if ('title' in patch) {
      heading.textContent = patch.title ?? '';
      heading.hidden = !patch.title;
      // Sin título (p. ej. la ficha del paciente, cuyo <h1> lo pone DetailLayout) la página fija el <title>.
      if (syncDocumentTitle && patch.title) root.ownerDocument.title = `${patch.title} · ${APP_NAME}`;
    }
    if ('subtitle' in patch) {
      subtitleEl.textContent = patch.subtitle ?? '';
      subtitleEl.hidden = !patch.subtitle;
    }
    if ('breadcrumbs' in patch) crumbs.setItems(patch.breadcrumbs ?? []);
    if ('actions' in patch) {
      mount(actionsEl, patch.actions ?? []);
      actionsEl.hidden = !actionsEl.hasChildNodes();
    }
    // Sin título, migas ni acciones, el encabezado no ocupa espacio.
    header.hidden = heading.hidden && crumbs.hidden && actionsEl.hidden;
  }

  /** Reemplaza el contenido de la página (slot principal). */
  function setContent(...nodes) {
    main.removeAttribute('aria-busy');
    mount(body, ...nodes);
  }

  /** Estado de carga mientras llegan los datos (servicios mock en A5, API en D). */
  function setLoading(loading = true, message = 'Cargando…') {
    if (!loading) {
      main.removeAttribute('aria-busy');
      return;
    }
    main.setAttribute('aria-busy', 'true');
    mount(body, h('div', { class: 'page-loading' }, Spinner({ label: message }), h('span', { 'aria-hidden': 'true' }, message)));
  }

  update({ title, subtitle, breadcrumbs, actions });
  appendChildren(body, [content]);

  root.update = update;
  root.setContent = setContent;
  root.setLoading = setLoading;
  root.setUser = (user) => topbar.setUser(user);
  root.focusMain = () => main.focus();
  root.main = main;
  root.topbar = topbar;
  root.sidebar = sidebar;
  return root;
}
