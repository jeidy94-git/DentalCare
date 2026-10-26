/**
 * Reportes (RF-DAS-01/02/03, RF-PAG-04) — pages/admin/reportes.html.
 * Indicadores del periodo + gráficas SVG propias (sin librerías): citas por mes, tratamientos más
 * solicitados, citas por odontólogo y por estado. Cada gráfica trae su vista de tabla accesible.
 *
 * Detalle (drill-down): cada barra enlaza a la lista de citas con los MISMOS criterios con que se contó
 * (periodo, tratamiento/odontólogo/estado y, si aplica, sin canceladas): la lista muestra ese mismo número.
 */
import { h } from '../core/dom.js';
import { formatCOP } from '../core/format.js';
import { toISODate, addMonths, startOfMonth } from '../core/dates.js';
import { ESTADOS } from '../components/atoms/index.js';
import { KpiCard } from '../components/molecules/index.js';
import { BarChart, DashboardCharts } from '../components/organisms/index.js';
import { citasService, serviciosService, especialistasService, ventasService } from '../services/index.js';
import { createAppPage, loadInto } from './_shared/app-page.js';
import { crumbs } from './_shared/ui.js';
import { citasUrl } from './_shared/citas.js';

const MESES = 6;
const porcentaje = (parte, total) => (total ? `${Math.round((parte / total) * 100)} %` : '0 %');

async function init() {
  const page = createAppPage({ activeId: 'reportes', title: 'Reportes', subtitle: `Actividad del consultorio en los últimos ${MESES} meses.` });
  if (!page) return;
  const { user, layout } = page;
  layout.update({ breadcrumbs: crumbs(user, { label: 'Reportes' }) });

  const desde = toISODate(addMonths(startOfMonth(new Date()), -(MESES - 1)));
  const hoy = toISODate();
  const data = await loadInto(
    layout,
    async () => {
      const [citas, servicios, especialistas, cartera, ventas] = await Promise.all([
        citasService.list({ desde }),
        serviciosService.list(),
        especialistasService.list(),
        ventasService.resumen(),
        ventasService.list(),
      ]);
      return { citas, servicios, especialistas, cartera, ventas };
    },
    'Calculando indicadores…',
  );
  if (!data) return;

  // Solo hasta hoy: las citas futuras aún no pueden estar completadas ni ser inasistencias.
  const pasadas = data.citas.filter((c) => c.fecha_hora.slice(0, 10) <= hoy);
  const completadas = pasadas.filter((c) => c.estado_cita === 'COMPLETADA').length;
  const canceladas = pasadas.filter((c) => c.estado_cita === 'CANCELADA').length;
  const facturado = data.ventas.filter((v) => v.fecha_venta.slice(0, 10) >= desde).reduce((sum, v) => sum + v.monto_total, 0);

  const porEstado = Object.entries(
    data.citas.reduce((acc, c) => ((acc[c.estado_cita] = (acc[c.estado_cita] ?? 0) + 1), acc), {}),
  ).map(([estado, value]) => ({ label: ESTADOS[estado]?.label ?? estado, value, href: citasUrl(user.rol, { estado, desde }) }));

  const porOdontologo = data.especialistas
    .map((e) => ({
      label: e.nombre,
      value: data.citas.filter((c) => c.id_especialista === e.id_especialista && c.estado_cita !== 'CANCELADA').length,
      href: citasUrl(user.rol, { id_especialista: e.id_especialista, desde, activas: 1 }),
    }))
    .sort((a, b) => b.value - a.value);

  layout.setContent(
    h(
      'div',
      { class: 'page-kpis' },
      KpiCard({ label: 'Citas atendidas', value: completadas, icon: 'check-circle', tone: 'success', hint: `${porcentaje(completadas, pasadas.length)} de las citas hasta hoy` }),
      KpiCard({ label: 'Citas canceladas', value: canceladas, icon: 'x', tone: 'danger', hint: `${porcentaje(canceladas, pasadas.length)} de las citas hasta hoy` }),
      KpiCard({ label: 'Facturado en el periodo', value: formatCOP(facturado), icon: 'trending-up', tone: 'primary' }),
      KpiCard({ label: 'Saldo por cobrar', value: formatCOP(data.cartera.saldo_pendiente), icon: 'dollar', tone: 'warning', hint: `${data.cartera.ventas_pendientes} ventas pendientes` }),
    ),
    DashboardCharts({ citas: data.citas, servicios: data.servicios, months: MESES, detalle: (filtro) => citasUrl(user.rol, filtro) }),
    h(
      'div',
      { class: 'dashboard-charts' },
      BarChart({ title: 'Citas por odontólogo', subtitle: 'Sin canceladas, en el mismo periodo', data: porOdontologo, orientation: 'horizontal', unit: 'citas' }),
      BarChart({ title: 'Citas por estado', subtitle: 'Incluye las agendadas a futuro', data: porEstado, orientation: 'horizontal', unit: 'citas' }),
    ),
  );
}

init();
