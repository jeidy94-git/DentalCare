import { h } from '../../core/dom.js';
import { Icon, Button } from '../atoms/index.js';

const ICONS = { info: 'info', success: 'check-circle', warning: 'alert-triangle', danger: 'alert-circle' };
const MAX_VISIBLE = 4;
const EXIT_MS = 250;

let region = null;

/** Contenedor único de notificaciones; se crea la primera vez que se usa. */
function getRegion() {
  if (!region?.isConnected) {
    region = h('div', { class: 'toast-region', 'aria-live': 'polite', 'aria-relevant': 'additions' });
    document.body.append(region);
  }
  return region;
}

/**
 * Molécula: Toast — notificación flotante temporal.
 * Se pausa al pasar el mouse o enfocar, para dar tiempo de leer (accesibilidad).
 * Los de tipo `danger` usan role="alert" para anunciarse de inmediato.
 *
 * @param {object} options
 * @param {string} options.message
 * @param {string} [options.title]
 * @param {'info'|'success'|'warning'|'danger'} [options.variant='info']
 * @param {number} [options.duration=5000]   ms; 0 = no se cierra solo.
 * @returns {{ dismiss: () => void, element: HTMLElement }}
 *
 * @example toast.success('Cita agendada para el 20 de octubre.', 'Cita registrada');
 */
export function toast({ message, title, variant = 'info', duration = 5000 } = {}) {
  const container = getRegion();

  const element = h(
    'div',
    { class: `toast toast--${variant}`, role: variant === 'danger' ? 'alert' : undefined },
    h('span', { class: 'toast__icon' }, Icon({ name: ICONS[variant] ?? ICONS.info, size: 20 })),
    h('div', { class: 'toast__body' }, title && h('p', { class: 'toast__title' }, title), h('p', { class: 'toast__message' }, message)),
  );

  let timer = null;
  let remaining = duration;
  let startedAt = 0;
  let closed = false;

  const dismiss = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    element.classList.remove('is-visible');
    setTimeout(() => element.remove(), EXIT_MS);
  };

  const start = () => {
    if (!duration || closed) return;
    startedAt = Date.now();
    timer = setTimeout(dismiss, remaining);
  };
  const pause = () => {
    if (!duration || closed) return;
    clearTimeout(timer);
    remaining -= Date.now() - startedAt;
  };

  element.append(Button({ icon: 'x', variant: 'ghost', size: 'sm', ariaLabel: 'Cerrar notificación', className: 'toast__close', onClick: dismiss }));
  element.addEventListener('mouseenter', pause);
  element.addEventListener('mouseleave', start);
  element.addEventListener('focusin', pause);
  element.addEventListener('focusout', start);

  container.append(element);
  while (container.children.length > MAX_VISIBLE) container.firstElementChild.remove();

  // Forzar un reflow aplica el estado inicial antes de la transición de entrada.
  // (requestAnimationFrame no sirve: se pausa en pestañas en segundo plano y el toast quedaría invisible).
  void element.offsetHeight;
  element.classList.add('is-visible');
  start();

  return { dismiss, element };
}

toast.info = (message, title) => toast({ message, title, variant: 'info' });
toast.success = (message, title) => toast({ message, title, variant: 'success' });
toast.warning = (message, title) => toast({ message, title, variant: 'warning' });
toast.error = (message, title) => toast({ message, title, variant: 'danger', duration: 8000 });
