/**
 * Validadores reutilizables para la validación en línea (SRS 3.1).
 * Cada fábrica devuelve una función `(value, control) => string | null`:
 * null = válido; string = mensaje de error que se muestra junto al campo.
 *
 * Los validadores de formato ignoran valores vacíos: la obligatoriedad
 * se controla solo con `validators.required()`.
 */

import { toISODate } from './dates.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const isEmpty = (value) => value === null || value === undefined || String(value).trim() === '';

export const validators = {
  required: (message = 'Este campo es obligatorio.') => (value) =>
    value === false || isEmpty(value) ? message : null,

  email: (message = 'Ingresa un correo electrónico válido.') => (value) =>
    isEmpty(value) || EMAIL_RE.test(String(value).trim()) ? null : message,

  minLength: (min, message) => (value) =>
    isEmpty(value) || String(value).length >= min ? null : message ?? `Debe tener al menos ${min} caracteres.`,

  maxLength: (max, message) => (value) =>
    isEmpty(value) || String(value).length <= max ? null : message ?? `Máximo ${max} caracteres.`,

  pattern: (regex, message = 'El formato no es válido.') => (value) =>
    isEmpty(value) || regex.test(String(value).trim()) ? null : message,

  /** paciente.numero_documento / personal.numero_documento */
  documento: (message = 'Solo números, entre 6 y 12 dígitos.') => validators.pattern(/^\d{6,12}$/, message),

  /** Celular colombiano: 10 dígitos iniciando en 3. */
  telefono: (message = 'Ingresa un celular de 10 dígitos que inicie en 3.') => validators.pattern(/^3\d{9}$/, message),

  /** Contraseña robusta (RNF-SEG-01 complementa con hash bcrypt en el backend). */
  password: (message = 'Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.') =>
    validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/, message),

  /** Para fechas de citas: no se permite agendar en el pasado. */
  dateNotPast: (message = 'La fecha no puede ser anterior a hoy.') => (value) =>
    isEmpty(value) || value >= toISODate() ? null : message,

  /** Confirmación de campos (p. ej. repetir contraseña). `getOther` devuelve el valor a comparar. */
  matches: (getOther, message = 'Los valores no coinciden.') => (value) =>
    isEmpty(value) || value === getOther() ? null : message,
};

/** Combina validadores: devuelve el primer mensaje de error encontrado. */
export function compose(...rules) {
  const list = rules.flat().filter(Boolean);
  return (value, control) => {
    for (const rule of list) {
      const message = rule(value, control);
      if (message) return message;
    }
    return null;
  };
}
