import { h, cx, mount, uniqueId } from '../../core/dom.js';
import { Icon, Avatar } from '../atoms/index.js';
import { Tabs } from '../molecules/index.js';

const ALERT_ICON = { info: 'info', warning: 'alert-triangle', danger: 'alert-circle' };

/**
 * Template: DetailLayout — ficha de una entidad: paciente, historia clínica, especialista
 * (RF-PAC-02/03, HU-04). Va DENTRO del slot de DashboardLayout: el marco pone la navegación y
 * las migas; este template organiza la ficha.
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │ (Avatar) Nombre  [badges]                  Acciones  │  ← encabezado
 *   │          ícono dato · ícono dato · …                 │
 *   │ ──────────────────────────────────────────────────── │
 *   │ Resumen │ Resumen │ Resumen │ Resumen                │  ← summary (dl)
 *   └──────────────────────────────────────────────────────┘
 *   [ Alertas clínicas (alergias…) ]
 *   ┌───────────── Tabs ─────────────┐ ┌──── aside ────┐
 *   │ Datos | Odontograma | Citas    │ │ complementario │  ← al lado solo si cabe
 *   └────────────────────────────────┘ └────────────────┘
 *
 * @param {object} props
 * @param {string} props.title                      Nombre de la entidad (<h1> por defecto).
 * @param {string} [props.subtitle]
 * @param {string} [props.avatar]                   Nombre para el Avatar (iniciales).
 * @param {Node[]} [props.badges]
 * @param {Node[]} [props.actions]
 * @param {Array<{icon: string, label: string, value: string}>} [props.meta]   Datos de contacto/identidad.
 * @param {Array<{label: string, value: Node|string, hint?: string}>} [props.summary]
 * @param {Array<{tone?: 'info'|'warning'|'danger', title: string, text?: string}>} [props.alerts]
 * @param {Array} props.tabs                        Formato de la molécula Tabs (contenido perezoso).
 * @param {string} [props.activeTab]
 * @param {(id: string) => void} [props.onTabChange]
 * @param {string} [props.tabsLabel='Secciones de la ficha']
 * @param {boolean} [props.syncHash=false]          Refleja la pestaña en la URL (#odontograma): enlaces directos.
 * @param {Node|Node[]} [props.aside]               Columna complementaria (<aside>).
 * @param {string} [props.asideLabel='Información complementaria']
 * @param {1|2|3} [props.headingLevel=1]
 * @returns {HTMLElement}  Expone selectTab(id), setSummary(items), setBadges(nodes), setAlerts(list).
 */
export function DetailLayout({
  title,
  subtitle,
  avatar,
  badges = [],
  actions = [],
  meta = [],
  summary = [],
  alerts = [],
  tabs = [],
  activeTab,
  onTabChange,
  tabsLabel = 'Secciones de la ficha',
  syncHash = false,
  aside,
  asideLabel = 'Información complementaria',
  headingLevel = 1,
  className,
} = {}) {
  const titleId = uniqueId('detail-title');

  /* ---------- Encabezado ---------- */
  const badgesEl = h('span', { class: 'detail__badges' });
  const metaEl = h(
    'dl',
    { class: 'detail__meta' },
    meta.map((item) =>
      h(
        'div',
        { class: 'detail__meta-item' },
        // El ícono se ve; la etiqueta se lee (el lector dice "Teléfono: 300…").
        h('dt', {}, Icon({ name: item.icon, size: 16 }), h('span', { class: 'u-visually-hidden' }, item.label)),
        h('dd', {}, item.value),
      ),
    ),
  );

  const summaryEl = h('dl', { class: 'detail__summary' });
  const header = h(
    'section',
    { class: 'detail__header', 'aria-labelledby': titleId },
    h(
      'div',
      { class: 'detail__identity' },
      avatar && Avatar({ name: avatar, size: 'lg' }),
      h(
        'div',
        { class: 'detail__heading' },
        h(
          'div',
          { class: 'detail__title-row' },
          h(`h${headingLevel}`, { class: 'detail__title', id: titleId }, title),
          badgesEl,
        ),
        subtitle && h('p', { class: 'detail__subtitle' }, subtitle),
        meta.length > 0 && metaEl,
      ),
      actions.length > 0 && h('div', { class: 'detail__actions' }, actions),
    ),
    summaryEl,
  );

  /* ---------- Alertas (p. ej. alergias: deben verse sin abrir ninguna pestaña) ---------- */
  const alertsEl = h('div', { class: 'detail__alerts' });

  /* ---------- Pestañas ---------- */
  const tabIds = tabs.map((tab) => tab.id);
  const fromHash = () => decodeURIComponent(location.hash.slice(1));
  const initialTab = syncHash && tabIds.includes(fromHash()) ? fromHash() : activeTab;

  const tabsEl = Tabs({
    tabs,
    activeId: initialTab,
    ariaLabel: tabsLabel,
    onChange: (id) => {
      // replaceState: cambia la URL sin agregar una entrada al historial por cada pestaña.
      if (syncHash) history.replaceState(null, '', `#${encodeURIComponent(id)}`);
      onTabChange?.(id);
    },
  });

  const hasAside = aside !== undefined && aside !== null;
  const root = h(
    'div',
    { class: cx('detail', className) },
    header,
    alertsEl,
    h(
      'div',
      { class: cx('detail__body', hasAside && 'detail__body--with-aside') },
      h('div', { class: 'detail__main' }, tabsEl),
      hasAside && h('aside', { class: 'detail__aside', 'aria-label': asideLabel }, aside),
    ),
  );

  function setSummary(items = []) {
    summaryEl.hidden = items.length === 0;
    mount(
      summaryEl,
      items.map((item) =>
        h(
          'div',
          { class: 'detail__stat' },
          h('dt', { class: 'detail__stat-label' }, item.label),
          h('dd', { class: 'detail__stat-value' }, item.value, item.hint && h('span', { class: 'detail__stat-hint' }, item.hint)),
        ),
      ),
    );
  }

  function setBadges(nodes = []) {
    mount(badgesEl, nodes);
    badgesEl.hidden = nodes.length === 0;
  }

  function setAlerts(list = []) {
    alertsEl.hidden = list.length === 0;
    mount(
      alertsEl,
      list.map(({ tone = 'warning', title: alertTitle, text }) =>
        h(
          'div',
          { class: `detail-alert detail-alert--${tone}` },
          h('span', { class: 'detail-alert__icon', 'aria-hidden': 'true' }, Icon({ name: ALERT_ICON[tone] ?? 'info', size: 18 })),
          h('p', { class: 'detail-alert__body' }, h('strong', {}, alertTitle), text && ` ${text}`),
        ),
      ),
    );
  }

  setSummary(summary);
  setBadges(badges);
  setAlerts(alerts);

  root.selectTab = (id) => tabsEl.selectTab(id);
  root.setSummary = setSummary;
  root.setBadges = setBadges;
  root.setAlerts = setAlerts;
  return root;
}
