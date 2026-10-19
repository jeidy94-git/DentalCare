import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { validar, reglas } from '../utils/validators.js';
import * as usuarioModel from '../models/usuario.model.js';
import * as auditoria from '../models/auditoria.model.js';

/**
 * Autenticación (RF-ACC-01/02, HU-02). Mismo contrato que el mock de frontend/js/services/auth.service.js.
 */

const CREDENCIALES_INVALIDAS = 'Correo o contraseña incorrectos.';

/**
 * Hash de relleno para cuando el correo NO existe. Comparar contra él tarda lo mismo que una
 * comparación real (~70 ms con costo 10). Sin esto, "correo inexistente" respondería al instante y
 * "contraseña mala" no: midiendo el tiempo se sabría qué correos están registrados (enumeración).
 */
const HASH_FALSO = bcrypt.hashSync('hash-de-relleno-para-tiempo-constante', 10);

const REGLAS_LOGIN = {
  email: [reglas.requerido(), reglas.texto(100), reglas.email()],
  password: [reglas.requerido(), reglas.texto(128)],
};

/** POST /api/auth/login  { email, password } → 200 { token, user } */
export async function login(req, res) {
  const body = req.body ?? {};
  validar(body, REGLAS_LOGIN);
  const correo = body.email.trim().toLowerCase();

  const cuenta = await usuarioModel.buscarPorEmail(correo);
  // bcrypt.compare SIEMPRE se ejecuta (con el hash real o el de relleno): tiempo constante.
  const coincide = await bcrypt.compare(body.password, cuenta?.password_hash ?? HASH_FALSO);

  if (!cuenta || !coincide) {
    // RF-ACC-02: el MISMO mensaje si el correo no existe o si la contraseña está mal.
    await auditoria.registrar({ idUsuario: cuenta?.id_usuario ?? null, accion: 'LOGIN_FALLIDO', tabla: 'usuario', detalles: `Intento de ingreso con ${correo}` });
    throw new ApiError(401, CREDENCIALES_INVALIDAS, { code: 'INVALID_CREDENTIALS' });
  }

  // Se informa "inactiva" solo a quien demostró conocer la contraseña.
  if (cuenta.estado !== 'ACTIVO' || cuenta.rol_estado !== 'ACTIVO') {
    await auditoria.registrar({ idUsuario: cuenta.id_usuario, accion: 'LOGIN_INACTIVO', tabla: 'usuario', detalles: 'Ingreso rechazado: cuenta o rol inactivo' });
    throw new ApiError(403, 'Tu cuenta está inactiva. Comunícate con el centro odontológico.', { code: 'INACTIVE' });
  }

  const { user } = await usuarioModel.buscarSesion(cuenta.id_usuario);
  // El token lleva lo mínimo: quién es (sub) y su rol. Nada secreto: un JWT se puede LEER (base64);
  // lo que no se puede es MODIFICAR sin invalidar la firma.
  const token = jwt.sign({ rol: user.rol }, env.jwt.secret, { subject: String(user.id_usuario), expiresIn: env.jwt.expiresIn, algorithm: 'HS256' });

  await auditoria.registrar({ idUsuario: user.id_usuario, accion: 'LOGIN', tabla: 'usuario', detalles: 'Inicio de sesión' });
  res.json({ token, user });
}

/** GET /api/auth/me → 200 user (verifyToken ya comprobó el token y que la cuenta siga activa). */
export function me(req, res) {
  res.json(req.user);
}

/**
 * POST /api/auth/logout → 204. Deja el cierre en la auditoría.
 * Un JWT no se puede "apagar" desde el servidor: el frontend borra su copia (clearSession) y el
 * token deja de servir al vencer o si la cuenta se inactiva (verifyToken consulta la base).
 */
export async function logout(req, res) {
  await auditoria.registrar({ idUsuario: req.user.id_usuario, accion: 'LOGOUT', tabla: 'usuario', detalles: 'Cierre de sesión' });
  res.status(204).end();
}
