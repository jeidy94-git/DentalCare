# DentalCare · Frontend

HTML5 + CSS3 + JavaScript puro (ES Modules), organizado con **Atomic Design**. Sin frameworks, sin CDN.

## Cómo ejecutar
Los ES Modules no funcionan abriendo el archivo con doble clic (`file://`). Usa un servidor local:
- VS Code → extensión **Live Server** → clic derecho en `index.html` → *Open with Live Server*.
  En el login, "Cuentas de demostración" llena el formulario con un usuario de cada rol.
- El catálogo de componentes está en `styleguide.html`.
- Ábrelo por `127.0.0.1` o `localhost` (no por la IP de la red): el login usa Web Crypto, que solo existe en contextos seguros.

## Pruebas
Desde la raíz del proyecto, sin instalar nada (Node 22+): `node tests/agenda.test.mjs`, `node tests/services.test.mjs`, `node tests/guard.test.mjs`,
`node tests/apis-externas.test.mjs` (agrega `--live` para consultar también las APIs reales).

En navegador real (Edge; otro navegador con `BROWSER_PATH`): `node tests/e2e/server.mjs` en una terminal y, en otra,
`node tests/e2e/recorrido.test.mjs [ancho]`, `node tests/e2e/flujos.test.mjs [ancho]` y `node tests/e2e/apis.test.mjs [ancho]` (necesita internet).

Con el backend real (`USE_MOCK = false`, ver `backend/README.md`): `node tests/e2e/server.mjs --api` sirve `config.js` con el
interruptor apagado sin editar el archivo, y `node tests/e2e/backend.test.mjs [ancho]` prueba login, pacientes y errores contra la API.

## APIs externas (servicios web de terceros)
| API | Servicio | Se usa en |
|---|---|---|
| Departamentos y municipios (DIVIPOLA, `datos.gov.co`) | `js/services/colombia.service.js` | Registro de pacientes |
| TRM del dólar (`datos.gov.co`; respaldo `open.er-api.com`) | `js/services/trm.service.js` | Pagos (equivalencia en USD) |

No dependen de `USE_MOCK`. Usan `fetch()` con tiempo límite y caché en `localStorage` (`dentalcare:ext:…`), sin enviar el token de la sesión.
Sin internet, los municipios salen del respaldo `js/data/divipola.js` (import dinámico) y la TRM muestra la última consultada o un aviso.

## Pantallas (fase A6)
```
index.html · login.html · 403.html
pages/admin/      dashboard, pacientes, citas, especialistas, servicios, pagos, reportes
pages/asistente/  inicio, agenda, pacientes, pagos, novedades
pages/doctor/     dashboard, agenda, pacientes, historia (?id=), novedades
pages/paciente/   inicio, agendar, mis-citas, mi-historia, mis-pagos
```
Cada HTML declara su rol (`<body data-role="…">`) y carga un controlador de `js/pages/` que puede servir a varios roles
(p. ej. `pacientes.js` para admin, asistente y doctor).

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
               config.js → USE_MOCK, API_BASE_URL… · storage.js → localStorage con prefijo y respaldo en memoria
               session.js → sesión con vencimiento · guard.js → protección de páginas por rol · permissions.js → can()
  components/
    atoms/     Icon, Button, Input, Select, Textarea, Checkbox, Radio, Switch,
               Badge/StatusBadge, Avatar, Label, Spinner, Link  (barrel: index.js)
    molecules/ FormField, PasswordField (+ validateForm, setFieldError…), SearchBar, KpiCard,
               Tabs, Pagination, toast, confirmDialog, TimeSlot, Tooth/ToothLegend, Breadcrumbs  (barrel: index.js)
    organisms/ Topbar, Sidebar, DataTable, openModalForm, Odontogram, Calendar,
               BarChart/DashboardCharts, BookingWizard  (barrel: index.js)
    templates/ DashboardLayout, AuthLayout, DetailLayout  (barrel: index.js)
  data/divipola.js  respaldo local de departamentos y municipios (solo se carga si falla la API)
  data/mock/   pacientes, especialistas (+horarios), servicios, citas, odontograma, historias, consultas,
               ventas, novedades, seguridad (roles, permisos, usuarios con hash PBKDF2), usuarios
  services/    capa de servicios: auth, pacientes, citas, historias, odontograma, servicios, especialistas,
               ventas, novedades, colombia y trm (APIs externas) (barrel: index.js) · http.js (API) · externo.js (fetch a terceros) · api-error.js · mock/db.js · mock/password.js
  pages/       un controlador por vista (compartido entre roles): home, pacientes, citas, pagos, novedades, historia,
               especialistas, servicios, reportes, agendar, mis-citas, login, forbidden (403), entry (index)
               _shared/ → app-page.js (createAppPage, loadInto) · ui.js (card, dataList, withFieldErrors…) · citas.js
styleguide.html  catálogo vivo de tokens y componentes
```

## Convenciones
- Los componentes son **funciones que reciben `props` y devuelven un nodo DOM**.
- El DOM se construye con `h()`, nunca con `innerHTML` y datos, para prevenir XSS.
- El CSS consume **solo tokens** (`var(--color-brand)`), nunca colores literales.
- Los estados del dominio (`PROGRAMADA`, `PAGADO`…) se pintan con `StatusBadge(estado)`; el catálogo está en `ESTADOS`.
- Los formularios llevan `novalidate`; la validación en línea la hace `FormField` y al enviar se llama `validateForm(form)`.
- Odontograma: rojo = por tratar, azul = realizado (convención clínica). Las caras usan los códigos de `odontograma.cara_diente`.
- Datos: las páginas importan **solo** de `js/services/index.js`; nunca de `data/mock/` ni de `services/mock/`.
  `USE_MOCK` (en `core/config.js`) elige entre la base simulada en `localStorage` y la API REST.
- Pantallas internas: arrancan con `createAppPage({ role, activeId, title })` (guard + layout) y cargan con `loadInto()`.
- Templates: cada pantalla interna se arma con `DashboardLayout` (un solo `<h1>`, migas y skip-link incluidos) y
  cambia su contenido con `setContent()` / `setLoading()`. Login y contraseña usan `AuthLayout`; las fichas, `DetailLayout`.
