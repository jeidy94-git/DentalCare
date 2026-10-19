// Pruebas del módulo de citas (Evidencia 2): GET /api/citas, GET /api/citas/ocupacion, POST /api/citas
// y PATCH /api/citas/:id/estado contra una base REAL, más las reglas de agenda (RN-02) del servidor.
//
// Requisitos y forma de ejecutarla: los mismos de api.test.mjs. Desde la raíz del proyecto:
//   node tests/backend/citas.test.mjs                 (usa la base de backend/.env)
//   DB_PORT=3307 node tests/backend/citas.test.mjs    (otra base)
//
// Agenda en fechas lejanas (dentro de 60+ días) para no chocar con el seed, y deja la base como estaba:
// borra las citas y la auditoría que crea y restaura los estados que cambia.
import { pool, api, check, same, report, cerrar, loginAs, isErrorShape, frontend, backend, iso, sumarDias, proximo, CUENTAS } from './helpers.mjs';

const { franjasDelDia, diaSemana } = await import(new URL('src/services/agenda.js', backend).href);
const agendaFront = await import(new URL('core/agenda.js', frontend).href);

const [[{ maxCita }]] = await pool.query('SELECT IFNULL(MAX(id_cita), 0) AS maxCita FROM cita');
const [[{ maxLog }]] = await pool.query('SELECT IFNULL(MAX(id_log), 0) AS maxLog FROM log_auditoria');
const ultimoLog = async () => (await pool.query('SELECT * FROM log_auditoria WHERE id_log > ? ORDER BY id_log DESC LIMIT 1', [maxLog]))[0][0];

// Días de la semana con horario en el seed: odontólogo 1 lun–vie 08–12 y 14–18; odontólogo 2 mar/jue 08–14 y sáb 08–12.
const hoy = new Date();
const lunes = iso(proximo(1, sumarDias(hoy, 60)));
const martes = iso(proximo(2, sumarDias(hoy, 60)));
const domingo = iso(proximo(0, sumarDias(hoy, 60)));
const lunesPasado = iso(proximo(1, sumarDias(hoy, -14)));

const COLUMNAS = ['id_cita', 'id_paciente', 'id_especialista', 'id_servicio', 'fecha_hora', 'motivo', 'estado_cita', 'recordatorio_enviado', 'mensaje_alerta', 'fecha_creacion', 'paciente_nombre', 'especialista_nombre', 'servicio_nombre'];
const nueva = (extra = {}) => ({ id_paciente: 12, id_especialista: 1, id_servicio: 1, fecha_hora: `${lunes} 09:00`, motivo: 'Prueba API citas', ...extra });

