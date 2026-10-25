// Pruebas de la API REST (fase C): /api/health, /api/auth y /api/pacientes contra una base REAL.
//
// Requisitos: dependencias instaladas (cd backend && npm install), backend/.env con JWT_SECRET y la base
// dentalcare_bd_v2.sql importada. Ejecutar desde la raíz del proyecto:
//   node tests/backend/api.test.mjs                 (usa la base de backend/.env)
//   DB_PORT=3307 node tests/backend/api.test.mjs    (otra base; las variables del sistema ganan al .env)
//
// La prueba deja la base como la encontró: borra los pacientes y registros de auditoría que crea y
// restaura los estados que cambia. Aun así, lo ideal es correrla sobre una base de pruebas.
import { spawn } from 'node:child_process';
import net from 'node:net';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { deepStrictEqual } from 'node:assert';

const backend = new URL('../../backend/', import.meta.url);
const require = createRequire(new URL('package.json', backend)); // jsonwebtoken está en backend/node_modules
const jwt = require('jsonwebtoken');

const { default: app } = await import(new URL('src/app.js', backend).href);
const { pool } = await import(new URL('src/config/db.js', backend).href);
const { env } = await import(new URL('src/config/env.js', backend).href);

const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra !== '' ? '  · ' + extra : ''}`);
const same = (a, b) => {
  try {
    deepStrictEqual(a, b);
    return true;
  } catch {
    return false;
  }
};

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const BASE = `http://127.0.0.1:${server.address().port}/api`;

/** Petición a la API → { status, body, headers, ms } */
async function api(method, path, { token, body, raw, headers = {} } = {}) {
  const t0 = performance.now();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers, ms: performance.now() - t0 };
}

const CUENTAS = {
  ADMINISTRADOR: ['admin@dentalcare.com', 'Admin2026*'],
  RECEPCIONISTA: ['recepcion@dentalcare.com', 'Recep2026*'],
  ESPECIALISTA: ['dr.roberto@dentalcare.com', 'DocRoberto2026*'],
  PACIENTE: ['andres.galvis@gmail.com', 'AndresG2026*'],
};
const loginAs = async (rol) => (await api('POST', '/auth/login', { body: { email: CUENTAS[rol][0], password: CUENTAS[rol][1] } })).body;
const isErrorShape = (body) => same(Object.keys(body ?? {}).sort(), ['code', 'fields', 'message', 'status']);

// Documentos al azar para no chocar con datos existentes; se borran al final.
const doc = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
const docs = [doc(), doc(), doc()];
const nuevo = (extra = {}) => ({ tipo_documento: 'CC', numero_documento: docs[0], nombres: 'Ana', apellidos: 'Prueba API', fecha_nacimiento: '1999-01-01', genero: 'FEMENINO', telefono: '3001234567', ...extra });

const [[{ maxLog }]] = await pool.query('SELECT IFNULL(MAX(id_log), 0) AS maxLog FROM log_auditoria');
const ultimoLog = async () => (await pool.query('SELECT * FROM log_auditoria WHERE id_log > ? ORDER BY id_log DESC LIMIT 1', [maxLog]))[0][0];

