import { ApiError } from '../utils/api-error.js';

/**
 * Manejo centralizado de errores.
 *
 * Express 5 entrega aquí cualquier error: los que lanza un controlador con `throw` (también dentro de
 * una función async) y los de las librerías (JSON mal formado, MySQL caído…). Ningún controlador
 * arma respuestas de error a mano: todas salen de este archivo con la misma forma.
 *
 * Regla de oro: al cliente se le cuenta QUÉ pasó con palabras útiles, nunca el detalle técnico
 * (SQL, stack, rutas del servidor). Ese detalle va a la consola del servidor (OWASP A05/A09).
 */

/** Errores de conexión: la base no está o rechazó las credenciales. */
const DB_UNAVAILABLE = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR']);

/** CHECK incumplido: 3819 en MySQL 8, 4025 en MariaDB (B-01…B-10 de database/CAMBIOS.md). */
const CHECK_VIOLATION = new Set([3819, 4025]);

/** Traduce errores conocidos de librerías a ApiError. Devuelve null si el error es desconocido (→ 500). */
function translate(error) {
  if (error instanceof ApiError) return error;

  // express.json(): el cuerpo no se pudo interpretar.
  if (error.type === 'entity.parse.failed') return new ApiError(400, 'El cuerpo de la petición no es un JSON válido.', { code: 'BAD_JSON' });
  if (error.type === 'entity.too.large') return new ApiError(413, 'La petición es demasiado grande.', { code: 'PAYLOAD_TOO_LARGE' });

  // MySQL / MariaDB: la base de datos es la última línea de defensa (defensa en profundidad).
  if (error.code === 'ER_DUP_ENTRY') return new ApiError(409, 'Ese registro ya existe.', { code: 'DUPLICATE' });
  if (error.code === 'ER_NO_REFERENCED_ROW_2') return new ApiError(400, 'Se hace referencia a un registro que no existe.', { code: 'BAD_REFERENCE' });
  if (error.code === 'ER_ROW_IS_REFERENCED_2') return new ApiError(409, 'No se puede eliminar: hay registros que dependen de este.', { code: 'HAS_REFERENCES' });
  // Dos transacciones se bloquearon entre sí (o una esperó demasiado un SELECT … FOR UPDATE): InnoDB
  // deshizo una. Los datos quedan bien; basta con repetir la operación.
  if (error.code === 'ER_LOCK_DEADLOCK' || error.code === 'ER_LOCK_WAIT_TIMEOUT') return new ApiError(409, 'Otra operación estaba usando los mismos datos. Intenta de nuevo.', { code: 'CONFLICT' });
  if (CHECK_VIOLATION.has(error.errno)) return new ApiError(400, 'Los datos no cumplen las reglas de la base de datos.', { code: 'CONSTRAINT' });
  if (DB_UNAVAILABLE.has(error.code)) return new ApiError(503, 'La base de datos no está disponible. Intenta de nuevo en unos minutos.', { code: 'DB_UNAVAILABLE' });

  return null;
}

/** Ruta que no existe: 404 con el mismo formato (y no la página HTML de Express). */
export function notFound(req, res, next) {
  next(new ApiError(404, `La ruta ${req.method} ${req.originalUrl.split('?')[0]} no existe.`, { code: 'ROUTE_NOT_FOUND' }));
}

// Express reconoce un manejador de errores porque recibe 4 parámetros (aunque `next` casi no se use).
export function errorHandler(error, req, res, next) {
  const apiError = translate(error) ?? new ApiError(500, 'Ocurrió un error inesperado en el servidor.', { code: 'INTERNAL' });

  // Lo que el usuario no puede resolver se registra completo para quien mantiene el servidor.
  // (Si la base está caída basta una línea con el código; un error desconocido se registra con su stack.)
  if (apiError.status >= 500) console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} →`, apiError.code === 'DB_UNAVAILABLE' ? `${error.code}: ${error.message}` : error);

  if (res.headersSent) return next(error); // la respuesta ya empezó a salir: Express cierra la conexión

  res.status(apiError.status).json({
    status: apiError.status,
    message: apiError.message,
    fields: apiError.fields,
    code: apiError.code,
  });
}
