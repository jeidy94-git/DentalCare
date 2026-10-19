import { h, cx } from '../../core/dom.js';

/**
 * Átomo: Spinner — indicador de carga.
 * @param {object} [props]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.label='Cargando…']  Texto para lectores de pantalla.
 * @param {boolean} [props.inherit=false]     Usa el color del texto padre (p. ej. dentro de un botón).
 */
export function Spinner({ size = 'md', label = 'Cargando…', inherit = false } = {}) {
  return h(
    'span',
    {
      class: cx('spinner', size !== 'md' && `spinner--${size}`, inherit && 'spinner--inherit'),
      role: 'status',
    },
    h('span', { class: 'u-visually-hidden' }, label),
  );
}