try {
  /* ---------- Infraestructura ---------- */
  let r = await api('GET', '/health');
  check('GET /health → 200 y la base responde', r.status === 200 && r.body.db === 'ok', r.body.version);

  r = await api('GET', '/no-existe');
  check('Ruta inexistente → 404 con { status, message, fields, code }', r.status === 404 && isErrorShape(r.body) && r.body.code === 'ROUTE_NOT_FOUND' && r.body.status === 404);

  r = await api('POST', '/auth/login', { raw: '{"email": ' });
  check('JSON mal formado → 400 BAD_JSON (no 500)', r.status === 400 && r.body.code === 'BAD_JSON');

  check('No se anuncia Express (x-powered-by)', r.headers.get('x-powered-by') === null);

  const permitido = env.corsOrigins[0];
  r = await fetch(`${BASE}/pacientes`, { method: 'OPTIONS', headers: { Origin: permitido, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' } });
  check('CORS: el origen del frontend puede enviar Authorization', r.headers.get('access-control-allow-origin') === permitido && /authorization/i.test(r.headers.get('access-control-allow-headers') ?? ''), permitido);
  r = await fetch(`${BASE}/health`, { headers: { Origin: 'https://sitio-malicioso.example' } });
  check('CORS: un origen desconocido no recibe permiso', r.headers.get('access-control-allow-origin') === null);

  /* ---------- POST /auth/login ---------- */
  r = await api('POST', '/auth/login', { body: {} });
  check('Login sin datos → 400 con error por campo', r.status === 400 && r.body.code === 'VALIDATION' && r.body.fields.email && r.body.fields.password);

  r = await api('POST', '/auth/login', { body: { email: 'admin@dentalcare.com', password: { $ne: '' } } });
  check('Login con contraseña que no es texto → 400', r.status === 400 && r.body.fields.password === 'El valor debe ser texto.');

  const mala = await api('POST', '/auth/login', { body: { email: 'admin@dentalcare.com', password: 'Mala2026*' } });
  check('Contraseña incorrecta → 401 INVALID_CREDENTIALS', mala.status === 401 && mala.body.code === 'INVALID_CREDENTIALS' && mala.body.message === 'Correo o contraseña incorrectos.');
  let log = await ultimoLog();
  check('… queda LOGIN_FALLIDO en log_auditoria con el usuario atacado', log?.accion === 'LOGIN_FALLIDO' && log.id_usuario === 1);

  const inexistente = await api('POST', '/auth/login', { body: { email: 'nadie@dentalcare.com', password: 'Mala2026*' } });
  check('Correo inexistente → MISMO 401 y mismo mensaje', inexistente.status === 401 && same(inexistente.body, mala.body));
  log = await ultimoLog();
  check('… también se audita (id_usuario NULL)', log?.accion === 'LOGIN_FALLIDO' && log.id_usuario === null && log.detalles.includes('nadie@dentalcare.com'));

  // Tiempo constante: si el correo no existe, igual se ejecuta bcrypt.compare (hash de relleno).
  const tiempos = { existe: [], noExiste: [] };
  for (let i = 0; i < 3; i++) {
    tiempos.existe.push((await api('POST', '/auth/login', { body: { email: 'admin@dentalcare.com', password: 'x' } })).ms);
    tiempos.noExiste.push((await api('POST', '/auth/login', { body: { email: `nadie${i}@x.com`, password: 'x' } })).ms);
  }
  const mediana = (xs) => [...xs].sort((a, b) => a - b)[1];
  const ratio = mediana(tiempos.noExiste) / mediana(tiempos.existe);
  check('Tiempo constante: correo inexistente tarda lo mismo (anti-enumeración)', ratio > 0.6 && ratio < 1.6, `${Math.round(mediana(tiempos.existe))} ms vs ${Math.round(mediana(tiempos.noExiste))} ms`);

  r = await api('POST', '/auth/login', { body: { email: "admin@dentalcare.com' OR '1'='1", password: "' OR '1'='1" } });
  check("Inyección SQL en el login (' OR '1'='1) → 400/401, nunca 200", r.status === 400 || r.status === 401, String(r.status));

  r = await api('POST', '/auth/login', { body: { email: '  ADMIN@DentalCare.com ', password: 'Admin2026*' } });
  const admin = r.body;
  check('Login admin (correo sin distinguir mayúsculas ni espacios) → 200', r.status === 200 && typeof admin.token === 'string' && admin.user.nombre === 'Laura Gómez');
  log = await ultimoLog();
  check('… queda LOGIN en log_auditoria', log?.accion === 'LOGIN' && log.id_usuario === 1);

  const payload = jwt.decode(admin.token, { complete: true });
  check('JWT: HS256, sub = id_usuario, rol, vence en 8 h', payload.header.alg === 'HS256' && payload.payload.sub === '1' && payload.payload.rol === 'ADMINISTRADOR' && payload.payload.exp - payload.payload.iat === 8 * 3600);
  check('JWT: no lleva datos sensibles', !/password|hash/i.test(JSON.stringify(payload.payload)));
  check('La respuesta nunca incluye password_hash', !JSON.stringify(admin).includes('$2'));

  // Contrato: el `user` de la API es IDÉNTICO al que arma el mock del frontend para cada rol.
  const fe = new URL('../../frontend/js/', import.meta.url);
  const { authService } = await import(new URL('services/auth.service.js', fe).href);
  const { setMockLatency } = await import(new URL('services/mock/db.js', fe).href);
  setMockLatency(0);
  const sesiones = {};
  for (const rol of Object.keys(CUENTAS)) {
    sesiones[rol] = await loginAs(rol);
    const delMock = await authService.login(...CUENTAS[rol]);
    check(`Contrato: user de ${rol} igual al del mock`, same(sesiones[rol].user, delMock), JSON.stringify(sesiones[rol].user));
  }
  check('… el especialista trae id_especialista y el paciente id_paciente', sesiones.ESPECIALISTA.user.id_especialista === 1 && sesiones.PACIENTE.user.id_paciente === 11);

  /* ---------- GET /auth/me ---------- */
  r = await api('GET', '/auth/me');
  check('/me sin token → 401 UNAUTHORIZED', r.status === 401 && r.body.code === 'UNAUTHORIZED');
  r = await api('GET', '/auth/me', { headers: { Authorization: admin.token } });
  check('/me sin la palabra Bearer → 401', r.status === 401);
  r = await api('GET', '/auth/me', { token: 'abc.def.ghi' });
  check('/me con token basura → 401 INVALID_TOKEN', r.status === 401 && r.body.code === 'INVALID_TOKEN');
  r = await api('GET', '/auth/me', { token: jwt.sign({ rol: 'ADMINISTRADOR' }, 'otro-secreto-de-al-menos-32-caracteres!!', { subject: '1' }) });
  check('/me firmado con otro secreto → 401', r.status === 401 && r.body.code === 'INVALID_TOKEN');
  const [h, , s] = admin.token.split('.');
  const alterado = Buffer.from(JSON.stringify({ ...payload.payload, sub: '2', rol: 'ADMINISTRADOR' })).toString('base64url');
  r = await api('GET', '/auth/me', { token: `${h}.${alterado}.${s}` });
  check('/me con el contenido alterado (otro sub) → 401', r.status === 401);
  const sinFirma = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"sub":"1","rol":"ADMINISTRADOR"}').toString('base64url')}.`;
  r = await api('GET', '/auth/me', { token: sinFirma });
  check('/me con alg "none" (sin firma) → 401', r.status === 401);
  r = await api('GET', '/auth/me', { token: jwt.sign({ rol: 'ADMINISTRADOR', exp: Math.floor(Date.now() / 1000) - 60 }, env.jwt.secret, { subject: '1' }) });
  check('/me con token vencido → 401 TOKEN_EXPIRED', r.status === 401 && r.body.code === 'TOKEN_EXPIRED');
  r = await api('GET', '/auth/me', { token: jwt.sign({ rol: 'ADMINISTRADOR' }, env.jwt.secret, { subject: '99999' }) });
  check('/me de un usuario que ya no existe → 401', r.status === 401);
  r = await api('GET', '/auth/me', { token: admin.token });
  check('/me válido → 200 con el mismo user del login', r.status === 200 && same(r.body, admin.user));

  /* ---------- Cuenta o rol inactivos ---------- */
  const recep = sesiones.RECEPCIONISTA;
  try {
    await pool.query("UPDATE usuario SET estado = 'INACTIVO' WHERE id_usuario = ?", [recep.user.id_usuario]);
    r = await api('GET', '/auth/me', { token: recep.token });
    check('Cuenta inactivada: su token deja de servir al instante (401 INACTIVE)', r.status === 401 && r.body.code === 'INACTIVE');
    r = await api('POST', '/auth/login', { body: { email: CUENTAS.RECEPCIONISTA[0], password: CUENTAS.RECEPCIONISTA[1] } });
    check('Cuenta inactiva + contraseña correcta → 403 INACTIVE', r.status === 403 && r.body.code === 'INACTIVE');
    r = await api('POST', '/auth/login', { body: { email: CUENTAS.RECEPCIONISTA[0], password: 'Mala2026*' } });
    check('Cuenta inactiva + contraseña mala → 401 genérico (no revela el estado)', r.status === 401 && r.body.code === 'INVALID_CREDENTIALS');
  } finally {
    await pool.query("UPDATE usuario SET estado = 'ACTIVO' WHERE id_usuario = ?", [recep.user.id_usuario]);
  }
  try {
    await pool.query("UPDATE rol SET estado = 'INACTIVO' WHERE nombre_rol = 'PACIENTE'");
    r = await api('GET', '/auth/me', { token: sesiones.PACIENTE.token });
    check('Rol inactivado: los tokens de ese rol dejan de servir (401)', r.status === 401 && r.body.code === 'INACTIVE');
  } finally {
    await pool.query("UPDATE rol SET estado = 'ACTIVO' WHERE nombre_rol = 'PACIENTE'");
  }
  r = await api('GET', '/auth/me', { token: recep.token });
  check('… al reactivarla, el mismo token vuelve a servir', r.status === 200);

  /* ---------- GET /pacientes ---------- */
  r = await api('GET', '/pacientes');
  check('GET /pacientes sin token → 401', r.status === 401);

  r = await api('GET', '/pacientes', { token: admin.token });
  const todos = r.body;
  check('Admin: los 40 pacientes del seed', r.status === 200 && todos.length === 40);
  check('… con las columnas del mock + departamento y municipio', same(Object.keys(todos[0]), ['id_paciente', 'id_usuario', 'tipo_documento', 'numero_documento', 'nombres', 'apellidos', 'fecha_nacimiento', 'genero', 'telefono', 'email', 'departamento', 'municipio', 'direccion', 'eps_aseguradora', 'fecha_registro']));
  check('… fechas como texto (sin corrimiento de zona horaria)', todos.find((p) => p.id_paciente === 11).fecha_nacimiento === '1990-02-14' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(todos[0].fecha_registro));
  const { pacientesService } = await import(new URL('services/pacientes.service.js', fe).href);
  await authService.login(...CUENTAS.ADMINISTRADOR);
  const delMock = await pacientesService.list();
  check('Contrato: mismo orden (apellidos, nombres) que el mock', same(todos.map((p) => p.id_paciente), delMock.map((p) => p.id_paciente)));

  r = await api('GET', '/pacientes?q=londono', { token: admin.token });
  check('Búsqueda sin tildes ni mayúsculas: "londono" → Londoño', r.body.length === 1 && r.body[0].apellidos === 'Londoño');
  r = await api('GET', '/pacientes?q=1036000105', { token: admin.token });
  check('Búsqueda por documento', r.body.length === 1 && r.body[0].numero_documento === '1036000105');
  r = await api('GET', '/pacientes?q=%25', { token: admin.token });
  check('"%" se busca como texto (no es comodín)', r.status === 200 && r.body.length === 0);
  r = await api('GET', `/pacientes?q=${encodeURIComponent("' OR 1=1 -- ")}`, { token: admin.token });
  check('Inyección SQL en la búsqueda → 200 sin resultados', r.status === 200 && r.body.length === 0);
  r = await api('GET', '/pacientes?q=a&q=b', { token: admin.token });
  check('?q repetido se ignora (no rompe el servidor)', r.status === 200 && r.body.length === 40);

  for (const rol of ['RECEPCIONISTA', 'ESPECIALISTA']) {
    r = await api('GET', '/pacientes', { token: sesiones[rol].token });
    check(`${rol}: ve los 40 pacientes`, r.status === 200 && r.body.length === 40);
  }
  r = await api('GET', '/pacientes', { token: sesiones.PACIENTE.token });
  check('PACIENTE: solo se ve a sí mismo', r.status === 200 && r.body.length === 1 && r.body[0].id_paciente === 11);
  r = await api('GET', '/pacientes?q=londono', { token: sesiones.PACIENTE.token });
  check('PACIENTE: buscar a otro no lo muestra', r.status === 200 && r.body.length === 0);

  /* ---------- POST /pacientes ---------- */
  r = await api('POST', '/pacientes', { body: nuevo() });
  check('POST sin token → 401', r.status === 401);
  for (const rol of ['PACIENTE', 'ESPECIALISTA']) {
    r = await api('POST', '/pacientes', { token: sesiones[rol].token, body: nuevo() });
    check(`${rol} no puede registrar pacientes → 403`, r.status === 403 && r.body.code === 'FORBIDDEN');
  }

  r = await api('POST', '/pacientes', { token: recep.token, body: { nombres: 'Ana' } });
  check('Datos vacíos → 400 con TODOS los campos obligatorios', r.status === 400 && same(Object.keys(r.body.fields).sort(), ['apellidos', 'fecha_nacimiento', 'genero', 'numero_documento', 'telefono', 'tipo_documento']));

  r = await api('POST', '/pacientes', {
    token: recep.token,
    body: nuevo({ tipo_documento: 'RC', numero_documento: '12AB', telefono: '6041234567', genero: 'X', fecha_nacimiento: '2999-01-01', email: 'no-es-correo', nombres: 'A'.repeat(101) }),
  });
  const f = r.body.fields ?? {};
  check(
    'Formatos inválidos → un error por campo',
    r.status === 400 && f.tipo_documento && f.numero_documento && f.telefono && f.genero && f.fecha_nacimiento === 'La fecha de nacimiento no puede ser futura.' && f.email && f.nombres === 'Máximo 100 caracteres.',
    Object.keys(f).join(','),
  );
  r = await api('POST', '/pacientes', { token: recep.token, body: nuevo({ fecha_nacimiento: '2001-02-30' }) });
  check('Fecha que no existe (30 de febrero) → 400', r.status === 400 && r.body.fields.fecha_nacimiento === 'Ingresa una fecha válida.');
  r = await api('POST', '/pacientes', { token: recep.token, body: nuevo({ numero_documento: 1036999999 }) });
  check('Documento enviado como número (no texto) → 400', r.status === 400 && r.body.fields.numero_documento === 'El valor debe ser texto.');

  // DIVIPOLA
  r = await api('POST', '/pacientes', { token: recep.token, body: nuevo({ departamento: 'Narnia' }) });
  check('DIVIPOLA: departamento inventado → 400', r.status === 400 && r.body.fields.departamento === 'Elige un departamento de la lista.');
  r = await api('POST', '/pacientes', { token: recep.token, body: nuevo({ municipio: 'Medellín' }) });
  check('DIVIPOLA: municipio sin departamento → 400', r.status === 400 && r.body.fields.municipio === 'Elige primero el departamento.');
  r = await api('POST', '/pacientes', { token: recep.token, body: nuevo({ departamento: 'Antioquia', municipio: 'Cali' }) });
  check('DIVIPOLA: municipio de otro departamento (Cali en Antioquia) → 400', r.status === 400 && r.body.fields.municipio === 'El municipio no pertenece al departamento elegido.');
  r = await api('POST', '/pacientes', { token: recep.token, body: nuevo({ telefono: '1', departamento: 'Narnia' }) });
  check('DIVIPOLA: sus errores salen junto con los demás', r.status === 400 && r.body.fields.telefono && r.body.fields.departamento);

  r = await api('POST', '/pacientes', {
    token: recep.token,
    body: nuevo({ departamento: 'Antioquia', municipio: 'Medellín', email: 'Ana.Prueba@Ejemplo.com', direccion: '  Calle 1  ', eps_aseguradora: '', id_paciente: 1, id_usuario: 1, fecha_registro: '2000-01-01 00:00:00' }),
  });
  const creado = r.body;
  check('Registro válido → 201 con Location', r.status === 201 && r.headers.get('location') === `/api/pacientes/${creado.id_paciente}`);
  check('… guarda la ubicación DIVIPOLA (nombre propio, como lo envía el formulario)', creado.departamento === 'Antioquia' && creado.municipio === 'Medellín');
  check('… recorta espacios, vacío → NULL, correo en minúsculas', creado.direccion === 'Calle 1' && creado.eps_aseguradora === null && creado.email === 'ana.prueba@ejemplo.com');
  check('… ignora id_paciente, id_usuario y fecha_registro del cliente (asignación masiva)', creado.id_paciente > 50 && creado.id_usuario === null && creado.fecha_registro !== '2000-01-01 00:00:00');
  const [[historia]] = await pool.query('SELECT * FROM historia_clinica WHERE id_paciente = ?', [creado.id_paciente]);
  check('… abre su historia clínica en la misma transacción', historia?.observaciones === 'Historia clínica aperturada en sistema');
  log = await ultimoLog();
  check('… queda CREAR en log_auditoria a nombre de la recepcionista', log?.accion === 'CREAR' && log.tabla_afectada === 'paciente' && log.id_usuario === recep.user.id_usuario);
  r = await api('GET', `/pacientes?q=${docs[0]}`, { token: admin.token });
  check('… y aparece en el listado', r.body.length === 1 && r.body[0].id_paciente === creado.id_paciente);

  r = await api('POST', '/pacientes', { token: admin.token, body: nuevo() });
  check('Documento repetido → 409 DUPLICATE en numero_documento', r.status === 409 && r.body.code === 'DUPLICATE' && r.body.fields.numero_documento);
  r = await api('POST', '/pacientes', { token: admin.token, body: nuevo({ numero_documento: docs[1], email: 'ANA.PRUEBA@ejemplo.com' }) });
  check('Correo repetido (otras mayúsculas) → 409 en email', r.status === 409 && r.body.fields.email && !r.body.fields.numero_documento);

  // Carrera: dos peticiones simultáneas con el mismo documento. La llave UNIQUE deja pasar solo una.
  const [a, b] = await Promise.all([1, 2].map(() => api('POST', '/pacientes', { token: admin.token, body: nuevo({ numero_documento: docs[2] }) })));
  check('Dos registros simultáneos del mismo documento → uno 201 y otro 409', same([a.status, b.status].sort(), [201, 409]), `${a.status}/${b.status}`);
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM paciente WHERE numero_documento = ?', [docs[2]]);
  check('… y en la base quedó UNO solo', n === 1);

  /* ---------- Datos duplicados entre frontend y backend ---------- */
  const fronDivipola = await import(new URL('data/divipola.js', fe).href);
  const backDivipola = await import(new URL('src/data/divipola.js', backend).href);
  check('La DIVIPOLA del backend es la misma del frontend', same(fronDivipola.DEPARTAMENTOS, backDivipola.DEPARTAMENTOS) && same(fronDivipola.MUNICIPIOS, backDivipola.MUNICIPIOS));
  const { PERMISOS_POR_ROL } = await import(new URL('core/permissions.js', fe).href);
  const [matriz] = await pool.query('SELECT r.nombre_rol, GROUP_CONCAT(p.nombre_permiso ORDER BY p.nombre_permiso) AS permisos FROM rol_permiso rp JOIN rol r USING (id_rol) JOIN permiso p USING (id_permiso) GROUP BY r.nombre_rol');
  check('La matriz rol_permiso de la base es la de permissions.js', matriz.length === 4 && matriz.every((m) => same(m.permisos.split(',').sort(), [...PERMISOS_POR_ROL[m.nombre_rol]].sort())));

  const { VENTAS } = await import(new URL('data/mock/ventas.js', fe).href);
  const [ventasDb] = await pool.query('SELECT id_venta, id_servicio FROM venta ORDER BY id_venta');
  check('B-11: venta.id_servicio de la base es el del mock', same(ventasDb.map((v) => [v.id_venta, v.id_servicio]), VENTAS.map((v) => [v.id_venta, v.id_servicio])));

  /* ---------- GET / PUT /auth/perfil y PUT /auth/password ---------- */
  const [[cuentaOriginal]] = await pool.query('SELECT email, password_hash FROM usuario WHERE id_usuario = 16');
  const [[fichaOriginal]] = await pool.query('SELECT telefono, email, direccion FROM paciente WHERE id_usuario = 16');
  try {
    const paciente = await loginAs('PACIENTE');
    r = await api('GET', '/auth/perfil');
    check('GET /perfil sin token → 401', r.status === 401 && isErrorShape(r.body));
    r = await api('GET', '/auth/perfil', { token: paciente.token });
    check('GET /perfil (paciente) → 200 desde MySQL, con documento y dirección', r.status === 200 && r.body.numero_documento === '1036000101' && r.body.rol === 'PACIENTE' && 'direccion' in r.body && same(r.body.editables, ['telefono', 'email', 'direccion']));
    const recep = await loginAs('RECEPCIONISTA');
    r = await api('GET', '/auth/perfil', { token: recep.token });
    check('GET /perfil (personal) → sin dirección (personal no la tiene)', r.status === 200 && !('direccion' in r.body) && same(r.body.editables, ['telefono', 'email']));

    r = await api('PUT', '/auth/perfil', { token: paciente.token, body: { telefono: '123', email: 'malo' } });
    check('PUT /perfil inválido → 400 por campo', r.status === 400 && r.body.fields.telefono && r.body.fields.email);
    r = await api('PUT', '/auth/perfil', { token: paciente.token, body: { telefono: '3001234567', email: 'Admin@DentalCare.com' } });
    check('PUT /perfil con el correo de otra cuenta → 409 en el campo', r.status === 409 && r.body.fields.email);
    r = await api('PUT', '/auth/perfil', { token: paciente.token, body: { telefono: '3015550000', email: 'Andres.API@Correo.com', direccion: 'Calle 1 # 2-3', numero_documento: '999', id_rol: 1 } });
    const [[ficha]] = await pool.query('SELECT p.telefono, p.email, p.direccion, p.numero_documento, u.email AS cuenta, u.id_rol FROM paciente p JOIN usuario u USING (id_usuario) WHERE p.id_usuario = 16');
    check('PUT /perfil → 200 y MySQL guarda celular, correo y dirección', r.status === 200 && ficha.telefono === '3015550000' && ficha.cuenta === 'andres.api@correo.com' && ficha.email === 'andres.api@correo.com' && ficha.direccion === 'Calle 1 # 2-3');
    check('PUT /perfil no cambia documento ni rol aunque lleguen', ficha.numero_documento === '1036000101' && ficha.id_rol === 4);
    check('PUT /perfil devuelve el user de la sesión actualizado', r.body.user.email === 'andres.api@correo.com' && r.body.user.id_paciente === 11 && r.body.perfil.telefono === '3015550000');

    r = await api('PUT', '/auth/password', { token: paciente.token, body: { password_actual: 'AndresG2026*', password_nueva: 'Nueva2026*', password_confirmacion: 'Otra2026*' } });
    check('PUT /password: confirmación distinta → 400', r.status === 400 && r.body.fields.password_confirmacion);
    r = await api('PUT', '/auth/password', { token: paciente.token, body: { password_actual: 'Incorrecta1*', password_nueva: 'Nueva2026*', password_confirmacion: 'Nueva2026*' } });
    check('PUT /password: actual incorrecta → 400 (no 401)', r.status === 400 && r.body.fields.password_actual);
    r = await api('PUT', '/auth/password', { token: paciente.token, body: { password_actual: 'AndresG2026*', password_nueva: 'debil', password_confirmacion: 'debil' } });
    check('PUT /password: nueva débil → 400', r.status === 400 && r.body.fields.password_nueva);
    r = await api('PUT', '/auth/password', { token: paciente.token, body: { password_actual: 'AndresG2026*', password_nueva: 'Nueva2026*', password_confirmacion: 'Nueva2026*' } });
    const [[hash]] = await pool.query('SELECT password_hash FROM usuario WHERE id_usuario = 16');
    check('PUT /password → 200 y se guarda como bcrypt', r.status === 200 && /^\$2[aby]\$10\$/.test(hash.password_hash));
    r = await api('POST', '/auth/login', { body: { email: 'andres.api@correo.com', password: 'AndresG2026*' } });
    check('Login con la contraseña anterior → 401', r.status === 401);
    r = await api('POST', '/auth/login', { body: { email: 'andres.api@correo.com', password: 'Nueva2026*' } });
    check('Login con el correo y la contraseña nuevos → 200', r.status === 200 && r.body.user.id_paciente === 11);
  } finally {
    await pool.query('UPDATE usuario SET email = ?, password_hash = ? WHERE id_usuario = 16', [cuentaOriginal.email, cuentaOriginal.password_hash]);
    await pool.query('UPDATE paciente SET telefono = ?, email = ?, direccion = ? WHERE id_usuario = 16', [fichaOriginal.telefono, fichaOriginal.email, fichaOriginal.direccion]);
  }

  /* ---------- POST /auth/logout ---------- */
  r = await api('POST', '/auth/logout', { token: admin.token });
  log = await ultimoLog();
  check('POST /logout → 204 y queda LOGOUT en la auditoría', r.status === 204 && log?.accion === 'LOGOUT' && log.id_usuario === 1);

  /* ---------- Base de datos caída ---------- */
  // Se arranca server.js de verdad (otro proceso) apuntando a un puerto donde no hay base.
  const libre = net.createServer().listen(0, '127.0.0.1'); // el sistema elige un puerto libre
  await new Promise((resolve) => libre.once('listening', resolve));
  const port = libre.address().port;
  await new Promise((resolve) => libre.close(resolve));
  const proc = spawn(process.execPath, [fileURLToPath(new URL('src/server.js', backend))], { env: { ...process.env, PORT: String(port), DB_PORT: '1' } });
  let salida = '';
  proc.stdout.on('data', (d) => (salida += d));
  proc.stderr.on('data', (d) => (salida += d));
  for (let i = 0; i < 50 && !salida.includes('No se pudo conectar'); i++) await new Promise((res) => setTimeout(res, 100));
  try {
    const h503 = await fetch(`http://127.0.0.1:${port}/api/health`);
    const l503 = await fetch(`http://127.0.0.1:${port}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@dentalcare.com', password: 'x' }) });
    const cuerpo = await l503.json();
    check('Base caída: el servidor arranca y avisa en consola', salida.includes('No se pudo conectar'));
    check('Base caída → 503 DB_UNAVAILABLE (no 500, sin detalles técnicos)', h503.status === 503 && l503.status === 503 && cuerpo.code === 'DB_UNAVAILABLE' && !/ECONN|127\.0\.0\.1/.test(cuerpo.message));
  } finally {
    proc.kill();
  }
} catch (error) {
  check('La prueba terminó sin excepciones', false, error.stack);
} finally {
  // Limpieza: lo creado por la prueba (la historia clínica se borra en cascada) y su auditoría.
  await pool.query('DELETE FROM paciente WHERE numero_documento IN (?)', [docs]);
  await pool.query('DELETE FROM log_auditoria WHERE id_log > ?', [maxLog]);
  // Se deja el AUTO_INCREMENT donde estaba (MySQL lo ajusta al máximo existente + 1).
  await pool.query('ALTER TABLE paciente AUTO_INCREMENT = 1');
  await pool.query('ALTER TABLE historia_clinica AUTO_INCREMENT = 1');
  await pool.query('ALTER TABLE log_auditoria AUTO_INCREMENT = 1');
  await pool.end();
  server.close();
}

console.log(results.join('\n'));
const failed = results.filter((line) => line.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} pruebas OK`);
process.exitCode = failed ? 1 : 0;
