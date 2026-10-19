import { withTransaction } from '../config/db.js';
import { ApiError, forbidden } from '../utils/api-error.js';
import { PERMISOS } from '../utils/permisos.js';
import { validar, reglas, pick, vacio } from '../utils/validators.js';
import { erroresUbicacion } from '../utils/ubicacion.js';
import { tienePermiso } from '../middlewares/auth.js';
import * as pacienteModel from '../models/paciente.model.js';
import * as auditoria from '../models/auditoria.model.js';

/**
 * Pacientes (RF-PAC-01/02, HU-03). Mismo contrato que el mock de frontend/js/services/pacientes.service.js.
 */

// Las listas son las del formulario y las de los CHECK de la base (B-10): misma lista en las tres capas.
const REGLAS = {
  tipo_documento: [reglas.requerido(), reglas.texto(10), reglas.unoDe(['CC', 'TI', 'CE', 'PA'], 'Tipo de documento no válido.')],
  numero_documento: [reglas.requerido(), reglas.texto(20), reglas.documento()],
  nombres: [reglas.requerido(), reglas.texto(100)],
  apellidos: [reglas.requerido(), reglas.texto(100)],
  fecha_nacimiento: [reglas.requerido(), reglas.texto(10), reglas.fechaPasada('La fecha de nacimiento no puede ser futura.')],
  genero: [reglas.requerido(), reglas.texto(15), reglas.unoDe(['MASCULINO', 'FEMENINO', 'OTRO'], 'Género no válido.')],
  telefono: [reglas.requerido(), reglas.texto(20), reglas.telefono()],
  email: [reglas.texto(100), reglas.email()],
  departamento: [reglas.texto(60)],
  municipio: [reglas.texto(80)],
  direccion: [reglas.texto(150)],
  eps_aseguradora: [reglas.texto(100)],
};

/**
 * GET /api/pacientes?q=texto → 200 [pacientes]
 * Qué ve cada rol (según los permisos de su token, leídos de rol_permiso):
 *   - PACIENTE: solo su propio registro.
 *   - Con GESTIONAR_PACIENTES (administrador, recepción) o VER_HISTORIA_CLINICA (odontólogo): todos.
 *   - Cualquier otro: 403.
 */
export async function listar(req, res) {
  // ?q=a&q=b llega como lista: solo se acepta un texto, y con un tope razonable.
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';

  let filtros;
  if (req.user.rol === 'PACIENTE') filtros = { q, idPaciente: req.user.id_paciente ?? 0 };
  else if (tienePermiso(req, PERMISOS.GESTIONAR_PACIENTES, PERMISOS.VER_HISTORIA_CLINICA)) filtros = { q };
  else throw forbidden();

  res.json(await pacienteModel.listar(filtros));
}

/** POST /api/pacientes → 201 paciente | 400 datos inválidos | 409 documento o correo ya registrado */
export async function crear(req, res) {
  const datos = pick(req.body, pacienteModel.CAMPOS);
  // La ubicación se revisa contra la DIVIPOLA solo si los dos campos ya son texto válido.
  validar(datos, REGLAS, (data, fields) => (fields.departamento || fields.municipio ? {} : erroresUbicacion(data)));

  // Opcionales vacíos → NULL (y no '' en la base); el correo se guarda en minúsculas.
  for (const campo of pacienteModel.CAMPOS) if (vacio(datos[campo])) datos[campo] = null;
  if (datos.email) datos.email = datos.email.toLowerCase();

  const duplicado = await pacienteModel.duplicados(datos);
  if (duplicado.documento || duplicado.email) {
    const fields = {};
    if (duplicado.documento) fields.numero_documento = 'Ya existe un paciente con ese número de documento.';
    if (duplicado.email) fields.email = 'Ese correo ya está registrado para otro paciente.';
    throw new ApiError(409, 'Hay datos que ya están registrados.', { fields, code: 'DUPLICATE' });
  }

  let paciente;
  try {
    paciente = await withTransaction(async (conn) => {
      const id = await pacienteModel.crear(conn, datos);
      await auditoria.registrar({ idUsuario: req.user.id_usuario, accion: 'CREAR', tabla: 'paciente', detalles: `Paciente #${id} ${datos.nombres} ${datos.apellidos}` }, conn);
      return pacienteModel.buscarPorId(id, conn);
    });
  } catch (error) {
    // Dos recepcionistas guardan el mismo documento al mismo tiempo: ambos pasan la consulta de
    // arriba, pero la llave UNIQUE de la base solo deja entrar a uno. El otro recibe el mismo 409.
    if (error.code === 'ER_DUP_ENTRY') {
      throw new ApiError(409, 'Hay datos que ya están registrados.', { fields: { numero_documento: 'Ya existe un paciente con ese número de documento.' }, code: 'DUPLICATE' });
    }
    throw error;
  }

  res.status(201).location(`/api/pacientes/${paciente.id_paciente}`).json(paciente);
}
