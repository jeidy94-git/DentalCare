/**
 * Mock de `personal`, `especialista` y `horario` (seed de dentalcare_bd.sql).
 *
 * NOTA: el seed solo define 4 horarios (un día por odontólogo), lo que deja la agenda
 * casi vacía. Para que la demo sea realista se agregan horarios id ≥ 5, marcados abajo.
 * Se incorporarán al seed oficial en la Fase B y se documentarán en database/CAMBIOS.md.
 */

export const PERSONAL = [
  { id_personal: 1, id_usuario: 1, tipo_documento: 'CC', numero_documento: '1010101001', nombres: 'Laura', apellidos: 'Gómez', cargo: 'Administradora', telefono: '3009990001' },
  { id_personal: 2, id_usuario: 2, tipo_documento: 'CC', numero_documento: '1010101002', nombres: 'Carlos', apellidos: 'Pérez', cargo: 'Recepcionista', telefono: '3009990002' },
  { id_personal: 3, id_usuario: 3, tipo_documento: 'CC', numero_documento: '1010101003', nombres: 'Dr. Roberto', apellidos: 'Martínez', cargo: 'Odontólogo General', telefono: '3009990003' },
  { id_personal: 4, id_usuario: 4, tipo_documento: 'CC', numero_documento: '1010101004', nombres: 'Dra. Sofía', apellidos: 'López', cargo: 'Ortodoncista', telefono: '3009990004' },
  { id_personal: 5, id_usuario: 5, tipo_documento: 'CC', numero_documento: '1010101005', nombres: 'Dr. Andrés', apellidos: 'Ramírez', cargo: 'Endodoncista', telefono: '3009990005' },
];

const SEED_ESPECIALISTAS = [
  { id_especialista: 1, id_personal: 3, especialidad: 'Odontología General', registro_medico: 'RM-1001' },
  { id_especialista: 2, id_personal: 4, especialidad: 'Ortodoncia', registro_medico: 'RM-1002' },
  { id_especialista: 3, id_personal: 5, especialidad: 'Endodoncia', registro_medico: 'RM-1003' },
];

/** Especialistas con los datos de `personal` ya unidos (lo que devolvería un JOIN). */
export const ESPECIALISTAS = SEED_ESPECIALISTAS.map((e) => {
  const p = PERSONAL.find((x) => x.id_personal === e.id_personal);
  return { ...e, nombre: `${p.nombres} ${p.apellidos}`, telefono: p.telefono };
});

const range = (id, idEsp, dia, inicio, fin) => ({ id_horario: id, id_especialista: idEsp, dia_semana: dia, hora_inicio: `${inicio}:00`, hora_fin: `${fin}:00` });

export const HORARIOS = [
  // --- Seed oficial ---
  range(1, 1, 'Lunes', '08:00', '12:00'),
  range(2, 1, 'Lunes', '14:00', '18:00'),
  range(3, 2, 'Martes', '08:00', '14:00'),
  range(4, 3, 'Miércoles', '10:00', '16:00'),
  // --- Agregados para la demo (Fase B) ---
  ...['Martes', 'Miércoles', 'Jueves', 'Viernes'].flatMap((dia, i) => [
    range(5 + i * 2, 1, dia, '08:00', '12:00'),
    range(6 + i * 2, 1, dia, '14:00', '18:00'),
  ]),
  range(13, 2, 'Jueves', '08:00', '14:00'),
  range(14, 2, 'Sábado', '08:00', '12:00'),
  range(15, 3, 'Viernes', '10:00', '16:00'),
];

export const nombreEspecialista = (lista, id) => lista.find((e) => Number(e.id_especialista) === Number(id))?.nombre ?? '—';
