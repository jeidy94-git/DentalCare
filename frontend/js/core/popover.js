/**
 * Patrón "disclosure" para menús desplegables (notificaciones, perfil):
 * botón con aria-expanded + aria-controls, cierre con Escape (devolviendo el foco)
 * y con clic fuera del panel.
 *
 * Se usa disclosure y no role="menu" a propósito: role="menu" obliga a implementar
 * todo el patrón de teclado de menús de aplicación; para enlaces de navegación
 * el disclosure es lo recomendado por WAI-ARIA.
 *
 * @param {HTMLElement} trigger
 * @param {HTMLElement} panel  Debe tener id.
 * @param {{ onOpen?: () => void, onClose?: () => void }} [options]
 */
export function bindDisclosure(trigger, panel, { onOpen, onClose } = {}) {
  const doc = trigger.ownerDocument;
  let open = false;

  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', panel.id);
  panel.hidden = true;

  const onPointerDown = (event) => {
    if (!panel.contains(event.target) && !trigger.contains(event.target)) hide(false);
  };
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      hide(true);
    }
  };

  function show() {
    if (open) return;
    open = true;
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    doc.addEventListener('pointerdown', onPointerDown, true);
    doc.addEventListener('keydown', onKeyDown);
    onOpen?.();
  }

  function hide(returnFocus = false) {
    if (!open) return;
    open = false;
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    doc.removeEventListener('pointerdown', onPointerDown, true);
    doc.removeEventListener('keydown', onKeyDown);
    if (returnFocus) trigger.focus();
    onClose?.();
  }

  trigger.addEventListener('click', () => (open ? hide(false) : show()));

  return { show, hide, isOpen: () => open };
}
