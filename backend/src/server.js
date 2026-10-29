import express from 'express';
import cors from 'cors';

/**
 * API de la landing DentalCare: 2 endpoints con datos en memoria (sin base de datos).
 *   GET  /api/tratamientos   listado de tratamientos destacados
 *   POST /api/citas          solicitud del diálogo "Agendar valoración" de index.html
 */
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Los 8 tratamientos destacados de index.html (datos ficticios)
const tratamientos = [
  { id: 1, nombre: 'Ortodoncia con brackets', categoria: 'Ortodoncia', precio: 2800000, duracion: '18–24 meses', rating: 4.9 },
  { id: 2, nombre: 'Alineadores invisibles', categoria: 'Ortodoncia', precio: 6500000, duracion: '6–12 meses', rating: 4.8 },
  { id: 3, nombre: 'Diseño de sonrisa', categoria: 'Estética dental', precio: 1200000, duracion: '2–3 sesiones', rating: 4.9 },
  { id: 4, nombre: 'Implante dental', categoria: 'Implantología', precio: 3200000, duracion: '3–6 meses', rating: 4.8 },
  { id: 5, nombre: 'Blanqueamiento LED', categoria: 'Estética dental', precio: 650000, duracion: '90 min', rating: 4.7 },
  { id: 6, nombre: 'Tratamiento de conducto', categoria: 'Endodoncia', precio: 480000, duracion: '1–2 sesiones', rating: 4.8 },
  { id: 7, nombre: 'Limpieza y profilaxis', categoria: 'Higiene oral', precio: 120000, duracion: '45 min', rating: 4.9 },
  { id: 8, nombre: 'Valoración infantil', categoria: 'Odontopediatría', precio: 90000, duracion: '30 min', rating: 5.0 },
];

// Citas recibidas mientras el servidor está encendido
const citas = [];

// Endpoint 1
app.get('/api/tratamientos', (req, res) => {
  res.json({ success: true, count: tratamientos.length, data: tratamientos });
});

// Endpoint 2
app.post('/api/citas', (req, res) => {
  const { nombre, telefono, fecha, especialidad, sede } = req.body ?? {};
  const requeridos = { nombre, fecha, especialidad, sede };
  const faltantes = Object.keys(requeridos).filter((campo) => !String(requeridos[campo] ?? '').trim());

  if (faltantes.length) {
    return res.status(400).json({ success: false, message: `Faltan campos obligatorios: ${faltantes.join(', ')}.` });
  }

  const nuevaCita = { id: citas.length + 1, nombre, telefono, fecha, especialidad, sede, creadaEn: new Date().toISOString() };
  citas.push(nuevaCita);
  res.status(201).json({ success: true, message: 'Cita agendada correctamente', data: nuevaCita });
});

// Rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ success: false, message: `La ruta ${req.method} ${req.originalUrl} no existe.` });
});

app.listen(PORT, () => {
  console.log(`API DentalCare escuchando en http://localhost:${PORT}`);
  console.log(`  GET  http://localhost:${PORT}/api/tratamientos`);
  console.log(`  POST http://localhost:${PORT}/api/citas`);
});
