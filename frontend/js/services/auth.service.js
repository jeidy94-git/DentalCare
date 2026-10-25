import { USE_MOCK } from '../core/config.js';
import { setSession, clearSession, getSession, updateSessionUser } from '../core/session.js';
import { validators, compose } from '../core/validators.js';
import { http } from './http.js';
import { ApiError } from './api-error.js';
import { mockRequest, audit, assertValid, pick } from './mock/db.js';
import { hashPassword, verifyPassword, fakeVerify } from './mock/password.js';
import { CREDENCIALES_DEMO, NOTIFICACIONES_DEMO } from '../data/mock/usuarios.js';

/**
 * Servicio de autenticación (RF-ACC-01/02, HU-01, HU-02).
 *
 *   login(email, password)           → usuario (y deja la sesión iniciada)
 *   logout()                         → cierra la sesión
 *   me()                             → usuario de la sesión vigente (401 si venció)
 *   requestPasswordReset(email)      → siempre el mismo mensaje, exista o no el correo
 *   verifyResetToken(token)          → { email } enmascarado, o 400 si el enlace no sirve
 *   resetPassword(token, password)   → cambia la contraseña y anula el enlace
 *
 *   perfil()                         → datos de la cuenta del usuario de la sesión (perfil.html)
 *   actualizarPerfil(data)           → celular, correo y dirección (solo paciente); refresca la sesión
 *   cambiarPassword(data)            → { password_actual, password_nueva, password_confirmacion }
 */

const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos.';
const RESET_MESSAGE = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';
const INVALID_TOKEN = 'El enlace no es válido o ya venció. Solicita uno nuevo.';
const RESET_TTL_MS = 30 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Mock                                                                */
/* ------------------------------------------------------------------ */

/** Datos que viajan en la sesión: lo que devolvería un JOIN usuario + rol + personal/paciente. */
function buildUser(db, usuario) {
  const rol = db.rol.find((r) => r.id_rol === usuario.id_rol)?.nombre_rol;
  const user = { id_usuario: usuario.id_usuario, rol, email: usuario.email };
  if (rol === 'PACIENTE') {
    const p = db.paciente.find((x) => x.id_usuario === usuario.id_usuario);
    return { ...user, nombre: p ? `${p.nombres} ${p.apellidos}` : usuario.email, cargo: 'Paciente', id_paciente: p?.id_paciente ?? null };
  }
  const p = db.personal.find((x) => x.id_usuario === usuario.id_usuario);
  const especialista = p && db.especialista.find((e) => e.id_personal === p.id_personal);
  return {
    ...user,
    nombre: p ? `${p.nombres} ${p.apellidos}` : usuario.email,
    cargo: p?.cargo ?? rol,
    id_personal: p?.id_personal ?? null,
    ...(especialista && { id_especialista: especialista.id_especialista }),
  };
}

const maskEmail = (email) => email.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) => `${first}${'•'.repeat(Math.min(middle.length, 6))}${domain}`);

/** "Bandeja de salida" simulada: el mock no envía correos, los deja aquí (ver mockOutbox). */
const outbox = new Map();

function findValidToken(db, token) {
  const row = db.password_reset.find((t) => t.token === token);
  return row && !row.usado && Date.now() < row.expira ? row : null;
}

/* ---------- Perfil del usuario de la sesión ---------- */

/** Lo que cada cuenta puede editar de sí misma. La tabla `personal` no tiene dirección: solo el paciente la edita. */
const CAMPOS_PERFIL = { PACIENTE: ['telefono', 'email', 'direccion'], PERSONAL: ['telefono', 'email'] };
const camposPerfil = (rol) => CAMPOS_PERFIL[rol === 'PACIENTE' ? 'PACIENTE' : 'PERSONAL'];

const REGLAS_PERFIL = {
  telefono: compose(validators.required('Escribe tu número de celular.'), validators.telefono()),
  email: compose(validators.required('Escribe tu correo electrónico.'), validators.email()),
  direccion: validators.maxLength(150),
};

/** Ficha (paciente o personal) de la cuenta. */
function fichaDe(db, usuario, rol) {
  return rol === 'PACIENTE' ? db.paciente.find((p) => p.id_usuario === usuario.id_usuario) : db.personal.find((p) => p.id_usuario === usuario.id_usuario);
}

/** Perfil de la cuenta: identidad (solo lectura) + datos de contacto editables. */
function perfilDe(db, usuario) {
  const rol = db.rol.find((r) => r.id_rol === usuario.id_rol)?.nombre_rol;
  const ficha = fichaDe(db, usuario, rol) ?? {};
  return {
    rol,
    email: usuario.email,
    nombre: ficha.nombres ? `${ficha.nombres} ${ficha.apellidos}` : usuario.email,
    tipo_documento: ficha.tipo_documento ?? null,
    numero_documento: ficha.numero_documento ?? null,
    telefono: ficha.telefono ?? null,
    ...(rol === 'PACIENTE' && { direccion: ficha.direccion ?? null }),
    editables: camposPerfil(rol),
  };
}

