import { h, cx, mount, uniqueId } from '../../core/dom.js';
import { validators } from '../../core/validators.js';
import { formatCOP, formatDate, formatLongDate, normalizeText } from '../../core/format.js';
import { toISODate, toSqlDateTime } from '../../core/dates.js';
import { getDaySlots, isSlotAvailable, suggestAlternatives, describeSchedule, toMinutes, toHHMM, SLOT_MINUTES } from '../../core/agenda.js';
import { Button, setButtonLoading, setButtonLabel, Avatar, Icon, ESTADOS } from '../atoms/index.js';
import { FormField, SearchBar, TimeSlot, validateForm, toast } from '../molecules/index.js';
import { openModalForm, FieldError } from './modal-form.js';
import { patientQuickFields } from './patient-fields.js';

const STEPS = [
  { id: 'paciente', label: 'Paciente' },
  { id: 'tratamiento', label: 'Tratamiento' },
  { id: 'horario', label: 'Fecha y hora' },
  { id: 'confirmar', label: 'Confirmar' },
];

const MAX_MATCHES = 6;

/**
 * Organismo: BookingWizard — agendamiento paso a paso (HU-05: RF-CIT-01, 02, 03 · RN-02).
 *
 *  1. Paciente: búsqueda + alta rápida en modal sin salir del flujo (RF-CIT-02).
 *  2. Tratamiento y odontólogo (muestra su horario).
 *  3. Fecha y hora: solo franjas dentro del horario y libres (RN-02). Si no hay
 *     disponibilidad, sugiere otras fechas del mismo odontólogo u otros odontólogos (RF-CIT-03).
 *  4. Confirmación: revalida la franja justo antes de guardar (otro usuario pudo tomarla).
 *
 * @param {object} props
 * @param {object[]} props.pacientes
 * @param {object[]} props.especialistas
 * @param {object[]} props.servicios
 * @param {object[]} props.horarios
 * @param {object[]} props.citas
 *        Para calcular franjas basta { id_especialista, fecha_hora, estado_cita } (citasService.ocupacion()).
 * @param {(cita: object) => Promise<object|void>|object|void} [props.onComplete]
 *        Persistir la cita (servicio). Si devuelve la cita guardada, el resumen final usa esa (id y estado reales).
 * @param {(paciente: object) => Promise<object>|object} [props.onCreatePatient] Persistir el paciente nuevo.
 * @param {number} [props.pacienteId]          Paciente fijo (portal del paciente): se omite el paso 1.
 * @param {boolean} [props.pendingConfirmation=false]  La cita queda por confirmar (HU-06: la pide el paciente).
 * @param {Date} [props.now]
 * @returns {HTMLElement}
 */
