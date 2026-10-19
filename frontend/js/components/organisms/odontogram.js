import { h, cx, mount, uniqueId } from '../../core/dom.js';
import { validators } from '../../core/validators.js';
import { formatDate } from '../../core/format.js';
import { toISODate } from '../../core/dates.js';
import { Button, Switch, Icon, ESTADOS } from '../atoms/index.js';
import {
  Tabs,
  Tooth,
  ToothLegend,
  FormField,
  validateForm,
  toast,
  setToothFace,
  selectToothFace,
  getToothName,
  normalizeFace,
  getToothInfo,
  FACE_LABELS,
  TOOTH_ESTADOS,
} from '../molecules/index.js';

/** Arcadas en el orden en que se dibujan (vista de frente: derecha del paciente a la izquierda). */
const ARCHES = {
  PERMANENTE: {
    upper: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
    lower: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
  },
  TEMPORAL: {
    upper: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
    lower: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
  },
};

const VIEWS = [
  { id: 'PERMANENTE', label: 'Permanente' },
  { id: 'TEMPORAL', label: 'Temporal' },
  { id: 'MIXTA', label: 'Mixta' },
];

/**
 * Organismo: Odontogram — odontograma completo con numeración FDI (RF-PAC-04, HU-04).
 *
 * @param {object} props
 * @param {Array<{id_diente: number, cara_diente: string, diagnostico: string, estado_tratamiento: string, fecha_registro?: string}>} [props.records]
 *        Filas de la tabla `odontograma` del paciente (id_diente = número FDI).
 * @param {number[]} [props.ausentes]                Piezas ausentes.
 * @param {'PERMANENTE'|'TEMPORAL'|'MIXTA'} [props.denticion='PERMANENTE']
 * @param {boolean} [props.readonly=false]           RN-01: solo el doctor asignado o el admin editan.
 * @param {string} [props.readonlyReason]
 * @param {(event: {type: 'save'|'remove'|'ausente', fdi: number, record?: object, records: object[]}) => void} [props.onChange]
 * @returns {HTMLElement}  Expone getRecords() y getAusentes().
 */
