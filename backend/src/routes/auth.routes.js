import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import * as auth from '../controllers/auth.controller.js';

/** /api/auth */
const router = Router();

router.post('/login', auth.login);
router.get('/me', verifyToken, auth.me);
router.post('/logout', verifyToken, auth.logout);

// Perfil propio (perfil.html): cualquier rol, siempre sobre SU cuenta (el id sale del token, no de la URL).
router.get('/perfil', verifyToken, auth.perfil);
router.put('/perfil', verifyToken, auth.actualizarPerfil);
router.put('/password', verifyToken, auth.cambiarPassword);

export default router;
