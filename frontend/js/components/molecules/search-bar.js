import { h, cx, uniqueId } from '../../core/dom.js';
import { Input, Button, getControl } from '../atoms/index.js';

/**
 * Molécula: SearchBar — búsqueda con debounce, botón limpiar y tecla Escape.
 * Se usa en los listados (RNF-USA-02: filtros ágiles en tablas).
 *
 * @param {object} props
 * @param {string} [props.placeholder='Buscar…']
 * @param {string} [props.value='']
 * @param {string} [props.label='Buscar']      Etiqueta accesible (visualmente oculta).
 * @param {number} [props.debounce=300]        ms de espera mientras se escribe.
 * @param {(term: string) => void} [props.onSearch]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @returns {HTMLFormElement}
 */
export function SearchBar({ placeholder = 'Buscar…', value = '', label = 'Buscar', debounce = 300, onSearch, size = 'md', className } = {}) {
  const id = uniqueId('search');
  const wrap = Input({ id, type: 'search', icon: 'search', placeholder, value, size, autocomplete: 'off', className: 'search-bar__input' });
  const input = getControl(wrap);
  let timer;
  let lastEmitted = value;

  const emit = () => {
    clearTimeout(timer);
    const term = input.value.trim();
    if (term === lastEmitted) return;
    lastEmitted = term;
    onSearch?.(term);
  };

  const clearBtn = Button({
    icon: 'x',
    variant: 'ghost',
    size: 'sm',
    ariaLabel: 'Limpiar búsqueda',
    className: 'search-bar__clear',
    hidden: !value,
    onClick: () => clear(),
  });

  const clear = () => {
    input.value = '';
    clearBtn.hidden = true;
    emit();
    input.focus();
  };

  input.addEventListener('input', () => {
    clearBtn.hidden = !input.value;
    clearTimeout(timer);
    timer = setTimeout(emit, debounce);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && input.value) {
      event.preventDefault();
      clear();
    }
  });

  return h(
    'form',
    {
      role: 'search',
      class: cx('search-bar', size !== 'md' && `search-bar--${size}`, className),
      onSubmit: (event) => {
        event.preventDefault();
        emit();
      },
    },
    h('label', { for: id, class: 'u-visually-hidden' }, label),
    wrap,
    clearBtn,
  );
}
