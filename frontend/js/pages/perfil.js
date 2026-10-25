/**
 * Mi perfil — perfil.html (todos los roles; se abre desde "Mi perfil" o "Configuración" del topbar).
 *
 *  - Datos de la cuenta: nombre, documento y rol en solo lectura; celular, correo y dirección editables
 *    (la dirección solo la tiene el paciente: la tabla `personal` no guarda dirección).
 *  - Seguridad: cambio de contraseña en un <dialog> (ModalForm) con contraseña actual, nueva y confirmación.
 *
 * El JS escucha `input` y `submit`, lee los datos con FormData y delega en authService. El estado visual
 * del formulario (sin cambios / cambios sin guardar / guardado) va en `data-state`, que interpreta
 * css/pages/perfil.css; los errores por campo, con setFieldError (clase field--invalid + aria-invalid).
 */
import { h } from '../core/dom.js';
import { validators } from '../core/validators.js';
import { ROLES } from '../core/navigation.js';
import { Button, setButtonLoading } from '../components/atoms/index.js';
import { FormField, PasswordField, setFieldError, validateForm, toast } from '../components/molecules/index.js';
import { openModalForm } from '../components/organisms/index.js';
import { authService, isApiError } from '../services/index.js';
import { createAppPage, loadInto, errorMessage } from './_shared/app-page.js';
import { card, crumbs, withFieldErrors } from './_shared/ui.js';

/** Solo los campos editables del FormData: los de solo lectura no se envían (y el servicio tampoco los aceptaría). */
const editableData = (form, editable) => Object.fromEntries([...new FormData(form)].filter(([name]) => editable.has(name)).map(([k, v]) => [k, String(v).trim()]));

function cuentaForm(perfil) {
  const editable = new Set(perfil.editables);
  const submit = Button({ label: 'Guardar cambios', type: 'submit', icon: 'check' });
  const snapshot = () => JSON.stringify(editableData(form, editable));

  const form = h(
    'form',
    { class: 'perfil-form', novalidate: true, dataset: { state: 'clean' }, 'aria-label': 'Datos de la cuenta' },
    h(
      'div',
      { class: 'form-grid' },
      FormField({ label: 'Nombre', value: perfil.nombre, readonly: true }),
      FormField({ label: 'Rol', value: ROLES[perfil.rol]?.label ?? perfil.rol, readonly: true }),
      FormField({
        label: 'Documento de identidad',
        value: perfil.numero_documento ? `${perfil.tipo_documento} ${perfil.numero_documento}` : '—',
        readonly: true,
        hint: 'Para corregirlo, comunícate con la administración.',
      }),
      FormField({ label: 'Celular', name: 'telefono', type: 'tel', inputmode: 'numeric', autocomplete: 'tel', required: true, value: perfil.telefono ?? '', validate: validators.telefono() }),
      FormField({
        label: 'Correo electrónico',
        name: 'email',
        type: 'email',
        autocomplete: 'email',
        required: true,
        value: perfil.email,
        validate: validators.email(),
        hint: 'Es el usuario con el que inicias sesión.',
        className: 'form-grid__full',
      }),
      editable.has('direccion') &&
        FormField({ label: 'Dirección', name: 'direccion', autocomplete: 'street-address', optional: true, value: perfil.direccion ?? '', validate: validators.maxLength(150), className: 'form-grid__full' }),
    ),
    h(
      'div',
      { class: 'perfil-form__footer' },
      // Los dos mensajes existen siempre; el CSS muestra el que corresponde a data-state.
      h('p', { class: 'perfil-form__status', role: 'status' }, h('span', { class: 'perfil-form__status-dirty' }, 'Tienes cambios sin guardar.'), h('span', { class: 'perfil-form__status-saved' }, 'Cambios guardados.')),
      submit,
    ),
  );

  let saved = snapshot();
  const dirty = () => snapshot() !== saved;
  const setState = (state) => {
    form.dataset.state = state;
    submit.disabled = state !== 'dirty';
  };
  setState('clean');

  form.addEventListener('input', () => setState(dirty() ? 'dirty' : 'clean'));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!dirty() || !validateForm(form)) return;
    const data = editableData(form, editable);
    setButtonLoading(submit, true);
    try {
      await authService.actualizarPerfil(data);
      saved = snapshot();
      setButtonLoading(submit, false);
      setState('saved');
      toast.success('Tus datos de contacto quedaron actualizados.', 'Perfil actualizado');
    } catch (error) {
      setButtonLoading(submit, false);
      setState('dirty');
      const fields = isApiError(error) ? Object.entries(error.fields ?? {}) : [];
      const shown = fields.filter(([name, message]) => {
        const field = form.querySelector(`[name="${name}"]`)?.closest('.field');
        if (field) setFieldError(field, message);
        return Boolean(field);
      });
      if (shown.length) form.querySelector(`[name="${shown[0][0]}"]`).focus();
      else toast.error(errorMessage(error), 'No se guardaron los cambios');
    }
  });

  return form;
}

async function cambiarPassword() {
  const done = await openModalForm({
    title: 'Cambiar contraseña',
    description: 'Por seguridad, confirma tu contraseña actual.',
    submitLabel: 'Cambiar contraseña',
    fields: () => {
      const nueva = PasswordField({
        label: 'Nueva contraseña',
        name: 'password_nueva',
        autocomplete: 'new-password',
        required: true,
        validate: validators.password(),
        hint: 'Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.',
      });
      return [
        PasswordField({ label: 'Contraseña actual', name: 'password_actual', autocomplete: 'current-password', required: true }),
        nueva,
        PasswordField({
          label: 'Confirmar nueva contraseña',
          name: 'password_confirmacion',
          autocomplete: 'new-password',
          required: true,
          validate: validators.matches(() => nueva._dcField.control.value, 'Las contraseñas no coinciden.'),
        }),
      ];
    },
    onSubmit: withFieldErrors((data) => authService.cambiarPassword(data)),
  });
  if (done) toast.success('Úsala la próxima vez que inicies sesión.', 'Contraseña actualizada');
}

async function init() {
  const page = createAppPage({ role: Object.keys(ROLES), title: 'Mi perfil', subtitle: 'Datos de tu cuenta y seguridad.' });
  if (!page) return;
  const { user, layout } = page;
  layout.update({ breadcrumbs: crumbs(user, { label: 'Mi perfil' }) });

  const perfil = await loadInto(layout, () => authService.perfil(), 'Cargando tu perfil…');
  if (!perfil) return;

  const seguridad = card(
    { title: 'Seguridad', subtitle: 'Cambia tu contraseña de acceso.' },
    h('p', { class: 'perfil__text' }, 'Te pediremos tu contraseña actual antes de guardar la nueva.'),
    h('div', {}, Button({ label: 'Cambiar contraseña', icon: 'lock', variant: 'outline', onClick: cambiarPassword })),
  );
  seguridad.id = 'seguridad'; // destino de "Configuración" en el topbar (perfil.html#seguridad)

  layout.setContent(
    h(
      'div',
      { class: 'perfil' },
      card({ title: 'Datos de la cuenta', subtitle: 'Puedes actualizar tus datos de contacto.' }, cuentaForm(perfil)),
      seguridad,
    ),
  );
  if (location.hash === '#seguridad') seguridad.scrollIntoView();
}

init();
