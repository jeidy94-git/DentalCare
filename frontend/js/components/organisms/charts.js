import { h, cx, mount, uniqueId } from '../../core/dom.js';
import { formatNumber, formatDate, capitalize } from '../../core/format.js';
import { addMonths, startOfMonth, toISODate } from '../../core/dates.js';
import { Button, setButtonLabel } from '../atoms/index.js';

/**
 * Gráficas en SVG puro, sin librerías (decisión del proyecto).
 * Reglas de visualización aplicadas:
 *  - Una sola serie → un solo color de marca (primary-600, validado: contraste ≥ 3:1 y croma suficiente).
 *    Sin leyenda: el título nombra la serie.
 *  - Barras ≤ 24 px, punta redondeada 4 px y base recta; cuadrícula de 1 px, sólida y tenue.
 *  - Etiquetas de valor selectivas (máximo y último) en columnas; en barras horizontales, valor en la punta.
 *  - Tooltip al pasar el mouse Y al enfocar con teclado (cada barra es enfocable).
 *  - Vista de tabla alternativa: ningún dato depende solo del gráfico.
 *  - Detalle (drill-down): un dato con `href` vuelve su barra un enlace <a> de SVG nativo (clic, Enter,
 *    abrir en otra pestaña) y su fila de la tabla también enlaza. El cursor lo pone el CSS (.chart__link).
 *  - Los textos se insertan con textContent (nunca innerHTML).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const BAR_MAX = 24;
const RADIUS = 4;

function svg(tag, attrs = {}, text) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}

/** Paso "bonito" para el eje (1, 2, 5 × 10ⁿ). */
function niceStep(max, ticks = 4) {
  const raw = Math.max(max, 1) / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
}

/** Columna con punta redondeada arriba y base recta. */
function columnPath(x, y, w, height) {
  const r = Math.min(RADIUS, w / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + height}Z`;
}

/** Barra horizontal con punta redondeada a la derecha y base recta. */
function barPath(x, y, w, height) {
  const r = Math.min(RADIUS, height / 2, w);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + height - r}Q${x + w},${y + height} ${x + w - r},${y + height}H${x}Z`;
}

/**
 * Organismo base: BarChart (una serie).
 * @param {object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {Array<{label: string, value: number, fullLabel?: string, href?: string}>} props.data
 * @param {'vertical'|'horizontal'} [props.orientation='vertical']
 * @param {string} [props.unit='']                 Ej. "citas".
 * @param {(v: number) => string} [props.format]   Formato del valor.
 * @param {number} [props.height=260]              Alto (solo vertical).
 */
