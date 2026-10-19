import { h, cx, mount } from '../../core/dom.js';
import { Icon } from './icon.js';
import { Spinner } from './spinner.js';

const ICON_SIZE = { sm: 16, md: 18, lg: 20 };

/**
 * Átomo: Button
 * @param {object} props
 * @param {string} [props.label]                 Texto visible. Si se omite y hay ícono → botón solo-ícono.
 * @param {'primary'|'secondary'|'outline'|'ghost'|'danger'|'success'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.icon]                  Ícono a la izquierda.
 * @param {string} [props.iconRight]             Ícono a la derecha.
 * @param {'button'|'submit'|'reset'} [props.type='button']
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.block=false]          Ocupa el 100% del ancho.
 * @param {string} [props.ariaLabel]             Obligatorio en botones solo-ícono.
 * @param {(e: MouseEvent) => void} [props.onClick]
 * @param {string} [props.className]
 * @returns {HTMLButtonElement}
 */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  type = 'button',
  disabled = false,
  loading = false,
  block = false,
  ariaLabel,
  onClick,
  className,
  ...rest
} = {}) {
  const iconOnly = !label && Boolean(icon || iconRight);
  if (iconOnly && !ariaLabel) {
    console.warn('[Button] Un botón solo-ícono necesita `ariaLabel` para ser accesible.');
  }

  const btn = h('button', {
    type,
    class: cx(
      'btn',
      `btn--${variant}`,
      size !== 'md' && `btn--${size}`,
      iconOnly && 'btn--icon-only',
      block && 'btn--block',
      className,
    ),
    'aria-label': ariaLabel,
    title: iconOnly ? ariaLabel : undefined,
    onClick,
    ...rest,
  });

  // Se guarda la configuración para poder re-renderizar el contenido al cambiar el estado de carga.
  btn._dcProps = { label, icon, iconRight, size };
  renderContent(btn, loading);
  btn.disabled = disabled || loading;
  if (loading) btn.setAttribute('aria-busy', 'true');
  return btn;
}

function renderContent(btn, loading) {
  const { label, icon, iconRight, size } = btn._dcProps;
  const iconSize = ICON_SIZE[size] ?? ICON_SIZE.md;
  mount(
    btn,
    loading ? Spinner({ size: 'sm', inherit: true, label: 'Procesando…' }) : icon && Icon({ name: icon, size: iconSize }),
    label && h('span', { class: 'btn__label' }, label),
    !loading && iconRight && Icon({ name: iconRight, size: iconSize }),
  );
}

/**
 * Cambia el texto de un botón existente conservando íconos y estado
 * (usar esto y no textContent: setButtonLoading re-renderiza con el texto guardado).
 */
export function setButtonLabel(btn, label) {
  if (!btn?._dcProps) return;
  btn._dcProps.label = label;
  renderContent(btn, btn.getAttribute('aria-busy') === 'true');
}

/**
 * Activa/desactiva el estado de carga de un botón existente
 * (útil al enviar formularios mientras se espera la respuesta del servicio).
 * @param {HTMLButtonElement} btn
 * @param {boolean} loading
 */
export function setButtonLoading(btn, loading) {
  if (!btn?._dcProps) return;
  renderContent(btn, loading);
  btn.disabled = loading;
  if (loading) btn.setAttribute('aria-busy', 'true');
  else btn.removeAttribute('aria-busy');
}
