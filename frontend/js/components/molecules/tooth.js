import { h, cx } from '../../core/dom.js';
import { ESTADOS } from '../atoms/index.js';

/**
 * Molécula: Tooth — pieza dental del odontograma con 5 caras clicables.
 *
 * Representación clásica vista de frente al paciente (cuadrado dividido en 5 regiones):
 *
 *        ┌───────────────┐       Superiores (cuadrantes 1,2,5,6): arriba = VESTIBULAR, abajo = PALATINA
 *        │╲     top     ╱│       Inferiores (cuadrantes 3,4,7,8): arriba = LINGUAL,    abajo = VESTIBULAR
 *        │ ╲───────────╱ │
 *        │l │ center  │ r│       Centro: OCLUSAL (premolares/molares) o INCISAL (incisivos/caninos)
 *        │ ╱───────────╲ │
 *        │╱   bottom    ╲│       MESIAL = lado hacia la línea media; DISTAL = lado opuesto.
 *        └───────────────┘       Cuadrantes 1,4,5,8 (derecha del paciente) se dibujan a la izquierda.
 *
 * Los códigos de cara coinciden con odontograma.cara_diente de la BD.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

const REGION_POINTS = {
  top: '0,0 100,0 70,30 30,30',
  left: '0,0 30,30 30,70 0,100',
  center: '30,30 70,30 70,70 30,70',
  right: '100,0 100,100 70,70 70,30',
  bottom: '30,70 70,70 100,100 0,100',
};
const REGION_ORDER = ['top', 'left', 'center', 'right', 'bottom'];

const ARROW_TO_REGION = { ArrowUp: 'top', ArrowDown: 'bottom', ArrowLeft: 'left', ArrowRight: 'right' };
const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

export const FACE_LABELS = {
  VESTIBULAR: 'Vestibular',
  LINGUAL: 'Lingual',
  PALATINA: 'Palatina',
  MESIAL: 'Mesial',
  DISTAL: 'Distal',
  OCLUSAL: 'Oclusal',
  INCISAL: 'Incisal',
};

/**
 * Estados de odontograma.estado_tratamiento con su significado en el gráfico.
 * Convención clínica: rojo = patología por tratar, azul = tratamiento realizado.
 */
export const TOOTH_ESTADOS = {
  PENDIENTE: 'Pendiente (caries o patología por tratar)',
  EN_PROCESO: 'Tratamiento en proceso',
  EN_OBSERVACION: 'En observación',
  REALIZADO: 'Tratamiento realizado',
  REEMPLAZO_REQUERIDO: 'Reemplazo requerido',
};

/**
 * Datos derivados del número FDI.
 * Permanentes: cuadrantes 1–4, posiciones 1–8. Temporales: cuadrantes 5–8, posiciones 1–5.
 */
export function getToothInfo(fdi) {
  const quadrant = Math.floor(Number(fdi) / 10);
  const position = Number(fdi) % 10;
  const temporal = quadrant >= 5 && quadrant <= 8;
  const valid = position >= 1 && ((quadrant >= 1 && quadrant <= 4 && position <= 8) || (temporal && position <= 5));
  if (!valid) throw new Error(`Número FDI inválido: ${fdi}`);

  const upper = [1, 2, 5, 6].includes(quadrant);
  const patientRight = [1, 4, 5, 8].includes(quadrant);
  const anterior = position <= 3;

  return {
    fdi: Number(fdi),
    quadrant,
    position,
    upper,
    anterior,
    denticion: temporal ? 'TEMPORAL' : 'PERMANENTE',
    layout: {
      top: upper ? 'VESTIBULAR' : 'LINGUAL',
      bottom: upper ? 'PALATINA' : 'VESTIBULAR',
      left: patientRight ? 'DISTAL' : 'MESIAL',
      right: patientRight ? 'MESIAL' : 'DISTAL',
      center: anterior ? 'INCISAL' : 'OCLUSAL',
    },
  };
}

const PERMANENT_NAMES = ['Incisivo central', 'Incisivo lateral', 'Canino', 'Primer premolar', 'Segundo premolar', 'Primer molar', 'Segundo molar', 'Tercer molar'];
const TEMPORARY_NAMES = ['Incisivo central', 'Incisivo lateral', 'Canino', 'Primer molar', 'Segundo molar'];

