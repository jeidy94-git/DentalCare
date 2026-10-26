import { h } from '../../core/dom.js';
import { toDate } from '../../core/format.js';
import { appUrl } from '../../core/navigation.js';
import { can, PERMISOS } from '../../core/permissions.js';
import { Link, StatusBadge } from '../../components/atoms/index.js';
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

/* ---------- Filtros por URL: detalle (drill-down) desde las gráficas de Reportes ---------- */

const CITAS_POR_ROL = { ADMINISTRADOR: 'pages/admin/citas.html', RECEPCIONISTA: 'pages/asistente/agenda.html', ESPECIALISTA: 'pages/doctor/agenda.html' };
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Lista de citas del rol con filtros: citasUrl('ADMINISTRADOR', { id_servicio: 2, desde: '2026-05-01' }). */
export function citasUrl(rol, filtro = {}) {
  const query = new URLSearchParams(Object.entries(filtro).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])).toString();
  return appUrl(`${CITAS_POR_ROL[rol] ?? CITAS_POR_ROL.ADMINISTRADOR}${query ? `?${query}` : ''}`);
}

/**
 * Lee y VALIDA los filtros de la URL: ?id_servicio=2&id_especialista=1&estado=COMPLETADA&desde=…&hasta=…&activas=1.
 * La URL la puede escribir cualquiera: un id que no es número, una fecha sin forma AAAA-MM-DD o un estado
 * que no existe se descartan en silencio (no rompen la página ni llegan a los filtros).
 * @returns {object|null} los filtros válidos, o null si no hay ninguno.
 */
export function filtroDeUrl(search = globalThis.location.search) {
  const params = new URLSearchParams(search);
  const id = (k) => (/^[1-9]\d{0,8}$/.test(params.get(k) ?? '') ? Number(params.get(k)) : undefined);
  const fecha = (k) => (FECHA_ISO.test(params.get(k) ?? '') ? params.get(k) : undefined);
  const estado = CITA_FILTER.options.some((o) => o.value === params.get('estado')) ? params.get('estado') : undefined;
  const filtro = { id_servicio: id('id_servicio'), id_especialista: id('id_especialista'), estado, desde: fecha('desde'), hasta: fecha('hasta'), activas: params.get('activas') === '1' || undefined };
  const validos = Object.fromEntries(Object.entries(filtro).filter(([, v]) => v !== undefined));
  return Object.keys(validos).length ? validos : null;
}

/** Aplica los filtros de la URL a una lista de citas, salvo el estado: ese lo maneja el chip de la tabla. */
export function aplicarFiltro(citas, f) {
  if (!f) return citas;
  return citas.filter((c) => {
    const dia = c.fecha_hora.slice(0, 10);
    return (
      (!f.id_servicio || c.id_servicio === f.id_servicio) &&
      (!f.id_especialista || c.id_especialista === f.id_especialista) &&
      (!f.desde || dia >= f.desde) &&
      (!f.hasta || dia <= f.hasta) &&
      (!f.activas || c.estado_cita !== 'CANCELADA')
    );
  });
}

/**
 * Ficha clínica de otro paciente, por rol. Cada rol la abre desde SU carpeta porque el guard autoriza por carpeta;
 * el paciente no está aquí: solo ve la suya en pages/paciente/mi-historia.html.
 */
const FICHA_POR_ROL = { ADMINISTRADOR: 'pages/admin/historia.html', ESPECIALISTA: 'pages/doctor/historia.html' };

/** ¿El usuario puede abrir la historia clínica de cualquier paciente? (administrador y odontólogo) */
export const puedeVerFichas = (user) => Boolean(FICHA_POR_ROL[user?.rol]) && can(user, PERMISOS.VER_HISTORIA_CLINICA);

export const fichaUrl = (idPaciente, rol = 'ESPECIALISTA') => appUrl(`${FICHA_POR_ROL[rol] ?? FICHA_POR_ROL.ESPECIALISTA}?id=${encodeURIComponent(idPaciente)}`);

/** Nombre del paciente como enlace a su historia clínica (si el usuario puede abrirla). */
export function pacienteLink(user, idPaciente, nombre) {
  if (!puedeVerFichas(user)) return nombre;
  return Link({ href: fichaUrl(idPaciente, user.rol), label: nombre, title: `Abrir la historia clínica de ${nombre}` });
}

/**
 * @param {{ paciente?: boolean, especialista?: boolean, user?: object }} show  Columnas de persona que se muestran;
 *        con `user`, el nombre del paciente enlaza a su historia clínica (pacienteLink).
 */
export function citaColumns({ paciente = true, especialista = true, user } = {}) {
  return [
    { key: 'fecha', label: 'Fecha y hora', sortable: true, value: (c) => c.fecha_hora, render: (c) => fechaHora(c.fecha_hora) },
    paciente && { key: 'paciente', label: 'Paciente', sortable: true, value: (c) => c.paciente_nombre, render: user && ((c) => pacienteLink(user, c.id_paciente, c.paciente_nombre)) },
    especialista && { key: 'especialista', label: 'Odontólogo', sortable: true, value: (c) => c.especialista_nombre },
    { key: 'servicio', label: 'Tratamiento', value: (c) => c.servicio_nombre ?? c.motivo },
    { key: 'estado', label: 'Estado', sortable: true, value: (c) => c.estado_cita, render: (c) => StatusBadge(c.estado_cita, { size: 'sm' }) },
  ].filter(Boolean);
}


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
export function citaActions(user, onDone, { ficha = puedeVerFichas(user) } = {}) {
  return (cita) => [
    ficha && { icon: 'file-text', label: 'Ver historia clínica', onClick: () => globalThis.location.assign(fichaUrl(cita.id_paciente, user.rol)) },
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
