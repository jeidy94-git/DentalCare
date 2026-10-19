# Historias de Usuario — Centro Odontológico (DentalCare)

> Trazabilidad: cada historia referencia los RF de `SRS-Centro_Odontologico-v1.0.md`. Complementa la Matriz de Historias de Usuario ya existente, actualizada con trazabilidad RF y criterios Given-When-Then.

## Épica 1: Configuración y Acceso

### HU-01 — Configurar roles con permisos claros
**Como** Administrador
**quiero** crear y editar roles con sus permisos
**para** que cada perfil (Asistente, Doctor) solo acceda a lo que le corresponde

**Requerimientos que implementa:** RF-ROL-01, RF-ROL-06, RF-ROL-07
**Prioridad:** Alta · **Estimación:** 3 puntos

**Criterios de aceptación**
1. **Dado** un nombre de rol no registrado, **cuando** lo creo con sus permisos, **entonces** el sistema lo guarda disponible para asignar.
2. **Dado** un rol activo con usuarios asignados, **cuando** lo inactivo, **entonces** el sistema también inactiva a esos usuarios y pide confirmación previa.

### HU-02 — Acceder al sistema según mi rol
**Como** Administrador, Asistente, Doctor o Paciente
**quiero** iniciar sesión y recuperar mi contraseña
**para** usar el sistema sin depender de soporte técnico

**Requerimientos que implementa:** RF-ACC-01, RF-ACC-02
**Prioridad:** Alta · **Estimación:** 3 puntos

**Criterios de aceptación**
1. **Dado** credenciales válidas, **cuando** inicio sesión, **entonces** accedo al panel correspondiente a mi rol.
2. **Dado** una contraseña incorrecta, **cuando** intento ingresar, **entonces** el sistema muestra un error genérico sin indicar si el correo existe.

## Épica 2: Pacientes e Historia Clínica

### HU-03 — Registrar un paciente nuevo en consulta
**Como** Asistente
**quiero** registrar un paciente con sus datos personales y médicos
**para** poder agendarle citas y abrir su historia clínica

**Requerimientos que implementa:** RF-PAC-01
**Prioridad:** Alta · **Estimación:** 3 puntos

**Criterios de aceptación**
1. **Dado** los datos básicos de un paciente nuevo, **cuando** lo registro, **entonces** el sistema lo crea disponible para agendamiento.

### HU-04 — Mantener el odontograma actualizado
**Como** Doctor
**quiero** registrar el estado de cada diente de mi paciente
**para** llevar un seguimiento preciso de su tratamiento

**Requerimientos que implementa:** RF-PAC-04, RF-PAC-05
**Prioridad:** Alta · **Estimación:** 5 puntos

**Criterios de aceptación**
1. **Dado** un paciente en consulta, **cuando** registro el estado de un diente y sus caras, **entonces** el sistema lo guarda en su odontograma.
2. **Dado** un paciente con historial previo, **cuando** consulto su historia clínica, **entonces** veo diagnósticos, tratamientos y radiografías anteriores.
3. **Dado** que no soy el doctor asignado ni administrador, **cuando** intento editar la historia clínica de un paciente, **entonces** el sistema rechaza la edición.

## Épica 3: Citas

### HU-05 — Agendar una cita sin duplicaciones
**Como** Asistente
**quiero** agendar una cita validando disponibilidad real
**para** evitar choques de horario y esperas innecesarias

**Requerimientos que implementa:** RF-CIT-01, RF-CIT-02, RF-CIT-03
**Prioridad:** Alta · **Estimación:** 5 puntos

**Criterios de aceptación**
1. **Dado** un paciente, tratamiento y horario disponible, **cuando** confirmo la cita, **entonces** el sistema la registra y notifica a paciente y odontólogo.
2. **Dado** un paciente no registrado, **cuando** intento agendarle una cita, **entonces** el sistema me permite registrarlo sin salir del flujo.
3. **Dado** un horario sin disponibilidad, **cuando** intento agendar, **entonces** el sistema sugiere fechas u odontólogos alternativos.

### HU-06 — Solicitar cita como paciente
**Como** Paciente
**quiero** solicitar una cita indicando mi disponibilidad
**para** no depender de llamar por teléfono

**Requerimientos que implementa:** RF-CIT-04
**Prioridad:** Alta · **Estimación:** 3 puntos

**Criterios de aceptación**
1. **Dado** un tratamiento y fechas preferidas, **cuando** envío la solicitud, **entonces** queda en estado "pendiente de confirmación" hasta que el consultorio la apruebe.

### HU-07 — Modificar o cancelar una cita
**Como** Asistente o Paciente
**quiero** modificar o cancelar una cita existente
**para** ajustar la agenda ante imprevistos

**Requerimientos que implementa:** RF-CIT-05, RF-CIT-06
**Prioridad:** Alta · **Estimación:** 3 puntos

