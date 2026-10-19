import { STORAGE_PREFIX } from './config.js';

/**
 * Envoltorio seguro de localStorage.
 *  - Guarda y lee JSON con un prefijo propio ("dentalcare:") para no chocar con otras apps del mismo origen.
 *  - localStorage puede no existir o lanzar error (modo privado, almacenamiento lleno, Node.js en las
 *    pruebas): en ese caso se usa un Map en memoria y la app sigue funcionando (sin persistir).
 */

const memory = new Map();

function backend() {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    const probe = `${STORAGE_PREFIX}__probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
}

const ls = backend();

export const storage = {
  /** true si los datos sobreviven a una recarga (hay localStorage disponible). */
  persistent: Boolean(ls),

  get(key, fallback = null) {
    const raw = ls ? ls.getItem(STORAGE_PREFIX + key) : memory.get(key);
    if (raw === null || raw === undefined) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback; // dato corrupto o editado a mano: se ignora
    }
  },

  /** Lanza un Error si el almacenamiento está lleno (QuotaExceededError): quien escribe decide qué hacer. */
  set(key, value) {
    const raw = JSON.stringify(value);
    if (ls) ls.setItem(STORAGE_PREFIX + key, raw);
    else memory.set(key, raw);
  },

  remove(key) {
    if (ls) ls.removeItem(STORAGE_PREFIX + key);
    else memory.delete(key);
  },

  /**
   * Avisa cuando OTRA pestaña cambia la clave (evento `storage`; la propia pestaña no lo recibe).
   * @returns {() => void} función para dejar de escuchar.
   */
  onChange(key, callback) {
    if (typeof window === 'undefined') return () => {};
    const handler = (event) => {
      if (event.key === null || event.key === STORAGE_PREFIX + key) callback();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  },
};
