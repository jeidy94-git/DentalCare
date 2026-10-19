/**
 * Usuarios de demostración por rol (tabla `usuario` + `personal`/`paciente` del seed)
 * y notificaciones basadas en eventos de `log_auditoria`.
 * Desde la Fase A5 el login real usa auth.service (contraseñas verificadas contra el hash de seguridad.js);
 * USUARIOS_DEMO se mantiene para las demos del styleguide.
 */
export const USUARIOS_DEMO = {
  ADMINISTRADOR: { id_usuario: 1, rol: 'ADMINISTRADOR', nombre: 'Laura Gómez', email: 'admin@dentalcare.com', cargo: 'Administradora' },
  RECEPCIONISTA: { id_usuario: 2, rol: 'RECEPCIONISTA', nombre: 'Carlos Pérez', email: 'recepcion@dentalcare.com', cargo: 'Recepcionista' },
  ESPECIALISTA: { id_usuario: 3, rol: 'ESPECIALISTA', nombre: 'Dr. Roberto Martínez', email: 'dr.roberto@dentalcare.com', cargo: 'Odontólogo General', id_especialista: 1 },
  PACIENTE: { id_usuario: 16, rol: 'PACIENTE', nombre: 'Andrés Galvis', email: 'andres.galvis@gmail.com', cargo: 'Paciente', id_paciente: 11 },
};

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000);

export const NOTIFICACIONES_DEMO = [
  { id: 1, tipo: 'warning', titulo: 'Cita cancelada', mensaje: 'Carolina Villa canceló su cita de ortodoncia.', fecha: hoursAgo(0.4), leida: false },
  { id: 2, tipo: 'info', titulo: 'Solicitud de cita', mensaje: 'Mateo Londoño solicitó una cita (pendiente de confirmación).', fecha: hoursAgo(2), leida: false },
  { id: 3, tipo: 'success', titulo: 'Pago registrado', mensaje: 'Abono de $ 150.000 a la venta #5.', fecha: hoursAgo(5), leida: false },
  { id: 4, tipo: 'info', titulo: 'Novedad operativa', mensaje: 'Falla técnica en lámpara de fotocurado (Consultorio 1).', fecha: hoursAgo(26), leida: true },
];

/**
 * Credenciales de los 4 usuarios de prueba (una por rol), tal como están en el seed.
 * Solo para la pantalla de login en modo demo: en la "base de datos" mock se guarda únicamente el hash.
 */
export const CREDENCIALES_DEMO = [
  { rol: 'ADMINISTRADOR', email: 'admin@dentalcare.com', password: 'Admin2026*' },
  { rol: 'RECEPCIONISTA', email: 'recepcion@dentalcare.com', password: 'Recep2026*' },
  { rol: 'ESPECIALISTA', email: 'dr.roberto@dentalcare.com', password: 'DocRoberto2026*' },
  { rol: 'PACIENTE', email: 'andres.galvis@gmail.com', password: 'AndresG2026*' },
];
