/**
 * Utilidades de fechas en hora local (sin librerías).
 * Todas aceptan Date o texto "YYYY-MM-DD[ HH:mm:ss]" (formato MySQL) y devuelven Date nuevos.
 */
import { toDate } from './format.js';

const pad = (n) => String(n).padStart(2, '0');

/** Date → "YYYY-MM-DD" (local). */
export function toISODate(value = new Date()) {
  const d = toDate(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ("2026-10-20", "09:30") → "2026-10-20 09:30:00" (formato DATETIME de MySQL). */
export function toSqlDateTime(date, hhmm) {
  return `${toISODate(date)} ${hhmm}:00`;
}

export function addDays(value, days) {
  const d = new Date(toDate(value));
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(value, months) {
  const d = new Date(toDate(value));
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Lunes de la semana (la agenda colombiana empieza en lunes). */
export function startOfWeek(value) {
  const d = new Date(toDate(value));
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function startOfMonth(value) {
  const d = toDate(value);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function isSameDay(a, b) {
  return toISODate(a) === toISODate(b);
}

export function isSameMonth(a, b) {
  const x = toDate(a);
  const y = toDate(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth();
}

export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
