import { h, cx } from '../../core/dom.js';
import { Icon } from './icon.js';

/**
 * Átomo: Link
 * @param {object} props
 * @param {string} props.href
 * @param {string} props.label
 * @param {'default'|'muted'} [props.variant='default']
 * @param {'sm'|'md'} [props.size='md']
 * @param {string} [props.icon]
 * @param {boolean} [props.external=false]  Abre en pestaña nueva de forma segura.
 * @returns {HTMLAnchorElement}
 */
export function Link({ href, label, variant = 'default', size = 'md', icon, external = false, className, ...rest } = {}) {
  return h(
    'a',
    {
      href,
      class: cx('link', variant !== 'default' && `link--${variant}`, size === 'sm' && 'link--sm', className),
      target: external ? '_blank' : undefined,
      rel: external ? 'noopener noreferrer' : undefined,
      ...rest,
    },
    icon && Icon({ name: icon, size: 16 }),
    label,
  );
}
