import { hoyIso } from '../utils/validators.js';

/**
 * Reglas de agenda (RN-02) del lado del servidor. Es la misma lógica de frontend/js/core/agenda.js
 * (getDaySlots): allá guía al usuario en el asistente; aquí tiene la última palabra, porque una
 * petición puede llegar sin pasar por el asistente (Postman, otra pestaña con datos viejos…).
 *
 * Son funciones PURAS: no consultan la base ni la hora por su cuenta (reciben `ahora`), así que se
 * prueban con cualquier fecha sin esperar a que llegue.
 */

/** Duración de una franja: la tabla `cita` no guarda duración, todas duran 30 minutos. */
export const MINUTOS_FRANJA = 30;

/** Índice de getUTCDay() → valor de horario.dia_semana (los del CHECK chk_horario_dia). */
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** '2026-10-21' → 'Miércoles'. Se calcula en UTC para que la zona horaria no corra el día. */
export function diaSemana(fechaIso) {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  return DIAS_SEMANA[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
}

/** '09:30' o '09:30:00' → 570 */
export const aMinutos = (hora) => {
  const [h, m] = String(hora).split(':').map(Number);
  return h * 60 + m;
};

/** 570 → '09:30' */
export const aHora = (minutos) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

/**
 * Franjas de un día para un odontólogo.
 * @param {object} p
 * @param {string} p.fecha          'AAAA-MM-DD'
 * @param {Array<{hora_inicio: string, hora_fin: string}>} p.horarios  rangos de atención de ESE día
 * @param {string[]} p.ocupadas     horas 'HH:MM' ya tomadas por citas no canceladas
 * @param {Date} [p.ahora]
 * @returns {Array<{inicio: string, fin: string, estado: 'disponible'|'ocupada'|'fuera_de_horario'|'pasada'}>}
 *          [] si ese día no atiende.
 */
export function franjasDelDia({ fecha, horarios, ocupadas, ahora = new Date(), paso = MINUTOS_FRANJA }) {
  const rangos = horarios.map((h) => [aMinutos(h.hora_inicio), aMinutos(h.hora_fin)]);
  if (!rangos.length) return [];

  const tomadas = new Set(ocupadas);
  const desde = Math.min(...rangos.map(([a]) => a));
  const hasta = Math.max(...rangos.map(([, b]) => b));
  const hoy = hoyIso(ahora);
  const minutoActual = ahora.getHours() * 60 + ahora.getMinutes();

  const franjas = [];
  for (let m = desde; m + paso <= hasta; m += paso) {
    const inicio = aHora(m);
    // Entre dos rangos (p. ej. el almuerzo 12:00–14:00) hay franjas, pero fuera de horario.
    const dentro = rangos.some(([a, b]) => m >= a && m + paso <= b);
    const pasada = fecha < hoy || (fecha === hoy && m <= minutoActual);
    let estado = 'disponible';
    if (!dentro) estado = 'fuera_de_horario';
    else if (tomadas.has(inicio)) estado = 'ocupada';
    else if (pasada) estado = 'pasada';
    franjas.push({ inicio, fin: aHora(m + paso), estado });
  }
  return franjas;
}
