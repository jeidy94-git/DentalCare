# DentalCare · Backend

API en **Node.js + Express 5** con exactamente **2 endpoints**, los que usa la landing (`index.html`).
Todo está en `src/server.js`: los tratamientos y las citas viven en memoria (sin base de datos), así que
las citas se pierden al apagar el servidor.

## Cómo ejecutar
```bash
cd backend
npm install
npm start          # http://localhost:3000  (npm run dev reinicia al guardar)
```
El puerto se puede cambiar con la variable de entorno `PORT`. Abre la landing con Live Server.

## Endpoints
| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `GET /api/tratamientos` | — | `200` `{ success: true, count: 8, data: [{ id, nombre, categoria, precio, duracion, rating }] }` |
| `POST /api/citas` | `{ nombre, telefono?, fecha, especialidad, sede }` | `201` `{ success: true, message: "Cita agendada correctamente", data: nuevaCita }` · `400` si faltan nombre, fecha, especialidad o sede |

Cualquier otra ruta responde `404` `{ success: false, message }`.

```bash
curl http://localhost:3000/api/tratamientos
curl -X POST http://localhost:3000/api/citas -H "Content-Type: application/json" \
  -d '{"nombre":"Ana Torres","fecha":"2026-11-15","especialidad":"Ortodoncia","sede":"Cali · Granada"}'
```
