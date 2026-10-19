import * as especialistaRepo from '../repositories/especialista.repository.js';
import * as servicioRepo from '../repositories/servicio.repository.js';

/**
 * Consultas de solo lectura que necesita la agenda: odontólogos con sus horarios y tratamientos.
 * Mismo contrato que `list()` de frontend/js/services/especialistas.service.js y servicios.service.js.
 * (Crear, editar e inactivar estos catálogos queda para su propio módulo.)
 */

/** `soloActivos` llega en la URL como texto: ?soloActivos=true */
const siEsVerdad = (valor) => valor === 'true' || valor === true;

/** Odontólogos, cada uno con `horarios: [...]` (RN-02: de ahí salen las franjas del asistente). */
export async function especialistas({ soloActivos } = {}) {
  const [lista, horarios] = await Promise.all([especialistaRepo.listar(), especialistaRepo.horarios()]);
  return lista
    .filter((e) => !siEsVerdad(soloActivos) || e.estado === 'ACTIVO')
    .map((e) => ({ ...e, horarios: horarios.filter((h) => h.id_especialista === e.id_especialista) }));
}

/** Tratamientos. El PACIENTE solo ve los activos (los inactivos no se pueden agendar). */
export async function servicios(sesion, { soloActivos } = {}) {
  return servicioRepo.listar({ soloActivos: siEsVerdad(soloActivos) || sesion.user.rol === 'PACIENTE' });
}
