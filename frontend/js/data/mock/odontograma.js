/**
 * Mock de la tabla `odontograma` (seed de dentalcare_bd.sql).
 * id_diente = número FDI. En el seed, historia_clinica.id_historia = id_paciente − 10.
 */
export const ODONTOGRAMA = [
  { id_odontograma: 1, id_historia: 1, id_diente: 36, cara_diente: 'OCLUSAL', diagnostico: 'Caries restaurada con resina', estado_tratamiento: 'REALIZADO', fecha_registro: '2026-09-11 18:02:58' },
  { id_odontograma: 2, id_historia: 1, id_diente: 16, cara_diente: 'VESTIBULAR', diagnostico: 'Caries incipiente', estado_tratamiento: 'PENDIENTE', fecha_registro: '2026-09-11 18:02:58' },
  { id_odontograma: 3, id_historia: 2, id_diente: 11, cara_diente: 'INCISAL', diagnostico: 'Desgaste leve por bruxismo', estado_tratamiento: 'EN_OBSERVACION', fecha_registro: '2026-09-11 18:02:58' },
  { id_odontograma: 4, id_historia: 3, id_diente: 21, cara_diente: 'MESIAL', diagnostico: 'Fractura de esmalte por traumatismo', estado_tratamiento: 'PENDIENTE', fecha_registro: '2026-09-12 09:15:00' },
  { id_odontograma: 5, id_historia: 4, id_diente: 46, cara_diente: 'OCLUSAL', diagnostico: 'Tratamiento de conducto requerido', estado_tratamiento: 'EN_PROCESO', fecha_registro: '2026-09-12 10:30:00' },
  { id_odontograma: 6, id_historia: 5, id_diente: 12, cara_diente: 'VESTIBULAR', diagnostico: 'Mancha blanca por desmineralización', estado_tratamiento: 'EN_OBSERVACION', fecha_registro: '2026-09-12 11:20:00' },
  { id_odontograma: 7, id_historia: 6, id_diente: 16, cara_diente: 'DISTAL', diagnostico: 'Obturación en amalgama desadaptada', estado_tratamiento: 'REEMPLAZO_REQUERIDO', fecha_registro: '2026-09-12 14:00:00' },
  { id_odontograma: 8, id_historia: 7, id_diente: 36, cara_diente: 'LINGUAL', diagnostico: 'Cálculo dental subgingival severo', estado_tratamiento: 'REALIZADO', fecha_registro: '2026-09-13 08:45:00' },
  { id_odontograma: 9, id_historia: 8, id_diente: 21, cara_diente: 'INCISAL', diagnostico: 'Pigmentación por consumo de café', estado_tratamiento: 'REALIZADO', fecha_registro: '2026-09-13 10:10:00' },
  { id_odontograma: 10, id_historia: 9, id_diente: 46, cara_diente: 'OCLUSAL', diagnostico: 'Sellante de fosas y fisuras aplicado', estado_tratamiento: 'REALIZADO', fecha_registro: '2026-09-13 11:50:00' },
];

/** Hallazgos de un paciente (por id_paciente, usando la relación del seed). */
export const odontogramaDePaciente = (idPaciente) => ODONTOGRAMA.filter((r) => r.id_historia === idPaciente - 10);
