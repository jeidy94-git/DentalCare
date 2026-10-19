import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { pingDb } from './config/db.js';
import { notFound, errorHandler } from './middlewares/error-handler.js';
import authRoutes from './routes/auth.routes.js';
import pacientesRoutes from './routes/pacientes.routes.js';
import citasRoutes from './routes/citas.routes.js';
import catalogosRoutes from './routes/catalogos.routes.js';

/**
 * Aplicación Express. Está separada de server.js (que solo hace `listen`) para que las pruebas de
 * tests/backend/ la levanten en un puerto libre sin tocar el 3000.
 *
 * Orden del recorrido de una petición:
 *   CORS → JSON del cuerpo → ruta (verifyToken → requirePermission → controlador → servicio → repositorio)
 *   → 404 → errores
 */
const app = express();

app.disable('x-powered-by'); // no anunciar "Express" en cada respuesta (pistas gratis para un atacante)

/*
 * CORS: el frontend (Live Server en :5500, o el servidor de pruebas en :5600) es OTRO origen que la API
 * (:3000). Sin este permiso explícito, el navegador bloquea la respuesta. Solo se aceptan los orígenes de
 * CORS_ORIGIN; no se usa '*' porque cualquier página de internet podría llamar a la API.
 */
app.use(cors({ origin: env.corsOrigins, exposedHeaders: ['Location'], maxAge: 600 }));

app.use(express.json({ limit: '100kb' }));

/** Estado del servicio y de la base (para el monitoreo y para saber si el backend quedó bien instalado). */
// Si la base no responde, el error de conexión sigue al manejador central, que lo convierte en 503.
app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', db: 'ok', version: await pingDb() });
});

app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api', catalogosRoutes); // /api/especialistas y /api/servicios

app.use(notFound);
app.use(errorHandler);

export default app;
