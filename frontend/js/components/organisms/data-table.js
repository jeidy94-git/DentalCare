import { h, cx, mount, appendChildren, uniqueId } from '../../core/dom.js';
import { normalizeText, formatNumber } from '../../core/format.js';
import { Icon, Button } from '../atoms/index.js';
import { SearchBar, Pagination } from '../molecules/index.js';

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

function compare(a, b) {
  const emptyA = a === null || a === undefined || a === '';
  const emptyB = b === null || b === undefined || b === '';
  if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1; // vacíos al final
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

/**
 * Organismo: DataTable — SearchBar + filtros rápidos + orden por columna + acciones + Pagination.
 * RNF-USA-02 (filtros ágiles). Las celdas se pintan con nodos/texto: nunca innerHTML.
 *
 * @param {object} props
 * @param {Array<{
 *   key: string, label: string, sortable?: boolean, align?: 'left'|'right'|'center',
 *   value?: (row) => any,           // valor para ordenar/mostrar (por defecto row[key])
 *   render?: (row) => Node|string,  // contenido de la celda (texto plano o nodos)
 *   className?: string,
 * }>} props.columns
 * @param {object[]} [props.rows]
 * @param {string} [props.rowKey='id']
 * @param {string} props.caption                         Nombre accesible de la tabla.
 * @param {{placeholder?: string, label?: string, keys: Array<string|((row) => string)>}} [props.search]
 * @param {{label: string, key?: string, value?: (row) => string, options: Array<{value: string, label: string}>}} [props.filter]
 *        Filtros rápidos (chips) por un campo, normalmente el estado.
 * @param {string} [props.initialFilter='ALL']          Chip activo al cargar (p. ej. el estado que llega en la URL).
 * @param {(row) => Array<{icon: string, label: string, onClick: (row) => void, variant?: string, hidden?: boolean}>} [props.actions]
 * @param {(row) => string} [props.rowLabel]             Texto que completa el nombre accesible de cada acción.
 * @param {Node[]} [props.toolbar]                       Botones extra a la derecha (ej. "Nuevo paciente").
 * @param {{key: string, dir: 'asc'|'desc'}} [props.initialSort]
 * @param {number} [props.pageSize=10]
 * @param {string} [props.emptyMessage]
 * @returns {HTMLElement}  Expone setRows(rows), getRows(), refresh().
 */
export function DataTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  caption,
  search,
  filter,
  actions,
  rowLabel = () => '',
  toolbar = [],
  initialFilter = 'ALL',
  initialSort = null,
  pageSize = 10,
  emptyMessage = 'No hay registros que coincidan con la búsqueda.',
  className,
} = {}) {
  // Un initialFilter que no es una de las opciones se ignora (p. ej. un estado inventado en la URL).
  const filtroInicial = filter?.options.some((o) => o.value === initialFilter) ? initialFilter : 'ALL';
  const state = { rows: [...rows], term: '', filter: filtroInicial, sort: initialSort, page: 1 };
  const captionId = uniqueId('dt-caption');
  const valueOf = (row, col) => (col.value ? col.value(row) : row[col.key]);
  const filterValue = (row) => String(filter.value ? filter.value(row) : row[filter.key]);

  /* ---------- Encabezados con orden ---------- */
  const headers = new Map();
  const headRow = h(
    'tr',
    {},
    columns.map((col) => {
      const th = h('th', { scope: 'col', class: cx(col.align && `is-${col.align}`, col.className) });
      if (col.sortable) {
        th.append(
          h(
            'button',
            { type: 'button', class: 'data-table__sort', onClick: () => toggleSort(col.key) },
            h('span', {}, col.label),
            h('span', { class: 'data-table__sort-icon', 'aria-hidden': 'true' }, Icon({ name: 'chevron-down', size: 14 })),
          ),
        );
      } else {
        th.textContent = col.label;
      }
      headers.set(col.key, th);
      return th;
    }),
    actions && h('th', { scope: 'col', class: 'is-right' }, h('span', { class: 'u-visually-hidden' }, 'Acciones')),
  );

  function toggleSort(key) {
    const dir = state.sort?.key === key && state.sort.dir === 'asc' ? 'desc' : 'asc';
    state.sort = { key, dir };
    state.page = 1;
    render();
  }

  function paintSortHeaders() {
    for (const [key, th] of headers) {
      const col = columns.find((c) => c.key === key);
      if (!col.sortable) continue;
      const active = state.sort?.key === key;
      th.setAttribute('aria-sort', active ? (state.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
      const icon = th.querySelector('.data-table__sort-icon');
      icon.classList.toggle('is-active', active);
      icon.classList.toggle('is-asc', active && state.sort.dir === 'asc');
    }
  }

  /* ---------- Barra de herramientas ---------- */
  const searchBar = search
    ? SearchBar({
        placeholder: search.placeholder ?? 'Buscar…',
        label: search.label ?? `Buscar en ${caption}`,
        onSearch: (term) => {
          state.term = term;
          state.page = 1;
          render();
        },
      })
    : null;

  const chips = new Map();
  const chipGroup = filter
    ? h(
        'div',
        { class: 'data-table__chips', role: 'group', 'aria-label': filter.label },
        [{ value: 'ALL', label: 'Todos' }, ...filter.options].map((opt) => {
          const chip = h(
            'button',
            {
              type: 'button',
              class: 'chip',
              'aria-pressed': String(opt.value === state.filter),
              onClick: () => {
                state.filter = opt.value;
                state.page = 1;
                render();
              },
            },
            h('span', {}, opt.label),
            h('span', { class: 'chip__count' }),
          );
          chips.set(opt.value, chip);
          return chip;
        }),
      )
    : null;

  const status = h('p', { class: 'data-table__status', 'aria-live': 'polite' });

  /* ---------- Cuerpo ---------- */
  const tbody = h('tbody');
  const colCount = columns.length + (actions ? 1 : 0);

  const pagination = Pagination({
    pageSize,
    total: 0,
    onChange: (page) => {
      state.page = page;
      render({ fromPagination: true });
    },
  });

  function matchesSearch(row) {
    if (!state.term) return true;
    const q = normalizeText(state.term);
    return search.keys.some((k) => normalizeText(typeof k === 'function' ? k(row) : row[k] ?? '').includes(q));
  }

  function renderRow(row) {
    const label = rowLabel(row);
    return h(
      'tr',
      { dataset: { key: row[rowKey] } },
      columns.map((col) => {
        const content = col.render ? col.render(row) : valueOf(row, col);
        // appendChildren convierte cualquier string en nodo de texto → sin riesgo de XSS.
        return appendChildren(h('td', { class: cx(col.align && `is-${col.align}`, col.className), 'data-label': col.label }), [content ?? '—']);
      }),
      actions &&
        h(
          'td',
          { class: 'is-right data-table__actions' },
          h(
            'div',
            { class: 'data-table__action-group' },
            actions(row)
              .filter((a) => !a.hidden)
              .map((a) =>
                Button({
                  icon: a.icon,
                  variant: a.variant ?? 'ghost',
                  size: 'sm',
                  ariaLabel: label ? `${a.label}: ${label}` : a.label,
                  onClick: () => a.onClick(row),
                }),
              ),
          ),
        ),
    );
  }

  function render({ fromPagination = false } = {}) {
    const searched = state.rows.filter(matchesSearch);

    // Conteos de los chips sobre el resultado de la búsqueda
    if (filter) {
      for (const [value, chip] of chips) {
        const count = value === 'ALL' ? searched.length : searched.filter((r) => filterValue(r) === value).length;
        chip.querySelector('.chip__count').textContent = formatNumber(count);
        chip.setAttribute('aria-pressed', String(value === state.filter));
      }
    }

    let list = filter && state.filter !== 'ALL' ? searched.filter((r) => filterValue(r) === state.filter) : searched;
    if (state.sort) {
      const col = columns.find((c) => c.key === state.sort.key);
      const dir = state.sort.dir === 'asc' ? 1 : -1;
      list = [...list].sort((a, b) => compare(valueOf(a, col), valueOf(b, col)) * dir);
    }

    const pages = Math.max(1, Math.ceil(list.length / pageSize));
    state.page = Math.min(state.page, pages);
    const pageRows = list.slice((state.page - 1) * pageSize, state.page * pageSize);

    mount(
      tbody,
      pageRows.length
        ? pageRows.map(renderRow)
        : h('tr', {}, h('td', { colspan: colCount, class: 'data-table__empty' }, Icon({ name: 'search', size: 20 }), h('span', {}, emptyMessage))),
    );

    if (!fromPagination) pagination.update({ total: list.length, page: state.page });
    status.textContent = `${formatNumber(list.length)} ${list.length === 1 ? 'registro' : 'registros'}`;
    paintSortHeaders();
  }

  const table = h(
    'table',
    { class: 'data-table__table' },
    h('caption', { id: captionId, class: 'u-visually-hidden' }, caption),
    h('thead', {}, headRow),
    tbody,
  );

  const root = h(
    'div',
    { class: cx('data-table', className) },
    // Booleano explícito: un `0` (toolbar vacío) se pintaría como el texto "0".
    (Boolean(searchBar) || toolbar.length > 0) &&
      h('div', { class: 'data-table__toolbar' }, searchBar, h('div', { class: 'data-table__toolbar-end' }, status, ...toolbar)),
    chipGroup,
    // Región desplazable y enfocable: en móvil la tabla hace scroll horizontal sin romper la página.
    h('div', { class: 'data-table__scroll', role: 'region', 'aria-labelledby': captionId, tabindex: 0 }, table),
    h('div', { class: 'data-table__footer' }, pagination),
  );

  if (!searchBar && !toolbar.length) root.prepend(h('div', { class: 'data-table__toolbar' }, status));

  root.setRows = (next) => {
    state.rows = [...next];
    render();
  };
  root.getRows = () => [...state.rows];
  root.refresh = () => render();

  render();
  return root;
}
