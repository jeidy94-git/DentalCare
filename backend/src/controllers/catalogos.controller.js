import { sesionDe } from '../middlewares/auth.js';
import * as catalogosService from '../services/catalogos.service.js';

/** Controlador de GET /api/especialistas y GET /api/servicios (ver services/catalogos.service.js). */

/** GET /api/especialistas?soloActivos=true → 200 [odontólogos con horarios] */
export async function especialistas(req, res) {
  res.json(await catalogosService.especialistas(req.query));
}

/** GET /api/servicios?soloActivos=true → 200 [tratamientos] */
export async function servicios(req, res) {
  res.json(await catalogosService.servicios(sesionDe(req), req.query));
}