const mock = {
  async login(email, password) {
    // Los fallos también se auditan: por eso el handler no lanza el error (lo haría el rollback) sino que lo devuelve.
    const result = await mockRequest(
      async ({ db }) => {
        const correo = String(email ?? '').trim().toLowerCase();
        const usuario = db.usuario.find((u) => u.email.toLowerCase() === correo);
        const ok = usuario ? await verifyPassword(password, usuario.password_hash) : await fakeVerify(password);
        if (!ok) {
          audit(db, null, 'LOGIN_FALLIDO', 'usuario', `Intento de ingreso con ${correo || '(vacío)'}`);
          return { error: 'INVALID' };
        }
        const rol = db.rol.find((r) => r.id_rol === usuario.id_rol);
        if (usuario.estado !== 'ACTIVO' || rol?.estado !== 'ACTIVO') return { error: 'INACTIVE' };
        audit(db, usuario, 'LOGIN', 'usuario', 'Inicio de sesión');
        return { token: `mock.${globalThis.crypto.randomUUID()}`, user: buildUser(db, usuario) };
      },
      { auth: false, write: true },
    );

    // RF-ACC-02: el mismo mensaje si el correo no existe o si la contraseña está mal.
    if (result.error === 'INVALID') throw new ApiError(401, INVALID_CREDENTIALS, { code: 'INVALID_CREDENTIALS' });
    if (result.error === 'INACTIVE') throw new ApiError(403, 'Tu cuenta está inactiva. Comunícate con el centro odontológico.', { code: 'INACTIVE' });
    setSession(result);
    return result.user;
  },

  async logout() {
    const user = getSession()?.user;
    // Primero se audita: al borrar la sesión el guard redirige al login y la página se descarga.
    if (user) await mockRequest(({ db }) => audit(db, user, 'LOGOUT', 'usuario', 'Cierre de sesión'), { auth: false, write: true });
    clearSession('logout');
  },

  me: () => mockRequest(({ user }) => user),

  perfil: () => mockRequest(({ db, user }) => perfilDe(db, db.usuario.find((u) => u.id_usuario === user.id_usuario))),

  async actualizarPerfil(data) {
    const result = await mockRequest(
      ({ db, user }) => {
        const usuario = db.usuario.find((u) => u.id_usuario === user.id_usuario);
        const campos = camposPerfil(user.rol);
        // Solo los campos de contacto: documento, nombre y rol no se cambian desde el perfil aunque lleguen.
        const row = pick(data, campos);
        assertValid(row, pick(REGLAS_PERFIL, campos));
        const email = row.email.toLowerCase();
        const ficha = fichaDe(db, usuario, user.rol);
        const enUso =
          db.usuario.some((u) => u.email.toLowerCase() === email && u.id_usuario !== usuario.id_usuario) ||
          (user.rol === 'PACIENTE' && db.paciente.some((p) => p.email?.toLowerCase() === email && p !== ficha));
        if (enUso) throw new ApiError(409, 'Ese correo ya está registrado.', { fields: { email: 'Ese correo ya lo usa otra cuenta.' }, code: 'DUPLICATE' });

        usuario.email = email;
        if (ficha) {
          ficha.telefono = row.telefono;
          if (user.rol === 'PACIENTE') Object.assign(ficha, { email, direccion: row.direccion || null });
        }
        audit(db, user, 'ACTUALIZAR', 'usuario', `Perfil propio: ${Object.keys(row).join(', ')}`);
        return { perfil: perfilDe(db, usuario), user: buildUser(db, usuario) };
      },
      { write: true },
    );
    updateSessionUser(result.user); // el topbar muestra el correo nuevo sin volver a ingresar
    return result.perfil;
  },

  async cambiarPassword(data) {
    const { password_actual, password_nueva, password_confirmacion } = data ?? {};
    assertValid(data ?? {}, {
      password_actual: validators.required('Escribe tu contraseña actual.'),
      password_nueva: compose(validators.required('Escribe la nueva contraseña.'), validators.password()),
      password_confirmacion: compose(validators.required('Confirma la nueva contraseña.'), validators.matches(() => password_nueva, 'Las contraseñas no coinciden.')),
    });
    if (password_nueva === password_actual) throw new ApiError(400, 'Revisa los datos marcados.', { fields: { password_nueva: 'La nueva contraseña debe ser distinta de la actual.' }, code: 'VALIDATION' });
    const password_hash = await hashPassword(password_nueva);
    return mockRequest(
      async ({ db, user }) => {
        const usuario = db.usuario.find((u) => u.id_usuario === user.id_usuario);
        // 400 y no 401: un 401 cerraría la sesión por una contraseña mal digitada.
        if (!(await verifyPassword(password_actual, usuario.password_hash))) {
          throw new ApiError(400, 'Revisa los datos marcados.', { fields: { password_actual: 'La contraseña actual no es correcta.' }, code: 'WRONG_PASSWORD' });
        }
        usuario.password_hash = password_hash;
        audit(db, user, 'CAMBIO_PASSWORD', 'usuario', 'Cambio de contraseña desde el perfil');
        return { message: 'Tu contraseña se actualizó.' };
      },
      { write: true },
    );
  },

  async requestPasswordReset(email) {
    assertValid({ email }, { email: compose(validators.required(), validators.email()) });
    return mockRequest(
      ({ db }) => {
        const correo = email.trim().toLowerCase();
        const usuario = db.usuario.find((u) => u.email.toLowerCase() === correo && u.estado === 'ACTIVO');
        if (usuario) {
          // Un enlace nuevo anula los anteriores del mismo usuario.
          db.password_reset.forEach((t) => t.id_usuario === usuario.id_usuario && (t.usado = true));
          const token = globalThis.crypto.randomUUID();
          db.password_reset.push({ token, id_usuario: usuario.id_usuario, expira: Date.now() + RESET_TTL_MS, usado: false });
          audit(db, usuario, 'SOLICITUD_RESET', 'usuario', 'Solicitud de restablecimiento de contraseña');
          outbox.set(correo, `login.html?token=${token}`);
        }
        return { message: RESET_MESSAGE };
      },
      { auth: false, write: true },
    );
  },

  verifyResetToken: (token) =>
    mockRequest(
      ({ db }) => {
        const row = findValidToken(db, token);
        if (!row) throw new ApiError(400, INVALID_TOKEN, { code: 'INVALID_TOKEN' });
        return { email: maskEmail(db.usuario.find((u) => u.id_usuario === row.id_usuario).email) };
      },
      { auth: false },
    ),

  async resetPassword(token, password) {
    assertValid({ password }, { password: compose(validators.required(), validators.password()) });
    const password_hash = await hashPassword(password);
    return mockRequest(
      ({ db }) => {
        const row = findValidToken(db, token);
        if (!row) throw new ApiError(400, INVALID_TOKEN, { code: 'INVALID_TOKEN' });
        const usuario = db.usuario.find((u) => u.id_usuario === row.id_usuario);
        usuario.password_hash = password_hash;
        row.usado = true; // un enlace sirve UNA sola vez
        audit(db, usuario, 'RESET_PASSWORD', 'usuario', 'Contraseña restablecida');
        return { message: 'Tu contraseña se actualizó. Ya puedes iniciar sesión.' };
      },
      { auth: false, write: true },
    );
  },
};

