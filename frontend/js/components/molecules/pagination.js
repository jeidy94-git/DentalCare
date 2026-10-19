import { h, cx, mount } from '../../core/dom.js';
import { formatNumber } from '../../core/format.js';
import { Button } from '../atoms/index.js';

const ELLIPSIS = '…';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Lista de páginas a mostrar con puntos suspensivos.
 * Ej. (página 6 de 20) → [1, '…', 5, 6, 7, '…', 20]
 */
export function pageRange(current, totalPages, siblings = 1) {
  const slots = siblings * 2 + 5;
  if (totalPages <= slots) return range(1, totalPages);

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, totalPages);
  const leftDots = left > 2;
  const rightDots = right < totalPages - 1;
  const edge = 3 + siblings * 2;

  if (!leftDots) return [...range(1, edge), ELLIPSIS, totalPages];
  if (!rightDots) return [1, ELLIPSIS, ...range(totalPages - edge + 1, totalPages)];
  return [1, ELLIPSIS, ...range(left, right), ELLIPSIS, totalPages];
}

/**
 * Molécula: Pagination
 * @param {object} props
 * @param {number} [props.page=1]
 * @param {number} [props.pageSize=10]
 * @param {number} [props.total=0]                Total de registros.
 * @param {(page: number) => void} [props.onChange]
 * @param {number} [props.siblingCount=1]         Páginas visibles a cada lado de la actual.
 * @returns {HTMLElement}  Expone `update({ page, pageSize, total })` para refrescarla tras filtrar.
 */
export function Pagination({ page = 1, pageSize = 10, total = 0, onChange, siblingCount = 1, className } = {}) {
  const state = { page, pageSize, total };
  const root = h('nav', { class: cx('pagination', className), 'aria-label': 'Paginación' });

  const totalPages = () => Math.max(1, Math.ceil(state.total / state.pageSize));

  function go(target, focusKey) {
    const next = clamp(target, 1, totalPages());
    if (next === state.page) return;
    state.page = next;
    render();
    onChange?.(next);
    // Mantiene el foco en el control usado; si quedó deshabilitado, lo lleva a la página actual.
    const preferred = root.querySelector(`[data-nav="${focusKey}"]:not(:disabled)`);
    (preferred ?? root.querySelector('[aria-current="page"]'))?.focus();
  }

  function render() {
    const pages = totalPages();
    state.page = clamp(state.page, 1, pages);
    const from = state.total === 0 ? 0 : (state.page - 1) * state.pageSize + 1;
    const to = Math.min(state.page * state.pageSize, state.total);

    const info = h(
      'p',
      { class: 'pagination__info' },
      state.total === 0
        ? 'Sin registros'
        : ['Mostrando ', h('strong', {}, `${from}–${to}`), ' de ', h('strong', {}, formatNumber(state.total)), ' registros'],
    );

    const items = pageRange(state.page, pages, siblingCount).map((item) =>
      item === ELLIPSIS
        ? h('li', { class: 'pagination__ellipsis', 'aria-hidden': 'true' }, ELLIPSIS)
        : h(
            'li',
            {},
            h(
              'button',
              {
                type: 'button',
                class: 'pagination__page',
                'aria-label': `Página ${item}`,
                'aria-current': item === state.page ? 'page' : undefined,
                onClick: () => go(item, 'page'),
              },
              item,
            ),
          ),
    );

    const prev = Button({
      icon: 'chevron-left',
      variant: 'ghost',
      size: 'sm',
      ariaLabel: 'Página anterior',
      disabled: state.page === 1,
      dataset: { nav: 'prev' },
      onClick: () => go(state.page - 1, 'prev'),
    });
    const next = Button({
      icon: 'chevron-right',
      variant: 'ghost',
      size: 'sm',
      ariaLabel: 'Página siguiente',
      disabled: state.page === pages,
      dataset: { nav: 'next' },
      onClick: () => go(state.page + 1, 'next'),
    });

    mount(root, info, h('ul', { class: 'pagination__list', role: 'list' }, h('li', {}, prev), items, h('li', {}, next)));
  }

  root.update = (patch = {}) => {
    Object.assign(state, patch);
    render();
  };

  render();
  return root;
}
