import { h, cx, mount, uniqueId } from '../../core/dom.js';
import { Button, setButtonLoading, Icon } from '../atoms/index.js';
import { validateForm, setFieldError } from '../molecules/index.js';

/**
 * Organismo: ModalForm — formulario dentro de un <dialog> modal nativo.
 * Ejemplos: alta rápida de paciente sin salir del agendamiento (RF-CIT-02), editar tratamiento.
 *
 * Flujo: validación en línea (FormField) → onSubmit asíncrono con botón en "cargando" →
 * si onSubmit lanza un Error se muestra en el modal; si el error trae `field` (name del control),
 * el mensaje se pinta junto a ese campo (p. ej. "documento ya registrado").
 *
 * No se cierra al hacer clic en el fondo (evita perder lo digitado); sí con Escape, la X o Cancelar.
 *
 * @param {object} options
 * @param {string} options.title
 * @param {string} [options.description]
 * @param {() => Node|Node[]} options.fields            Construye los FormField del formulario.
 * @param {string} [options.submitLabel='Guardar']
 * @param {string} [options.cancelLabel='Cancelar']
 * @param {'md'|'lg'} [options.size='md']
 * @param {boolean} [options.printable=false]  Comprobante: al imprimir (o «Guardar como PDF») sale solo este diálogo.
 * @param {(data: object, form: HTMLFormElement) => Promise<any>|any} [options.onSubmit]
 *        Lo que devuelva se usa como resultado; si no devuelve nada, el resultado son los datos.
 * @returns {Promise<any|null>}  null si se canceló.
 */
export function openModalForm({ title, description, fields, submitLabel = 'Guardar', cancelLabel = 'Cancelar', size = 'md', printable = false, onSubmit } = {}) {
  return new Promise((resolve) => {
    const titleId = uniqueId('mf-title');
    const descId = description ? uniqueId('mf-desc') : undefined;
    let busy = false;
    let settled = false;
    let result = null;

    const errorBanner = h('div', { class: 'modal-form__error', role: 'alert' });
    const submitBtn = Button({ label: submitLabel, type: 'submit', icon: 'check' });
    const cancelBtn = Button({ label: cancelLabel, variant: 'outline', onClick: () => close(null) });

    const form = h(
      'form',
      { class: 'modal-form__form', novalidate: true },
      h('div', { class: 'modal-form__body' }, errorBanner, fields()),
      h('div', { class: 'modal-form__footer' }, cancelBtn, submitBtn),
    );

    const dialog = h(
      'dialog',
      { class: cx('dialog', 'modal-form', `modal-form--${size}`, printable && 'modal-form--printable'), 'aria-labelledby': titleId, 'aria-describedby': descId },
      h(
        'div',
        { class: 'modal-form__header' },
        h('div', {}, h('h2', { id: titleId, class: 'modal-form__title' }, title), description && h('p', { id: descId, class: 'modal-form__description' }, description)),
        Button({ icon: 'x', variant: 'ghost', ariaLabel: 'Cerrar', onClick: () => close(null) }),
      ),
      form,
    );

    function finish() {
      if (settled) return;
      settled = true;
      dialog.remove();
      resolve(result);
    }

    function close(value) {
      if (busy) return;
      result = value;
      dialog.close();
      finish();
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      mount(errorBanner);
      if (!validateForm(form)) return;

      const data = Object.fromEntries(new FormData(form));
      if (!onSubmit) return close(data);

      busy = true;
      setButtonLoading(submitBtn, true);
      cancelBtn.disabled = true;
      try {
        const output = await onSubmit(data, form);
        busy = false;
        close(output ?? data);
      } catch (error) {
        busy = false;
        setButtonLoading(submitBtn, false);
        cancelBtn.disabled = false;
        const field = error?.field && form.querySelector(`[name="${error.field}"]`)?.closest('.field');
        if (field) {
          setFieldError(field, error.message);
          field._dcField.control.focus();
        } else {
          mount(errorBanner, Icon({ name: 'alert-circle', size: 18 }), h('span', {}, error?.message || 'No fue posible guardar. Intenta de nuevo.'));
        }
      }
    });

    dialog.addEventListener('cancel', (event) => {
      if (busy) event.preventDefault();
      else result = null;
    });
    dialog.addEventListener('close', finish);

    document.body.append(dialog);
    dialog.showModal();
    form.querySelector('input, select, textarea')?.focus();
  });
}

/** Error con campo asociado, para que ModalForm lo muestre junto al control. */
export class FieldError extends Error {
  constructor(field, message) {
    super(message);
    this.field = field;
  }
}
