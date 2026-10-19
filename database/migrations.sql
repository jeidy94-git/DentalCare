-- ============================================================================
-- DentalCare · Migración de la base de datos v1 → v2 (Fase B)
-- ----------------------------------------------------------------------------
-- Úsala si YA tienes importada la v1 (dentalcare_bd.sql, raíz del proyecto) y
-- quieres conservar tus datos. Para una instalación nueva usa directamente
-- database/dentalcare_bd_v2.sql (ya trae todo esto aplicado).
--
-- Cada bloque B-xx corresponde a un cambio explicado en database/CAMBIOS.md.
--
-- ANTES DE EJECUTAR:
--   1. Haz una copia:  mysqldump -u root dentalcare_bd > respaldo_v1.sql
--   2. Ejecútala UNA sola vez. Los ALTER TABLE confirman solos (no hay
--      "deshacer"): si algo falla a mitad, restaura la copia y corrige.
--   3. Probada en MariaDB 10.4 (XAMPP) y MySQL 8.0.
-- ============================================================================

USE dentalcare_bd;
SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- B-01 · Contraseñas con hash bcrypt (RNF-SEG-01)
-- La v1 guardaba las contraseñas en TEXTO PLANO dentro de `password_hash`.
-- Se reemplazan por su hash bcrypt (costo 10). Las contraseñas de la demo no
-- cambian: "Admin2026*" sigue entrando, pero ya no se puede leer en la tabla.
-- ----------------------------------------------------------------------------
UPDATE `usuario` SET `password_hash` = '$2a$10$QUOB1imQipamM.ht3H2rV.Jw4ywM8z81947SjJHnnBAsjwtppK80.' WHERE `id_usuario` = 1 ; -- admin@dentalcare.com
UPDATE `usuario` SET `password_hash` = '$2a$10$56a5JL4lJxUT4MpChKL2OOXBt1uU43sfFIBX9GtWjdZ.j1WRMQsQa' WHERE `id_usuario` = 2 ; -- recepcion@dentalcare.com
UPDATE `usuario` SET `password_hash` = '$2a$10$IeEl1lFiJwZO6f58HU2BIO307X0M8ZTP4MFwyRcyfXm08tWf7AHHq' WHERE `id_usuario` = 3 ; -- dr.roberto@dentalcare.com
UPDATE `usuario` SET `password_hash` = '$2a$10$Yq.Uf1ODhBoQhHpY9h1tceo0q7XfPLC8LhevX.0xqi6PiZqIKLKm2' WHERE `id_usuario` = 4 ; -- dra.sofia@dentalcare.com
UPDATE `usuario` SET `password_hash` = '$2a$10$QtNg2xAYH.e0yoANOYuuCemby12w1Y8cE.iG0JnaEMg/W5gT.l3hq' WHERE `id_usuario` = 5 ; -- dr.andres@dentalcare.com
UPDATE `usuario` SET `password_hash` = '$2a$10$xPz3BkvtAFmbNbAY2AYC4OZDAZj.moXO554MN0dmgWwe8wKVyRlkW' WHERE `id_usuario` = 16; -- andres.galvis@gmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$s2F.uVE67wm1px1hBPHWiO1ct2zvW9jbsqbwS7r8mAd31n9WEW5Ty' WHERE `id_usuario` = 17; -- carolina.villa@hotmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$VNidVJWOBpWN3uePOnWZyuTT7h76P5WbUfcNpbScAxdxytW44sS5a' WHERE `id_usuario` = 18; -- mateo.londono@outlook.com
UPDATE `usuario` SET `password_hash` = '$2a$10$vbIbRofWjh.w61raHL/YIOiJf.uyuV5mt1rbh00JJBqNwZhmETTNq' WHERE `id_usuario` = 19; -- daniela.cardona@yahoo.com
UPDATE `usuario` SET `password_hash` = '$2a$10$fGyRyEhhhR3ivbMuzqJQK.EesdVNkDVcVcsU0ft6eC2Uz4B7sgPg6' WHERE `id_usuario` = 20; -- sebastian.marin@gmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$jglMEHmensmnN8uRezwZFOSVz95lZU53In.BJWn90VrhTA3Ngwi4e' WHERE `id_usuario` = 21; -- camila.restrepo@hotmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$wsoknVXCHrPSAK8YILyE1Oj1Q5yRkPjUx7YCrhroqoTTp3USByXGK' WHERE `id_usuario` = 22; -- nicolas.arango@gmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$zH64CdfLvvxnahSOHsjMm.DLHH4AxvGqRW4P7tW9xHppvYy59PTim' WHERE `id_usuario` = 23; -- mariana.zapata@outlook.com
UPDATE `usuario` SET `password_hash` = '$2a$10$epEeDtkA8jz2oCfoOhX3dO/PSaJA72nJ1XHS7xHJ5m51x5VzLykKu' WHERE `id_usuario` = 24; -- alejandro.henao@yahoo.com
UPDATE `usuario` SET `password_hash` = '$2a$10$uWL0D8cP3o7qXN.1MDGTyOC83i91/gSV4ofdMhfVoBIa8LdCzoAAy' WHERE `id_usuario` = 25; -- valeria.duque@gmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$QWSISLJiuoBTwFDtY91qjO37odXNj.mQDYg16bftfx3Bv9D9zDdFq' WHERE `id_usuario` = 26; -- david.buitrago@hotmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$wBRSgIW/Qq1mzxu0dlpZ/eN1ANe.pUj90WIN6G.l0BkCQDKbuEs7a' WHERE `id_usuario` = 27; -- isabella.gomez@outlook.com
UPDATE `usuario` SET `password_hash` = '$2a$10$6isczFfDsUnU64m9LUa5FOpVdockJSB49PgSN2C2g.FTGqzCRvw52' WHERE `id_usuario` = 28; -- samuel.cano@gmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$XbVMCFYikbZxE219rBrvgO68aJgoBydN9FWhqK8Z5JdZ6sTRKMpuq' WHERE `id_usuario` = 29; -- gabriela.echeverri@yahoo.com
UPDATE `usuario` SET `password_hash` = '$2a$10$c4kn5Nb5EGx4gDi8lF9nhOjntZYDhPcfnVKkpVP898QXS9U5D9Ip.' WHERE `id_usuario` = 30; -- tomas.velez@hotmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$EOE.PCNENvC9tNc5cqMwyOvupR.FBew/JOUTLLvaXMwJ3Tw9m6byC' WHERE `id_usuario` = 31; -- luciana.mejia@gmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$QwyZyidUfw1pMAwI94H5RO6mW6wFN4ISMiOKu3R3LsodflFuN9z4u' WHERE `id_usuario` = 32; -- santiago.bedoya@outlook.com
UPDATE `usuario` SET `password_hash` = '$2a$10$EDRPJEfA1QWF3XKpJCWNXev2GjpkaDfCRjimxHMxnrUcZxzdlmF/y' WHERE `id_usuario` = 33; -- sofia.correa@yahoo.com
UPDATE `usuario` SET `password_hash` = '$2a$10$dZpxbepP/6qZ6a19A8HxPuS.ZhNJHsJCnaLgVZmymWK.KNjIbRotq' WHERE `id_usuario` = 34; -- juan.pablo.rios@gmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$J3Kd1qwMIwGCsd7ZDslGyejhcZOTFA48J8775jRHQ9Sl8tuubuveO' WHERE `id_usuario` = 35; -- salome.vargas@hotmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$P6WJgupzLn1mY8iLHtU4kOyJ0w8HpZlC9HkbCIDumRNOpv0rd7j.K' WHERE `id_usuario` = 36; -- emilio.munoz@outlook.com
UPDATE `usuario` SET `password_hash` = '$2a$10$sBMfsmrhj.7qXZsgtZbqreuwTfiCcJ9GXnA2yLtp3pQfdQzcu6ZE.' WHERE `id_usuario` = 37; -- renata.florez@gmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$l/BVzyMXeaD/OUujkoI9WukWSHPhfFIctd/LTkVhezKXyu0DfYGJq' WHERE `id_usuario` = 38; -- lucas.agudelo@yahoo.com
UPDATE `usuario` SET `password_hash` = '$2a$10$oEKHYvFFnkeefN09HW3uMOXC9yMYXmt8mWmJT8QOFYELFD/iJeZye' WHERE `id_usuario` = 39; -- antonia.giraldo@hotmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$u96EmltnGtjvwIEjYifPZ.8alz6zsAklxsFgkqGFiFIcSpSGOEHyO' WHERE `id_usuario` = 40; -- pablo.saldarriaga@gmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$qiu/76RojjJvzRDy9pJYfugyKCapGMS5p4Vo00C7ao.u1.ePRq1EO' WHERE `id_usuario` = 41; -- manuela.castrillon@outlook.com
UPDATE `usuario` SET `password_hash` = '$2a$10$PMFrs9YK5hD/v3NBlpBHN.waFgNr2ZTlmg75lpXTEjZGjZJWJOIeC' WHERE `id_usuario` = 42; -- joaquin.posada@yahoo.com
UPDATE `usuario` SET `password_hash` = '$2a$10$aPMmmD9tvkyWBNqijyiMheL4PDx.EPIWxAz3mYJfCbfag.GgQ4Sse' WHERE `id_usuario` = 43; -- victoria.hoyos@gmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$lAC68idLSdCkvNu2uHb.AOR1vFYPRIeyElBGb8Cu9jWqECdsxeY4O' WHERE `id_usuario` = 44; -- martin.tobon@hotmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$ArhGzm7IsxFyYN/Lr/sXN.7QtSU6/LMMnNn.kXQ6jdw6EYVRETzQO' WHERE `id_usuario` = 45; -- alicia.quintero@outlook.com
UPDATE `usuario` SET `password_hash` = '$2a$10$IyNtRdoo05fZTV8hZB4TJuASTslqeKpakPQqX/JRMOWqAH/AppoOS' WHERE `id_usuario` = 46; -- emmanuel.valencia@gmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$YlYodHUsWx3k6JxYxFC.MO9QR81MM9N/dfTya9hyK0qnsu7SD4tEy' WHERE `id_usuario` = 47; -- guadalupe.usme@yahoo.com
UPDATE `usuario` SET `password_hash` = '$2a$10$vEfL2ct47abUESFz6I2kEOK.k/YnnUvb8f0vKoc4cLHtmWZDuQgyG' WHERE `id_usuario` = 48; -- simon.rendon@hotmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$Zfc3x7EfXyge1sOGK5CecOF7/RD0yIZxzh0GS6qBm4ljgXhl6y/hy' WHERE `id_usuario` = 49; -- milena.villegas@gmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$Qo.CxOJKMu.FCXfyGFxQueC9ssYHqIUh5eSQQzRSRaIZSpxJrDaS2' WHERE `id_usuario` = 50; -- rodrigo.palacio@outlook.com
UPDATE `usuario` SET `password_hash` = '$2a$10$jSMHCwzNtquSOXIQJR6W9eNi27By3e1ggywextNTLBnfp8VbgPyYi' WHERE `id_usuario` = 51; -- elena.tamayo@yahoo.com
UPDATE `usuario` SET `password_hash` = '$2a$10$cczUA0futSN6.yeREXfLKeShTO7nmj.3jIcBvubxfFaNApFd77Ks2' WHERE `id_usuario` = 52; -- gabriel.monsalve@gmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$iNPUDZbA39iq7t7cUEjHSe8pitroxVW/q5bWVRjTVeRNAgj6Fu1Ky' WHERE `id_usuario` = 53; -- cecilia.botero@hotmail.com
UPDATE `usuario` SET `password_hash` = '$2a$10$KlDtl.yTDYTBVW3ibdekuuL82XbHYU0HucyxR7fH5meDkVAimbZFO' WHERE `id_usuario` = 54; -- felipe.alvarez@outlook.com
UPDATE `usuario` SET `password_hash` = '$2a$10$sjelq.ZiIP756rluYQh7OeLJIzOBe9TXGbM8TIK42XO7ACOmJ6SzC' WHERE `id_usuario` = 55; -- andrea.osorio@gmail.com

