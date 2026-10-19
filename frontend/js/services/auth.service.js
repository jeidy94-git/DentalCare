import { USE_MOCK } from '../core/config.js';
import { setSession, clearSession, getSession } from '../core/session.js';
import { validators, compose } from '../core/validators.js';
import { http } from './http.js';
import { ApiError } from './api-error.js';
import { mockRequest, audit, assertValid } from './mock/db.js';
import { hashPassword, verifyPassword, fakeVerify } from './mock/password.js';

/**
 * Servicio de autenticación (RF-ACC-01/02, HU-01, HU-02).
 *
 *   login(email, password)           → usuario (y deja la sesión iniciada)
 *   logout()                         → cierra la sesión
 *   me()                             → usuario de la sesión vigente (401 si venció)
 *   requestPasswordReset(email)      → siempre el mismo mensaje, exista o no el correo
 *   verifyResetToken(token)          → { email } enmascarado, o 400 si el enlace no sirve
 *   resetPassword(token, password)   → cambia la contraseña y anula el enlace
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
/* API real (fase D)                                                   */
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
  requestPasswordReset: (email) => http.post('/auth/forgot-password', { email }),
  verifyResetToken: (token) => http.get(`/auth/reset-password/${encodeURIComponent(token)}`),
  resetPassword: (token, password) => http.post('/auth/reset-password', { token, password }),
};

export const authService = USE_MOCK ? mock : remote;

/**
 * SOLO modo mock: simula abrir el correo del usuario y devuelve el enlace de restablecimiento.
 * No forma parte del contrato de la API (en producción el enlace llega por correo electrónico).
 */
export const mockOutbox = (email) => (USE_MOCK ? outbox.get(String(email ?? '').trim().toLowerCase()) ?? null : null);
