/**
 * Solicitar cita (HU-06, RF-CIT-01/03, RN-02) — pages/paciente/agendar.html.
 * El mismo BookingWizard del personal, pero:
 *  - el paciente es fijo (el de la sesión): se omite el paso "Paciente";
 *  - la cita queda PENDIENTE_CONFIRMACION hasta que recepción la confirme;
 *  - las franjas se calculan con citasService.ocupacion(), que NO trae datos de otros pacientes.
 */
import { toISODate } from '../core/dates.js';
import { appUrl } from '../core/navigation.js';
import { Button } from '../components/atoms/index.js';
import { toast } from '../components/molecules/index.js';
import { BookingWizard } from '../components/organisms/index.js';
import { citasService, especialistasService, pacientesService, serviciosService } from '../services/index.js';
import { createAppPage, loadInto } from './_shared/app-page.js';
import { card, crumbs } from './_shared/ui.js';

async function init() {
  const page = createAppPage({ activeId: 'agendar', title: 'Solicitar cita', subtitle: 'Elige el tratamiento, el odontólogo y una hora libre.' });
  if (!page) return;
  const { user, layout } = page;
  layout.update({
    breadcrumbs: crumbs(user, { label: 'Solicitar cita' }),
    actions: [Button({ label: 'Ver mis citas', icon: 'calendar', variant: 'outline', onClick: () => location.assign(appUrl('pages/paciente/mis-citas.html')) })],
  });

  const data = await loadInto(
    layout,
    async () => {
      const [pacientes, especialistas, servicios, ocupacion] = await Promise.all([
        pacientesService.list(), // el servicio devuelve solo al paciente de la sesión
        especialistasService.list({ soloActivos: true }),
        serviciosService.list({ soloActivos: true }),
        citasService.ocupacion({ desde: toISODate() }),
      ]);
      return { pacientes, especialistas, servicios, ocupacion };
    },
    'Consultando disponibilidad…',
  );
  if (!data) return;

  layout.setContent(
    card(
      { title: 'Nueva solicitud', subtitle: 'Recepción confirmará tu cita y te llegará un recordatorio 48 horas antes.' },
      BookingWizard({
        pacienteId: user.id_paciente,
        pendingConfirmation: true,
        pacientes: data.pacientes,
        especialistas: data.especialistas,
        servicios: data.servicios,
        horarios: data.especialistas.flatMap((e) => e.horarios),
        citas: data.ocupacion,
        onComplete: async (cita) => {
          const saved = await citasService.create(cita);
          toast.success(`Con ${saved.especialista_nombre}. Te avisaremos cuando quede confirmada.`, 'Solicitud enviada');
          return saved;
        },
      }),
    ),
  );
}

init();
