import { h } from '../../core/dom.js';
import { formatDate } from '../../core/format.js';
import { timeOf } from '../../core/agenda.js';
import { appUrl, ROLES } from '../../core/navigation.js';
import { Icon } from '../../components/atoms/index.js';
import { toast } from '../../components/molecules/index.js';
import { FieldError } from '../../components/organisms/index.js';
import { isApiError } from '../../services/index.js';
import { errorMessage } from './app-page.js';

/**
 * Piezas pequeñas que repiten varias páginas de la fase A6.
 * Todo se construye con h(): los datos (nombres, diagnósticos, descripciones…) siempre van como texto.
 */

export const fullName = (p) => (p ? `${p.nombres} ${p.apellidos}` : '—');

/** "19 oct 2026 · 09:00" */
export const fechaHora = (value) => `${formatDate(value, { day: '2-digit', month: 'short', year: 'numeric' })} · ${timeOf(value)}`;

/** Parámetro de la URL actual (?id=11 → '11'). */
export const queryParam = (name) => new URLSearchParams(globalThis.location.search).get(name);

/** Migas: "Inicio › …". La última no lleva enlace. */
export const crumbs = (user, ...items) => [{ label: 'Inicio', href: appUrl(ROLES[user.rol].home) }, ...items];

/** Lista etiqueta / valor (dl). Los valores vacíos se muestran como "—". */
export const dataList = (rows) =>
  h(
    'dl',
    { class: 'data-list' },
    rows.map(([label, value]) => h('div', {}, h('dt', { class: 'data-list__label' }, label), h('dd', { class: 'data-list__value' }, value ?? '—'))),
  );

/** Tarjeta con título (h2) enlazado por aria-labelledby. */
let cardSeq = 0;
export function card({ title, subtitle, actions } = {}, ...content) {
  const id = `card-title-${++cardSeq}`;
  return h(
    'section',
    { class: 'card', 'aria-labelledby': id },
    h('div', { class: 'card__header' }, h('div', {}, h('h2', { class: 'card__title', id }, title), subtitle && h('p', { class: 'card__subtitle' }, subtitle)), actions && h('div', { class: 'page-header__actions' }, actions)),
    content,
  );
}

/** Aviso dentro del contenido (reutiliza el estilo de las alertas de la ficha). tone: 'info' | 'warning' | 'danger'. */
export const notice = (text, tone = 'info', { role } = {}) =>
  h('div', { class: `detail-alert detail-alert--${tone}`, role }, Icon({ name: { danger: 'alert-circle', warning: 'alert-triangle' }[tone] ?? 'info', size: 18, className: 'detail-alert__icon' }), h('p', {}, text));

/**
 * Adapta un onSubmit de ModalForm a los errores del servicio: si el ApiError trae errores por campo
 * ({ numero_documento: 'Ya existe…' }), el primero se muestra junto a ese control.
 */
export const withFieldErrors = (submit) => async (data, form) => {
  try {
    return await submit(data, form);
  } catch (error) {
    const first = isApiError(error) ? error.firstField() : null;
    // Sin `form` (p. ej. el alta rápida del BookingWizard) se confía en que el campo exista en su modal.
    if (first && (!form || form.querySelector(`[name="${first[0]}"]`))) throw new FieldError(first[0], first[1]);
    throw error;
  }
};

/** Ejecuta una acción del servicio y avisa el resultado con un toast. Devuelve true si salió bien. */
export async function runAction(action, successMessage, successTitle) {
  try {
    await action();
    if (successMessage) toast.success(successMessage, successTitle);
    return true;
  } catch (error) {
    toast.error(errorMessage(error), 'No se pudo completar');
    return false;
  }
}
