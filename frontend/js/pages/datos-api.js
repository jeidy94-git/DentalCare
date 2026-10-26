import { API_BASE_URL, STORAGE_PREFIX } from '../core/config.js';

/**
 * datos-api.html: lee GET /api/pacientes y GET /api/servicios con fetch directo (sin la capa de
 * servicios ni USE_MOCK) y los pinta en dos tablas al cargar la página.
 *
 * Las dos rutas exigen JWT. El token se guarda en sessionStorage (se borra al cerrar la pestaña): si ya
 * existe, las tablas se cargan solas; si no, o si venció (401), se muestra el formulario de ingreso.
 */

const TOKEN_KEY = `${STORAGE_PREFIX}api-token`;

const $ = (id) => document.getElementById(id);
const estado = $('estado');
const login = $('login');

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function leerToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function guardarToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sin almacenamiento: el token solo dura esta carga */
  }
}

function mostrarEstado(texto, error = false) {
  estado.textContent = texto;
  estado.classList.toggle('is-error', error);
}

/** GET con el token; lanza un Error con el mensaje del backend ({ status, message }) si no es 2xx. */
async function getJson(path, token) {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.message ?? `Error ${res.status}`), { status: res.status });
  return data;
}

/** Fila de tabla con textContent (nunca innerHTML con datos de la base: evita XSS). */
function fila(celdas) {
  const tr = document.createElement('tr');
  for (const { texto, clase } of celdas) {
    const td = document.createElement('td');
    td.textContent = texto ?? '—';
    if (clase) td.className = clase;
    tr.append(td);
  }
  return tr;
}

function pintarPacientes(pacientes) {
  $('total-pacientes').textContent = `(${pacientes.length})`;
  $('tabla-pacientes').replaceChildren(
    ...pacientes.map((p) =>
      fila([
        { texto: p.id_paciente },
        { texto: `${p.tipo_documento} ${p.numero_documento}` },
        { texto: `${p.nombres} ${p.apellidos}` },
        { texto: p.fecha_nacimiento },
        { texto: p.telefono },
        { texto: p.email },
        { texto: p.eps_aseguradora },
      ]),
    ),
  );
}

function pintarServicios(servicios) {
  $('total-servicios').textContent = `(${servicios.length})`;
  $('tabla-servicios').replaceChildren(
    ...servicios.map((s) =>
      fila([
        { texto: s.codigo_servicio },
        { texto: s.nombre_servicio },
        { texto: s.descripcion },
        { texto: pesos.format(s.precio_base), clase: 'is-right' },
        { texto: s.estado },
      ]),
    ),
  );
}

async function cargar(token) {
  mostrarEstado('Cargando…');
  try {
    // Las dos peticiones salen en paralelo.
    const [pacientes, servicios] = await Promise.all([getJson('/pacientes', token), getJson('/servicios', token)]);
    pintarPacientes(pacientes);
    pintarServicios(servicios);
    login.hidden = true;
    mostrarEstado(`Datos cargados de ${API_BASE_URL}.`);
  } catch (error) {
    if (error.status === 401) {
      guardarToken(null);
      login.hidden = false;
      mostrarEstado('La sesión venció. Ingresa de nuevo.', true);
    } else {
      mostrarEstado(error instanceof TypeError ? 'No hay conexión con la API (¿npm start en backend/?).' : error.message, true);
    }
  }
}

login.addEventListener('submit', async (event) => {
  event.preventDefault();
  const { email, password } = Object.fromEntries(new FormData(login));
  mostrarEstado('Ingresando…');
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return mostrarEstado(data?.message ?? `Error ${res.status}`, true);
    guardarToken(data.token);
    await cargar(data.token);
  } catch {
    mostrarEstado('No hay conexión con la API (¿npm start en backend/?).', true);
  }
});

const token = leerToken();
if (token) cargar(token);
else {
  login.hidden = false;
  mostrarEstado('Ingresa para cargar los datos.');
}
