## 1. Introducción

### 1.1 Propósito
Define el comportamiento funcional y las restricciones no funcionales del sistema **"DentalCare"** para el consultorio odontológico de Rionegro, Antioquia. Cubre configuración, usuarios, dashboard, gestión de pacientes, citas, novedades, tratamientos, pagos y especialistas. Versión 1.0.

### 1.2 Convenciones del documento
- `RF-<CAR>-##` funcional; `RNF-<CAT>-##` no funcional (`REN`, `SEG`, `PRI`, `SAF`, `USA`, `CAL`, `TEC`); `RN-##` regla de negocio.
- Prioridad Alta/Media/Baja. "Debe" es obligación vinculante.

### 1.3 Audiencia objetivo y sugerencias de lectura
Desarrollo: secciones 3-5. QA: sección 4 y `historias-usuario-Centro_Odontologico.md`. Consultorio (cliente): secciones 1-2. Evaluadores SENA: sección 4 y Apéndice C.

### 1.4 Alcance del producto
Aplicación web/móvil que reemplaza el agendamiento manual de citas, las historias clínicas en papel y el cobro manual por una plataforma con tres roles operativos (Administrador, Asistente, Doctor/Odontólogo) y un rol de paciente. Objetivo: reducir errores de agenda, centralizar historias clínicas y odontogramas, y automatizar pagos y reportes.

**Fuera de alcance v1.0:** telemedicina/videoconsulta; integración con EPS o aseguradoras; recetas electrónicas con firma digital certificada.

### 1.5 Referencias
- Ficha de Proyecto — `Ficha Proyecto/Proyecto Centro Odontológico.docx`.
- Casos de uso — `Casos de Uso y descripcion-Clinica Odontologica.pdf`.
- Matriz de Historias de Usuario — `Matriz Historias de Usuario_Odontología MDV2.xlsx` (incluye hoja RNF).
- Diagrama entidad-relación — `Base de Datos/Odontología.png`.
- Wireframes ("DentalCare") — `escritorio-admin.pdf`, `escritorio-asistente.pdf`, `escritorio-doctor.pdf`, y prototipo Figma referenciado en `figma del centro odontologico.txt`.
- Ley 1581 de 2012 (Habeas Data) y Resolución 1995 de 1999 (historia clínica, Colombia).

## 2. Descripción general

### 2.1 Perspectiva del producto
Producto nuevo autocontenido. No reemplaza un sistema previo automatizado (el actual es 100% manual/papel).

### 2.2 Funciones del producto
- Configuración de roles y permisos.
- Gestión de usuarios y acceso.
- Dashboard con indicadores (citas, pacientes, tratamientos por especialista).
- Gestión de pacientes e historias clínicas/odontograma.
- Agendamiento de citas (agendar, solicitar, modificar, cancelar, recordatorios).
- Registro de novedades del personal/operación.
- Catálogo y asignación de tratamientos.
- Planes de pago y estado de cuenta de pacientes.
- Gestión de especialistas (datos, horarios).

### 2.3 Clases de usuario y características

| Clase | Descripción | Frecuencia | Privilegios | Importancia |
|---|---|---|---|---|
| Administrador | Gestiona el consultorio completo | Diaria | Acceso total, incluido dashboard y configuración | Alta |
| Asistente (recepción) | Agenda citas, gestiona pagos pendientes | Diaria | Citas, pacientes, pagos; sin configuración | Alta |
| Doctor/Odontólogo | Atiende pacientes, gestiona su agenda e historia clínica | Diaria | Su agenda, historias clínicas de sus pacientes, tratamientos | Alta |
| Paciente | Solicita citas y consulta su información | Ocasional | Sus citas, su historia (solo lectura), sus pagos | Media |

### 2.4 Ambiente de operación
Aplicación web/móvil responsive, navegadores modernos, escritorio y móvil. Base de datos relacional (17 tablas, ver 2.5).

### 2.5 Restricciones de diseño e implementación
- `RNF-TEC-01` — El modelo de datos debe implementarse sobre el esquema ya definido: `Roles`, `Permisos`, `Roles_por_Permisos`, `Usuarios`, `Pacientes`, `Odontograma`, `Historias_clinicas`, `Citas`, `Consulta`, `personal`, `Especialistas`, `Horarios`, `Servicios`, `Ventas`, `Pacientes_por_Ventas`.
- `RNF-TEC-02` — La interfaz debe respetar el diseño ya validado ("DentalCare": topbar con fecha y notificaciones, sidebar por rol) en los wireframes y el prototipo de Figma referenciado.

### 2.6 Documentación de usuario
Manual de usuario por rol (Administrador, Asistente, Doctor, Paciente) y manual técnico, en PDF/Word.

