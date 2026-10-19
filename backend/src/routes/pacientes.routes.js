import { Router } from 'express';
import { verifyToken, requirePermission } from '../middlewares/auth.js';
import { PERMISOS } from '../utils/permisos.js';
import * as pacientes from '../controllers/pacientes.controller.js';

/** /api/pacientes — todas las rutas exigen sesión. */
const router = Router();
router.use(verifyToken);

router.get('/', pacientes.listar); // el filtro por rol está en el controlador
router.post('/', requirePermission(PERMISOS.GESTIONAR_PACIENTES), pacientes.crear);

export default router;
