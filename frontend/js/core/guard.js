import { appUrl, ROLES } from './navigation.js';
import { getSession, onSessionChange } from './session.js';

/**
 * Guard de rutas para la app multipágina.
 *
 * Cada página protegida lo llama ANTES de dibujar nada:
 *
 *   const user = guard('ADMINISTRADOR');      // o guard(['ADMINISTRADOR', 'RECEPCIONISTA'])
 *   if (!user) return;                        // ya se está redirigiendo: no dibujar nada
 *
 *   sin sesión (o vencida)       → login.html?next=<esta página>
 *   rol sin permiso para la ruta → 403.html
 *   todo bien                    → devuelve el usuario y vigila la sesión mientras la página esté abierta
 *
 * Usa location.replace (no assign): la página prohibida no queda en el historial, así el botón
 * "Atrás" no devuelve al usuario a ella en un bucle de redirecciones.
 *
 * Recordatorio: esto es control de NAVEGACIÓN (experiencia de usuario). La seguridad real está en los
 * servicios / la API, que rechazan con 401/403 cualquier petición no autorizada.
 */

export const LOGIN_PATH = 'login.html';
export const FORBIDDEN_PATH = '403.html';

const APP_ROOT = appUrl('');

/** Carpeta de páginas → rol que puede entrar (estructura de pages/ definida en navigation.js). */
const ROLE_BY_FOLDER = { admin: 'ADMINISTRADOR', asistente: 'RECEPCIONISTA', doctor: 'ESPECIALISTA', paciente: 'PACIENTE' };

export const homeFor = (rol) => appUrl(ROLES[rol]?.home ?? LOGIN_PATH);

/** Ruta actual relativa a /frontend, p. ej. "pages/admin/citas.html?id=3". */
function currentAppPath() {
  const href = globalThis.location?.href ?? '';
  return href.startsWith(APP_ROOT) ? href.slice(APP_ROOT.length) : '';
}

const defaultNavigate = (url) => globalThis.location.replace(url);

/**
 * Valida el parámetro `next` del login para evitar una "redirección abierta" (open redirect):
 * login.html?next=https://sitio-falso.com no debe sacar al usuario de DentalCare.
 * Solo acepta páginas .html dentro de la app, distintas de login/403 y permitidas para el rol.
 * @returns {string} URL absoluta segura (o la página de inicio del rol).
 */
export function safeNext(next, rol) {
  const fallback = homeFor(rol);
  if (!next) return fallback;
  try {
    const url = new URL(next, APP_ROOT);
    if (!url.href.startsWith(APP_ROOT)) return fallback;
    const path = url.pathname.slice(new URL(APP_ROOT).pathname.length);
    if (!path.endsWith('.html') || path === LOGIN_PATH || path === FORBIDDEN_PATH) return fallback;
    const [folder, section] = path.split('/').slice(0, 2);
    if (folder === 'pages' && ROLE_BY_FOLDER[section] && ROLE_BY_FOLDER[section] !== rol) return fallback;
    return url.href;
  } catch {
    return fallback;
  }
}

/** URL del login que vuelve a `next` después de ingresar. */
export function loginUrl({ next, expired = false } = {}) {
  const params = new URLSearchParams();
  if (expired) params.set('expired', '1');
  if (next) params.set('next', next);
  const query = params.toString();
  return appUrl(query ? `${LOGIN_PATH}?${query}` : LOGIN_PATH);
}

/**
 * @param {string|string[]|null} roleRequired  Rol o roles con acceso. null = cualquier usuario con sesión.
 * @param {object} [options]
 * @param {(url: string) => void} [options.navigate]  Inyectable para las pruebas.
 * @param {boolean} [options.watch=true]              Vigilar la sesión mientras la página esté abierta.
 * @returns {object|null} el usuario de la sesión, o null si se está redirigiendo.
 */
export function guard(roleRequired = null, { navigate = defaultNavigate, watch = true } = {}) {
  const roles = roleRequired === null ? null : [].concat(roleRequired);
  const here = currentAppPath();

  const check = () => {
    const session = getSession();
    if (!session) {
      navigate(loginUrl({ next: here }));
      return null;
    }
    if (roles && !roles.includes(session.user.rol)) {
      navigate(appUrl(`${FORBIDDEN_PATH}?from=${encodeURIComponent(here)}`));
      return null;
    }
    return session.user;
  };

  const user = check();
  if (user && watch && typeof window !== 'undefined') {
    // Cerrar sesión (aquí o en otra pestaña), que venza o que otra pestaña entre con otro rol.
    onSessionChange(({ reason, session }) => {
      if (session && (!roles || roles.includes(session.user.rol))) return;
      if (!session && reason === 'logout') navigate(loginUrl());
      else if (!session) navigate(loginUrl({ next: here, expired: reason === 'expired' }));
      else check();
    });
    // bfcache: al volver con "Atrás" después de cerrar sesión, el navegador puede mostrar la página
    // guardada en memoria SIN volver a ejecutar los scripts. `pageshow` con persisted=true lo detecta.
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) check();
    });
  }
  return user;
}

/** Para login.html: si ya hay sesión, no tiene sentido mostrar el formulario. */
export function redirectIfAuthenticated({ next, navigate = defaultNavigate } = {}) {
  const session = getSession();
  if (!session) return false;
  navigate(safeNext(next, session.user.rol));
  return true;
}
