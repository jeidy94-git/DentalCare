import { h } from '../../core/dom.js';
import { getNav, appUrl, ROLES } from '../../core/navigation.js';
import { Icon, Button } from '../atoms/index.js';

const MOBILE_QUERY = '(max-width: 1023px)';

/**
 * Organismo: Sidebar — navegación dinámica según el rol (SRS 3.1).
 * Escritorio: fijo a la izquierda. Móvil (< 1024px): panel deslizable con fondo oscuro,
 * se cierra con Escape, con el fondo o al navegar, y devuelve el foco al botón que lo abrió.
 *
 * @param {object} props
 * @param {'ADMINISTRADOR'|'RECEPCIONISTA'|'ESPECIALISTA'|'PACIENTE'} props.role
 * @param {string} [props.activeId]                         Ítem actual (aria-current="page").
 * @param {string} [props.id='app-sidebar']
 * @param {(item: object, event: MouseEvent) => void} [props.onNavigate]
 *        Opcional. Si llama a event.preventDefault(), la navegación no ocurre (útil en demos).
 * @param {(open: boolean) => void} [props.onOpenChange]    Para sincronizar el botón de la Topbar.
 * @returns {HTMLElement}  Expone open(), close(), toggle(), isOpen(), setActive(id).
 */
export function Sidebar({ role, activeId, id = 'app-sidebar', onNavigate, onOpenChange } = {}) {
  const links = new Map();
  let opener = null;
  let isOpenState = false;

  // Los ids de sección usan el índice: aria-labelledby separa por espacios ("Mi portal" rompería).
  const sections = getNav(role).map((section, index) =>
    h(
      'div',
      { class: 'sidebar__section' },
      h('p', { class: 'sidebar__section-title', id: `${id}-sec-${index}` }, section.section),
      h(
        'ul',
        { class: 'sidebar__list', role: 'list', 'aria-labelledby': `${id}-sec-${index}` },
        section.items.map((item) => {
          const link = h(
            'a',
            {
              class: 'sidebar__link',
              href: appUrl(item.href),
              dataset: { navId: item.id },
              onClick: (event) => {
                onNavigate?.(item, event);
                if (event.defaultPrevented) {
                  setActive(item.id);
                  close(false);
                }
              },
            },
            Icon({ name: item.icon, size: 20 }),
            h('span', { class: 'sidebar__label' }, item.label),
            item.badge !== undefined && h('span', { class: 'badge badge--count sidebar__badge' }, item.badge),
          );
          links.set(item.id, link);
          return h('li', {}, link);
        }),
      ),
    ),
  );

  const closeBtn = Button({ icon: 'x', variant: 'ghost', ariaLabel: 'Cerrar menú', className: 'sidebar__close', onClick: () => close(true) });

  const aside = h(
    'aside',
    { class: 'sidebar', id, 'aria-label': 'Navegación principal' },
    h(
      'div',
      { class: 'sidebar__header' },
      h(
        'span',
        { class: 'sidebar__brand' },
        h('span', { class: 'sidebar__logo', 'aria-hidden': 'true' }, Icon({ name: 'tooth', size: 18 })),
        'DentalCare',
      ),
      closeBtn,
    ),
    h('nav', { class: 'sidebar__nav', 'aria-label': `Menú de ${ROLES[role]?.label ?? 'usuario'}` }, sections),
    h(
      'div',
      { class: 'sidebar__footer' },
      Icon({ name: 'shield', size: 16 }),
      h('span', {}, 'Rol: ', h('strong', {}, ROLES[role]?.label ?? role)),
    ),
  );

  const overlay = h('div', { class: 'sidebar-overlay', hidden: true, onClick: () => close(true) });
  const root = h('div', { class: 'sidebar-wrap' }, overlay, aside);

  const isMobile = () => root.ownerDocument.defaultView.matchMedia(MOBILE_QUERY).matches;

  const onKeyDown = (event) => {
    if (event.key === 'Escape') close(true);
  };

  function open() {
    if (isOpenState) return;
    isOpenState = true;
    opener = root.ownerDocument.activeElement;
    aside.classList.add('is-open');
    overlay.hidden = false;
    root.ownerDocument.addEventListener('keydown', onKeyDown);
    (links.get(activeId) ?? links.values().next().value)?.focus();
    onOpenChange?.(true);
  }

  function close(returnFocus = true) {
    if (!isOpenState) return;
    isOpenState = false;
    aside.classList.remove('is-open');
    overlay.hidden = true;
    root.ownerDocument.removeEventListener('keydown', onKeyDown);
    if (returnFocus && isMobile()) opener?.focus?.();
    onOpenChange?.(false);
  }

  function setActive(navId) {
    activeId = navId;
    for (const [key, link] of links) {
      link.classList.toggle('is-active', key === navId);
      if (key === navId) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }

  setActive(activeId);
  root.open = open;
  root.close = close;
  root.toggle = () => (isOpenState ? close(true) : open());
  root.isOpen = () => isOpenState;
  root.setActive = setActive;
  return root;
}
