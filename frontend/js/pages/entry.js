/**
 * index.html — punto de entrada. No dibuja nada: con sesión vigente va al inicio del rol; sin sesión, al login.
 * `replace` evita que esta página intermedia quede en el historial.
 */
import { getSession } from '../core/session.js';
import { homeFor, loginUrl } from '../core/guard.js';

const session = getSession();
location.replace(session ? homeFor(session.user.rol) : loginUrl());
