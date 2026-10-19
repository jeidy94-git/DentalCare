import { h, cx, mount, uniqueId } from '../../core/dom.js';
import { validators, compose } from '../../core/validators.js';
import { Input, Select, Textarea, Label, Icon, Button, getControl, setInvalid } from '../atoms/index.js';

const CONTROL_FACTORY = { input: Input, select: Select, textarea: Textarea };

/**
 * Molécula: FormField = Label + Control + ayuda + error accesible.
 * Implementa la validación en línea del SRS 3.1: el mensaje aparece junto al campo,
 * se anuncia a lectores de pantalla (aria-live) y se enlaza con aria-describedby.
 *
 * Los formularios que lo usen deben llevar `novalidate` para que el navegador
 * no muestre sus propios globos de error.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.id]                         Se genera si no se indica.
 * @param {'input'|'select'|'textarea'} [props.as='input']
 * @param {HTMLElement} [props.control]               Control ya construido (alternativa a `as`).
 *                                                    En ese caso `controlProps` se ignoran: name, type… van en el control.
 * @param {boolean} [props.required=false]            Agrega el validador "obligatorio".
 * @param {boolean} [props.optional=false]
 * @param {string} [props.hint]                       Texto de ayuda permanente.
 * @param {string} [props.error]                      Error inicial (p. ej. devuelto por el backend).
 * @param {Function|Function[]} [props.validate]      Validador(es) de core/validators.js.
 * @param {'blur'|'input'} [props.validateOn='blur']  Cuándo validar por primera vez.
 * @param {...any} controlProps                       Se pasan al átomo (type, placeholder, options…).
 * @returns {HTMLDivElement}
 */
export function FormField({
  label,
  id = uniqueId('field'),
  as = 'input',
  control,
  required = false,
  optional = false,
  hint,
  error,
  validate,
  validateOn = 'blur',
  className,
  ...controlProps
} = {}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = `${id}-error`;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ');

  const controlEl = control ?? CONTROL_FACTORY[as]({ id, required, describedBy, ...controlProps });
  const native = getControl(controlEl);
  if (control) {
    if (!native.id) native.id = id;
    native.required = required;
    const previous = native.getAttribute('aria-describedby');
    native.setAttribute('aria-describedby', [previous, describedBy].filter(Boolean).join(' '));
  }

  // El contenedor de error existe siempre (vacío) para que aria-live anuncie los cambios.
  const errorEl = h('p', { id: errorId, class: 'field__error', 'aria-live': 'polite' });

  const field = h(
    'div',
    { class: cx('field', className) },
    Label({ text: label, htmlFor: native.id, required, optional }),
    controlEl,
    hint && h('p', { id: hintId, class: 'field__hint' }, hint),
    errorEl,
  );

  const rules = [required && validators.required(), validate].flat().filter(Boolean);
  field._dcField = { control: native, errorEl, validate: compose(rules) };

  if (rules.length) {
    const firstTrigger = native.tagName === 'SELECT' ? 'change' : validateOn;
    native.addEventListener(firstTrigger, () => validateField(field));
    // Una vez marcado como inválido, se revalida al escribir para quitar el error en cuanto se corrija.
    native.addEventListener('input', () => {
      if (native.getAttribute('aria-invalid') === 'true') validateField(field);
    });
  }

  if (error) setFieldError(field, error);
  return field;
}

/**
 * Molécula: PasswordField — FormField con botón mostrar/ocultar.
 * El botón usa aria-pressed + aria-controls y cambia su nombre accesible.
 * @param {object} props  Mismas props de FormField + `autocomplete`
 *                        ('current-password' para login, 'new-password' para registro).
 */
export function PasswordField({ id = uniqueId('pwd'), name, placeholder, autocomplete = 'current-password', ...fieldProps } = {}) {
  // Las props del control van al Input: FormField no las aplica cuando recibe un `control` ya construido.
  const input = Input({ id, name, type: 'password', placeholder, autocomplete, className: 'password__input' });

  const toggle = Button({
    icon: 'eye',
    variant: 'ghost',
    size: 'sm',
    ariaLabel: 'Mostrar contraseña',
    className: 'password__toggle',
    'aria-controls': id,
    'aria-pressed': 'false',
  });

  toggle.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    const text = show ? 'Ocultar contraseña' : 'Mostrar contraseña';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', text);
    toggle.title = text;
    mount(toggle, Icon({ name: show ? 'eye-off' : 'eye', size: 16 }));
    input.focus();
  });

  return FormField({ id, control: h('span', { class: 'password' }, input, toggle), ...fieldProps });
}

/* ------------------------------------------------------------------ */
/* API de validación                                                   */
/* ------------------------------------------------------------------ */

/** Muestra (o limpia, con null) el mensaje de error de un FormField. */
export function setFieldError(field, message) {
  const { control, errorEl } = field._dcField ?? {};
  if (!control) return;
  mount(errorEl, message && [Icon({ name: 'alert-circle', size: 14 }), h('span', {}, message)]);
  setInvalid(control, Boolean(message));
  field.classList.toggle('field--invalid', Boolean(message));
}

/** Ejecuta los validadores del campo. Devuelve true si es válido. */
export function validateField(field) {
  const meta = field._dcField;
  if (!meta) return true;
  const value = meta.control.type === 'checkbox' ? meta.control.checked : meta.control.value;
  const message = meta.validate(value, meta.control);
  setFieldError(field, message);
  return !message;
}

/**
 * Valida todos los FormField de un formulario y lleva el foco al primero inválido.
 * @param {HTMLFormElement|HTMLElement} form
 * @returns {boolean} true si todo es válido.
 */
export function validateForm(form) {
  let firstInvalid = null;
  for (const field of form.querySelectorAll('.field')) {
    if (!validateField(field) && !firstInvalid) firstInvalid = field;
  }
  firstInvalid?._dcField.control.focus();
  return !firstInvalid;
}

/** Limpia todos los errores (útil al hacer reset del formulario). */
export function clearFormErrors(form) {
  for (const field of form.querySelectorAll('.field')) setFieldError(field, null);
}
