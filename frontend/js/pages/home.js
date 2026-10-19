/**
 * Página de inicio de cada rol (pages/<rol>/dashboard|inicio.html).
 * Base de la fase A5 para probar sesión, guard y servicios; la fase A6 la completa con gráficas y accesos.
 * El rol requerido viene del HTML: <body data-role="ADMINISTRADOR">.
 */
import { h } from '../core/dom.js';
import { formatCOP, formatDate, formatLongDate, toDate } from '../core/format.js';
import { toISODate, addDays, startOfMonth } from '../core/dates.js';
import { timeOf } from '../core/agenda.js';
import { ROLES } from '../core/navigation.js';
import { Avatar, StatusBadge } from '../components/atoms/index.js';
import { KpiCard } from '../components/molecules/index.js';
import { citasService, pacientesService, ventasService } from '../services/index.js';
import { createAppPage, loadInto } from './_shared/app-page.js';

const role = document.body.dataset.role;
const hoy = toISODate();
const ACTIVAS = ['PROGRAMADA', 'PENDIENTE_CONFIRMACION'];
const NAV_HOME = { ADMINISTRADOR: 'dashboard', ESPECIALISTA: 'dashboard', RECEPCIONISTA: 'inicio', PACIENTE: 'inicio' };

/** Cada rol pide SOLO lo que necesita, en paralelo (Promise.all). */
const LOADERS = {
  async ADMINISTRADOR() {
    const [citasHoy, porConfirmar, pacientes, cartera, proximas] = await Promise.all([
      citasService.list({ desde: hoy, hasta: hoy, estado: [...ACTIVAS, 'COMPLETADA'] }),
      citasService.list({ desde: hoy, estado: 'PENDIENTE_CONFIRMACION' }),
      pacientesService.list(),
      ventasService.resumen(),
      citasService.list({ desde: hoy, estado: ACTIVAS }),
    ]);
    return {
      kpis: [
        { label: 'Citas de hoy', value: citasHoy.length, icon: 'calendar', tone: 'primary' },
        { label: 'Por confirmar', value: porConfirmar.length, icon: 'clock', tone: 'warning' },
        { label: 'Pacientes registrados', value: pacientes.length, icon: 'users', tone: 'info' },
        { label: 'Saldo por cobrar', value: formatCOP(cartera.saldo_pendiente), icon: 'dollar', tone: 'warning', hint: `${cartera.ventas_pendientes} ventas pendientes` },
      ],
      proximas,
    };
  },

  async RECEPCIONISTA() {
    const [citasHoy, porConfirmar, cartera, proximas] = await Promise.all([
      citasService.list({ desde: hoy, hasta: hoy, estado: ACTIVAS }),
      citasService.list({ desde: hoy, estado: 'PENDIENTE_CONFIRMACION' }),
      ventasService.resumen(),
      citasService.list({ desde: hoy, estado: ACTIVAS }),
    ]);
    return {
      kpis: [
        { label: 'Citas de hoy', value: citasHoy.length, icon: 'calendar', tone: 'primary' },
        { label: 'Por confirmar', value: porConfirmar.length, icon: 'clock', tone: 'warning' },
        { label: 'Pagos pendientes', value: cartera.ventas_pendientes, icon: 'credit-card', tone: 'warning', hint: formatCOP(cartera.saldo_pendiente) },
        { label: 'Recaudado hoy', value: formatCOP(cartera.recaudado_hoy), icon: 'dollar', tone: 'success' },
      ],
      proximas,
    };
  },

  async ESPECIALISTA(user) {
    const mias = { id_especialista: user.id_especialista };
    const [citasHoy, semana, mes] = await Promise.all([
      citasService.list({ ...mias, desde: hoy, hasta: hoy, estado: ACTIVAS }),
      citasService.list({ ...mias, desde: hoy, hasta: toISODate(addDays(new Date(), 6)), estado: ACTIVAS }),
      citasService.list({ ...mias, desde: toISODate(startOfMonth(new Date())), hasta: hoy, estado: 'COMPLETADA' }),
    ]);
    return {
      kpis: [
        { label: 'Mi agenda hoy', value: citasHoy.length, icon: 'calendar', tone: 'primary' },
        { label: 'Próximos 7 días', value: semana.length, icon: 'clock', tone: 'info' },
        { label: 'Atendidos este mes', value: new Set(mes.map((c) => c.id_paciente)).size, icon: 'users', tone: 'success' },
      ],
      proximas: semana,
    };
  },

  async PACIENTE() {
    const [proximas, completadas, cuenta] = await Promise.all([
      citasService.list({ desde: hoy, estado: ACTIVAS }),
      citasService.list({ estado: 'COMPLETADA' }),
      ventasService.resumen(),
    ]);
    const siguiente = proximas.find((c) => toDate(c.fecha_hora) >= new Date());
    return {
      kpis: [
        { label: 'Próxima cita', value: siguiente ? formatDate(siguiente.fecha_hora, { day: '2-digit', month: 'short' }) : 'Sin citas', icon: 'calendar', tone: 'primary', hint: siguiente ? `${timeOf(siguiente.fecha_hora)} · ${siguiente.especialista_nombre}` : undefined },
        { label: 'Saldo pendiente', value: formatCOP(cuenta.saldo_pendiente), icon: 'dollar', tone: cuenta.saldo_pendiente ? 'warning' : 'success' },
        { label: 'Citas completadas', value: completadas.length, icon: 'check-circle', tone: 'success' },
      ],
      proximas,
    };
  },
};

function upcomingCard(todas, user) {
  const ahora = new Date();
  const citas = todas.filter((c) => toDate(c.fecha_hora) >= ahora);
  const quien = (c) => (user.rol === 'PACIENTE' ? c.especialista_nombre : c.paciente_nombre);
  return h(
    'section',
    { class: 'card', 'aria-labelledby': 'proximas-title' },
    h('div', { class: 'card__header' }, h('h2', { class: 'card__title', id: 'proximas-title' }, 'Próximas citas'), h('span', { class: 'card__subtitle' }, `${citas.length} en total`)),
    citas.length
      ? h(
          'ul',
          { class: 'item-list', role: 'list' },
          citas.slice(0, 6).map((c) =>
            h(
              'li',
              { class: 'item-list__item' },
              Avatar({ name: quien(c), size: 'sm' }),
              h('span', { class: 'item-list__main' }, h('span', { class: 'item-list__title' }, quien(c)), h('span', { class: 'item-list__meta' }, c.servicio_nombre ?? c.motivo)),
              h('span', { class: 'item-list__aside' }, `${formatDate(c.fecha_hora, { day: '2-digit', month: 'short' })} · ${timeOf(c.fecha_hora)}`),
              StatusBadge(c.estado_cita, { size: 'sm' }),
            ),
          ),
        )
      : h('p', { class: 'item-list__empty' }, 'No hay citas próximas.'),
  );
}

async function init() {
  const page = createAppPage({ role, activeId: NAV_HOME[role] });
  if (!page) return;
  const { user, layout } = page;

  layout.update({ title: `Hola, ${user.nombre.split(' ').slice(0, 2).join(' ')}`, subtitle: `Panel de ${ROLES[user.rol].label} · ${formatLongDate(new Date())}` });
  const data = await loadInto(layout, () => LOADERS[user.rol](user), 'Cargando tu resumen…');
  if (!data) return;

  layout.setContent(h('div', { class: 'page-kpis' }, data.kpis.map((kpi) => KpiCard(kpi))), upcomingCard(data.proximas, user));
}

init();
