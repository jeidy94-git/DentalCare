// Integración frontend ↔ backend (fase C): las MISMAS páginas, ahora con USE_MOCK = false.
// Comprueba que http.js habla con la API real: login con JWT, listado y registro de pacientes, errores
// por campo (409 de la API junto al input) y sesión rechazada (401 → login).
//
// Requiere, cada uno en su terminal:
//   1. el backend:                      cd backend && npm start          (http://localhost:3000/api)
//   2. el frontend con USE_MOCK = false: node tests/e2e/server.mjs --api  (http://127.0.0.1:5600/)
// Uso: node tests/e2e/backend.test.mjs [ancho=1366]
// La prueba borra al final el paciente que registra (lee backend/.env para conectarse a la MISMA base).
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

const b = await startBrowser(Number(process.argv[2] ?? 1366));
const { send, evaluate, go, waitReady, here, check, ignoreErrors, finish } = b;
// El navegador anota en consola cada respuesta 4xx de fetch: aquí son ESPERADAS (401 y 409 a propósito).
ignoreErrors(/status of 40[19]/);

const PAGE_HELPERS = `
  window.__t = {
    q: (sel) => document.querySelector(sel),
    byText: (sel, text) => [...document.querySelectorAll(sel)].find((el) => el.textContent.trim().includes(text)),
    click(sel, text) { const el = text ? this.byText(sel, text) : this.q(sel); if (!el) throw new Error('No encontré ' + sel + ' ' + (text ?? '')); el.click(); return true; },
    set(sel, value) { const el = this.q(sel); if (!el) throw new Error('No encontré ' + sel); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; },
    submitDialog() { this.q('dialog[open] form').requestSubmit(); return true; },
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
async function fillLogin(email, password) {
  await t(`__t.set('[name="email"]', ${JSON.stringify(email)}) && __t.set('[name="password"]', ${JSON.stringify(password)}) && document.querySelector('form.auth-form').requestSubmit()`);
}

const documento = `98${String(Date.now()).slice(-8)}`;

try {
  /* ---------- 1. El interruptor ---------- */
  await go('login.html');
  await evaluate('localStorage.clear()');
  await go('login.html');
  await waitReady();
  check('config.js llega con USE_MOCK = false', (await evaluate(`import('./js/core/config.js').then((m) => m.USE_MOCK)`)) === false);
  check('Sin cuentas de demostración (solo existen en el mock)', !(await bodyText()).includes('Cuentas de demostración'));

  /* ---------- 2. Login contra la API ---------- */
  await fillLogin('admin@dentalcare.com', 'Mala2026*');
  check('Contraseña mala → el mensaje del 401 de la API sale en el formulario', await waitText('Correo o contraseña incorrectos.'));
  check('… y no se crea sesión', (await session()) === null);

  await go(`login.html?next=${encodeURIComponent('pages/admin/pacientes.html')}`);
  await waitReady();
  await fillLogin('admin@dentalcare.com', 'Admin2026*');
  await waitFor(`location.pathname.endsWith('/pages/admin/pacientes.html')`);
  const s = await session();
  check('Login correcto → vuelve a la página pedida (?next)', (await here()) === '/pages/admin/pacientes.html', await here());
  check('La sesión guarda el JWT de la API (no un token mock.)', s?.token?.split('.').length === 3 && !s.token.startsWith('mock.'));
  check('… y el user que armó el backend', s?.user?.nombre === 'Laura Gómez' && s.user.rol === 'ADMINISTRADOR');

  /* ---------- 3. Listado de pacientes (GET /api/pacientes con Bearer) ---------- */
  await waitReady();
  check('La tabla muestra los 40 pacientes de MySQL', await waitText('de 40 registros'));
  // (performance solo ve las peticiones de ESTA página: el POST /auth/login fue en login.html.)
  const pedidas = await evaluate(`performance.getEntriesByType('resource').map((e) => e.name).filter((n) => n.startsWith('${API}'))`);
  check('La petición fue a la API (localhost:3000), no al mock', pedidas.includes(`${API}/pacientes`), pedidas.join(' '));
  await t(`__t.set('input[type="search"]', 'londono')`);
  await sleep(400);
  check('La búsqueda de la tabla funciona con los datos reales', (await evaluate(`document.querySelectorAll('table tbody tr').length`)) === 1 && (await bodyText()).includes('Londoño'));
  await t(`__t.set('input[type="search"]', '')`);

  /* ---------- 4. Registro (POST /api/pacientes) ---------- */
  await t(`__t.click('button', 'Nuevo paciente')`);
  await sleep(300);
  await t(
    `[['nombres','Ana'],['apellidos','Prueba Backend'],['tipo_documento','CC'],['numero_documento','1036000101'],['fecha_nacimiento','1999-01-01'],['genero','FEMENINO'],['telefono','3001234567']].forEach(([n,v]) => __t.set('dialog[open] [name="'+n+'"]', v)) || true`,
  );
  // Ubicación DIVIPOLA (datos.gov.co o, sin internet, el respaldo local)
  const deptoListo = await waitFor(`!document.querySelector('dialog[open] [name="departamento"]').disabled`, 10000);
  if (deptoListo) {
    await t(`__t.set('dialog[open] [name="departamento"]', 'Antioquia')`);
    await waitFor(`!document.querySelector('dialog[open] [name="municipio"]').disabled`, 10000);
    await t(`__t.set('dialog[open] [name="municipio"]', 'Medellín')`);
  }
  check('Formulario: departamento y municipio cargados (DIVIPOLA)', deptoListo);

  await t('__t.submitDialog()');
  const dupOk = await waitFor(`(document.querySelector('dialog[open] [name="numero_documento"]')?.closest('.field')?.textContent ?? '').includes('Ya existe')`);
  check('Documento repetido → el 409 de la API se muestra JUNTO al campo (fields)', dupOk);

  await t(`__t.set('dialog[open] [name="numero_documento"]', '${documento}') && __t.submitDialog()`);
  check('Documento nuevo → "Paciente registrado"', await waitText('Paciente registrado'));
  check('… el modal se cierra', !(await evaluate(`!!document.querySelector('dialog[open]')`)));

  const [[guardado]] = await pool.query('SELECT p.*, h.id_historia FROM paciente p LEFT JOIN historia_clinica h USING (id_paciente) WHERE numero_documento = ?', [documento]);
  check('En MySQL: el paciente con su ubicación y su historia clínica', guardado?.departamento === 'Antioquia' && guardado.municipio === 'Medellín' && guardado.id_historia > 0, JSON.stringify({ id: guardado?.id_paciente, d: guardado?.departamento, m: guardado?.municipio }));
  await t(`__t.set('input[type="search"]', '${documento}')`);
  await sleep(400);
  check('… y la tabla se recargó desde la API', (await bodyText()).includes('Prueba Backend'));

  /* ---------- 5. Sesión que la API rechaza ---------- */
  await evaluate(`(() => { const s = JSON.parse(localStorage.getItem('dentalcare:session')); s.token = s.token.slice(0, -4) + 'AAAA'; localStorage.setItem('dentalcare:session', JSON.stringify(s)); })()`);
  await go('pages/admin/pacientes.html');
  await waitFor(`location.pathname.endsWith('/login.html')`);
  check('Token alterado → la API responde 401 → http.js cierra la sesión → login', (await here()).startsWith('/login.html') && (await session()) === null, await here());

  /* ---------- 6. Cerrar sesión (POST /api/auth/logout) ---------- */
  // ?next a una página cuyo módulo ya existe en la API (inicio pide citas: llegan en la fase D).
  await go(`login.html?next=${encodeURIComponent('pages/asistente/pacientes.html')}`);
  await waitReady();
  await fillLogin('recepcion@dentalcare.com', 'Recep2026*');
  await waitFor(`!location.pathname.endsWith('/login.html')`);
  await waitReady();
  await t(`__t.click('.topbar__profile')`);
  await sleep(200);
  await t(`__t.click('button, a', 'Cerrar sesión')`);
  await waitFor(`location.pathname.endsWith('/login.html')`);
  const [[logout]] = await pool.query(`SELECT accion FROM log_auditoria WHERE id_usuario = 2 ORDER BY id_log DESC LIMIT 1`);
  check('Cerrar sesión → login y LOGOUT en la auditoría', (await here()).startsWith('/login.html') && logout?.accion === 'LOGOUT', await here());
} catch (error) {
  check('EXCEPCIÓN', false, error.message);
} finally {
  await pool.query('DELETE FROM paciente WHERE numero_documento = ?', [documento]);
  await pool.end();
}

finish();
