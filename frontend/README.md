# DentalCare · Frontend

HTML5 + CSS3 + JavaScript puro (ES Modules), organizado con **Atomic Design**. Sin frameworks, sin CDN.

## Cómo ejecutar
Los ES Modules no funcionan abriendo el archivo con doble clic (`file://`). Usa un servidor local:
- VS Code → extensión **Live Server** → clic derecho en `styleguide.html` → *Open with Live Server*.

## Estructura
```
css/
  base/        tokens.css (design tokens) · reset.css · base.css
  atoms/       un archivo por átomo (BEM: .btn, .btn--primary, .btn__label)
  molecules/   form-field, search-bar, kpi-card, tabs, pagination, feedback (toast + dialog), time-slot, tooth, breadcrumbs
  organisms/   topbar, sidebar, data-table, modal-form, odontogram, calendar, charts, booking-wizard
  templates/   app-shell (DashboardLayout + .card/.page-kpis/.data-list), auth-layout, detail-layout
  pages/       estilos exclusivos de una página
  main.css     importa todo en orden de Atomic Design
js/
  core/        dom.js → h(), cx(), mount(), uniqueId()
               validators.js → validators.required/email/documento/telefono/password/… + compose()
               format.js → formatNumber, formatCOP, formatDate, formatLongDate, formatRelative, toDate (es-CO)
               dates.js → toISODate, addDays, startOfWeek… · agenda.js → franjas, RN-02, alternativas
               popover.js → menús desplegables · navigation.js → menú por rol + appUrl()
  components/
    atoms/     Icon, Button, Input, Select, Textarea, Checkbox, Radio, Switch,
               Badge/StatusBadge, Avatar, Label, Spinner, Link  (barrel: index.js)
    molecules/ FormField, PasswordField (+ validateForm, setFieldError…), SearchBar, KpiCard,
               Tabs, Pagination, toast, confirmDialog, TimeSlot, Tooth/ToothLegend, Breadcrumbs  (barrel: index.js)
    organisms/ Topbar, Sidebar, DataTable, openModalForm, Odontogram, Calendar,
               BarChart/DashboardCharts, BookingWizard  (barrel: index.js)
    templates/ DashboardLayout, AuthLayout, DetailLayout  (barrel: index.js)
  data/mock/   pacientes, especialistas (+horarios), servicios, citas, odontograma, historias, usuarios
  pages/       un controlador por página HTML
styleguide.html  catálogo vivo de tokens y componentes
```

## Convenciones
- Los componentes son **funciones que reciben `props` y devuelven un nodo DOM**.
- El DOM se construye con `h()`, nunca con `innerHTML` y datos, para prevenir XSS.
- El CSS consume **solo tokens** (`var(--color-brand)`), nunca colores literales.
- Los estados del dominio (`PROGRAMADA`, `PAGADO`…) se pintan con `StatusBadge(estado)`; el catálogo está en `ESTADOS`.
- Los formularios llevan `novalidate`; la validación en línea la hace `FormField` y al enviar se llama `validateForm(form)`.
- Odontograma: rojo = por tratar, azul = realizado (convención clínica). Las caras usan los códigos de `odontograma.cara_diente`.
- Templates: cada pantalla interna se arma con `DashboardLayout` (un solo `<h1>`, migas y skip-link incluidos) y
  cambia su contenido con `setContent()` / `setLoading()`. Login y contraseña usan `AuthLayout`; las fichas, `DetailLayout`.
