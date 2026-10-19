import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError, unauthorized, forbidden } from '../utils/api-error.js';
import * as usuarioModel from '../models/usuario.model.js';

/**
 * verifyToken: protege una ruta. Exige `Authorization: Bearer <token>` (lo envía frontend/js/services/http.js).
 *
 *  1. Verifica la FIRMA del JWT con JWT_SECRET: si alguien cambió el contenido (por ejemplo el rol),
 *     la firma ya no coincide. Solo se acepta HS256 (evita el ataque "alg: none").
 *  2. Verifica que no haya VENCIDO (exp, 8 horas).
 *  3. Busca al usuario en la base: debe existir y seguir ACTIVO, igual que su rol. Un JWT es válido
 *     hasta que vence; esta consulta es la que permite "apagar" una cuenta antes de eso.
 *
 * Deja en la petición `req.user` (el usuario de la sesión) y `req.permisos` (los de su rol en la BD).
 */
export async function verifyToken(req, res, next) {
  const [scheme, token] = (req.get('Authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw unauthorized('Tu sesión venció. Ingresa de nuevo.', 'TOKEN_EXPIRED');
    throw unauthorized('La sesión no es válida. Ingresa de nuevo.', 'INVALID_TOKEN');
  }

  const sesion = await usuarioModel.buscarSesion(Number(payload.sub));
  if (!sesion) throw unauthorized('La sesión no es válida. Ingresa de nuevo.', 'INVALID_TOKEN');
  if (!sesion.activo) throw new ApiError(401, 'Tu cuenta está inactiva. Comunícate con el centro odontológico.', { code: 'INACTIVE' });

  req.user = sesion.user;
  req.permisos = sesion.permisos;
  next();
}

/** ¿El usuario de la petición tiene ALGUNO de estos permisos? */
export const tienePermiso = (req, ...permisos) => permisos.some((permiso) => req.permisos?.includes(permiso));

/**
 * requirePermission: autoriza (403) después de verifyToken (401). Va en la ruta:
 *   router.post('/', requirePermission(PERMISOS.GESTIONAR_PACIENTES), crear)
 * Ocultar el botón en el frontend NO es seguridad: esta línea sí.
 */
export const requirePermission =
  (...permisos) =>
  (req, res, next) => {
    if (!tienePermiso(req, ...permisos)) throw forbidden();
    next();
  };
