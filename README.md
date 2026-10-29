# DentalCare · Centro odontológico

Landing page clínica como portada, ingreso por roles con sus pantallas, y un backend Express con 2 endpoints.

> Propuesta visual con datos ficticios: tratamientos, precios, especialistas, sedes y pacientes son inventados.

## Estructura
```
index.html          landing de 5 contenedores: hero, tratamientos, especialidades, testimonios y footer/contacto
login.html          ingreso (pestañas por rol) → pantallas de pages/
pages/              pantallas de los 4 roles: admin/, asistente/, doctor/, paciente/
css/                sistema de diseño en 7 hojas (Atomic Design)
  00-tokens.css  01-base.css  02-atoms.css  03-molecules.css
  04-organisms.css  05-templates.css  06-responsive.css
js/navigation.js    único script: menú, modales, pestañas, avisos, búsqueda en tablas
                    y envío del formulario de agendar (fetch → POST /api/citas)
backend/            Express: GET /api/tratamientos y POST /api/citas (ver backend/README.md)
database/           script de la base de datos MySQL (fase B)
```

En `index.html`, el botón **Iniciar sesión** del navbar lleva a `./login.html`, y todos los botones
**Agendar** abren el `<dialog id="dlg-agendar">`. Al pulsar **Solicitar cita**, `js/navigation.js` envía
los datos con `fetch()` a `POST http://localhost:3000/api/citas`: si el servidor responde `201`, cierra el
diálogo y muestra la confirmación; si responde `400` o no hay conexión, muestra el mensaje dentro del diálogo.

## Cómo ejecutarlo
1. Backend: `cd backend && npm install && npm start` (queda en `http://localhost:3000/api`).
2. Frontend: abre `index.html` con Live Server (puerto 5502 en `.vscode/settings.json`).

Las pantallas de `pages/` y `login.html` funcionan sin backend: el contenido ya está escrito en el HTML
y `js/navigation.js` solo cambia clases y atributos (contrato de estados en `css/05-templates.css`).
