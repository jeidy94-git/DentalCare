// APIs externas en el navegador real:
//  A con internet: departamentos y municipios desde datos.gov.co en el registro de pacientes
//  B con internet: tarjeta TRM en pagos y conversor COP → USD
//  C APIs BLOQUEADAS (como si no hubiera internet): respaldo local de municipios y aviso de la TRM;
//    el resto de la página sigue funcionando.
// Requiere el servidor (node tests/e2e/server.mjs) y conexión a internet para A y B.
// Uso: node tests/e2e/apis.test.mjs [ancho=1366]
import { startBrowser, sleep } from './harness.mjs';

const b = await startBrowser(Number(process.argv[2] ?? 1366));
const { send, evaluate, go, waitReady, login, check } = b;

const run = async (code) => {
  const r = await send('Runtime.evaluate', { expression: code, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result?.value;
};
/** Espera hasta que la expresión sea verdadera (las APIs reales pueden tardar). */
const until = async (expr, timeout = 15000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await evaluate(expr)) return true;
    await sleep(200);
  }
  return false;
};
const sel = (name) => `document.querySelector('dialog[open] [name="${name}"]')`;
const choose = (name, text) =>
  run(`(() => { const s = ${sel(name)}; const o = [...s.options].find((o) => o.textContent === ${JSON.stringify(text)}); s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); return o.value; })()`);
const fill = (pairs) =>
  run(`${JSON.stringify(pairs)}.forEach(([n, v]) => { const el = document.querySelector('dialog[open] [name="' + n + '"]'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); })`);
const clickText = (selector, text) => run(`[...document.querySelectorAll('${selector}')].find((el) => el.textContent.includes(${JSON.stringify(text)})).click()`);
const openNewPatient = async () => {
  await go('pages/admin/pacientes.html');
  await waitReady();
  await clickText('button', 'Nuevo paciente');
  await sleep(300);
};
const clearExternalCache = () => evaluate(`Object.keys(localStorage).filter((k) => k.startsWith('dentalcare:ext:')).forEach((k) => localStorage.removeItem(k))`);

