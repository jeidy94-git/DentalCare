import { DEPARTAMENTOS, MUNICIPIOS } from '../data/divipola.js';
import { vacio } from './validators.js';

/**
 * Departamento y municipio del paciente (B-04, API DIVIPOLA).
 *
 * El formulario los elige de una lista, pero la API recibe texto libre: alguien podría guardar
 * "Antioquia" con el municipio "Cali", o un departamento inventado. Aquí se comprueba contra la
 * DIVIPOLA. Se compara sin distinguir mayúsculas porque el frontend muestra "Medellín" y el DANE
 * escribe "MEDELLÍN"; las tildes sí cuentan (son parte del nombre oficial).
 */

const clave = (nombre) => nombre.trim().normalize('NFC').toLocaleUpperCase('es-CO');

/** "ANTIOQUIA" → "05" */
const CODIGO_POR_DEPARTAMENTO = new Map(DEPARTAMENTOS.map(([codigo, nombre]) => [clave(nombre), codigo]));

/** "05" → Set { "MEDELLÍN", "ABEJORRAL", … } */
const MUNICIPIOS_POR_CODIGO = new Map(Object.entries(MUNICIPIOS).map(([codigo, lista]) => [codigo, new Set(lista.map(([, nombre]) => clave(nombre)))]));

/**
 * Errores por campo de la ubicación ({} si está bien). Ambos son opcionales, pero:
 *  - el departamento debe existir;
 *  - no hay municipio sin departamento, y el municipio debe pertenecer a ESE departamento.
 * Supone que ya se comprobó que son texto (reglas.texto).
 */
export function erroresUbicacion({ departamento, municipio }) {
  const fields = {};
  const codigo = vacio(departamento) ? null : CODIGO_POR_DEPARTAMENTO.get(clave(departamento));

  if (!vacio(departamento) && !codigo) fields.departamento = 'Elige un departamento de la lista.';
  if (!vacio(municipio)) {
    if (vacio(departamento)) fields.municipio = 'Elige primero el departamento.';
    else if (codigo && !MUNICIPIOS_POR_CODIGO.get(codigo)?.has(clave(municipio))) fields.municipio = 'El municipio no pertenece al departamento elegido.';
  }
  return fields;
}
