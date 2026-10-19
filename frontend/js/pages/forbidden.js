/**
 * 403.html — acceso denegado. A esta página llega el guard cuando el rol de la sesión no puede
 * entrar a la que se pidió (403.html?from=pages/admin/pagos.html).
 *
 * No muestra datos de la página prohibida: solo cuál se intentó abrir (como texto) y cómo seguir.
 */
import { h } from '../core/dom.js';
import { appUrl, ROLES } from '../core/navigation.js';
import { getSession } from '../core/session.js';
import { homeFor, loginUrl } from '../core/guard.js';
import { Button, Icon } from '../components/atoms/index.js';
import { AuthLayout } from '../components/templates/index.js';
import { authService } from '../services/index.js';

const session = getSession();
const from = new URLSearchParams(location.search).get('from');

const goHome = Button({ label: session ? 'Ir a mi inicio' : 'Iniciar sesión', icon: 'home', block: true, onClick: () => location.assign(session ? homeFor(session.user.rol) : loginUrl()) });
const switchAccount =
  session &&
  Button({
    label: 'Ingresar con otra cuenta',
    variant: 'outline',
    block: true,
    onClick: async () => {
      await authService.logout();
      location.replace(loginUrl({ next: from ?? undefined }));
    },
  });

const layout = AuthLayout({
  title: 'Acceso denegado',
  subtitle: session ? `Tu cuenta (${ROLES[session.user.rol].label}) no tiene permiso para ver esta página.` : 'Necesitas iniciar sesión para continuar.',
  homeHref: appUrl('index.html'),
  content: h(
    'div',
    { class: 'auth-notice auth-notice--denied' },
    h('span', { class: 'auth-notice__icon', 'aria-hidden': 'true' }, Icon({ name: 'shield', size: 24 })),
    h('p', {}, 'Si crees que es un error, comunícate con el administrador del centro odontológico.'),
    from && h('p', { class: 'auth-notice__detail' }, 'Página solicitada: ', h('code', {}, from)),
    goHome,
    switchAccount,
  ),
  footer: h('span', {}, 'Error 403 · DentalCare'),
});
document.body.append(layout);