export function BookingWizard({ pacientes = [], especialistas = [], servicios = [], horarios = [], citas = [], onComplete, onCreatePatient, pacienteId = null, pendingConfirmation = false, now = new Date(), className } = {}) {
  const data = { pacientes: [...pacientes], citas: [...citas] };
  const first = pacienteId ? 1 : 0;
  const fresh = () => ({ step: first, pacienteId, servicioId: '', especialistaId: '', date: toISODate(now), start: null, motivo: '', done: null });
  let state = fresh();
  let searchTerm = '';

  const headingId = uniqueId('wizard-heading');
  const stepper = h('ol', { class: 'wizard__steps' });
  const heading = h('h3', { id: headingId, class: 'wizard__heading', tabindex: -1 });
  const content = h('div', { class: 'wizard__content' });
  const errorEl = h('p', { class: 'wizard__error', role: 'alert' });
  const backBtn = Button({ label: 'Atrás', variant: 'outline', icon: 'chevron-left', onClick: () => goTo(state.step - 1) });
  const nextBtn = Button({ label: 'Siguiente', iconRight: 'chevron-right', onClick: () => next() });
  const footer = h('div', { class: 'wizard__footer' }, backBtn, nextBtn);

  const paciente = () => data.pacientes.find((p) => p.id_paciente === state.pacienteId) ?? { nombres: 'Paciente', apellidos: `#${state.pacienteId}`, tipo_documento: '', numero_documento: '' };
  const especialista = () => especialistas.find((e) => e.id_especialista === Number(state.especialistaId));
  const servicio = () => servicios.find((s) => s.id_servicio === Number(state.servicioId));
  const fullName = (p) => `${p.nombres} ${p.apellidos}`;
  const setError = (message) => mount(errorEl, message && [Icon({ name: 'alert-circle', size: 16 }), h('span', {}, message)]);

  /* ================= Paso 1: Paciente ================= */
  function stepPaciente() {
    const list = h('ul', { class: 'wizard__patients', role: 'list', 'aria-label': 'Resultados de pacientes' });

    const renderMatches = () => {
      const q = normalizeText(searchTerm);
      const matches = data.pacientes
        .filter((p) => !q || normalizeText(fullName(p)).includes(q) || p.numero_documento.includes(q))
        .slice(0, MAX_MATCHES);
      mount(
        list,
        matches.length
          ? matches.map((p) =>
              h(
                'li',
                {},
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'wizard__patient',
                    'aria-pressed': String(p.id_paciente === state.pacienteId),
                    onClick: () => {
                      state.pacienteId = p.id_paciente;
                      setError(null);
                      renderMatches();
                    },
                  },
                  Avatar({ name: fullName(p), size: 'sm' }),
                  h('span', { class: 'wizard__patient-name' }, fullName(p)),
                  h('span', { class: 'wizard__patient-doc' }, `${p.tipo_documento} ${p.numero_documento}`),
                  p.id_paciente === state.pacienteId && Icon({ name: 'check', size: 16, className: 'wizard__patient-check' }),
                ),
              ),
            )
          : h('li', { class: 'wizard__empty' }, 'No se encontró el paciente. Puedes registrarlo a continuación.'),
      );
    };
    renderMatches();

    const registerBtn = Button({ label: 'Registrar paciente nuevo', icon: 'plus', variant: 'outline', size: 'sm', onClick: registerPatient });

    return [
      h('p', { class: 'wizard__lead' }, 'Busca al paciente por nombre o documento.'),
      SearchBar({
        placeholder: 'Nombre o número de documento…',
        label: 'Buscar paciente',
        value: searchTerm,
        onSearch: (term) => {
          searchTerm = term;
          renderMatches();
        },
      }),
      list,
      h('div', { class: 'wizard__register' }, h('span', {}, '¿El paciente no está registrado?'), registerBtn),
    ];
  }

  async function registerPatient() {
    const created = await openModalForm({
      title: 'Registrar paciente',
      description: 'Alta rápida sin salir del agendamiento. Podrás completar sus datos después.',
      submitLabel: 'Registrar y seleccionar',
      fields: () => patientQuickFields(),
      onSubmit: async (form) => {
        if (data.pacientes.some((p) => p.numero_documento === form.numero_documento)) {
          throw new FieldError('numero_documento', 'Ya existe un paciente con este documento.');
        }
        const nuevo = {
          ...form,
          id_paciente: Math.max(0, ...data.pacientes.map((p) => p.id_paciente)) + 1,
          fecha_registro: toSqlDateTime(new Date(), new Date().toTimeString().slice(0, 5)),
        };
        return (await onCreatePatient?.(nuevo)) ?? nuevo;
      },
    });
    if (!created) return;
    data.pacientes.unshift(created);
    state.pacienteId = created.id_paciente;
    searchTerm = '';
    toast.success(`${fullName(created)} quedó registrado y seleccionado.`, 'Paciente registrado');
    render();
  }

  /* ================= Paso 2: Tratamiento ================= */
  function stepTratamiento() {
    const scheduleNote = h('p', { class: 'wizard__note' });
    const paintSchedule = () => {
      const esp = especialista();
      mount(scheduleNote, esp && [Icon({ name: 'clock', size: 16 }), h('span', {}, `Horario de ${esp.nombre}: ${describeSchedule(horarios, esp.id_especialista) || 'sin horario configurado'}`)]);
    };
    paintSchedule();

    return [
      h(
        'div',
        { class: 'form-grid' },
        FormField({
          label: 'Tratamiento',
          name: 'id_servicio',
          as: 'select',
          required: true,
          placeholder: 'Seleccione el tratamiento…',
          value: state.servicioId,
          options: servicios.filter((s) => s.estado === 'ACTIVO').map((s) => ({ value: s.id_servicio, label: `${s.nombre_servicio} · ${formatCOP(s.precio_base)}` })),
          onChange: (event) => {
            state.servicioId = Number(event.target.value);
            state.motivo = '';
          },
        }),
        FormField({
          label: 'Odontólogo',
          name: 'id_especialista',
          as: 'select',
          required: true,
          placeholder: 'Seleccione el odontólogo…',
          value: state.especialistaId,
          options: especialistas.map((e) => ({ value: e.id_especialista, label: `${e.nombre} · ${e.especialidad}` })),
          onChange: (event) => {
            state.especialistaId = Number(event.target.value);
            state.start = null;
            paintSchedule();
          },
        }),
      ),
      scheduleNote,
    ];
  }

  /* ================= Paso 3: Fecha y hora ================= */
  function stepHorario() {
    const slotsBox = h('div', { class: 'wizard__slots-box', 'aria-live': 'polite' });

    const dateField = FormField({
      label: 'Fecha de la cita',
      name: 'fecha',
      type: 'date',
      required: true,
      min: toISODate(now),
      value: state.date,
      validate: validators.dateNotPast(),
      onChange: (event) => {
        state.date = event.target.value;
        state.start = null;
        renderSlots();
      },
    });

    function chooseAlternative(alt) {
      state.especialistaId = alt.especialistaId;
      state.date = alt.date;
      state.start = alt.start;
      dateField.querySelector('input').value = alt.date;
      setError(null);
      renderSlots();
    }

    function renderSlots() {
      const esp = especialista();
      if (!state.date || state.date < toISODate(now)) {
        mount(slotsBox);
        return;
      }
      const slots = getDaySlots({ especialistaId: esp.id_especialista, date: state.date, horarios, citas: data.citas, now });
      const free = slots.filter((s) => s.status === 'available');

      if (free.length) {
        mount(
          slotsBox,
          h('p', { class: 'wizard__lead' }, `${free.length} franjas disponibles con ${esp.nombre}:`),
          h(
            'div',
            { class: 'wizard__slots' },
            slots.map((s) =>
              TimeSlot({
                start: s.start,
                end: s.end,
                status: s.status === 'past' ? 'blocked' : s.status,
                detail: s.status === 'past' ? 'Hora pasada' : s.status === 'occupied' ? 'Ocupado' : undefined,
                selected: s.start === state.start,
                onSelect: () => {
                  state.start = s.start;
                  setError(null);
                  renderSlots();
                },
              }),
            ),
          ),
        );
        return;
      }

      // Sin disponibilidad → RN-02 / RF-CIT-03
      const reason = slots.length ? 'no tiene franjas libres' : 'no atiende';
      const alt = suggestAlternatives({ especialistaId: esp.id_especialista, date: state.date, horarios, citas: data.citas, especialistas, now });
      const altButton = (a, text) =>
        h('li', {}, h('button', { type: 'button', class: 'wizard__alt', onClick: () => chooseAlternative(a) }, Icon({ name: 'calendar', size: 16 }), h('span', {}, text), h('span', { class: 'wizard__alt-meta' }, `${a.available} libres`)));

      mount(
        slotsBox,
        h(
          'div',
          { class: 'wizard__alert' },
          Icon({ name: 'alert-triangle', size: 20 }),
          h(
            'div',
            {},
            h('p', { class: 'wizard__alert-title' }, 'Sin disponibilidad'),
            h('p', {}, `${esp.nombre} ${reason} el ${formatLongDate(state.date).toLowerCase()}. Te sugerimos estas alternativas:`),
          ),
        ),
        alt.sameDoctor.length > 0 &&
          h(
            'div',
            { class: 'wizard__alt-group' },
            h('p', { class: 'wizard__alt-title' }, `Próximas fechas con ${esp.nombre}`),
            h('ul', { class: 'wizard__alt-list', role: 'list' }, alt.sameDoctor.map((a) => altButton(a, `${formatDate(a.date, { weekday: 'long', day: 'numeric', month: 'short' })} · ${a.start}`))),
          ),
        alt.otherDoctors.length > 0 &&
          h(
            'div',
            { class: 'wizard__alt-group' },
            h('p', { class: 'wizard__alt-title' }, 'Otros odontólogos ese mismo día'),
            h(
              'ul',
              { class: 'wizard__alt-list', role: 'list' },
              alt.otherDoctors.map((a) => altButton(a, `${especialistas.find((e) => e.id_especialista === a.especialistaId)?.nombre} · desde ${a.start}`)),
            ),
          ),
        !alt.sameDoctor.length && !alt.otherDoctors.length && h('p', { class: 'wizard__note' }, 'No hay alternativas en los próximos 30 días.'),
      );
    }

    renderSlots();
    return [h('div', { class: 'wizard__date' }, dateField), slotsBox];
  }

  /* ================= Paso 4: Confirmar ================= */
  function stepConfirmar() {
    const p = paciente();
    const s = servicio();
    const e = especialista();
    if (!state.motivo) state.motivo = s.nombre_servicio;
    const row = (label, value) => [h('dt', {}, label), h('dd', {}, value)];

    return [
      h(
        'dl',
        { class: 'wizard__summary' },
        row('Paciente', `${fullName(p)} · ${p.tipo_documento} ${p.numero_documento}`),
        row('Tratamiento', `${s.nombre_servicio} · ${formatCOP(s.precio_base)}`),
        row('Odontólogo', `${e.nombre} · ${e.especialidad}`),
        row('Fecha', formatLongDate(state.date)),
        row('Hora', `${state.start} – ${toHHMM(toMinutes(state.start) + SLOT_MINUTES)}`),
      ),
      FormField({
        label: 'Motivo de la cita',
        name: 'motivo',
        as: 'textarea',
        rows: 2,
        required: true,
        maxLength: 255,
        value: state.motivo,
        validate: validators.maxLength(255),
        onInput: (event) => {
          state.motivo = event.target.value;
        },
      }),
      h(
        'p',
        { class: 'wizard__note' },
        Icon({ name: 'bell', size: 16 }),
        h('span', {}, pendingConfirmation ? 'La solicitud quedará "Pendiente de confirmación" hasta que recepción la confirme (HU-06).' : 'La cita quedará "Programada" y se enviará un recordatorio 48 h antes (RF-CIT-06).'),
      ),
    ];
  }

  /* ================= Navegación ================= */
  function validateStep() {
    setError(null);
    if (state.step === 0 && !state.pacienteId) {
      setError('Selecciona o registra un paciente para continuar.');
      return false;
    }
    if (state.step === 1 || state.step === 3) return validateForm(content);
    if (state.step === 2) {
      if (!validateForm(content)) return false;
      if (!state.start) {
        setError('Selecciona una hora disponible.');
        return false;
      }
      if (!isSlotAvailable({ especialistaId: state.especialistaId, date: state.date, start: state.start, horarios, citas: data.citas, now })) {
        setError('La franja seleccionada ya no está disponible (RN-02). Elige otra.');
        return false;
      }
    }
    return true;
  }

  async function next() {
    if (!validateStep()) return;
    if (state.step < STEPS.length - 1) {
      goTo(state.step + 1);
      return;
    }
    await submit();
  }

  async function submit() {
    // Revalidación final: otro usuario pudo tomar la franja mientras se confirmaba.
    if (!isSlotAvailable({ especialistaId: state.especialistaId, date: state.date, start: state.start, horarios, citas: data.citas, now })) {
      state.start = null;
      goTo(2);
      setError('Otra persona acaba de tomar esa franja. Elige otra hora.');
      return;
    }
    const cita = {
      id_cita: Math.max(0, ...data.citas.map((c) => c.id_cita)) + 1,
      id_paciente: state.pacienteId,
      id_especialista: Number(state.especialistaId),
      id_servicio: Number(state.servicioId),
      fecha_hora: toSqlDateTime(state.date, state.start),
      motivo: state.motivo.trim(),
      estado_cita: pendingConfirmation ? 'PENDIENTE_CONFIRMACION' : 'PROGRAMADA',
      recordatorio_enviado: 0,
    };
    setButtonLoading(nextBtn, true);
    backBtn.disabled = true;
    try {
      const saved = (await onComplete?.(cita)) ?? cita;
      data.citas.push(saved);
      state.done = saved;
      render();
    } catch (error) {
      setError(error?.message || 'No fue posible agendar la cita. Intenta de nuevo.');
    } finally {
      setButtonLoading(nextBtn, false);
      backBtn.disabled = false;
    }
  }

  function goTo(step) {
    state.step = Math.max(first, Math.min(step, STEPS.length - 1));
    setError(null);
    render();
    heading.focus();
  }

  /* ================= Render ================= */
  function renderStepper() {
    mount(
      stepper,
      STEPS.map((s, i) =>
        i >= first &&
        h(
          'li',
          { class: cx('wizard__step', i < state.step && 'is-done', i === state.step && 'is-current'), 'aria-current': i === state.step ? 'step' : undefined },
          h('span', { class: 'wizard__step-num', 'aria-hidden': 'true' }, i < state.step ? Icon({ name: 'check', size: 14 }) : i - first + 1),
          h('span', { class: 'wizard__step-label' }, s.label),
          i < state.step && h('span', { class: 'u-visually-hidden' }, ' (completado)'),
        ),
      ),
    );
  }

  function renderDone() {
    const c = state.done;
    const p = data.pacientes.find((x) => x.id_paciente === c.id_paciente);
    mount(stepper);
    heading.textContent = c.estado_cita === 'PENDIENTE_CONFIRMACION' ? 'Solicitud enviada' : 'Cita agendada';
    mount(
      content,
      h(
        'div',
        { class: 'wizard__done' },
        h('span', { class: 'wizard__done-icon', 'aria-hidden': 'true' }, Icon({ name: 'check-circle', size: 32 })),
        h('p', {}, `${fullName(p)} tiene cita con ${especialista().nombre} el ${formatLongDate(state.date).toLowerCase()} a las ${state.start}.`),
        h('p', { class: 'wizard__note' }, `Cita #${c.id_cita} · estado ${(ESTADOS[c.estado_cita]?.label ?? c.estado_cita).toLowerCase()}.`),
      ),
    );
    mount(
      footer,
      Button({
        label: 'Agendar otra cita',
        icon: 'plus',
        onClick: () => {
          state = fresh();
          mount(footer, backBtn, nextBtn);
          goTo(0);
        },
      }),
    );
    heading.focus();
  }

  function render() {
    if (state.done) {
      renderDone();
      return;
    }
    renderStepper();
    heading.textContent = `Paso ${state.step - first + 1} de ${STEPS.length - first}: ${STEPS[state.step].label}`;
    const views = [stepPaciente, stepTratamiento, stepHorario, stepConfirmar];
    mount(content, views[state.step]());
    backBtn.hidden = state.step === first;
    setButtonLabel(nextBtn, state.step === STEPS.length - 1 ? 'Agendar cita' : 'Siguiente');
  }

  const root = h('section', { class: cx('wizard', className), 'aria-labelledby': headingId }, stepper, heading, content, errorEl, footer);
  render();
  return root;
}
