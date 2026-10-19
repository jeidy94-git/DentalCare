import { h } from '../../core/dom.js';
import { validators } from '../../core/validators.js';
import { FormField } from '../molecules/index.js';

export const TIPOS_DOCUMENTO = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PA', label: 'Pasaporte' },
];

/**
 * Campos mínimos para el alta rápida de un paciente (RF-CIT-02).
 * Los nombres coinciden con las columnas de la tabla `paciente`.
 * @param {object} [initial]  Valores iniciales (para edición).
 */
export function patientQuickFields(initial = {}) {
  return h(
    'div',
    { class: 'form-grid' },
    FormField({ label: 'Nombres', name: 'nombres', required: true, value: initial.nombres, autocomplete: 'off', validate: validators.maxLength(100) }),
    FormField({ label: 'Apellidos', name: 'apellidos', required: true, value: initial.apellidos, autocomplete: 'off', validate: validators.maxLength(100) }),
    FormField({ label: 'Tipo de documento', name: 'tipo_documento', as: 'select', required: true, placeholder: 'Seleccione…', value: initial.tipo_documento, options: TIPOS_DOCUMENTO }),
    FormField({ label: 'Número de documento', name: 'numero_documento', required: true, inputmode: 'numeric', value: initial.numero_documento, validate: validators.documento() }),
    FormField({ label: 'Fecha de nacimiento', name: 'fecha_nacimiento', type: 'date', required: true, value: initial.fecha_nacimiento }),
    FormField({
      label: 'Género',
      name: 'genero',
      as: 'select',
      required: true,
      placeholder: 'Seleccione…',
      value: initial.genero,
      options: [
        { value: 'FEMENINO', label: 'Femenino' },
        { value: 'MASCULINO', label: 'Masculino' },
        { value: 'OTRO', label: 'Otro' },
      ],
    }),
    FormField({ label: 'Celular', name: 'telefono', type: 'tel', required: true, inputmode: 'numeric', value: initial.telefono, validate: validators.telefono() }),
    FormField({ label: 'Correo electrónico', name: 'email', type: 'email', optional: true, value: initial.email, validate: validators.email() }),
  );
}
