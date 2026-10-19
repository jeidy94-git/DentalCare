/**
 * login.html — inicio de sesión (HU-02, RF-ACC-01/02) y recuperación de contraseña (HU-01).
 *
 *   login.html                      → formulario de ingreso
 *   login.html?next=pages/…         → después de ingresar vuelve a esa página (validada con safeNext)
 *   login.html?expired=1            → avisa que la sesión venció
 *   login.html?token=…              → enlace de recuperación: formulario de contraseña nueva
 *
 * Una sola página con varias vistas de AuthLayout: no se recarga al pasar de "recuperar" a "revisa tu correo".
 */
import { h } from '../core/dom.js';
import { validators } from '../core/validators.js';
import { appUrl, ROLES } from '../core/navigation.js';
import { safeNext, redirectIfAuthenticated, loginUrl } from '../core/guard.js';
import { Button, setButtonLoading, Icon, Link } from '../components/atoms/index.js';
import { FormField, PasswordField, validateForm, setFieldError, toast } from '../components/molecules/index.js';
import { AuthLayout } from '../components/templates/index.js';
import { authService, mockOutbox, demoAccounts, isApiError } from '../services/index.js';
import { errorMessage } from './_shared/app-page.js';
import { notice } from './_shared/ui.js';

const params = new URLSearchParams(location.search);
const next = params.get('next');
const token = params.get('token');

const layout = AuthLayout({ title: '', homeHref: appUrl('index.html') });
document.body.append(layout);

const show = (view, data) => layout.setView(VIEWS[view](data));
const backToLogin = () => Link({ href: loginUrl(), label: 'Volver a iniciar sesión', icon: 'arrow-left', size: 'sm', onClick: (e) => (e.preventDefault(), show('login')) });

/** Zona de mensajes del formulario (errores generales que no son de un campo). */
const alertBox = () => h('div', { class: 'auth-form__alert', role: 'alert' });
const setAlert = (box, text) => box.replaceChildren(...(text ? [notice(text, 'danger')] : []));

