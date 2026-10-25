// Recorrido de la fase A6: las 26 pantallas con cada rol, guards y redirecciones.
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
  ['ADMINISTRADOR', 'admin@dentalcare.com', 'Admin2026*', 'admin', ['dashboard', 'pacientes', 'historia.html?id=11', 'citas', 'especialistas', 'servicios', 'pagos', 'reportes']],
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

  /* Historia clínica: quién la abre y qué ve cada rol */
  const clinica = () => evaluate(`(() => {
    const t = document.body.innerText;
    return { obs: t.includes('Observaciones'), ant: t.includes('Antecedentes médicos'), dx: t.includes('Diagnóstico'),
      tratamientos: [...document.querySelectorAll('[role="tab"]')].some((x) => x.textContent.includes('Tratamientos realizados')),
      editar: [...document.querySelectorAll('button')].some((x) => /^(Editar|Registrar consulta)$/.test(x.textContent.trim())),
      accionesCitas: document.querySelectorAll('.data-table__actions button').length };
  })()`);

  // Sesión actual: PACIENTE (Andrés Galvis, id 11)
  await go('pages/paciente/mi-historia.html?id=12');
  await sleep(600);
  check('Paciente: historia de OTRO paciente por URL → 403', (await here()).startsWith('/403.html?from='), await here());
  await go('pages/doctor/historia.html?id=12');
  await sleep(600);
  check('Paciente: ficha del odontólogo → 403', (await here()).startsWith('/403.html?from='), await here());
  await go('pages/admin/historia.html?id=12');
  await sleep(600);
  check('Paciente: ficha del administrador → 403', (await here()).startsWith('/403.html?from='), await here());
  await go('pages/paciente/mi-historia.html?id=11');
  await waitReady();
  check('Paciente: su propio id por URL → su historia', (await here()).startsWith('/pages/paciente/mi-historia.html'), await here());
  await evaluate(`[...document.querySelectorAll('[role="tab"]')].find((x) => x.textContent.includes('Tratamientos'))?.click()`);
  await sleep(200);
  let v = await clinica();
  check('Paciente: vista parcial (tratamientos, sin observaciones/antecedentes/diagnóstico)', v.tratamientos && !v.obs && !v.ant && !v.dx, JSON.stringify(v));
  check('Paciente: sin botones de edición ni registro de consultas', !v.editar, JSON.stringify(v));
  await evaluate(`[...document.querySelectorAll('[role="tab"]')].find((x) => x.textContent.includes('Odontograma'))?.click()`);
  await sleep(200);
  check('Paciente: odontograma en solo lectura', await evaluate(`!!document.querySelector('.odontogram') && document.querySelector('.odontogram__hint')?.textContent.includes('Selecciona una pieza para ver sus hallazgos')`));
  await evaluate(`[...document.querySelectorAll('[role="tab"]')].find((x) => x.textContent.includes('Citas'))?.click()`);
  await sleep(200);
  check('Paciente: sus citas sin acciones en la historia', (await clinica()).accionesCitas === 0);

  // Administrador: el nombre del paciente en Pacientes abre SU ficha (carpeta admin), con datos completos
  await evaluate('localStorage.removeItem("dentalcare:session")');
  await login('admin@dentalcare.com', 'Admin2026*');
  await go('pages/admin/pacientes.html');
  await waitReady();
  const enlaceAdmin = await evaluate(`document.querySelector('.data-table a[href*="pages/admin/historia.html?id="]')?.href ?? null`);
  check('Admin: nombre del paciente enlaza a la historia clínica', Boolean(enlaceAdmin), enlaceAdmin ?? 'sin enlace');
  if (enlaceAdmin) {
    await evaluate(`document.querySelector('.data-table a[href*="pages/admin/historia.html?id="]').click()`);
    await waitReady();
    await sleep(300);
    v = await clinica();
    check('Admin: abre la historia con antecedentes, observaciones y edición', (await here()).startsWith('/pages/admin/historia.html?id=') && v.ant && v.obs && v.editar, JSON.stringify(v));
  }
  await go('pages/admin/citas.html');
  await waitReady();
  check('Admin: en Citas el paciente enlaza a la historia', await evaluate(`!!document.querySelector('.data-table a[href*="pages/admin/historia.html?id="]')`));

  // Odontólogo: acceso desde Pacientes y desde la lista de su agenda
  await evaluate('localStorage.removeItem("dentalcare:session")');
  await login('dr.roberto@dentalcare.com', 'DocRoberto2026*');
  await go('pages/doctor/pacientes.html');
  await waitReady();
  check('Odontólogo: en Pacientes el nombre enlaza a la historia', await evaluate(`!!document.querySelector('.data-table a[href*="pages/doctor/historia.html?id="]')`));
  await go('pages/doctor/agenda.html');
  await waitReady();
  await evaluate(`[...document.querySelectorAll('[role="tab"]')].find((x) => x.textContent.includes('Lista'))?.click()`);
  await sleep(300);
  check('Odontólogo: en la agenda (lista) el paciente enlaza a la historia', await evaluate(`!!document.querySelector('.data-table a[href*="pages/doctor/historia.html?id="]') && !!document.querySelector('button[aria-label^="Ver historia clínica"]')`));
  await go('pages/admin/historia.html?id=11');
  await sleep(600);
  check('Odontólogo: ficha de la carpeta admin → 403', (await here()).startsWith('/403.html?from='), await here());

  // Recepción no tiene VER_HISTORIA_CLINICA: su lista de pacientes no enlaza a historias
  await evaluate('localStorage.removeItem("dentalcare:session")');
  await login('recepcion@dentalcare.com', 'Recep2026*');
  await go('pages/asistente/pacientes.html');
  await waitReady();
  check('Recepción: sin enlaces a historias clínicas', await evaluate(`!document.querySelector('a[href*="historia.html"]')`));

  // Mi perfil (perfil.html sirve a todos los roles): el personal no tiene dirección en la BD
  await go('perfil.html');
  await inspect('RECEPCIONISTA perfil', 'perfil');
  check('Perfil del personal: celular y correo editables, sin dirección', await evaluate(`!!document.querySelector('form.perfil-form [name="telefono"]') && !!document.querySelector('form.perfil-form [name="email"]') && !document.querySelector('form.perfil-form [name="direccion"]')`));
  await evaluate('localStorage.removeItem("dentalcare:session")');
  await go('perfil.html');
  await sleep(600);
  check('Perfil sin sesión → login?next=perfil.html', (await here()) === '/login.html?next=perfil.html', await here());
} catch (error) {
  check('EXCEPCIÓN', false, error.stack);
}

b.finish();
