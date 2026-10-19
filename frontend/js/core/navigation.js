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

/**
 * Menú de cada rol = pantallas de la fase A6. Los `id` son los `activeId` que usa cada página.
 * Las fichas (pages/doctor/historia.html?id=…) no van en el menú: se abren desde Pacientes o Agenda.
 */
export const NAV_BY_ROLE = {
  ADMINISTRADOR: [
    {
      section: 'General',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: 'pages/admin/dashboard.html' },
        { id: 'citas', label: 'Citas', icon: 'calendar', href: 'pages/admin/citas.html' },
        { id: 'pacientes', label: 'Pacientes', icon: 'users', href: 'pages/admin/pacientes.html' },
        { id: 'especialistas', label: 'Especialistas', icon: 'user', href: 'pages/admin/especialistas.html' },
        { id: 'servicios', label: 'Tratamientos', icon: 'tooth', href: 'pages/admin/servicios.html' },
        { id: 'pagos', label: 'Pagos', icon: 'credit-card', href: 'pages/admin/pagos.html' },
        { id: 'reportes', label: 'Reportes', icon: 'file-text', href: 'pages/admin/reportes.html' },
      ],
    },
  ],
  RECEPCIONISTA: [
    {
      section: 'Recepción',
      items: [
        { id: 'inicio', label: 'Inicio', icon: 'home', href: 'pages/asistente/inicio.html' },
        { id: 'agenda', label: 'Agenda', icon: 'calendar', href: 'pages/asistente/agenda.html' },
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
        { id: 'agenda', label: 'Mi agenda', icon: 'calendar', href: 'pages/doctor/agenda.html' },
        { id: 'pacientes', label: 'Pacientes', icon: 'users', href: 'pages/doctor/pacientes.html' },
        { id: 'novedades', label: 'Novedades', icon: 'clipboard', href: 'pages/doctor/novedades.html' },
      ],
    },
  ],
  PACIENTE: [
    {
      section: 'Mi portal',
      items: [
        { id: 'inicio', label: 'Inicio', icon: 'home', href: 'pages/paciente/inicio.html' },
        { id: 'agendar', label: 'Solicitar cita', icon: 'plus', href: 'pages/paciente/agendar.html' },
        { id: 'citas', label: 'Mis citas', icon: 'calendar', href: 'pages/paciente/mis-citas.html' },
        { id: 'historia', label: 'Mi historia clínica', icon: 'file-text', href: 'pages/paciente/mi-historia.html' },
        { id: 'pagos', label: 'Mis pagos', icon: 'credit-card', href: 'pages/paciente/mis-pagos.html' },
      ],
    },
  ],
};

/** Secciones de navegación del rol (vacío si el rol no existe). */
export function getNav(role) {
  return NAV_BY_ROLE[role] ?? [];
}
