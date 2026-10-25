/**
 * Ficha clínica del paciente (RF-PAC-02…05, HU-04, RN-01):
 *   pages/admin/historia.html?id=11      → el administrador; consulta y edita la de cualquier paciente
 *   pages/doctor/historia.html?id=11     → el odontólogo; edita solo si está ASIGNADO (RN-01)
 *   pages/paciente/mi-historia.html      → el paciente ve la SUYA en solo lectura (el id sale de la sesión;
 *                                          un ?id de otro paciente lleva a 403). Vista parcial: tratamientos
 *                                          realizados, citas y odontograma, sin notas internas del odontólogo.
 *
 * DetailLayout dentro del DashboardLayout: encabezado, resumen, alertas clínicas (alergias siempre visibles),
 * pestañas (datos, odontograma, consultas, citas) y la historia clínica en la columna lateral.
 */
import { h } from '../core/dom.js';
import { validators } from '../core/validators.js';
import { formatDate, formatLongDate, toDate } from '../core/format.js';
import { timeOf } from '../core/agenda.js';
import { appUrl } from '../core/navigation.js';
import { FORBIDDEN_PATH } from '../core/guard.js';
import { Button, StatusBadge } from '../components/atoms/index.js';
import { FormField, toast } from '../components/molecules/index.js';
import { DataTable, Odontogram, openModalForm } from '../components/organisms/index.js';
import { DetailLayout } from '../components/templates/index.js';
import { pacientesService, historiasService, odontogramaService, citasService } from '../services/index.js';
import { createAppPage, loadInto, errorMessage } from './_shared/app-page.js';
import { card, crumbs, dataList, fechaHora, fullName, notice, queryParam, runAction, withFieldErrors } from './_shared/ui.js';
import { CITA_FILTER, citaColumns, citaActions } from './_shared/citas.js';

const POR_TRATAR = ['PENDIENTE', 'EN_PROCESO', 'REEMPLAZO_REQUERIDO'];
const GENERO = { FEMENINO: 'Femenino', MASCULINO: 'Masculino', OTRO: 'Otro' };
const tieneAlergias = (hc) => Boolean(hc?.alergias) && !/^ningun/i.test(hc.alergias.trim());

function edad(fechaNacimiento, now = new Date()) {
  const nacimiento = toDate(fechaNacimiento);
  let years = now.getFullYear() - nacimiento.getFullYear();
  if (now < new Date(now.getFullYear(), nacimiento.getMonth(), nacimiento.getDate())) years -= 1;
  return years;
}