-- La propia base rechaza cualquier valor que no tenga el formato bcrypt
-- ($2a$/$2b$/$2y$ + costo de 2 dígitos + 53 caracteres = 60 en total).
-- Si un error futuro intentara guardar una contraseña en claro, el INSERT falla.
ALTER TABLE `usuario`
  MODIFY `estado` varchar(20) NOT NULL DEFAULT 'ACTIVO',
  ADD CONSTRAINT `chk_usuario_password_bcrypt`
    CHECK (`password_hash` REGEXP '^[$]2[aby][$][0-9]{2}[$][./A-Za-z0-9]{53}$'),
  ADD CONSTRAINT `chk_usuario_estado` CHECK (`estado` IN ('ACTIVO', 'INACTIVO'));

-- ----------------------------------------------------------------------------
-- B-02 · Estado del rol (RF-ROL-06, RN-03)
-- El SRS pide activar/inactivar roles, pero la tabla no tenía dónde guardarlo.
-- ----------------------------------------------------------------------------
ALTER TABLE `rol`
  ADD COLUMN `estado` varchar(20) NOT NULL DEFAULT 'ACTIVO' AFTER `descripcion`,
  ADD CONSTRAINT `chk_rol_estado` CHECK (`estado` IN ('ACTIVO', 'INACTIVO'));

