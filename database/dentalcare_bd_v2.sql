-- ============================================================================
-- DentalCare · Base de datos v2 (Fase B) · instalación completa
-- ----------------------------------------------------------------------------
-- Estructura + datos de demostración, con los cambios B-01…B-11 ya aplicados
-- (ver database/CAMBIOS.md). Generado el 2026-10-19 a partir de la v1 +
-- database/migrations.sql, y verificado en MariaDB 10.4 (XAMPP) y MySQL 8.0.
-- B-11 (venta.id_servicio) se agregó el 2026-10-25 y se verificó igual.
--
-- CÓMO IMPORTARLO
--   Consola:     mysql -u root < database/dentalcare_bd_v2.sql
--   phpMyAdmin:  pestaña "Importar" (sin elegir base: el script la crea).
--
-- La base debe estar VACÍA o no existir. A propósito NO trae "DROP TABLE":
-- si ya tienes la v1 con datos, el script se detiene con "Table already
-- exists" en vez de borrarlos. Para conservar tus datos usa migrations.sql.
--
-- Usuarios de la demo: las contraseñas son las mismas de la v1
-- (p. ej. admin@dentalcare.com / Admin2026*), ahora guardadas con bcrypt.
--
-- Las consultas de práctica (CRUD) que estaban al final de la v1 NO van aquí:
-- un script de instalación solo debe crear la base (ver CAMBIOS.md, B-00).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `dentalcare_bd`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `dentalcare_bd`;
SET NAMES utf8mb4;

