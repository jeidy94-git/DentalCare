/**
 * Error "esperado" de la API: lo que se le puede contar al usuario (datos inválidos, sin permiso,
 * duplicado…). El manejador central lo convierte en la respuesta JSON
 *
 *   { status, message, fields, code }
 *
 * que es el MISMO formato del ApiError del frontend (frontend/js/services/api-error.js): así http.js
 * lo reconstruye tal cual y las páginas no saben si el error vino del mock o del servidor.
 *
 *   status  400 datos inválidos · 401 sin sesión · 403 sin permiso · 404 no existe · 409 conflicto
 *   fields  errores por campo: { numero_documento: 'Ya existe un paciente con ese documento.' }
 *   code    código estable para el programa ('VALIDATION', 'DUPLICATE'…)
 */
export class ApiError extends Error {
  constructor(status, message, { fields = null, code = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
    this.code = code;
  }
}

export const unauthorized = (message = 'Debes iniciar sesión.', code = 'UNAUTHORIZED') => new ApiError(401, message, { code });

export const forbidden = () => new ApiError(403, 'No tienes permiso para realizar esta acción.', { code: 'FORBIDDEN' });
