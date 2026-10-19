import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import * as catalogos from '../controllers/catalogos.controller.js';

/**
 * /api/especialistas y /api/servicios (solo lectura, con sesión): los usa la agenda de todos los
 * roles, incluido el paciente cuando solicita una cita.
 */
const router = Router();

// verifyToken va en cada ruta y NO con router.use(): este router se monta en /api, y un router.use()
// exigiría token también a /api/cualquier-cosa (una ruta inexistente daría 401 en vez de 404).
router.get('/especialistas', verifyToken, catalogos.especialistas);
router.get('/servicios', verifyToken, catalogos.servicios);

export default router;
