/**
 * Configuración central del frontend.
 *
 * USE_MOCK es el "interruptor" de la capa de servicios:
 *   true  → los servicios responden con la base de datos simulada (localStorage) de js/services/mock/db.js.
 *   false → los mismos servicios llaman a la API REST de Node.js/Express (backend/) con js/services/http.js.
 *           Fase C: ya responden /api/auth y /api/pacientes (GET y POST); el resto de módulos llega en la fase D.
 * Las páginas nunca se enteran del cambio: siempre llaman a `pacientesService.list()`, etc.
 */
export const USE_MOCK = true;

/** URL base de la API (backend/: npm start → puerto 3000). */
export const API_BASE_URL = 'http://localhost:3000/api';

/** Tiempo máximo de espera de una petición HTTP antes de abortarla. */
export const HTTP_TIMEOUT_MS = 15000;

/** Latencia simulada de la "red" en modo mock (ms): permite ver spinners y estados de carga. */
export const MOCK_LATENCY = { min: 150, max: 300 };

/** Duración de la sesión (8 horas: una jornada del consultorio). */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/** Prefijo de todas las claves que el sistema guarda en localStorage. */
export const STORAGE_PREFIX = 'dentalcare:';
