/**
 * Error único de la capa de servicios. Lo lanzan IGUAL el mock y el cliente HTTP, así las páginas
 * manejan los errores de una sola forma sin saber de dónde vienen los datos.
 *
 *   status  0 = sin conexión · 400 datos inválidos · 401 sin sesión · 403 sin permiso
 *           404 no existe · 409 conflicto (duplicado, horario ocupado…) · 422 regla de negocio
 *   fields  errores por campo: { numero_documento: 'Ya existe un paciente con ese documento.' }
 *   code    código estable para el programa (p. ej. 'SLOT_TAKEN'), útil en el log (RNF-SEG-02)
 */
export class ApiError extends Error {
  constructor(status, message, { fields = null, code = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
    this.code = code;
  }

  /** Primer error de campo como [campo, mensaje] (para mostrarlo junto al input con FieldError). */
  firstField() {
    const entry = this.fields ? Object.entries(this.fields)[0] : null;
    return entry ?? null;
  }
}

export const isApiError = (error) => error instanceof ApiError;
