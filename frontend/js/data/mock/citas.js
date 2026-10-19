/**
 * Mock de la tabla `cita`.
 *  - ids 1–40: seed oficial de dentalcare_bd.sql (sep–oct 2026, 08:00).
 *  - ids 41+: citas generadas de forma determinística alrededor de HOY, respetando
 *    los horarios (RN-02) y sin choques, para que agenda y dashboard se vean vivos.
 *
 * `id_servicio` aún no existe en la BD (se agrega en la Fase B, ver database/CAMBIOS.md).
 */
import { PACIENTES } from './pacientes.js';
import { HORARIOS } from './especialistas.js';
import { addDays, toISODate, toSqlDateTime } from '../../core/dates.js';
import { horariosDelDia, toMinutes, toHHMM, SLOT_MINUTES } from '../../core/agenda.js';

/* ---------- Seed oficial ---------- */
const SEED_HEAD = [
  [11, 1, 'Valoración general y limpieza', 1],
  [12, 2, 'Control mensual de ortodoncia', 1],
  [13, 1, 'Dolor agudo en pieza molar', 3],
  [14, 3, 'Evaluación para tratamiento de conducto', 4],
];

const SEED = Array.from({ length: 40 }, (_, i) => {
  const id = i + 1;
  const [idPaciente, idEsp, motivo, idServicio] = SEED_HEAD[i] ?? [id + 10, ((id - 5) % 3) + 1, 'Valoración y control odontológico', 1];
  return {
    id_cita: id,
    id_paciente: idPaciente,
    id_especialista: idEsp,
    id_servicio: idServicio,
    fecha_hora: toSqlDateTime(addDays('2026-09-01', i), '08:00'),
    motivo,
    estado_cita: id % 2 === 1 ? 'PROGRAMADA' : 'COMPLETADA',
    recordatorio_enviado: 0,
  };
});

/* ---------- Generadas ---------- */

/** PRNG determinístico (mulberry32): mismos datos en cada recarga del mismo día. */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Servicios típicos por especialista (id_especialista → [id_servicio, motivo][]). */
const SERVICIOS_POR_ESPECIALISTA = {
  1: [[1, 'Valoración y control odontológico'], [2, 'Limpieza dental profunda'], [3, 'Obturación de caries en resina'], [1, 'Dolor dental, valoración']],
  2: [[1, 'Control mensual de ortodoncia'], [1, 'Ajuste de brackets'], [5, 'Valoración para diseño de sonrisa']],
  3: [[4, 'Tratamiento de conducto'], [1, 'Evaluación endodóntica'], [4, 'Control post-endodoncia']],
};

function generate({ from, to, startId, taken }) {
  const rand = mulberry32(2026);
  const today = toISODate();
  const out = [];
  let id = startId;

  for (let day = from; day <= to; day += 1) {
    const date = addDays(new Date(), day);
    const iso = toISODate(date);
    for (const idEsp of [1, 2, 3]) {
      for (const h of horariosDelDia(HORARIOS, idEsp, date)) {
        for (let m = toMinutes(h.hora_inicio); m + SLOT_MINUTES <= toMinutes(h.hora_fin); m += SLOT_MINUTES) {
          if (rand() > 0.38) continue;
          const fecha = `${iso} ${toHHMM(m)}:00`;
          if (taken.has(`${idEsp}|${fecha}`)) continue;
          const [idServicio, motivo] = SERVICIOS_POR_ESPECIALISTA[idEsp][Math.floor(rand() * SERVICIOS_POR_ESPECIALISTA[idEsp].length)];
          const r = rand();
          const estado = iso < today ? (r < 0.88 ? 'COMPLETADA' : 'CANCELADA') : r < 0.72 ? 'PROGRAMADA' : r < 0.95 ? 'PENDIENTE_CONFIRMACION' : 'CANCELADA';
          out.push({
            id_cita: id++,
            id_paciente: PACIENTES[Math.floor(rand() * PACIENTES.length)].id_paciente,
            id_especialista: idEsp,
            id_servicio: idServicio,
            fecha_hora: fecha,
            motivo,
            estado_cita: estado,
            recordatorio_enviado: estado === 'PROGRAMADA' && iso <= toISODate(addDays(new Date(), 2)) ? 1 : 0,
          });
        }
      }
    }
  }
  return out;
}

const taken = new Set(SEED.map((c) => `${c.id_especialista}|${c.fecha_hora}`));

export const CITAS = [...SEED, ...generate({ from: -170, to: 45, startId: 41, taken })].sort((a, b) =>
  a.fecha_hora.localeCompare(b.fecha_hora),
);
