import { h, cx } from '../../core/dom.js';

/**
 * Catálogo de estados del dominio (valores reales de dentalcare_bd) → etiqueta y color.
 * Fuente: cita.estado_cita, odontograma.estado_tratamiento, venta.estado_venta,
 * usuario.estado, servicio.estado.
 */
export const ESTADOS = {
  // Citas
  PROGRAMADA: { label: 'Programada', variant: 'info' },
  PENDIENTE_CONFIRMACION: { label: 'Pendiente de confirmación', variant: 'warning' },
  COMPLETADA: { label: 'Completada', variant: 'success' },
  CANCELADA: { label: 'Cancelada', variant: 'danger' },
  // Odontograma / tratamientos
  PENDIENTE: { label: 'Pendiente', variant: 'warning' },
  EN_PROCESO: { label: 'En proceso', variant: 'info' },
  EN_OBSERVACION: { label: 'En observación', variant: 'primary' },
  REALIZADO: { label: 'Realizado', variant: 'success' },
  REEMPLAZO_REQUERIDO: { label: 'Reemplazo requerido', variant: 'danger' },
  // Ventas / pagos
  PAGADO: { label: 'Pagado', variant: 'success' },
  // Registros genéricos
  ACTIVO: { label: 'Activo', variant: 'success' },
  INACTIVO: { label: 'Inactivo', variant: 'neutral' },
};

/**
 * Átomo: Badge
 * @param {object} props
 * @param {string} props.label
 * @param {'neutral'|'primary'|'info'|'success'|'warning'|'danger'|'count'} [props.variant='neutral']
 * @param {'sm'|'md'} [props.size='md']
 * @param {boolean} [props.dot=false]   Muestra un punto de color antes del texto.
 * @returns {HTMLSpanElement}
 */
export function Badge({ label, variant = 'neutral', size = 'md', dot = false, className, ...rest } = {}) {
  return h(
    'span',
    { class: cx('badge', `badge--${variant}`, size === 'sm' && 'badge--sm', className), ...rest },
    dot && h('span', { class: 'badge__dot', 'aria-hidden': 'true' }),
    label,
  );
}

/**
 * Badge de estado a partir del código guardado en la BD (p. ej. 'PROGRAMADA').
 * Si el código no está en el catálogo se muestra tal cual en gris.
 * @param {string} estado
 * @param {object} [options]  Mismas opciones de Badge (size, dot…).
 */
export function StatusBadge(estado, options = {}) {
  const meta = ESTADOS[estado] ?? { label: humanize(estado), variant: 'neutral' };
  return Badge({ dot: true, ...options, label: meta.label, variant: meta.variant, dataset: { estado } });
}

function humanize(code = '') {
  const text = String(code).replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
