import { h, cx, mount, uniqueId } from '../../core/dom.js';
import { Icon } from '../atoms/index.js';

/**
 * Molécula: Tabs — pestañas accesibles (patrón WAI-ARIA, activación automática).
 * Teclado: ← → para moverse, Inicio/Fin para ir al extremo.
 *
 * Dos usos:
 *  - Con `content` en cada pestaña → renderiza paneles (contenido perezoso si es función).
 *    Ej. panel del Asistente: "Próximas citas" / "Pagos pendientes".
 *  - Sin `content` → solo selector controlado por `onChange`.
 *    Ej. vista de Agenda: Día / Semana / Mes / Lista (variant 'segmented').
 *
 * @param {object} props
 * @param {Array<{id: string, label: string, icon?: string, count?: number, content?: Node|(() => Node)}>} props.tabs
 * @param {string} [props.activeId]                 Por defecto, la primera pestaña.
 * @param {(id: string) => void} [props.onChange]
 * @param {string} props.ariaLabel                  Nombre accesible del grupo.
 * @param {'underline'|'segmented'} [props.variant='underline']
 * @returns {HTMLDivElement}  Expone `selectTab(id)` para cambiar la pestaña desde código.
 */
export function Tabs({ tabs = [], activeId = tabs[0]?.id, onChange, ariaLabel, variant = 'underline', className } = {}) {
  const base = uniqueId('tabs');
  const hasPanels = tabs.some((tab) => tab.content !== undefined);
  const buttons = new Map();
  const panels = new Map();
  const rendered = new Set();
  let current = null;

  const list = h('div', { class: 'tabs__list', role: 'tablist', 'aria-label': ariaLabel });

  for (const tab of tabs) {
    const button = h(
      'button',
      {
        type: 'button',
        role: 'tab',
        class: 'tabs__tab',
        id: `${base}-tab-${tab.id}`,
        'aria-controls': hasPanels ? `${base}-panel-${tab.id}` : undefined,
        onClick: () => select(tab.id, true),
      },
      tab.icon && Icon({ name: tab.icon, size: 16 }),
      h('span', {}, tab.label),
      tab.count !== undefined && h('span', { class: 'tabs__count' }, tab.count),
    );
    buttons.set(tab.id, button);
    list.append(button);

    if (hasPanels) {
      panels.set(
        tab.id,
        h('div', { role: 'tabpanel', class: 'tabs__panel', id: `${base}-panel-${tab.id}`, 'aria-labelledby': button.id, tabindex: 0, hidden: true }),
      );
    }
  }

  list.addEventListener('keydown', (event) => {
    const ids = tabs.map((tab) => tab.id);
    const index = ids.indexOf(current);
    const next = {
      ArrowRight: ids[(index + 1) % ids.length],
      ArrowLeft: ids[(index - 1 + ids.length) % ids.length],
      Home: ids[0],
      End: ids[ids.length - 1],
    }[event.key];
    if (!next) return;
    event.preventDefault();
    select(next, true);
    buttons.get(next).focus();
  });

  function select(id, fromUser = false) {
    if (!buttons.has(id)) return;
    const changed = id !== current;
    current = id;

    for (const [tabId, button] of buttons) {
      const active = tabId === id;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    }

    for (const [tabId, panel] of panels) {
      const active = tabId === id;
      panel.hidden = !active;
      if (active && !rendered.has(tabId)) {
        const { content } = tabs.find((tab) => tab.id === tabId);
        mount(panel, typeof content === 'function' ? content() : content);
        rendered.add(tabId);
      }
    }

    if (changed && fromUser) onChange?.(id);
  }

  const root = h('div', { class: cx('tabs', `tabs--${variant}`, className) }, list, [...panels.values()]);
  select(activeId);
  root.selectTab = (id) => select(id);
  return root;
}
