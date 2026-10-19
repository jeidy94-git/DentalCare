import { ApiError } from './api-error.js';
import { fetchJson, createCache } from './externo.js';

/**
 * Departamentos y municipios de Colombia (DIVIPOLA del DANE) desde Datos Abiertos (datos.gov.co, Socrata).
 *
 *   departamentos()        → { items: [{ codigo: '05', nombre: 'Antioquia' }, …], origen }
 *   municipios('05')       → { items: [{ codigo: '05001', nombre: 'Medellín' }, …], origen }
 *
 * `origen` dice de dónde salió la lista: 'api' (recién consultada), 'cache' (copia guardada) o
 * 'local' (respaldo incluido en el código, js/data/divipola.js). Nunca falla por falta de internet.
 *
 * No depende de USE_MOCK: es un servicio REAL de un tercero, igual con el mock que con el backend.
 */

const SOCRATA = 'https://www.datos.gov.co/resource/';
const DATASET_DEPARTAMENTOS = 'vcjz-niiq'; // DIVIPOLA - Códigos departamentos
const DATASET_MUNICIPIOS = 'gdxc-w37w'; // DIVIPOLA - Códigos municipios

/** La división territorial casi no cambia: la copia se considera vigente 30 días. */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const CODIGO_DEPARTAMENTO = /^\d{2}$/;
const CODIGO_MUNICIPIO = /^\d{5}$/;
const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en']);

/** "SAN JOSÉ DE CÚCUTA" → "San José de Cúcuta"; "BOGOTÁ, D.C." → "Bogotá, D.C." (la API los trae en mayúsculas). */
export function nombrePropio(texto = '') {
  return String(texto)
    .trim()
    .toLocaleLowerCase('es')
    .split(/\s+/)
    .map((word, i) => {
      if (i > 0 && CONECTORES.has(word)) return word;
      if (word.includes('.')) return word.toLocaleUpperCase('es'); // siglas: D.C.
      return word.replace(/^(\(?)(\p{L})/u, (_, paren, letter) => paren + letter.toLocaleUpperCase('es'));
    })
    .join(' ');
}

/** Los datos de un tercero no son confiables: se descartan filas mal formadas y se ordena por nombre. */
function normalizar(rows, codeKey, nameKey, pattern) {
  if (!Array.isArray(rows)) throw new ApiError(502, 'La respuesta de datos.gov.co no tiene el formato esperado.', { code: 'EXTERNAL' });
  const items = rows
    .map((row) => ({ codigo: String(row?.[codeKey] ?? ''), nombre: nombrePropio(row?.[nameKey]) }))
    .filter((item) => pattern.test(item.codigo) && item.nombre)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  if (!items.length) throw new ApiError(502, 'datos.gov.co no devolvió registros.', { code: 'EXTERNAL' });
  return items;
}

/** URL de consulta SoQL: los parámetros van codificados con URLSearchParams, nunca concatenados a mano. */
function socrataUrl(dataset, params) {
  const url = new URL(`${SOCRATA}${dataset}.json`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url;
}

/**
 * Fábrica del servicio: las pruebas inyectan un `fetch` falso, un almacenamiento propio y un reloj.
 * La app usa la instancia `colombiaService` de abajo.
 */
export function createColombiaService({ fetch, store, now, timeout } = {}) {
  const cache = createCache({ store, now, ttl: CACHE_TTL_MS });
  const enCurso = new Map(); // dos selects que piden lo mismo a la vez comparten UNA petición

  // Respaldo local con import() dinámico: sus ~26 KB solo se descargan si de verdad hacen falta.
  const respaldo = () => import('../data/divipola.js');

  async function consultar(key, { url, map, local }) {
    const cached = cache.read(key);
    if (cached?.fresh) return { items: cached.value, origen: 'cache' };
    try {
      const items = map(await fetchJson(url, { fetch, timeout }));
      cache.write(key, items);
      return { items, origen: 'api' };
    } catch {
      if (cached) return { items: cached.value, origen: 'cache' };
      return { items: await local(), origen: 'local' };
    }
  }

  function compartida(key, task) {
    if (!enCurso.has(key)) enCurso.set(key, task().finally(() => enCurso.delete(key)));
    return enCurso.get(key);
  }

  return {
    departamentos: () =>
      compartida('ext:divipola:departamentos', () =>
        consultar('ext:divipola:departamentos', {
          url: socrataUrl(DATASET_DEPARTAMENTOS, { $select: 'codigo_departamento,nombre_departamento', $order: 'nombre_departamento', $limit: '100' }),
          map: (rows) => normalizar(rows, 'codigo_departamento', 'nombre_departamento', CODIGO_DEPARTAMENTO),
          local: async () => normalizar((await respaldo()).DEPARTAMENTOS.map(([codigo, nombre]) => ({ codigo, nombre })), 'codigo', 'nombre', CODIGO_DEPARTAMENTO),
        }),
      ),

    async municipios(codigoDepartamento) {
      const codigo = String(codigoDepartamento ?? '');
      // El código viaja dentro de un filtro $where: si no son exactamente 2 dígitos, ni se consulta
      // (evita "inyección SoQL", el equivalente a la inyección SQL en esta API).
      if (!CODIGO_DEPARTAMENTO.test(codigo)) throw new ApiError(400, 'Código de departamento no válido.', { code: 'VALIDATION' });
      const key = `ext:divipola:municipios:${codigo}`;
      return compartida(key, () =>
        consultar(key, {
          url: socrataUrl(DATASET_MUNICIPIOS, { $select: 'cod_mpio,nom_mpio', $where: `cod_dpto='${codigo}'`, $order: 'nom_mpio', $limit: '1000' }),
          map: (rows) => normalizar(rows, 'cod_mpio', 'nom_mpio', CODIGO_MUNICIPIO),
          local: async () => {
            const rows = (await respaldo()).MUNICIPIOS[codigo];
            if (!rows) throw new ApiError(404, 'No se encontró el departamento.', { code: 'NOT_FOUND' });
            return normalizar(rows.map(([c, nombre]) => ({ codigo: c, nombre })), 'codigo', 'nombre', CODIGO_MUNICIPIO);
          },
        }),
      );
    },
  };
}

export const colombiaService = createColombiaService();
