/**
 * Reglas de agenda (lado cliente, sobre datos mock).
 * En la Fase C esta misma lógica se replica en el backend (services/citas), que es
 * quien tiene la última palabra; aquí sirve para guiar al usuario en la interfaz.
 *
 * RN-02: una cita no puede agendarse si el odontólogo no tiene horario configurado en ese rango.
 * RF-CIT-03: sin disponibilidad → sugerir fechas u odontólogos alternativos.
 */
import { toDate, normalizeText } from './format.js';
import { toISODate, addDays } from './dates.js';

/** Duración estándar de una franja (la tabla `cita` no guarda duración). */
export const SLOT_MINUTES = 30;

const WEEKDAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

/** "09:30" → 570 */
export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

/** 570 → "09:30" */
export const toHHMM = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** Clave normalizada del día ("miercoles") para comparar con horario.dia_semana. */
export const weekdayKey = (date) => WEEKDAY_KEYS[toDate(date).getDay()];

/** "2026-10-20 09:30:00" → "09:30" */
export const timeOf = (fechaHora) => toHHMM(toDate(fechaHora).getHours() * 60 + toDate(fechaHora).getMinutes());

/** Rangos de atención de un especialista en una fecha, ordenados. */
export function horariosDelDia(horarios, especialistaId, date) {
  const key = weekdayKey(date);
  return horarios
    .filter((h) => Number(h.id_especialista) === Number(especialistaId) && normalizeText(h.dia_semana) === key)
    .sort((a, b) => toMinutes(a.hora_inicio) - toMinutes(b.hora_inicio));
}

/** Citas activas (no canceladas) de un especialista en una fecha. */
export function citasDelDia(citas, especialistaId, date) {
  const iso = toISODate(date);
  return citas.filter(
    (c) => Number(c.id_especialista) === Number(especialistaId) && c.estado_cita !== 'CANCELADA' && String(c.fecha_hora).startsWith(iso),
  );
}

/**
 * Franjas de un día para un especialista.
 * @returns {Array<{start: string, end: string, status: 'available'|'occupied'|'blocked'|'past', cita?: object}>}
 *          [] si el especialista no atiende ese día.
 */
export function getDaySlots({ especialistaId, date, horarios, citas, now = new Date(), step = SLOT_MINUTES }) {
  const ranges = horariosDelDia(horarios, especialistaId, date).map((h) => [toMinutes(h.hora_inicio), toMinutes(h.hora_fin)]);
  if (!ranges.length) return [];

  const busy = new Map(citasDelDia(citas, especialistaId, date).map((c) => [timeOf(c.fecha_hora), c]));
  const from = Math.min(...ranges.map(([a]) => a));
  const to = Math.max(...ranges.map(([, b]) => b));
  const iso = toISODate(date);
  const today = toISODate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots = [];
  for (let m = from; m + step <= to; m += step) {
    const start = toHHMM(m);
    const inside = ranges.some(([a, b]) => m >= a && m + step <= b);
    const cita = busy.get(start);
    const past = iso < today || (iso === today && m <= nowMinutes);
    let status = 'available';
    if (!inside) status = 'blocked';
    else if (cita) status = 'occupied';
    else if (past) status = 'past';
    slots.push({ start, end: toHHMM(m + step), status, cita });
  }
  return slots;
}

/** Valida RN-02 + choque de horario para una franja concreta. */
export function isSlotAvailable({ especialistaId, date, start, horarios, citas, now }) {
  return getDaySlots({ especialistaId, date, horarios, citas, now }).some((s) => s.start === start && s.status === 'available');
}

/**
 * Alternativas cuando no hay disponibilidad (RF-CIT-03):
 *  - sameDoctor: próximas fechas con el mismo odontólogo (primera hora libre de cada una).
 *  - otherDoctors: otros odontólogos con franjas libres en la misma fecha.
 */
export function suggestAlternatives({ especialistaId, date, horarios, citas, especialistas, now = new Date(), daysAhead = 30, limit = 3 }) {
  const firstFree = (id, d) => getDaySlots({ especialistaId: id, date: d, horarios, citas, now }).filter((s) => s.status === 'available');

  const sameDoctor = [];
  for (let i = 1; i <= daysAhead && sameDoctor.length < limit; i += 1) {
    const d = addDays(date, i);
    const free = firstFree(especialistaId, d);
    if (free.length) sameDoctor.push({ especialistaId: Number(especialistaId), date: toISODate(d), start: free[0].start, available: free.length });
  }

  const otherDoctors = especialistas
    .filter((e) => Number(e.id_especialista) !== Number(especialistaId))
    .map((e) => {
      const free = firstFree(e.id_especialista, date);
      return free.length ? { especialistaId: e.id_especialista, date: toISODate(date), start: free[0].start, available: free.length } : null;
    })
    .filter(Boolean);

  return { sameDoctor, otherDoctors };
}

/** Resumen legible del horario: "Lunes 08:00–12:00 y 14:00–18:00 · Martes …" */
export function describeSchedule(horarios, especialistaId) {
  const byDay = new Map();
  for (const h of horarios.filter((x) => Number(x.id_especialista) === Number(especialistaId))) {
    const ranges = byDay.get(h.dia_semana) ?? [];
    ranges.push(`${h.hora_inicio.slice(0, 5)}–${h.hora_fin.slice(0, 5)}`);
    byDay.set(h.dia_semana, ranges);
  }
  const order = (day) => (WEEKDAY_KEYS.indexOf(normalizeText(day)) + 6) % 7;
  return [...byDay.entries()]
    .sort(([a], [b]) => order(a) - order(b))
    .map(([day, ranges]) => `${day} ${ranges.join(' y ')}`)
    .join(' · ');
}
