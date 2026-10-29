/* ==========================================================================
   navigation.js
   Único script del frontend. Es clásico (sin import/export) y solo maneja
   eventos sobre el DOM que ya está escrito en el HTML: no crea componentes,
   únicamente cambia atributos y clases (contrato de css/05-templates.css).

   Landing (index.html)
     1. Menú móvil (abrir / cerrar)
     2. Enlace activo según la sección visible (scrollspy)
     3. Carrusel de testimonios (anterior / siguiente)
     4. Diálogo "Agendar valoración" → fetch POST /api/citas

   Login y pantallas de los 4 roles (login.html, pages/)
     5. Menú lateral y menús desplegables de la barra superior
     6. Modales <dialog> (abrir / cerrar, modo nuevo/editar)
     7. Pestañas y vistas (data-tab → data-tab-panel)
     8. Envío de formularios de la app y avisos (toasts)
     9. Búsqueda y filtros rápidos de las tablas
   ========================================================================== */

(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  // Backend Express (backend/): GET /api/tratamientos y POST /api/citas
  const API_URL = 'http://localhost:3000/api';

  // Mismo corte que css/06-responsive.css
  const isDesktop = window.matchMedia('(min-width: 64em)'); // ≥ 1024px
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- Avisos (toasts) --------------------------------------------------- */

  // Sirve para los dos estilos de aviso: .molecule-toast (landing) y .toast (app).
  function showToast(id) {
    const toast = document.getElementById(id);
    if (!toast) return;
    toast.classList.add('is-visible');
    clearTimeout(Number(toast.dataset.timer));
    toast.dataset.timer = String(setTimeout(() => toast.classList.remove('is-visible'), 5000));
  }

  function hideToast(id) {
    document.getElementById(id)?.classList.remove('is-visible');
  }

  /* ---- 1. Menú móvil ---------------------------------------------------- */

  function initMobileMenu() {
    const toggle = $('[data-nav-toggle]');
    const menu = $('[data-nav-menu]');
    const bar = $('.organism-navbar__bar');
    if (!toggle || !menu || !bar) return;

    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', () => setOpen(!isOpen()));

    // Al elegir una sección, el panel se cierra
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    // Clic fuera de la barra
    document.addEventListener('click', (event) => {
      if (isOpen() && !bar.contains(event.target)) setOpen(false);
    });

    // Escape cierra y devuelve el foco al botón
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Al pasar a escritorio el menú ya es visible: se reinicia el estado
    isDesktop.addEventListener('change', () => setOpen(false));
  }

  /* ---- 2. Scrollspy ----------------------------------------------------- */

  function initScrollSpy() {
    const links = $$('.molecule-nav-list a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    const linkById = new Map(links.map((link) => [link.hash.slice(1), link]));
    const sections = [...linkById.keys()]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((link) => link.removeAttribute('aria-current'));
          const active = linkById.get(entry.target.id);
          if (active) active.setAttribute('aria-current', 'location');
        });
      },
      // La sección activa es la que cruza la franja central de la pantalla
      { rootMargin: '-45% 0px -50% 0px' }
    );

    sections.forEach((section) => observer.observe(section));
  }

  /* ---- 3. Carrusel de testimonios --------------------------------------- */

  function initCarousel() {
    const viewport = $('[data-carousel-viewport]');
    const prev = $('[data-carousel-prev]');
    const next = $('[data-carousel-next]');
    if (!viewport || !prev || !next) return;

    const items = $$('li', viewport);

    // Distancia entre el inicio de una tarjeta y el de la siguiente
    const step = () =>
      items.length > 1
        ? items[1].offsetLeft - items[0].offsetLeft
        : viewport.clientWidth * 0.8;

    const updateButtons = () => {
      const maxScroll = viewport.scrollWidth - viewport.clientWidth;
      prev.disabled = viewport.scrollLeft <= 4;
      next.disabled = viewport.scrollLeft >= maxScroll - 4;
    };

    const scrollByCard = (direction) => {
      viewport.scrollBy({
        left: direction * step(),
        behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
      });
    };

    prev.addEventListener('click', () => scrollByCard(-1));
    next.addEventListener('click', () => scrollByCard(1));
    viewport.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);
    updateButtons();
  }

  /* ---- 4. Diálogo de agendamiento (landing) ------------------------------ */

  function initModals() {
    const openers = $$('[data-modal-open]');
    if (!openers.length || typeof HTMLDialogElement !== 'function') return;

    // Los botones son enlaces al formulario del footer; con JS abren el <dialog>.
    openers.forEach((opener) => {
      opener.addEventListener('click', (event) => {
        const dialog = document.getElementById(opener.dataset.modalOpen);
        if (!dialog) return;
        event.preventDefault();
        dialog.querySelector('form')?.reset();
        setModalError(dialog, '');
        dialog.showModal();
      });
    });

    $$('dialog.organism-modal').forEach((dialog) => {
      // Botón de cerrar (×)
      $$('[data-modal-close]', dialog).forEach((button) => {
        button.addEventListener('click', () => dialog.close('cancelar'));
      });

      // Clic en el fondo oscuro (fuera del panel)
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close('cancelar');
      });

      // "Solicitar cita" envía los datos al backend antes de cerrar
      const form = dialog.querySelector('form');
      form?.addEventListener('submit', (event) => {
        if (event.submitter?.value !== 'confirmar') return; // "Cancelar" cierra sin enviar
        event.preventDefault();
        enviarCita(dialog, form, event.submitter);
      });

      // El <form method="dialog"> cierra el diálogo con el value del botón pulsado
      dialog.addEventListener('close', () => {
        if (dialog.returnValue === 'confirmar') showToast('toast-cita');
        dialog.returnValue = '';
      });
    });
  }

  function setModalError(dialog, message) {
    const error = $('[data-modal-error]', dialog);
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
  }

  /** POST /api/citas con los campos del formulario; el backend responde 201 o 400 con `message`. */
  async function enviarCita(dialog, form, button) {
    const datos = Object.fromEntries(new FormData(form));
    setModalError(dialog, '');
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(`${API_URL}/citas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detalle = body.fields ? Object.values(body.fields).join(' ') : '';
        setModalError(dialog, `${body.message ?? 'No se pudo agendar la cita.'} ${detalle}`.trim());
        return;
      }

      // El aviso muestra la confirmación que devolvió el servidor
      const texto = $('#toast-cita .molecule-toast__text');
      if (texto && body.message) texto.textContent = body.message;
      dialog.close('confirmar');
    } catch {
      setModalError(dialog, 'No hay conexión con el servidor. Verifica que el backend esté encendido (npm start en backend/).');
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }

  /* ---- 5. Menú lateral y menús desplegables (app) ------------------------ */

  function setSidebar(open) {
    $$('.sidebar, .sidebar-overlay').forEach((el) => el.classList.toggle('is-open', open));
    $$('[data-sidebar-open]').forEach((button) => button.setAttribute('aria-expanded', String(open)));
  }

  function closePopovers(except) {
    $$('[data-menu-toggle]').forEach((toggle) => {
      if (toggle === except) return;
      toggle.setAttribute('aria-expanded', 'false');
      document.getElementById(toggle.dataset.menuToggle)?.classList.remove('is-open');
    });
  }

  function togglePopover(toggle) {
    const popover = document.getElementById(toggle.dataset.menuToggle);
    if (!popover) return;
    const open = !popover.classList.contains('is-open');
    closePopovers(toggle);
    popover.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  /* ---- 6. Modales <dialog> (app) ------------------------------------------ */

  function openDialog(opener) {
    const dialog = document.getElementById(opener.dataset.dialogOpen);
    if (!dialog || typeof dialog.showModal !== 'function') return;

    // Un mismo formulario sirve para "nuevo" y "editar" (css: .modo-editar)
    if (opener.dataset.dialogMode) {
      dialog.classList.toggle('modo-editar', opener.dataset.dialogMode === 'editar');
      if (opener.dataset.dialogMode === 'nuevo') dialog.querySelector('form')?.reset();
    }
    // Aviso que se mostrará al guardar (el botón "Editar" usa uno distinto al de "Nuevo")
    dialog.dataset.toastPendiente = opener.dataset.dialogToast ?? '';
    dialog.showModal();
  }

  function closeDialog(button) {
    document.getElementById(button.dataset.dialogClose)?.close();
    if (button.dataset.toast) showToast(button.dataset.toast);
  }

  /* ---- 7. Pestañas y vistas ----------------------------------------------- */

  function activateTab(trigger) {
    const name = trigger.dataset.tab;
    const scope = trigger.closest('[data-tab-scope]') ?? document;
    const panel = $(`[data-tab-panel="${CSS.escape(name)}"]`, scope);
    if (!panel) return false;

    // Paneles hermanos: solo uno visible
    const panels = [...panel.parentElement.children].filter((el) => el.hasAttribute('data-tab-panel'));
    const names = panels.map((el) => el.dataset.tabPanel);
    panels.forEach((el) => el.classList.toggle('is-active', el === panel));

    // Pestañas que controlan esos paneles
    $$('[data-tab]', scope)
      .filter((tab) => names.includes(tab.dataset.tab) && (tab.matches('[role="tab"], .tabs__tab')))
      .forEach((tab) => {
        const active = tab.dataset.tab === name;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
      });

    if (scope !== document && scope.hasAttribute('data-view')) scope.dataset.view = name;
    return true;
  }

  /* ---- 8. Formularios de la app ------------------------------------------- */

  // Los formularios sin data-form (login: navega al inicio del rol) se envían normal.
  function onAppSubmit(event) {
    const form = event.target;
    if (!form.matches('form[data-form], form[data-action="buscar"]')) return;
    event.preventDefault();
    if (form.matches('[data-action="buscar"]')) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const dialog = form.closest('dialog');
    const toast = dialog?.dataset.toastPendiente || form.dataset.toast;
    if (dialog) {
      dialog.close();
      form.reset();
    }
    if (toast) showToast(toast);
  }

  /* ---- 9. Búsqueda y filtros de tablas ------------------------------------ */

  const normalizar = (texto = '') =>
    texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  function filtrarTabla(tabla) {
    if (!tabla) return;
    const buscador = $('input[data-action="buscar"]', tabla);
    const texto = normalizar(buscador?.value);
    const estado = $('input[data-action="filtrar"]:checked', tabla)?.value ?? '';

    let visibles = 0;
    $$('tbody tr[data-key]', tabla).forEach((fila) => {
      const coincide =
        (!texto || normalizar(fila.dataset.buscar ?? fila.textContent).includes(texto)) &&
        (!estado || fila.dataset.filtro === estado);
      fila.classList.toggle('is-oculta', !coincide);
      if (coincide) visibles += 1;
    });

    const contador = $('.data-table__count', tabla);
    if (contador) contador.textContent = String(visibles);
    tabla.classList.toggle('sin-resultados', visibles === 0);
    $('[data-action="limpiar-busqueda"]', tabla)?.classList.toggle('is-visible', Boolean(texto));
  }

  /* ---- Delegación de eventos de la app ------------------------------------ */

  function initApp() {
    document.addEventListener('click', (event) => {
      const target = event.target;

      const sidebarOpen = target.closest('[data-sidebar-open]');
      if (sidebarOpen) return setSidebar(true);
      if (target.closest('[data-sidebar-close]') || target.closest('.sidebar a[href]')) setSidebar(false);

      const menuToggle = target.closest('[data-menu-toggle]');
      if (menuToggle) return togglePopover(menuToggle);
      if (!target.closest('.popover')) closePopovers();

      const dialogOpen = target.closest('[data-dialog-open]');
      if (dialogOpen) return openDialog(dialogOpen);

      const dialogClose = target.closest('[data-dialog-close]');
      if (dialogClose) return closeDialog(dialogClose);

      // Clic en el fondo oscuro de un modal de la app
      if (target.matches('dialog.dialog')) return target.close();

      const toastClose = target.closest('[data-toast-close]');
      if (toastClose) return hideToast(toastClose.dataset.toastClose);

      const tab = target.closest('[data-tab]');
      if (tab && activateTab(tab)) return event.preventDefault();

      const limpiar = target.closest('[data-action="limpiar-busqueda"]');
      if (limpiar) {
        const tabla = limpiar.closest('.data-table');
        const buscador = $('input[data-action="buscar"]', tabla);
        if (buscador) buscador.value = '';
        filtrarTabla(tabla);
        buscador?.focus();
      }
    });

    document.addEventListener('input', (event) => {
      if (event.target.matches('input[data-action="buscar"]')) filtrarTabla(event.target.closest('.data-table'));
    });

    document.addEventListener('change', (event) => {
      if (event.target.matches('input[data-action="filtrar"]')) filtrarTabla(event.target.closest('.data-table'));
    });

    document.addEventListener('submit', onAppSubmit);

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closePopovers();
      setSidebar(false);
    });

    // Enlace directo a una pestaña: login.html#recuperar…
    if (location.hash) {
      const tab = $(`[data-tab="${CSS.escape(location.hash.slice(1))}"], [data-tab="vista-${CSS.escape(location.hash.slice(1))}"]`);
      if (tab) activateTab(tab);
    }
  }

  /* ---- Arranque --------------------------------------------------------- */

  initMobileMenu();
  initScrollSpy();
  initCarousel();
  initModals();
  initApp();
})();
