import { ApiError } from '../api-error.js';

/**
 * Hash de contraseñas del mock con PBKDF2-SHA256 (Web Crypto, nativo del navegador).
 * Formato guardado: "pbkdf2_sha256$<iteraciones>$<sal base64>$<hash base64>".
 *
 * ¿Por qué no bcrypt? bcrypt no existe nativo en el navegador; PBKDF2 sí, y es un algoritmo
 * "equivalente" aceptado por RNF-SEG-01 (hash lento + sal). El backend (fase C) usará bcrypt.
 * Lo importante en ambos: la contraseña NUNCA se guarda ni se compara en texto plano.
 */

const ITERATIONS = 100000;
const encoder = new TextEncoder();

const toBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

function subtle() {
  const api = globalThis.crypto?.subtle;
  // Web Crypto solo existe en "contextos seguros": https, http://localhost o http://127.0.0.1.
  if (!api) throw new ApiError(500, 'Este navegador no permite cifrado aquí. Abre la app desde http://localhost o http://127.0.0.1.', { code: 'NO_CRYPTO' });
  return api;
}

async function derive(password, salt, iterations) {
  const key = await subtle().importKey('raw', encoder.encode(String(password ?? '')), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

export async function hashPassword(password) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2_sha256$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Compara en tiempo constante: no se corta en el primer byte distinto (evita ataques de tiempo). */
function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(password, stored) {
  const [scheme, iterations, salt, hash] = String(stored ?? '').split('$');
  if (scheme !== 'pbkdf2_sha256' || !salt || !hash) {
    await derive(password, new Uint8Array(16), ITERATIONS);
    return false;
  }
  return sameBytes(await derive(password, fromBase64(salt), Number(iterations)), fromBase64(hash));
}

/**
 * Cuando el correo no existe se hace igual el cálculo costoso: así la respuesta tarda lo mismo
 * y nadie puede deducir qué correos están registrados midiendo el tiempo (enumeración de usuarios).
 */
export const fakeVerify = (password) => verifyPassword(password, '');
