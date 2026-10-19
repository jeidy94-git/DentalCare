import { API_BASE_URL, HTTP_TIMEOUT_MS } from '../core/config.js';
import { getSession, handleUnauthorized } from '../core/session.js';
import { ApiError } from './api-error.js';

/**
 * Cliente HTTP para la API real (backend/, se usa cuando USE_MOCK = false).
 *  - Agrega el token de la sesión en el encabezado Authorization: Bearer <token>.
 *  - Convierte cualquier respuesta no exitosa en ApiError (mismo formato que el mock).
 *  - Aborta la petición si tarda más de HTTP_TIMEOUT_MS.
 *  - 401 → la sesión ya no sirve: se cierra y el guard redirige al login.
 *
 * Formato de error del backend (backend/src/middlewares/error-handler.js): { status, message, fields, code },
 * el mismo de ApiError: así un 409 de la API marca el campo del formulario igual que el mock.
 */
async function request(method, path, { query, body } = {}) {
  const url = new URL(API_BASE_URL + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  const token = getSession()?.token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const timeout = error.name === 'AbortError';
    throw new ApiError(0, timeout ? 'El servidor tardó demasiado en responder.' : 'No hay conexión con el servidor.', {
      code: timeout ? 'TIMEOUT' : 'NETWORK',
    });
  } finally {
    clearTimeout(timer);
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.ok) return data;

  if (response.status === 401) handleUnauthorized();
  throw new ApiError(response.status, data?.message ?? 'Ocurrió un error en el servidor.', { fields: data?.fields, code: data?.code });
}

export const http = {
  get: (path, query) => request('GET', path, { query }),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  delete: (path) => request('DELETE', path),
};
