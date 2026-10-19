import { h, cx, mount } from '../../core/dom.js';
import { Icon } from '../atoms/index.js';

/**
 * Molécula: Breadcrumbs — ruta de navegación (patrón WAI-ARIA "Breadcrumb").
 * `nav` con nombre propio + lista ordenada; el último elemento es la página actual:
 * no es enlace y lleva aria-current="page". Los separadores son decorativos (aria-hidden).
 *
 * @param {object} props
 * @param {Array<{label: string, href?: string, onClick?: (event: MouseEvent) => void}>} props.items
 * @param {string} [props.ariaLabel='Ruta de navegación']
 * @returns {HTMLElement}  Expone `setItems(items)`. Se oculta si no hay elementos.
 */
export function Breadcrumbs({ items = [], ariaLabel = 'Ruta de navegación', className } = {}) {
  const list = h('ol', { class: 'breadcrumbs__list' });
  const root = h('nav', { class: cx('breadcrumbs', className), 'aria-label': ariaLabel }, list);

  function setItems(next = []) {
    root.hidden = next.length === 0;
    mount(
      list,
      next.map((item, index) => {
        const isCurrent = index === next.length - 1;
        return h(
          'li',
          { class: 'breadcrumbs__item' },
          index > 0 && Icon({ name: 'chevron-right', size: 14, className: 'breadcrumbs__sep' }),
          isCurrent
            ? h('span', { class: 'breadcrumbs__current', 'aria-current': 'page' }, item.label)
            : h('a', { class: 'breadcrumbs__link', href: item.href ?? '#', onClick: item.onClick }, item.label),
        );
      }),
    );
  }

  setItems(items);
  root.setItems = setItems;
  return root;
}