export function BarChart({ title, subtitle, data = [], orientation = 'vertical', unit = '', format = formatNumber, height = 260, className } = {}) {
  const titleId = uniqueId('chart-title');
  const plot = h('div', { class: 'chart__plot' });
  const tooltip = h('div', { class: 'chart__tooltip', 'aria-hidden': 'true', hidden: true }, h('strong', {}), h('span', {}));
  // El tooltip se ancla con los atributos x/y de un foreignObject (geometría SVG), no con element.style.
  const tipAnchor = svg('foreignObject', { class: 'chart__tip-anchor', width: 1, height: 1 });
  tipAnchor.append(tooltip);
  const describe = (d) => `${d.fullLabel ?? d.label}: ${format(d.value)}${unit ? ` ${unit}` : ''}`;

  /* ---------- Vista de tabla ---------- */
  const table = h(
    'table',
    { class: 'chart__table', hidden: true },
    h('caption', { class: 'u-visually-hidden' }, title),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Categoría'), h('th', { scope: 'col', class: 'is-right' }, capitalize(unit || 'valor')))),
    h('tbody', {}, data.map((d) => h('tr', {}, h('th', { scope: 'row' }, d.href ? h('a', { href: d.href, class: 'link' }, d.fullLabel ?? d.label) : d.fullLabel ?? d.label), h('td', { class: 'is-right' }, format(d.value))))),
  );

  const toggle = Button({
    label: 'Ver tabla',
    variant: 'ghost',
    size: 'sm',
    'aria-pressed': 'false',
    onClick: () => {
      const showTable = table.hidden;
      table.hidden = !showTable;
      plot.hidden = showTable;
      toggle.setAttribute('aria-pressed', String(showTable));
      setButtonLabel(toggle, showTable ? 'Ver gráfica' : 'Ver tabla');
    },
  });

  /* ---------- Tooltip ---------- */
  let activeBar = null;
  function showTip(d, bar, x, y) {
    activeBar?.classList.remove('is-active');
    activeBar = bar;
    bar?.classList.add('is-active');
    tooltip.firstChild.textContent = `${format(d.value)}${unit ? ` ${unit}` : ''}`;
    tooltip.lastChild.textContent = d.fullLabel ?? d.label;
    tooltip.hidden = false;
    const width = plot.clientWidth;
    tipAnchor.setAttribute('x', String(Math.min(Math.max(x, 70), width - 70)));
    tipAnchor.setAttribute('y', String(y));
  }
  function hideTip() {
    activeBar?.classList.remove('is-active');
    activeBar = null;
    tooltip.hidden = true;
  }

  /**
   * Zona sensible de una barra (más grande que la barra, para acertar fácil). Con `href` es un enlace nativo:
   * recibe el foco y se activa con Enter; sin `href`, un rect enfocable que solo muestra el tooltip.
   */
  function hitArea(d, bar, x, y, rect) {
    const hit = svg('rect', { ...rect, class: 'chart__hit' });
    if (!d.href) {
      for (const [k, v] of Object.entries({ tabindex: 0, role: 'img', 'aria-label': describe(d) })) hit.setAttribute(k, String(v));
      bindHit(hit, d, bar, x, y);
      return hit;
    }
    const link = svg('a', { href: d.href, class: 'chart__link', 'aria-label': `${describe(d)}. Ver estas citas` });
    link.append(hit);
    bindHit(link, d, bar, x, y);
    return link;
  }

  function bindHit(hit, d, bar, x, y) {
    hit.addEventListener('pointerenter', () => showTip(d, bar, x, y));
    hit.addEventListener('pointerleave', hideTip);
    hit.addEventListener('focus', () => showTip(d, bar, x, y));
    hit.addEventListener('blur', hideTip);
  }

  /* ---------- Render ---------- */
  function renderVertical(width) {
    const m = { top: 24, right: 8, bottom: 30, left: 40 };
    const innerW = width - m.left - m.right;
    const innerH = height - m.top - m.bottom;
    const max = Math.max(0, ...data.map((d) => d.value));
    const step = niceStep(max);
    const top = Math.max(step, Math.ceil(max / step) * step);
    const yOf = (v) => m.top + innerH * (1 - v / top);
    const band = innerW / Math.max(data.length, 1);
    const barW = Math.min(BAR_MAX, band * 0.56);
    const maxIndex = data.findIndex((d) => d.value === max);
    const labelled = new Set([maxIndex, data.length - 1]);

    const root = svg('svg', { width, height, class: 'chart__svg', role: 'group', 'aria-labelledby': titleId });

    for (let v = 0; v <= top; v += step) {
      const y = Math.round(yOf(v)) + 0.5;
      root.append(svg('line', { x1: m.left, x2: width - m.right, y1: y, y2: y, class: v === 0 ? 'chart__baseline' : 'chart__grid' }));
      root.append(svg('text', { x: m.left - 8, y: y + 4, class: 'chart__tick', 'text-anchor': 'end' }, formatNumber(v)));
    }

    data.forEach((d, i) => {
      const cx0 = m.left + band * i;
      const center = cx0 + band / 2;
      const y = yOf(d.value);
      const bar = d.value > 0 ? svg('path', { d: columnPath(center - barW / 2, y, barW, m.top + innerH - y), class: 'chart__bar' }) : null;
      if (bar) root.append(bar);
      root.append(svg('text', { x: center, y: height - 10, class: 'chart__category', 'text-anchor': 'middle' }, d.label));
      if (labelled.has(i) && d.value > 0) root.append(svg('text', { x: center, y: y - 7, class: 'chart__value', 'text-anchor': 'middle' }, format(d.value)));

      root.append(hitArea(d, bar, center, y - 12, { x: cx0, y: m.top, width: band, height: innerH }));
    });
    return root;
  }

  function renderHorizontal(width) {
    const rowH = 46;
    const thickness = 16;
    const valueSpace = 84;
    const totalH = data.length * rowH + 4;
    const innerW = Math.max(width - valueSpace, 40);
    const max = Math.max(1, ...data.map((d) => d.value));

    // Sin línea base vertical: las etiquetas van sobre cada barra y la línea las atravesaría.
    const root = svg('svg', { width, height: totalH, class: 'chart__svg', role: 'group', 'aria-labelledby': titleId });

    data.forEach((d, i) => {
      const top = i * rowH;
      const barY = top + 22;
      const w = (d.value / max) * innerW;
      root.append(svg('text', { x: 0, y: top + 14, class: 'chart__category' }, d.label));
      const bar = d.value > 0 ? svg('path', { d: barPath(0, barY, w, thickness), class: 'chart__bar' }) : null;
      if (bar) root.append(bar);
      root.append(svg('text', { x: w + 8, y: barY + thickness - 3, class: 'chart__value' }, format(d.value)));

      root.append(hitArea(d, bar, Math.max(w / 2, 40), barY - 4, { x: 0, y: top, width, height: rowH }));
    });
    return root;
  }

  let lastWidth = 0;
  function render() {
    if (plot.hidden) return; // en vista de tabla no hay nada que medir
    const width = Math.floor(plot.clientWidth) || 560;
    if (width === lastWidth) return;
    lastWidth = width;
    hideTip();
    if (!data.length) {
      mount(plot, h('p', { class: 'chart__empty' }, 'Sin datos para el periodo.'));
      return;
    }
    const chart = orientation === 'horizontal' ? renderHorizontal(width) : renderVertical(width);
    chart.append(tipAnchor); // último hijo: queda por encima de las barras
    mount(plot, chart);
  }

  const root = h(
    'figure',
    { class: cx('chart', `chart--${orientation}`, className) },
    h(
      'div',
      { class: 'chart__header' },
      h(
        'div',
        {},
        h('h3', { id: titleId, class: 'chart__title' }, title),
        subtitle && h('p', { class: 'chart__subtitle' }, subtitle),
        data.some((d) => d.href) && h('p', { class: 'chart__hint' }, 'Haz clic en una barra para ver esas citas.'),
      ),
      toggle,
    ),
    plot,
    table,
  );

  // Redibuja con el ancho real (texto nítido, sin escalar un viewBox).
  new ResizeObserver(() => render()).observe(plot);
  render();
  return root;
}

