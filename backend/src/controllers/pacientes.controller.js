import { sesionDe } from '../middlewares/auth.js';
import * as pacientesService from '../services/pacientes.service.js';

/** Controlador de /api/pacientes (ver services/pacientes.service.js). */

/** GET /api/pacientes?q=texto → 200 [pacientes] */
export async function listar(req, res) {
  res.json(await pacientesService.listar(sesionDe(req), req.query));
}

/** POST /api/pacientes → 201 paciente + Location | 400 | 403 | 409 */
export async function crear(req, res) {
  const paciente = await pacientesService.crear(sesionDe(req), req.body);
  res.status(201).location(`/api/pacientes/${paciente.id_paciente}`).json(paciente);
}
