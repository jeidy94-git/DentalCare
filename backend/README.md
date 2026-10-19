# DentalCare · Backend

API REST en **Node.js + Express 5 + MySQL/MariaDB** (`mysql2/promise`, sin ORM). Explicación completa
en `docs/SUSTENTACION.md` §16.

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

## Endpoints (fase C)
| Método y ruta | Descripción | Acceso |
|---|---|---|
| `GET /api/health` | Estado del servidor y de la base | Público |
| `POST /api/auth/login` | `{ email, password }` → `{ token, user }` (JWT de 8 h) | Público |
| `GET /api/auth/me` | Usuario de la sesión | Token |
| `POST /api/auth/logout` | Registra el cierre de sesión (204) | Token |
| `GET /api/pacientes?q=` | Listado y búsqueda (el rol PACIENTE solo se ve a sí mismo) | Token |
| `POST /api/pacientes` | Registro con validación y DIVIPOLA (201, 400, 409) | `GESTIONAR_PACIENTES` |

Todas las rutas protegidas esperan `Authorization: Bearer <token>`. Los errores responden siempre
`{ status, message, fields, code }`, el mismo formato del `ApiError` del frontend.

## Estructura
```
src/
  server.js      arranque y apagado
  app.js         CORS → JSON → rutas → 404 → errores
  config/        env.js (valida el .env) · db.js (pool + withTransaction)
  routes/        URL → middlewares → controlador
  controllers/   validación y lógica
  models/        solo SQL parametrizado
  middlewares/   auth.js (verifyToken, requirePermission) · error-handler.js
  utils/         ApiError, validadores, permisos, ubicación DIVIPOLA
  data/          divipola.js (copia de frontend/js/data/divipola.js)
```

## Pruebas
Desde la raíz del proyecto: `node tests/backend/api.test.mjs` (usa la base de `.env`; con `DB_PORT=…`
apunta a otra). Integración en navegador: `tests/e2e/backend.test.mjs` (ver su encabezado).