-- ----------------------------------------------------------------------------
-- B-03 · Permisos que faltaban y matriz rol_permiso corregida (RN-01, RF-ROL-07)
-- En la v1 la RECEPCIONISTA tenía EDITAR_HISTORIA_CLINICA (contra RN-01) y el
-- ESPECIALISTA tenía REGISTRAR_PAGO pero no VER_HISTORIA_CLINICA.
-- ----------------------------------------------------------------------------
INSERT INTO `permiso` (`id_permiso`, `nombre_permiso`, `descripcion`) VALUES
(7, 'GESTIONAR_PACIENTES', 'Registrar y actualizar pacientes'),
(8, 'GESTIONAR_SERVICIOS', 'Crear, editar e inactivar tratamientos del catálogo'),
(9, 'GESTIONAR_ESPECIALISTAS', 'Administrar odontólogos y sus horarios'),
(10, 'REGISTRAR_NOVEDAD', 'Reportar novedades operativas'),
(11, 'GESTIONAR_NOVEDADES', 'Consultar y administrar todas las novedades');

DELETE FROM `rol_permiso`;

-- Se asigna por NOMBRE (no por id) para que se lea como la tabla de CAMBIOS.md.
INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`)
SELECT r.`id_rol`, p.`id_permiso`
FROM `rol` r
JOIN `permiso` p ON
     r.`nombre_rol` = 'ADMINISTRADOR'
  OR (r.`nombre_rol` = 'RECEPCIONISTA' AND p.`nombre_permiso` IN
       ('CREAR_CITA', 'CANCELAR_CITA', 'GESTIONAR_PACIENTES', 'REGISTRAR_PAGO', 'REGISTRAR_NOVEDAD'))
  OR (r.`nombre_rol` = 'ESPECIALISTA' AND p.`nombre_permiso` IN
       ('CREAR_CITA', 'CANCELAR_CITA', 'VER_HISTORIA_CLINICA', 'EDITAR_HISTORIA_CLINICA', 'REGISTRAR_NOVEDAD'))
  OR (r.`nombre_rol` = 'PACIENTE' AND p.`nombre_permiso` IN
       ('CREAR_CITA', 'CANCELAR_CITA'));

-- ----------------------------------------------------------------------------
-- B-04 · Ubicación del paciente (DIVIPOLA, datos.gov.co)
-- Opcionales: los pacientes existentes quedan con NULL.
-- ----------------------------------------------------------------------------
ALTER TABLE `paciente`
  ADD COLUMN `departamento` varchar(60) DEFAULT NULL AFTER `email`,
  ADD COLUMN `municipio` varchar(80) DEFAULT NULL AFTER `departamento`;

-- ----------------------------------------------------------------------------
-- B-05 · Estado de la venta calculado por la base (no escrito a mano)
-- La venta #2 decía PAGADO con 200.000 de saldo. Igual que `saldo_pendiente`,
-- el estado pasa a ser una columna GENERADA: ya no puede contradecir los montos.
-- ----------------------------------------------------------------------------
ALTER TABLE `venta` DROP COLUMN `estado_venta`;

ALTER TABLE `venta`
  ADD COLUMN `estado_venta` varchar(20)
    GENERATED ALWAYS AS (CASE WHEN `monto_pagado` >= `monto_total` THEN 'PAGADO' ELSE 'PENDIENTE' END) STORED
    AFTER `numero_cuotas`,
  MODIFY `monto_pagado` decimal(12,2) NOT NULL DEFAULT 0.00,
  MODIFY `numero_cuotas` int(11) NOT NULL DEFAULT 1,
  ADD CONSTRAINT `chk_venta_montos` CHECK (`monto_total` > 0 AND `monto_pagado` >= 0 AND `monto_pagado` <= `monto_total`),
  ADD CONSTRAINT `chk_venta_modalidad` CHECK (`modalidad_pago` IN ('CONTADO', 'CREDITO')),
  ADD CONSTRAINT `chk_venta_cuotas` CHECK (`numero_cuotas` >= 1);

ALTER TABLE `pago_venta`
  ADD CONSTRAINT `chk_pago_monto` CHECK (`monto_abonado` > 0);

-- ----------------------------------------------------------------------------
-- B-06 · Se elimina `paciente_venta` (relación duplicada)
-- Sus 40 filas repetían exactamente `venta.id_paciente`. Nadie la mantenía al
-- crear ventas nuevas, así que iba a quedar desactualizada.
-- ----------------------------------------------------------------------------
DROP TABLE `paciente_venta`;

-- ----------------------------------------------------------------------------
-- B-07 · Tratamiento de la cita (RF-CIT-01) y estados válidos (HU-06)
-- ----------------------------------------------------------------------------
ALTER TABLE `cita`
  ADD COLUMN `id_servicio` int(11) DEFAULT NULL AFTER `id_especialista`;

UPDATE `cita` SET `id_servicio` = CASE `id_cita` WHEN 3 THEN 3 WHEN 4 THEN 4 ELSE 1 END;

ALTER TABLE `cita`
  MODIFY `id_servicio` int(11) NOT NULL,
  MODIFY `estado_cita` varchar(30) NOT NULL DEFAULT 'PROGRAMADA',
  ADD KEY `fk_cita_servicio` (`id_servicio`),
  ADD CONSTRAINT `fk_cita_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`) ON UPDATE CASCADE,
  ADD CONSTRAINT `chk_cita_estado`
    CHECK (`estado_cita` IN ('PENDIENTE_CONFIRMACION', 'PROGRAMADA', 'COMPLETADA', 'CANCELADA'));

ALTER TABLE `servicio`
  MODIFY `estado` varchar(20) NOT NULL DEFAULT 'ACTIVO',
  ADD CONSTRAINT `chk_servicio_estado` CHECK (`estado` IN ('ACTIVO', 'INACTIVO')),
  ADD CONSTRAINT `chk_servicio_precio` CHECK (`precio_base` >= 0);

-- ----------------------------------------------------------------------------
-- B-08 · Tokens de recuperación de contraseña (HU-01 / login)
-- Se guarda el HASH SHA-256 del token, nunca el token: quien lea la tabla no
-- puede usar los enlaces. Un token vence (`expira_en`) y sirve una sola vez.
-- ----------------------------------------------------------------------------
CREATE TABLE `password_reset` (
  `id_reset` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expira_en` datetime NOT NULL,
  `usado_en` datetime DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_reset`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `fk_reset_usuario` (`id_usuario`),
  CONSTRAINT `fk_reset_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- B-09 · Horarios: más días de atención (RN-02)
