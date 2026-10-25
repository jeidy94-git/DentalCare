import { storage } from './storage.js';
import { ROLES } from './navigation.js';
import { SESSION_TTL_MS } from './config.js';

/**
 * Sesión del usuario activo, guardada en localStorage ("dentalcare:session").
 *
 *   { token, user: { id_usuario, rol, nombre, email, cargo, id_paciente?, id_especialista?, id_personal? },
 *     createdAt, expiresAt }
 *
 * IMPORTANTE: guardar la sesión en el navegador es cómodo, pero NO es la seguridad del sistema.
 * Cualquiera puede editar localStorage desde las herramientas del navegador. Por eso:
 *   - getSession() valida la forma y la fecha de expiración (descarta sesiones corruptas o vencidas), y
 *   - la autorización real la hace cada servicio (en mock) y la API con el token (fases C y D).
 */

const KEY = 'session';
const EVENT = 'dc:session';

function isValid(session) {
  return Boolean(
    session &&
      typeof session.token === 'string' &&
      session.user &&
      Number.isInteger(session.user.id_usuario) &&
      ROLES[session.user.rol] &&
      Number.isFinite(session.expiresAt),
  );
}

function emit(reason) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: { reason } }));
}

/** Sesión vigente o null (si no existe, está corrupta o venció). */
export function getSession(now = Date.now()) {
  const session = storage.get(KEY);
  if (!isValid(session)) {
    if (session !== null) storage.remove(KEY);
    return null;
  }
  if (now >= session.expiresAt) {
    storage.remove(KEY);
    return null;
  }
  return session;
}

export const getCurrentUser = () => getSession()?.user ?? null;
export const isAuthenticated = () => getSession() !== null;

/** Inicia la sesión. La crea auth.service después de verificar las credenciales. */
export function setSession({ token, user, ttl = SESSION_TTL_MS }, now = Date.now()) {
  const session = { token, user, createdAt: now, expiresAt: now + ttl };
  if (!isValid(session)) throw new Error('Sesión inválida');
  storage.set(KEY, session);
  emit('login');
  return session;
}

/**
 * Actualiza los datos del usuario de la sesión vigente (p. ej. después de editar su perfil) sin cambiar
 * token ni vencimiento. Emite 'update': el topbar de las páginas abiertas muestra los datos nuevos.
 * @returns {object|null} la sesión actualizada, o null si no había sesión.
 */
export function updateSessionUser(patch) {
  const session = getSession();
  if (!session) return null;
  const next = { ...session, user: { ...session.user, ...patch } };
  if (!isValid(next)) throw new Error('Sesión inválida');
  storage.set(KEY, next);
  emit('update');
  return next;
}

/** Cierra la sesión. `reason`: 'logout' (el usuario salió) o 'expired' (vencida / rechazada por la API). */
export function clearSession(reason = 'logout') {
  storage.remove(KEY);
  emit(reason);
}

/** Lo llaman los servicios cuando la API (o el mock) responde 401: la sesión ya no sirve. */
export const handleUnauthorized = () => clearSession('expired');

/**
 * Escucha cambios de sesión en ESTA pestaña (evento propio) y en OTRAS (evento `storage`).
 * Ejemplo: cerrar sesión en una pestaña saca al usuario de todas las demás.
 * @returns {() => void} función para dejar de escuchar.
 */
export function onSessionChange(callback) {
  const local = (event) => callback({ reason: event.detail?.reason, session: getSession() });
  if (typeof window !== 'undefined') window.addEventListener(EVENT, local);
  const offStorage = storage.onChange(KEY, () => callback({ reason: 'other-tab', session: getSession() }));
  return () => {
    if (typeof window !== 'undefined') window.removeEventListener(EVENT, local);
    offStorage();
  };
}