async function init() {
  const role = document.body.dataset.role;
  const esPaciente = role === 'PACIENTE';
  const page = createAppPage({ role, activeId: esPaciente ? 'historia' : 'pacientes' });
  if (!page) return;
  const { user, layout } = page;

  // El paciente solo consulta SU historia: pedir otra por la URL es un acceso prohibido, no se ignora en silencio.
  const idUrl = queryParam('id');
  if (esPaciente && idUrl !== null && Number(idUrl) !== user.id_paciente) {
    location.replace(appUrl(`${FORBIDDEN_PATH}?from=${encodeURIComponent(`pages/paciente/mi-historia.html?id=${idUrl}`)}`));
    return;
  }

  const pacientesHref = appUrl(user.rol === 'ADMINISTRADOR' ? 'pages/admin/pacientes.html' : 'pages/doctor/pacientes.html');
  const idPaciente = esPaciente ? user.id_paciente : Number(idUrl);
  if (!idPaciente) {
    layout.update({ title: 'Ficha del paciente', breadcrumbs: crumbs(user, { label: 'Pacientes', href: pacientesHref }, { label: 'Ficha' }) });
    layout.setContent(notice('No se indicó el paciente. Abre la ficha desde la lista de pacientes o desde tu agenda.', 'warning', { role: 'alert' }));
    return;
  }

  const load = () =>
    Promise.all([
      pacientesService.get(idPaciente),
      historiasService.getByPaciente(idPaciente),
      odontogramaService.listByPaciente(idPaciente),
      citasService.list({ id_paciente: idPaciente }),
    ]).then(([paciente, historia, hallazgos, citas]) => ({ paciente, historia, hallazgos, citas }));

  const data = await loadInto(layout, load, 'Cargando la ficha clínica…');
  if (!data) {
    layout.update({ title: 'Ficha del paciente', breadcrumbs: crumbs(user, { label: 'Ficha del paciente' }) });
    return;
  }

  // RN-01: edita el administrador o el odontólogo ASIGNADO (con una cita no cancelada con el paciente).
  // Es la misma regla del servicio: aquí solo decide si se muestran los controles de edición.
  const canEdit = user.rol === 'ADMINISTRADOR' || (user.rol === 'ESPECIALISTA' && data.citas.some((c) => c.id_especialista === user.id_especialista && c.estado_cita !== 'CANCELADA'));
  const readonlyReason = esPaciente ? 'Vista de consulta: los cambios los registra tu odontólogo.' : 'Solo el odontólogo asignado o el administrador pueden editar la historia clínica (RN-01).';

  /** Recarga los datos y vuelve a pintar la ficha conservando la pestaña abierta. */
  async function refresh(tab) {
    try {
      Object.assign(data, await load());
      render(tab);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  // Ids de los hallazgos guardados, por pieza + cara: el odontograma no conoce los ids de la BD.
  const idHallazgo = new Map();
  const keyOf = (r) => `${r.id_diente}|${r.cara_diente}`;

  async function onOdontogramChange({ type, record }) {
    try {
      if (type === 'save') {
        const saved = await odontogramaService.save(idPaciente, record);
        idHallazgo.set(keyOf(saved), saved.id_odontograma);
      } else if (type === 'remove' && record) {
        const id = idHallazgo.get(keyOf(record));
        if (id) await odontogramaService.remove(id);
        idHallazgo.delete(keyOf(record));
      } else if (type === 'ausente') {
        toast.info('Las piezas ausentes aún no se guardan: la tabla `odontograma` no tiene ese dato (cambio previsto para la fase B).', 'Solo en esta vista');
      }
    } catch (error) {
      // El odontograma ya se actualizó en pantalla: si el servicio lo rechaza, se recarga lo que hay guardado.
      toast.error(errorMessage(error), 'No se guardó el cambio');
      refresh('odontograma');
    }
  }

  async function registrarConsulta() {
    const pendientes = data.citas.filter((c) => c.estado_cita === 'PROGRAMADA' && c.id_especialista === user.id_especialista && !data.historia.consultas.some((q) => q.id_cita === c.id_cita));
    if (!pendientes.length) {
      toast.info('No tienes citas programadas con este paciente sin consulta registrada.', 'Registrar consulta');
      return;
    }
    const saved = await openModalForm({
      title: 'Registrar consulta',
      description: 'La cita quedará como completada.',
      size: 'lg',
      submitLabel: 'Registrar consulta',
      fields: () =>
        h(
          'div',
          { class: 'form-grid' },
          FormField({ label: 'Cita', name: 'id_cita', as: 'select', required: true, value: pendientes[0].id_cita, options: pendientes.map((c) => ({ value: c.id_cita, label: `${fechaHora(c.fecha_hora)} · ${c.servicio_nombre ?? c.motivo}` })) }),
          FormField({ label: 'Motivo de consulta', name: 'motivo_consulta', required: true, value: pendientes[0].motivo, validate: validators.maxLength(255) }),
          FormField({ label: 'Diagnóstico', name: 'diagnostico', as: 'textarea', rows: 2, required: true }),
          FormField({ label: 'Procedimiento realizado', name: 'procedimiento_realizado', as: 'textarea', rows: 2, required: true }),
          FormField({ label: 'Prescripción médica', name: 'prescripcion_medica', as: 'textarea', rows: 2, optional: true }),
        ),
      onSubmit: withFieldErrors((d) => historiasService.addConsulta(d)),
    });
    if (saved) {
      toast.success('La consulta quedó en la historia clínica y la cita se completó.', 'Consulta registrada');
      refresh('consultas');
    }
  }

  async function editarHistoria() {
    const hc = data.historia;
    const saved = await openModalForm({
      title: 'Editar historia clínica',
      size: 'lg',
      submitLabel: 'Guardar cambios',
      fields: () => [
        FormField({ label: 'Antecedentes médicos', name: 'antecedentes_medicos', as: 'textarea', rows: 3, optional: true, value: hc.antecedentes_medicos }),
        FormField({ label: 'Alergias', name: 'alergias', as: 'textarea', rows: 2, optional: true, value: hc.alergias, hint: 'Se muestran como alerta en la parte superior de la ficha.' }),
        FormField({ label: 'Observaciones', name: 'observaciones', as: 'textarea', rows: 3, optional: true, value: hc.observaciones }),
      ],
      onSubmit: withFieldErrors((d) => historiasService.update(idPaciente, d)),
    });
    if (saved) {
      toast.success('Los cambios quedaron registrados.', 'Historia clínica actualizada');
      refresh();
    }
  }

  function consultasView() {
    const { consultas } = data.historia;
    return h(
      'div',
      { class: 'stack' },
      user.rol === 'ESPECIALISTA' && canEdit && h('div', { class: 'page-header__actions' }, Button({ label: 'Registrar consulta', icon: 'plus', size: 'sm', onClick: registrarConsulta })),
      consultas.length
        ? h(
            'ol',
            { class: 'timeline', role: 'list' },
            consultas.map((q) =>
              h(
                'li',
                { class: 'timeline__item' },
                h('p', { class: 'timeline__date' }, `${formatLongDate(q.fecha_cita)} · ${timeOf(q.fecha_cita)} · ${q.especialista_nombre}`),
                h('h3', { class: 'timeline__title' }, q.motivo_consulta),
                // El paciente no recibe el diagnóstico (nota interna): solo el resumen del tratamiento.
                dataList([
                  !esPaciente && ['Diagnóstico', q.diagnostico],
                  ['Procedimiento', q.procedimiento_realizado],
                  ['Prescripción', q.prescripcion_medica],
                ].filter(Boolean)),
              ),
            ),
          )
        : h('p', { class: 'item-list__empty' }, esPaciente ? 'Aún no tienes tratamientos registrados.' : 'Aún no hay consultas registradas.'),
    );
  }

  function render(activeTab) {
    const { paciente: p, historia: hc, hallazgos, citas } = data;
    hallazgos.forEach((r) => idHallazgo.set(keyOf(r), r.id_odontograma));
    const ahora = new Date();
    const proximas = citas.filter((c) => toDate(c.fecha_hora) >= ahora && ['PROGRAMADA', 'PENDIENTE_CONFIRMACION'].includes(c.estado_cita)).sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
    const completadas = citas.filter((c) => c.estado_cita === 'COMPLETADA').sort((a, b) => b.fecha_hora.localeCompare(a.fecha_hora));
    const porTratar = hallazgos.filter((r) => POR_TRATAR.includes(r.estado_tratamiento)).length;
    const nombre = fullName(p);

    document.title = `${esPaciente ? 'Mi historia clínica' : nombre} · DentalCare`;
    layout.update({
      breadcrumbs: esPaciente ? crumbs(user, { label: 'Mi historia clínica' }) : crumbs(user, { label: 'Pacientes', href: pacientesHref }, { label: nombre }),
    });

    const alerts = [];
    if (tieneAlergias(hc)) alerts.push({ tone: 'danger', title: 'Alergias:', text: hc.alergias });
    if (!esPaciente && !canEdit) alerts.push({ tone: 'info', title: 'Solo lectura.', text: 'No tienes citas con este paciente, así que no puedes editar su historia (RN-01).' });

    layout.setContent(
      DetailLayout({
        title: nombre,
        avatar: nombre,
        subtitle: `Paciente desde ${formatDate(p.fecha_registro)} · Historia clínica #${hc.id_historia}`,
        badges: [StatusBadge('ACTIVO', { size: 'sm' })],
        actions: esPaciente ? [Button({ label: 'Solicitar cita', icon: 'plus', size: 'sm', onClick: () => location.assign(appUrl('pages/paciente/agendar.html')) })] : [],
        meta: [
          { icon: 'id-card', label: 'Documento', value: `${p.tipo_documento} ${p.numero_documento}` },
          { icon: 'user', label: 'Edad', value: `${edad(p.fecha_nacimiento)} años` },
          { icon: 'phone', label: 'Teléfono', value: p.telefono },
          p.email && { icon: 'mail', label: 'Correo', value: p.email },
        ].filter(Boolean),
        summary: [
          { label: 'Próxima cita', value: proximas[0] ? formatDate(proximas[0].fecha_hora) : 'Sin citas', hint: proximas[0] ? `${timeOf(proximas[0].fecha_hora)} · ${proximas[0].especialista_nombre}` : undefined },
          { label: 'Última visita', value: completadas[0] ? formatDate(completadas[0].fecha_hora) : '—', hint: completadas[0]?.especialista_nombre },
          { label: 'Citas completadas', value: String(completadas.length) },
          { label: 'Hallazgos por tratar', value: String(porTratar), hint: `${hallazgos.length} registrados en el odontograma` },
        ],
        alerts,
        activeTab,
        syncHash: true,
        tabsLabel: 'Secciones de la ficha del paciente',
        tabs: [
          {
            id: 'datos',
            label: 'Datos personales',
            icon: 'user',
            content: () =>
              dataList([
                ['Nombres', p.nombres],
                ['Apellidos', p.apellidos],
                ['Documento', `${p.tipo_documento} ${p.numero_documento}`],
                ['Fecha de nacimiento', formatLongDate(p.fecha_nacimiento)],
                ['Género', GENERO[p.genero] ?? p.genero],
                ['Teléfono', p.telefono],
                ['Correo electrónico', p.email],
                ['Municipio', p.municipio ? `${p.municipio} (${p.departamento})` : null],
                ['Dirección', p.direccion],
                ['EPS / aseguradora', p.eps_aseguradora],
              ]),
          },
          {
            id: 'odontograma',
            label: 'Odontograma',
            icon: 'tooth',
            count: hallazgos.length,
            content: () => Odontogram({ records: hallazgos, readonly: !canEdit, readonlyReason, onChange: onOdontogramChange }),
          },
          { id: 'consultas', label: esPaciente ? 'Tratamientos realizados' : 'Consultas', icon: 'clipboard', count: hc.consultas.length, content: consultasView },
          {
            id: 'citas',
            label: 'Citas',
            icon: 'calendar',
            count: citas.length,
            content: () =>
              DataTable({
                caption: `Citas de ${nombre}`,
                rows: citas,
                rowKey: 'id_cita',
                rowLabel: (c) => `cita del ${fechaHora(c.fecha_hora)}`,
                pageSize: 6,
                initialSort: { key: 'fecha', dir: 'desc' },
                filter: CITA_FILTER,
                columns: citaColumns({ paciente: false }),
                // Vista de consulta para el paciente: sus citas se gestionan en "Mis citas".
                actions: esPaciente ? undefined : citaActions(user, () => refresh('citas'), { ficha: false }),
              }),
          },
        ],
        aside: card(
          { title: 'Historia clínica', actions: canEdit ? [Button({ label: 'Editar', icon: 'edit', size: 'sm', variant: 'outline', onClick: editarHistoria })] : undefined },
          dataList([
            !esPaciente && ['Antecedentes médicos', hc.antecedentes_medicos],
            ['Alergias', hc.alergias],
            !esPaciente && ['Observaciones', hc.observaciones],
            ['Apertura', hc.fecha_apertura ? formatDate(hc.fecha_apertura) : null],
          ].filter(Boolean)),
        ),
      }),
    );
  }

  render();
}

init();