try {
  await go('login.html');
  await evaluate('localStorage.clear()');
  await login('admin@dentalcare.com', 'Admin2026*');
  await waitReady();

  /* A. Departamento → municipio con la API real */
  await openNewPatient();
  check('A1 Departamentos cargados desde datos.gov.co (33)', await until(`!${sel('departamento')}.disabled && ${sel('departamento')}.options.length === 34`));
  check('A2 Aviso de la fuente DIVIPOLA', (await evaluate(`${sel('departamento')}.closest('.field').textContent`))?.includes('datos.gov.co'));
  check('A3 Municipio deshabilitado hasta elegir departamento', await evaluate(`${sel('municipio')}.disabled`));
  await choose('departamento', 'Antioquia');
  check('A4 Municipios de Antioquia (125)', await until(`!${sel('municipio')}.disabled && ${sel('municipio')}.options.length === 126`));
  await choose('municipio', 'Medellín');
  await fill([['nombres', 'Lucía'], ['apellidos', 'Ubicación E2E'], ['tipo_documento', 'CC'], ['numero_documento', '1036555444'], ['fecha_nacimiento', '1990-05-05'], ['genero', 'FEMENINO'], ['telefono', '3015551234']]);
  await run(`document.querySelector('dialog[open] form').requestSubmit()`);
  check('A5 Paciente registrado con su municipio', await until(`document.body.innerText.includes('Paciente registrado')`, 5000));
  const ls = await evaluate(`JSON.parse(localStorage.getItem('dentalcare:db')).paciente.find((p) => p.numero_documento === '1036555444')`);
  check('A6 Guardado: departamento y municipio', ls?.departamento === 'Antioquia' && ls?.municipio === 'Medellín', `${ls?.departamento} / ${ls?.municipio}`);
  check('A7 Listas guardadas en caché (dentalcare:ext:…)', await evaluate(`!!localStorage.getItem('dentalcare:ext:divipola:municipios:05')`));

  // Editar: los selects llegan con lo guardado
  await run(`document.querySelector('input[type="search"]').value = '1036555444'; document.querySelector('input[type="search"]').dispatchEvent(new Event('input', { bubbles: true }))`);
  await sleep(600);
  await run(`document.querySelector('[aria-label^="Editar"], button[title^="Editar"]').click()`);
  check('A8 Al editar: departamento y municipio preseleccionados', await until(`${sel('municipio')}?.value === 'Medellín' && ${sel('departamento')}.value === 'Antioquia'`, 8000));
  await choose('departamento', 'Caldas');
  await until(`!${sel('municipio')}.disabled`);
  check('A9 Cambiar de departamento limpia el municipio', await evaluate(`${sel('municipio')}.value === '' && [...${sel('municipio')}.options].some((o) => o.textContent === 'Manizales')`));
  await clickText('dialog[open] button', 'Cancelar');
  await sleep(300);

  /* B. TRM en pagos */
  await go('pages/admin/pagos.html');
  await waitReady();
  check('B1 Tarjeta TRM con la tasa oficial', await until(`document.querySelector('.trm__rate')?.textContent.includes('1 USD')`));
  const meta = await evaluate(`document.querySelector('.trm .trm__meta')?.textContent ?? ''`);
  check('B2 Muestra vigencia y fuente', meta.includes('Vigente desde') && meta.includes('Fuente'), meta);
  check('B3 Saldos convertidos a USD', (await evaluate(`document.querySelector('.trm .data-list')?.textContent ?? ''`)).includes('US$'));
  await run(`const i = document.getElementById('trm-cop'); i.value = '1500000'; i.dispatchEvent(new Event('input', { bubbles: true }))`);
  const usd = await evaluate(`document.querySelector('.trm__result').textContent`);
  check('B4 Conversor: $1.500.000 → USD', /US\$\s?[1-9]\d{2},\d{2}/.test(usd), usd);
  check('B5 La tabla de ventas carga junto a la TRM', await evaluate(`document.querySelectorAll('table tbody tr').length > 0`));

  /* C. APIs bloqueadas: como si no hubiera internet */
  b.ignoreErrors(/ERR_BLOCKED_BY_CLIENT|datos\.gov\.co|er-api\.com|Failed to load resource/);
  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['*datos.gov.co*', '*er-api.com*'] });
  await clearExternalCache();

  await openNewPatient();
  check('C1 Sin internet: departamentos del respaldo local (33)', await until(`!${sel('departamento')}.disabled && ${sel('departamento')}.options.length === 34`, 20000));
  check('C2 Aviso de lista local', (await evaluate(`${sel('departamento')}.closest('.field').textContent`))?.includes('Sin conexión'));
  await choose('departamento', 'Valle del Cauca');
  check('C3 Municipios del respaldo (Santiago de Cali)', await until(`!${sel('municipio')}.disabled && [...${sel('municipio')}.options].some((o) => o.textContent === 'Santiago de Cali')`, 20000));
  await clickText('dialog[open] button', 'Cancelar');

  await go('pages/admin/pagos.html');
  await waitReady();
  check('C4 Sin internet ni caché: aviso de TRM no disponible', await until(`document.querySelector('.trm')?.textContent.includes('No fue posible consultar la TRM')`, 20000));
  check('C5 Los pagos siguen funcionando sin la API', await evaluate(`document.querySelectorAll('table tbody tr').length > 0 && !!document.querySelector('.trm button')`));
  check('C6 No se inventa una tasa', !(await evaluate(`!!document.querySelector('.trm__rate')`)));

  await send('Network.setBlockedURLs', { urls: [] });
  await run(`document.querySelector('.trm button').click()`);
  check('C7 "Reintentar" con internet de nuevo → TRM', await until(`!!document.querySelector('.trm__rate')`));
} catch (error) {
  check('Excepción no controlada', false, error.message);
}

b.finish();
