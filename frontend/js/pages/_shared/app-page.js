import { h } from '../../core/dom.js';
import { guard } from '../../core/guard.js';
import { appUrl } from '../../core/navigation.js';
import { onSessionChange } from '../../core/session.js';
import { authService, isApiError, demoNotifications } from '../../services/index.js';
import { Button } from '../../components/atoms/index.js';
import { DashboardLayout } from '../../components/templates/index.js';

/**
 * Arranque común de TODAS las pantallas internas (fase A6 en adelante):
 *
 *   const page = createAppPage({ role: 'ADMINISTRADOR', activeId: 'pacientes', title: 'Pacientes' });
 *   if (!page) return;                      // sin sesión o sin permiso: el guard ya redirigió
 *   const pacientes = await loadInto(page.layout, () => pacientesService.list(), 'Cargando pacientes…');
 *
 * 1. guard(role) → valida sesión y rol ANTES de dibujar nada. Si no se indica `role`, se toma de
 *    <body data-role="…"> (así un mismo controlador sirve a varias carpetas: admin, asistente…).
 * 2. DashboardLayout con el usuario de la sesión (menú según SU rol).
 * 3. "Cerrar sesión" → authService.logout(); el guard detecta el cambio y lleva al login.
 * 4. "Mi perfil" / "Configuración" → perfil.html; si el usuario edita su perfil (aquí o en otra pestaña),
 *    el topbar muestra los datos nuevos de la sesión sin volver a ingresar.
 *
 * `role` puede ser una lista (perfil.html sirve a todos los roles).
 *
 * @returns {{ user: object, layout: HTMLElement } | null}
 */
export function createAppPage({ role = document.body.dataset.role, activeId, title, subtitle, breadcrumbs, actions, content } = {}) {
  // Sin rol, guard() dejaría entrar a cualquier usuario con sesión: es un error de la página, no del usuario.
  if (!role) throw new Error('createAppPage: falta el rol (prop `role` o <body data-role>).');
  const user = guard(role);
  if (!user) return null;

  const layout = DashboardLayout({
    role: user.rol,
    user,
    activeId,
    title,
    subtitle,
    breadcrumbs,
    actions,
    content,
    notifications: demoNotifications(),
    onLogout: () => authService.logout(),
    onProfileAction: (item) => location.assign(appUrl(item === 'configuracion' ? 'perfil.html#seguridad' : 'perfil.html')),
  });
  onSessionChange(({ session }) => session && layout.setUser(session.user));
  document.body.append(layout);
  return { user, layout };
}

/** Mensaje entendible para cualquier error (ApiError trae uno pensado para el usuario). */
export const errorMessage = (error) => (isApiError(error) ? error.message : 'Ocurrió un error inesperado. Intenta de nuevo.');

/**
 * Carga datos mostrando el estado de carga del template; si falla, muestra el error en el
 * contenido con un botón para reintentar. Devuelve los datos, o null si hubo error.
 */
export async function loadInto(layout, loader, message = 'Cargando…') {
  layout.setLoading(true, message);
  try {
    return await loader();
  } catch (error) {
    if (error?.status === 401) return null; // sesión vencida: el guard ya está redirigiendo
    layout.setContent(
      h(
        'div',
        { class: 'page-error', role: 'alert' },
        h('p', {}, errorMessage(error)),
        Button({ label: 'Reintentar', icon: 'activity', variant: 'outline', size: 'sm', onClick: () => location.reload() }),
      ),
    );
    return null;
  }
}