### 2.7 Supuestos y dependencias
- **Supuesto:** el odontograma se modela por diente y cara (según tabla `Odontograma`); no incluye imágenes radiográficas en v1.0 (solo el registro textual de diagnóstico). Ver TBD-01.
- **Dependencia:** envío de recordatorios de cita depende de un proveedor de correo/SMS transaccional — TBD-02.
- **Supuesto:** los pagos se registran en el sistema pero el procesamiento de tarjeta depende de una pasarela externa a definir — TBD-03.

## 3. Requerimientos de interfaz externa

### 3.1 Interfaces de usuario
Wireframes "DentalCare": topbar (logo, fecha del día, notificaciones, avatar) y sidebar específico por rol (Administrador: Dashboard, Citas, Pacientes, Especialistas, Tratamientos, Historias Clínicas, Pagos, Configuración; Doctor: Dashboard, Agenda, Pacientes, Tratamientos, Reportes, Configuración; Asistente: Inicio con tarjetas KPI y pestañas Próximas Citas/Pagos Pendientes). Vista de Agenda con pestañas Día/Semana/Mes/Lista y selector de odontólogo. Todo formulario valida en línea con mensaje de error junto al campo.

### 3.2 Interfaces de hardware
No aplica: no hay hardware clínico especializado integrado en v1.0 (sin lectores de imágenes ni sensores).

### 3.3 Interfaces de software
- Motor de base de datos relacional (17 tablas).
- Servicio de correo/SMS para confirmaciones y recordatorios (48h antes) — TBD-02.
- Pasarela de pago externa para tarjeta — TBD-03; en su ausencia, solo efectivo/transferencia.

### 3.4 Interfaces de comunicaciones
HTTP/HTTPS con TLS 1.2+ (`RNF-SEG-01`). Notificaciones de citas y pagos por correo electrónico y/o SMS.

## 4. Características del sistema

Códigos: `ROL` Roles, `USR` Usuarios, `ACC` Acceso, `DAS` Dashboard, `PAC` Pacientes, `CIT` Citas, `NOV` Novedades, `TRA` Tratamientos, `PAG` Pagos, `ESP` Especialistas.

### 4.1 Configuración: Roles
**4.1.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-ROL-01 | El sistema debe permitir crear un rol con nombre (VARCHAR 40), descripción y permisos asociados, sin permitir nombres duplicados. | Alta | HU01.1.1, CA_01_1_1_1/2 | Prueba funcional |
| RF-ROL-02 | El sistema debe permitir ver el detalle de un rol, incluyendo módulos y permisos asociados y usuarios asignados. | Media | HU0.1.1.0 | Prueba funcional |
| RF-ROL-03 | El sistema debe permitir editar un rol dentro de una ventana de edición de 20 minutos, mostrando los datos actuales precargados. | Media | HU01.1.2, CA_01_1_2_2 | Prueba funcional |
| RF-ROL-04 | El sistema debe listar los roles en una tabla con nombre, estado y acciones (ver/editar/eliminar), distinguiendo visualmente los roles inactivos. | Media | HU01.1.3 | Prueba funcional |
| RF-ROL-05 | Cuando se intente eliminar un rol con usuarios activos, el sistema debe rechazar la operación. | Alta | HU01.1.4, CA_01_1_4_3 | Prueba funcional |
| RF-ROL-06 | El sistema debe permitir cambiar el estado de un rol (activo/inactivo) con confirmación previa, y al inactivarlo debe inactivar también a los usuarios asociados a ese rol. | Alta | HU01.1.5, CA_01_1_5_3 | Prueba funcional |
| RF-ROL-07 | El sistema debe permitir asignar y visualizar los permisos/módulos asociados a un rol. | Alta | HU01.1.6-9 | Prueba funcional |

### 4.2 Usuarios y Acceso
**4.2.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-USR-01 | El sistema debe permitir crear, listar, buscar, editar, ver detalle y cambiar el estado de un usuario. | Alta | HU02.1.0-13 | Prueba funcional |
| RF-ACC-01 | El sistema debe permitir iniciar sesión, cerrar sesión, recuperar y restablecer contraseña. | Alta | HU02.2.1-4 | Prueba funcional |
| RF-ACC-02 | Cuando las credenciales sean inválidas, el sistema debe rechazar el acceso mostrando un mensaje genérico. | Alta | Buena práctica | Prueba funcional |

### 4.3 Dashboard e Indicadores
**4.3.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-DAS-01 | El sistema debe mostrar al Administrador la cantidad de citas del día, pacientes registrados, mensajes sin leer y pacientes nuevos. | Media | HU_03.1.0, wireframe admin | Prueba funcional |
| RF-DAS-02 | El sistema debe mostrar la cantidad de tratamientos del día por especialista, para identificar los más solicitados. | Media | HU_03.1.0 | Prueba funcional |
| RF-DAS-03 | El sistema debe mostrar gráficas de citas de la semana y de pacientes por mes. | Baja | Wireframe admin | Demostración |

