# DentalCare · Backend

API REST en **Node.js + Express 5 + MySQL/MariaDB** (`mysql2/promise`, sin ORM), en 4 capas. Explicación
completa en `docs/SUSTENTACION.md` §16 (fase C) y §17 (Evidencia 2: capas y citas).

## Cómo ejecutar
1. Encender MySQL/MariaDB (XAMPP) e importar la base v2 una vez: `mysql -u root < database/dentalcare_bd_v2.sql`
2. En esta carpeta:
   ```bash
   npm install
   cp .env.example .env     # y completar JWT_SECRET (el comando para generarlo está en el archivo)
   npm start                # http://localhost:3000/api  (npm run dev reinicia al guardar)
   ```
3. Frontend con la API: `USE_MOCK = false` en `frontend/js/core/config.js` y abrir `frontend/index.html`
   con Live Server (puerto 5500, ya permitido en `CORS_ORIGIN`).

## Endpoints
| Método y ruta | Descripción | Acceso |
|---|---|---|
| `GET /api/health` | Estado del servidor y de la base | Público |
| `POST /api/auth/login` | `{ email, password }` → `{ token, user }` (JWT de 8 h) | Público |
| `GET /api/auth/me` | Usuario de la sesión | Token |
| `POST /api/auth/logout` | Registra el cierre de sesión (204) | Token |
| `GET /api/pacientes?q=` | Listado y búsqueda (el rol PACIENTE solo se ve a sí mismo) | Token |
| `POST /api/pacientes` | Registro con validación y DIVIPOLA (201, 400, 409) | `GESTIONAR_PACIENTES` |
| `GET /api/citas?desde&hasta&id_especialista&id_paciente&estado` | Citas con nombres (el PACIENTE solo las suyas); `estado` admite `A,B` | Token |
| `GET /api/citas/ocupacion?desde&hasta` | Franjas tomadas sin datos del paciente (Ley 1581) | `CREAR_CITA` |
| `POST /api/citas` | Agenda con RN-02 (201, 400, 404, 409 franja ocupada, 422 fuera de horario); el PACIENTE queda `PENDIENTE_CONFIRMACION` | `CREAR_CITA` |
| `PATCH /api/citas/:id/estado` | `{ estado: PROGRAMADA \| COMPLETADA \| CANCELADA }` con auditoría (403 / 409 según rol y transición) | Token (reglas en el servicio) |
| `GET /api/especialistas?soloActivos=true` | Odontólogos con sus horarios (los usa la agenda) | Token |
| `GET /api/servicios?soloActivos=true` | Tratamientos (el PACIENTE solo ve los activos) | Token |

Todas las rutas protegidas esperan `Authorization: Bearer <token>`. Los errores responden siempre
`{ status, message, fields, code }`, el mismo formato del `ApiError` del frontend.

## Estructura (4 capas)
```
src/
  server.js      arranque y apagado
  app.js         CORS → JSON → rutas → 404 → errores
  config/        env.js (valida el .env, fija la zona horaria) · db.js (pool + withTransaction)
  routes/        URL → middlewares (verifyToken, requirePermission) → controlador
  controllers/   HTTP: lee req, llama al servicio, responde (código, Location, JSON)
  services/      reglas de negocio: RN-02 (agenda.js), permisos por rol, estados, transacciones
  repositories/  solo SQL parametrizado (mysql2/promise, `?`)
  middlewares/   auth.js (verifyToken, requirePermission, sesionDe) · error-handler.js
  utils/         ApiError, validadores, permisos, ubicación DIVIPOLA
  data/          divipola.js (copia de frontend/js/data/divipola.js)
```
Las llamadas van en un solo sentido: ruta → controlador → servicio → repositorio.

## Pruebas
Desde la raíz del proyecto (usan la base de `.env`; con `DB_PORT=…` apuntan a otra y la dejan como estaba):
- `node tests/backend/api.test.mjs`: auth y pacientes (79).
- `node tests/backend/citas.test.mjs`: citas, RN-02, carreras, estados y catálogos de la agenda (84).
- `npm test` (en `backend/`) corre las dos.

Integración en navegador con `USE_MOCK = false`: `tests/e2e/backend.test.mjs` y `tests/e2e/citas-backend.test.mjs`
(ver su encabezado).
