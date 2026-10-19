import { h, cx } from '../../core/dom.js';
import { Icon } from './icon.js';

/**
 * Átomo: Input (texto, email, password, number, date, time, tel, search).
 * Si se pasa `icon`, devuelve un <span.input-wrap> que contiene el ícono y el <input>;
 * en ese caso el input se obtiene con `el.querySelector('input')` o con `getControl(el)`.
 *
 * @param {object} props
 * @param {string} [props.id]
 * @param {string} [props.name]
 * @param {string} [props.type='text']
 * @param {string|number} [props.value]
 * @param {string} [props.placeholder]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.icon]                Ícono a la izquierda.
 * @param {boolean} [props.invalid=false]      Marca aria-invalid (borde rojo).
 * @param {boolean} [props.required=false]
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.readonly=false]
 * @param {string} [props.describedBy]        Id del texto de ayuda / error.
 * @param {string} [props.className]
 * @returns {HTMLInputElement|HTMLSpanElement}
 */
export function Input({
  id,
  name,
  type = 'text',
  value,
  placeholder,
  size = 'md',
  icon,
  invalid = false,
  required = false,
  disabled = false,
  readonly = false,
  describedBy,
  className,
  ...rest
} = {}) {
  const input = h('input', {
    id,
    name: name ?? id,
    type,
    value,
    placeholder,
    class: cx('input', size !== 'md' && `input--${size}`, className),
    required,
    disabled,
    readonly,
    'aria-invalid': invalid ? 'true' : undefined,
    'aria-describedby': describedBy,
    ...rest,
  });

  if (!icon) return input;
  return h('span', { class: 'input-wrap' }, Icon({ name: icon, size: 18, className: 'input-wrap__icon' }), input);
}

/**
 * Átomo: Select con chevron propio. Devuelve siempre el envoltorio <span.select-wrap>.
 * @param {object} props
 * @param {Array<string|{value: string|number, label: string, disabled?: boolean}>} props.options
 * @param {string} [props.placeholder]   Opción inicial vacía (no seleccionable).
 * @param {string|number} [props.value]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.invalid=false]
 */
export function Select({
  id,
  name,
  options = [],
  placeholder,
  value,
  size = 'md',
  invalid = false,
  required = false,
  disabled = false,
  describedBy,
  className,
  ...rest
} = {}) {
  const normalized = options.map((opt) => (typeof opt === 'object' ? opt : { value: opt, label: opt }));
  const hasValue = value !== undefined && value !== null && value !== '';

  const select = h(
    'select',
    {
      id,
      name: name ?? id,
      class: cx('select', size !== 'md' && `select--${size}`, className),
      required,
      disabled,
      'aria-invalid': invalid ? 'true' : undefined,
      'aria-describedby': describedBy,
      ...rest,
    },
    placeholder && h('option', { value: '', disabled: true, selected: !hasValue }, placeholder),
    normalized.map((opt) =>
      h(
        'option',
        { value: opt.value, disabled: opt.disabled, selected: hasValue && String(opt.value) === String(value) },
        opt.label,
      ),
    ),
  );

  return h('span', { class: 'select-wrap' }, select, Icon({ name: 'chevron-down', size: 18, className: 'select-wrap__chevron' }));
}

/**
 * Átomo: Textarea
 * @param {object} props
 * @param {number} [props.rows=4]
 * @param {number} [props.maxLength]
 */
export function Textarea({
  id,
  name,
  value,
  placeholder,
  rows = 4,
  maxLength,
  invalid = false,
  required = false,
  disabled = false,
  readonly = false,
  describedBy,
  className,
  ...rest
} = {}) {
  const textarea = h('textarea', {
    id,
    name: name ?? id,
    placeholder,
    rows,
    maxlength: maxLength,
    class: cx('textarea', className),
    required,
    disabled,
    readonly,
    'aria-invalid': invalid ? 'true' : undefined,
    'aria-describedby': describedBy,
    ...rest,
  });
  if (value !== undefined) textarea.value = value;
  return textarea;
}

/** Devuelve el control nativo (input/select/textarea) aunque el átomo venga envuelto. */
export function getControl(el) {
  return el.matches?.('input, select, textarea') ? el : el.querySelector('input, select, textarea');
}

/** Cambia el estado inválido de un control (o de su envoltorio). */
export function setInvalid(el, invalid) {
  const control = getControl(el);
  if (!control) return;
  if (invalid) control.setAttribute('aria-invalid', 'true');
  else control.removeAttribute('aria-invalid');
}
