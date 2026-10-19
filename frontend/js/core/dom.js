/**
 * Utilidades mínimas de DOM usadas por todos los componentes.
 * Se construye con createElement (nunca innerHTML con datos) para evitar XSS.
 */

/** Une clases CSS ignorando valores falsy. cx('a', cond && 'b') → 'a b' */
export function cx(...classes) {
  return classes.flat().filter(Boolean).join(' ');
}

/**
 * Crea un elemento HTML.
 * - `class` acepta string o array.
 * - `onClick`, `onInput`… registran listeners.
 * - `dataset` y `style` (objeto) se asignan directamente.
 * - Atributos con valor `true` se agregan vacíos; `false/null/undefined` se omiten.
 *
 * @param {string} tag
 * @param {Record<string, any>} [attrs]
 * @param {...(Node|string|number|null|false|Array)} children
 * @returns {HTMLElement}
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === undefined || value === null || value === false) continue;

    if (key === 'class') {
      el.className = Array.isArray(value) ? cx(...value) : value;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }

  appendChildren(el, children);
  return el;
}

/** Agrega hijos a un nodo aceptando strings, nodos, arrays anidados y valores vacíos. */
export function appendChildren(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

/** Reemplaza el contenido de un nodo. */
export function mount(parent, ...children) {
  parent.replaceChildren();
  return appendChildren(parent, children);
}

/** Genera ids únicos para enlazar label ↔ input y aria-describedby. */
let uid = 0;
export function uniqueId(prefix = 'dc') {
  uid += 1;
  return `${prefix}-${uid}`;
}
