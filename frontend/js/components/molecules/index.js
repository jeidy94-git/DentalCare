/**
 * Barrel de moléculas: los organismos y páginas importan desde aquí.
 */
export { FormField, PasswordField, setFieldError, validateField, validateForm, clearFormErrors } from './form-field.js';
export { SearchBar } from './search-bar.js';
export { KpiCard } from './kpi-card.js';
export { Tabs } from './tabs.js';
export { Pagination, pageRange } from './pagination.js';
export { toast } from './toast.js';
export { confirmDialog } from './confirm-dialog.js';
export { TimeSlot, setTimeSlotSelected } from './time-slot.js';
export {
  Tooth,
  ToothLegend,
  setToothFace,
  selectToothFace,
  getToothFaces,
  getToothInfo,
  getToothName,
  normalizeFace,
  FACE_LABELS,
  TOOTH_ESTADOS,
} from './tooth.js';