-- La v1 traía un solo día por odontólogo: casi no se podían agendar citas.
-- Son los mismos horarios que ya usa el frontend (data/mock/especialistas.js).
-- ----------------------------------------------------------------------------
INSERT INTO `horario` (`id_horario`, `id_especialista`, `dia_semana`, `hora_inicio`, `hora_fin`) VALUES
(5, 1, 'Martes', '08:00:00', '12:00:00'),
(6, 1, 'Martes', '14:00:00', '18:00:00'),
(7, 1, 'Miércoles', '08:00:00', '12:00:00'),
(8, 1, 'Miércoles', '14:00:00', '18:00:00'),
(9, 1, 'Jueves', '08:00:00', '12:00:00'),
(10, 1, 'Jueves', '14:00:00', '18:00:00'),
(11, 1, 'Viernes', '08:00:00', '12:00:00'),
(12, 1, 'Viernes', '14:00:00', '18:00:00'),
(13, 2, 'Jueves', '08:00:00', '14:00:00'),
(14, 2, 'Sábado', '08:00:00', '12:00:00'),
(15, 3, 'Viernes', '10:00:00', '16:00:00');

ALTER TABLE `horario`
  ADD CONSTRAINT `chk_horario_rango` CHECK (`hora_fin` > `hora_inicio`),
  ADD CONSTRAINT `chk_horario_dia`
    CHECK (`dia_semana` IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'));

-- ----------------------------------------------------------------------------
-- B-10 · Otros valores cerrados del paciente
-- ----------------------------------------------------------------------------
ALTER TABLE `paciente`
  ADD CONSTRAINT `chk_paciente_genero` CHECK (`genero` IN ('MASCULINO', 'FEMENINO', 'OTRO')),
  ADD CONSTRAINT `chk_paciente_tipo_doc` CHECK (`tipo_documento` IN ('CC', 'TI', 'CE', 'PA'));
