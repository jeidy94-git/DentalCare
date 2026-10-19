import * as authService from '../services/auth.service.js';

/**
 * Controlador de /api/auth. Un controlador solo traduce HTTP ↔ servicio: saca los datos de la
 * petición (body, params, query, sesión), llama al servicio y elige el código y el JSON de respuesta.
 * Las reglas de negocio están en services/; los errores los convierte el manejador central.
 */

/** POST /api/auth/login  { email, password } → 200 { token, user } */
export async function login(req, res) {
  res.json(await authService.login(req.body ?? {}));
}

/** GET /api/auth/me → 200 user (verifyToken ya comprobó el token y que la cuenta siga activa). */
export function me(req, res) {
  res.json(req.user);
}

/** POST /api/auth/logout → 204 sin cuerpo */
export async function logout(req, res) {
  await authService.logout(req.user);
  res.status(204).end();
}
