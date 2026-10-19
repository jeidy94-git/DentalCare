import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';
import { validar, reglas } from '../utils/validators.js';
import * as usuarioRepo from '../repositories/usuario.repository.js';
import * as auditoria from '../repositories/auditoria.repository.js';

/**
 * Autenticación (RF-ACC-01/02, HU-02). Mismo contrato que el mock de frontend/js/services/auth.service.js.
 *
 * Un servicio tiene la lógica de negocio y no sabe nada de HTTP (ni `req` ni `res`): recibe datos,
 * aplica las reglas, usa los repositorios y devuelve un resultado o lanza un ApiError.
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

/**
 * Usuario de la sesión: el mismo objeto `user` que arma el mock (auth.service.js → buildUser) más
 * los permisos de su rol. Lo usa verifyToken en CADA petición autenticada: si el administrador
 * inactiva la cuenta o el rol, el token deja de servir de inmediato aunque no haya vencido.
 * @returns {Promise<{ user: object, activo: boolean, permisos: string[] } | null>}
 */
export async function sesion(idUsuario) {
  const row = await usuarioRepo.buscarSesion(idUsuario);
  if (!row) return null;

  const base = { id_usuario: row.id_usuario, rol: row.rol, email: row.email };
  const user =
    row.rol === 'PACIENTE'
      ? { ...base, nombre: row.id_paciente ? `${row.paciente_nombres} ${row.paciente_apellidos}` : row.email, cargo: 'Paciente', id_paciente: row.id_paciente }
      : {
          ...base,
          nombre: row.id_personal ? `${row.personal_nombres} ${row.personal_apellidos}` : row.email,
          cargo: row.cargo ?? row.rol,
          id_personal: row.id_personal,
          ...(row.id_especialista && { id_especialista: row.id_especialista }),
        };

  return {
    user,
    activo: row.estado === 'ACTIVO' && row.rol_estado === 'ACTIVO',
    permisos: row.permisos ? row.permisos.split(',') : [],
  };
}

/** { email, password } → { token, user } */
export async function login(body = {}) {
  validar(body, REGLAS_LOGIN);
  const correo = body.email.trim().toLowerCase();

  const cuenta = await usuarioRepo.buscarPorEmail(correo);
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

  const { user } = await sesion(cuenta.id_usuario);
  // El token lleva lo mínimo: quién es (sub) y su rol. Nada secreto: un JWT se puede LEER (base64);
  // lo que no se puede es MODIFICAR sin invalidar la firma.
  const token = jwt.sign({ rol: user.rol }, env.jwt.secret, { subject: String(user.id_usuario), expiresIn: env.jwt.expiresIn, algorithm: 'HS256' });

  await auditoria.registrar({ idUsuario: user.id_usuario, accion: 'LOGIN', tabla: 'usuario', detalles: 'Inicio de sesión' });
  return { token, user };
}

/**
 * Deja el cierre de sesión en la auditoría.
 * Un JWT no se puede "apagar" desde el servidor: el frontend borra su copia (clearSession) y el
 * token deja de servir al vencer o si la cuenta se inactiva (verifyToken consulta la base).
 */
export async function logout(user) {
  await auditoria.registrar({ idUsuario: user.id_usuario, accion: 'LOGOUT', tabla: 'usuario', detalles: 'Cierre de sesión' });
}
