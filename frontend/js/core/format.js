/**
 * Formateadores para la interfaz (es-CO, pesos colombianos).
 */

const numberFmt = new Intl.NumberFormat('es-CO');
const copFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/** 1500000 → "1.500.000" */
export const formatNumber = (value) => numberFmt.format(Number(value) || 0);

/** 1500000 → "$ 1.500.000" */
export const formatCOP = (value) => copFmt.format(Number(value) || 0);

/**
 * Convierte "YYYY-MM-DD" o "YYYY-MM-DD HH:mm:ss" (formato MySQL) en Date local,
 * evitando el desfase de un día que produce `new Date('2026-09-01')` (lo toma como UTC).
 */
export function toDate(value) {
  if (value instanceof Date) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(String(value ?? ''));
  if (!match) return new Date(value);
  const [, y, m, d, hh = 0, mm = 0, ss = 0] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
}

/** "2026-09-01" → "01 sept 2026" (las opciones son las de Intl.DateTimeFormat). */
export function formatDate(value, options = { day: '2-digit', month: 'short', year: 'numeric' }) {
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('es-CO', options).format(date);
}

/** "2026-09-01 08:00:00" → "8:00 a. m." */
export function formatTime(value) {
  return formatDate(value, { hour: 'numeric', minute: '2-digit' });
}

/** Fecha larga con mayúscula inicial: "Sábado, 18 de octubre de 2026". */
export function formatLongDate(value) {
  return capitalize(formatDate(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
}

const relativeFmt = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
const RELATIVE_STEPS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

/** Tiempo relativo para notificaciones: "hace 2 horas", "ayer". */
export function formatRelative(value, now = new Date()) {
  const seconds = (toDate(value).getTime() - now.getTime()) / 1000;
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(seconds) >= size) return relativeFmt.format(Math.round(seconds / size), unit);
  }
  return 'justo ahora';
}

export function capitalize(text = '') {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Quita tildes y pasa a minúsculas (búsquedas y comparación de días "Miércoles" = "MIERCOLES"). */
export function normalizeText(text = '') {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
