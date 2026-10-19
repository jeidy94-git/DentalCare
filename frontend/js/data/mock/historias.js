/**
 * Mock de la tabla `historia_clinica` (seed de dentalcare_bd.sql).
 * El seed abre una historia por paciente (11…50) con id_historia = id_paciente − 10 y el mismo texto.
 */
import { PACIENTES } from './pacientes.js';

export const HISTORIAS = PACIENTES.map((p) => ({
  id_historia: p.id_paciente - 10,
  id_paciente: p.id_paciente,
  antecedentes_medicos: 'Sin antecedentes médicos de importancia',
  alergias: 'Ninguna alergia reportada',
  observaciones: 'Historia clínica aperturada en sistema',
  fecha_apertura: '2026-09-11 18:02:43',
}));

export const historiaDePaciente = (idPaciente) => HISTORIAS.find((hc) => hc.id_paciente === Number(idPaciente)) ?? null;

/** true si el texto de alergias describe una alergia real (el seed usa "Ninguna alergia reportada"). */
export const tieneAlergias = (historia) => Boolean(historia?.alergias) && !/^ningun/i.test(historia.alergias.trim());