/** 16 → "Primer molar superior derecho"; 55 → "Segundo molar temporal superior derecho". */
export function getToothName(fdi) {
  const info = getToothInfo(fdi);
  const temporal = info.denticion === 'TEMPORAL';
  const base = (temporal ? TEMPORARY_NAMES : PERMANENT_NAMES)[info.position - 1];
  const side = [1, 4, 5, 8].includes(info.quadrant) ? 'derecho' : 'izquierdo';
  return `${base}${temporal ? ' temporal' : ''} ${info.upper ? 'superior' : 'inferior'} ${side}`;
}

/**
 * Normaliza el nombre de la cara según el tipo de diente
 * (la BD guarda LINGUAL/OCLUSAL de forma genérica en algunos registros).
 */
export function normalizeFace(info, code) {
  const upperCode = String(code).toUpperCase();
  if (upperCode === 'LINGUAL' && info.upper) return 'PALATINA';
  if (upperCode === 'PALATINA' && !info.upper) return 'LINGUAL';
  if (upperCode === 'OCLUSAL' && info.anterior) return 'INCISAL';
  if (upperCode === 'INCISAL' && !info.anterior) return 'OCLUSAL';
  return upperCode;
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

/**
 * @param {object} props
 * @param {number} props.fdi                         Número FDI (11–48 permanentes, 51–85 temporales).
 * @param {Record<string, {estado: string, diagnostico?: string}>} [props.faces]
 *        Hallazgos por cara, p. ej. { OCLUSAL: { estado: 'PENDIENTE', diagnostico: 'Caries incipiente' } }.
 * @param {boolean} [props.ausente=false]            Pieza ausente: se marca con X y no es editable.
 * @param {boolean} [props.readonly=false]           Solo lectura (paciente / usuario sin permiso, RN-01).
 * @param {string} [props.selectedFace]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {(detail: {fdi:number, face:string, faceLabel:string, data:object|null, tooth:HTMLElement}) => void} [props.onFaceClick]
 * @returns {HTMLDivElement}
 */
export function Tooth({ fdi, faces = {}, ausente = false, readonly = false, selectedFace = null, size = 'md', onFaceClick, className } = {}) {
  const info = getToothInfo(fdi);
  const interactive = !readonly && !ausente;

  const state = { faces: {}, selected: null };
  for (const [code, data] of Object.entries(faces)) {
    if (data) state.faces[normalizeFace(info, code)] = data;
  }

  const svg = svgEl('svg', {
    viewBox: '-2 -2 104 104',
    class: 'tooth__svg',
    role: interactive ? 'group' : 'img',
    'aria-label': `Diente ${fdi}${ausente ? ', ausente' : ''}`,
  });

  const polys = new Map();
  for (const region of REGION_ORDER) {
    const code = info.layout[region];
    const poly = svgEl('polygon', { points: REGION_POINTS[region], class: 'tooth__face', 'data-face': code, 'data-region': region });
    poly.append(svgEl('title'));
    if (interactive) {
      poly.setAttribute('role', 'button');
      poly.setAttribute('tabindex', '-1');
    }
    polys.set(code, poly);
    svg.append(poly);
  }

  if (ausente) {
    svg.append(svgEl('line', { x1: 10, y1: 10, x2: 90, y2: 90, class: 'tooth__cross' }));
    svg.append(svgEl('line', { x1: 90, y1: 10, x2: 10, y2: 90, class: 'tooth__cross' }));
  }

  const number = h('span', { class: 'tooth__number', 'aria-hidden': 'true' }, String(fdi));
  const root = h(
    'div',
    {
      class: cx('tooth', size !== 'md' && `tooth--${size}`, ausente && 'tooth--ausente', !interactive && 'tooth--readonly', className),
      dataset: { fdi },
    },
    info.upper ? [number, svg] : [svg, number],
  );
  root._dcTooth = { info, state, polys, interactive };

  for (const code of polys.keys()) paintFace(root, code);

  if (interactive) {
    setTabStop(root, info.layout.top);
    if (selectedFace) selectToothFace(root, selectedFace);

    const activate = (code) => {
      selectToothFace(root, code);
      onFaceClick?.({ fdi: info.fdi, face: code, faceLabel: FACE_LABELS[code], data: state.faces[code] ?? null, tooth: root });
    };

    svg.addEventListener('click', (event) => {
      const poly = event.target.closest('.tooth__face');
      if (poly) activate(poly.dataset.face);
    });

    svg.addEventListener('keydown', (event) => {
      const poly = event.target.closest('.tooth__face');
      if (!poly) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate(poly.dataset.face);
        return;
      }
      let region = ARROW_TO_REGION[event.key];
      if (!region) return;
      event.preventDefault();
      // Desde un borde, la flecha hacia el centro lleva a la cara central.
      if (OPPOSITE[poly.dataset.region] === region) region = 'center';
      const target = polys.get(info.layout[region]);
      setTabStop(root, target.dataset.face);
      target.focus();
    });
  }

  return root;
}

