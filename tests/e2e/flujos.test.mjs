// Flujos de la fase A6 de punta a punta, como los haría cada usuario:
//  A recepción registra un paciente (documento repetido → error en el campo)   B el paciente solicita una cita
//  C el paciente cancela   D recepción confirma   E el odontólogo registra una consulta
//  F RN-01: otra odontóloga sin citas ve la ficha en solo lectura   G abono   I perfil y contraseña   H cerrar sesión
// Requiere el servidor: node tests/e2e/server.mjs
// Uso: node tests/e2e/flujos.test.mjs [ancho=1366]
import { startBrowser, sleep } from './harness.mjs';

const b = await startBrowser(Number(process.argv[2] ?? 1366));
const { send, evaluate, go, waitReady, login, here, check } = b;

// Utilidades que corren DENTRO de la página
const PAGE_HELPERS = `
  window.__t = {
    q: (sel) => document.querySelector(sel),
    byText: (sel, text) => [...document.querySelectorAll(sel)].find((el) => el.textContent.trim().includes(text)),
    click(sel, text) { const el = text ? this.byText(sel, text) : this.q(sel); if (!el) throw new Error('No encontré ' + sel + ' ' + (text ?? '')); el.click(); return true; },
    set(sel, value) { const el = this.q(sel); if (!el) throw new Error('No encontré ' + sel); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; },
    selectWhere(sel, pred) { const el = this.q(sel); const opt = [...el.options].find((o) => o.value && pred(o)); el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); return opt.textContent; },
    submitDialog() { this.q('dialog[open] form').requestSubmit(); return true; },
  };`;