const VIEWS = {
  login: ({ expired = false } = {}) => {
    const submit = Button({ label: 'Ingresar', type: 'submit', block: true });
    const email = FormField({ label: 'Correo electrónico', name: 'email', type: 'email', icon: 'mail', required: true, autocomplete: 'username', validate: validators.email() });
    const password = PasswordField({ label: 'Contraseña', name: 'password', required: true });
    const alert = alertBox();

    const form = h(
      'form',
      { class: 'auth-form', novalidate: true },
      expired && notice('Tu sesión terminó por seguridad. Ingresa de nuevo para continuar.', 'info', { role: 'status' }),
      alert,
      email,
      password,
      h('div', { class: 'auth-form__row' }, h('span'), Link({ href: '#recuperar', label: '¿Olvidaste tu contraseña?', size: 'sm', onClick: (e) => (e.preventDefault(), show('recover')) })),
      submit,
    );

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setAlert(alert, null);
      if (!validateForm(form)) return;
      const data = Object.fromEntries(new FormData(form));
      setButtonLoading(submit, true);
      try {
        const user = await authService.login(data.email, data.password);
        // replace: el login no queda en el historial ("Atrás" no vuelve al formulario).
        location.replace(safeNext(next, user.rol));
      } catch (error) {
        setButtonLoading(submit, false);
        // RF-ACC-02: el mismo mensaje si falla el correo o la contraseña (no se dice cuál).
        if (isApiError(error) && error.status === 401) {
          setFieldError(password, error.message);
          password.querySelector('input').select();
        } else setAlert(alert, errorMessage(error));
      }
    });

    const demos = demoAccounts();
    return {
      title: 'Iniciar sesión',
      subtitle: 'Ingresa con tu correo y contraseña.',
      content: form,
      footer: demos.length
        ? h(
            'details',
            { class: 'auth-demo' },
            h('summary', {}, 'Cuentas de demostración'),
            h(
              'ul',
              { class: 'auth-demo__list', role: 'list' },
              demos.map((d) =>
                h(
                  'li',
                  {},
                  h(
                    'button',
                    {
                      type: 'button',
                      class: 'auth-demo__item',
                      onClick: () => {
                        email.querySelector('input').value = d.email;
                        password.querySelector('input').value = d.password;
                        submit.focus();
                      },
                    },
                    h('strong', {}, ROLES[d.rol].label),
                    h('span', {}, d.email),
                  ),
                ),
              ),
            ),
          )
        : null,
    };
  },

  recover: () => {
    const submit = Button({ label: 'Enviar enlace', type: 'submit', block: true, icon: 'mail' });
    const alert = alertBox();
    const form = h(
      'form',
      { class: 'auth-form', novalidate: true },
      alert,
      FormField({ label: 'Correo electrónico', name: 'email', type: 'email', icon: 'mail', required: true, autocomplete: 'email', validate: validators.email() }),
      submit,
    );
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setAlert(alert, null);
      if (!validateForm(form)) return;
      const email = new FormData(form).get('email');
      setButtonLoading(submit, true);
      try {
        const { message } = await authService.requestPasswordReset(email);
        show('sent', { email, message });
      } catch (error) {
        setButtonLoading(submit, false);
        setAlert(alert, errorMessage(error));
      }
    });
    return { title: 'Recuperar contraseña', subtitle: 'Te enviaremos un enlace para crear una contraseña nueva.', content: form, footer: backToLogin() };
  },

  // Mismo mensaje exista o no el correo: no se revela quién está registrado (enumeración de usuarios).
  sent: ({ email, message }) => {
    const link = mockOutbox(email);
    return {
      title: 'Revisa tu correo',
      subtitle: '',
      content: h(
        'div',
        { class: 'auth-notice' },
        h('span', { class: 'auth-notice__icon', 'aria-hidden': 'true' }, Icon({ name: 'mail', size: 24 })),
        h('p', {}, message, ' El enlace vence en 30 minutos.'),
        // Solo en la demo (USE_MOCK): no hay servidor de correo, así que se ofrece abrir el enlace aquí mismo.
        link && Button({ label: 'Abrir el enlace (demostración)', variant: 'outline', block: true, onClick: () => location.assign(appUrl(link)) }),
      ),
      footer: backToLogin(),
    };
  },

  reset: ({ email }) => {
    const nueva = PasswordField({ label: 'Nueva contraseña', name: 'password', required: true, autocomplete: 'new-password', hint: 'Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.', validate: validators.password() });
    const nuevaInput = nueva.querySelector('input');
    const submit = Button({ label: 'Guardar contraseña', type: 'submit', block: true, icon: 'lock' });
    const alert = alertBox();
    const form = h(
      'form',
      { class: 'auth-form', novalidate: true },
      alert,
      nueva,
      PasswordField({ label: 'Confirmar contraseña', name: 'confirmacion', required: true, autocomplete: 'new-password', validate: validators.matches(() => nuevaInput.value, 'Las contraseñas no coinciden.') }),
      submit,
    );
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setAlert(alert, null);
      if (!validateForm(form)) return;
      setButtonLoading(submit, true);
      try {
        const { message } = await authService.resetPassword(token, nuevaInput.value);
        // El token ya no sirve: se quita de la URL para que recargar no muestre otra vez este formulario.
        history.replaceState(null, '', loginUrl());
        toast.success(message, 'Contraseña actualizada');
        show('login');
      } catch (error) {
        setButtonLoading(submit, false);
        const field = isApiError(error) && error.firstField();
        if (field?.[0] === 'password') setFieldError(nueva, field[1]);
        else setAlert(alert, errorMessage(error));
      }
    });
    return { title: 'Crear contraseña nueva', subtitle: `Para la cuenta ${email}.`, content: form, footer: backToLogin() };
  },

  invalidToken: ({ message }) => ({
    title: 'Enlace no válido',
    subtitle: '',
    content: h('div', { class: 'auth-form' }, notice(message, 'danger'), Button({ label: 'Solicitar un enlace nuevo', block: true, onClick: () => show('recover') })),
    footer: backToLogin(),
  }),
};

async function init() {
  if (token) {
    layout.setView({ title: 'Verificando enlace…', subtitle: '', content: null, footer: null }, { focus: false });
    try {
      show('reset', await authService.verifyResetToken(token));
    } catch (error) {
      history.replaceState(null, '', loginUrl());
      show('invalidToken', { message: errorMessage(error) });
    }
    return;
  }
  // Con sesión vigente no tiene sentido el formulario: al inicio de su rol (o a `next`, si es válido).
  if (redirectIfAuthenticated({ next })) return;
  layout.setView(VIEWS.login({ expired: params.get('expired') === '1' }), { focus: false });
}

init();