export function Odontogram({ records = [], ausentes = [], denticion = 'PERMANENTE', readonly = false, readonlyReason, onChange, className } = {}) {
  // Estado: hallazgos indexados por "fdi|CARA" (cara normalizada al tipo de diente).
  const findings = new Map();
  for (const r of records) {
    const face = normalizeFace(getToothInfo(r.id_diente), r.cara_diente);
    findings.set(`${r.id_diente}|${face}`, { ...r, cara_diente: face });
  }
  const missing = new Set(ausentes.map(Number));
  const teeth = new Map();
  let selection = null; // { fdi, face }
  let view = denticion;

  const facesOf = (fdi) => {
    const faces = {};
    for (const [key, r] of findings) {
      const [n, face] = key.split('|');
      if (Number(n) === fdi) faces[face] = { estado: r.estado_tratamiento, diagnostico: r.diagnostico };
    }
    return faces;
  };

  const getRecords = () => [...findings.values()];
  const emit = (type, fdi, record) => onChange?.({ type, fdi, record, records: getRecords(), ausentes: [...missing] });

  /* ---------- Piezas ---------- */
  function buildTooth(fdi) {
    const tooth = Tooth({
      fdi,
      faces: facesOf(fdi),
      ausente: missing.has(fdi),
      readonly,
      size: 'md',
      onFaceClick: ({ face }) => select(fdi, face),
    });
    teeth.set(fdi, tooth);
    return tooth;
  }

  // Las piezas ausentes y de solo lectura no tienen caras clicables:
  // se agrega un botón por pieza para poder consultarlas o reactivarlas.
  function toothCell(fdi) {
    const tooth = buildTooth(fdi);
    if (!missing.has(fdi) && !readonly) return h('div', { class: 'odontogram__cell', dataset: { fdi } }, tooth);
    return h(
      'div',
      { class: 'odontogram__cell', dataset: { fdi } },
      h('button', { type: 'button', class: 'odontogram__tooth-btn', 'aria-label': `Diente ${fdi}: ${getToothName(fdi)}${missing.has(fdi) ? ', ausente' : ''}`, onClick: () => select(fdi, null) }, tooth),
    );
  }

  function archRow(list, label) {
    const half = list.length / 2;
    return h(
      'div',
      { class: 'odontogram__arch', role: 'group', 'aria-label': label },
      h('div', { class: 'odontogram__quadrant' }, list.slice(0, half).map(toothCell)),
      h('div', { class: 'odontogram__midline', 'aria-hidden': 'true' }),
      h('div', { class: 'odontogram__quadrant' }, list.slice(half).map(toothCell)),
    );
  }

  const chart = h('div', { class: 'odontogram__chart' });

  function renderChart() {
    teeth.clear();
    const rows = [];
    if (view !== 'TEMPORAL') rows.push(archRow(ARCHES.PERMANENTE.upper, 'Maxilar superior, dentición permanente'));
    if (view !== 'PERMANENTE') {
      rows.push(archRow(ARCHES.TEMPORAL.upper, 'Maxilar superior, dentición temporal'));
      rows.push(h('div', { class: 'odontogram__occlusal-line', 'aria-hidden': 'true' }));
      rows.push(archRow(ARCHES.TEMPORAL.lower, 'Mandíbula, dentición temporal'));
    } else {
      rows.push(h('div', { class: 'odontogram__occlusal-line', 'aria-hidden': 'true' }));
    }
    if (view !== 'TEMPORAL') rows.push(archRow(ARCHES.PERMANENTE.lower, 'Mandíbula, dentición permanente'));

    mount(
      chart,
      h('div', { class: 'odontogram__sides', 'aria-hidden': 'true' }, h('span', {}, 'Derecha del paciente'), h('span', {}, 'Izquierda del paciente')),
      h('div', { class: 'odontogram__arches' }, rows),
    );
    if (selection && teeth.has(selection.fdi) && selection.face) selectToothFace(teeth.get(selection.fdi), selection.face);
  }

  /* ---------- Resumen ---------- */
  const summary = h('div', { class: 'odontogram__summary', 'aria-live': 'polite' });
  // El resumen usa las mismas muestras de color que el gráfico (convención clínica rojo/azul),
  // no los colores de StatusBadge: dentro del odontograma un mismo estado debe verse igual.
  function renderSummary() {
    const counts = {};
    for (const r of findings.values()) counts[r.estado_tratamiento] = (counts[r.estado_tratamiento] ?? 0) + 1;
    mount(
      summary,
      Object.keys(TOOTH_ESTADOS).map((estado) =>
        h(
          'span',
          { class: 'odontogram__count' },
          h('span', { class: 'tooth-legend__swatch', 'data-estado': estado, 'aria-hidden': 'true' }),
          `${ESTADOS[estado]?.label ?? estado}: `,
          h('strong', {}, counts[estado] ?? 0),
        ),
      ),
      h('span', { class: 'odontogram__count' }, 'Ausentes: ', h('strong', {}, missing.size)),
    );
  }

  /* ---------- Panel lateral (HU-04) ---------- */
  const panel = h('div', { class: 'odontogram__panel-body' });
  const panelTitleId = uniqueId('odo-panel');

  function select(fdi, face) {
    if (selection && teeth.has(selection.fdi)) selectToothFace(teeth.get(selection.fdi), null);
    selection = { fdi, face };
    if (face) selectToothFace(teeth.get(fdi), face);
    renderPanel();
  }

  function renderPanel() {
    if (!selection) {
      mount(
        panel,
        h('p', { class: 'odontogram__hint' }, Icon({ name: 'info', size: 16 }), readonly ? 'Selecciona una pieza para ver sus hallazgos.' : 'Selecciona una cara de una pieza para registrar un hallazgo.'),
        renderFindingsList(),
      );
      return;
    }

    const { fdi, face } = selection;
    const isMissing = missing.has(fdi);
    const header = h(
      'div',
      { class: 'odontogram__selected' },
      h('p', { class: 'odontogram__selected-title' }, `Diente ${fdi}`),
      h('p', { class: 'odontogram__selected-name' }, getToothName(fdi)),
      face && h('p', { class: 'odontogram__selected-face' }, `Cara ${FACE_LABELS[face].toLowerCase()}`),
    );

    const ausenteSwitch = readonly
      ? null
      : Switch({
          label: 'Pieza ausente',
          checked: isMissing,
          onChange: (event) => toggleMissing(fdi, event.target.checked),
        });

    if (readonly || isMissing || !face) {
      const toothFindings = [...findings.values()].filter((r) => r.id_diente === fdi);
      mount(
        panel,
        header,
        ausenteSwitch,
        isMissing && h('p', { class: 'odontogram__hint' }, 'La pieza está marcada como ausente.'),
        toothFindings.length
          ? h('ul', { class: 'odontogram__findings', role: 'list' }, toothFindings.map(findingItem))
          : h('p', { class: 'odontogram__hint' }, 'Sin hallazgos registrados en esta pieza.'),
        readonly && h('p', { class: 'odontogram__readonly' }, Icon({ name: 'lock', size: 14 }), readonlyReason ?? 'Solo lectura.'),
      );
      return;
    }

    const current = findings.get(`${fdi}|${face}`);
    const estado = FormField({
      label: 'Estado',
      name: 'estado_tratamiento',
      as: 'select',
      required: true,
      placeholder: 'Seleccione…',
      value: current?.estado_tratamiento,
      options: Object.entries(TOOTH_ESTADOS).map(([value, label]) => ({ value, label })),
    });
    const diagnostico = FormField({
      label: 'Diagnóstico',
      name: 'diagnostico',
      as: 'textarea',
      rows: 3,
      required: true,
      maxLength: 100,
      value: current?.diagnostico,
      placeholder: 'Ej. Caries incipiente',
      hint: 'Máximo 100 caracteres (odontograma.diagnostico).',
      validate: validators.maxLength(100),
    });

    const form = h(
      'form',
      { class: 'odontogram__form', novalidate: true, 'aria-labelledby': panelTitleId },
      estado,
      diagnostico,
      h(
        'div',
        { class: 'odontogram__form-actions' },
        current && Button({ label: 'Quitar', variant: 'ghost', icon: 'trash', size: 'sm', onClick: () => removeFinding(fdi, face) }),
        Button({ label: current ? 'Actualizar hallazgo' : 'Guardar hallazgo', type: 'submit', icon: 'check', size: 'sm' }),
      ),
    );
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!validateForm(form)) return;
      const data = Object.fromEntries(new FormData(form));
      saveFinding(fdi, face, data.estado_tratamiento, data.diagnostico.trim());
    });

    mount(panel, header, ausenteSwitch, form);
  }

  function findingItem(r) {
    return h(
      'li',
      {},
      h(
        'button',
        { type: 'button', class: 'odontogram__finding', onClick: () => select(r.id_diente, missing.has(r.id_diente) ? null : r.cara_diente) },
        h('span', { class: 'odontogram__finding-swatch', 'data-estado': r.estado_tratamiento, 'aria-hidden': 'true' }),
        h(
          'span',
          { class: 'odontogram__finding-body' },
          h('strong', {}, `${r.id_diente} · ${FACE_LABELS[r.cara_diente] ?? r.cara_diente}`),
          h('span', {}, r.diagnostico),
          h('span', { class: 'odontogram__finding-meta' }, `${ESTADOS[r.estado_tratamiento]?.label ?? r.estado_tratamiento}${r.fecha_registro ? ` · ${formatDate(r.fecha_registro)}` : ''}`),
        ),
      ),
    );
  }

  function renderFindingsList() {
    const list = [...findings.values()].sort((a, b) => a.id_diente - b.id_diente);
    return h(
      'div',
      { class: 'odontogram__all' },
      h('p', { class: 'odontogram__all-title' }, `Hallazgos registrados (${list.length})`),
      list.length ? h('ul', { class: 'odontogram__findings', role: 'list' }, list.map(findingItem)) : h('p', { class: 'odontogram__hint' }, 'Este paciente no tiene hallazgos.'),
    );
  }

  /* ---------- Acciones ---------- */
  function saveFinding(fdi, face, estado, diagnostico) {
    const record = {
      ...(findings.get(`${fdi}|${face}`) ?? {}),
      id_diente: fdi,
      cara_diente: face,
      estado_tratamiento: estado,
      diagnostico,
      fecha_registro: `${toISODate()} ${new Date().toTimeString().slice(0, 8)}`, // hora local, formato DATETIME
    };
    findings.set(`${fdi}|${face}`, record);
    setToothFace(teeth.get(fdi), face, { estado, diagnostico });
    renderSummary();
    renderPanel();
    toast.success(`${FACE_LABELS[face]}: ${diagnostico}`, `Diente ${fdi} actualizado`);
    emit('save', fdi, record);
  }

  function removeFinding(fdi, face) {
    findings.delete(`${fdi}|${face}`);
    setToothFace(teeth.get(fdi), face, null);
    renderSummary();
    renderPanel();
    toast.info(`Se quitó el hallazgo de la cara ${FACE_LABELS[face].toLowerCase()}.`, `Diente ${fdi}`);
    emit('remove', fdi);
  }

  function toggleMissing(fdi, value) {
    if (value) missing.add(fdi);
    else missing.delete(fdi);
    selection = { fdi, face: null };
    renderChart();
    renderSummary();
    renderPanel();
    emit('ausente', fdi);
  }

  /* ---------- Estructura ---------- */
  const viewTabs = Tabs({
    ariaLabel: 'Tipo de dentición',
    variant: 'segmented',
    activeId: view,
    tabs: VIEWS,
    onChange: (id) => {
      view = id;
      renderChart();
    },
  });

  const root = h(
    'section',
    { class: cx('odontogram', className), 'aria-label': 'Odontograma' },
    h('div', { class: 'odontogram__header' }, viewTabs, summary),
    h(
      'div',
      { class: 'odontogram__layout' },
      h('div', { class: 'odontogram__main' }, chart, ToothLegend({ className: 'odontogram__legend' })),
      h('aside', { class: 'odontogram__panel', 'aria-labelledby': panelTitleId }, h('h3', { id: panelTitleId, class: 'odontogram__panel-title' }, 'Registro de hallazgo'), panel),
    ),
  );

  renderChart();
  renderSummary();
  renderPanel();

  root.getRecords = getRecords;
  root.getAusentes = () => [...missing];
  return root;
}