/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cita` (
  `id_cita` int(11) NOT NULL AUTO_INCREMENT,
  `id_paciente` int(11) NOT NULL,
  `id_especialista` int(11) NOT NULL,
  `id_servicio` int(11) NOT NULL,
  `fecha_hora` datetime NOT NULL,
  `motivo` varchar(255) NOT NULL,
  `estado_cita` varchar(30) NOT NULL DEFAULT 'PROGRAMADA',
  `recordatorio_enviado` tinyint(1) DEFAULT 0,
  `mensaje_alerta` varchar(255) DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_cita`),
  KEY `fk_cita_paciente` (`id_paciente`),
  KEY `fk_cita_especialista` (`id_especialista`),
  KEY `fk_cita_servicio` (`id_servicio`),
  CONSTRAINT `fk_cita_especialista` FOREIGN KEY (`id_especialista`) REFERENCES `especialista` (`id_especialista`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cita_paciente` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cita_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`) ON UPDATE CASCADE,
  CONSTRAINT `chk_cita_estado` CHECK (`estado_cita` in ('PENDIENTE_CONFIRMACION','PROGRAMADA','COMPLETADA','CANCELADA'))
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `cita` (`id_cita`, `id_paciente`, `id_especialista`, `id_servicio`, `fecha_hora`, `motivo`, `estado_cita`, `recordatorio_enviado`, `mensaje_alerta`, `fecha_creacion`) VALUES
(1,11,1,1,'2026-09-01 08:00:00','Valoración general y limpieza','PROGRAMADA',0,NULL,'2026-09-11 18:02:49'),
(2,12,2,1,'2026-09-02 08:00:00','Control mensual de ortodoncia','COMPLETADA',0,NULL,'2026-09-11 18:02:49'),
(3,13,1,3,'2026-09-03 08:00:00','Dolor agudo en pieza molar','PROGRAMADA',0,NULL,'2026-09-11 18:02:49'),
(4,14,3,4,'2026-09-04 08:00:00','Evaluación para tratamiento de conducto','COMPLETADA',0,NULL,'2026-09-11 18:02:49'),
(5,15,1,1,'2026-09-05 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(6,16,2,1,'2026-09-06 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(7,17,3,1,'2026-09-07 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(8,18,1,1,'2026-09-08 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(9,19,2,1,'2026-09-09 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(10,20,3,1,'2026-09-10 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(11,21,1,1,'2026-09-11 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(12,22,2,1,'2026-09-12 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(13,23,3,1,'2026-09-13 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(14,24,1,1,'2026-09-14 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(15,25,2,1,'2026-09-15 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(16,26,3,1,'2026-09-16 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(17,27,1,1,'2026-09-17 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(18,28,2,1,'2026-09-18 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(19,29,3,1,'2026-09-19 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(20,30,1,1,'2026-09-20 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(21,31,2,1,'2026-09-21 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(22,32,3,1,'2026-09-22 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(23,33,1,1,'2026-09-23 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(24,34,2,1,'2026-09-24 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(25,35,3,1,'2026-09-25 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(26,36,1,1,'2026-09-26 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(27,37,2,1,'2026-09-27 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(28,38,3,1,'2026-09-28 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(29,39,1,1,'2026-09-29 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(30,40,2,1,'2026-09-30 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(31,41,3,1,'2026-10-01 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(32,42,1,1,'2026-10-02 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(33,43,2,1,'2026-10-03 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(34,44,3,1,'2026-10-04 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(35,45,1,1,'2026-10-05 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(36,46,2,1,'2026-10-06 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(37,47,3,1,'2026-10-07 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(38,48,1,1,'2026-10-08 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42'),
(39,49,2,1,'2026-10-09 08:00:00','Valoración y control odontológico','PROGRAMADA',0,NULL,'2026-09-11 18:22:42'),
(40,50,3,1,'2026-10-10 08:00:00','Valoración y control odontológico','COMPLETADA',0,NULL,'2026-09-11 18:22:42');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `consulta` (
  `id_consulta` int(11) NOT NULL AUTO_INCREMENT,
  `id_cita` int(11) NOT NULL,
  `motivo_consulta` varchar(255) NOT NULL,
  `diagnostico` text NOT NULL,
  `procedimiento_realizado` text NOT NULL,
  `prescripcion_medica` text DEFAULT NULL,
  `fecha_consulta` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_consulta`),
  UNIQUE KEY `id_cita` (`id_cita`),
  CONSTRAINT `fk_consulta_cita` FOREIGN KEY (`id_cita`) REFERENCES `cita` (`id_cita`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `consulta` (`id_consulta`, `id_cita`, `motivo_consulta`, `diagnostico`, `procedimiento_realizado`, `prescripcion_medica`, `fecha_consulta`) VALUES
(1,1,'Revisión periódica','Higiene adecuada, ligera acumulación de sarro','Profilaxis y detartraje ultrasónico','Usar enjuague bucal sin alcohol','2026-09-11 18:02:54'),
(2,3,'Dolor al masticar en cuadrante inferior','Salud oral en aceptable estado / Caries leve en revisión','Remoción de caries y obturación en resina fotocurable','Ibuprofeno 400mg cada 8 horas por 3 días','2026-09-11 18:02:54'),
(4,4,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(6,6,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(8,8,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(10,10,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(12,12,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(14,14,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(16,16,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(18,18,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(20,20,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(22,22,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(24,24,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(26,26,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(28,28,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(30,30,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(32,32,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(34,34,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(36,36,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(38,38,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50'),
(40,40,'Control odontológico de rutina','Salud oral en aceptable estado / Caries leve en revisión','Limpieza profiláctica y aplicación de flúor','Enjuague bucal diario sin alcohol','2026-09-11 18:22:50');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `diente` (
  `id_diente` int(11) NOT NULL,
  `numero_fdi` int(11) NOT NULL,
  `nombre_diente` varchar(50) NOT NULL,
  `cuadrante` int(11) NOT NULL,
  `tipo_denticion` varchar(20) NOT NULL,
  `imagen_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_diente`),
  UNIQUE KEY `numero_fdi` (`numero_fdi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `diente` (`id_diente`, `numero_fdi`, `nombre_diente`, `cuadrante`, `tipo_denticion`, `imagen_url`) VALUES
(11,11,'Incisivo Central Superior Derecho',1,'PERMANENTE',NULL),
(12,12,'Incisivo Lateral Superior Derecho',1,'PERMANENTE',NULL),
(16,16,'Primer Molar Superior Derecho',1,'PERMANENTE',NULL),
(21,21,'Incisivo Central Superior Izquierdo',2,'PERMANENTE',NULL),
(36,36,'Primer Molar Inferior Izquierdo',3,'PERMANENTE',NULL),
(46,46,'Primer Molar Inferior Derecho',4,'PERMANENTE',NULL);
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `especialista` (
  `id_especialista` int(11) NOT NULL AUTO_INCREMENT,
  `id_personal` int(11) NOT NULL,
  `especialidad` varchar(100) NOT NULL,
  `registro_medico` varchar(50) NOT NULL,
  PRIMARY KEY (`id_especialista`),
  UNIQUE KEY `id_personal` (`id_personal`),
  UNIQUE KEY `registro_medico` (`registro_medico`),
  CONSTRAINT `fk_especialista_personal` FOREIGN KEY (`id_personal`) REFERENCES `personal` (`id_personal`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `especialista` (`id_especialista`, `id_personal`, `especialidad`, `registro_medico`) VALUES
(1,3,'Odontología General','RM-1001'),
(2,4,'Ortodoncia','RM-1002'),
(3,5,'Endodoncia','RM-1003');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `historia_clinica` (
  `id_historia` int(11) NOT NULL AUTO_INCREMENT,
  `id_paciente` int(11) NOT NULL,
  `antecedentes_medicos` text DEFAULT NULL,
  `alergias` text DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_apertura` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_historia`),
  UNIQUE KEY `id_paciente` (`id_paciente`),
  CONSTRAINT `fk_historia_paciente` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `historia_clinica` (`id_historia`, `id_paciente`, `antecedentes_medicos`, `alergias`, `observaciones`, `fecha_apertura`) VALUES
(1,11,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(2,12,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(3,13,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(4,14,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(5,15,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(6,16,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(7,17,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(8,18,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(9,19,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(10,20,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(11,21,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(12,22,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(13,23,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(14,24,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(15,25,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(16,26,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(17,27,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(18,28,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(19,29,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(20,30,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(21,31,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(22,32,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(23,33,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(24,34,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(25,35,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(26,36,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(27,37,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(28,38,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(29,39,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(30,40,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(31,41,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(32,42,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(33,43,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(34,44,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(35,45,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(36,46,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(37,47,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(38,48,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(39,49,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43'),
(40,50,'Sin antecedentes médicos de importancia','Ninguna alergia reportada','Historia clínica aperturada en sistema','2026-09-11 18:02:43');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `horario` (
  `id_horario` int(11) NOT NULL AUTO_INCREMENT,
  `id_especialista` int(11) NOT NULL,
  `dia_semana` varchar(15) NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  PRIMARY KEY (`id_horario`),
  KEY `fk_horario_especialista` (`id_especialista`),
  CONSTRAINT `fk_horario_especialista` FOREIGN KEY (`id_especialista`) REFERENCES `especialista` (`id_especialista`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_horario_rango` CHECK (`hora_fin` > `hora_inicio`),
  CONSTRAINT `chk_horario_dia` CHECK (`dia_semana` in ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'))
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `horario` (`id_horario`, `id_especialista`, `dia_semana`, `hora_inicio`, `hora_fin`) VALUES
(1,1,'Lunes','08:00:00','12:00:00'),
(2,1,'Lunes','14:00:00','18:00:00'),
(3,2,'Martes','08:00:00','14:00:00'),
(4,3,'Miércoles','10:00:00','16:00:00'),
(5,1,'Martes','08:00:00','12:00:00'),
(6,1,'Martes','14:00:00','18:00:00'),
(7,1,'Miércoles','08:00:00','12:00:00'),
(8,1,'Miércoles','14:00:00','18:00:00'),
(9,1,'Jueves','08:00:00','12:00:00'),
(10,1,'Jueves','14:00:00','18:00:00'),
(11,1,'Viernes','08:00:00','12:00:00'),
(12,1,'Viernes','14:00:00','18:00:00'),
(13,2,'Jueves','08:00:00','14:00:00'),
(14,2,'Sábado','08:00:00','12:00:00'),
(15,3,'Viernes','10:00:00','16:00:00');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `log_auditoria` (
  `id_log` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) DEFAULT NULL,
  `accion` varchar(100) NOT NULL,
  `tabla_afectada` varchar(50) NOT NULL,
  `detalles` text DEFAULT NULL,
  `fecha_evento` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_log`),
  KEY `fk_log_usuario` (`id_usuario`),
  CONSTRAINT `fk_log_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `log_auditoria` (`id_log`, `id_usuario`, `accion`, `tabla_afectada`, `detalles`, `fecha_evento`) VALUES
(1,16,'INSERT','CITA','Registro de cita ID 1 exitoso','2026-09-11 17:47:33'),
(2,1,'LOGIN_EXITOSO','USUARIO','Inicio de sesión del usuario administrador en el sistema','2026-09-11 18:00:00'),
(3,2,'INSERT','PACIENTE','Registro de nuevo paciente en la plataforma','2026-09-11 18:15:30'),
(4,3,'UPDATE','HISTORIA_CLINICA','Actualización de antecedentes médicos del paciente ID 5','2026-09-11 18:30:10'),
(5,2,'ALERTA_CITA_CANCELADA','CITA','¡ALERTA! Cita ID 2 del paciente ID 12 fue CANCELADA','2026-09-11 19:05:00'),
(6,4,'INSERT','CONSULTA','Creación de registro de atención odontológica ID 10','2026-09-11 19:20:45'),
(7,5,'INSERT','NOVEDAD_OPERATIVA','Registro de reporte por falla técnica en lámpara de fotocurado','2026-09-11 19:40:00'),
(8,1,'UPDATE','USUARIO','Modificación de permisos para el rol Recepcionista','2026-09-11 20:00:15'),
(9,3,'INSERT','ODONTOGRAMA','Registro de hallazgos en pieza dental 11','2026-09-11 20:15:00'),
(10,2,'INSERT','PAGO_VENTA','Registro de abono a venta ID 5 por $150.000 COP','2026-09-11 20:30:22');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `metodo_pago` (
  `id_metodo` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_metodo` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_metodo`),
  UNIQUE KEY `nombre_metodo` (`nombre_metodo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `metodo_pago` (`id_metodo`, `nombre_metodo`, `descripcion`) VALUES
(1,'EFECTIVO','Pago presencial en caja'),
(2,'TARJETA_CREDITO','Pago con tarjeta de crédito'),
(3,'TARJETA_DEBITO','Pago con tarjeta débito'),
(4,'TRANSFERENCIA','Transferencia bancaria / Nequi / Daviplata');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `novedad_operativa` (
  `id_novedad` int(11) NOT NULL AUTO_INCREMENT,
  `id_personal` int(11) NOT NULL,
  `tipo_novedad` varchar(50) NOT NULL,
  `descripcion` text NOT NULL,
  `fecha_registro` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_novedad`),
  KEY `fk_novedad_personal` (`id_personal`),
  CONSTRAINT `fk_novedad_personal` FOREIGN KEY (`id_personal`) REFERENCES `personal` (`id_personal`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `novedad_operativa` (`id_novedad`, `id_personal`, `tipo_novedad`, `descripcion`, `fecha_registro`) VALUES
(1,3,'MANTENIMIENTO','Unidad odontológica 2 requiere calibración de pieza de mano','2026-09-11 17:51:14'),
(2,3,'MANTENIMIENTO','Solicitud de reemplazo de lámpara de fotocurado en el Consultorio 1.','2026-09-11 18:33:55'),
(3,4,'INCIDENCIA_TECNICA','Falla de conexión en la pieza de mano de alta velocidad durante procedimiento.','2026-09-11 18:33:55'),
(4,2,'INVENTARIO','Notificación de stock bajo en resinas compuestas A2 y anestesia local.','2026-09-11 18:33:55'),
(5,5,'SOPORTE_SISTEMA','Inconveniente al cargar radiografía digital en el módulo del odontograma.','2026-09-11 18:33:55'),
(6,1,'MANTENIMIENTO','Programación de mantenimiento preventivo general para el compresor de aire principal.','2026-09-11 18:33:55'),
(7,3,'INCIDENCIA_TECNICA','Descalibración en la silla odontológica del Consultorio 2.','2026-09-11 18:33:55'),
(8,2,'ADMINISTRATIVA','Reporte de ausentismo justificado por incapacidad médica de la auxiliar odontológica.','2026-09-11 18:33:55'),
(9,4,'INVENTARIO','Recepcionados 50 kits de bioseguridad y guantes de nitrilo talle M.','2026-09-11 18:33:55'),
(10,5,'MANTENIMIENTO','Fuga de agua detectada en la escupidera de la unidad 3.','2026-09-11 18:33:55');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `odontograma` (
  `id_odontograma` int(11) NOT NULL AUTO_INCREMENT,
  `id_historia` int(11) NOT NULL,
  `id_diente` int(11) NOT NULL,
  `cara_diente` varchar(20) NOT NULL,
  `diagnostico` varchar(100) NOT NULL,
  `estado_tratamiento` varchar(50) DEFAULT 'PENDIENTE',
  `fecha_registro` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_odontograma`),
  KEY `fk_odontograma_historia` (`id_historia`),
  KEY `fk_odontograma_diente` (`id_diente`),
  CONSTRAINT `fk_odontograma_diente` FOREIGN KEY (`id_diente`) REFERENCES `diente` (`id_diente`) ON UPDATE CASCADE,
  CONSTRAINT `fk_odontograma_historia` FOREIGN KEY (`id_historia`) REFERENCES `historia_clinica` (`id_historia`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `odontograma` (`id_odontograma`, `id_historia`, `id_diente`, `cara_diente`, `diagnostico`, `estado_tratamiento`, `fecha_registro`) VALUES
(1,1,36,'OCLUSAL','Caries restaurada con resina','REALIZADO','2026-09-11 18:02:58'),
(2,1,16,'VESTIBULAR','Caries incipiente','PENDIENTE','2026-09-11 18:02:58'),
(3,2,11,'INCISAL','Desgaste leve por bruxismo','EN_OBSERVACION','2026-09-11 18:02:58'),
(4,3,21,'MESIAL','Fractura de esmalte por traumatismo','PENDIENTE','2026-09-12 09:15:00'),
(5,4,46,'OCLUSAL','Tratamiento de conducto requerido','EN_PROCESO','2026-09-12 10:30:00'),
(6,5,12,'VESTIBULAR','Mancha blanca por desmineralización','EN_OBSERVACION','2026-09-12 11:20:00'),
(7,6,16,'DISTAL','Obturación en amalgama desadaptada','REEMPLAZO_REQUERIDO','2026-09-12 14:00:00'),
(8,7,36,'LINGUAL','Cálculo dental subgingival severo','REALIZADO','2026-09-13 08:45:00'),
(9,8,21,'INCISAL','Pigmentación por consumo de café','REALIZADO','2026-09-13 10:10:00'),
(10,9,46,'OCLUSAL','Sellante de fosas y fisuras aplicado','REALIZADO','2026-09-13 11:50:00');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `paciente` (
  `id_paciente` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) DEFAULT NULL,
  `tipo_documento` varchar(10) NOT NULL,
  `numero_documento` varchar(20) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `genero` varchar(15) NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `departamento` varchar(60) DEFAULT NULL,
  `municipio` varchar(80) DEFAULT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  `eps_aseguradora` varchar(100) DEFAULT NULL,
  `fecha_registro` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_paciente`),
  UNIQUE KEY `numero_documento` (`numero_documento`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `fk_paciente_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_paciente_genero` CHECK (`genero` in ('MASCULINO','FEMENINO','OTRO')),
  CONSTRAINT `chk_paciente_tipo_doc` CHECK (`tipo_documento` in ('CC','TI','CE','PA'))
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `paciente` (`id_paciente`, `id_usuario`, `tipo_documento`, `numero_documento`, `nombres`, `apellidos`, `fecha_nacimiento`, `genero`, `telefono`, `email`, `departamento`, `municipio`, `direccion`, `eps_aseguradora`, `fecha_registro`) VALUES
(11,16,'CC','1036000101','Andrés','Galvis','1990-02-14','MASCULINO','3001110001','andres.galvis@gmail.com',NULL,NULL,'Calle 10 # 43-12','Sura','2026-09-11 17:40:46'),
(12,17,'CC','1036000102','Carolina','Villa','1993-05-20','FEMENINO','3001110002','carolina.villa@hotmail.com',NULL,NULL,'Carrera 70 # 32-45','Sura','2026-09-11 17:40:46'),
(13,18,'CC','1036000103','Mateo','Londoño','1988-11-03','MASCULINO','3001110003','mateo.londono@outlook.com',NULL,NULL,'Calle 50 # 65-10','Sanitas','2026-09-11 17:40:46'),
(14,19,'CC','1036000104','Daniela','Cardona','1999-08-15','FEMENINO','3001110004','daniela.cardona@yahoo.com',NULL,NULL,'Carrera 45 # 10-20','Sura','2026-09-11 17:40:46'),
(15,20,'CC','1036000105','Sebastián','Marín','1995-01-30','MASCULINO','3001110005','sebastian.marin@gmail.com',NULL,NULL,'Calle 30 # 80-15','Compensar','2026-09-11 17:40:46'),
(16,21,'CC','1036000106','Camila','Restrepo','1997-04-12','FEMENINO','3001110006','camila.restrepo@hotmail.com',NULL,NULL,'Carrera 80 # 45-11','Sura','2026-09-11 17:40:46'),
(17,22,'CC','1036000107','Nicolás','Arango','1992-09-08','MASCULINO','3001110007','nicolas.arango@gmail.com',NULL,NULL,'Calle 12 # 34-56','Coomeva','2026-09-11 17:40:46'),
(18,23,'CC','1036000108','Mariana','Zapata','2000-06-25','FEMENINO','3001110008','mariana.zapata@outlook.com',NULL,NULL,'Carrera 65 # 50-30','Sura','2026-09-11 17:40:46'),
(19,24,'CC','1036000109','Alejandro','Henao','1985-12-18','MASCULINO','3001110009','alejandro.henao@yahoo.com',NULL,NULL,'Calle 48 # 73-12','Sanitas','2026-09-11 17:40:46'),
(20,25,'CC','1036000110','Valeria','Duque','1998-03-05','FEMENINO','3001110010','valeria.duque@gmail.com',NULL,NULL,'Carrera 52 # 40-22','Sura','2026-09-11 17:40:46'),
(21,26,'CC','1036000111','David','Buitrago','1991-07-22','MASCULINO','3001110011','david.buitrago@hotmail.com',NULL,NULL,'Calle 55 # 68-04','Sura','2026-09-11 17:40:46'),
(22,27,'CC','1036000112','Isabella','Gómez','1996-10-14','FEMENINO','3001110012','isabella.gomez@outlook.com',NULL,NULL,'Carrera 43A # 12-05','Compensar','2026-09-11 17:40:46'),
(23,28,'TI','1036000113','Samuel','Cano','2011-05-19','MASCULINO','3001110013','samuel.cano@gmail.com',NULL,NULL,'Calle 33 # 75-40','Sura','2026-09-11 17:40:46'),
(24,29,'CC','1036000114','Gabriela','Echeverri','1994-08-31','FEMENINO','3001110014','gabriela.echeverri@yahoo.com',NULL,NULL,'Carrera 76 # 42-18','Sanitas','2026-09-11 17:40:46'),
(25,30,'CC','1036000115','Tomás','Vélez','1989-11-27','MASCULINO','3001110015','tomas.velez@hotmail.com',NULL,NULL,'Calle 10A # 30-12','Coomeva','2026-09-11 17:40:46'),
(26,31,'CC','1036000116','Luciana','Mejía','2002-01-16','FEMENINO','3001110016','luciana.mejia@gmail.com',NULL,NULL,'Carrera 81 # 35-50','Sura','2026-09-11 17:40:46'),
(27,32,'CC','1036000117','Santiago','Bedoya','1993-04-03','MASCULINO','3001110017','santiago.bedoya@outlook.com',NULL,NULL,'Calle 49 # 63-25','Sura','2026-09-11 17:40:46'),
(28,33,'CC','1036000118','Sofía','Correa','1990-09-12','FEMENINO','3001110018','sofia.correa@yahoo.com',NULL,NULL,'Carrera 50 # 80-10','Compensar','2026-09-11 17:40:46'),
(29,34,'CC','1036000119','Juan Pablo','Ríos','1997-02-28','MASCULINO','3001110019','juan.pablo.rios@gmail.com',NULL,NULL,'Calle 53 # 45-33','Sanitas','2026-09-11 17:40:46'),
(30,35,'TI','1036000120','Salomé','Vargas','2013-06-10','FEMENINO','3001110020','salome.vargas@hotmail.com',NULL,NULL,'Carrera 68 # 49-15','Sura','2026-09-11 17:40:46'),
(31,36,'CC','1036000121','Emilio','Muñoz','1992-12-01','MASCULINO','3001110021','emilio.munoz@outlook.com',NULL,NULL,'Calle 32 # 70-12','Sura','2026-09-11 17:40:46'),
(32,37,'CC','1036000122','Renata','Flórez','1995-07-17','FEMENINO','3001110022','renata.florez@gmail.com',NULL,NULL,'Carrera 42 # 54-20','Coomeva','2026-09-11 17:40:46'),
(33,38,'CC','1036000123','Lucas','Agudelo','1986-03-22','MASCULINO','3001110023','lucas.agudelo@yahoo.com',NULL,NULL,'Calle 11 # 43B-05','Sura','2026-09-11 17:40:46'),
(34,39,'CC','1036000124','Antonia','Giraldo','1988-10-09','FEMENINO','3001110024','antonia.giraldo@hotmail.com',NULL,NULL,'Carrera 75 # 25-14','Sanitas','2026-09-11 17:40:46'),
(35,40,'CC','1036000125','Pablo','Saldarriaga','1994-05-11','MASCULINO','3001110025','pablo.saldarriaga@gmail.com',NULL,NULL,'Calle 45 # 65-30','Sura','2026-09-11 17:40:46'),
(36,41,'CC','1036000126','Manuela','Castrillón','1998-11-23','FEMENINO','3001110026','manuela.castrillon@outlook.com',NULL,NULL,'Carrera 51 # 38-12','Compensar','2026-09-11 17:40:46'),
(37,42,'CC','1036000127','Joaquín','Posada','1991-08-04','MASCULINO','3001110027','joaquin.posada@yahoo.com',NULL,NULL,'Calle 30A # 82-10','Sura','2026-09-11 17:40:46'),
(38,43,'CC','1036000128','Victoria','Hoyos','2001-02-15','FEMENINO','3001110028','victoria.hoyos@gmail.com',NULL,NULL,'Carrera 63 # 48-55','Sanitas','2026-09-11 17:40:46'),
(39,44,'CC','1036000129','Martín','Tobón','1993-09-30','MASCULINO','3001110029','martin.tobon@hotmail.com',NULL,NULL,'Calle 52 # 70-14','Sura','2026-09-11 17:40:46'),
(40,45,'CC','1036000130','Alicia','Quintero','1987-04-18','FEMENINO','3001110030','alicia.quintero@outlook.com',NULL,NULL,'Carrera 48 # 10-05','Coomeva','2026-09-11 17:40:46'),
(41,46,'CC','1036000131','Emmanuel','Valencia','1996-01-25','MASCULINO','3001110031','emmanuel.valencia@gmail.com',NULL,NULL,'Calle 10 # 38-20','Sura','2026-09-11 17:40:46'),
(42,47,'TI','1036000132','Guadalupe','Usme','2012-10-12','FEMENINO','3001110032','guadalupe.usme@yahoo.com',NULL,NULL,'Carrera 72 # 35-40','Sura','2026-09-11 17:40:46'),
(43,48,'CC','1036000133','Simón','Rendón','1990-03-08','MASCULINO','3001110033','simon.rendon@hotmail.com',NULL,NULL,'Calle 49 # 78-15','Sanitas','2026-09-11 17:40:46'),
(44,49,'CC','1036000134','Milena','Villegas','1995-12-05','FEMENINO','3001110034','milena.villegas@gmail.com',NULL,NULL,'Carrera 80 # 50-22','Compensar','2026-09-11 17:40:46'),
(45,50,'CC','1036000135','Rodrigo','Palacio','1989-06-20','MASCULINO','3001110035','rodrigo.palacio@outlook.com',NULL,NULL,'Calle 33 # 65-12','Sura','2026-09-11 17:40:46'),
(46,51,'CC','1036000136','Elena','Tamayo','1997-08-14','FEMENINO','3001110036','elena.tamayo@yahoo.com',NULL,NULL,'Carrera 43A # 18-30','Sura','2026-09-11 17:40:46'),
(47,52,'CC','1036000137','Gabriel','Monsalve','1992-05-02','MASCULINO','3001110037','gabriel.monsalve@gmail.com',NULL,NULL,'Calle 50 # 75-10','Coomeva','2026-09-11 17:40:46'),
(48,53,'CC','1036000138','Cecilia','Botero','1984-11-19','FEMENINO','3001110038','cecilia.botero@hotmail.com',NULL,NULL,'Carrera 65 # 30-40','Sanitas','2026-09-11 17:40:46'),
(49,54,'CC','1036000139','Felipe','Álvarez','1993-07-07','MASCULINO','3001110039','felipe.alvarez@outlook.com',NULL,NULL,'Calle 12 # 43-25','Sura','2026-09-11 17:40:46'),
(50,55,'CC','1036000140','Andrea','Osorio','1998-02-11','FEMENINO','3001110040','andrea.osorio@gmail.com',NULL,NULL,'Carrera 70 # 45-18','Compensar','2026-09-11 17:40:46');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pago_venta` (
  `id_pago` int(11) NOT NULL AUTO_INCREMENT,
  `id_venta` int(11) NOT NULL,
  `id_metodo` int(11) NOT NULL,
  `monto_abonado` decimal(12,2) NOT NULL,
  `numero_cuota_actual` int(11) DEFAULT 1,
  `fecha_pago` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_pago`),
  KEY `fk_pv_venta` (`id_venta`),
  KEY `fk_pv_metodo` (`id_metodo`),
  CONSTRAINT `fk_pv_metodo` FOREIGN KEY (`id_metodo`) REFERENCES `metodo_pago` (`id_metodo`) ON UPDATE CASCADE,
  CONSTRAINT `fk_pv_venta` FOREIGN KEY (`id_venta`) REFERENCES `venta` (`id_venta`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_pago_monto` CHECK (`monto_abonado` > 0)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `pago_venta` (`id_pago`, `id_venta`, `id_metodo`, `monto_abonado`, `numero_cuota_actual`, `fecha_pago`) VALUES
(1,1,3,50000.00,1,'2026-09-11 17:47:22'),
(2,2,4,150000.00,1,'2026-09-11 17:47:22'),
(3,3,4,50000.00,1,'2026-09-11 18:23:18'),
(4,4,1,150000.00,1,'2026-09-11 18:23:18'),
(5,5,2,50000.00,1,'2026-09-11 18:23:18'),
(6,6,3,150000.00,1,'2026-09-11 18:23:18'),
(7,7,4,50000.00,1,'2026-09-11 18:23:18'),
(8,8,1,150000.00,1,'2026-09-11 18:23:18'),
(9,9,2,50000.00,1,'2026-09-11 18:23:18'),
(10,10,3,150000.00,1,'2026-09-11 18:23:18'),
(11,11,4,50000.00,1,'2026-09-11 18:23:18'),
(12,12,1,150000.00,1,'2026-09-11 18:23:18'),
(13,13,2,50000.00,1,'2026-09-11 18:23:18'),
(14,14,3,150000.00,1,'2026-09-11 18:23:18'),
(15,15,4,50000.00,1,'2026-09-11 18:23:18'),
(16,16,1,150000.00,1,'2026-09-11 18:23:18'),
(17,17,2,50000.00,1,'2026-09-11 18:23:18'),
(18,18,3,150000.00,1,'2026-09-11 18:23:18'),
(19,19,4,50000.00,1,'2026-09-11 18:23:18'),
(20,20,1,150000.00,1,'2026-09-11 18:23:18'),
(21,21,2,50000.00,1,'2026-09-11 18:23:18'),
(22,22,3,150000.00,1,'2026-09-11 18:23:18'),
(23,23,4,50000.00,1,'2026-09-11 18:23:18'),
(24,24,1,150000.00,1,'2026-09-11 18:23:18'),
(25,25,2,50000.00,1,'2026-09-11 18:23:18'),
(26,26,3,150000.00,1,'2026-09-11 18:23:18'),
(27,27,4,50000.00,1,'2026-09-11 18:23:18'),
(28,28,1,150000.00,1,'2026-09-11 18:23:18'),
(29,29,2,50000.00,1,'2026-09-11 18:23:18'),
(30,30,3,150000.00,1,'2026-09-11 18:23:18'),
(31,31,4,50000.00,1,'2026-09-11 18:23:18'),
(32,32,1,150000.00,1,'2026-09-11 18:23:18'),
(33,33,2,50000.00,1,'2026-09-11 18:23:18'),
(34,34,3,150000.00,1,'2026-09-11 18:23:18'),
(35,35,4,50000.00,1,'2026-09-11 18:23:18'),
(36,36,1,150000.00,1,'2026-09-11 18:23:18'),
(37,37,2,50000.00,1,'2026-09-11 18:23:18'),
(38,38,3,150000.00,1,'2026-09-11 18:23:18'),
(39,39,4,50000.00,1,'2026-09-11 18:23:18'),
(40,40,1,150000.00,1,'2026-09-11 18:23:18');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permiso` (
  `id_permiso` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_permiso` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_permiso`),
  UNIQUE KEY `nombre_permiso` (`nombre_permiso`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `permiso` (`id_permiso`, `nombre_permiso`, `descripcion`) VALUES
(1,'CREAR_CITA','Permite agendar nuevas citas en el sistema'),
(2,'CANCELAR_CITA','Permite cancelar citas existentes'),
(3,'VER_HISTORIA_CLINICA','Acceso a la lectura de historias clínicas'),
(4,'EDITAR_HISTORIA_CLINICA','Permite registrar hallazgos y diagnósticos'),
(5,'GESTIONAR_USUARIOS','Acceso total para crear y modificar usuarios'),
(6,'REGISTRAR_PAGO','Permite procesar pagos y facturación'),
(7,'GESTIONAR_PACIENTES','Registrar y actualizar pacientes'),
(8,'GESTIONAR_SERVICIOS','Crear, editar e inactivar tratamientos del catálogo'),
(9,'GESTIONAR_ESPECIALISTAS','Administrar odontólogos y sus horarios'),
(10,'REGISTRAR_NOVEDAD','Reportar novedades operativas'),
(11,'GESTIONAR_NOVEDADES','Consultar y administrar todas las novedades');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `personal` (
  `id_personal` int(11) NOT NULL AUTO_INCREMENT,
  `id_usuario` int(11) NOT NULL,
  `tipo_documento` varchar(10) NOT NULL,
  `numero_documento` varchar(20) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `cargo` varchar(50) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id_personal`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  UNIQUE KEY `numero_documento` (`numero_documento`),
  CONSTRAINT `fk_personal_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `personal` (`id_personal`, `id_usuario`, `tipo_documento`, `numero_documento`, `nombres`, `apellidos`, `cargo`, `telefono`) VALUES
(1,1,'CC','1010101001','Laura','Gómez','Administradora','3009990001'),
(2,2,'CC','1010101002','Carlos','Pérez','Recepcionista','3009990002'),
(3,3,'CC','1010101003','Dr. Roberto','Martínez','Odontólogo General','3009990003'),
(4,4,'CC','1010101004','Dra. Sofía','López','Ortodoncista','3009990004'),
(5,5,'CC','1010101005','Dr. Andrés','Ramírez','Endodoncista','3009990005');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rol` (
  `id_rol` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `nombre_rol` (`nombre_rol`),
  CONSTRAINT `chk_rol_estado` CHECK (`estado` in ('ACTIVO','INACTIVO'))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `rol` (`id_rol`, `nombre_rol`, `descripcion`, `estado`) VALUES
(1,'ADMINISTRADOR','Acceso total al sistema','ACTIVO'),
(2,'RECEPCIONISTA','Gestión de citas y pacientes','ACTIVO'),
(3,'ESPECIALISTA','Atención médica y odontograma','ACTIVO'),
(4,'PACIENTE','Acceso al portal del paciente','ACTIVO');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rol_permiso` (
  `id_rol` int(11) NOT NULL,
  `id_permiso` int(11) NOT NULL,
  PRIMARY KEY (`id_rol`,`id_permiso`),
  KEY `fk_rp_permiso` (`id_permiso`),
  CONSTRAINT `fk_rp_permiso` FOREIGN KEY (`id_permiso`) REFERENCES `permiso` (`id_permiso`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rp_rol` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES
(1,1),
(1,2),
(1,3),
(1,4),
(1,5),
(1,6),
(1,7),
(1,8),
(1,9),
(1,10),
(1,11),
(2,1),
(2,2),
(2,6),
(2,7),
(2,10),
(3,1),
(3,2),
(3,3),
(3,4),
(3,10),
(4,1),
(4,2);
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `servicio` (
  `id_servicio` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_servicio` varchar(20) NOT NULL,
  `nombre_servicio` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio_base` decimal(12,2) NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_servicio`),
  UNIQUE KEY `codigo_servicio` (`codigo_servicio`),
  CONSTRAINT `chk_servicio_estado` CHECK (`estado` in ('ACTIVO','INACTIVO')),
  CONSTRAINT `chk_servicio_precio` CHECK (`precio_base` >= 0)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `servicio` (`id_servicio`, `codigo_servicio`, `nombre_servicio`, `descripcion`, `precio_base`, `estado`) VALUES
(1,'SERV-001','Valoración General','Consulta inicial y diagnóstico',50000.00,'ACTIVO'),
(2,'SERV-002','Limpieza Dental Profunda','Profilaxis y detartraje',120000.00,'ACTIVO'),
(3,'SERV-003','Calza / Resina Estética','Obturación en resina fotocurable',90000.00,'ACTIVO'),
(4,'SERV-004','Tratamiento de Conducto','Endodoncia unirradicular',350000.00,'ACTIVO'),
(5,'SERV-005','Diseño de Sonrisa','Carillas estéticas',1500000.00,'ACTIVO');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
-- -----------------------------------------------------
-- Table structure for table `consulta_servicio`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `consulta_servicio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `consulta_servicio` (
  `id_consulta` int(11) NOT NULL,
  `id_servicio` int(11) NOT NULL,
  `cantidad` int(11) NOT NULL DEFAULT 1,
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`id_consulta`,`id_servicio`),
  KEY `fk_cs_servicio` (`id_servicio`),
  CONSTRAINT `fk_cs_consulta` FOREIGN KEY (`id_consulta`) REFERENCES `consulta` (`id_consulta`) ON DELETE CASCADE,
  CONSTRAINT `fk_cs_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consulta_servicio`
--

INSERT INTO `consulta_servicio` (`id_consulta`, `id_servicio`, `cantidad`, `observaciones`) VALUES
(1, 1, 1, 'Valoración general inicial'),
(1, 2, 1, 'Profilaxis y detartraje');
CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `id_rol` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'ACTIVO',
  `fecha_creacion` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_usuario_rol` (`id_rol`),
  CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`) ON UPDATE CASCADE,
  CONSTRAINT `chk_usuario_password_bcrypt` CHECK (`password_hash` regexp '^[$]2[aby][$][0-9]{2}[$][./A-Za-z0-9]{53}$'),
  CONSTRAINT `chk_usuario_estado` CHECK (`estado` in ('ACTIVO','INACTIVO'))
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `usuario` (`id_usuario`, `id_rol`, `email`, `password_hash`, `estado`, `fecha_creacion`) VALUES
(1,1,'admin@dentalcare.com','$2a$10$QUOB1imQipamM.ht3H2rV.Jw4ywM8z81947SjJHnnBAsjwtppK80.','ACTIVO','2026-09-11 17:50:59'),
(2,2,'recepcion@dentalcare.com','$2a$10$56a5JL4lJxUT4MpChKL2OOXBt1uU43sfFIBX9GtWjdZ.j1WRMQsQa','ACTIVO','2026-09-11 17:50:59'),
(3,3,'dr.roberto@dentalcare.com','$2a$10$IeEl1lFiJwZO6f58HU2BIO307X0M8ZTP4MFwyRcyfXm08tWf7AHHq','ACTIVO','2026-09-11 17:50:59'),
(4,3,'dra.sofia@dentalcare.com','$2a$10$Yq.Uf1ODhBoQhHpY9h1tceo0q7XfPLC8LhevX.0xqi6PiZqIKLKm2','ACTIVO','2026-09-11 17:50:59'),
(5,3,'dr.andres@dentalcare.com','$2a$10$QtNg2xAYH.e0yoANOYuuCemby12w1Y8cE.iG0JnaEMg/W5gT.l3hq','ACTIVO','2026-09-11 17:50:59'),
(16,4,'andres.galvis@gmail.com','$2a$10$xPz3BkvtAFmbNbAY2AYC4OZDAZj.moXO554MN0dmgWwe8wKVyRlkW','ACTIVO','2026-09-11 17:40:31'),
(17,4,'carolina.villa@hotmail.com','$2a$10$s2F.uVE67wm1px1hBPHWiO1ct2zvW9jbsqbwS7r8mAd31n9WEW5Ty','ACTIVO','2026-09-11 17:40:31'),
(18,4,'mateo.londono@outlook.com','$2a$10$VNidVJWOBpWN3uePOnWZyuTT7h76P5WbUfcNpbScAxdxytW44sS5a','ACTIVO','2026-09-11 17:40:31'),
(19,4,'daniela.cardona@yahoo.com','$2a$10$vbIbRofWjh.w61raHL/YIOiJf.uyuV5mt1rbh00JJBqNwZhmETTNq','ACTIVO','2026-09-11 17:40:31'),
(20,4,'sebastian.marin@gmail.com','$2a$10$fGyRyEhhhR3ivbMuzqJQK.EesdVNkDVcVcsU0ft6eC2Uz4B7sgPg6','ACTIVO','2026-09-11 17:40:31'),
(21,4,'camila.restrepo@hotmail.com','$2a$10$jglMEHmensmnN8uRezwZFOSVz95lZU53In.BJWn90VrhTA3Ngwi4e','ACTIVO','2026-09-11 17:40:31'),
(22,4,'nicolas.arango@gmail.com','$2a$10$wsoknVXCHrPSAK8YILyE1Oj1Q5yRkPjUx7YCrhroqoTTp3USByXGK','ACTIVO','2026-09-11 17:40:31'),
(23,4,'mariana.zapata@outlook.com','$2a$10$zH64CdfLvvxnahSOHsjMm.DLHH4AxvGqRW4P7tW9xHppvYy59PTim','ACTIVO','2026-09-11 17:40:31'),
(24,4,'alejandro.henao@yahoo.com','$2a$10$epEeDtkA8jz2oCfoOhX3dO/PSaJA72nJ1XHS7xHJ5m51x5VzLykKu','ACTIVO','2026-09-11 17:40:31'),
(25,4,'valeria.duque@gmail.com','$2a$10$uWL0D8cP3o7qXN.1MDGTyOC83i91/gSV4ofdMhfVoBIa8LdCzoAAy','ACTIVO','2026-09-11 17:40:31'),
(26,4,'david.buitrago@hotmail.com','$2a$10$QWSISLJiuoBTwFDtY91qjO37odXNj.mQDYg16bftfx3Bv9D9zDdFq','ACTIVO','2026-09-11 17:40:31'),
(27,4,'isabella.gomez@outlook.com','$2a$10$wBRSgIW/Qq1mzxu0dlpZ/eN1ANe.pUj90WIN6G.l0BkCQDKbuEs7a','ACTIVO','2026-09-11 17:40:31'),
(28,4,'samuel.cano@gmail.com','$2a$10$6isczFfDsUnU64m9LUa5FOpVdockJSB49PgSN2C2g.FTGqzCRvw52','ACTIVO','2026-09-11 17:40:31'),
(29,4,'gabriela.echeverri@yahoo.com','$2a$10$XbVMCFYikbZxE219rBrvgO68aJgoBydN9FWhqK8Z5JdZ6sTRKMpuq','ACTIVO','2026-09-11 17:40:31'),
(30,4,'tomas.velez@hotmail.com','$2a$10$c4kn5Nb5EGx4gDi8lF9nhOjntZYDhPcfnVKkpVP898QXS9U5D9Ip.','ACTIVO','2026-09-11 17:40:31'),
(31,4,'luciana.mejia@gmail.com','$2a$10$EOE.PCNENvC9tNc5cqMwyOvupR.FBew/JOUTLLvaXMwJ3Tw9m6byC','ACTIVO','2026-09-11 17:40:31'),
(32,4,'santiago.bedoya@outlook.com','$2a$10$QwyZyidUfw1pMAwI94H5RO6mW6wFN4ISMiOKu3R3LsodflFuN9z4u','ACTIVO','2026-09-11 17:40:31'),
(33,4,'sofia.correa@yahoo.com','$2a$10$EDRPJEfA1QWF3XKpJCWNXev2GjpkaDfCRjimxHMxnrUcZxzdlmF/y','ACTIVO','2026-09-11 17:40:31'),
(34,4,'juan.pablo.rios@gmail.com','$2a$10$dZpxbepP/6qZ6a19A8HxPuS.ZhNJHsJCnaLgVZmymWK.KNjIbRotq','ACTIVO','2026-09-11 17:40:31'),
(35,4,'salome.vargas@hotmail.com','$2a$10$J3Kd1qwMIwGCsd7ZDslGyejhcZOTFA48J8775jRHQ9Sl8tuubuveO','ACTIVO','2026-09-11 17:40:31'),
(36,4,'emilio.munoz@outlook.com','$2a$10$P6WJgupzLn1mY8iLHtU4kOyJ0w8HpZlC9HkbCIDumRNOpv0rd7j.K','ACTIVO','2026-09-11 17:40:31'),
(37,4,'renata.florez@gmail.com','$2a$10$sBMfsmrhj.7qXZsgtZbqreuwTfiCcJ9GXnA2yLtp3pQfdQzcu6ZE.','ACTIVO','2026-09-11 17:40:31'),
(38,4,'lucas.agudelo@yahoo.com','$2a$10$l/BVzyMXeaD/OUujkoI9WukWSHPhfFIctd/LTkVhezKXyu0DfYGJq','ACTIVO','2026-09-11 17:40:31'),
(39,4,'antonia.giraldo@hotmail.com','$2a$10$oEKHYvFFnkeefN09HW3uMOXC9yMYXmt8mWmJT8QOFYELFD/iJeZye','ACTIVO','2026-09-11 17:40:31'),
(40,4,'pablo.saldarriaga@gmail.com','$2a$10$u96EmltnGtjvwIEjYifPZ.8alz6zsAklxsFgkqGFiFIcSpSGOEHyO','ACTIVO','2026-09-11 17:40:31'),
(41,4,'manuela.castrillon@outlook.com','$2a$10$qiu/76RojjJvzRDy9pJYfugyKCapGMS5p4Vo00C7ao.u1.ePRq1EO','ACTIVO','2026-09-11 17:40:31'),
(42,4,'joaquin.posada@yahoo.com','$2a$10$PMFrs9YK5hD/v3NBlpBHN.waFgNr2ZTlmg75lpXTEjZGjZJWJOIeC','ACTIVO','2026-09-11 17:40:31'),
(43,4,'victoria.hoyos@gmail.com','$2a$10$aPMmmD9tvkyWBNqijyiMheL4PDx.EPIWxAz3mYJfCbfag.GgQ4Sse','ACTIVO','2026-09-11 17:40:31'),
(44,4,'martin.tobon@hotmail.com','$2a$10$lAC68idLSdCkvNu2uHb.AOR1vFYPRIeyElBGb8Cu9jWqECdsxeY4O','ACTIVO','2026-09-11 17:40:31'),
(45,4,'alicia.quintero@outlook.com','$2a$10$ArhGzm7IsxFyYN/Lr/sXN.7QtSU6/LMMnNn.kXQ6jdw6EYVRETzQO','ACTIVO','2026-09-11 17:40:31'),
(46,4,'emmanuel.valencia@gmail.com','$2a$10$IyNtRdoo05fZTV8hZB4TJuASTslqeKpakPQqX/JRMOWqAH/AppoOS','ACTIVO','2026-09-11 17:40:31'),
(47,4,'guadalupe.usme@yahoo.com','$2a$10$YlYodHUsWx3k6JxYxFC.MO9QR81MM9N/dfTya9hyK0qnsu7SD4tEy','ACTIVO','2026-09-11 17:40:31'),
(48,4,'simon.rendon@hotmail.com','$2a$10$vEfL2ct47abUESFz6I2kEOK.k/YnnUvb8f0vKoc4cLHtmWZDuQgyG','ACTIVO','2026-09-11 17:40:31'),
(49,4,'milena.villegas@gmail.com','$2a$10$Zfc3x7EfXyge1sOGK5CecOF7/RD0yIZxzh0GS6qBm4ljgXhl6y/hy','ACTIVO','2026-09-11 17:40:31'),
(50,4,'rodrigo.palacio@outlook.com','$2a$10$Qo.CxOJKMu.FCXfyGFxQueC9ssYHqIUh5eSQQzRSRaIZSpxJrDaS2','ACTIVO','2026-09-11 17:40:31'),
(51,4,'elena.tamayo@yahoo.com','$2a$10$jSMHCwzNtquSOXIQJR6W9eNi27By3e1ggywextNTLBnfp8VbgPyYi','ACTIVO','2026-09-11 17:40:31'),
(52,4,'gabriel.monsalve@gmail.com','$2a$10$cczUA0futSN6.yeREXfLKeShTO7nmj.3jIcBvubxfFaNApFd77Ks2','ACTIVO','2026-09-11 17:40:31'),
(53,4,'cecilia.botero@hotmail.com','$2a$10$iNPUDZbA39iq7t7cUEjHSe8pitroxVW/q5bWVRjTVeRNAgj6Fu1Ky','ACTIVO','2026-09-11 17:40:31'),
(54,4,'felipe.alvarez@outlook.com','$2a$10$KlDtl.yTDYTBVW3ibdekuuL82XbHYU0HucyxR7fH5meDkVAimbZFO','ACTIVO','2026-09-11 17:40:31'),
(55,4,'andrea.osorio@gmail.com','$2a$10$sjelq.ZiIP756rluYQh7OeLJIzOBe9TXGbM8TIK42XO7ACOmJ6SzC','ACTIVO','2026-09-11 17:40:31');
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `venta` (
  `id_venta` int(11) NOT NULL AUTO_INCREMENT,
  `id_paciente` int(11) NOT NULL,
  `id_servicio` int(11) NOT NULL,
  `monto_total` decimal(12,2) NOT NULL,
  `monto_pagado` decimal(12,2) NOT NULL DEFAULT 0.00,
  `saldo_pendiente` decimal(12,2) GENERATED ALWAYS AS (`monto_total` - `monto_pagado`) STORED,
  `modalidad_pago` varchar(20) NOT NULL,
  `numero_cuotas` int(11) NOT NULL DEFAULT 1,
  `estado_venta` varchar(20) GENERATED ALWAYS AS (case when `monto_pagado` >= `monto_total` then 'PAGADO' else 'PENDIENTE' end) STORED,
  `fecha_venta` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id_venta`),
  KEY `fk_venta_paciente` (`id_paciente`),
  KEY `fk_venta_servicio` (`id_servicio`),
  CONSTRAINT `fk_venta_paciente` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`) ON UPDATE CASCADE,
  CONSTRAINT `fk_venta_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`) ON UPDATE CASCADE,
  CONSTRAINT `chk_venta_montos` CHECK (`monto_total` > 0 and `monto_pagado` >= 0 and `monto_pagado` <= `monto_total`),
  CONSTRAINT `chk_venta_modalidad` CHECK (`modalidad_pago` in ('CONTADO','CREDITO')),
  CONSTRAINT `chk_venta_cuotas` CHECK (`numero_cuotas` >= 1)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

INSERT INTO `venta` (`id_venta`, `id_paciente`, `id_servicio`, `monto_total`, `monto_pagado`, `modalidad_pago`, `numero_cuotas`, `fecha_venta`) VALUES
(1,11,3,140000.00,50000.00,'CONTADO',1,'2026-09-11 17:47:13'),
(2,12,4,350000.00,150000.00,'CREDITO',3,'2026-09-11 17:47:13'),
(3,13,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(4,14,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(5,15,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(6,16,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(7,17,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(8,18,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(9,19,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(10,20,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(11,21,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(12,22,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(13,23,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(14,24,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(15,25,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(16,26,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(17,27,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(18,28,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(19,29,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(20,30,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(21,31,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(22,32,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(23,33,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(24,34,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(25,35,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(26,36,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(27,37,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(28,38,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(29,39,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(30,40,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(31,41,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(32,42,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(33,43,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(34,44,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(35,45,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(36,46,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(37,47,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(38,48,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58'),
(39,49,2,150000.00,50000.00,'CREDITO',3,'2026-09-11 18:22:58'),
(40,50,2,150000.00,150000.00,'CONTADO',1,'2026-09-11 18:22:58');
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
