// Pruebas de storage.js, session.js y guard.js (fase A5).
// Ejecutar desde la raíz del proyecto: node tests/guard.test.mjs
const FE = new URL('../frontend/js/', import.meta.url);
const imp = (p) => import(new URL(p, FE).href);

// Node no tiene `window`: un EventTarget basta para los eventos de sesión y `storage`.
globalThis.window = new EventTarget();

const { storage } = await imp('core/storage.js');
const { setSession, getSession, clearSession } = await imp('core/session.js');
const { guard, safeNext, loginUrl, redirectIfAuthenticated, homeFor } = await imp('core/guard.js');
const { appUrl } = await imp('core/navigation.js');

const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra !== '' ? '  · ' + extra : ''}`);

const ROOT = appUrl('');
const here = 'pages/admin/citas.html?id=3';
globalThis.location = { href: ROOT + here };
const user = (rol, extra = {}) => ({ id_usuario: 1, rol, nombre: 'Prueba', email: 'p@x.com', ...extra });
let visited = [];
const navigate = (url) => visited.push(url);
const reset = () => {
  visited = [];
  storage.remove('session');
};

/* ---------- storage.js ---------- */
check('storage: sin localStorage → Map en memoria', storage.persistent === false);
storage.set('x', { a: 1 });
check('storage: guarda y lee JSON', storage.get('x').a === 1);
check('storage: clave inexistente → fallback', storage.get('nada', 'def') === 'def');

const fakeLs = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};
globalThis.localStorage = fakeLs();
const { storage: s2 } = await imp('core/storage.js?con-localstorage');
s2.set('db', { v: 1 });
check('storage: con localStorage → persistente y con prefijo', s2.persistent && globalThis.localStorage.m.has('dentalcare:db'));
globalThis.localStorage.setItem('dentalcare:roto', '{no es json');
check('storage: JSON corrupto → fallback (no rompe la app)', s2.get('roto', 'ok') === 'ok');
globalThis.localStorage = { getItem() {}, setItem() { throw new Error('SecurityError'); }, removeItem() {} };
const { storage: s3 } = await imp('core/storage.js?bloqueado');
check('storage: localStorage bloqueado (modo privado) → memoria', s3.persistent === false);
delete globalThis.localStorage;

/* ---------- session.js ---------- */
reset();
const t0 = Date.now();
setSession({ token: 't', user: user('ADMINISTRADOR'), ttl: 1000 }, t0);
check('session: vigente antes de expirar', getSession(t0 + 999)?.user.rol === 'ADMINISTRADOR');
check('session: vencida → null y se borra', getSession(t0 + 1000) === null && storage.get('session') === null);
storage.set('session', { token: 't', user: user('HACKER'), expiresAt: t0 + 1e9 });
check('session: rol inventado en localStorage → descartada', getSession() === null);
storage.set('session', { token: 't', user: { ...user('ADMINISTRADOR'), id_usuario: '1' }, expiresAt: t0 + 1e9 });
check('session: forma inválida (id texto) → descartada', getSession() === null);
let threw = false;
try {
  setSession({ token: 't', user: user('NADIE') });
} catch {
  threw = true;
}
check('session: setSession rechaza sesiones inválidas', threw);

/* ---------- guard.js ---------- */
reset();
check('guard: sin sesión → null', guard('ADMINISTRADOR', { navigate, watch: false }) === null);
check('guard: sin sesión → login con next', visited[0] === appUrl(`login.html?next=${encodeURIComponent(here)}`), visited[0]?.slice(ROOT.length));

reset();
setSession({ token: 't', user: user('ESPECIALISTA') });
check('guard: rol sin permiso → 403 con from', guard('ADMINISTRADOR', { navigate, watch: false }) === null && visited[0] === appUrl(`403.html?from=${encodeURIComponent(here)}`));

visited = [];
check('guard: rol permitido (lista de roles) → usuario', guard(['ADMINISTRADOR', 'ESPECIALISTA'], { navigate, watch: false })?.rol === 'ESPECIALISTA' && visited.length === 0);
check('guard: null = cualquier usuario con sesión', guard(null, { navigate, watch: false })?.rol === 'ESPECIALISTA');

// Vigilancia de la sesión mientras la página está abierta
reset();
setSession({ token: 't', user: user('ADMINISTRADOR') });
guard('ADMINISTRADOR', { navigate });
clearSession('logout');
check('guard: logout → login sin next', visited.at(-1) === loginUrl());

reset();
setSession({ token: 't', user: user('ADMINISTRADOR') });
guard('ADMINISTRADOR', { navigate });
clearSession('expired');
check('guard: sesión vencida (401) → login?expired=1&next', visited.at(-1) === loginUrl({ next: here, expired: true }));

reset();
setSession({ token: 't', user: user('ADMINISTRADOR') });
guard('ADMINISTRADOR', { navigate });
visited = [];
setSession({ token: 't2', user: user('PACIENTE', { id_paciente: 11 }) });
check('guard: otra sesión con otro rol → 403', visited.some((u) => u.includes('403.html')));

/* ---------- safeNext: redirección abierta ---------- */
const home = homeFor('ADMINISTRADOR');
const cases = [
  ['https://sitio-falso.com/login.html', home, 'otro dominio'],
  ['//sitio-falso.com/x.html', home, 'protocol-relative'],
  ['javascript:alert(1)', home, 'javascript:'],
  ['../../../Windows/x.html', home, 'fuera de la app'],
  ['login.html', home, 'login (bucle)'],
  ['403.html', home, '403'],
  ['pages/doctor/agenda.html', home, 'carpeta de otro rol'],
  ['pages/admin/citas.html?id=3', appUrl('pages/admin/citas.html?id=3'), 'página propia'],
  ['', home, 'vacío'],
];
for (const [next, expected, label] of cases) check(`safeNext: ${label}`, safeNext(next, 'ADMINISTRADOR') === expected, safeNext(next, 'ADMINISTRADOR').slice(ROOT.length));

reset();
check('redirectIfAuthenticated: sin sesión → muestra el login', redirectIfAuthenticated({ navigate }) === false && visited.length === 0);
setSession({ token: 't', user: user('PACIENTE', { id_paciente: 11 }) });
check('redirectIfAuthenticated: con sesión → inicio del rol', redirectIfAuthenticated({ next: 'https://evil.com', navigate }) && visited.at(-1) === homeFor('PACIENTE'));

console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\nTOTAL ${results.length} · FAILS ${fails}`);
process.exitCode = fails ? 1 : 0;