### 4.4 Gestión de Pacientes
**4.4.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-PAC-01 | El sistema debe permitir registrar un paciente con datos personales y médicos básicos. | Alta | HU_07.1.1-16, CU-06 | Prueba funcional |
| RF-PAC-02 | El sistema debe permitir listar, buscar, editar y eliminar un paciente. | Alta | HU_07.1.x, CU-07/08/09 | Prueba funcional |
| RF-PAC-03 | El sistema debe permitir consultar el estado de cuenta (pagos y saldos) de un paciente. | Alta | HU_07.1.x, CU-10 | Prueba funcional |
| RF-PAC-04 | El sistema debe permitir registrar y consultar el odontograma de un paciente por diente y cara. | Alta | Tabla `Odontograma` | Prueba funcional |
| RF-PAC-05 | El sistema debe mantener una historia clínica digital por paciente con historial médico, diagnósticos, tratamientos y radiografías. | Alta | Alcance — Expedientes Clínicos | Prueba funcional |

### 4.5 Gestión de Citas
**4.5.1** Prioridad Alta — es la función central del negocio.

**4.5.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-CIT-01 | El sistema debe permitir a Asistente/Doctor agendar una cita seleccionando paciente, tratamiento, fecha, hora y odontólogo disponible. | Alta | CU-01 | Prueba funcional |
| RF-CIT-02 | Cuando el paciente no esté registrado al agendar, el sistema debe permitir registrarlo sin salir del flujo de agendamiento. | Alta | CU-01, excepción | Prueba funcional |
| RF-CIT-03 | Cuando no exista disponibilidad en la fecha/hora solicitada, el sistema debe sugerir fechas u odontólogos alternativos. | Alta | CU-01, excepción | Prueba funcional |
| RF-CIT-04 | El sistema debe permitir al paciente solicitar una cita indicando tratamiento y preferencia de fecha/horario, quedando en estado "pendiente de confirmación". | Alta | CU-02 | Prueba funcional |
| RF-CIT-05 | El sistema debe permitir modificar y cancelar una cita existente. | Alta | CU-03, CU-04 | Prueba funcional |
| RF-CIT-06 | El sistema debe enviar un recordatorio de cita 48 horas antes de la fecha programada. | Media | CU-05 | Prueba funcional |
| RF-CIT-07 | El sistema debe presentar la agenda por Día, Semana, Mes y Lista, con selector de odontólogo. | Media | Wireframe doctor | Demostración |

### 4.6 Gestión de Novedades
**4.6.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-NOV-01 | El sistema debe permitir registrar una novedad (incidencia de personal u operación) con tipo, descripción, fecha y responsable. | Media | HU_08.1.1-7 | Prueba funcional |
| RF-NOV-02 | El sistema debe permitir listar y consultar el detalle de las novedades registradas. | Media | HU_08.1.x | Prueba funcional |

### 4.7 Gestión de Tratamientos
**4.7.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-TRA-01 | El sistema debe permitir crear un tratamiento con nombre, precio y descripción. | Alta | HU_09.1.1, CA_13_01_01 | Prueba funcional |
| RF-TRA-02 | El sistema debe permitir consultar y actualizar un tratamiento existente. | Media | HU_09.1.x, CU-16/17 | Prueba funcional |
| RF-TRA-03 | El sistema debe permitir asignar uno o más tratamientos a una cita o plan de un paciente. | Alta | CU-15 | Prueba funcional |

### 4.8 Gestión de Pagos
**4.8.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-PAG-01 | El sistema debe permitir crear un plan de pago para un tratamiento, con el detalle de cuotas o abonos. | Alta | HU_12.1.1-17, CU-11 | Prueba funcional |
| RF-PAG-02 | El sistema debe permitir consultar, actualizar y finalizar un plan de pago. | Alta | CU-12/13/14 | Prueba funcional |
| RF-PAG-03 | El sistema debe registrar cada venta/pago asociado a un paciente con método de pago, fecha y monto total. | Alta | Tabla `Ventas`, `Pacientes_por_Ventas` | Prueba funcional |
| RF-PAG-04 | El sistema debe mostrar en el panel de Asistente los pagos pendientes del día. | Media | Wireframe asistente | Demostración |

### 4.9 Gestión de Especialistas
**4.9.3 Requerimientos funcionales**

| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RF-ESP-01 | El sistema debe permitir registrar un especialista/odontólogo con nombre, descripción y datos de contacto. | Alta | HU_13.1.1-13 | Prueba funcional |
| RF-ESP-02 | El sistema debe permitir configurar los horarios de disponibilidad de un especialista por día, hora de inicio y fin. | Alta | Tabla `Horarios` | Prueba funcional |
| RF-ESP-03 | El sistema debe permitir editar y consultar el detalle de un especialista, incluida su agenda. | Media | HU_13.1.x | Prueba funcional |

