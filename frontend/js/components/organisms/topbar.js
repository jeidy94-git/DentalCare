import { h, mount, uniqueId } from '../../core/dom.js';
import { formatLongDate, formatRelative } from '../../core/format.js';
import { toISODate } from '../../core/dates.js';
import { bindDisclosure } from '../../core/popover.js';
import { ROLES } from '../../core/navigation.js';
import { Icon, Button, Avatar } from '../atoms/index.js';

const NOTIF_ICON = { info: 'info', success: 'check-circle', warning: 'alert-triangle', danger: 'alert-circle' };

/**
 * Organismo: Topbar — logo, fecha del día (es-CO), notificaciones y menú de perfil (SRS 3.1).
 *
 * @param {object} props
 * @param {{nombre: string, email: string, rol: string, cargo?: string}} props.user
 * @param {Array<{id, tipo, titulo, mensaje, fecha, leida}>} [props.notifications]
 * @param {string} [props.homeHref='#']
 * @param {string} [props.sidebarId]                Id del Sidebar que controla el botón de menú (móvil).
 * @param {() => void} [props.onMenuToggle]
 * @param {() => void} [props.onLogout]
 * @param {(item: 'perfil'|'configuracion') => void} [props.onProfileAction]
 * @returns {HTMLElement}  Expone `setMenuExpanded(bool)` y `setNotifications(list)`.
 */
export function Topbar({ user, notifications = [], homeHref = '#', sidebarId, onMenuToggle, onLogout, onProfileAction } = {}) {
  let items = notifications.map((n) => ({ ...n }));

  /* ---------- Menú (solo móvil) ---------- */
  const menuBtn = Button({
    icon: 'menu',
    variant: 'ghost',
    ariaLabel: 'Abrir menú de navegación',
    className: 'topbar__menu-toggle',
    'aria-controls': sidebarId,
    'aria-expanded': 'false',
    onClick: () => onMenuToggle?.(),
  });

  const brand = h(
    'a',
    { class: 'topbar__brand', href: homeHref },
    h('span', { class: 'topbar__logo', 'aria-hidden': 'true' }, Icon({ name: 'tooth', size: 20 })),
    h('span', { class: 'topbar__name' }, 'DentalCare'),
  );

  const date = h(
    'p',
    { class: 'topbar__date' },
    Icon({ name: 'calendar', size: 16 }),
    h('time', { datetime: toISODate() }, formatLongDate(new Date())),
  );

  /* ---------- Notificaciones ---------- */
  const notifBtn = Button({ icon: 'bell', variant: 'ghost', ariaLabel: 'Notificaciones', className: 'topbar__icon-btn' });
  const countBadge = h('span', { class: 'badge badge--count topbar__count', 'aria-hidden': 'true' });
  notifBtn.append(countBadge);
  const notifList = h('ul', { class: 'notif-list', role: 'list' });
  const markAllBtn = h('button', { type: 'button', class: 'popover__action', onClick: () => markRead() }, 'Marcar todas como leídas');
  const notifPanel = h(
    'div',
    { class: 'popover popover--notifications', id: uniqueId('notif'), role: 'region', 'aria-label': 'Notificaciones' },
    h('div', { class: 'popover__header' }, h('p', { class: 'popover__title' }, 'Notificaciones'), markAllBtn),
    notifList,
  );

  function markRead(id) {
    items = items.map((n) => (id === undefined || n.id === id ? { ...n, leida: true } : n));
    renderNotifications();
  }

  function renderNotifications() {
    const unread = items.filter((n) => !n.leida).length;
    countBadge.textContent = unread > 9 ? '9+' : String(unread);
    countBadge.hidden = unread === 0;
    const label = unread ? `Notificaciones (${unread} sin leer)` : 'Notificaciones';
    notifBtn.setAttribute('aria-label', label);
    notifBtn.title = label;
    markAllBtn.hidden = unread === 0;

    mount(
      notifList,
      items.length
        ? items.map((n) =>
            h(
              'li',
              {},
              h(
                'button',
                { type: 'button', class: `notif-item notif-item--${n.tipo ?? 'info'}${n.leida ? '' : ' is-unread'}`, onClick: () => markRead(n.id) },
                h('span', { class: 'notif-item__icon', 'aria-hidden': 'true' }, Icon({ name: NOTIF_ICON[n.tipo] ?? 'info', size: 16 })),
                h(
                  'span',
                  { class: 'notif-item__body' },
                  h('span', { class: 'notif-item__title' }, n.titulo, !n.leida && h('span', { class: 'u-visually-hidden' }, ' (sin leer)')),
                  h('span', { class: 'notif-item__message' }, n.mensaje),
                  h('span', { class: 'notif-item__time' }, formatRelative(n.fecha)),
                ),
              ),
            ),
          )
        : h('li', { class: 'popover__empty' }, 'No tienes notificaciones.'),
    );
  }

  /* ---------- Perfil ---------- */
  const roleLabel = ROLES[user?.rol]?.label ?? user?.cargo ?? '';
  const profileBtn = h(
    'button',
    { type: 'button', class: 'topbar__profile', 'aria-label': `Menú de usuario: ${user?.nombre ?? ''}` },
    Avatar({ name: user?.nombre ?? '', size: 'sm' }),
    h(
      'span',
      { class: 'topbar__user', 'aria-hidden': 'true' },
      h('span', { class: 'topbar__user-name' }, user?.nombre),
      h('span', { class: 'topbar__user-role' }, roleLabel),
    ),
    Icon({ name: 'chevron-down', size: 16, className: 'topbar__chevron' }),
  );

  const menuItem = (icon, label, onClick, className = '') =>
    h('li', {}, h('button', { type: 'button', class: `popover__item ${className}`, onClick }, Icon({ name: icon, size: 16 }), label));

  const profilePanel = h(
    'div',
    { class: 'popover popover--profile', id: uniqueId('profile') },
    h(
      'div',
      { class: 'popover__user' },
      h('p', { class: 'popover__title' }, user?.nombre),
      h('p', { class: 'popover__meta' }, user?.email),
      h('span', { class: 'badge badge--primary badge--sm' }, roleLabel),
    ),
    h(
      'ul',
      { class: 'popover__menu', role: 'list' },
      menuItem('user', 'Mi perfil', () => {
        profile.hide();
        onProfileAction?.('perfil');
      }),
      menuItem('settings', 'Configuración', () => {
        profile.hide();
        onProfileAction?.('configuracion');
      }),
      menuItem(
        'log-out',
        'Cerrar sesión',
        () => {
          profile.hide();
          onLogout?.();
        },
        'popover__item--danger',
      ),
    ),
  );

  const notifWrap = h('div', { class: 'topbar__popover-anchor' }, notifBtn, notifPanel);
  const profileWrap = h('div', { class: 'topbar__popover-anchor' }, profileBtn, profilePanel);

  const notif = bindDisclosure(notifBtn, notifPanel, { onOpen: () => profile.hide() });
  const profile = bindDisclosure(profileBtn, profilePanel, { onOpen: () => notif.hide() });

  renderNotifications();

  const root = h(
    'header',
    { class: 'topbar' },
    h('div', { class: 'topbar__start' }, menuBtn, brand),
    h('div', { class: 'topbar__end' }, date, notifWrap, profileWrap),
  );

  root.setMenuExpanded = (expanded) => {
    menuBtn.setAttribute('aria-expanded', String(expanded));
    menuBtn.setAttribute('aria-label', expanded ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
  };
  root.setNotifications = (list) => {
    items = list.map((n) => ({ ...n }));
    renderNotifications();
  };
  return root;
}
