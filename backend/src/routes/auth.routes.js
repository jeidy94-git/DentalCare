import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.js';
import * as auth from '../controllers/auth.controller.js';

/** /api/auth */
const router = Router();

router.post('/login', auth.login);
router.get('/me', verifyToken, auth.me);
router.post('/logout', verifyToken, auth.logout);

export default router;
