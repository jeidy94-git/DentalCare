import { h, cx, mount, uniqueId } from '../../core/dom.js';
import { Icon, Button, setButtonLoading } from '../atoms/index.js';

const DEFAULT_ICON = { danger: 'alert-triangle', primary: 'info', success: 'check-circle' };

/**
 * Molécula: ConfirmDialog — modal de confirmación basado en <dialog> nativo
 * (trae focus-trap, Escape y fondo inerte sin código extra).
 * Se usa antes de acciones sensibles: cancelar cita, inactivar rol (RF-ROL-06), eliminar paciente…
 *
 * @param {object} options
 * @param {string} options.title
 * @param {string|Node} options.message
 * @param {string} [options.confirmLabel='Confirmar']
 * @param {string} [options.cancelLabel='Cancelar']
 * @param {'primary'|'danger'|'success'} [options.variant='primary']
 * @param {string} [options.icon]
 * @param {() => Promise<void>} [options.onConfirm]
 *        Acción asíncrona opcional: el botón muestra "cargando" y, si falla,
 *        el error se muestra dentro del diálogo sin cerrarlo.
 * @returns {Promise<boolean>} true si se confirmó.
 *
 * @example
 * if (await confirmDialog({ title: '¿Cancelar la cita?', message: '…', variant: 'danger' })) { … }
 */
export function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  icon,
  onConfirm,
} = {}) {
  return new Promise((resolve) => {
    const titleId = uniqueId('dlg-title');
    const descId = uniqueId('dlg-desc');
    let result = false;
    let busy = false;

    const errorEl = h('p', { class: 'dialog__error', role: 'alert' });
    const cancelBtn = Button({ label: cancelLabel, variant: 'outline', onClick: () => close(false) });
    const confirmBtn = Button({ label: confirmLabel, variant, onClick: handleConfirm });

    const dialog = h(
      'dialog',
      { class: cx('dialog', `dialog--${variant}`), 'aria-labelledby': titleId, 'aria-describedby': descId },
      h(
        'div',
        { class: 'dialog__panel' },
        h('span', { class: 'dialog__icon', 'aria-hidden': 'true' }, Icon({ name: icon ?? DEFAULT_ICON[variant] ?? 'info', size: 22 })),
        h(
          'div',
          { class: 'dialog__content' },
          h('h2', { id: titleId, class: 'dialog__title' }, title),
          h('div', { id: descId, class: 'dialog__message' }, message),
          errorEl,
        ),
        h('div', { class: 'dialog__actions' }, cancelBtn, confirmBtn),
      ),
    );

    let settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      dialog.remove();
      resolve(result);
    }

    // Se finaliza de inmediato (sin esperar el evento `close`, que el navegador
    // despacha de forma asíncrona); `finish` es idempotente.
    function close(value) {
      if (busy) return;
      result = value;
      dialog.close();
      finish();
    }

    async function handleConfirm() {
      if (!onConfirm) return close(true);
      busy = true;
      mount(errorEl);
      setButtonLoading(confirmBtn, true);
      cancelBtn.disabled = true;
      try {
        await onConfirm();
        busy = false;
        close(true);
      } catch (error) {
        busy = false;
        setButtonLoading(confirmBtn, false);
        cancelBtn.disabled = false;
        mount(errorEl, error?.message || 'Ocurrió un error. Intenta de nuevo.');
      }
    }

    // Escape: se bloquea mientras se procesa la acción.
    dialog.addEventListener('cancel', (event) => {
      if (busy) event.preventDefault();
      else result = false;
    });
    // Clic en el fondo (fuera del panel) = cancelar.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) close(false);
    });
    // Cubre el cierre con Escape (el resto pasa por `close()`).
    dialog.addEventListener('close', finish);

    document.body.append(dialog);
    dialog.showModal();
    // En acciones destructivas el foco inicial va a "Cancelar" (opción segura).
    (variant === 'danger' ? cancelBtn : confirmBtn).focus();
  });
}
