import { ApiError } from './api-error.js';
import { fetchJson, createCache } from './externo.js';

/**
 * Tasa Representativa del Mercado (TRM): cuántos pesos colombianos vale 1 dólar estadounidense.
 *
 *   actual()          → { valor: 3174.67, vigenteDesde: '2026-10-17', fuente, origen, desactualizada }
 *   aUSD(cop, trm)    → 1500000 / 3174.67 = 472.49 (dólares, redondeado a centavos)
 *
 * Fuentes, en orden:
 *   1. TRM OFICIAL certificada por la Superintendencia Financiera (Datos Abiertos, datos.gov.co).
 *   2. ExchangeRate-API (open.er-api.com): tasa de mercado, por si la primera no responde.
 *   3. Última TRM guardada en caché, aunque esté vencida (marcada `desactualizada: true`).
 * Si no hay ninguna, se LANZA el error: con dinero no se inventa una tasa "de respaldo".
 */

const URL_TRM_OFICIAL = 'https://www.datos.gov.co/resource/32sa-8pi3.json?$select=valor,vigenciadesde&$order=vigenciadesde%20DESC&$limit=1';
const URL_RESPALDO = 'https://open.er-api.com/v6/latest/USD';
const CACHE_KEY = 'ext:trm';

/** La TRM cambia una vez al día: se vuelve a consultar como mucho cada hora. */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** Rango sensato del dólar en pesos: descarta respuestas absurdas (0, negativos, otra moneda…). */
const RANGO_VALIDO = { min: 1000, max: 20000 };

function validarValor(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < RANGO_VALIDO.min || n > RANGO_VALIDO.max) {
    throw new ApiError(502, 'La tasa recibida no es válida.', { code: 'EXTERNAL' });
  }
  return Math.round(n * 100) / 100;
}

const FUENTES = [
  {
    nombre: 'Superintendencia Financiera · datos.gov.co',
    url: URL_TRM_OFICIAL,
    leer: (rows) => {
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) throw new ApiError(502, 'datos.gov.co no devolvió la TRM.', { code: 'EXTERNAL' });
      return { valor: validarValor(row.valor), vigenteDesde: String(row.vigenciadesde ?? '').slice(0, 10) };
    },
  },
  {
    nombre: 'ExchangeRate-API (tasa de mercado)',
    url: URL_RESPALDO,
    leer: (data) => {
      if (data?.result !== 'success') throw new ApiError(502, 'ExchangeRate-API no devolvió la tasa.', { code: 'EXTERNAL' });
      const fecha = new Date(Number(data.time_last_update_unix) * 1000);
      return { valor: validarValor(data.rates?.COP), vigenteDesde: Number.isNaN(fecha.getTime()) ? '' : fecha.toISOString().slice(0, 10) };
    },
  },
];

/** COP → USD, redondeado a centavos. */
export function aUSD(cop, trm) {
  const valor = typeof trm === 'number' ? trm : trm?.valor;
  if (!valor) return null;
  return Math.round((Number(cop) / valor) * 100) / 100;
}

/** Fábrica del servicio (las pruebas inyectan fetch, almacenamiento y reloj). */
export function createTrmService({ fetch, store, now, timeout } = {}) {
  const cache = createCache({ store, now, ttl: CACHE_TTL_MS });
  let enCurso = null;

  async function consultar() {
    const cached = cache.read(CACHE_KEY);
    if (cached?.fresh) return { ...cached.value, origen: 'cache', desactualizada: false };

    for (const fuente of FUENTES) {
      try {
        const trm = { ...fuente.leer(await fetchJson(fuente.url, { fetch, timeout })), fuente: fuente.nombre };
        cache.write(CACHE_KEY, trm);
        return { ...trm, origen: 'api', desactualizada: false };
      } catch {
        // Falló esta fuente: se intenta la siguiente.
      }
    }
    if (cached) return { ...cached.value, origen: 'cache', desactualizada: true };
    throw new ApiError(0, 'No se pudo consultar la TRM. Revisa la conexión a internet.', { code: 'TRM_UNAVAILABLE' });
  }

  return {
    actual() {
      enCurso ??= consultar().finally(() => (enCurso = null));
      return enCurso;
    },
    aUSD,
  };
}

export const trmService = createTrmService();
