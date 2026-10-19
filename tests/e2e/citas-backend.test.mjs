// Integración frontend ↔ backend del módulo de citas (Evidencia 2): las MISMAS pantallas de la fase A6,
// ahora con USE_MOCK = false. Recorre los flujos B, C y D de flujos.test.mjs contra MySQL:
//   B el paciente solicita una cita en el asistente   C la cancela desde "Mis citas"
//   D recepción confirma otra solicitud desde la agenda
// y comprueba en la base cada cambio de estado y su registro en log_auditoria.
//
// Requiere, cada uno en su terminal (los dos con la MISMA base):
//   1. el backend:                      cd backend && npm start          (http://localhost:3000/api)
//   2. el frontend con USE_MOCK = false: node tests/e2e/server.mjs --api  (http://127.0.0.1:5600/)
// Uso: node tests/e2e/citas-backend.test.mjs [ancho=1366]
// Al final borra las citas y la auditoría que creó (lee backend/.env, o DB_PORT=…, para conectarse).
import { startBrowser, sleep } from './harness.mjs';

const API = 'http://localhost:3000/api';
const health = await fetch(`${API}/health`)
  .then((r) => r.json())
  .catch(() => null);
if (health?.status !== 'ok') {
  console.error(`El backend no responde en ${API}/health. Arráncalo con: cd backend && npm start`);
  process.exit(1);
}

const backend = new URL('../../backend/', import.meta.url);
const { pool } = await import(new URL('src/config/db.js', backend).href);
const [[{ maxCita }]] = await pool.query('SELECT IFNULL(MAX(id_cita), 0) AS maxCita FROM cita');
const [[{ maxLog }]] = await pool.query('SELECT IFNULL(MAX(id_log), 0) AS maxLog FROM log_auditoria');
const nuevas = async () => (await pool.query('SELECT * FROM cita WHERE id_cita > ? ORDER BY id_cita', [maxCita]))[0];
const auditoria = async (accion) => (await pool.query('SELECT * FROM log_auditoria WHERE id_log > ? AND accion = ? ORDER BY id_log', [maxLog, accion]))[0];

const b = await startBrowser(Number(process.argv[2] ?? 1366));
const { send, evaluate, go, waitReady, here, check, finish } = b;

const PAGE_HELPERS = `
  window.__t = {
    q: (sel) => document.querySelector(sel),
    byText: (sel, text) => [...document.querySelectorAll(sel)].find((el) => el.textContent.trim().includes(text)),
    click(sel, text) { const el = text ? this.byText(sel, text) : this.q(sel); if (!el) throw new Error('No encontré ' + sel + ' ' + (text ?? '')); el.click(); return true; },
    set(sel, value) { const el = this.q(sel); if (!el) throw new Error('No encontré ' + sel); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; },
    selectWhere(sel, pred) { const el = this.q(sel); const opt = [...el.options].find((o) => o.value && pred(o)); el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); return opt.textContent; },
  };`;
const t = async (code) => {
  await evaluate(PAGE_HELPERS);
  const r = await send('Runtime.evaluate', { expression: code, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
};
const bodyText = () => evaluate('document.body.innerText');
const waitFor = async (expression, timeout = 6000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await evaluate(expression)) return true;
    await sleep(150);
  }
  return false;
};
const waitText = (text, timeout) => waitFor(`document.body.innerText.includes(${JSON.stringify(text)})`, timeout);
const session = async () => JSON.parse((await evaluate('localStorage.getItem("dentalcare:session")')) ?? 'null');

/** Ingresa con el formulario real y espera la página de `next`. */
async function as(email, password, next) {
  // Primero se borra la sesión: con una sesión abierta, login.html redirige al inicio del rol (que pide
  // /ventas/resumen, un módulo que la API todavía no tiene).
  await evaluate('localStorage.removeItem("dentalcare:session")');
  await go(`login.html?next=${encodeURIComponent(next)}`);
  await waitReady();
  await t(`__t.set('[name="email"]', ${JSON.stringify(email)}) && __t.set('[name="password"]', ${JSON.stringify(password)}) && document.querySelector('form.auth-form').requestSubmit()`);
  await waitFor(`location.pathname.endsWith('/${next}')`);
  await waitReady();
}

