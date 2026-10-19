import { h, cx } from '../../core/dom.js';

const STATUS_TEXT = { available: 'Disponible', occupied: 'Ocupado', blocked: 'Fuera de horario' };

/**
 * Molécula: TimeSlot — franja horaria para agendar citas y para la agenda.
 * Estados:
 *  - available: se puede seleccionar (aria-pressed indica la selección).
 *  - occupied:  ya hay una cita (muestra el paciente en `detail`).
 *  - blocked:   fuera del horario del especialista (RN-02).
 * Los no disponibles usan aria-disabled (no `disabled`) para que sigan siendo
 * descubribles con teclado y el lector de pantalla explique por qué no se pueden elegir.
 *
 * @param {object} props
 * @param {string} props.start                          "08:00"
 * @param {string} [props.end]                          "08:30"
 * @param {'available'|'occupied'|'blocked'} [props.status='available']
 * @param {string} [props.detail]                       Ej. nombre del paciente.
 * @param {boolean} [props.selected=false]
 * @param {(slot: {start: string, end?: string, status: string}, el: HTMLButtonElement) => void} [props.onSelect]
 * @returns {HTMLButtonElement}
 */
export function TimeSlot({ start, end, status = 'available', detail, selected = false, onSelect, className, ...rest } = {}) {
  const available = status === 'available';
  const range = end ? `${start} – ${end}` : start;
  const visibleDetail = detail ?? (available ? null : STATUS_TEXT[status]);

  const el = h(
    'button',
    {
      type: 'button',
      class: cx('time-slot', `time-slot--${status}`, className),
      'aria-pressed': available ? String(selected) : undefined,
      'aria-disabled': available ? undefined : 'true',
      'aria-label': [range, STATUS_TEXT[status], detail].filter(Boolean).join(', '),
      dataset: { start, status },
      onClick: () => {
        if (available) onSelect?.({ start, end, status }, el);
      },
      ...rest,
    },
    h('span', { class: 'time-slot__time' }, range),
    visibleDetail && h('span', { class: 'time-slot__detail' }, visibleDetail),
  );
  return el;
}

/** Cambia la selección visual/accesible de una franja. */
export function setTimeSlotSelected(el, selected) {
  if (el.getAttribute('aria-disabled') === 'true') return;
  el.setAttribute('aria-pressed', String(selected));
}
