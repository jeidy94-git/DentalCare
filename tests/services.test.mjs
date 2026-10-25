// Pruebas de la capa de servicios mock (fase A5): auth, permisos, RN-01, RN-02, persistencia, PBKDF2.
// Ejecutar desde la raíz del proyecto: node tests/services.test.mjs
const base = new URL('../frontend/js/', import.meta.url);
const imp = (p) => import(new URL(p, base).href);

const S = await imp('services/index.js');
const { setMockLatency, getDb } = await imp('services/mock/db.js');
const { getSession, clearSession } = await imp('core/session.js');
const { storage } = await imp('core/storage.js');
const { CITAS } = await imp('data/mock/citas.js');
const { toISODate, addDays } = await imp('core/dates.js');
const { getDaySlots } = await imp('core/agenda.js');

const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra !== '' ? '  · ' + extra : ''}`);
const err = async (promise) => {
  try {
    await promise;
    return null;
  } catch (e) {
    return e;
  }
};
const login = (email, pwd) => S.authService.login(email, pwd);

try {
  check('Sin localStorage en Node → almacenamiento en memoria', storage.persistent === false);

  /* ---------- Sin sesión ---------- */
  let e = await err(S.pacientesService.list());
  check('Sin sesión → 401', e?.status === 401 && e.code === 'UNAUTHORIZED');

  /* ---------- Latencia ---------- */
  let t0 = performance.now();
  e = await err(login('admin@dentalcare.com', 'mala'));
  let dt = performance.now() - t0;
  check('Latencia simulada 150–300 ms (+ PBKDF2)', dt >= 145 && dt < 700, `${Math.round(dt)} ms`);
  check('Login: contraseña incorrecta → 401 mensaje genérico', e?.status === 401 && e.message === 'Correo o contraseña incorrectos.');
  setMockLatency(0);
  const e2 = await err(login('noexiste@x.com', 'Admin2026*'));
  check('Login: correo inexistente → MISMO mensaje', e2?.status === 401 && e2.message === e.message);
  check('Login fallido queda en log_auditoria (persistido)', storage.get('db').log_auditoria.filter((l) => l.accion === 'LOGIN_FALLIDO').length === 2);
  check('Contraseñas: ninguna en texto plano en la BD mock', getDb().usuario.every((u) => u.password_hash.startsWith('pbkdf2_sha256$')) && !JSON.stringify(storage.get('db')).includes('Admin2026*'));

  /* ---------- Administrador ---------- */
  let user = await login('ADMIN@dentalcare.com ', 'Admin2026*');
  check('Login admin (correo sin distinguir mayúsculas)', user.rol === 'ADMINISTRADOR' && user.nombre === 'Laura Gómez' && getSession()?.token.startsWith('mock.'));
  check('Sesión: vence a las 8 h', getSession(Date.now() + 8 * 3600 * 1000 + 1) === null);
  user = await login('admin@dentalcare.com', 'Admin2026*'); // la línea anterior borró la sesión vencida

  let pacientes = await S.pacientesService.list();
  check('Pacientes: 40 del seed', pacientes.length === 40);
  check('Pacientes: búsqueda sin tildes', (await S.pacientesService.list({ q: 'londono' })).map((p) => p.apellidos).join() === 'Londoño');
  pacientes[0].nombres = 'HACKEADO';
  check('Respuesta es una COPIA (no muta la BD)', !getDb().paciente.some((p) => p.nombres === 'HACKEADO'));

  e = await err(S.pacientesService.create({ nombres: 'Ana' }));
  check('Crear paciente vacío → 400 con errores por campo', e?.status === 400 && e.fields.numero_documento && e.fields.telefono && !e.fields.nombres);
  const nuevo = { tipo_documento: 'CC', numero_documento: '1036000101', nombres: 'Ana', apellidos: 'Prueba', fecha_nacimiento: '1999-01-01', genero: 'FEMENINO', telefono: '3001234567' };
  e = await err(S.pacientesService.create(nuevo));
  check('Documento repetido → 409 en el campo', e?.status === 409 && e.firstField()?.[0] === 'numero_documento');
  const creado = await S.pacientesService.create({ ...nuevo, numero_documento: '1099888777', nombres: '  Ana  ' });
  check('Crear paciente → id 51, datos limpios', creado.id_paciente === 51 && creado.nombres === 'Ana');
  check('Crear paciente → historia clínica creada', getDb().historia_clinica.some((hc) => hc.id_paciente === 51));
  check('Persistencia: el paciente está en el almacenamiento', storage.get('db').paciente.some((p) => p.id_paciente === 51));
  e = await err(S.pacientesService.update(51, { telefono: '123' }));
  check('Update inválido → 400 y no se guarda', e?.status === 400 && storage.get('db').paciente.find((p) => p.id_paciente === 51).telefono === '3001234567');
  e = await err(S.pacientesService.remove(11));
  check('Eliminar paciente con citas → 409', e?.status === 409 && e.code === 'HAS_REFERENCES');
  await S.pacientesService.remove(51);
  check('Eliminar paciente sin historial → borra paciente e historia', !getDb().paciente.some((p) => p.id_paciente === 51) && !getDb().historia_clinica.some((hc) => hc.id_paciente === 51));
  const sinCitas = await S.pacientesService.create({ ...nuevo, numero_documento: '1099888778' });

  /* ---------- Citas y RN-02 ---------- */
  const db = getDb();
  let domingo = addDays(new Date(), 1);
  while (domingo.getDay() !== 0) domingo = addDays(domingo, 1);
  e = await err(S.citasService.create({ id_paciente: 12, id_especialista: 2, id_servicio: 1, fecha_hora: `${toISODate(domingo)} 09:00`, motivo: 'Control' }));
  check('RN-02: domingo sin horario → 422 NO_SCHEDULE', e?.status === 422 && e.code === 'NO_SCHEDULE');
  // primera franja libre y una ocupada del Dr. Roberto en los próximos días
  let libre = null;
  let ocupada = null;
  for (let i = 1; i < 15 && !(libre && ocupada); i++) {
    const d = toISODate(addDays(new Date(), i));
    for (const s of getDaySlots({ especialistaId: 1, date: d, horarios: db.horario, citas: db.cita })) {
      if (!libre && s.status === 'available') libre = `${d} ${s.start}`;
      if (!ocupada && s.status === 'occupied') ocupada = `${d} ${s.start}`;
    }
  }
  e = await err(S.citasService.create({ id_paciente: 12, id_especialista: 1, id_servicio: 1, fecha_hora: ocupada, motivo: 'Control' }));
  check('Franja ocupada → 409 SLOT_TAKEN', e?.status === 409 && e.code === 'SLOT_TAKEN');
  const cita = await S.citasService.create({ id_paciente: '12', id_especialista: '1', id_servicio: '2', fecha_hora: libre, motivo: 'Limpieza' });
  check('Cita creada por admin → PROGRAMADA con nombres unidos', cita.estado_cita === 'PROGRAMADA' && cita.paciente_nombre === 'Carolina Villa' && cita.servicio_nombre === 'Limpieza Dental Profunda', cita.especialista_nombre);
  const slots = await S.citasService.disponibilidad({ id_especialista: 1, fecha: libre.slice(0, 10) });
  check('Disponibilidad: la franja quedó ocupada y no expone al paciente', slots.find((s) => s.start === libre.slice(11)).status === 'occupied' && slots.every((s) => !('cita' in s)));
  const alt = await S.citasService.alternativas({ id_especialista: 2, fecha: toISODate(domingo) });
  check('RF-CIT-03: alternativas', alt.sameDoctor.length === 3);

  /* ---------- Recepcionista ---------- */
  await S.authService.logout();
  check('Logout borra la sesión', getSession() === null);
  user = await login('recepcion@dentalcare.com', 'Recep2026*');
  e = await err(S.historiasService.update(11, { alergias: 'Penicilina' }));
  check('Recepción no edita historias (RN-01) → 403', e?.status === 403);
  const pendiente = db.cita.find((c) => c.estado_cita === 'PENDIENTE_CONFIRMACION');
  check('Recepción confirma una solicitud → PROGRAMADA', (await S.citasService.confirmar(pendiente.id_cita)).estado_cita === 'PROGRAMADA');
  await S.citasService.cancelar(cita.id_cita);
  e = await err(S.citasService.cancelar(cita.id_cita));
  check('Transición inválida (cancelar 2 veces) → 409', e?.status === 409 && e.code === 'INVALID_TRANSITION');
  e = await err(S.ventasService.registrarAbono(1, { id_metodo: 1, monto_abonado: 999999 }));
  check('Abono mayor al saldo → 422 y nada cambia', e?.status === 422 && storage.get('db').venta[0].monto_pagado === 50000);
  const { venta } = await S.ventasService.registrarAbono(1, { id_metodo: 4, monto_abonado: 90000 });
  check('Abono exacto → saldo 0, PAGADO, cuota 2', venta.estado_venta === 'PAGADO' && venta.saldo_pendiente === 0 && venta.pagos.at(-1).numero_cuota_actual === 2 && venta.pagos.at(-1).metodo === 'TRANSFERENCIA');
  e = await err(S.ventasService.registrarAbono(1, { id_metodo: 1, monto_abonado: 1000 }));
  check('Abonar a venta pagada → 409', e?.status === 409);
  check('Seed corregido: venta #2 con saldo es PENDIENTE', (await S.ventasService.get(2)).estado_venta === 'PENDIENTE');
  check('Ventas con el nombre del tratamiento (B-11)', venta.servicio_nombre === 'Calza / Resina Estética' && (await S.ventasService.list()).every((v) => v.servicio_nombre));
  e = await err(S.ventasService.create({ id_paciente: 12, monto_total: 120000, modalidad_pago: 'CONTADO' }));
  check('Venta sin tratamiento → 400 en el campo', e?.status === 400 && e.fields.id_servicio);
  const ventaNueva = await S.ventasService.create({ id_paciente: 12, id_servicio: 2, monto_total: 120000, modalidad_pago: 'CONTADO' });
  check('Venta nueva con su tratamiento', ventaNueva.id_servicio === 2 && ventaNueva.servicio_nombre === 'Limpieza Dental Profunda' && ventaNueva.estado_venta === 'PENDIENTE');
  // Venta pendiente de Andrés (paciente 11) para el pago en línea de más abajo: la #1 ya quedó pagada.
  const ventaAndres = await S.ventasService.create({ id_paciente: 11, id_servicio: 3, monto_total: 90000, modalidad_pago: 'CREDITO', numero_cuotas: 3 });
  const nov = await S.novedadesService.create({ tipo_novedad: 'INVENTARIO', descripcion: 'Faltan guantes talla S en bodega.' });
  check('Novedad: responsable = usuario de la sesión', nov.responsable === 'Carlos Pérez' && nov.id_personal === 2);
  e = await err(S.novedadesService.remove(nov.id_novedad));
  check('Recepción no elimina novedades → 403', e?.status === 403);

  /* ---------- Especialista (RN-01) ---------- */
  user = await login('dr.roberto@dentalcare.com', 'DocRoberto2026*');
  check('Login especialista → id_especialista 1', user.id_especialista === 1 && user.rol === 'ESPECIALISTA');
  const suyos = new Set(db.cita.filter((c) => c.id_especialista === 1 && c.estado_cita !== 'CANCELADA').map((c) => c.id_paciente));
  const ajeno = db.paciente.find((p) => !suyos.has(p.id_paciente));
  check('Paciente nuevo sin citas no es "del" Dr. Roberto', ajeno?.id_paciente === sinCitas.id_paciente);
  const propio = [...suyos][0];
  const reg = await S.odontogramaService.save(propio, { id_diente: 26, cara_diente: 'OCLUSAL', diagnostico: 'Caries', estado_tratamiento: 'PENDIENTE' });
  const reg2 = await S.odontogramaService.save(propio, { id_diente: 26, cara_diente: 'OCLUSAL', diagnostico: 'Resina', estado_tratamiento: 'REALIZADO' });
  check('Odontograma: upsert por pieza + cara', reg2.id_odontograma === reg.id_odontograma && reg2.estado_tratamiento === 'REALIZADO');
  e = await err(S.odontogramaService.save(propio, { id_diente: 19, cara_diente: 'OCLUSAL', diagnostico: 'x', estado_tratamiento: 'PENDIENTE' }));
  check('Odontograma: pieza 19 no existe en FDI → 400', e?.status === 400 && e.fields.id_diente);
  if (ajeno) {
    e = await err(S.odontogramaService.save(ajeno.id_paciente, { id_diente: 11, cara_diente: 'VESTIBULAR', diagnostico: 'x', estado_tratamiento: 'PENDIENTE' }));
    check('RN-01: odontólogo NO asignado → 403', e?.status === 403, ajeno ? `paciente ${ajeno.id_paciente}` : 'sin paciente ajeno');
  } else check('RN-01: odontólogo NO asignado → 403', true, 'todos los pacientes tienen cita con el Dr. Roberto (sin caso)');
  const ajena = db.cita.find((c) => c.id_especialista === 2 && c.estado_cita === 'PROGRAMADA');
  e = await err(S.citasService.completar(ajena.id_cita));
  check('Completar cita de otro odontólogo → 403', e?.status === 403);
  e = await err(S.ventasService.list());
  check('Especialista no ve pagos → 403', e?.status === 403);
  e = await err(S.ventasService.registrarAbono(ventaAndres.id_venta, { id_metodo: 2, monto_abonado: 1000 }));
  check('Especialista no registra pagos → 403', e?.status === 403);
  const hcDoc = await S.historiasService.getByPaciente(11);
  check('Especialista: historia completa (antecedentes, observaciones, diagnóstico)', 'antecedentes_medicos' in hcDoc && 'observaciones' in hcDoc && 'diagnostico' in hcDoc.consultas[0]);

  /* ---------- Paciente ---------- */
  user = await login('andres.galvis@gmail.com', 'AndresG2026*');
  check('Login paciente → id_paciente 11', user.id_paciente === 11 && user.nombre === 'Andrés Galvis');
  check('Paciente: list solo se ve a sí mismo', (await S.pacientesService.list()).map((p) => p.id_paciente).join() === '11');
  e = await err(S.pacientesService.get(12));
  check('Paciente: ver a otro → 403', e?.status === 403);
  check('Paciente: solo SUS citas', (await S.citasService.list()).every((c) => c.id_paciente === 11));
  e = await err(S.historiasService.getByPaciente(12));
  check('Paciente: historia ajena → 403', e?.status === 403);
  const hc = await S.historiasService.getByPaciente(11);
  check('Paciente: su historia con consultas', hc.id_historia === 1 && hc.consultas.length >= 1 && hc.consultas[0].especialista_nombre);
  check('Paciente: sin notas internas (antecedentes, observaciones)', !('antecedentes_medicos' in hc) && !('observaciones' in hc) && 'alergias' in hc);
  check('Paciente: tratamientos sin diagnóstico, con procedimiento', hc.consultas.every((q) => !('diagnostico' in q) && 'procedimiento_realizado' in q));
  check('Paciente: solo sus ventas', (await S.ventasService.list()).every((v) => v.id_paciente === 11));
  e = await err(S.ventasService.registrarAbono(2, { id_metodo: 2, monto_abonado: 1000 }));
  check('Pago en línea: venta de otro paciente → 403', e?.status === 403);
  e = await err(S.ventasService.registrarAbono(ventaAndres.id_venta, { id_metodo: 1, monto_abonado: 1000 }));
  check('Pago en línea: efectivo no disponible → 400 en el método', e?.status === 400 && e.fields.id_metodo);
  const enLinea = await S.ventasService.registrarAbono(ventaAndres.id_venta, { id_metodo: 2, monto_abonado: 30000 });
  check('Pago en línea del paciente → saldo actualizado y comprobante con método', enLinea.venta.saldo_pendiente === 60000 && enLinea.pago.metodo === 'TARJETA_CREDITO' && enLinea.pago.numero_cuota_actual === 1 && enLinea.venta.servicio_nombre === 'Calza / Resina Estética');
  check('Pago en línea queda en la auditoría como PAGO_EN_LINEA', getDb().log_auditoria.at(-1).accion === 'PAGO_EN_LINEA');
  e = await err(S.ventasService.registrarAbono(ventaAndres.id_venta, { id_metodo: 4, monto_abonado: 999999 }));
  check('Pago en línea mayor al saldo → 422', e?.status === 422);
  e = await err(S.novedadesService.list());
  check('Paciente: novedades → 403', e?.status === 403);
  let libre2 = null;
  for (let i = 1; i < 15 && !libre2; i++) {
    const d = toISODate(addDays(new Date(), i));
    const s = getDaySlots({ especialistaId: 1, date: d, horarios: getDb().horario, citas: getDb().cita }).find((x) => x.status === 'available');
    if (s) libre2 = `${d} ${s.start}`;
  }
  const solicitud = await S.citasService.create({ id_paciente: 12, id_especialista: 1, id_servicio: 1, fecha_hora: libre2, motivo: 'Dolor' });
  check('Paciente agenda → PENDIENTE_CONFIRMACION y para sí mismo (HU-06)', solicitud.estado_cita === 'PENDIENTE_CONFIRMACION' && solicitud.id_paciente === 11);
  e = await err(S.pacientesService.update(11, { nombres: 'Otro', telefono: '3110000000' }));
  check('Paciente: actualiza solo contacto (ignora nombres)', e === null && getDb().paciente.find((p) => p.id_paciente === 11).nombres === 'Andrés' && getDb().paciente.find((p) => p.id_paciente === 11).telefono === '3110000000');

  /* ---------- Recuperación de contraseña ---------- */
  clearSession();
  const r1 = await S.authService.requestPasswordReset('nadie@correo.com');
  const r2 = await S.authService.requestPasswordReset('admin@dentalcare.com');
  check('Reset: mismo mensaje exista o no el correo', r1.message === r2.message && S.mockOutbox('nadie@correo.com') === null);
  const link = S.mockOutbox('admin@dentalcare.com');
  const token = new URL(link, 'http://x/').searchParams.get('token');
  check('Reset: token verificado con correo enmascarado', (await S.authService.verifyResetToken(token)).email === 'a••••@dentalcare.com');
  e = await err(S.authService.resetPassword(token, 'debil'));
  check('Reset: contraseña débil → 400', e?.status === 400 && e.fields.password);
  await S.authService.resetPassword(token, 'NuevaClave2026*');
  e = await err(S.authService.resetPassword(token, 'OtraClave2026*'));
  check('Reset: el enlace sirve una sola vez', e?.status === 400 && e.code === 'INVALID_TOKEN');
  e = await err(login('admin@dentalcare.com', 'Admin2026*'));
  check('Reset: la contraseña vieja ya no sirve', e?.status === 401);
  check('Reset: entra con la nueva', (await login('admin@dentalcare.com', 'NuevaClave2026*')).rol === 'ADMINISTRADOR');

  /* ---------- Admin: catálogo y especialistas ---------- */
  e = await err(S.serviciosService.remove(1));
  check('Eliminar tratamiento usado → 409 (inactivar)', e?.status === 409);
  e = await err(S.serviciosService.create({ codigo_servicio: 'serv-001', nombre_servicio: 'X', precio_base: 1000 }));
  check('Código de tratamiento repetido (sin distinguir mayúsculas) → 409', e?.status === 409);
  e = await err(S.especialistasService.addHorario(1, { dia_semana: 'Lunes', hora_inicio: '11:00', hora_fin: '13:00' }));
  check('Horario que se cruza → 409', e?.status === 409 && e.code === 'OVERLAP');
  const h = (await S.especialistasService.horarios(1)).find((x) => x.dia_semana === 'Lunes');
  e = await err(S.especialistasService.removeHorario(h.id_horario));
  check('Quitar horario con citas futuras → 409', e?.status === 409 && e.code === 'HAS_APPOINTMENTS', e?.message);
  const esp = await S.especialistasService.create({ nombres: 'Paula', apellidos: 'Ríos', tipo_documento: 'CC', numero_documento: '1010101099', telefono: '3001112233', especialidad: 'Periodoncia', registro_medico: 'RM-2001', email: 'dra.paula@dentalcare.com', password: 'Paula2026*' });
  check('Crear especialista (usuario + personal + especialista)', esp.nombre === 'Paula Ríos' && esp.estado === 'ACTIVO' && esp.horarios.length === 0);
  clearSession();
  check('El especialista nuevo puede ingresar', (await login('dra.paula@dentalcare.com', 'Paula2026*')).id_especialista === esp.id_especialista);

  /* ---------- Ocupación anónima (fase A6: BookingWizard del paciente) ---------- */
  clearSession();
  await login('andres.galvis@gmail.com', 'AndresG2026*');
  const hoyIso = toISODate(new Date());
  const ocupacion = await S.citasService.ocupacion({ desde: hoyIso });
  const activasDb = getDb().cita.filter((c) => ['PROGRAMADA', 'PENDIENTE_CONFIRMACION'].includes(c.estado_cita) && c.fecha_hora.slice(0, 10) >= hoyIso);
  check('Ocupación: el paciente puede consultarla', ocupacion.length === activasDb.length && ocupacion.length > 0, `${ocupacion.length} citas`);
  check('Ocupación: no expone pacientes ni ids', ocupacion.every((c) => Object.keys(c).sort().join() === 'estado_cita,fecha_hora,id_especialista'));

  /* ---------- Perfil propio (perfil.html) ---------- */
  const perfil = await S.authService.perfil();
  check('Perfil: datos de la cuenta con documento y dirección (paciente)', perfil.numero_documento === '1036000101' && perfil.rol === 'PACIENTE' && 'direccion' in perfil && perfil.editables.join() === 'telefono,email,direccion');
  e = await err(S.authService.actualizarPerfil({ telefono: '12345', email: 'malo', direccion: 'x' }));
  check('Perfil: celular y correo inválidos → 400 por campo', e?.status === 400 && e.fields.telefono && e.fields.email);
  e = await err(S.authService.actualizarPerfil({ telefono: '3001234567', email: 'Admin@DentalCare.com' }));
  check('Perfil: correo de otra cuenta → 409 en el campo', e?.status === 409 && e.fields.email);
  const perfil2 = await S.authService.actualizarPerfil({ telefono: '3015550000', email: 'Andres.Nuevo@Correo.com', direccion: 'Calle 1 # 2-3', numero_documento: '999', rol: 'ADMINISTRADOR' });
  const pDb = getDb().paciente.find((p) => p.id_paciente === 11);
  check('Perfil: guarda celular, correo y dirección', perfil2.telefono === '3015550000' && pDb.direccion === 'Calle 1 # 2-3' && pDb.email === 'andres.nuevo@correo.com');
  check('Perfil: documento y rol no cambian aunque lleguen', pDb.numero_documento === '1036000101' && perfil2.rol === 'PACIENTE');
  check('Perfil: la sesión refleja el correo nuevo sin volver a ingresar', getSession().user.email === 'andres.nuevo@correo.com' && getSession().user.rol === 'PACIENTE');
  e = await err(S.authService.cambiarPassword({ password_actual: 'AndresG2026*', password_nueva: 'Nueva2026*', password_confirmacion: 'Otra2026*' }));
  check('Contraseña: confirmación distinta → 400', e?.status === 400 && e.fields.password_confirmacion);
  e = await err(S.authService.cambiarPassword({ password_actual: 'Incorrecta1*', password_nueva: 'Nueva2026*', password_confirmacion: 'Nueva2026*' }));
  check('Contraseña: actual incorrecta → 400 (no cierra la sesión)', e?.status === 400 && e.fields.password_actual && getSession() !== null);
  e = await err(S.authService.cambiarPassword({ password_actual: 'AndresG2026*', password_nueva: 'debil', password_confirmacion: 'debil' }));
  check('Contraseña: nueva débil → 400', e?.status === 400 && e.fields.password_nueva);
  await S.authService.cambiarPassword({ password_actual: 'AndresG2026*', password_nueva: 'Nueva2026*', password_confirmacion: 'Nueva2026*' });
  clearSession();
  e = await err(login('andres.nuevo@correo.com', 'AndresG2026*'));
  check('Contraseña: la anterior ya no sirve', e?.status === 401);
  check('Perfil: ingresa con el correo y la contraseña nuevos', (await login('andres.nuevo@correo.com', 'Nueva2026*')).id_paciente === 11);
  clearSession();

  await login('recepcion@dentalcare.com', 'Recep2026*');
  const perfilRecep = await S.authService.perfil();
  check('Perfil del personal: sin dirección (la tabla personal no la tiene)', !('direccion' in perfilRecep) && perfilRecep.editables.join() === 'telefono,email' && perfilRecep.numero_documento === '1010101002');
  clearSession();

  await login('admin@dentalcare.com', 'NuevaClave2026*');
  S.resetDemoData();
  check('resetDemoData vuelve al seed', getDb().paciente.length === 40 && getDb().log_auditoria.length === 0 && getDb().cita.length === CITAS.length);
} catch (error) {
  check('EXCEPCIÓN', false, error.stack);
}

const fails = results.filter((r) => r.startsWith('FAIL'));
console.log(results.join('\n'));
console.log(`\nTOTAL ${results.length} · FAILS ${fails.length}`);
process.exitCode = fails.length ? 1 : 0;