## 5. Otros requerimientos no funcionales

### 5.1 Rendimiento
| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RNF-REN-01 | El sistema debe responder a cualquier petición del usuario en un máximo de 5 segundos. | Alta | RNF-005 (hoja RNF) | Prueba de carga |

### 5.2 Seguridad física / safety
Un dato clínico incorrecto en la historia (`RF-PAC-04`, `RF-PAC-05`) o en el plan de tratamiento (`RF-TRA-*`) puede derivar en una decisión clínica equivocada; se mitiga con la bitácora de `RNF-SEG-02` y con la trazabilidad de ediciones a la historia clínica exigida en `RN-01`.

### 5.3 Seguridad informática y privacidad
| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RNF-SEG-01 | Las contraseñas de los usuarios deben cifrarse (hash con sal); el algoritmo mínimo aceptable es bcrypt o equivalente. | Alta | RNF-010 (hoja RNF, especifica MD5/SHA1 — superado por buena práctica actual) | Inspección |
| RNF-SEG-02 | El sistema debe generar log de los errores que ocurran en la aplicación, con código de error identificable. | Alta | RNF-007, RNF-008 | Inspección |
| RNF-SEG-03 | El sistema debe enviar notificación de errores a un correo específico del equipo de desarrollo. | Media | RNF-009 | Inspección |
| RNF-PRI-01 | El sistema debe cumplir la Ley 1581 de 2012 y la Resolución 1995 de 1999 en el manejo de historias clínicas y datos personales de pacientes. | Alta | Marco legal colombiano | Inspección |

### 5.4 Atributos de calidad de software
| ID | Requerimiento | Prioridad | Fuente | Verificación |
|---|---|---|---|---|
| RNF-CAL-01 | El sistema debe estar disponible las 24 horas del día. | Alta | RNF-006 | Análisis |
| RNF-USA-01 | El sistema debe contar con diseño responsivo e iconografía amigable, consistente con los colores corporativos del consultorio. | Alta | RNF-001, RNF-002, RNF-003 | Demostración |
| RNF-USA-02 | El sistema debe contar con filtros que permitan consultar la información de las tablas de manera ágil. | Media | RNF-004 | Demostración |

### 5.5 Reglas de negocio
| ID | Regla | RF que la refuerzan |
|---|---|---|
| RN-01 | Solo el Doctor asignado o el Administrador pueden editar la historia clínica de un paciente. | RF-PAC-05 |
| RN-02 | Una cita no puede agendarse si el odontólogo seleccionado no tiene horario configurado en ese rango. | RF-CIT-01, RF-ESP-02 |
| RN-03 | Un rol no puede eliminarse ni inactivarse si tiene usuarios activos asignados, salvo que estos se reasignen o inactiven primero. | RF-ROL-05, RF-ROL-06 |

## 6. Otros requerimientos
- **Base de datos:** 17 tablas ya definidas (2.5); cambios de esquema deben preservar Roles↔Permisos, Usuarios→Roles, Pacientes→Odontograma/Historias_clinicas, Citas→Pacientes/personal, personal→Especialistas/Horarios, Ventas↔Pacientes.
- **Internacionalización:** fuera de alcance (solo español, COP).
- **Migración de datos:** no aplica.

## Apéndice A: Glosario
| Término | Definición |
|---|---|
| Odontograma | Representación gráfica del estado de cada diente de un paciente |
| Otrosí | No aplica a este proyecto |
| Plan de pago | Programación de cuotas o abonos para cubrir el costo de un tratamiento |

## Apéndice B: Modelos de análisis
Modelo entidad-relación de 17 tablas en `Base de Datos/Odontología.png`, resumido en `Centro_Odontologico.md`. Prototipo visual completo en Figma (enlace en `figma del centro odontologico.txt`) y wireframes por rol en PDF.

## Apéndice C: Lista TBD
| ID TBD | Sección | Qué falta | Quién decide | Fecha límite |
|---|---|---|---|---|
| TBD-01 | 2.7 | Confirmar si se requiere adjuntar imágenes de radiografías en v1.0 | Consultorio (cliente) | Antes de diseñar RF-PAC-05 |
| TBD-02 | 2.7, 3.3 | Proveedor de correo/SMS para recordatorios de cita | Administrador del proyecto | Antes de construir RF-CIT-06 |
| TBD-03 | 2.7, 3.3 | Pasarela de pago a contratar (o confirmación de solo efectivo/transferencia) | Consultorio (cliente) | Antes de construir RF-PAG-03 |
