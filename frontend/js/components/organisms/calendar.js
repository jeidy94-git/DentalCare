import { h, cx, mount, uniqueId } from '../../core/dom.js';
import { formatDate, formatLongDate, formatNumber, capitalize, toDate } from '../../core/format.js';
import { toISODate, addDays, addMonths, startOfWeek, startOfMonth, isSameMonth, WEEKDAY_SHORT } from '../../core/dates.js';
import { getDaySlots, horariosDelDia, timeOf } from '../../core/agenda.js';
import { Button, Select, Avatar, StatusBadge, Icon } from '../atoms/index.js';
import { Tabs, TimeSlot } from '../molecules/index.js';

const VIEWS = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'lista', label: 'Lista' },
];

const ACTIVE = (c) => c.estado_cita !== 'CANCELADA';

/**
 * Organismo: Calendar — agenda por Día / Semana / Mes / Lista con selector de odontólogo (RF-CIT-07).
 *
 * @param {object} props
 * @param {object[]} props.especialistas   { id_especialista, nombre, especialidad }
 * @param {object[]} props.horarios        Tabla `horario`.
 * @param {object[]} props.citas           Tabla `cita`.
 * @param {object[]} props.pacientes       Para mostrar nombres.
 * @param {'dia'|'semana'|'mes'|'lista'} [props.view='semana']
 * @param {Date|string} [props.date]       Fecha de referencia (hoy por defecto).
 * @param {number|'ALL'} [props.especialistaId='ALL']
 * @param {(slot: {especialistaId: number, date: string, start: string, end: string}) => void} [props.onSlotSelect]
 * @param {(cita: object) => void} [props.onCitaSelect]
 * @returns {HTMLElement}  Expone setCitas(citas, pacientes?) y goTo(date, view?).
 */