/* ------------------------------------------------------------------ */
/* API para actualizar una pieza ya renderizada                        */
/* ------------------------------------------------------------------ */

/** Registra o borra (data = null) el hallazgo de una cara y repinta. */
export function setToothFace(tooth, code, data) {
  const meta = tooth._dcTooth;
  if (!meta) return;
  const face = normalizeFace(meta.info, code);
  if (data) meta.state.faces[face] = data;
  else delete meta.state.faces[face];
  paintFace(tooth, face);
}

/** Marca una cara como seleccionada (null para limpiar la selección). */
export function selectToothFace(tooth, code) {
  const meta = tooth._dcTooth;
  if (!meta) return;
  const previous = meta.state.selected;
  meta.state.selected = code ? normalizeFace(meta.info, code) : null;
  if (previous) paintFace(tooth, previous);
  if (meta.state.selected) {
    paintFace(tooth, meta.state.selected);
    setTabStop(tooth, meta.state.selected);
  }
}

/** Devuelve una copia de los hallazgos actuales de la pieza. */
export function getToothFaces(tooth) {
  return { ...(tooth._dcTooth?.state.faces ?? {}) };
}

function paintFace(tooth, code) {
  const { info, state, polys, interactive } = tooth._dcTooth;
  const poly = polys.get(code);
  if (!poly) return;

  const data = state.faces[code];
  const selected = state.selected === code;

  if (data?.estado) poly.setAttribute('data-estado', data.estado);
  else poly.removeAttribute('data-estado');
  poly.classList.toggle('is-selected', selected);

  const estadoLabel = data?.estado ? (ESTADOS[data.estado]?.label ?? data.estado).toLowerCase() : null;
  const description = data
    ? `${data.diagnostico ?? 'Hallazgo registrado'}${estadoLabel ? ` (${estadoLabel})` : ''}`
    : 'sin hallazgos';
  const text = `Diente ${info.fdi}, cara ${FACE_LABELS[code].toLowerCase()}: ${description}`;

  poly.querySelector('title').textContent = text;
  if (interactive) {
    poly.setAttribute('aria-label', text);
    poly.setAttribute('aria-pressed', String(selected));
  }
  // La cara seleccionada se dibuja al final para que su borde quede por encima de las vecinas.
  // Mover un nodo le quita el foco, así que se restaura si lo tenía.
  const lastFace = poly.parentNode.querySelector('.tooth__face:last-of-type');
  if (selected && lastFace !== poly) {
    const hadFocus = document.activeElement === poly;
    lastFace.after(poly);
    if (hadFocus) poly.focus();
  }
}

function setTabStop(tooth, code) {
  for (const [face, poly] of tooth._dcTooth.polys) poly.setAttribute('tabindex', face === code ? '0' : '-1');
}

/** Leyenda de colores del odontograma. */
export function ToothLegend({ className } = {}) {
  return h(
    'ul',
    { class: cx('tooth-legend', className), role: 'list', 'aria-label': 'Convenciones del odontograma' },
    h('li', { class: 'tooth-legend__item' }, h('span', { class: 'tooth-legend__swatch', 'aria-hidden': 'true' }), 'Sin hallazgos'),
    Object.entries(TOOTH_ESTADOS).map(([estado, label]) =>
      h(
        'li',
        { class: 'tooth-legend__item' },
        h('span', { class: 'tooth-legend__swatch', 'data-estado': estado, 'aria-hidden': 'true' }),
        label,
      ),
    ),
  );
}
