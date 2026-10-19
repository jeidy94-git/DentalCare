import { h, cx } from '../../core/dom.js';

const TONES = 6;
const TITLES = new Set(['dr', 'dr.', 'dra', 'dra.']);

/** Iniciales a partir del nombre, ignorando títulos como "Dr." / "Dra.". */
export function getInitials(name = '') {
  const words = name.trim().split(/\s+/).filter((w) => !TITLES.has(w.toLowerCase()));
  return words.slice(0, 2).map((w) => w.charAt(0)).join('') || '?';
}

/** Tono estable: el mismo nombre siempre obtiene el mismo color. */
function toneFor(name = '') {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % TONES;
}

/**
 * Átomo: Avatar
 * @param {object} props
 * @param {string} props.name                     Nombre completo (para iniciales y texto alternativo).
 * @param {string} [props.src]                    URL de la foto (opcional).
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} [props.size='md']
 * @returns {HTMLSpanElement}
 */
export function Avatar({ name = '', src, size = 'md', className, ...rest } = {}) {
  const avatar = h('span', {
    class: cx('avatar', size !== 'md' && `avatar--${size}`, !src && `avatar--tone-${toneFor(name)}`, className),
    title: name || undefined,
    ...rest,
  });

  if (src) {
    avatar.append(h('img', { src, alt: name, loading: 'lazy' }));
  } else {
    avatar.setAttribute('role', 'img');
    avatar.setAttribute('aria-label', name || 'Usuario');
    avatar.append(h('span', { 'aria-hidden': 'true' }, getInitials(name)));
  }
  return avatar;
}
