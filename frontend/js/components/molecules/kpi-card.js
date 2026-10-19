import { h, cx } from '../../core/dom.js';
import { formatNumber } from '../../core/format.js';
import { Icon } from '../atoms/index.js';

/**
 * Molécula: KpiCard — indicador del dashboard (RF-DAS-01, panel del Asistente).
 *
 * @param {object} props
 * @param {string} props.label                       Ej. "Citas de hoy".
 * @param {number|string} props.value                Los números se formatean en es-CO.
 * @param {string} [props.icon]
 * @param {'primary'|'info'|'success'|'warning'|'danger'} [props.tone='primary']
 * @param {{value: string, direction: 'up'|'down', positive?: boolean}} [props.trend]
 *        `positive` indica si la tendencia es buena (por defecto: subir = bueno).
 * @param {string} [props.hint]                      Texto complementario, ej. "vs. ayer".
 * @param {string} [props.href]                      Si se indica, la tarjeta es un enlace.
 * @returns {HTMLElement}
 */
export function KpiCard({ label, value, icon, tone = 'primary', trend, hint, href, className } = {}) {
  const display = typeof value === 'number' ? formatNumber(value) : value;

  let trendEl = null;
  if (trend) {
    const positive = trend.positive ?? trend.direction === 'up';
    trendEl = h(
      'span',
      { class: cx('kpi__trend', positive ? 'kpi__trend--positive' : 'kpi__trend--negative') },
      Icon({ name: trend.direction === 'down' ? 'trending-down' : 'trending-up', size: 14 }),
      h('span', { class: 'u-visually-hidden' }, trend.direction === 'down' ? 'Disminución de ' : 'Aumento de '),
      trend.value,
    );
  }

  return h(
    href ? 'a' : 'article',
    { class: cx('kpi', `kpi--${tone}`, href && 'kpi--link', className), href },
    icon && h('span', { class: 'kpi__icon', 'aria-hidden': 'true' }, Icon({ name: icon, size: 22 })),
    h(
      'div',
      { class: 'kpi__body' },
      h('p', { class: 'kpi__label' }, label),
      h('p', { class: 'kpi__value' }, display),
      (trendEl || hint) && h('p', { class: 'kpi__footer' }, trendEl, hint && h('span', { class: 'kpi__hint' }, hint)),
    ),
  );
}
