import { h, mount, uniqueId } from '../../core/dom.js';
import { Icon } from '../atoms/index.js';

const APP_NAME = 'DentalCare';

const DEFAULT_HIGHLIGHTS = [
  { icon: 'calendar', text: 'Agenda y consulta tus citas en línea' },
  { icon: 'file-text', text: 'Historia clínica y odontograma digitales' },
  { icon: 'credit-card', text: 'Pagos y abonos siempre al día' },
];

/**
 * Template: AuthLayout — pantallas sin sesión: login (HU-02), recuperar y restablecer
 * contraseña (HU-01). Panel de marca a la izquierda (solo ≥ 960px) y tarjeta con el formulario.
 *
 * Una misma página puede tener varias "vistas" (p. ej. pedir el enlace → "revisa tu correo").
 * `setView()` cambia título y contenido y mueve el foco al <h1>, para que el lector de pantalla
 * anuncie la nueva vista (si no, el usuario quedaría "en ninguna parte" tras el envío).
 *
 * @param {object} props
 * @param {string} props.title                    <h1> de la tarjeta.
 * @param {string} [props.subtitle]
 * @param {Node|Node[]} [props.content]           Normalmente el <form>.
 * @param {Node|Node[]} [props.footer]            Enlaces secundarios ("¿Olvidaste tu contraseña?").
 * @param {Array<{icon: string, text: string}>} [props.highlights]
 * @param {string} [props.homeHref='#']
 * @param {string} [props.mainId='contenido-principal']
 * @param {boolean} [props.syncDocumentTitle=true]
 * @returns {HTMLElement}  Expone setView({title, subtitle, content, footer}, {focus}).
 */
export function AuthLayout({
  title,
  subtitle,
  content = [],
  footer = [],
  highlights = DEFAULT_HIGHLIGHTS,
  homeHref = '#',
  mainId = 'contenido-principal',
  syncDocumentTitle = true,
} = {}) {
  const logo = (className) =>
    h(
      'span',
      { class: `auth-logo ${className}` },
      h('span', { class: 'auth-logo__mark', 'aria-hidden': 'true' }, Icon({ name: 'tooth', size: 20 })),
      APP_NAME,
    );

  // Panel de marca: decorativo/informativo, sin encabezados para no romper la jerarquía (el <h1> es el de la tarjeta).
  const brand = h(
    'div',
    { class: 'auth__brand' },
    logo('auth-logo--inverse'),
    h(
      'div',
      { class: 'auth__brand-copy' },
      h('p', { class: 'auth__tagline' }, 'Tu sonrisa, en buenas manos.'),
      h('p', { class: 'auth__brand-text' }, 'Centro odontológico en Rionegro, Antioquia.'),
      h(
        'ul',
        { class: 'auth__highlights', role: 'list' },
        highlights.map((item) => h('li', {}, h('span', { class: 'auth__highlight-icon', 'aria-hidden': 'true' }, Icon({ name: item.icon, size: 18 })), item.text)),
      ),
    ),
    h('p', { class: 'auth__legal' }, `© ${new Date().getFullYear()} ${APP_NAME} · Proyecto SENA`),
  );

  const titleId = uniqueId('auth-title');
  const heading = h('h1', { class: 'auth__title', id: titleId, tabindex: -1 });
  const subtitleEl = h('p', { class: 'auth__subtitle' });
  const bodyEl = h('div', { class: 'auth__body' });
  const footerEl = h('div', { class: 'auth__footer' });

  const card = h(
    'section',
    { class: 'auth__card', 'aria-labelledby': titleId },
    h('a', { class: 'auth__home', href: homeHref, 'aria-label': `${APP_NAME}, inicio` }, logo('auth-logo--compact')),
    h('div', { class: 'auth__header' }, heading, subtitleEl),
    bodyEl,
    footerEl,
  );

  const root = h('div', { class: 'auth' }, brand, h('main', { id: mainId, class: 'auth__main' }, card));

  function setView(view = {}, { focus = true } = {}) {
    if ('title' in view) {
      heading.textContent = view.title ?? '';
      if (syncDocumentTitle && view.title) root.ownerDocument.title = `${view.title} · ${APP_NAME}`;
    }
    if ('subtitle' in view) {
      subtitleEl.textContent = view.subtitle ?? '';
      subtitleEl.hidden = !view.subtitle;
    }
    if ('content' in view) mount(bodyEl, view.content ?? []);
    if ('footer' in view) {
      mount(footerEl, view.footer ?? []);
      footerEl.hidden = !footerEl.hasChildNodes();
    }
    if (focus) heading.focus();
  }

  setView({ title, subtitle, content, footer }, { focus: false });
  root.setView = setView;
  return root;
}
