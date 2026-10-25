/**
 * Átomo: Icon
 * Íconos SVG de trazo (24×24, stroke = currentColor) del sprite local img/icons.svg,
 * sin librerías externas ni innerHTML. Los trazos siguen el estilo de Lucide (licencia ISC).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Sprite estático con un <symbol> por ícono: la estructura SVG vive en un archivo, no en JS. */
const SPRITE = new URL('../../../img/icons.svg', import.meta.url).href;

/** Lista de nombres disponibles (ids del sprite; usada por el styleguide). */
export const ICON_NAMES = [
  'home', 'menu', 'chevron-down', 'chevron-left', 'chevron-right', 'log-out', 'arrow-left', 'more-vertical',
  'dashboard', 'calendar', 'user', 'users', 'tooth', 'file-text', 'clipboard', 'credit-card', 'dollar', 'activity',
  'settings', 'shield', 'bell', 'clock', 'trending-up', 'trending-down', 'search', 'filter', 'plus', 'edit', 'trash',
  'eye', 'eye-off', 'x', 'check', 'mail', 'lock', 'phone', 'map-pin', 'id-card', 'check-circle', 'alert-circle',
  'alert-triangle', 'info',
];
const KNOWN = new Set(ICON_NAMES);

/**
 * @param {object} props
 * @param {string} props.name       Nombre del ícono (ver ICON_NAMES).
 * @param {number} [props.size=20]  Tamaño en px.
 * @param {string} [props.label]    Si se indica, el ícono es significativo (role="img").
 *                                  Si no, es decorativo (aria-hidden).
 * @param {string} [props.className]
 * @returns {SVGSVGElement}
 */
export function Icon({ name, size = 20, label, className } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const attrs = {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: ['icon', className].filter(Boolean).join(' '),
    focusable: 'false',
  };
  for (const [key, value] of Object.entries(attrs)) svg.setAttribute(key, String(value));

  if (!KNOWN.has(name)) console.warn(`[Icon] Ícono desconocido: "${name}"`);
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `${SPRITE}#${KNOWN.has(name) ? name : 'alert-circle'}`);
  svg.append(use);

  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  return svg;
}