/**
 * Organismo: DashboardCharts — citas por mes y tratamientos más solicitados (RF-DAS-01/02/03).
 * @param {object} props
 * @param {object[]} props.citas
 * @param {object[]} props.servicios
 * @param {number} [props.months=6]
 * @param {Date} [props.now]
 * @param {(filtro: object) => string} [props.detalle]  URL del detalle de las citas de una barra. Recibe los
 *        MISMOS criterios con que se contó la barra ({ desde, hasta, activas, id_servicio? }), así la lista
 *        de destino muestra exactamente ese número de citas. Sin `detalle`, las barras no son enlaces.
 */
export function DashboardCharts({ citas = [], servicios = [], months = 6, now = new Date(), detalle, className } = {}) {
  const firstMonth = addMonths(startOfMonth(now), -(months - 1));
  const from = toISODate(firstMonth);
  const to = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const active = citas.filter((c) => c.estado_cita !== 'CANCELADA' && c.fecha_hora.slice(0, 10) >= from && c.fecha_hora.slice(0, 10) <= to);

  const perMonth = Array.from({ length: months }, (_, i) => {
    const month = addMonths(firstMonth, i);
    const key = toISODate(month).slice(0, 7);
    const current = i === months - 1;
    const ultimoDia = toISODate(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    return {
      href: detalle?.({ desde: toISODate(month), hasta: ultimoDia, activas: 1 }),
      label: formatDate(month, { month: 'short' }).replace('.', ''),
      fullLabel: `${capitalize(formatDate(month, { month: 'long', year: 'numeric' }))}${current ? ' (en curso)' : ''}`,
      value: active.filter((c) => c.fecha_hora.startsWith(key)).length,
    };
  });

  const counts = new Map();
  for (const c of active) counts.set(c.id_servicio, (counts.get(c.id_servicio) ?? 0) + 1);
  const perService = servicios
    .map((s) => ({ label: s.nombre_servicio, value: counts.get(s.id_servicio) ?? 0, href: detalle?.({ id_servicio: s.id_servicio, desde: from, hasta: to, activas: 1 }) }))
    .sort((a, b) => b.value - a.value);

  return h(
    'div',
    { class: cx('dashboard-charts', className) },
    BarChart({
      title: 'Citas por mes',
      subtitle: `Últimos ${months} meses · sin canceladas · el mes en curso incluye citas agendadas`,
      data: perMonth,
      unit: 'citas',
    }),
    BarChart({
      title: 'Tratamientos más solicitados',
      subtitle: `Citas por tratamiento en el mismo periodo`,
      data: perService,
      orientation: 'horizontal',
      unit: 'citas',
    }),
  );
}