const t = async (code) => {
  await evaluate(PAGE_HELPERS);
  const r = await send('Runtime.evaluate', { expression: code, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
};
const bodyText = () => evaluate('document.body.innerText');
const waitText = async (text, timeout = 5000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if ((await bodyText()).includes(text)) return true;
    await sleep(150);
  }
  return false;
};
async function as(email, pwd) {
  await evaluate('localStorage.removeItem("dentalcare:session")');
  await login(email, pwd);
  await waitReady();
}

try {
  await go('login.html');
  await evaluate('localStorage.clear()'); // datos de demostración desde el seed

  /* A. Recepción registra un paciente: documento repetido → error junto al campo */
  await as('recepcion@dentalcare.com', 'Recep2026*');
  await go('pages/asistente/pacientes.html'); await waitReady();
  await t(`__t.click('button', 'Nuevo paciente')`); await sleep(300);
  await t(`[['nombres','Ana'],['apellidos','Prueba E2E'],['tipo_documento','CC'],['numero_documento','1036000101'],['fecha_nacimiento','1999-01-01'],['genero','FEMENINO'],['telefono','3001234567']].forEach(([n,v]) => __t.set('dialog[open] [name="'+n+'"]', v)) || __t.submitDialog()`);
  await sleep(900);
  const dupMsg = await t(`__t.q('dialog[open] [name="numero_documento"]')?.closest('.field')?.textContent ?? 'sin modal'`);
  check('A1 Documento repetido → error en el campo', dupMsg.includes('Ya existe'), dupMsg.slice(-70));
  await t(`__t.set('dialog[open] [name="numero_documento"]', '1099000111') && __t.submitDialog()`);
  check('A2 Paciente registrado', await waitText('Paciente registrado'));
  check('A3 Modal cerrado', !(await evaluate(`!!document.querySelector('dialog[open]')`)));

  /* B. El paciente solicita una cita con el Dr. Roberto (queda por confirmar) */
  await as('andres.galvis@gmail.com', 'AndresG2026*');
  await go('pages/paciente/agendar.html'); await waitReady();
  const servicio = await t(`__t.selectWhere('[name="id_servicio"]', () => true)`);
  const odonto = await t(`__t.selectWhere('[name="id_especialista"]', (o) => o.textContent.includes('Roberto'))`);
  await t(`__t.click('button', 'Siguiente')`); await sleep(300);
  // Hoy puede no quedar franja libre: se busca el siguiente día con disponibilidad.
  let slot = null;
  for (let i = 1; i <= 10 && !slot; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await t(`__t.set('[name="fecha"]', '${iso}')`); await sleep(150);
    slot = await t(`(() => { const b = document.querySelector('.time-slot:not([aria-disabled])'); if (!b) return null; b.click(); return '${iso} ' + b.textContent; })()`);
  }
  check('B1 Hay franjas libres (RN-02)', Boolean(slot), `${servicio} · ${odonto} · ${slot}`);
  await t(`__t.click('button', 'Siguiente')`); await sleep(300);
  check('B2 Aviso: quedará pendiente de confirmación', (await bodyText()).includes('Pendiente de confirmación'));
  await t(`__t.click('button', 'Agendar cita')`);
  check('B3 Solicitud enviada', await waitText('Solicitud enviada'));
  check('B4 Estado real: pendiente de confirmación', await waitText('estado pendiente de confirmación'));

  /* C. El paciente cancela una de sus citas futuras */
  await go('pages/paciente/mis-citas.html'); await waitReady();
  check('C1 Aviso de solicitudes por confirmar', (await bodyText()).includes('esperando confirmación'));
  // No con el Dr. Roberto: la solicitud de B debe seguir viva para D y E (las citas generadas cambian con la fecha).
  await t(`__t.click('button[aria-label^="Cancelar cita"]:not([aria-label*="Roberto"])')`); await sleep(300);
  await t(`__t.click('dialog[open] .dialog__actions button', 'Cancelar cita')`);
  check('C2 Cita cancelada por el paciente', await waitText('La cita fue cancelada.'));

  /* D. Recepción confirma solicitudes desde la agenda (lista filtrada) */
  await as('recepcion@dentalcare.com', 'Recep2026*');
  await go('pages/asistente/agenda.html'); await waitReady();
  // Las pestañas aparecen cuando la agenda termina de cargar sus datos: se esperan antes del clic.
  for (let i = 0; i < 40 && !(await evaluate(`[...document.querySelectorAll('[role="tab"]')].some((x) => x.textContent.includes('Lista'))`)); i++) await sleep(100);
  await t(`__t.click('[role="tab"]', 'Lista')`); await sleep(200);
  await t(`__t.click('.data-table__chips button', 'Por confirmar')`); await sleep(200);
  // Se confirma la solicitud de B (Andrés con el Dr. Roberto): así E siempre tiene una cita programada sin consulta.
  await t(`__t.set('.data-table input[type="search"]', 'Galvis')`); await sleep(500);
  await t(`(() => {
    const row = [...document.querySelectorAll('.data-table tbody tr')].find((r) => r.textContent.includes('Roberto') && r.querySelector('button[aria-label^="Confirmar"]'));
    if (!row) throw new Error('No encontré la solicitud de Andrés Galvis con el Dr. Roberto');
    row.querySelector('button[aria-label^="Confirmar"]').click();
    return true;
  })()`); await sleep(300);
  await t(`__t.click('dialog[open] .dialog__actions button', 'Confirmar')`);
  check('D1 Recepción confirma una solicitud', await waitText('La cita quedó programada.'));

  /* E. El odontólogo registra una consulta (RN-01: es el asignado) */
  await as('dr.roberto@dentalcare.com', 'DocRoberto2026*');
  await go('pages/doctor/historia.html?id=11'); await waitReady();
  await t(`__t.click('[role="tab"]', 'Consultas')`); await sleep(200);
  await t(`__t.click('button', 'Registrar consulta')`); await sleep(300);
  await t(`__t.set('dialog[open] [name="diagnostico"]', 'Caries incipiente en 36') && __t.set('dialog[open] [name="procedimiento_realizado"]', 'Sellante de fosas y fisuras') && __t.submitDialog()`);
  check('E1 Consulta registrada', await waitText('Consulta registrada'));
  check('E2 Aparece en la línea de tiempo', await waitText('Caries incipiente en 36'));

  /* F. Otra odontóloga sin citas con el paciente nuevo → solo lectura (RN-01) */
  await as('dra.sofia@dentalcare.com', 'DocSofia2026*');
  const idNuevo = await evaluate(`JSON.parse(localStorage.getItem('dentalcare:db')).paciente.find((p) => p.numero_documento === '1099000111').id_paciente`);
  await go(`pages/doctor/historia.html?id=${idNuevo}`); await waitReady();
  check('F1 Ficha sin citas → solo lectura', (await bodyText()).includes('Solo lectura'), `paciente #${idNuevo}`);
  check('F2 Sin botón "Editar" historia', !(await evaluate(`[...document.querySelectorAll('aside button')].some((b) => b.textContent.includes('Editar'))`)));

  /* G. Administración registra un abono */
  await as('admin@dentalcare.com', 'Admin2026*');
  await go('pages/admin/pagos.html'); await waitReady();
  check('G0 La tabla de ventas muestra el tratamiento', await t(`[...document.querySelectorAll('thead th')].some((th) => th.textContent.includes('Tratamiento')) && document.body.innerText.includes('Limpieza Dental Profunda')`));
  await t(`__t.click('button[aria-label^="Registrar abono"]')`); await sleep(300);
  const abonoTxt = await t(`document.querySelector('dialog[open]').innerText`);
  check('G1 El modal de abono dice qué tratamiento se paga', /Tratamiento\s+\S/.test(abonoTxt) && /Saldo pendiente/.test(abonoTxt), abonoTxt.split('\n').slice(0, 4).join(' | '));
  await t(`__t.set('dialog[open] [name="monto_abonado"]', '1000') && __t.selectWhere('dialog[open] [name="id_metodo"]', () => true) && __t.submitDialog()`);
  check('G2 Abono registrado', await waitText('Abono registrado'));
  await sleep(500);
  await t(`__t.click('button[aria-label^="Ver detalle"]')`);
  // El comprobante se abre después de pedir la venta al servicio (latencia del mock): se espera el diálogo.
  for (let i = 0; i < 40 && !(await evaluate(`!!document.querySelector('dialog[open]')`)); i++) await sleep(100);
  const comprobante = (await t(`document.querySelector('dialog[open]')?.innerText`)) ?? 'sin diálogo';
  check('G3 Comprobante con el tratamiento', comprobante.includes('Comprobante') && /Tratamiento\s+\S/.test(comprobante), comprobante.split('\n').slice(0, 3).join(' | '));
  await t(`__t.click('dialog[open] button', 'Cerrar')`); await sleep(200);

  /* I. El paciente edita su perfil y cambia la contraseña (perfil.html) */
  await as('andres.galvis@gmail.com', 'AndresG2026*');
  await t(`__t.click('.topbar__profile')`); await sleep(200);
  await t(`__t.click('.popover__item', 'Mi perfil')`);
  await sleep(600); await waitReady();
  const ro = await t(`JSON.stringify({ path: location.pathname, doc: [...document.querySelectorAll('form.perfil-form input[readonly]')].map((i) => i.value),
    disabled: __t.q('form.perfil-form button[type="submit"]').disabled })`);
  check('I1 Perfil: documento y rol en solo lectura, guardar inactivo sin cambios', ro.includes('/perfil.html') && ro.includes('CC 1036000101') && ro.includes('Paciente') && ro.includes('"disabled":true'), ro);
  await t(`__t.set('form.perfil-form [name="telefono"]', '123') && (__t.q('form.perfil-form').requestSubmit(), true)`); await sleep(200);
  check('I2 Celular inválido → error junto al campo', await t(`!!__t.q('form.perfil-form [name="telefono"]').closest('.field--invalid') && document.body.innerText.includes('celular de 10 dígitos')`));
  await t(`__t.set('form.perfil-form [name="telefono"]', '3015550000') && __t.set('form.perfil-form [name="email"]', 'andres.e2e@correo.com')`);
  check('I3 Cambios sin guardar (data-state)', (await t(`__t.q('form.perfil-form').dataset.state`)) === 'dirty');
  await t(`(__t.q('form.perfil-form').requestSubmit(), true)`);
  check('I4 Perfil actualizado', await waitText('Perfil actualizado'));
  check('I5 Topbar con el correo nuevo sin volver a ingresar', (await t(`__t.q('form.perfil-form').dataset.state + ' ' + __t.q('.popover__meta').textContent`)) === 'saved andres.e2e@correo.com');
  await t(`__t.click('button', 'Cambiar contraseña')`); await sleep(300);
  await t(`__t.set('dialog[open] [name="password_actual"]', 'AndresG2026*') && __t.set('dialog[open] [name="password_nueva"]', 'Nueva2026*') && __t.set('dialog[open] [name="password_confirmacion"]', 'Otra2026*') && __t.submitDialog()`);
  await sleep(300);
  check('I6 Contraseñas distintas → error en la confirmación', await t(`!!document.querySelector('dialog[open]') && document.querySelector('dialog[open]').innerText.includes('Las contraseñas no coinciden')`));
  await t(`__t.set('dialog[open] [name="password_confirmacion"]', 'Nueva2026*') && __t.submitDialog()`);
  check('I7 Contraseña actualizada', await waitText('Contraseña actualizada'));
  await as('andres.e2e@correo.com', 'Nueva2026*');
  check('I8 Ingresa con el correo y la contraseña nuevos', (await here()).startsWith('/pages/paciente/'), await here());

  /* H. Cerrar sesión desde la topbar → login */
  await t(`__t.click('.topbar__profile')`); await sleep(200);
  await t(`__t.click('button, a', 'Cerrar sesión')`);
  // Se espera la redirección y la URL se lee UNA vez (antes se leía dos: condición y mensaje podían diferir).
  let destino = await here();
  for (let i = 0; i < 40 && !destino?.startsWith('/login.html'); i++) await sleep(100), (destino = await here());
  check('H1 Cerrar sesión → login', destino?.startsWith('/login.html'), destino);
} catch (error) {
  check('EXCEPCIÓN', false, error.message);
}

b.finish();