/* ------------------------------------------------------------------ */
/* API real (backend/src/controllers/auth.controller.js)               */
/* ------------------------------------------------------------------ */
const remote = {
  async login(email, password) {
    const { token, user } = await http.post('/auth/login', { email, password });
    setSession({ token, user });
    return user;
  },
  async logout() {
    try {
      await http.post('/auth/logout');
    } finally {
      clearSession('logout');
    }
  },
  me: () => http.get('/auth/me'),
  // Endpoints de perfil: pendientes en el backend (backend/src/routes/auth.routes.js).
  perfil: () => http.get('/auth/perfil'),
  async actualizarPerfil(data) {
    const { perfil, user } = await http.put('/auth/perfil', data);
    updateSessionUser(user);
    return perfil;
  },
  cambiarPassword: (data) => http.put('/auth/password', data),
  requestPasswordReset: (email) => http.post('/auth/forgot-password', { email }),
  verifyResetToken: (token) => http.get(`/auth/reset-password/${encodeURIComponent(token)}`),
  resetPassword: (token, password) => http.post('/auth/reset-password', { token, password }),
};

export const authService = USE_MOCK ? mock : remote;

/**
 * SOLO modo mock: simula abrir el correo del usuario y devuelve el enlace de restablecimiento.
 * No forma parte del contrato de la API (en producción el enlace llega por correo electrónico).
 */
/** SOLO modo mock: una cuenta de prueba por rol, para mostrarlas en el login de la demo. Con la API real: []. */
export const demoAccounts = () => (USE_MOCK ? CREDENCIALES_DEMO.map((c) => ({ ...c })) : []);

/** Notificaciones de la topbar. Aún no hay tabla ni servicio de notificaciones: en mock son de demostración. */
export const demoNotifications = () => (USE_MOCK ? NOTIFICACIONES_DEMO.map((n) => ({ ...n })) : []);

export const mockOutbox = (email) => (USE_MOCK ? outbox.get(String(email ?? '').trim().toLowerCase()) ?? null : null);