export function Calendar({
  especialistas = [],
  horarios = [],
  citas = [],
  pacientes = [],
  view = 'semana',
  date = new Date(),
  especialistaId = 'ALL',
  onSlotSelect,
  onCitaSelect,
  now = new Date(),
  className,
} = {}) {
  const state = { view, date: new Date(toDate(date)), esp: especialistaId };
  let pacienteById = new Map(pacientes.map((p) => [p.id_paciente, p]));
  const espById = new Map(especialistas.map((e) => [e.id_especialista, e]));
  let byDate = new Map();

  function indexCitas(list) {
    byDate = new Map();
    for (const c of list) {
      const key = String(c.fecha_hora).slice(0, 10);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(c);
    }
    for (const day of byDate.values()) day.sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
    citas = list;
  }
  indexCitas(citas);

  const selectedEsps = () => (state.esp === 'ALL' ? especialistas : especialistas.filter((e) => e.id_especialista === Number(state.esp)));
  const citasOf = (day, { includeCancelled = false } = {}) =>
    (byDate.get(toISODate(day)) ?? []).filter(
      (c) => (includeCancelled || ACTIVE(c)) && (state.esp === 'ALL' || c.id_especialista === Number(state.esp)),
    );
  const pacienteName = (id) => {
    const p = pacienteById.get(id);
    return p ? `${p.nombres} ${p.apellidos}` : `Paciente #${id}`;
  };

  /* ---------- Encabezado ---------- */
  const title = h('h3', { class: 'calendar__title', 'aria-live': 'polite' });

  const step = (dir) => {
    if (state.view === 'dia') state.date = addDays(state.date, dir);
    else if (state.view === 'semana') state.date = addDays(state.date, dir * 7);
    else state.date = addMonths(state.date, dir);
    render();
  };

  const espSelectId = uniqueId('cal-esp');
  const espSelect = Select({
    id: espSelectId,
    size: 'sm',
    value: state.esp,
    options: [{ value: 'ALL', label: 'Todos los odontólogos' }, ...especialistas.map((e) => ({ value: e.id_especialista, label: e.nombre }))],
    onChange: (event) => {
      state.esp = event.target.value === 'ALL' ? 'ALL' : Number(event.target.value);
      render();
    },
  });

  const viewTabs = Tabs({
    ariaLabel: 'Vista de la agenda',
    variant: 'segmented',
    activeId: state.view,
    tabs: VIEWS,
    onChange: (id) => {
      state.view = id;
      render();
    },
  });

  const header = h(
    'div',
    { class: 'calendar__header' },
    h(
      'div',
      { class: 'calendar__nav' },
      Button({ icon: 'chevron-left', variant: 'outline', size: 'sm', ariaLabel: 'Periodo anterior', onClick: () => step(-1) }),
      Button({
        label: 'Hoy',
        variant: 'outline',
        size: 'sm',
        onClick: () => {
          state.date = new Date(now);
          render();
        },
      }),
      Button({ icon: 'chevron-right', variant: 'outline', size: 'sm', ariaLabel: 'Periodo siguiente', onClick: () => step(1) }),
      title,
    ),
    h(
      'div',
      { class: 'calendar__controls' },
      h('label', { class: 'u-visually-hidden', for: espSelectId }, 'Odontólogo'),
      h('div', { class: 'calendar__esp' }, espSelect),
      viewTabs,
    ),
  );

  const body = h('div', { class: 'calendar__body' });

  /* ---------- Piezas comunes ---------- */
  function citaCard(c, { compact = false } = {}) {
    const esp = espById.get(c.id_especialista);
    return h(
      'button',
      {
        type: 'button',
        class: cx('cita-card', `cita-card--${String(c.estado_cita).toLowerCase()}`, compact && 'cita-card--compact'),
        'aria-label': `${timeOf(c.fecha_hora)}, ${pacienteName(c.id_paciente)}, ${c.motivo}, ${esp?.nombre ?? ''}`,
        onClick: () => onCitaSelect?.(c),
      },
      h('span', { class: 'cita-card__time' }, timeOf(c.fecha_hora)),
      h('span', { class: 'cita-card__patient' }, pacienteName(c.id_paciente)),
      !compact && h('span', { class: 'cita-card__motive' }, c.motivo),
      state.esp === 'ALL' && !compact && esp && h('span', { class: 'cita-card__doctor' }, esp.nombre),
    );
  }

  const goToDay = (day) => {
    state.date = new Date(day);
    state.view = 'dia';
    viewTabs.selectTab('dia');
    render();
  };

  /* ---------- Vista Día ---------- */
  function renderDay() {
    const iso = toISODate(state.date);
    return h(
      'div',
      { class: cx('calendar__day', state.esp === 'ALL' && 'calendar__day--multi') },
      selectedEsps().map((esp) => {
        const slots = getDaySlots({ especialistaId: esp.id_especialista, date: state.date, horarios, citas, now });
        return h(
          'section',
          { class: 'calendar__column', 'aria-label': `Agenda de ${esp.nombre}` },
          h(
            'header',
            { class: 'calendar__column-head' },
            Avatar({ name: esp.nombre, size: 'sm' }),
            h('div', {}, h('p', { class: 'calendar__column-name' }, esp.nombre), h('p', { class: 'calendar__column-meta' }, esp.especialidad)),
          ),
          slots.length
            ? h(
                'div',
                { class: 'calendar__slots' },
                slots.map((s) =>
                  s.status === 'occupied'
                    ? citaCard(s.cita)
                    : TimeSlot({
                        start: s.start,
                        end: s.end,
                        status: s.status === 'past' ? 'blocked' : s.status,
                        detail: s.status === 'past' ? 'Hora pasada' : undefined,
                        onSelect: () => onSlotSelect?.({ especialistaId: esp.id_especialista, date: iso, start: s.start, end: s.end }),
                      }),
                ),
              )
            : h('p', { class: 'calendar__empty' }, Icon({ name: 'clock', size: 16 }), 'No atiende este día.'),
        );
      }),
    );
  }

  /* ---------- Vista Semana ---------- */
  function renderWeek() {
    const start = startOfWeek(state.date);
    const today = toISODate(now);
    return h(
      'div',
      { class: 'calendar__week' },
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(start, i);
        const iso = toISODate(day);
        const list = citasOf(day);
        const works = selectedEsps().some((e) => horariosDelDia(horarios, e.id_especialista, day).length);
        const free = works
          ? selectedEsps().reduce((sum, e) => sum + getDaySlots({ especialistaId: e.id_especialista, date: day, horarios, citas, now }).filter((s) => s.status === 'available').length, 0)
          : 0;
        return h(
          'section',
          { class: cx('calendar__weekday', iso === today && 'is-today', !works && 'is-off'), 'aria-label': formatLongDate(day) },
          h(
            'button',
            { type: 'button', class: 'calendar__weekday-head', onClick: () => goToDay(day), 'aria-label': `Ver el día ${formatLongDate(day)}` },
            h('span', { class: 'calendar__weekday-name' }, WEEKDAY_SHORT[i]),
            h('span', { class: 'calendar__weekday-num' }, day.getDate()),
          ),
          h(
            'div',
            { class: 'calendar__weekday-body' },
            works
              ? [
                  list.length ? list.map((c) => citaCard(c, { compact: true })) : h('p', { class: 'calendar__empty' }, 'Sin citas'),
                  h('p', { class: 'calendar__free' }, `${free} ${free === 1 ? 'franja libre' : 'franjas libres'}`),
                ]
              : h('p', { class: 'calendar__empty' }, 'Sin atención'),
          ),
        );
      }),
    );
  }

  /* ---------- Vista Mes ---------- */
  function renderMonth() {
    const first = startOfMonth(state.date);
    const gridStart = startOfWeek(first);
    const offset = (first.getDay() + 6) % 7; // días del mes anterior que completan la primera semana
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil((offset + daysInMonth) / 7);
    const today = toISODate(now);

    // Sin role="grid": ese rol exige navegación con flechas entre celdas. Cada celda es un
    // botón con nombre accesible completo ("Lunes, 20 de octubre de 2026: 5 citas").
    return h(
      'div',
      { class: 'calendar__month' },
      h('div', { class: 'calendar__month-row calendar__month-head', 'aria-hidden': 'true' }, WEEKDAY_SHORT.map((d) => h('span', {}, d))),
      Array.from({ length: weeks }, (_, w) =>
        h(
          'div',
          { class: 'calendar__month-row' },
          Array.from({ length: 7 }, (_, d) => {
            const day = addDays(gridStart, w * 7 + d);
            const count = citasOf(day).length;
            const inMonth = isSameMonth(day, state.date);
            return h(
              'div',
              {},
              h(
                'button',
                {
                  type: 'button',
                  class: cx('calendar__month-cell', !inMonth && 'is-outside', toISODate(day) === today && 'is-today'),
                  'aria-label': `${formatLongDate(day)}: ${count} ${count === 1 ? 'cita' : 'citas'}`,
                  onClick: () => goToDay(day),
                },
                h('span', { class: 'calendar__month-num' }, day.getDate()),
                count > 0 && h('span', { class: 'calendar__month-count' }, `${count} ${count === 1 ? 'cita' : 'citas'}`),
              ),
            );
          }),
        ),
      ),
    );
  }

  /* ---------- Vista Lista ---------- */
  function renderList() {
    const first = startOfMonth(state.date);
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const groups = [];
    for (let i = 0; i < days; i += 1) {
      const day = addDays(first, i);
      const list = citasOf(day, { includeCancelled: true });
      if (list.length) groups.push([day, list]);
    }
    if (!groups.length) return h('p', { class: 'calendar__empty calendar__empty--block' }, 'No hay citas en este mes.');

    return h(
      'div',
      { class: 'calendar__list' },
      groups.map(([day, list]) =>
        h(
          'section',
          { class: 'calendar__list-day' },
          h('h4', { class: 'calendar__list-date' }, formatLongDate(day), h('span', { class: 'calendar__list-count' }, formatNumber(list.length))),
          h(
            'ul',
            { class: 'calendar__list-items', role: 'list' },
            list.map((c) =>
              h(
                'li',
                {},
                h(
                  'button',
                  { type: 'button', class: 'calendar__list-item', onClick: () => onCitaSelect?.(c) },
                  h('span', { class: 'calendar__list-time' }, timeOf(c.fecha_hora)),
                  h('span', { class: 'calendar__list-main' }, h('strong', {}, pacienteName(c.id_paciente)), h('span', {}, c.motivo)),
                  h('span', { class: 'calendar__list-doctor' }, espById.get(c.id_especialista)?.nombre ?? ''),
                  StatusBadge(c.estado_cita, { size: 'sm' }),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  /* ---------- Render ---------- */
  function periodTitle() {
    if (state.view === 'dia') return formatLongDate(state.date);
    if (state.view === 'semana') {
      const start = startOfWeek(state.date);
      const end = addDays(start, 6);
      return `${formatDate(start, { day: 'numeric', month: 'short' })} – ${formatDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return capitalize(formatDate(state.date, { month: 'long', year: 'numeric' }));
  }

  function render() {
    title.textContent = periodTitle();
    const views = { dia: renderDay, semana: renderWeek, mes: renderMonth, lista: renderList };
    mount(body, views[state.view]());
    root.dataset.view = state.view;
  }

  const root = h('section', { class: cx('calendar', className), 'aria-label': 'Agenda' }, header, body);

  /** Refresca la agenda; opcionalmente actualiza los pacientes (p. ej. tras un alta rápida). */
  root.setCitas = (list, nextPacientes) => {
    if (nextPacientes) pacienteById = new Map(nextPacientes.map((p) => [p.id_paciente, p]));
    indexCitas(list);
    render();
  };
  root.goTo = (day, nextView) => {
    state.date = new Date(toDate(day));
    if (nextView) {
      state.view = nextView;
      viewTabs.selectTab(nextView);
    }
    render();
  };

  render();
  return root;
}