/** Las peticiones de ESTA página que fueron a la API. */
const pedidasApi = () => evaluate(`performance.getEntriesByType('resource').map((e) => e.name.replace('${API}', '')).filter((n) => n.startsWith('/'))`);

try {
  await go('login.html');
  await evaluate('localStorage.clear()');
  await go('login.html');
  await waitReady();
  check('config.js llega con USE_MOCK = false', (await evaluate(`import('./js/core/config.js').then((m) => m.USE_MOCK)`)) === false);

  /* ---------- B. El paciente solicita una cita en el asistente ---------- */
  await as('andres.galvis@gmail.com', 'AndresG2026*', 'pages/paciente/agendar.html');
  check('B0 El asistente carga con datos de la API (sin error)', await waitFor(`!!document.querySelector('[name="id_servicio"]')`), await here());
  const pedidas = await pedidasApi();
  check('… pidió /especialistas, /servicios y /citas/ocupacion a la API', ['/especialistas?soloActivos=true', '/servicios?soloActivos=true'].every((p) => pedidas.includes(p)) && pedidas.some((p) => p.startsWith('/citas/ocupacion?desde=')), pedidas.join(' '));

  const servicio = await t(`__t.selectWhere('[name="id_servicio"]', () => true)`);
  const odonto = await t(`__t.selectWhere('[name="id_especialista"]', (o) => o.textContent.includes('Roberto'))`);
  await t(`__t.click('button', 'Siguiente')`);
  await sleep(300);
  let slot = null;
  for (let i = 1; i <= 10 && !slot; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await t(`__t.set('[name="fecha"]', '${iso}')`);
    await sleep(150);
    slot = await t(`(() => { const b = document.querySelector('.time-slot:not([aria-disabled])'); if (!b) return null; b.click(); return '${iso} ' + b.querySelector('.time-slot__time').textContent.slice(0, 5); })()`);
  }
  check('B1 Hay franjas libres calculadas con la ocupación de la API (RN-02)', Boolean(slot), `${servicio} · ${odonto} · ${slot}`);
  await t(`__t.click('button', 'Siguiente')`);
  await sleep(300);
  await t(`__t.click('button', 'Agendar cita')`);
  check('B2 "Solicitud enviada"', await waitText('Solicitud enviada'));
  check('B3 El resumen muestra el estado que devolvió la API', await waitText('estado pendiente de confirmación'));

  let filas = await nuevas();
  const solicitada = filas[0];
  check('B4 En MySQL: la cita del paciente #11 con el Dr. Roberto, PENDIENTE_CONFIRMACION', filas.length === 1 && solicitada.id_paciente === 11 && solicitada.id_especialista === 1 && solicitada.estado_cita === 'PENDIENTE_CONFIRMACION' && solicitada.fecha_hora === `${slot}:00`, JSON.stringify(solicitada && { id: solicitada.id_cita, f: solicitada.fecha_hora, e: solicitada.estado_cita }));
  const pacienteSesion = await session();
  check('B5 … y CREAR en log_auditoria a nombre del paciente', (await auditoria('CREAR')).some((l) => l.tabla_afectada === 'cita' && l.id_usuario === pacienteSesion.user.id_usuario));

  // Una segunda solicitud (directo a la API con el token de la sesión) para que recepción la confirme en D.
  const [fecha, hora] = slot.split(' ');
  const otraHora = `${String(Number(hora.slice(0, 2)) + 1).padStart(2, '0')}${hora.slice(2)}`;
  let segunda = await fetch(`${API}/citas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pacienteSesion.token}` },
    body: JSON.stringify({ id_especialista: 1, id_servicio: 1, fecha_hora: `${fecha} ${otraHora}`, motivo: 'Segunda solicitud E2E' }),
  });
  if (segunda.status !== 201) {
    // 1 h después podía caer en el almuerzo o estar ocupada: se prueba el día siguiente hábil a las 08:00.
    const d = new Date(`${fecha}T12:00:00`);
    do d.setDate(d.getDate() + 1);
    while ([0, 6].includes(d.getDay()));
    const f2 = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    segunda = await fetch(`${API}/citas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pacienteSesion.token}` },
      body: JSON.stringify({ id_especialista: 1, id_servicio: 1, fecha_hora: `${f2} 08:00`, motivo: 'Segunda solicitud E2E' }),
    });
  }
  check('B6 Segunda solicitud del paciente (para el paso D) → 201', segunda.status === 201, String(segunda.status));

  /* ---------- C. El paciente cancela desde "Mis citas" ---------- */
  await go('pages/paciente/mis-citas.html');
  await waitReady();
  check('C0 "Mis citas" muestra sus citas de MySQL (la del seed incluida)', await waitText('Valoración General'));
  check('C1 Aviso de solicitudes por confirmar', (await bodyText()).includes('esperando confirmación'));
  const cancelable = await evaluate(`[...document.querySelectorAll('button[aria-label^="Cancelar cita"]')].length`);
  await t(`__t.click('button[aria-label^="Cancelar cita"]')`);
  await sleep(300);
  await t(`__t.click('dialog[open] .dialog__actions button', 'Cancelar cita')`);
  check('C2 "La cita fue cancelada."', await waitText('La cita fue cancelada.'), `${cancelable} cancelables`);
  filas = await nuevas();
  const canceladas = filas.filter((c) => c.estado_cita === 'CANCELADA');
  check('C3 En MySQL: una de sus solicitudes quedó CANCELADA', canceladas.length === 1, filas.map((c) => `#${c.id_cita} ${c.estado_cita}`).join(', '));
  check('C4 … con CITA_CANCELADA en la auditoría a nombre del paciente', (await auditoria('CITA_CANCELADA')).some((l) => l.id_usuario === pacienteSesion.user.id_usuario && l.detalles === `Cita #${canceladas[0]?.id_cita}: PENDIENTE_CONFIRMACION → CANCELADA`));

  /* ---------- D. Recepción confirma la otra solicitud desde la agenda ---------- */
  await as('recepcion@dentalcare.com', 'Recep2026*', 'pages/asistente/agenda.html');
  check('D0 La agenda de recepción carga con datos de la API', await waitFor(`!!document.querySelector('[role="tab"]')`), await here());
  await t(`__t.click('[role="tab"]', 'Lista')`);
  await sleep(200);
  await t(`__t.click('.data-table__chips button', 'Por confirmar')`);
  await sleep(200);
  await t(`__t.click('button[aria-label^="Confirmar"]')`);
  await sleep(300);
  await t(`__t.click('dialog[open] .dialog__actions button', 'Confirmar')`);
  check('D1 "La cita quedó programada."', await waitText('La cita quedó programada.'));
  filas = await nuevas();
  check('D2 En MySQL: la otra solicitud quedó PROGRAMADA', filas.filter((c) => c.estado_cita === 'PROGRAMADA').length === 1 && filas.filter((c) => c.estado_cita === 'PENDIENTE_CONFIRMACION').length === 0, filas.map((c) => `#${c.id_cita} ${c.estado_cita}`).join(', '));
  const recepSesion = await session();
  check('D3 … con CITA_PROGRAMADA a nombre de recepción', (await auditoria('CITA_PROGRAMADA')).some((l) => l.id_usuario === recepSesion.user.id_usuario));
  check('D4 La lista se recargó desde la API (ya no hay solicitudes por confirmar)', await waitFor(`!document.querySelector('button[aria-label^="Confirmar"]')`));
} catch (error) {
  check('EXCEPCIÓN', false, error.message);
} finally {
  await pool.query('DELETE FROM cita WHERE id_cita > ?', [maxCita]);
  await pool.query('DELETE FROM log_auditoria WHERE id_log > ?', [maxLog]);
  await pool.query('ALTER TABLE cita AUTO_INCREMENT = 1');
  await pool.query('ALTER TABLE log_auditoria AUTO_INCREMENT = 1');
  await pool.end();
}

finish();
