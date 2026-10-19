/**
 * Nombres de la tabla `permiso` (B-03 de database/CAMBIOS.md). Son constantes para no escribir el
 * texto a mano en cada ruta: un error de tipeo sería un 403 difícil de encontrar.
 *
 * QUÉ rol tiene cada permiso NO está aquí: se lee de `rol_permiso` en cada petición (middlewares/auth.js).
 * La matriz del frontend (frontend/js/core/permissions.js) es la misma y solo decide qué botones mostrar.
 */
export const PERMISOS = Object.freeze({
  CREAR_CITA: 'CREAR_CITA',
  CANCELAR_CITA: 'CANCELAR_CITA',
  VER_HISTORIA_CLINICA: 'VER_HISTORIA_CLINICA',
  EDITAR_HISTORIA_CLINICA: 'EDITAR_HISTORIA_CLINICA',
  GESTIONAR_USUARIOS: 'GESTIONAR_USUARIOS',
  REGISTRAR_PAGO: 'REGISTRAR_PAGO',
  GESTIONAR_PACIENTES: 'GESTIONAR_PACIENTES',
  GESTIONAR_SERVICIOS: 'GESTIONAR_SERVICIOS',
  GESTIONAR_ESPECIALISTAS: 'GESTIONAR_ESPECIALISTAS',
  REGISTRAR_NOVEDAD: 'REGISTRAR_NOVEDAD',
  GESTIONAR_NOVEDADES: 'GESTIONAR_NOVEDADES',
});

/**
 * ¿La sesión tiene ALGUNO de estos permisos? `sesion` es { user, permisos }, lo que verifyToken
 * dejó en la petición (los permisos vienen de rol_permiso, no del token).
 */
export const puede = (sesion, ...permisos) => permisos.some((permiso) => sesion.permisos?.includes(permiso));
