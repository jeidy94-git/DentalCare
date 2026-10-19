import { ApiError } from './api-error.js';

/**
 * Validación del lado del servidor. Son las MISMAS reglas y mensajes de frontend/js/core/validators.js:
 * el formulario las aplica para ayudar al usuario, pero cualquiera puede saltárselo (Postman, consola
 * del navegador). El servidor nunca confía en lo que validó el cliente.
 *
 * Cada regla es (valor) => mensaje | null. Las reglas de formato ignoran los vacíos: lo obligatorio
 * se controla solo con `requerido()`, igual que en el frontend.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FECHA_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const vacio = (value) => value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

const pad = (n) => String(n).padStart(2, '0');

/** Fecha local de hoy como 'AAAA-MM-DD' (la del consultorio, no la UTC). */
export function hoyIso(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const reglas = {
  requerido: (mensaje = 'Este campo es obligatorio.') => (value) => (vacio(value) ? mensaje : null),

  /** Debe ser texto (no número, lista u objeto) y no pasar de `max` caracteres (el tamaño de la columna). */
  texto: (max) => (value) => {
    if (vacio(value)) return null;
    if (typeof value !== 'string') return 'El valor debe ser texto.';
    return value.trim().length > max ? `Máximo ${max} caracteres.` : null;
  },

  email: (mensaje = 'Ingresa un correo electrónico válido.') => (value) => (vacio(value) || EMAIL_RE.test(value.trim()) ? null : mensaje),

  patron: (regex, mensaje = 'El formato no es válido.') => (value) => (vacio(value) || regex.test(value.trim()) ? null : mensaje),

  documento: () => reglas.patron(/^\d{6,12}$/, 'Solo números, entre 6 y 12 dígitos.'),

  /** Celular colombiano: 10 dígitos iniciando en 3. */
  telefono: () => reglas.patron(/^3\d{9}$/, 'Ingresa un celular de 10 dígitos que inicie en 3.'),

  unoDe: (opciones, mensaje) => (value) => (vacio(value) || opciones.includes(value.trim()) ? null : mensaje),

  /** 'AAAA-MM-DD' que exista en el calendario (rechaza 2026-02-30) y no sea futura. */
  fechaPasada: (mensaje = 'La fecha no puede ser futura.') => (value) => {
    if (vacio(value)) return null;
    const match = FECHA_RE.exec(value.trim());
    const fecha = match && new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
    if (!fecha || fecha.getUTCMonth() !== +match[2] - 1 || fecha.getUTCDate() !== +match[3] || +match[1] < 1900) return 'Ingresa una fecha válida.';
    return value.trim() > hoyIso() ? mensaje : null;
  },
};

/**
 * Aplica las reglas campo por campo y lanza 400 con TODOS los errores a la vez (no solo el primero),
 * en el mismo formato del mock: { fields: { campo: mensaje } }. Así el formulario marca cada campo.
 * @param {object} data
 * @param {Record<string, Array<(value: any) => string|null>>} esquema
 * @param {(data: object, fields: object) => object} [extra] reglas que miran varios campos a la vez;
 *        recibe los errores ya encontrados y devuelve los suyos.
 */
export function validar(data, esquema, extra) {
  const fields = {};
  for (const [campo, lista] of Object.entries(esquema)) {
    for (const regla of lista) {
      const mensaje = regla(data[campo]);
      if (mensaje) {
        fields[campo] = mensaje;
        break; // por campo, solo el primer error
      }
    }
  }
  if (extra) Object.assign(fields, extra(data, fields));
  if (Object.keys(fields).length) throw new ApiError(400, 'Revisa los datos marcados.', { fields, code: 'VALIDATION' });
}

/**
 * Copia SOLO las columnas permitidas y recorta los espacios. Lo demás que mande el cliente
 * (id_paciente, id_usuario, fecha_registro…) se ignora: así nadie asigna campos que no le tocan
 * (asignación masiva, OWASP A08).
 */
export function pick(data, campos) {
  return Object.fromEntries(campos.filter((campo) => data?.[campo] !== undefined).map((campo) => [campo, typeof data[campo] === 'string' ? data[campo].trim() : data[campo]]));
}
