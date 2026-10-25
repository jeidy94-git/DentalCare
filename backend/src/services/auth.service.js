import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { withTransaction } from '../config/db.js';
import { ApiError } from '../utils/api-error.js';
import { validar, reglas, pick } from '../utils/validators.js';
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

/* ---------- Perfil propio (perfil.html). Mismo contrato que el mock del frontend. ---------- */

/** Lo que cada cuenta edita de sí misma. La tabla `personal` no tiene dirección: solo el paciente la edita. */
const camposPerfil = (rol) => (rol === 'PACIENTE' ? ['telefono', 'email', 'direccion'] : ['telefono', 'email']);

const REGLAS_PERFIL = {
  telefono: [reglas.requerido('Escribe tu número de celular.'), reglas.texto(20), reglas.telefono()],
  email: [reglas.requerido('Escribe tu correo electrónico.'), reglas.texto(100), reglas.email()],
  direccion: [reglas.texto(150)],
};

const REGLAS_PASSWORD = {
  password_actual: [reglas.requerido('Escribe tu contraseña actual.'), reglas.texto(128)],
  // Misma regla de contraseña robusta del frontend (validators.password).
  password_nueva: [
    reglas.requerido('Escribe la nueva contraseña.'),
    reglas.texto(128),
    reglas.patron(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/, 'Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.'),
  ],
  password_confirmacion: [reglas.requerido('Confirma la nueva contraseña.'), reglas.texto(128)],
};

/** GET /api/auth/perfil → identidad (solo lectura) + contacto editable. */
export async function perfil(user) {
  const row = await usuarioRepo.buscarPerfil(user.id_usuario);
  return {
    rol: row.rol,
    email: row.email,
    nombre: row.nombres ? `${row.nombres} ${row.apellidos}` : row.email,
    tipo_documento: row.tipo_documento,
    numero_documento: row.numero_documento,
    telefono: row.telefono,
    ...(row.rol === 'PACIENTE' && { direccion: row.direccion }),
    editables: camposPerfil(row.rol),
  };
}

/**
 * PUT /api/auth/perfil { telefono, email, direccion? } → { perfil, user }.
 * Documento, nombre y rol NO se cambian aquí aunque lleguen en el cuerpo (pick). Devuelve también el
 * `user` de la sesión actualizado: el frontend lo guarda y el topbar muestra el correo nuevo.
 */
export async function actualizarPerfil(user, body = {}) {
  const campos = camposPerfil(user.rol);
  const datos = pick(body, campos);
  validar(datos, pick(REGLAS_PERFIL, campos));
  const email = datos.email.toLowerCase();

  const enUso = new ApiError(409, 'Ese correo ya está registrado.', { fields: { email: 'Ese correo ya lo usa otra cuenta.' }, code: 'DUPLICATE' });
  if (await usuarioRepo.correoEnUso(email, user.id_usuario)) throw enUso;

  try {
    await withTransaction(async (conn) => {
      await usuarioRepo.actualizarContacto(conn, { idUsuario: user.id_usuario, esPaciente: user.rol === 'PACIENTE', email, telefono: datos.telefono, direccion: datos.direccion || null });
      await auditoria.registrar({ idUsuario: user.id_usuario, accion: 'ACTUALIZAR', tabla: 'usuario', detalles: `Perfil propio: ${Object.keys(datos).join(', ')}` }, conn);
    });
  } catch (error) {
    // Dos cuentas toman el mismo correo a la vez: la llave UNIQUE de usuario.email solo deja entrar a una.
    if (error.code === 'ER_DUP_ENTRY') throw enUso;
    throw error;
  }
  return { perfil: await perfil(user), user: (await sesion(user.id_usuario)).user };
}

/** PUT /api/auth/password { password_actual, password_nueva, password_confirmacion } → { message } */
export async function cambiarPassword(user, body = {}) {
  validar(body, REGLAS_PASSWORD, (data, fields) => {
    if (fields.password_nueva || fields.password_confirmacion) return {};
    if (data.password_confirmacion !== data.password_nueva) return { password_confirmacion: 'Las contraseñas no coinciden.' };
    if (data.password_nueva === data.password_actual) return { password_nueva: 'La nueva contraseña debe ser distinta de la actual.' };
    return {};
  });

  const hashActual = await usuarioRepo.buscarHash(user.id_usuario);
  // 400 y no 401: un 401 haría que el frontend cerrara la sesión por una contraseña mal digitada.
  if (!(await bcrypt.compare(body.password_actual, hashActual))) {
    throw new ApiError(400, 'Revisa los datos marcados.', { fields: { password_actual: 'La contraseña actual no es correcta.' }, code: 'WRONG_PASSWORD' });
  }

  await usuarioRepo.actualizarPassword(user.id_usuario, await bcrypt.hash(body.password_nueva, 10));
  await auditoria.registrar({ idUsuario: user.id_usuario, accion: 'CAMBIO_PASSWORD', tabla: 'usuario', detalles: 'Cambio de contraseña desde el perfil' });
  return { message: 'Tu contraseña se actualizó.' };
}
