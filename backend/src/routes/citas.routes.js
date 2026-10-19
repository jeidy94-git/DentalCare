import { Router } from 'express';
import { verifyToken, requirePermission } from '../middlewares/auth.js';
import { PERMISOS } from '../utils/permisos.js';
import * as citas from '../controllers/citas.controller.js';

/** /api/citas — todas las rutas exigen sesión. */
const router = Router();
router.use(verifyToken);

router.get('/', citas.listar); // el filtro por rol (el paciente solo ve las suyas) está en el servicio
// '/ocupacion' va ANTES de cualquier ruta con '/:id': Express prueba las rutas en orden.
router.get('/ocupacion', requirePermission(PERMISOS.CREAR_CITA), citas.ocupacion);
router.post('/', requirePermission(PERMISOS.CREAR_CITA), citas.agendar);
// Quién puede pasar a cada estado depende del estado pedido y de la cita: lo decide el servicio.
router.patch('/:id/estado', citas.cambiarEstado);

export default router;
