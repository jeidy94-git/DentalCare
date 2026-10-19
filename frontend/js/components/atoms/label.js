import { h, cx } from '../../core/dom.js';

/**
 * Átomo: Label
 * @param {object} props
 * @param {string} props.text
 * @param {string} [props.htmlFor]          Id del control asociado.
 * @param {boolean} [props.required=false]  Muestra asterisco (y "obligatorio" para lectores de pantalla).
 * @param {boolean} [props.optional=false]  Muestra "(opcional)".
 * @returns {HTMLLabelElement}
 */
export function Label({ text, htmlFor, required = false, optional = false, className, ...rest } = {}) {
  return h(
    'label',
    { class: cx('label', className), for: htmlFor, ...rest },
    text,
    required && [
      h('span', { class: 'label__required', 'aria-hidden': 'true' }, '*'),
      h('span', { class: 'u-visually-hidden' }, '(obligatorio)'),
    ],
    optional && !required && h('span', { class: 'label__optional' }, '(opcional)'),
  );
}
