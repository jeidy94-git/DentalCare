/**
 * Matriz de permisos por rol (RF-ROL-07, RN-01).
 *
 * Los nombres de los 6 primeros permisos son los de la tabla `permiso` del seed. La asignación NO copia
 * `rol_permiso` del seed porque contradice el SRS (la recepcionista podía editar historias, contra RN-01;
 * el especialista podía registrar pagos y no podía ver historias). Corrección documentada para la Fase B.
 *
 * Los servicios usan `can()` para autorizar cada operación; las páginas lo usarán para mostrar u ocultar
 * botones. Ocultar un botón NO es seguridad: la decisión real la toma el servicio (y en la fase C, la API).
 */

export const PERMISOS = {
  CREAR_CITA: 'CREAR_CITA',
  CANCELAR_CITA: 'CANCELAR_CITA',
  VER_HISTORIA_CLINICA: 'VER_HISTORIA_CLINICA',
  EDITAR_HISTORIA_CLINICA: 'EDITAR_HISTORIA_CLINICA',
  GESTIONAR_USUARIOS: 'GESTIONAR_USUARIOS',
  REGISTRAR_PAGO: 'REGISTRAR_PAGO',
  // Agregados para cubrir el SRS (se insertarán en la tabla `permiso` en la Fase B)
  GESTIONAR_PACIENTES: 'GESTIONAR_PACIENTES',
  GESTIONAR_SERVICIOS: 'GESTIONAR_SERVICIOS',
  GESTIONAR_ESPECIALISTAS: 'GESTIONAR_ESPECIALISTAS',
  REGISTRAR_NOVEDAD: 'REGISTRAR_NOVEDAD',
  GESTIONAR_NOVEDADES: 'GESTIONAR_NOVEDADES',
};

const P = PERMISOS;

export const PERMISOS_POR_ROL = {
  ADMINISTRADOR: Object.values(P),
  RECEPCIONISTA: [P.CREAR_CITA, P.CANCELAR_CITA, P.GESTIONAR_PACIENTES, P.REGISTRAR_PAGO, P.REGISTRAR_NOVEDAD],
  ESPECIALISTA: [P.CREAR_CITA, P.CANCELAR_CITA, P.VER_HISTORIA_CLINICA, P.EDITAR_HISTORIA_CLINICA, P.REGISTRAR_NOVEDAD],
  // El paciente solo actúa sobre SUS datos: esa restricción la aplica cada servicio.
  PACIENTE: [P.CREAR_CITA, P.CANCELAR_CITA],
};

/** ¿El usuario (o el rol) tiene el permiso? can(user, 'REGISTRAR_PAGO') */
export function can(userOrRole, permiso) {
  const rol = typeof userOrRole === 'string' ? userOrRole : userOrRole?.rol;
  return (PERMISOS_POR_ROL[rol] ?? []).includes(permiso);
}
