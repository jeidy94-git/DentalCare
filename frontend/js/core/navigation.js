/**
 * Navegación por rol (SRS 3.1: sidebar específico por rol).
 * Los códigos de rol son los de la tabla `rol` de dentalcare_bd.
 */

// Raíz del frontend calculada desde este archivo: los enlaces funcionan sin importar
// si el servidor se abrió en /frontend o en la carpeta del proyecto.
const APP_ROOT = new URL('../../', import.meta.url);

/** Ruta relativa a /frontend → URL absoluta. appUrl('pages/admin/dashboard.html') */
export const appUrl = (path) => new URL(path, APP_ROOT).href;

export const ROLES = {
  ADMINISTRADOR: { label: 'Administrador', home: 'pages/admin/dashboard.html' },
  RECEPCIONISTA: { label: 'Asistente', home: 'pages/asistente/inicio.html' },
  ESPECIALISTA: { label: 'Odontólogo', home: 'pages/doctor/dashboard.html' },
  PACIENTE: { label: 'Paciente', home: 'pages/paciente/inicio.html' },
};

export const NAV_BY_ROLE = {
  ADMINISTRADOR: [
    {
      section: 'General',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'pages/admin/dashboard.html' },
        { id: 'citas', label: 'Citas', icon: 'calendar', href: 'pages/admin/citas.html' },
        { id: 'pacientes', label: 'Pacientes', icon: 'users', href: 'pages/admin/pacientes.html' },
        { id: 'especialistas', label: 'Especialistas', icon: 'user', href: 'pages/admin/especialistas.html' },
        { id: 'tratamientos', label: 'Tratamientos', icon: 'tooth', href: 'pages/admin/tratamientos.html' },
        { id: 'historias', label: 'Historias clínicas', icon: 'file-text', href: 'pages/admin/historias.html' },
        { id: 'pagos', label: 'Pagos', icon: 'credit-card', href: 'pages/admin/pagos.html' },
        { id: 'novedades', label: 'Novedades', icon: 'clipboard', href: 'pages/admin/novedades.html' },
      ],
    },
    {
      section: 'Configuración',
      items: [
        { id: 'roles', label: 'Roles y permisos', icon: 'shield', href: 'pages/admin/roles.html' },
        { id: 'usuarios', label: 'Usuarios', icon: 'settings', href: 'pages/admin/usuarios.html' },
      ],
    },
  ],
  RECEPCIONISTA: [
    {
      section: 'Recepción',
      items: [
        { id: 'inicio', label: 'Inicio', icon: 'home', href: 'pages/asistente/inicio.html' },
        { id: 'agenda', label: 'Agenda', icon: 'calendar', href: 'pages/asistente/agenda.html' },
        { id: 'agendar', label: 'Agendar cita', icon: 'plus', href: 'pages/asistente/agendar.html' },
        { id: 'pacientes', label: 'Pacientes', icon: 'users', href: 'pages/asistente/pacientes.html' },
        { id: 'pagos', label: 'Pagos', icon: 'credit-card', href: 'pages/asistente/pagos.html' },
        { id: 'novedades', label: 'Novedades', icon: 'clipboard', href: 'pages/asistente/novedades.html' },
      ],
    },
  ],
  ESPECIALISTA: [
    {
      section: 'Consulta',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'pages/doctor/dashboard.html' },
        { id: 'agenda', label: 'Agenda', icon: 'calendar', href: 'pages/doctor/agenda.html' },
        { id: 'pacientes', label: 'Pacientes', icon: 'users', href: 'pages/doctor/pacientes.html' },
        { id: 'tratamientos', label: 'Tratamientos', icon: 'tooth', href: 'pages/doctor/tratamientos.html' },
        { id: 'reportes', label: 'Reportes', icon: 'file-text', href: 'pages/doctor/reportes.html' },
        { id: 'novedades', label: 'Novedades', icon: 'clipboard', href: 'pages/doctor/novedades.html' },
      ],
    },
    {
      section: 'Cuenta',
      items: [{ id: 'configuracion', label: 'Configuración', icon: 'settings', href: 'pages/doctor/configuracion.html' }],
    },
  ],
  PACIENTE: [
    {
      section: 'Mi portal',
      items: [
        { id: 'inicio', label: 'Inicio', icon: 'home', href: 'pages/paciente/inicio.html' },
        { id: 'citas', label: 'Mis citas', icon: 'calendar', href: 'pages/paciente/citas.html' },
        { id: 'solicitar', label: 'Solicitar cita', icon: 'plus', href: 'pages/paciente/solicitar.html' },
        { id: 'historia', label: 'Mi historia clínica', icon: 'file-text', href: 'pages/paciente/historia.html' },
        { id: 'pagos', label: 'Mis pagos', icon: 'credit-card', href: 'pages/paciente/pagos.html' },
      ],
    },
  ],
};

/** Secciones de navegación del rol (vacío si el rol no existe). */
export function getNav(role) {
  return NAV_BY_ROLE[role] ?? [];
}
