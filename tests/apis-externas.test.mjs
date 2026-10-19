// Pruebas de los servicios de APIs externas: colombia.service.js (DIVIPOLA) y trm.service.js (TRM).
// Ejecutar desde la raíz del proyecto:
//   node tests/apis-externas.test.mjs          → con un fetch FALSO (no necesita internet, resultados estables)
//   node tests/apis-externas.test.mjs --live   → además consulta las APIs REALES (prueba de integración)
const base = new URL('../frontend/js/', import.meta.url);
const imp = (p) => import(new URL(p, base).href);

const { createColombiaService, nombrePropio } = await imp('services/colombia.service.js');
const { createTrmService, aUSD } = await imp('services/trm.service.js');
const { fetchJson } = await imp('services/externo.js');
const { DEPARTAMENTOS, MUNICIPIOS } = await imp('data/divipola.js');

const results = [];
const check = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra !== '' ? '  · ' + extra : ''}`);
const err = async (promise) => {
  try {
    await promise;
    return null;
  } catch (e) {
    return e;
  }
};

/** Almacenamiento en memoria con la misma interfaz que core/storage.js. */
const memoryStore = () => {
  const m = new Map();
  return { get: (k, f = null) => (m.has(k) ? JSON.parse(m.get(k)) : f), set: (k, v) => m.set(k, JSON.stringify(v)), remove: (k) => m.delete(k), map: m };
};

/** fetch falso: `handler(url)` devuelve { status, body } o lanza; registra cada llamada. */
const fakeFetch = (handler) => {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url: new URL(url), init });
    const r = await handler(new URL(url), init);
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => (typeof r.body === 'string' ? JSON.parse(r.body) : r.body) };
  };
  fn.calls = calls;
  return fn;
};
const offline = () => fakeFetch(() => Promise.reject(new TypeError('Failed to fetch')));
const clock = (start = Date.UTC(2026, 9, 19, 12)) => {
  let t = start;
  const now = () => t;
  now.advance = (ms) => (t += ms);
  return now;
};
const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

try {
  /* ---------- Utilidades ---------- */
  check('nombrePropio: conectores en minúscula', nombrePropio('SAN JOSÉ DE CÚCUTA') === 'San José de Cúcuta', nombrePropio('SAN JOSÉ DE CÚCUTA'));
  check('nombrePropio: siglas con punto', nombrePropio('BOGOTÁ, D.C.') === 'Bogotá, D.C.', nombrePropio('BOGOTÁ, D.C.'));
  check('aUSD: 1.500.000 COP con TRM 3.000 = 500 USD', aUSD(1500000, 3000) === 500);
  check('aUSD: redondea a centavos', aUSD(1000000, { valor: 3174.67 }) === 314.99, aUSD(1000000, { valor: 3174.67 }));
  check('aUSD: sin TRM → null', aUSD(1000, null) === null);
  check('Respaldo local completo: 33 departamentos', DEPARTAMENTOS.length === 33);
  check('Respaldo local: todos los departamentos tienen municipios', DEPARTAMENTOS.every(([c]) => MUNICIPIOS[c]?.length > 0));
  check('Respaldo local: 1.122 municipios', Object.values(MUNICIPIOS).flat().length === 1122);

  /* ---------- fetchJson ---------- */
  let e = await err(fetchJson('https://x.test/a', { fetch: offline() }));
  check('fetchJson: sin red → ApiError status 0 / NETWORK', e?.status === 0 && e.code === 'NETWORK');
  e = await err(fetchJson('https://x.test/a', { fetch: fakeFetch(() => ({ status: 503, body: {} })) }));
  check('fetchJson: HTTP 503 → ApiError 503 / EXTERNAL', e?.status === 503 && e.code === 'EXTERNAL');
  const lento = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
  let t0 = performance.now();
  e = await err(fetchJson('https://x.test/a', { fetch: lento, timeout: 50 }));
  check('fetchJson: tiempo límite → aborta y lanza TIMEOUT', e?.code === 'TIMEOUT' && performance.now() - t0 < 1000, `${Math.round(performance.now() - t0)} ms`);
  e = await err(fetchJson('https://x.test/a', { fetch: fakeFetch(() => ({ status: 200, body: '<html>' })) }));
  check('fetchJson: respuesta que no es JSON → EXTERNAL', e?.code === 'EXTERNAL');

  /* ---------- colombiaService: camino feliz y caché ---------- */
  const DEPTOS_API = [
    { codigo_departamento: '05', nombre_departamento: 'ANTIOQUIA' },
    { codigo_departamento: '11', nombre_departamento: 'BOGOTÁ, D.C.' },
    { codigo_departamento: '08', nombre_departamento: 'ATLÁNTICO' },
  ];
  let fetch = fakeFetch(() => ({ status: 200, body: DEPTOS_API }));
  let store = memoryStore();
  let now = clock();
  let svc = createColombiaService({ fetch, store, now });
  let r = await svc.departamentos();
  check('departamentos(): origen api', r.origen === 'api');
  check('departamentos(): nombres legibles y ordenados (es)', r.items.map((d) => d.nombre).join('|') === 'Antioquia|Atlántico|Bogotá, D.C.', r.items.map((d) => d.nombre).join('|'));
  const u = fetch.calls[0].url;
  check('Consulta Socrata a datos.gov.co con $select/$order/$limit', u.host === 'www.datos.gov.co' && u.pathname === '/resource/vcjz-niiq.json' && u.searchParams.get('$select') && u.searchParams.get('$limit') === '100');
  check('No envía el token de la sesión a un tercero (sin Authorization)', !fetch.calls[0].init.headers.Authorization && Object.keys(fetch.calls[0].init.headers).join() === 'Accept');
  r = await svc.departamentos();
  check('Segunda consulta: sale de la caché (sin red)', r.origen === 'cache' && fetch.calls.length === 1);
  check('La caché usa el prefijo de storage.js (clave ext:…)', [...store.map.keys()].includes('ext:divipola:departamentos'));

  now.advance(31 * DIA);
  svc = createColombiaService({ fetch: offline(), store, now });
  r = await svc.departamentos();
  check('Caché vencida + sin red → usa la copia vieja (origen cache)', r.origen === 'cache' && r.items.length === 3);

  /* ---------- colombiaService: concurrencia ---------- */
  fetch = fakeFetch(async () => ({ status: 200, body: DEPTOS_API }));
  svc = createColombiaService({ fetch, store: memoryStore(), now: clock() });
  await Promise.all([svc.departamentos(), svc.departamentos(), svc.departamentos()]);
  check('Tres consultas simultáneas → UNA sola petición', fetch.calls.length === 1);

  /* ---------- colombiaService: respaldo local ---------- */
  svc = createColombiaService({ fetch: offline(), store: memoryStore(), now: clock() });
  r = await svc.departamentos();
  check('Sin red y sin caché → respaldo local con 33 departamentos', r.origen === 'local' && r.items.length === 33);
  r = await svc.municipios('05');
  check('municipios("05") sin red → respaldo local con Medellín', r.origen === 'local' && r.items.some((m) => m.nombre === 'Medellín' && m.codigo === '05001'));
  svc = createColombiaService({ fetch: fakeFetch(() => ({ status: 500, body: { message: 'error' } })), store: memoryStore(), now: clock() });
  r = await svc.municipios('76');
  check('HTTP 500 → respaldo local (Valle: Santiago de Cali)', r.origen === 'local' && r.items.some((m) => m.nombre === 'Santiago de Cali'));
  svc = createColombiaService({ fetch: fakeFetch(() => ({ status: 200, body: { error: true } })), store: memoryStore(), now: clock() });
  r = await svc.departamentos();
  check('Respuesta con formato inesperado → respaldo local', r.origen === 'local');
  svc = createColombiaService({ fetch: fakeFetch(() => ({ status: 200, body: [{ codigo_departamento: 'xx', nombre_departamento: '' }] })), store: memoryStore(), now: clock() });
  r = await svc.departamentos();
  check('Filas inválidas descartadas (lista vacía) → respaldo local', r.origen === 'local');
  svc = createColombiaService({ fetch: lento, timeout: 50, store: memoryStore(), now: clock() });
  r = await svc.municipios('11');
  check('API que no responde → tiempo límite y respaldo local (Bogotá)', r.origen === 'local' && r.items.length === 1 && r.items[0].nombre === 'Bogotá, D.C.');

  /* ---------- colombiaService: validación de entrada ---------- */
  fetch = fakeFetch(() => ({ status: 200, body: [{ cod_mpio: '05001', nom_mpio: 'MEDELLÍN' }] }));
  svc = createColombiaService({ fetch, store: memoryStore(), now: clock() });
  e = await err(svc.municipios("05' OR '1'='1"));
  check('Código con inyección SoQL → 400 sin llamar a la API', e?.status === 400 && fetch.calls.length === 0);
  r = await svc.municipios('05');
  check('municipios("05"): filtro $where con el código', fetch.calls[0].url.searchParams.get('$where') === "cod_dpto='05'" && r.items[0].nombre === 'Medellín');
  e = await err(createColombiaService({ fetch: offline(), store: memoryStore() }).municipios('00'));
  check('Departamento inexistente (00) sin red → 404', e?.status === 404);

  /* ---------- trmService ---------- */
  const OFICIAL = [{ valor: '3174.67', vigenciadesde: '2026-10-17T00:00:00.000' }];
  const ER_API = { result: 'success', time_last_update_unix: 1792368152, rates: { COP: 3180.5, USD: 1 } };
  const porHost = (oficial, respaldo) => fakeFetch((url) => (url.host === 'www.datos.gov.co' ? oficial() : respaldo()));
  const falla = () => Promise.reject(new TypeError('Failed to fetch'));

  fetch = porHost(() => ({ status: 200, body: OFICIAL }), falla);
  store = memoryStore();
  now = clock();
  let trm = createTrmService({ fetch, store, now });
  let t = await trm.actual();
  check('TRM oficial (datos.gov.co, dataset 32sa-8pi3)', t.valor === 3174.67 && t.vigenteDesde === '2026-10-17' && t.origen === 'api' && /Superintendencia/.test(t.fuente));
  check('TRM: pide el registro más reciente ($order DESC, $limit 1)', /DESC/.test(fetch.calls[0].url.searchParams.get('$order')) && fetch.calls[0].url.searchParams.get('$limit') === '1');
  t = await trm.actual();
  check('TRM: dentro de la hora → caché, sin red', t.origen === 'cache' && fetch.calls.length === 1);
  now.advance(2 * HORA);
  t = await createTrmService({ fetch: offline(), store, now }).actual();
  check('TRM: caché vencida y sin red → último valor marcado desactualizada', t.valor === 3174.67 && t.desactualizada === true);

  fetch = porHost(falla, () => ({ status: 200, body: ER_API }));
  t = await createTrmService({ fetch, store: memoryStore(), now: clock() }).actual();
  check('TRM: falla la oficial → ExchangeRate-API (respaldo)', t.valor === 3180.5 && t.origen === 'api' && /ExchangeRate/.test(t.fuente) && fetch.calls.length === 2);

  fetch = porHost(() => ({ status: 200, body: [{ valor: '0', vigenciadesde: '2026-10-17' }] }), () => ({ status: 200, body: ER_API }));
  t = await createTrmService({ fetch, store: memoryStore(), now: clock() }).actual();
  check('TRM: valor absurdo (0) se descarta y se usa la otra fuente', t.valor === 3180.5);

  e = await err(createTrmService({ fetch: offline(), store: memoryStore(), now: clock() }).actual());
  check('TRM: sin red y sin caché → error TRM_UNAVAILABLE (no inventa una tasa)', e?.code === 'TRM_UNAVAILABLE' && e.status === 0);

  fetch = porHost(async () => ({ status: 200, body: OFICIAL }), falla);
  trm = createTrmService({ fetch, store: memoryStore(), now: clock() });
  await Promise.all([trm.actual(), trm.actual()]);
  check('TRM: consultas simultáneas comparten una petición', fetch.calls.length === 1);

  /* ---------- Integración con las APIs reales (opcional) ---------- */
  if (process.argv.includes('--live')) {
    const real = createColombiaService({ store: memoryStore(), timeout: 15000 });
    const d = await real.departamentos();
    check('[live] datos.gov.co: 33 departamentos', d.origen === 'api' && d.items.length === 33, d.origen);
    const m = await real.municipios('05');
    check('[live] datos.gov.co: municipios de Antioquia (125)', m.origen === 'api' && m.items.length === 125, `${m.origen} ${m.items.length}`);
    const tr = await createTrmService({ store: memoryStore(), timeout: 15000 }).actual();
    check('[live] TRM real en rango', tr.origen === 'api' && tr.valor > 1000 && tr.valor < 20000, `${tr.valor} · ${tr.vigenteDesde} · ${tr.fuente}`);
    const er = await fetchJson('https://open.er-api.com/v6/latest/USD', { timeout: 15000 });
    check('[live] ExchangeRate-API responde con COP', er.result === 'success' && er.rates.COP > 1000, er.rates?.COP);
  }
} catch (error) {
  check('Excepción no controlada', false, error.stack);
}

console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL'));
console.log(`\nTOTAL ${results.length} · FAILS ${fails.length}`);
process.exitCode = fails.length ? 1 : 0;