**Criterios de aceptación**
1. **Dado** una cita programada, **cuando** la cancelo, **entonces** el sistema libera el horario y notifica a las partes.
2. **Dado** una cita a 48 horas de su fecha, **cuando** se cumple ese plazo, **entonces** el sistema envía un recordatorio automático.

## Épica 4: Tratamientos y Pagos

### HU-08 — Definir el catálogo de tratamientos
**Como** Administrador
**quiero** crear tratamientos con su precio
**para** poder asignarlos a los pacientes y cobrarlos correctamente

**Requerimientos que implementa:** RF-TRA-01, RF-TRA-02
**Prioridad:** Alta · **Estimación:** 2 puntos

**Criterios de aceptación**
1. **Dado** nombre, precio y descripción de un tratamiento, **cuando** lo registro, **entonces** queda disponible para asignar a pacientes.

### HU-09 — Ofrecer un plan de pago por cuotas
**Como** Asistente
**quiero** crear un plan de pago para un tratamiento costoso
**para** facilitarle el pago al paciente

**Requerimientos que implementa:** RF-PAG-01, RF-PAG-02
**Prioridad:** Alta · **Estimación:** 5 puntos

**Criterios de aceptación**
1. **Dado** un tratamiento asignado, **cuando** creo un plan de pago con sus cuotas, **entonces** el sistema lo asocia al paciente y muestra el saldo pendiente.
2. **Dado** un plan de pago con todas sus cuotas canceladas, **cuando** se registra el último pago, **entonces** el sistema lo marca como finalizado.

### HU-10 — Ver los pagos pendientes del día
**Como** Asistente
**quiero** ver los pagos pendientes en mi panel
**para** gestionar el cobro antes de que el paciente se retire

**Requerimientos que implementa:** RF-PAG-03, RF-PAG-04
**Prioridad:** Media · **Estimación:** 2 puntos

**Criterios de aceptación**
1. **Dado** que existen pagos pendientes del día, **cuando** abro mi panel, **entonces** los veo listados junto a las próximas citas.

## Épica 5: Especialistas y Operación

### HU-11 — Configurar la agenda de un especialista
**Como** Administrador
**quiero** definir los horarios de cada odontólogo
**para** que el sistema solo permita agendar citas dentro de su disponibilidad real

**Requerimientos que implementa:** RF-ESP-01, RF-ESP-02
**Prioridad:** Alta · **Estimación:** 3 puntos

**Criterios de aceptación**
1. **Dado** un especialista registrado, **cuando** configuro sus horarios por día, **entonces** el sistema solo ofrece esos horarios al agendar citas con él.

### HU-12 — Ver el desempeño del consultorio de un vistazo
**Como** Administrador
**quiero** ver un dashboard con citas, pacientes y tratamientos por especialista
**para** tomar decisiones operativas rápidas

**Requerimientos que implementa:** RF-DAS-01, RF-DAS-02, RF-DAS-03
**Prioridad:** Media · **Estimación:** 5 puntos

**Criterios de aceptación**
1. **Dado** que hay actividad registrada, **cuando** abro el dashboard, **entonces** veo citas del día, pacientes nuevos y tratamientos por especialista.

### HU-13 — Registrar novedades operativas
**Como** Asistente o Doctor
**quiero** registrar una novedad o incidencia
**para** dejar constancia de eventos que afectan la operación

**Requerimientos que implementa:** RF-NOV-01, RF-NOV-02
**Prioridad:** Media · **Estimación:** 2 puntos

**Criterios de aceptación**
1. **Dado** un evento relevante, **cuando** lo registro con tipo y descripción, **entonces** queda disponible en el listado de novedades.

**Notas y restricciones**
- RNF-REN-01 (respuesta ≤5s) y RNF-CAL-01 (disponibilidad 24h) son Definición de Terminado de toda historia.
- RNF-SEG-01/02/03 (contraseñas cifradas, log de errores, alerta a desarrollo) aplican transversalmente.

## Tabla de cobertura

| RF-ID | Historia(s) | Prioridad |
|---|---|---|
| RF-ROL-01 a 07 | HU-01 | Alta |
| RF-ACC-01, 02 | HU-02 | Alta |
| RF-PAC-01 | HU-03 | Alta |
| RF-PAC-04, 05 | HU-04 | Alta |
| RF-CIT-01 a 03 | HU-05 | Alta |
| RF-CIT-04 | HU-06 | Alta |
| RF-CIT-05, 06 | HU-07 | Alta |
| RF-TRA-01, 02 | HU-08 | Alta |
| RF-PAG-01, 02 | HU-09 | Alta |
| RF-PAG-03, 04 | HU-10 | Media |
| RF-ESP-01, 02 | HU-11 | Alta |
| RF-DAS-01 a 03 | HU-12 | Media |
| RF-NOV-01, 02 | HU-13 | Media |
