import { h, cx } from '../../core/dom.js';
import { Icon } from './icon.js';

/**
 * Átomo: Checkbox
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.id]
 * @param {string} [props.name]
 * @param {string} [props.value]
 * @param {boolean} [props.checked=false]
 * @param {boolean} [props.disabled=false]
 * @param {(e: Event) => void} [props.onChange]
 * @returns {HTMLLabelElement}
 */
export function Checkbox({ label, id, name, value, checked = false, disabled = false, onChange, className, ...rest } = {}) {
  return h(
    'label',
    { class: cx('check', className) },
    h('input', { type: 'checkbox', class: 'check__input', id, name, value, checked, disabled, onChange, ...rest }),
    h('span', { class: 'check__box', 'aria-hidden': 'true' }, Icon({ name: 'check', size: 12 })),
    label && h('span', { class: 'check__label' }, label),
  );
}

/**
 * Átomo: Radio (usar el mismo `name` para agrupar).
 * @param {object} props  Igual que Checkbox.
 */
export function Radio({ label, id, name, value, checked = false, disabled = false, onChange, className, ...rest } = {}) {
  return h(
    'label',
    { class: cx('check', 'check--radio', className) },
    h('input', { type: 'radio', class: 'check__input', id, name, value, checked, disabled, onChange, ...rest }),
    h('span', { class: 'check__box', 'aria-hidden': 'true' }),
    label && h('span', { class: 'check__label' }, label),
  );
}

/**
 * Átomo: Switch — para estados binarios como ACTIVO/INACTIVO (roles, usuarios, servicios).
 * @param {object} props  Igual que Checkbox.
 */
export function Switch({ label, id, name, checked = false, disabled = false, onChange, className, ...rest } = {}) {
  return h(
    'label',
    { class: cx('switch', className) },
    h('input', { type: 'checkbox', role: 'switch', class: 'switch__input', id, name, checked, disabled, onChange, ...rest }),
    h('span', { class: 'switch__track', 'aria-hidden': 'true' }),
    label && h('span', { class: 'switch__label' }, label),
  );
}
