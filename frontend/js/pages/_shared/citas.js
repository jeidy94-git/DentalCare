import { h } from '../../core/dom.js';
import { toDate } from '../../core/format.js';
import { appUrl } from '../../core/navigation.js';
import { can, PERMISOS } from '../../core/permissions.js';
import { StatusBadge } from '../../components/atoms/index.js';
import { confirmDialog } from '../../components/molecules/index.js';
import { citasService } from '../../services/index.js';
import { fechaHora, runAction } from './ui.js';

/**
 * Columnas, filtros y acciones de citas que comparten Citas (admin), Agenda (recepción y odontólogo),
 * Mis citas (paciente) y la ficha del paciente. Lo que cada rol puede hacer lo decide `can()` y el
 * estado de la cita; el servicio lo vuelve a validar (aquí solo se ocultan los botones que no aplican).
 */

const ACTIVAS = ['PROGRAMADA', 'PENDIENTE_CONFIRMACION'];

export const CITA_FILTER = {
  label: 'Filtrar por estado',
  key: 'estado_cita',
  options: [
    { value: 'PENDIENTE_CONFIRMACION', label: 'Por confirmar' },
    { value: 'PROGRAMADA', label: 'Programadas' },
    { value: 'COMPLETADA', label: 'Completadas' },
    { value: 'CANCELADA', label: 'Canceladas' },
  ],
};

/** @param {{ paciente?: boolean, especialista?: boolean }} show  Columnas de persona que se muestran. */
export function citaColumns({ paciente = true, especialista = true } = {}) {
  return [
    { key: 'fecha', label: 'Fecha y hora', sortable: true, value: (c) => c.fecha_hora, render: (c) => fechaHora(c.fecha_hora) },
    paciente && { key: 'paciente', label: 'Paciente', sortable: true, value: (c) => c.paciente_nombre },
    especialista && { key: 'especialista', label: 'Odontólogo', sortable: true, value: (c) => c.especialista_nombre },
    { key: 'servicio', label: 'Tratamiento', value: (c) => c.servicio_nombre ?? c.motivo },
    { key: 'estado', label: 'Estado', sortable: true, value: (c) => c.estado_cita, render: (c) => StatusBadge(c.estado_cita, { size: 'sm' }) },
  ].filter(Boolean);
}

export const fichaUrl = (idPaciente) => appUrl(`pages/doctor/historia.html?id=${encodeURIComponent(idPaciente)}`);

/** Qué cambios de estado puede hacer este usuario sobre esta cita (mismas reglas que citas.service). */
export function allowedTransitions(cita, user) {
  const futura = toDate(cita.fecha_hora) > new Date();
  const out = [];
  if (cita.estado_cita === 'PENDIENTE_CONFIRMACION' && ['ADMINISTRADOR', 'RECEPCIONISTA'].includes(user.rol)) out.push('confirmar');
  if (cita.estado_cita === 'PROGRAMADA' && (user.rol === 'ADMINISTRADOR' || (user.rol === 'ESPECIALISTA' && cita.id_especialista === user.id_especialista))) out.push('completar');
  // El paciente solo cancela citas futuras; el personal también puede cancelar las de hoy ya pasadas (inasistencia).
  if (ACTIVAS.includes(cita.estado_cita) && can(user, PERMISOS.CANCELAR_CITA) && (futura || user.rol !== 'PACIENTE')) out.push('cancelar');
  return out;
}

const TRANSITIONS = {
  confirmar: {
    icon: 'check',
    label: 'Confirmar',
    ask: (c) => ({ title: 'Confirmar cita', message: `La cita de ${c.paciente_nombre} del ${fechaHora(c.fecha_hora)} quedará programada.`, confirmLabel: 'Confirmar', variant: 'success' }),
    run: (c) => citasService.confirmar(c.id_cita),
    done: 'La cita quedó programada.',
  },
  completar: {
    icon: 'check-circle',
    label: 'Marcar como completada',
    ask: (c) => ({ title: 'Completar cita', message: `¿${c.paciente_nombre} ya fue atendido(a) el ${fechaHora(c.fecha_hora)}?`, confirmLabel: 'Marcar completada', variant: 'success' }),
    run: (c) => citasService.completar(c.id_cita),
    done: 'La cita quedó completada.',
  },
  cancelar: {
    icon: 'x',
    label: 'Cancelar cita',
    variant: 'danger',
    ask: (c) => ({ title: 'Cancelar cita', message: `La cita del ${fechaHora(c.fecha_hora)} con ${c.especialista_nombre} se cancelará y la franja quedará libre. Esta acción no se puede deshacer.`, confirmLabel: 'Cancelar cita', cancelLabel: 'Volver', variant: 'danger', icon: 'alert-triangle' }),
    run: (c) => citasService.cancelar(c.id_cita),
    done: 'La cita fue cancelada.',
  },
};

export const transitionLabel = (id) => TRANSITIONS[id].label;

/**
 * Pide confirmación, ejecuta el cambio y llama a `onDone()` para recargar.
 * `ask: false` cuando el usuario ya eligió la acción en un diálogo (salvo cancelar, que siempre se confirma).
 */
export async function applyTransition(id, cita, onDone, { ask = true } = {}) {
  const t = TRANSITIONS[id];
  if ((ask || id === 'cancelar') && !(await confirmDialog(t.ask(cita)))) return;
  // La recarga también puede fallar (p. ej. 401 si la sesión venció justo ahora): se avisa, no se deja la promesa rechazada.
  if (await runAction(() => t.run(cita), t.done)) await runAction(async () => onDone?.());
}

/** Acciones por fila para DataTable. */
export function citaActions(user, onDone, { ficha = user.rol === 'ESPECIALISTA' } = {}) {
  return (cita) => [
    ficha && { icon: 'file-text', label: 'Ver ficha del paciente', onClick: () => globalThis.location.assign(fichaUrl(cita.id_paciente)) },
    ...allowedTransitions(cita, user).map((id) => ({ icon: TRANSITIONS[id].icon, label: TRANSITIONS[id].label, variant: TRANSITIONS[id].variant, onClick: () => applyTransition(id, cita, onDone) })),
  ].filter(Boolean);
}

/** Resumen de una cita para mostrar en un diálogo (al elegirla en el calendario). */
export const citaSummary = (c) =>
  h(
    'dl',
    { class: 'data-list' },
    [
      ['Fecha y hora', fechaHora(c.fecha_hora)],
      ['Paciente', c.paciente_nombre],
      ['Odontólogo', c.especialista_nombre],
      ['Tratamiento', c.servicio_nombre ?? '—'],
      ['Motivo', c.motivo],
      ['Estado', StatusBadge(c.estado_cita, { size: 'sm' })],
    ].map(([label, value]) => h('div', {}, h('dt', { class: 'data-list__label' }, label), h('dd', { class: 'data-list__value' }, value ?? '—'))),
  );
