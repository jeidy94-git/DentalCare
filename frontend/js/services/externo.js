import { storage } from '../core/storage.js';
import { ApiError } from './api-error.js';

/**
 * Utilidades para consumir APIs PÚBLICAS de terceros (datos.gov.co, ExchangeRate-API).
 *
 * No se usa http.js a propósito: ese cliente agrega el token de NUESTRA sesión (Authorization: Bearer …)
 * y cierra la sesión ante un 401. Enviar el token a un servidor ajeno sería filtrarlo, y un 401 de un
 * tercero no significa que la sesión del consultorio haya vencido.
 *
 * Resiliencia (de la más rápida a la de último recurso):
 *   1. Caché vigente en localStorage   → no se llama a la red.
 *   2. Red con tiempo límite            → respuesta validada y guardada en caché.
 *   3. Caché vencida                    → mejor un dato viejo (y avisado) que nada.
 *   4. Respaldo local (lo decide cada servicio).
 */

/** Tiempo máximo de espera de una API externa: más corto que el del backend propio. */
export const EXTERNAL_TIMEOUT_MS = 6000;

/**
 * GET a una API externa y devuelve el JSON.
 * Lanza ApiError con status 0 (code NETWORK | TIMEOUT) si no hay respuesta, o con el status HTTP si la
 * respuesta no es exitosa o no es JSON (code EXTERNAL).
 *
 * @param {string|URL} url
 * @param {{ fetch?: Function, timeout?: number }} [options]  `fetch` se puede reemplazar en las pruebas.
 */
export async function fetchJson(url, { fetch: fetchImpl = (...args) => globalThis.fetch(...args), timeout = EXTERNAL_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let response;
  try {
    // Petición "simple" (solo Accept): el navegador no necesita una petición previa OPTIONS (preflight CORS).
    response = await fetchImpl(String(url), { headers: { Accept: 'application/json' }, signal: controller.signal });
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    throw new ApiError(0, isTimeout ? 'El servicio externo tardó demasiado en responder.' : 'No hay conexión con el servicio externo.', { code: isTimeout ? 'TIMEOUT' : 'NETWORK' });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new ApiError(response.status, `El servicio externo respondió con error ${response.status}.`, { code: 'EXTERNAL' });
  try {
    return await response.json();
  } catch {
    throw new ApiError(response.status, 'El servicio externo devolvió una respuesta que no es JSON.', { code: 'EXTERNAL' });
  }
}

/**
 * Caché con fecha de guardado sobre storage.js (prefijo "dentalcare:", respaldo en memoria).
 *   read(key)  → { value, savedAt, fresh } | null
 */
export function createCache({ store = storage, ttl, now = () => Date.now() }) {
  return {
    read(key) {
      const entry = store.get(key);
      if (!entry || typeof entry.savedAt !== 'number' || entry.value === undefined) return null;
      return { value: entry.value, savedAt: entry.savedAt, fresh: now() - entry.savedAt < ttl };
    },
    write(key, value) {
      try {
        store.set(key, { savedAt: now(), value });
      } catch {
        // Almacenamiento lleno: la consulta igual funcionó, solo que no queda guardada.
      }
    },
  };
}
