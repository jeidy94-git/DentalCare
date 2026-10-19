import { sesionDe } from '../middlewares/auth.js';
import * as citasService from '../services/citas.service.js';

/** Controlador de /api/citas (ver services/citas.service.js). */

/** GET /api/citas?desde&hasta&id_especialista&id_paciente&estado → 200 [citas con nombres] */
export async function listar(req, res) {
  res.json(await citasService.listar(sesionDe(req), req.query));
}

/** GET /api/citas/ocupacion?desde&hasta → 200 [{ id_especialista, fecha_hora, estado_cita }] */
export async function ocupacion(req, res) {
  res.json(await citasService.ocupacion(req.query));
}

/** POST /api/citas → 201 cita + Location | 400 | 404 | 409 franja ocupada | 422 RN-02 */
export async function agendar(req, res) {
  const cita = await citasService.agendar(sesionDe(req), req.body);
  res.status(201).location(`/api/citas/${cita.id_cita}`).json(cita);
}

/** PATCH /api/citas/:id/estado { estado } → 200 cita | 400 | 403 | 404 | 409 transición no permitida */
export async function cambiarEstado(req, res) {
  res.json(await citasService.cambiarEstado(sesionDe(req), req.params.id, req.body ?? {}));
}
