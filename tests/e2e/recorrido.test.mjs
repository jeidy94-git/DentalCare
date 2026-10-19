// Recorrido de la fase A6: las 25 pantallas con cada rol, guards y redirecciones.
// Requiere el servidor: node tests/e2e/server.mjs
// Uso: node tests/e2e/recorrido.test.mjs [ancho=1366]   (SHOTS_DIR=carpeta para guardar capturas)
import path from 'node:path';
import { startBrowser, sleep } from './harness.mjs';

const width = Number(process.argv[2] ?? 1366);
const shots = process.env.SHOTS_DIR;
const b = await startBrowser(width);
const { evaluate, go, waitReady, login, here, check } = b;

async function inspect(label, file) {
  const ready = await waitReady();
  await sleep(250);
  const info = await evaluate(`(() => ({
    h1: [...document.querySelectorAll('h1')].filter((x) => !x.hidden && x.offsetParent !== null).map((x) => x.textContent.trim()),
    title: document.title,
    pageError: document.querySelector('.page-error')?.textContent ?? null,
    overflow: document.documentElement.scrollWidth - innerWidth,
  }))()`);
  check(`${label}: carga con un solo <h1>`, ready && info.h1.length === 1 && !info.pageError, ready ? `"${info.h1.join(' | ')}" · ${info.title}` : 'no terminó de cargar');
  if (info.pageError) check(`${label}: sin error de carga`, false, info.pageError);
  check(`${label}: sin desborde horizontal`, info.overflow <= 0, `${info.overflow}px`);
  if (shots && file) await b.screenshot(path.join(shots, `${file}-${width}.png`));
}

const ROLES = [
  ['ADMINISTRADOR', 'admin@dentalcare.com', 'Admin2026*', 'admin', ['dashboard', 'pacientes', 'citas', 'especialistas', 'servicios', 'pagos', 'reportes']],
  ['RECEPCIONISTA', 'recepcion@dentalcare.com', 'Recep2026*', 'asistente', ['inicio', 'agenda', 'pacientes', 'pagos', 'novedades']],
  ['ESPECIALISTA', 'dr.roberto@dentalcare.com', 'DocRoberto2026*', 'doctor', ['dashboard', 'agenda', 'pacientes', 'historia.html?id=11', 'novedades']],
  ['PACIENTE', 'andres.galvis@gmail.com', 'AndresG2026*', 'paciente', ['inicio', 'agendar', 'mis-citas', 'mi-historia', 'mis-pagos']],
];

try {
  await go('index.html');
  await evaluate('localStorage.clear()');
  await go('index.html');
  await sleep(300);
  check('index sin sesión → login', (await here()).startsWith('/login.html'), await here());
  await inspect('login', 'login');

  await go('pages/admin/pacientes.html');
  await sleep(500);
  check('Página protegida sin sesión → login?next', (await here()) === '/login.html?next=pages%2Fadmin%2Fpacientes.html', await here());

  await login('admin@dentalcare.com', 'mala');
  await sleep(600);
  const msg = await evaluate(`document.querySelector('[name="password"]').closest('.field')?.textContent ?? ''`);
  check('Login inválido → mensaje genérico junto a la contraseña (RF-ACC-02)', msg.includes('Correo o contraseña incorrectos'));

  for (const [rol, email, pwd, folder, pages] of ROLES) {
    await evaluate('localStorage.removeItem("dentalcare:session")');
    await login(email, pwd);
    await waitReady();
    check(`${rol}: login → inicio del rol`, (await here()).startsWith(`/pages/${folder}/`), await here());
    for (const p of pages) {
      await go(`pages/${folder}/${p.includes('.html') ? p : `${p}.html`}`);
      await inspect(`${rol} ${p}`, `${folder}-${p.split('.')[0]}`);
    }
  }

  // Sesión actual: PACIENTE
  await go('pages/admin/reportes.html');
  await sleep(600);
  check('Paciente en página de admin → 403', (await here()).startsWith('/403.html?from='), await here());
  await inspect('403', '403');

  await go('index.html');
  await sleep(500);
  check('index con sesión → inicio del rol', (await here()) === '/pages/paciente/inicio.html', await here());

  await go('login.html');
  await sleep(500);
  check('login con sesión → inicio del rol', (await here()) === '/pages/paciente/inicio.html', await here());
} catch (error) {
  check('EXCEPCIÓN', false, error.stack);
}

b.finish();