try {
  const s = {};
  for (const rol of Object.keys(CUENTAS)) s[rol] = await loginAs(rol);
  const { ADMINISTRADOR: admin, RECEPCIONISTA: recep, ESPECIALISTA: doc, PACIENTE: pac } = s;

  /* ---------- Reglas de agenda del servidor (funciones puras) ---------- */
  check('diaSemana: 7 días seguidos dan Domingo…Sábado con tildes (valores del CHECK)', same([0, 1, 2, 3, 4, 5, 6].map((i) => diaSemana(iso(sumarDias(proximo(0, hoy), i)))), ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']));

  // Paridad con la agenda del frontend: mismas franjas y mismos estados para 3 odontólogos × 14 días.
  const [horarios] = await pool.query('SELECT id_especialista, dia_semana, hora_inicio, hora_fin FROM horario');
  const [citasBd] = await pool.query('SELECT id_especialista, fecha_hora, estado_cita FROM cita');
  const ahora = new Date(2026, 8, 15, 10, 10); // 15 sep 2026, 10:10: hay franjas pasadas, ocupadas y libres
  const ESTADO = { available: 'disponible', occupied: 'ocupada', blocked: 'fuera_de_horario', past: 'pasada' };
  let iguales = 0;
  let total = 0;
  for (let i = 0; i < 14; i++) {
    const fecha = iso(sumarDias(new Date(2026, 8, 8), i));
    for (const id of [1, 2, 3]) {
      total++;
      const delFront = agendaFront.getDaySlots({ especialistaId: id, date: fecha, horarios, citas: citasBd, now: ahora }).map((f) => ({ inicio: f.start, fin: f.end, estado: ESTADO[f.status] }));
      const delBack = franjasDelDia({
        fecha,
        horarios: horarios.filter((h) => h.id_especialista === id && h.dia_semana === diaSemana(fecha)).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio)),
        ocupadas: citasBd.filter((c) => c.id_especialista === id && c.estado_cita !== 'CANCELADA' && c.fecha_hora.startsWith(fecha)).map((c) => c.fecha_hora.slice(11, 16)),
        ahora,
      });
      if (same(delFront, delBack)) iguales++;
    }
  }
  check('RN-02: el servidor calcula las MISMAS franjas que la agenda del frontend', iguales === total, `${iguales}/${total} días-odontólogo`);

  /* ---------- GET /citas ---------- */
  let r = await api('GET', '/citas');
  check('GET /citas sin token → 401', r.status === 401 && isErrorShape(r.body));

  r = await api('GET', '/citas', { token: admin.token });
  const todas = r.body;
  check('Admin: las 40 citas del seed', r.status === 200 && todas.length === 40);
  check('… con las columnas de la tabla + paciente_nombre, especialista_nombre, servicio_nombre', same(Object.keys(todas[0]), COLUMNAS));
  check('… ordenadas por fecha y hora', todas.every((c, i) => i === 0 || todas[i - 1].fecha_hora <= c.fecha_hora));
  check('… fechas como texto y nombres unidos (JOIN)', todas[0].fecha_hora === '2026-09-01 08:00:00' && todas[0].paciente_nombre === 'Andrés Galvis' && todas[0].especialista_nombre === 'Dr. Roberto Martínez' && todas[0].servicio_nombre === 'Valoración General', JSON.stringify(todas[0]).slice(0, 120));

  // Contrato con el mock: para las 40 citas del seed, cada campo del mock vale lo mismo en la API.
  const { authService } = await import(new URL('services/auth.service.js', frontend).href);
  const { citasService } = await import(new URL('services/citas.service.js', frontend).href);
  const { setMockLatency } = await import(new URL('services/mock/db.js', frontend).href);
  setMockLatency(0);
  await authService.login(...CUENTAS.ADMINISTRADOR);
  const delMock = (await citasService.list()).filter((c) => c.id_cita <= 40);
  const porId = new Map(todas.map((c) => [c.id_cita, c]));
  const distintos = delMock.filter((m) => !Object.entries(m).every(([k, v]) => same(porId.get(m.id_cita)?.[k], v)));
  check('Contrato: las 40 citas del seed son iguales campo por campo a las del mock', delMock.length === 40 && distintos.length === 0, distintos.map((c) => c.id_cita).join(','));

  r = await api('GET', '/citas?desde=2026-09-01&hasta=2026-09-10', { token: admin.token });
  check('desde/hasta incluyen los dos días completos (1–10 sep → 10 citas)', r.status === 200 && r.body.length === 10 && r.body[0].fecha_hora.startsWith('2026-09-01') && r.body.at(-1).fecha_hora.startsWith('2026-09-10'));
  r = await api('GET', '/citas?hasta=2026-09-01', { token: admin.token });
  check('hasta = 1 sep incluye la cita de ese día a las 08:00', r.body.length === 1 && r.body[0].id_cita === 1);

  const [[{ n: deUno }]] = await pool.query('SELECT COUNT(*) AS n FROM cita WHERE id_especialista = 1');
  r = await api('GET', '/citas?id_especialista=1', { token: admin.token });
  check('id_especialista=1 → solo las suyas', r.body.length === deUno && r.body.every((c) => c.id_especialista === 1), String(deUno));
  r = await api('GET', '/citas?id_paciente=13', { token: admin.token });
  check('id_paciente=13 → solo las suyas', r.body.length === 1 && r.body[0].id_paciente === 13);

  r = await api('GET', '/citas?estado=COMPLETADA', { token: admin.token });
  check('estado=COMPLETADA', r.body.length === 20 && r.body.every((c) => c.estado_cita === 'COMPLETADA'));
  const lista = await api('GET', '/citas?estado=PROGRAMADA,PENDIENTE_CONFIRMACION', { token: admin.token });
  const repetido = await api('GET', '/citas?estado=PROGRAMADA&estado=PENDIENTE_CONFIRMACION', { token: admin.token });
  check('Varios estados: separados por coma (como http.js envía una lista) o repetidos', lista.body.length === 20 && same(lista.body, repetido.body));

  r = await api('GET', '/citas?estado=BORRADA', { token: admin.token });
  check('estado desconocido → 400 en estado', r.status === 400 && r.body.fields.estado === 'Estado no válido.');
  r = await api('GET', `/citas?estado=${encodeURIComponent("PROGRAMADA') OR 1=1 -- ")}`, { token: admin.token });
  check('Inyección SQL en estado → 400', r.status === 400);
  r = await api('GET', '/citas?desde=2026-13-01&hasta=ayer&id_especialista=abc&id_paciente=-1', { token: admin.token });
  check('Filtros con formato inválido → 400 con un error por filtro', r.status === 400 && same(Object.keys(r.body.fields).sort(), ['desde', 'hasta', 'id_especialista', 'id_paciente']));
  r = await api('GET', '/citas?desde=2026-10-10&hasta=2026-10-01', { token: admin.token });
  check('hasta anterior a desde → 400', r.status === 400 && r.body.fields.hasta === 'La fecha final no puede ser anterior a la inicial.');
  r = await api('GET', '/citas?desde=2026-09-01&desde=2026-09-02', { token: admin.token });
  check('desde repetido (lista) → 400, no 500', r.status === 400 && r.body.fields.desde === 'El valor debe ser texto.');

  for (const rol of ['RECEPCIONISTA', 'ESPECIALISTA']) {
    r = await api('GET', '/citas', { token: s[rol].token });
    check(`${rol}: ve las 40 citas`, r.status === 200 && r.body.length === 40);
  }
  r = await api('GET', '/citas?id_paciente=12', { token: pac.token });
  check('PACIENTE: solo sus citas aunque pida las de otro (id_paciente=12 se ignora)', r.status === 200 && r.body.length === 1 && r.body[0].id_paciente === 11);

  /* ---------- GET /citas/ocupacion ---------- */
  r = await api('GET', '/citas/ocupacion');
  check('GET /ocupacion sin token → 401', r.status === 401);
  r = await api('GET', '/citas/ocupacion', { token: pac.token });
  check('PACIENTE puede consultar la ocupación (la necesita el asistente)', r.status === 200 && r.body.length === 20);
  check('… SOLO odontólogo, fecha y estado: sin paciente, motivo ni tratamiento (Ley 1581)', r.body.every((o) => same(Object.keys(o), ['id_especialista', 'fecha_hora', 'estado_cita'])));
  check('… solo citas activas (PROGRAMADA / PENDIENTE_CONFIRMACION)', r.body.every((o) => ['PROGRAMADA', 'PENDIENTE_CONFIRMACION'].includes(o.estado_cita)));
  r = await api('GET', '/citas/ocupacion?desde=2026-10-01', { token: recep.token });
  check('… con filtro desde', r.status === 200 && r.body.length > 0 && r.body.every((o) => o.fecha_hora >= '2026-10-01'));
  r = await api('GET', '/citas/ocupacion?desde=1-1-2026', { token: recep.token });
  check('… desde inválido → 400', r.status === 400 && r.body.fields.desde);

  /* ---------- POST /citas: validación ---------- */
  r = await api('POST', '/citas', { body: nueva() });
  check('POST sin token → 401', r.status === 401);

  r = await api('POST', '/citas', { token: recep.token, body: {} });
  check('Vacío → 400 con los 5 campos y los mensajes del formulario', r.status === 400 && r.body.fields.id_paciente === 'Selecciona el paciente.' && r.body.fields.id_especialista === 'Selecciona el odontólogo.' && r.body.fields.id_servicio === 'Selecciona el tratamiento.' && r.body.fields.fecha_hora === 'Selecciona la fecha y la hora.' && r.body.fields.motivo === 'Escribe el motivo de la cita.');
  r = await api('POST', '/citas', { token: recep.token, body: nueva({ id_paciente: 'abc', id_especialista: 1.5, id_servicio: [1], fecha_hora: '2027-02-30 09:00', motivo: 'x'.repeat(256) }) });
  check('Formatos inválidos → un error por campo', r.status === 400 && same(Object.keys(r.body.fields).sort(), ['fecha_hora', 'id_especialista', 'id_paciente', 'id_servicio', 'motivo']) && r.body.fields.motivo === 'Máximo 255 caracteres.');
  for (const fh of [`${lunes}T09:00`, `${lunes} 25:00`, `${lunes} 09:00:30`]) {
    r = await api('POST', '/citas', { token: recep.token, body: nueva({ fecha_hora: fh }) });
    check(`fecha_hora "${fh.slice(10)}" → 400`, r.status === 400 && r.body.fields.fecha_hora === 'Fecha y hora no válidas.');
  }

  r = await api('POST', '/citas', { token: recep.token, body: nueva({ id_paciente: 99999 }) });
  check('Paciente inexistente → 404', r.status === 404 && r.body.message === 'El paciente no existe.');
  r = await api('POST', '/citas', { token: recep.token, body: nueva({ id_especialista: 99999 }) });
  check('Odontólogo inexistente → 404', r.status === 404 && r.body.message === 'El odontólogo no existe.');
  r = await api('POST', '/citas', { token: recep.token, body: nueva({ id_servicio: 99999 }) });
  check('Tratamiento inexistente → 404', r.status === 404 && r.body.message === 'El tratamiento no existe.');
  try {
    await pool.query("UPDATE servicio SET estado = 'INACTIVO' WHERE id_servicio = 5");
    r = await api('POST', '/citas', { token: recep.token, body: nueva({ id_servicio: 5 }) });
    check('Tratamiento inactivo → 422 INACTIVE_SERVICE', r.status === 422 && r.body.code === 'INACTIVE_SERVICE');
  } finally {
    await pool.query("UPDATE servicio SET estado = 'ACTIVO' WHERE id_servicio = 5");
  }
  try {
    await pool.query("UPDATE usuario SET estado = 'INACTIVO' WHERE id_usuario = 4"); // Dra. Sofía López, odontóloga 2
    r = await api('POST', '/citas', { token: recep.token, body: nueva({ id_especialista: 2, fecha_hora: `${martes} 09:00` }) });
    check('Odontólogo con la cuenta inactiva → 422 INACTIVE_SPECIALIST', r.status === 422 && r.body.code === 'INACTIVE_SPECIALIST');
  } finally {
    await pool.query("UPDATE usuario SET estado = 'ACTIVO' WHERE id_usuario = 4");
  }

  /* ---------- POST /citas: RN-02 ---------- */
  const rn02 = [
    [`${domingo} 09:00`, 'domingo (no atiende ese día)'],
    [`${lunes} 12:30`, 'hora del almuerzo (12:00–14:00)'],
    [`${lunes} 07:30`, 'antes de abrir'],
    [`${lunes} 18:00`, 'a la hora de cierre (la franja terminaría 18:30)'],
    [`${lunes} 09:15`, 'minuto que no es :00 ni :30'],
  ];
  for (const [fh, caso] of rn02) {
    r = await api('POST', '/citas', { token: recep.token, body: nueva({ fecha_hora: fh }) });
    check(`RN-02: ${caso} → 422 NO_SCHEDULE`, r.status === 422 && r.body.code === 'NO_SCHEDULE' && r.body.fields.fecha_hora === 'Fuera del horario del odontólogo.');
  }
  r = await api('POST', '/citas', { token: recep.token, body: nueva({ fecha_hora: `${lunesPasado} 09:00` }) });
  check('Hora pasada → 422 PAST_SLOT', r.status === 422 && r.body.code === 'PAST_SLOT');

  /* ---------- POST /citas: creación ---------- */
  r = await api('POST', '/citas', { token: recep.token, body: nueva({ id_paciente: '12', id_especialista: '1', estado_cita: 'COMPLETADA', id_cita: 1, recordatorio_enviado: 1 }) });
  const c1 = r.body;
  check('Recepción agenda → 201 con Location', r.status === 201 && r.headers.get('location') === `/api/citas/${c1.id_cita}`);
  check('… queda PROGRAMADA y con el formato del listado', c1.estado_cita === 'PROGRAMADA' && same(Object.keys(c1), COLUMNAS) && c1.paciente_nombre && c1.especialista_nombre === 'Dr. Roberto Martínez');
  check('… "HH:MM" se guarda como "HH:MM:00" y los ids en texto se aceptan', c1.fecha_hora === `${lunes} 09:00:00` && c1.id_paciente === 12);
  check('… ignora estado_cita, id_cita y recordatorio_enviado del cliente (asignación masiva)', c1.id_cita > maxCita && c1.recordatorio_enviado === 0);
  let log = await ultimoLog();
  check('… queda CREAR en log_auditoria a nombre de recepción', log?.accion === 'CREAR' && log.tabla_afectada === 'cita' && log.id_usuario === recep.user.id_usuario && log.detalles.startsWith(`Cita #${c1.id_cita}`));

  r = await api('POST', '/citas', { token: admin.token, body: nueva({ id_paciente: 13 }) });
  check('Misma franja del mismo odontólogo → 409 SLOT_TAKEN en fecha_hora', r.status === 409 && r.body.code === 'SLOT_TAKEN' && r.body.fields.fecha_hora === 'Franja ocupada. Elige otra.');

  r = await api('POST', '/citas', { token: admin.token, body: nueva({ fecha_hora: `${martes} 09:00` }) });
  check('Martes 09:00 con el odontólogo 1 → 201', r.status === 201);
  r = await api('POST', '/citas', { token: admin.token, body: nueva({ id_especialista: 2, fecha_hora: `${martes} 09:00` }) });
  check('El mismo paciente a la misma hora con OTRO odontólogo → 409 PATIENT_BUSY', r.status === 409 && r.body.code === 'PATIENT_BUSY');

  r = await api('POST', '/citas', { token: pac.token, body: nueva({ id_paciente: 12, fecha_hora: `${lunes} 10:00`, motivo: 'Me duele una muela' }) });
  const solicitud = r.body;
  check('PACIENTE agenda → 201 PENDIENTE_CONFIRMACION (HU-06)', r.status === 201 && solicitud.estado_cita === 'PENDIENTE_CONFIRMACION');
  check('… a su nombre aunque envíe id_paciente de otro', solicitud.id_paciente === 11);
  r = await api('POST', '/citas', { token: recep.token, body: nueva({ fecha_hora: `${lunes} 10:00`, id_paciente: 14 }) });
  check('Una solicitud pendiente también ocupa la franja → 409', r.status === 409 && r.body.code === 'SLOT_TAKEN');

  // Carrera: 5 personas piden la MISMA franja a la vez. El bloqueo FOR UPDATE las pone en fila.
  const carrera = await Promise.all([14, 15, 16, 17, 18].map((idp) => api('POST', '/citas', { token: admin.token, body: nueva({ id_paciente: idp, fecha_hora: `${lunes} 11:00` }) })));
  const estados = carrera.map((x) => x.status).sort();
  check('5 agendamientos simultáneos en la misma franja → uno 201 y cuatro 409', same(estados, [201, 409, 409, 409, 409]), estados.join('/'));
  const [[{ n: enFranja }]] = await pool.query("SELECT COUNT(*) AS n FROM cita WHERE id_especialista = 1 AND fecha_hora = ? AND estado_cita <> 'CANCELADA'", [`${lunes} 11:00:00`]);
  check('… y en la base quedó UNA sola cita en esa franja', enFranja === 1);

  /* ---------- PATCH /citas/:id/estado ---------- */
  r = await api('PATCH', `/citas/${solicitud.id_cita}/estado`, { body: { estado: 'PROGRAMADA' } });
  check('PATCH sin token → 401', r.status === 401);
  r = await api('PATCH', '/citas/abc/estado', { token: admin.token, body: { estado: 'CANCELADA' } });
  check('id que no es número → 404', r.status === 404 && r.body.message === 'La cita no existe.');
  r = await api('PATCH', '/citas/99999/estado', { token: admin.token, body: { estado: 'CANCELADA' } });
  check('Cita inexistente → 404', r.status === 404);
  r = await api('PATCH', `/citas/${solicitud.id_cita}/estado`, { token: admin.token, body: { estado: 'PENDIENTE_CONFIRMACION' } });
  check('Estado no permitido (volver a pendiente) → 400', r.status === 400 && r.body.fields.estado === 'Estado no válido.');
  r = await api('PATCH', `/citas/${solicitud.id_cita}/estado`, { token: admin.token, body: {} });
  check('Sin estado → 400', r.status === 400 && r.body.fields.estado);

  r = await api('PATCH', `/citas/${solicitud.id_cita}/estado`, { token: pac.token, body: { estado: 'PROGRAMADA' } });
  check('PACIENTE no puede confirmar su propia solicitud → 403', r.status === 403);
  r = await api('PATCH', `/citas/${c1.id_cita}/estado`, { token: pac.token, body: { estado: 'CANCELADA' } });
  check('PACIENTE no puede cancelar la cita de otro → 403', r.status === 403 && r.body.message === 'Solo puedes consultar tu propia información.');

  r = await api('PATCH', `/citas/${solicitud.id_cita}/estado`, { token: recep.token, body: { estado: 'PROGRAMADA' } });
  check('Recepción confirma la solicitud → 200 PROGRAMADA', r.status === 200 && r.body.estado_cita === 'PROGRAMADA' && same(Object.keys(r.body), COLUMNAS));
  log = await ultimoLog();
  check('… queda CITA_PROGRAMADA en la auditoría con el estado anterior', log?.accion === 'CITA_PROGRAMADA' && log.id_usuario === recep.user.id_usuario && log.detalles === `Cita #${solicitud.id_cita}: PENDIENTE_CONFIRMACION → PROGRAMADA`);

  r = await api('PATCH', `/citas/${c1.id_cita}/estado`, { token: recep.token, body: { estado: 'COMPLETADA' } });
  check('Recepción no puede completar una cita → 403', r.status === 403);
  const [[ajena]] = await pool.query("SELECT id_cita FROM cita WHERE id_especialista = 2 AND estado_cita = 'PROGRAMADA' LIMIT 1");
  r = await api('PATCH', `/citas/${ajena.id_cita}/estado`, { token: doc.token, body: { estado: 'COMPLETADA' } });
  check('Un odontólogo no completa la cita de otro odontólogo → 403', r.status === 403);
  r = await api('PATCH', `/citas/${c1.id_cita}/estado`, { token: doc.token, body: { estado: 'COMPLETADA' } });
  check('El odontólogo de la cita la completa → 200 COMPLETADA', r.status === 200 && r.body.estado_cita === 'COMPLETADA');
  r = await api('PATCH', `/citas/${c1.id_cita}/estado`, { token: admin.token, body: { estado: 'CANCELADA' } });
  check('Completada → cancelada → 409 INVALID_TRANSITION', r.status === 409 && r.body.code === 'INVALID_TRANSITION' && r.body.message === 'Una cita completada no puede pasar a cancelada.');

  r = await api('PATCH', `/citas/${solicitud.id_cita}/estado`, { token: pac.token, body: { estado: 'CANCELADA' } });
  check('PACIENTE cancela su propia cita → 200 CANCELADA', r.status === 200 && r.body.estado_cita === 'CANCELADA');
  log = await ultimoLog();
  check('… queda CITA_CANCELADA a nombre del paciente', log?.accion === 'CITA_CANCELADA' && log.id_usuario === pac.user.id_usuario);
  r = await api('PATCH', `/citas/${solicitud.id_cita}/estado`, { token: admin.token, body: { estado: 'PROGRAMADA' } });
  check('Cancelada → programada → 409 (una cancelación no se revierte)', r.status === 409 && r.body.message === 'Una cita cancelada no puede pasar a programada.');
  r = await api('POST', '/citas', { token: recep.token, body: nueva({ fecha_hora: `${lunes} 10:00`, id_paciente: 14 }) });
  check('La franja de una cita cancelada vuelve a estar libre → 201', r.status === 201);

  // Dos personas cancelan la misma cita a la vez: el FOR UPDATE hace que la segunda vea "cancelada".
  const ganadora = carrera.find((x) => x.status === 201).body;
  const dobles = await Promise.all([admin, recep].map((x) => api('PATCH', `/citas/${ganadora.id_cita}/estado`, { token: x.token, body: { estado: 'CANCELADA' } })));
  check('Dos cancelaciones simultáneas → una 200 y otra 409', same(dobles.map((x) => x.status).sort(), [200, 409]), dobles.map((x) => x.status).join('/'));
  const [[{ n: cancelaciones }]] = await pool.query("SELECT COUNT(*) AS n FROM log_auditoria WHERE id_log > ? AND accion = 'CITA_CANCELADA' AND detalles LIKE ?", [maxLog, `Cita #${ganadora.id_cita}:%`]);
  check('… y la auditoría registra UNA sola cancelación', cancelaciones === 1);

  r = await api('PATCH', `/citas/${c1.id_cita}/estado`, { token: admin.token, raw: '{"estado":' });
  check('JSON mal formado en el PATCH → 400 BAD_JSON', r.status === 400 && r.body.code === 'BAD_JSON');

  /* ---------- Catálogos que usa la agenda (GET /especialistas, GET /servicios) ---------- */
  const { especialistasService } = await import(new URL('services/especialistas.service.js', frontend).href);
  const { serviciosService } = await import(new URL('services/servicios.service.js', frontend).href);
  r = await api('GET', '/especialistas');
  check('GET /especialistas sin token → 401', r.status === 401);
  r = await api('GET', '/especialistas', { token: pac.token });
  check('Contrato: odontólogos con horarios iguales a los del mock (también para el PACIENTE)', r.status === 200 && same(r.body, await especialistasService.list()), `${r.body?.length} odontólogos`);
  try {
    await pool.query("UPDATE usuario SET estado = 'INACTIVO' WHERE id_usuario = 4");
    r = await api('GET', '/especialistas?soloActivos=true', { token: recep.token });
    check('?soloActivos=true oculta al odontólogo con la cuenta inactiva', r.status === 200 && r.body.length === 2 && !r.body.some((e) => e.id_especialista === 2));
  } finally {
    await pool.query("UPDATE usuario SET estado = 'ACTIVO' WHERE id_usuario = 4");
  }
  r = await api('GET', '/servicios', { token: admin.token });
  check('Contrato: tratamientos iguales a los del mock', r.status === 200 && same(r.body, await serviciosService.list()));
  try {
    await pool.query("UPDATE servicio SET estado = 'INACTIVO' WHERE id_servicio = 5");
    const todos = await api('GET', '/servicios', { token: admin.token });
    const activos = await api('GET', '/servicios?soloActivos=true', { token: admin.token });
    const delPaciente = await api('GET', '/servicios', { token: pac.token });
    check('Inactivo: el admin lo ve, ?soloActivos y el PACIENTE no', todos.body.length === 5 && activos.body.length === 4 && delPaciente.body.length === 4);
  } finally {
    await pool.query("UPDATE servicio SET estado = 'ACTIVO' WHERE id_servicio = 5");
  }
  r = await api('GET', '/no-existe-tampoco');
  check('Una ruta inexistente bajo /api sigue dando 404 (no 401)', r.status === 404);
} catch (error) {
  check('La prueba terminó sin excepciones', false, error.stack);
} finally {
  // Limpieza: lo creado por la prueba y su auditoría; el AUTO_INCREMENT vuelve a donde estaba.
  await pool.query('DELETE FROM cita WHERE id_cita > ?', [maxCita]);
  await pool.query('DELETE FROM log_auditoria WHERE id_log > ?', [maxLog]);
  await pool.query('ALTER TABLE cita AUTO_INCREMENT = 1');
  await pool.query('ALTER TABLE log_auditoria AUTO_INCREMENT = 1');
  await cerrar();
}

report();
