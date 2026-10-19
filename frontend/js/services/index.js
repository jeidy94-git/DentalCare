/**
 * Barrel de la capa de servicios: las páginas importan SOLO desde aquí.
 *
 *   import { pacientesService, ApiError } from '../../js/services/index.js';
 *   const pacientes = await pacientesService.list({ q: 'galvis' });
 *
 * Cada servicio elige su implementación con USE_MOCK (js/core/config.js): mock (localStorage) o API REST.
 */
export { ApiError, isApiError } from './api-error.js';
export { authService, mockOutbox } from './auth.service.js';
export { pacientesService } from './pacientes.service.js';
export { citasService } from './citas.service.js';
export { historiasService } from './historias.service.js';
export { odontogramaService, ESTADOS_TRATAMIENTO } from './odontograma.service.js';
export { serviciosService } from './servicios.service.js';
export { especialistasService, DIAS_SEMANA } from './especialistas.service.js';
export { ventasService } from './ventas.service.js';
export { novedadesService, TIPOS_NOVEDAD } from './novedades.service.js';
export { resetDb as resetDemoData } from './mock/db.js';
