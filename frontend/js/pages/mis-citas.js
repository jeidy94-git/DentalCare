/**
 * Mis citas (RF-CIT-05, HU-06) — pages/paciente/mis-citas.html.
 * El servicio solo devuelve las citas del paciente de la sesión; puede cancelar las futuras.
 */
import { h } from '../core/dom.js';
import { toDate } from '../core/format.js';
import { appUrl } from '../core/navigation.js';
import { Button } from '../components/atoms/index.js';
import { DataTable } from '../components/organisms/index.js';
import { citasService } from '../services/index.js';
import { createAppPage, loadInto } from './_shared/app-page.js';
import { crumbs, notice } from './_shared/ui.js';
import { CITA_FILTER, citaColumns, citaActions } from './_shared/citas.js';

async function init() {
  const page = createAppPage({ activeId: 'citas', title: 'Mis citas', subtitle: 'Tus citas programadas, solicitudes por confirmar e historial.' });
  if (!page) return;
  const { user, layout } = page;
  layout.update({
    breadcrumbs: crumbs(user, { label: 'Mis citas' }),
    actions: [Button({ label: 'Solicitar cita', icon: 'plus', onClick: () => location.assign(appUrl('pages/paciente/agendar.html')) })],
  });

  const citas = await loadInto(layout, () => citasService.list(), 'Cargando tus citas…');
  if (!citas) return;

  const pendientes = (rows) => rows.filter((c) => c.estado_cita === 'PENDIENTE_CONFIRMACION' && toDate(c.fecha_hora) >= new Date()).length;
  const aviso = h('div', { 'aria-live': 'polite' });
  const paintAviso = (rows) => {
    const n = pendientes(rows);
    aviso.replaceChildren(...(n ? [notice(n === 1 ? 'Tienes 1 solicitud esperando confirmación de recepción.' : `Tienes ${n} solicitudes esperando confirmación de recepción.`, 'info')] : []));
  };
  paintAviso(citas);

  const reload = async () => {
    const rows = await citasService.list();
    table.setRows(rows);
    paintAviso(rows);
  };

  const table = DataTable({
    caption: 'Mis citas',
    rows: citas,
    rowKey: 'id_cita',
    rowLabel: (c) => `cita con ${c.especialista_nombre}`,
    initialSort: { key: 'fecha', dir: 'desc' },
    filter: CITA_FILTER,
    columns: citaColumns({ paciente: false }),
    actions: citaActions(user, reload),
    emptyMessage: 'No tienes citas con ese estado.',
  });

  layout.setContent(aviso, table);
}

init();
