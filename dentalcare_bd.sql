-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 26-09-2026 a las 06:14:51
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `dentalcare_bd`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cita`
--

CREATE TABLE `cita` (
  `id_cita` int(11) NOT NULL,
  `id_paciente` int(11) NOT NULL,
  `id_especialista` int(11) NOT NULL,
  `fecha_hora` datetime NOT NULL,
  `motivo` varchar(255) NOT NULL,
  `estado_cita` varchar(30) DEFAULT 'PROGRAMADA',
  `recordatorio_enviado` tinyint(1) DEFAULT 0,
  `mensaje_alerta` varchar(255) DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `cita`
--

INSERT INTO `cita` (`id_cita`, `id_paciente`, `id_especialista`, `fecha_hora`, `motivo`, `estado_cita`, `recordatorio_enviado`, `mensaje_alerta`, `fecha_creacion`) VALUES
(1, 11, 1, '2026-09-01 08:00:00', 'Valoración general y limpieza', 'PROGRAMADA', 0, NULL, '2026-09-11 18:02:49'),
(2, 12, 2, '2026-09-02 08:00:00', 'Control mensual de ortodoncia', 'COMPLETADA', 0, NULL, '2026-09-11 18:02:49'),
(3, 13, 1, '2026-09-03 08:00:00', 'Dolor agudo en pieza molar', 'PROGRAMADA', 0, NULL, '2026-09-11 18:02:49'),
(4, 14, 3, '2026-09-04 08:00:00', 'Evaluación para tratamiento de conducto', 'COMPLETADA', 0, NULL, '2026-09-11 18:02:49'),
(5, 15, 1, '2026-09-05 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(6, 16, 2, '2026-09-06 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(7, 17, 3, '2026-09-07 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(8, 18, 1, '2026-09-08 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(9, 19, 2, '2026-09-09 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(10, 20, 3, '2026-09-10 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(11, 21, 1, '2026-09-11 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(12, 22, 2, '2026-09-12 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(13, 23, 3, '2026-09-13 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(14, 24, 1, '2026-09-14 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(15, 25, 2, '2026-09-15 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(16, 26, 3, '2026-09-16 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(17, 27, 1, '2026-09-17 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(18, 28, 2, '2026-09-18 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(19, 29, 3, '2026-09-19 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(20, 30, 1, '2026-09-20 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(21, 31, 2, '2026-09-21 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(22, 32, 3, '2026-09-22 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(23, 33, 1, '2026-09-23 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(24, 34, 2, '2026-09-24 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(25, 35, 3, '2026-09-25 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(26, 36, 1, '2026-09-26 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(27, 37, 2, '2026-09-27 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(28, 38, 3, '2026-09-28 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(29, 39, 1, '2026-09-29 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(30, 40, 2, '2026-09-30 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(31, 41, 3, '2026-10-01 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(32, 42, 1, '2026-10-02 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(33, 43, 2, '2026-10-03 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(34, 44, 3, '2026-10-04 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(35, 45, 1, '2026-10-05 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(36, 46, 2, '2026-10-06 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(37, 47, 3, '2026-10-07 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(38, 48, 1, '2026-10-08 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42'),
(39, 49, 2, '2026-10-09 08:00:00', 'Valoración y control odontológico', 'PROGRAMADA', 0, NULL, '2026-09-11 18:22:42'),
(40, 50, 3, '2026-10-10 08:00:00', 'Valoración y control odontológico', 'COMPLETADA', 0, NULL, '2026-09-11 18:22:42');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `consulta`
--

CREATE TABLE `consulta` (
  `id_consulta` int(11) NOT NULL,
  `id_cita` int(11) NOT NULL,
  `motivo_consulta` varchar(255) NOT NULL,
  `diagnostico` text NOT NULL,
  `procedimiento_realizado` text NOT NULL,
  `prescripcion_medica` text DEFAULT NULL,
  `fecha_consulta` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `consulta`
--

INSERT INTO `consulta` (`id_consulta`, `id_cita`, `motivo_consulta`, `diagnostico`, `procedimiento_realizado`, `prescripcion_medica`, `fecha_consulta`) VALUES
(1, 1, 'Revisión periódica', 'Higiene adecuada, ligera acumulación de sarro', 'Profilaxis y detartraje ultrasónico', 'Usar enjuague bucal sin alcohol', '2026-09-11 18:02:54'),
(2, 3, 'Dolor al masticar en cuadrante inferior', 'Salud oral en aceptable estado / Caries leve en revisión', 'Remoción de caries y obturación en resina fotocurable', 'Ibuprofeno 400mg cada 8 horas por 3 días', '2026-09-11 18:02:54'),
(4, 4, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(6, 6, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(8, 8, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(10, 10, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(12, 12, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(14, 14, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(16, 16, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(18, 18, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(20, 20, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(22, 22, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(24, 24, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(26, 26, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(28, 28, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(30, 30, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(32, 32, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(34, 34, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(36, 36, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(38, 38, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50'),
(40, 40, 'Control odontológico de rutina', 'Salud oral en aceptable estado / Caries leve en revisión', 'Limpieza profiláctica y aplicación de flúor', 'Enjuague bucal diario sin alcohol', '2026-09-11 18:22:50');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `diente`
--

CREATE TABLE `diente` (
  `id_diente` int(11) NOT NULL,
  `numero_fdi` int(11) NOT NULL,
  `nombre_diente` varchar(50) NOT NULL,
  `cuadrante` int(11) NOT NULL,
  `tipo_denticion` varchar(20) NOT NULL,
  `imagen_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `diente`
--

INSERT INTO `diente` (`id_diente`, `numero_fdi`, `nombre_diente`, `cuadrante`, `tipo_denticion`, `imagen_url`) VALUES
(11, 11, 'Incisivo Central Superior Derecho', 1, 'PERMANENTE', NULL),
(12, 12, 'Incisivo Lateral Superior Derecho', 1, 'PERMANENTE', NULL),
(16, 16, 'Primer Molar Superior Derecho', 1, 'PERMANENTE', NULL),
(21, 21, 'Incisivo Central Superior Izquierdo', 2, 'PERMANENTE', NULL),
(36, 36, 'Primer Molar Inferior Izquierdo', 3, 'PERMANENTE', NULL),
(46, 46, 'Primer Molar Inferior Derecho', 4, 'PERMANENTE', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `especialista`
--

CREATE TABLE `especialista` (
  `id_especialista` int(11) NOT NULL,
  `id_personal` int(11) NOT NULL,
  `especialidad` varchar(100) NOT NULL,
  `registro_medico` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `especialista`
--

INSERT INTO `especialista` (`id_especialista`, `id_personal`, `especialidad`, `registro_medico`) VALUES
(1, 3, 'Odontología General', 'RM-1001'),
(2, 4, 'Ortodoncia', 'RM-1002'),
(3, 5, 'Endodoncia', 'RM-1003');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historia_clinica`
--

CREATE TABLE `historia_clinica` (
  `id_historia` int(11) NOT NULL,
  `id_paciente` int(11) NOT NULL,
  `antecedentes_medicos` text DEFAULT NULL,
  `alergias` text DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_apertura` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `historia_clinica`
--

INSERT INTO `historia_clinica` (`id_historia`, `id_paciente`, `antecedentes_medicos`, `alergias`, `observaciones`, `fecha_apertura`) VALUES
(1, 11, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(2, 12, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(3, 13, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(4, 14, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(5, 15, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(6, 16, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(7, 17, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(8, 18, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(9, 19, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(10, 20, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(11, 21, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(12, 22, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(13, 23, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(14, 24, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(15, 25, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(16, 26, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(17, 27, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(18, 28, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(19, 29, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(20, 30, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(21, 31, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(22, 32, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(23, 33, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(24, 34, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(25, 35, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(26, 36, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(27, 37, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(28, 38, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(29, 39, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(30, 40, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(31, 41, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(32, 42, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(33, 43, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(34, 44, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(35, 45, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(36, 46, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(37, 47, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(38, 48, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(39, 49, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43'),
(40, 50, 'Sin antecedentes médicos de importancia', 'Ninguna alergia reportada', 'Historia clínica aperturada en sistema', '2026-09-11 18:02:43');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `horario`
--

CREATE TABLE `horario` (
  `id_horario` int(11) NOT NULL,
  `id_especialista` int(11) NOT NULL,
  `dia_semana` varchar(15) NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `horario`
--

INSERT INTO `horario` (`id_horario`, `id_especialista`, `dia_semana`, `hora_inicio`, `hora_fin`) VALUES
(1, 1, 'Lunes', '08:00:00', '12:00:00'),
(2, 1, 'Lunes', '14:00:00', '18:00:00'),
(3, 2, 'Martes', '08:00:00', '14:00:00'),
(4, 3, 'Miércoles', '10:00:00', '16:00:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `log_auditoria`
--

CREATE TABLE `log_auditoria` (
  `id_log` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `accion` varchar(100) NOT NULL,
  `tabla_afectada` varchar(50) NOT NULL,
  `detalles` text DEFAULT NULL,
  `fecha_evento` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `log_auditoria`
--

INSERT INTO `log_auditoria` (`id_log`, `id_usuario`, `accion`, `tabla_afectada`, `detalles`, `fecha_evento`) VALUES
(1, 16, 'INSERT', 'CITA', 'Registro de cita ID 1 exitoso', '2026-09-11 17:47:33'),
(2, 1, 'LOGIN_EXITOSO', 'USUARIO', 'Inicio de sesión del usuario administrador en el sistema', '2026-09-11 18:00:00'),
(3, 2, 'INSERT', 'PACIENTE', 'Registro de nuevo paciente en la plataforma', '2026-09-11 18:15:30'),
(4, 3, 'UPDATE', 'HISTORIA_CLINICA', 'Actualización de antecedentes médicos del paciente ID 5', '2026-09-11 18:30:10'),
(5, 2, 'ALERTA_CITA_CANCELADA', 'CITA', '¡ALERTA! Cita ID 2 del paciente ID 12 fue CANCELADA', '2026-09-11 19:05:00'),
(6, 4, 'INSERT', 'CONSULTA', 'Creación de registro de atención odontológica ID 10', '2026-09-11 19:20:45'),
(7, 5, 'INSERT', 'NOVEDAD_OPERATIVA', 'Registro de reporte por falla técnica en lámpara de fotocurado', '2026-09-11 19:40:00'),
(8, 1, 'UPDATE', 'USUARIO', 'Modificación de permisos para el rol Recepcionista', '2026-09-11 20:00:15'),
(9, 3, 'INSERT', 'ODONTOGRAMA', 'Registro de hallazgos en pieza dental 11', '2026-09-11 20:15:00'),
(10, 2, 'INSERT', 'PAGO_VENTA', 'Registro de abono a venta ID 5 por $150.000 COP', '2026-09-11 20:30:22');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `metodo_pago`
--

CREATE TABLE `metodo_pago` (
  `id_metodo` int(11) NOT NULL,
  `nombre_metodo` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `metodo_pago`
--

INSERT INTO `metodo_pago` (`id_metodo`, `nombre_metodo`, `descripcion`) VALUES
(1, 'EFECTIVO', 'Pago presencial en caja'),
(2, 'TARJETA_CREDITO', 'Pago con tarjeta de crédito'),
(3, 'TARJETA_DEBITO', 'Pago con tarjeta débito'),
(4, 'TRANSFERENCIA', 'Transferencia bancaria / Nequi / Daviplata');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `novedad_operativa`
--

CREATE TABLE `novedad_operativa` (
  `id_novedad` int(11) NOT NULL,
  `id_personal` int(11) NOT NULL,
  `tipo_novedad` varchar(50) NOT NULL,
  `descripcion` text NOT NULL,
  `fecha_registro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `novedad_operativa`
--

INSERT INTO `novedad_operativa` (`id_novedad`, `id_personal`, `tipo_novedad`, `descripcion`, `fecha_registro`) VALUES
(1, 3, 'MANTENIMIENTO', 'Unidad odontológica 2 requiere calibración de pieza de mano', '2026-09-11 17:51:14'),
(2, 3, 'MANTENIMIENTO', 'Solicitud de reemplazo de lámpara de fotocurado en el Consultorio 1.', '2026-09-11 18:33:55'),
(3, 4, 'INCIDENCIA_TECNICA', 'Falla de conexión en la pieza de mano de alta velocidad durante procedimiento.', '2026-09-11 18:33:55'),
(4, 2, 'INVENTARIO', 'Notificación de stock bajo en resinas compuestas A2 y anestesia local.', '2026-09-11 18:33:55'),
(5, 5, 'SOPORTE_SISTEMA', 'Inconveniente al cargar radiografía digital en el módulo del odontograma.', '2026-09-11 18:33:55'),
(6, 1, 'MANTENIMIENTO', 'Programación de mantenimiento preventivo general para el compresor de aire principal.', '2026-09-11 18:33:55'),
(7, 3, 'INCIDENCIA_TECNICA', 'Descalibración en la silla odontológica del Consultorio 2.', '2026-09-11 18:33:55'),
(8, 2, 'ADMINISTRATIVA', 'Reporte de ausentismo justificado por incapacidad médica de la auxiliar odontológica.', '2026-09-11 18:33:55'),
(9, 4, 'INVENTARIO', 'Recepcionados 50 kits de bioseguridad y guantes de nitrilo talle M.', '2026-09-11 18:33:55'),
(10, 5, 'MANTENIMIENTO', 'Fuga de agua detectada en la escupidera de la unidad 3.', '2026-09-11 18:33:55');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `odontograma`
--

CREATE TABLE `odontograma` (
  `id_odontograma` int(11) NOT NULL,
  `id_historia` int(11) NOT NULL,
  `id_diente` int(11) NOT NULL,
  `cara_diente` varchar(20) NOT NULL,
  `diagnostico` varchar(100) NOT NULL,
  `estado_tratamiento` varchar(50) DEFAULT 'PENDIENTE',
  `fecha_registro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `odontograma`
--

INSERT INTO `odontograma` (`id_odontograma`, `id_historia`, `id_diente`, `cara_diente`, `diagnostico`, `estado_tratamiento`, `fecha_registro`) VALUES
(1, 1, 36, 'OCLUSAL', 'Caries restaurada con resina', 'REALIZADO', '2026-09-11 18:02:58'),
(2, 1, 16, 'VESTIBULAR', 'Caries incipiente', 'PENDIENTE', '2026-09-11 18:02:58'),
(3, 2, 11, 'INCISAL', 'Desgaste leve por bruxismo', 'EN_OBSERVACION', '2026-09-11 18:02:58'),
(4, 3, 21, 'MESIAL', 'Fractura de esmalte por traumatismo', 'PENDIENTE', '2026-09-12 09:15:00'),
(5, 4, 46, 'OCLUSAL', 'Tratamiento de conducto requerido', 'EN_PROCESO', '2026-09-12 10:30:00'),
(6, 5, 12, 'VESTIBULAR', 'Mancha blanca por desmineralización', 'EN_OBSERVACION', '2026-09-12 11:20:00'),
(7, 6, 16, 'DISTAL', 'Obturación en amalgama desadaptada', 'REEMPLAZO_REQUERIDO', '2026-09-12 14:00:00'),
(8, 7, 36, 'LINGUAL', 'Cálculo dental subgingival severo', 'REALIZADO', '2026-09-13 08:45:00'),
(9, 8, 21, 'INCISAL', 'Pigmentación por consumo de café', 'REALIZADO', '2026-09-13 10:10:00'),
(10, 9, 46, 'OCLUSAL', 'Sellante de fosas y fisuras aplicado', 'REALIZADO', '2026-09-13 11:50:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `paciente`
--

CREATE TABLE `paciente` (
  `id_paciente` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `tipo_documento` varchar(10) NOT NULL,
  `numero_documento` varchar(20) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `genero` varchar(15) NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `direccion` varchar(150) DEFAULT NULL,
  `eps_aseguradora` varchar(100) DEFAULT NULL,
  `fecha_registro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `paciente`
--

INSERT INTO `paciente` (`id_paciente`, `id_usuario`, `tipo_documento`, `numero_documento`, `nombres`, `apellidos`, `fecha_nacimiento`, `genero`, `telefono`, `email`, `direccion`, `eps_aseguradora`, `fecha_registro`) VALUES
(11, 16, 'CC', '1036000101', 'Andrés', 'Galvis', '1990-02-14', 'MASCULINO', '3001110001', 'andres.galvis@gmail.com', 'Calle 10 # 43-12', 'Sura', '2026-09-11 17:40:46'),
(12, 17, 'CC', '1036000102', 'Carolina', 'Villa', '1993-05-20', 'FEMENINO', '3001110002', 'carolina.villa@hotmail.com', 'Carrera 70 # 32-45', 'Sura', '2026-09-11 17:40:46'),
(13, 18, 'CC', '1036000103', 'Mateo', 'Londoño', '1988-11-03', 'MASCULINO', '3001110003', 'mateo.londono@outlook.com', 'Calle 50 # 65-10', 'Sanitas', '2026-09-11 17:40:46'),
(14, 19, 'CC', '1036000104', 'Daniela', 'Cardona', '1999-08-15', 'FEMENINO', '3001110004', 'daniela.cardona@yahoo.com', 'Carrera 45 # 10-20', 'Sura', '2026-09-11 17:40:46'),
(15, 20, 'CC', '1036000105', 'Sebastián', 'Marín', '1995-01-30', 'MASCULINO', '3001110005', 'sebastian.marin@gmail.com', 'Calle 30 # 80-15', 'Compensar', '2026-09-11 17:40:46'),
(16, 21, 'CC', '1036000106', 'Camila', 'Restrepo', '1997-04-12', 'FEMENINO', '3001110006', 'camila.restrepo@hotmail.com', 'Carrera 80 # 45-11', 'Sura', '2026-09-11 17:40:46'),
(17, 22, 'CC', '1036000107', 'Nicolás', 'Arango', '1992-09-08', 'MASCULINO', '3001110007', 'nicolas.arango@gmail.com', 'Calle 12 # 34-56', 'Coomeva', '2026-09-11 17:40:46'),
(18, 23, 'CC', '1036000108', 'Mariana', 'Zapata', '2000-06-25', 'FEMENINO', '3001110008', 'mariana.zapata@outlook.com', 'Carrera 65 # 50-30', 'Sura', '2026-09-11 17:40:46'),
(19, 24, 'CC', '1036000109', 'Alejandro', 'Henao', '1985-12-18', 'MASCULINO', '3001110009', 'alejandro.henao@yahoo.com', 'Calle 48 # 73-12', 'Sanitas', '2026-09-11 17:40:46'),
(20, 25, 'CC', '1036000110', 'Valeria', 'Duque', '1998-03-05', 'FEMENINO', '3001110010', 'valeria.duque@gmail.com', 'Carrera 52 # 40-22', 'Sura', '2026-09-11 17:40:46'),
(21, 26, 'CC', '1036000111', 'David', 'Buitrago', '1991-07-22', 'MASCULINO', '3001110011', 'david.buitrago@hotmail.com', 'Calle 55 # 68-04', 'Sura', '2026-09-11 17:40:46'),
(22, 27, 'CC', '1036000112', 'Isabella', 'Gómez', '1996-10-14', 'FEMENINO', '3001110012', 'isabella.gomez@outlook.com', 'Carrera 43A # 12-05', 'Compensar', '2026-09-11 17:40:46'),
(23, 28, 'TI', '1036000113', 'Samuel', 'Cano', '2011-05-19', 'MASCULINO', '3001110013', 'samuel.cano@gmail.com', 'Calle 33 # 75-40', 'Sura', '2026-09-11 17:40:46'),
(24, 29, 'CC', '1036000114', 'Gabriela', 'Echeverri', '1994-08-31', 'FEMENINO', '3001110014', 'gabriela.echeverri@yahoo.com', 'Carrera 76 # 42-18', 'Sanitas', '2026-09-11 17:40:46'),
(25, 30, 'CC', '1036000115', 'Tomás', 'Vélez', '1989-11-27', 'MASCULINO', '3001110015', 'tomas.velez@hotmail.com', 'Calle 10A # 30-12', 'Coomeva', '2026-09-11 17:40:46'),
(26, 31, 'CC', '1036000116', 'Luciana', 'Mejía', '2002-01-16', 'FEMENINO', '3001110016', 'luciana.mejia@gmail.com', 'Carrera 81 # 35-50', 'Sura', '2026-09-11 17:40:46'),
(27, 32, 'CC', '1036000117', 'Santiago', 'Bedoya', '1993-04-03', 'MASCULINO', '3001110017', 'santiago.bedoya@outlook.com', 'Calle 49 # 63-25', 'Sura', '2026-09-11 17:40:46'),
(28, 33, 'CC', '1036000118', 'Sofía', 'Correa', '1990-09-12', 'FEMENINO', '3001110018', 'sofia.correa@yahoo.com', 'Carrera 50 # 80-10', 'Compensar', '2026-09-11 17:40:46'),
(29, 34, 'CC', '1036000119', 'Juan Pablo', 'Ríos', '1997-02-28', 'MASCULINO', '3001110019', 'juan.pablo.rios@gmail.com', 'Calle 53 # 45-33', 'Sanitas', '2026-09-11 17:40:46'),
(30, 35, 'TI', '1036000120', 'Salomé', 'Vargas', '2013-06-10', 'FEMENINO', '3001110020', 'salome.vargas@hotmail.com', 'Carrera 68 # 49-15', 'Sura', '2026-09-11 17:40:46'),
(31, 36, 'CC', '1036000121', 'Emilio', 'Muñoz', '1992-12-01', 'MASCULINO', '3001110021', 'emilio.munoz@outlook.com', 'Calle 32 # 70-12', 'Sura', '2026-09-11 17:40:46'),
(32, 37, 'CC', '1036000122', 'Renata', 'Flórez', '1995-07-17', 'FEMENINO', '3001110022', 'renata.florez@gmail.com', 'Carrera 42 # 54-20', 'Coomeva', '2026-09-11 17:40:46'),
(33, 38, 'CC', '1036000123', 'Lucas', 'Agudelo', '1986-03-22', 'MASCULINO', '3001110023', 'lucas.agudelo@yahoo.com', 'Calle 11 # 43B-05', 'Sura', '2026-09-11 17:40:46'),
(34, 39, 'CC', '1036000124', 'Antonia', 'Giraldo', '1988-10-09', 'FEMENINO', '3001110024', 'antonia.giraldo@hotmail.com', 'Carrera 75 # 25-14', 'Sanitas', '2026-09-11 17:40:46'),
(35, 40, 'CC', '1036000125', 'Pablo', 'Saldarriaga', '1994-05-11', 'MASCULINO', '3001110025', 'pablo.saldarriaga@gmail.com', 'Calle 45 # 65-30', 'Sura', '2026-09-11 17:40:46'),
(36, 41, 'CC', '1036000126', 'Manuela', 'Castrillón', '1998-11-23', 'FEMENINO', '3001110026', 'manuela.castrillon@outlook.com', 'Carrera 51 # 38-12', 'Compensar', '2026-09-11 17:40:46'),
(37, 42, 'CC', '1036000127', 'Joaquín', 'Posada', '1991-08-04', 'MASCULINO', '3001110027', 'joaquin.posada@yahoo.com', 'Calle 30A # 82-10', 'Sura', '2026-09-11 17:40:46'),
(38, 43, 'CC', '1036000128', 'Victoria', 'Hoyos', '2001-02-15', 'FEMENINO', '3001110028', 'victoria.hoyos@gmail.com', 'Carrera 63 # 48-55', 'Sanitas', '2026-09-11 17:40:46'),
(39, 44, 'CC', '1036000129', 'Martín', 'Tobón', '1993-09-30', 'MASCULINO', '3001110029', 'martin.tobon@hotmail.com', 'Calle 52 # 70-14', 'Sura', '2026-09-11 17:40:46'),
(40, 45, 'CC', '1036000130', 'Alicia', 'Quintero', '1987-04-18', 'FEMENINO', '3001110030', 'alicia.quintero@outlook.com', 'Carrera 48 # 10-05', 'Coomeva', '2026-09-11 17:40:46'),
(41, 46, 'CC', '1036000131', 'Emmanuel', 'Valencia', '1996-01-25', 'MASCULINO', '3001110031', 'emmanuel.valencia@gmail.com', 'Calle 10 # 38-20', 'Sura', '2026-09-11 17:40:46'),
(42, 47, 'TI', '1036000132', 'Guadalupe', 'Usme', '2012-10-12', 'FEMENINO', '3001110032', 'guadalupe.usme@yahoo.com', 'Carrera 72 # 35-40', 'Sura', '2026-09-11 17:40:46'),
(43, 48, 'CC', '1036000133', 'Simón', 'Rendón', '1990-03-08', 'MASCULINO', '3001110033', 'simon.rendon@hotmail.com', 'Calle 49 # 78-15', 'Sanitas', '2026-09-11 17:40:46'),
(44, 49, 'CC', '1036000134', 'Milena', 'Villegas', '1995-12-05', 'FEMENINO', '3001110034', 'milena.villegas@gmail.com', 'Carrera 80 # 50-22', 'Compensar', '2026-09-11 17:40:46'),
(45, 50, 'CC', '1036000135', 'Rodrigo', 'Palacio', '1989-06-20', 'MASCULINO', '3001110035', 'rodrigo.palacio@outlook.com', 'Calle 33 # 65-12', 'Sura', '2026-09-11 17:40:46'),
(46, 51, 'CC', '1036000136', 'Elena', 'Tamayo', '1997-08-14', 'FEMENINO', '3001110036', 'elena.tamayo@yahoo.com', 'Carrera 43A # 18-30', 'Sura', '2026-09-11 17:40:46'),
(47, 52, 'CC', '1036000137', 'Gabriel', 'Monsalve', '1992-05-02', 'MASCULINO', '3001110037', 'gabriel.monsalve@gmail.com', 'Calle 50 # 75-10', 'Coomeva', '2026-09-11 17:40:46'),
(48, 53, 'CC', '1036000138', 'Cecilia', 'Botero', '1984-11-19', 'FEMENINO', '3001110038', 'cecilia.botero@hotmail.com', 'Carrera 65 # 30-40', 'Sanitas', '2026-09-11 17:40:46'),
(49, 54, 'CC', '1036000139', 'Felipe', 'Álvarez', '1993-07-07', 'MASCULINO', '3001110039', 'felipe.alvarez@outlook.com', 'Calle 12 # 43-25', 'Sura', '2026-09-11 17:40:46'),
(50, 55, 'CC', '1036000140', 'Andrea', 'Osorio', '1998-02-11', 'FEMENINO', '3001110040', 'andrea.osorio@gmail.com', 'Carrera 70 # 45-18', 'Compensar', '2026-09-11 17:40:46');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `paciente_venta`
--

CREATE TABLE `paciente_venta` (
  `id_paciente` int(11) NOT NULL,
  `id_venta` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `paciente_venta`
--

INSERT INTO `paciente_venta` (`id_paciente`, `id_venta`) VALUES
(11, 1),
(12, 2),
(13, 3),
(14, 4),
(15, 5),
(16, 6),
(17, 7),
(18, 8),
(19, 9),
(20, 10),
(21, 11),
(22, 12),
(23, 13),
(24, 14),
(25, 15),
(26, 16),
(27, 17),
(28, 18),
(29, 19),
(30, 20),
(31, 21),
(32, 22),
(33, 23),
(34, 24),
(35, 25),
(36, 26),
(37, 27),
(38, 28),
(39, 29),
(40, 30),
(41, 31),
(42, 32),
(43, 33),
(44, 34),
(45, 35),
(46, 36),
(47, 37),
(48, 38),
(49, 39),
(50, 40);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pago_venta`
--

CREATE TABLE `pago_venta` (
  `id_pago` int(11) NOT NULL,
  `id_venta` int(11) NOT NULL,
  `id_metodo` int(11) NOT NULL,
  `monto_abonado` decimal(12,2) NOT NULL,
  `numero_cuota_actual` int(11) DEFAULT 1,
  `fecha_pago` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pago_venta`
--

INSERT INTO `pago_venta` (`id_pago`, `id_venta`, `id_metodo`, `monto_abonado`, `numero_cuota_actual`, `fecha_pago`) VALUES
(1, 1, 3, 50000.00, 1, '2026-09-11 17:47:22'),
(2, 2, 4, 150000.00, 1, '2026-09-11 17:47:22'),
(3, 3, 4, 50000.00, 1, '2026-09-11 18:23:18'),
(4, 4, 1, 150000.00, 1, '2026-09-11 18:23:18'),
(5, 5, 2, 50000.00, 1, '2026-09-11 18:23:18'),
(6, 6, 3, 150000.00, 1, '2026-09-11 18:23:18'),
(7, 7, 4, 50000.00, 1, '2026-09-11 18:23:18'),
(8, 8, 1, 150000.00, 1, '2026-09-11 18:23:18'),
(9, 9, 2, 50000.00, 1, '2026-09-11 18:23:18'),
(10, 10, 3, 150000.00, 1, '2026-09-11 18:23:18'),
(11, 11, 4, 50000.00, 1, '2026-09-11 18:23:18'),
(12, 12, 1, 150000.00, 1, '2026-09-11 18:23:18'),
(13, 13, 2, 50000.00, 1, '2026-09-11 18:23:18'),
(14, 14, 3, 150000.00, 1, '2026-09-11 18:23:18'),
(15, 15, 4, 50000.00, 1, '2026-09-11 18:23:18'),
(16, 16, 1, 150000.00, 1, '2026-09-11 18:23:18'),
(17, 17, 2, 50000.00, 1, '2026-09-11 18:23:18'),
(18, 18, 3, 150000.00, 1, '2026-09-11 18:23:18'),
(19, 19, 4, 50000.00, 1, '2026-09-11 18:23:18'),
(20, 20, 1, 150000.00, 1, '2026-09-11 18:23:18'),
(21, 21, 2, 50000.00, 1, '2026-09-11 18:23:18'),
(22, 22, 3, 150000.00, 1, '2026-09-11 18:23:18'),
(23, 23, 4, 50000.00, 1, '2026-09-11 18:23:18'),
(24, 24, 1, 150000.00, 1, '2026-09-11 18:23:18'),
(25, 25, 2, 50000.00, 1, '2026-09-11 18:23:18'),
(26, 26, 3, 150000.00, 1, '2026-09-11 18:23:18'),
(27, 27, 4, 50000.00, 1, '2026-09-11 18:23:18'),
(28, 28, 1, 150000.00, 1, '2026-09-11 18:23:18'),
(29, 29, 2, 50000.00, 1, '2026-09-11 18:23:18'),
(30, 30, 3, 150000.00, 1, '2026-09-11 18:23:18'),
(31, 31, 4, 50000.00, 1, '2026-09-11 18:23:18'),
(32, 32, 1, 150000.00, 1, '2026-09-11 18:23:18'),
(33, 33, 2, 50000.00, 1, '2026-09-11 18:23:18'),
(34, 34, 3, 150000.00, 1, '2026-09-11 18:23:18'),
(35, 35, 4, 50000.00, 1, '2026-09-11 18:23:18'),
(36, 36, 1, 150000.00, 1, '2026-09-11 18:23:18'),
(37, 37, 2, 50000.00, 1, '2026-09-11 18:23:18'),
(38, 38, 3, 150000.00, 1, '2026-09-11 18:23:18'),
(39, 39, 4, 50000.00, 1, '2026-09-11 18:23:18'),
(40, 40, 1, 150000.00, 1, '2026-09-11 18:23:18');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permiso`
--

CREATE TABLE `permiso` (
  `id_permiso` int(11) NOT NULL,
  `nombre_permiso` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `permiso`
--

INSERT INTO `permiso` (`id_permiso`, `nombre_permiso`, `descripcion`) VALUES
(1, 'CREAR_CITA', 'Permite agendar nuevas citas en el sistema'),
(2, 'CANCELAR_CITA', 'Permite cancelar citas existentes'),
(3, 'VER_HISTORIA_CLINICA', 'Acceso a la lectura de historias clínicas'),
(4, 'EDITAR_HISTORIA_CLINICA', 'Permite registrar hallazgos y diagnósticos'),
(5, 'GESTIONAR_USUARIOS', 'Acceso total para crear y modificar usuarios'),
(6, 'REGISTRAR_PAGO', 'Permite procesar pagos y facturación');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `personal`
--

CREATE TABLE `personal` (
  `id_personal` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `tipo_documento` varchar(10) NOT NULL,
  `numero_documento` varchar(20) NOT NULL,
  `nombres` varchar(100) NOT NULL,
  `apellidos` varchar(100) NOT NULL,
  `cargo` varchar(50) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `personal`
--

INSERT INTO `personal` (`id_personal`, `id_usuario`, `tipo_documento`, `numero_documento`, `nombres`, `apellidos`, `cargo`, `telefono`) VALUES
(1, 1, 'CC', '1010101001', 'Laura', 'Gómez', 'Administradora', '3009990001'),
(2, 2, 'CC', '1010101002', 'Carlos', 'Pérez', 'Recepcionista', '3009990002'),
(3, 3, 'CC', '1010101003', 'Dr. Roberto', 'Martínez', 'Odontólogo General', '3009990003'),
(4, 4, 'CC', '1010101004', 'Dra. Sofía', 'López', 'Ortodoncista', '3009990004'),
(5, 5, 'CC', '1010101005', 'Dr. Andrés', 'Ramírez', 'Endodoncista', '3009990005');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rol`
--

CREATE TABLE `rol` (
  `id_rol` int(11) NOT NULL,
  `nombre_rol` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `rol`
--

INSERT INTO `rol` (`id_rol`, `nombre_rol`, `descripcion`) VALUES
(1, 'ADMINISTRADOR', 'Acceso total al sistema'),
(2, 'RECEPCIONISTA', 'Gestión de citas y pacientes'),
(3, 'ESPECIALISTA', 'Atención médica y odontograma'),
(4, 'PACIENTE', 'Acceso al portal del paciente');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `rol_permiso`
--

CREATE TABLE `rol_permiso` (
  `id_rol` int(11) NOT NULL,
  `id_permiso` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `rol_permiso`
--

INSERT INTO `rol_permiso` (`id_rol`, `id_permiso`) VALUES
(1, 1),
(1, 2),
(1, 3),
(1, 4),
(1, 5),
(1, 6),
(2, 1),
(2, 3),
(2, 4),
(3, 1),
(3, 2),
(3, 6);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `servicio`
--

CREATE TABLE `servicio` (
  `id_servicio` int(11) NOT NULL,
  `codigo_servicio` varchar(20) NOT NULL,
  `nombre_servicio` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio_base` decimal(12,2) NOT NULL,
  `estado` varchar(20) DEFAULT 'ACTIVO'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `servicio`
--

INSERT INTO `servicio` (`id_servicio`, `codigo_servicio`, `nombre_servicio`, `descripcion`, `precio_base`, `estado`) VALUES
(1, 'SERV-001', 'Valoración General', 'Consulta inicial y diagnóstico', 50000.00, 'ACTIVO'),
(2, 'SERV-002', 'Limpieza Dental Profunda', 'Profilaxis y detartraje', 120000.00, 'ACTIVO'),
(3, 'SERV-003', 'Calza / Resina Estética', 'Obturación en resina fotocurable', 90000.00, 'ACTIVO'),
(4, 'SERV-004', 'Tratamiento de Conducto', 'Endodoncia unirradicular', 350000.00, 'ACTIVO'),
(5, 'SERV-005', 'Diseño de Sonrisa', 'Carillas estéticas', 1500000.00, 'ACTIVO');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL,
  `id_rol` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `estado` varchar(20) DEFAULT 'ACTIVO',
  `fecha_creacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `id_rol`, `email`, `password_hash`, `estado`, `fecha_creacion`) VALUES
(1, 1, 'admin@dentalcare.com', 'Admin2026*', 'ACTIVO', '2026-09-11 17:50:59'),
(2, 2, 'recepcion@dentalcare.com', 'Recep2026*', 'ACTIVO', '2026-09-11 17:50:59'),
(3, 3, 'dr.roberto@dentalcare.com', 'DocRoberto2026*', 'ACTIVO', '2026-09-11 17:50:59'),
(4, 3, 'dra.sofia@dentalcare.com', 'DocSofia2026*', 'ACTIVO', '2026-09-11 17:50:59'),
(5, 3, 'dr.andres@dentalcare.com', 'DocAndres2026*', 'ACTIVO', '2026-09-11 17:50:59'),
(16, 4, 'andres.galvis@gmail.com', 'AndresG2026*', 'ACTIVO', '2026-09-11 17:40:31'),
(17, 4, 'carolina.villa@hotmail.com', 'CaroVilla123*', 'ACTIVO', '2026-09-11 17:40:31'),
(18, 4, 'mateo.londono@outlook.com', 'MateoL88*', 'ACTIVO', '2026-09-11 17:40:31'),
(19, 4, 'daniela.cardona@yahoo.com', 'DaniCardona99*', 'ACTIVO', '2026-09-11 17:40:31'),
(20, 4, 'sebastian.marin@gmail.com', 'SebaMarin123*', 'ACTIVO', '2026-09-11 17:40:31'),
(21, 4, 'camila.restrepo@hotmail.com', 'CamiRest2026*', 'ACTIVO', '2026-09-11 17:40:31'),
(22, 4, 'nicolas.arango@gmail.com', 'NicoArango77*', 'ACTIVO', '2026-09-11 17:40:31'),
(23, 4, 'mariana.zapata@outlook.com', 'MariZapata123*', 'ACTIVO', '2026-09-11 17:40:31'),
(24, 4, 'alejandro.henao@yahoo.com', 'AlejoHenao85*', 'ACTIVO', '2026-09-11 17:40:31'),
(25, 4, 'valeria.duque@gmail.com', 'ValeDuque2026*', 'ACTIVO', '2026-09-11 17:40:31'),
(26, 4, 'david.buitrago@hotmail.com', 'DavidBui123*', 'ACTIVO', '2026-09-11 17:40:31'),
(27, 4, 'isabella.gomez@outlook.com', 'IsaGomez95*', 'ACTIVO', '2026-09-11 17:40:31'),
(28, 4, 'samuel.cano@gmail.com', 'SamuCano2026*', 'ACTIVO', '2026-09-11 17:40:31'),
(29, 4, 'gabriela.echeverri@yahoo.com', 'GabiEcheverri123*', 'ACTIVO', '2026-09-11 17:40:31'),
(30, 4, 'tomas.velez@hotmail.com', 'TomasVelez88*', 'ACTIVO', '2026-09-11 17:40:31'),
(31, 4, 'luciana.mejia@gmail.com', 'LuciMejia2026*', 'ACTIVO', '2026-09-11 17:40:31'),
(32, 4, 'santiago.bedoya@outlook.com', 'SantiBedoya123*', 'ACTIVO', '2026-09-11 17:40:31'),
(33, 4, 'sofia.correa@yahoo.com', 'SofiCorrea90*', 'ACTIVO', '2026-09-11 17:40:31'),
(34, 4, 'juan.pablo.rios@gmail.com', 'JuanPRios2026*', 'ACTIVO', '2026-09-11 17:40:31'),
(35, 4, 'salome.vargas@hotmail.com', 'SaloVargas123*', 'ACTIVO', '2026-09-11 17:40:31'),
(36, 4, 'emilio.munoz@outlook.com', 'EmilioM92*', 'ACTIVO', '2026-09-11 17:40:31'),
(37, 4, 'renata.florez@gmail.com', 'RenataF2026*', 'ACTIVO', '2026-09-11 17:40:31'),
(38, 4, 'lucas.agudelo@yahoo.com', 'LucasAgu123*', 'ACTIVO', '2026-09-11 17:40:31'),
(39, 4, 'antonia.giraldo@hotmail.com', 'AntoGiraldo88*', 'ACTIVO', '2026-09-11 17:40:31'),
(40, 4, 'pablo.saldarriaga@gmail.com', 'PabloSal2026*', 'ACTIVO', '2026-09-11 17:40:31'),
(41, 4, 'manuela.castrillon@outlook.com', 'ManuCastri123*', 'ACTIVO', '2026-09-11 17:40:31'),
(42, 4, 'joaquin.posada@yahoo.com', 'JoacoPosada94*', 'ACTIVO', '2026-09-11 17:40:31'),
(43, 4, 'victoria.hoyos@gmail.com', 'VickyHoyos2026*', 'ACTIVO', '2026-09-11 17:40:31'),
(44, 4, 'martin.tobon@hotmail.com', 'MartinTobon123*', 'ACTIVO', '2026-09-11 17:40:31'),
(45, 4, 'alicia.quintero@outlook.com', 'AliciaQuin86*', 'ACTIVO', '2026-09-11 17:40:31'),
(46, 4, 'emmanuel.valencia@gmail.com', 'EmmanVal2026*', 'ACTIVO', '2026-09-11 17:40:31'),
(47, 4, 'guadalupe.usme@yahoo.com', 'LupeUsme123*', 'ACTIVO', '2026-09-11 17:40:31'),
(48, 4, 'simon.rendon@hotmail.com', 'SimonRendon91*', 'ACTIVO', '2026-09-11 17:40:31'),
(49, 4, 'milena.villegas@gmail.com', 'MileVille2026*', 'ACTIVO', '2026-09-11 17:40:31'),
(50, 4, 'rodrigo.palacio@outlook.com', 'RodriPala123*', 'ACTIVO', '2026-09-11 17:40:31'),
(51, 4, 'elena.tamayo@yahoo.com', 'ElenaTamayo87*', 'ACTIVO', '2026-09-11 17:40:31'),
(52, 4, 'gabriel.monsalve@gmail.com', 'GabiMon2026*', 'ACTIVO', '2026-09-11 17:40:31'),
(53, 4, 'cecilia.botero@hotmail.com', 'CeciBotero123*', 'ACTIVO', '2026-09-11 17:40:31'),
(54, 4, 'felipe.alvarez@outlook.com', 'PipeAlvarez93*', 'ACTIVO', '2026-09-11 17:40:31'),
(55, 4, 'andrea.osorio@gmail.com', 'AndreOsorio2026*', 'ACTIVO', '2026-09-11 17:40:31');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `venta`
--

CREATE TABLE `venta` (
  `id_venta` int(11) NOT NULL,
  `id_paciente` int(11) NOT NULL,
  `monto_total` decimal(12,2) NOT NULL,
  `monto_pagado` decimal(12,2) DEFAULT 0.00,
  `saldo_pendiente` decimal(12,2) GENERATED ALWAYS AS (`monto_total` - `monto_pagado`) STORED,
  `modalidad_pago` varchar(20) NOT NULL,
  `numero_cuotas` int(11) DEFAULT 1,
  `estado_venta` varchar(20) DEFAULT 'PENDIENTE',
  `fecha_venta` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `venta`
--

INSERT INTO `venta` (`id_venta`, `id_paciente`, `monto_total`, `monto_pagado`, `modalidad_pago`, `numero_cuotas`, `estado_venta`, `fecha_venta`) VALUES
(1, 11, 140000.00, 50000.00, 'CONTADO', 1, 'PENDIENTE', '2026-09-11 17:47:13'),
(2, 12, 350000.00, 150000.00, 'CREDITO', 3, 'PAGADO', '2026-09-11 17:47:13'),
(3, 13, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(4, 14, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(5, 15, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(6, 16, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(7, 17, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(8, 18, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(9, 19, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(10, 20, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(11, 21, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(12, 22, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(13, 23, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(14, 24, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(15, 25, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(16, 26, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(17, 27, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(18, 28, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(19, 29, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(20, 30, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(21, 31, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(22, 32, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(23, 33, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(24, 34, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(25, 35, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(26, 36, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(27, 37, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(28, 38, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(29, 39, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(30, 40, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(31, 41, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(32, 42, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(33, 43, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(34, 44, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(35, 45, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(36, 46, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(37, 47, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(38, 48, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58'),
(39, 49, 150000.00, 50000.00, 'CREDITO', 3, 'PENDIENTE', '2026-09-11 18:22:58'),
(40, 50, 150000.00, 150000.00, 'CONTADO', 1, 'PAGADO', '2026-09-11 18:22:58');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `cita`
--
ALTER TABLE `cita`
  ADD PRIMARY KEY (`id_cita`),
  ADD KEY `fk_cita_paciente` (`id_paciente`),
  ADD KEY `fk_cita_especialista` (`id_especialista`);

--
-- Indices de la tabla `consulta`
--
ALTER TABLE `consulta`
  ADD PRIMARY KEY (`id_consulta`),
  ADD UNIQUE KEY `id_cita` (`id_cita`);

--
-- Indices de la tabla `diente`
--
ALTER TABLE `diente`
  ADD PRIMARY KEY (`id_diente`),
  ADD UNIQUE KEY `numero_fdi` (`numero_fdi`);

--
-- Indices de la tabla `especialista`
--
ALTER TABLE `especialista`
  ADD PRIMARY KEY (`id_especialista`),
  ADD UNIQUE KEY `id_personal` (`id_personal`),
  ADD UNIQUE KEY `registro_medico` (`registro_medico`);

--
-- Indices de la tabla `historia_clinica`
--
ALTER TABLE `historia_clinica`
  ADD PRIMARY KEY (`id_historia`),
  ADD UNIQUE KEY `id_paciente` (`id_paciente`);

--
-- Indices de la tabla `horario`
--
ALTER TABLE `horario`
  ADD PRIMARY KEY (`id_horario`),
  ADD KEY `fk_horario_especialista` (`id_especialista`);

--
-- Indices de la tabla `log_auditoria`
--
ALTER TABLE `log_auditoria`
  ADD PRIMARY KEY (`id_log`),
  ADD KEY `fk_log_usuario` (`id_usuario`);

--
-- Indices de la tabla `metodo_pago`
--
ALTER TABLE `metodo_pago`
  ADD PRIMARY KEY (`id_metodo`),
  ADD UNIQUE KEY `nombre_metodo` (`nombre_metodo`);

--
-- Indices de la tabla `novedad_operativa`
--
ALTER TABLE `novedad_operativa`
  ADD PRIMARY KEY (`id_novedad`),
  ADD KEY `fk_novedad_personal` (`id_personal`);

--
-- Indices de la tabla `odontograma`
--
ALTER TABLE `odontograma`
  ADD PRIMARY KEY (`id_odontograma`),
  ADD KEY `fk_odontograma_historia` (`id_historia`),
  ADD KEY `fk_odontograma_diente` (`id_diente`);

--
-- Indices de la tabla `paciente`
--
ALTER TABLE `paciente`
  ADD PRIMARY KEY (`id_paciente`),
  ADD UNIQUE KEY `numero_documento` (`numero_documento`),
  ADD UNIQUE KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `paciente_venta`
--
ALTER TABLE `paciente_venta`
  ADD PRIMARY KEY (`id_paciente`,`id_venta`),
  ADD KEY `fk_pv_venta_rel` (`id_venta`);

--
-- Indices de la tabla `pago_venta`
--
ALTER TABLE `pago_venta`
  ADD PRIMARY KEY (`id_pago`),
  ADD KEY `fk_pv_venta` (`id_venta`),
  ADD KEY `fk_pv_metodo` (`id_metodo`);

--
-- Indices de la tabla `permiso`
--
ALTER TABLE `permiso`
  ADD PRIMARY KEY (`id_permiso`),
  ADD UNIQUE KEY `nombre_permiso` (`nombre_permiso`);

--
-- Indices de la tabla `personal`
--
ALTER TABLE `personal`
  ADD PRIMARY KEY (`id_personal`),
  ADD UNIQUE KEY `id_usuario` (`id_usuario`),
  ADD UNIQUE KEY `numero_documento` (`numero_documento`);

--
-- Indices de la tabla `rol`
--
ALTER TABLE `rol`
  ADD PRIMARY KEY (`id_rol`),
  ADD UNIQUE KEY `nombre_rol` (`nombre_rol`);

--
-- Indices de la tabla `rol_permiso`
--
ALTER TABLE `rol_permiso`
  ADD PRIMARY KEY (`id_rol`,`id_permiso`),
  ADD KEY `fk_rp_permiso` (`id_permiso`);

--
-- Indices de la tabla `servicio`
--
ALTER TABLE `servicio`
  ADD PRIMARY KEY (`id_servicio`),
  ADD UNIQUE KEY `codigo_servicio` (`codigo_servicio`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_usuario_rol` (`id_rol`);

--
-- Indices de la tabla `venta`
--
ALTER TABLE `venta`
  ADD PRIMARY KEY (`id_venta`),
  ADD KEY `fk_venta_paciente` (`id_paciente`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `cita`
--
ALTER TABLE `cita`
  MODIFY `id_cita` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT de la tabla `consulta`
--
ALTER TABLE `consulta`
  MODIFY `id_consulta` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT de la tabla `especialista`
--
ALTER TABLE `especialista`
  MODIFY `id_especialista` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `historia_clinica`
--
ALTER TABLE `historia_clinica`
  MODIFY `id_historia` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT de la tabla `horario`
--
ALTER TABLE `horario`
  MODIFY `id_horario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `log_auditoria`
--
ALTER TABLE `log_auditoria`
  MODIFY `id_log` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `metodo_pago`
--
ALTER TABLE `metodo_pago`
  MODIFY `id_metodo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `novedad_operativa`
--
ALTER TABLE `novedad_operativa`
  MODIFY `id_novedad` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `odontograma`
--
ALTER TABLE `odontograma`
  MODIFY `id_odontograma` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `paciente`
--
ALTER TABLE `paciente`
  MODIFY `id_paciente` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT de la tabla `pago_venta`
--
ALTER TABLE `pago_venta`
  MODIFY `id_pago` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT de la tabla `permiso`
--
ALTER TABLE `permiso`
  MODIFY `id_permiso` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `personal`
--
ALTER TABLE `personal`
  MODIFY `id_personal` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `rol`
--
ALTER TABLE `rol`
  MODIFY `id_rol` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `servicio`
--
ALTER TABLE `servicio`
  MODIFY `id_servicio` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT de la tabla `venta`
--
ALTER TABLE `venta`
  MODIFY `id_venta` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `cita`
--
ALTER TABLE `cita`
  ADD CONSTRAINT `fk_cita_especialista` FOREIGN KEY (`id_especialista`) REFERENCES `especialista` (`id_especialista`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cita_paciente` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `consulta`
--
ALTER TABLE `consulta`
  ADD CONSTRAINT `fk_consulta_cita` FOREIGN KEY (`id_cita`) REFERENCES `cita` (`id_cita`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `especialista`
--
ALTER TABLE `especialista`
  ADD CONSTRAINT `fk_especialista_personal` FOREIGN KEY (`id_personal`) REFERENCES `personal` (`id_personal`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `historia_clinica`
--
ALTER TABLE `historia_clinica`
  ADD CONSTRAINT `fk_historia_paciente` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `horario`
--
ALTER TABLE `horario`
  ADD CONSTRAINT `fk_horario_especialista` FOREIGN KEY (`id_especialista`) REFERENCES `especialista` (`id_especialista`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `log_auditoria`
--
ALTER TABLE `log_auditoria`
  ADD CONSTRAINT `fk_log_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `novedad_operativa`
--
ALTER TABLE `novedad_operativa`
  ADD CONSTRAINT `fk_novedad_personal` FOREIGN KEY (`id_personal`) REFERENCES `personal` (`id_personal`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `odontograma`
--
ALTER TABLE `odontograma`
  ADD CONSTRAINT `fk_odontograma_diente` FOREIGN KEY (`id_diente`) REFERENCES `diente` (`id_diente`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_odontograma_historia` FOREIGN KEY (`id_historia`) REFERENCES `historia_clinica` (`id_historia`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `paciente`
--
ALTER TABLE `paciente`
  ADD CONSTRAINT `fk_paciente_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `paciente_venta`
--
ALTER TABLE `paciente_venta`
  ADD CONSTRAINT `fk_pv_paciente` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pv_venta_rel` FOREIGN KEY (`id_venta`) REFERENCES `venta` (`id_venta`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `pago_venta`
--
ALTER TABLE `pago_venta`
  ADD CONSTRAINT `fk_pv_metodo` FOREIGN KEY (`id_metodo`) REFERENCES `metodo_pago` (`id_metodo`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pv_venta` FOREIGN KEY (`id_venta`) REFERENCES `venta` (`id_venta`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `personal`
--
ALTER TABLE `personal`
  ADD CONSTRAINT `fk_personal_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `rol_permiso`
--
ALTER TABLE `rol_permiso`
  ADD CONSTRAINT `fk_rp_permiso` FOREIGN KEY (`id_permiso`) REFERENCES `permiso` (`id_permiso`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rp_rol` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`id_rol`) REFERENCES `rol` (`id_rol`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `venta`
--
ALTER TABLE `venta`
  ADD CONSTRAINT `fk_venta_paciente` FOREIGN KEY (`id_paciente`) REFERENCES `paciente` (`id_paciente`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

USE dentalcare_bd;

-- ============================================================================
-- SECCIÓN: CONSULTAS Y OPERACIONES CRUD
-- Proyecto: DentalCare BD
-- Descripción: Sentencias de Inserción, Lectura, Actualización y Borrado.
-- ============================================================================


USE dentalcare_bd;

-- ============================================================
-- TABLA 1: USUARIO
-- ============================================================

-- 1. Inserción (Create)
INSERT INTO USUARIO (id_rol, email, password_hash, estado, fecha_creacion) 
VALUES (2, 'nuevo.usuario@dentalcare.com', '$2a$12$eImiTXuWVxfM37uY4JANjOL.8bF9F9H6z8', 'ACTIVO', NOW());

-- 2. Selección (Read)
-- Selección de todos los usuarios
SELECT * FROM USUARIO;

-- Selección de un usuario específico por su correo
SELECT id_usuario, id_rol, email, estado, fecha_creacion 
FROM USUARIO 
WHERE email = 'nuevo.usuario@dentalcare.com';

-- 3. Actualización por campo estado (Update)
UPDATE USUARIO 
SET estado = 'INACTIVO' 
WHERE id_usuario = 6;

-- 4. Borrado (Delete)
DELETE FROM USUARIO 
WHERE id_usuario = 6;


-- ============================================================================
-- TABLA 2: ROL
-- ============================================================================

-- 2.1. Inserción (Create)
INSERT INTO ROL (nombre_rol, descripcion) 
VALUES ('Auditor', 'Acceso de solo lectura para auditorías del sistema');

-- 2.2. Selección (Read)
SELECT * FROM ROL;

-- 2.3. Actualización (Update)
UPDATE ROL 
SET descripcion = 'Acceso exclusivo de lectura y control de logs' 
WHERE nombre_rol = 'Auditor';

-- 2.4. Borrado (Delete)
DELETE FROM ROL 
WHERE nombre_rol = 'Auditor';


-- ============================================================================
-- TABLA 3: PERMISO
-- ============================================================================

-- 3.1. Inserción (Create)
INSERT INTO PERMISO (nombre_permiso, descripcion) 
VALUES ('EXPORTAR_REPORTES', 'Permite descargar reportes del sistema en Excel o PDF');

-- 3.2. Selección (Read)
SELECT * FROM PERMISO;

-- 3.3. Actualización (Update)
UPDATE PERMISO 
SET descripcion = 'Permite la exportación de informes analíticos' 
WHERE nombre_permISO = 'EXPORTAR_REPORTES';

-- 3.4. Borrado (Delete)
DELETE FROM PERMISO 
WHERE nombre_permISO = 'EXPORTAR_REPORTES';


-- ============================================================================
-- TABLA 4: ROL_PERMISO
-- ============================================================================

-- 4.1. Inserción (Create)
INSERT INTO ROL_PERMISO (id_rol, id_permiso) 
VALUES (1, 6);

-- 4.2. Selección (Read)
SELECT 
    R.nombre_rol, 
    P.nombre_permiso 
FROM ROL_PERMISO RP
JOIN ROL R ON RP.id_rol = R.id_rol
JOIN PERMISO P ON RP.id_permiso = P.id_permiso;

-- 4.3. Borrado / Revocación de Permiso (Delete)
DELETE FROM ROL_PERMISO 
WHERE id_rol = 1 AND id_permiso = 6;


-- ============================================================================
-- TABLA 5: PERSONAL
-- ============================================================================

-- 5.1. Inserción (Create)
INSERT INTO PERSONAL (id_usuario, tipo_documento, numero_documento, nombres, apellidos, cargo, telefono) 
VALUES (2, 'CC', '1098765432', 'Mariana', 'Ríos', 'Recepcionista', '3008889900');

-- 5.2. Selección (Read)
SELECT * FROM PERSONAL;

-- 5.3. Actualización por el campo estado (Update indirecto vía USUARIO)
UPDATE USUARIO 
SET estado = 'INACTIVO' 
WHERE id_usuario = (SELECT id_usuario FROM PERSONAL WHERE id_personal = 2);

-- 5.4. Borrado (Delete)
DELETE FROM PERSONAL 
WHERE id_personal = 6;


-- ============================================================================
-- TABLA 6: ESPECIALISTA
-- ============================================================================

-- 6.1. Inserción (Create)
INSERT INTO ESPECIALISTA (id_personal, especialidad, registro_medico) 
VALUES (3, 'Odontopediatría', 'RM-998877');

-- 6.2. Selección (Read)
SELECT 
    E.id_especialista,
    CONCAT(P.nombres, ' ', P.apellidos) AS especialista,
    E.especialidad,
    E.registro_medico
FROM ESPECIALISTA E
JOIN PERSONAL P ON E.id_personal = P.id_personal;

-- 6.3. Actualización (Update)
UPDATE ESPECIALISTA 
SET especialidad = 'Odontopediatría y Ortodoncia' 
WHERE id_especialista = 4;

-- 6.4. Borrado (Delete)
DELETE FROM ESPECIALISTA 
WHERE id_especialista = 4;


-- ============================================================================
-- TABLA 7: HORARIO
-- ============================================================================

-- 7.1. Inserción (Create)
INSERT INTO HORARIO (id_especialista, dia_semana, hora_inicio, hora_fin) 
VALUES (1, 'SABADO', '08:00:00', '12:00:00');

-- 7.2. Selección (Read)
SELECT 
    H.id_horario,
    CONCAT(P.nombres, ' ', P.apellidos) AS especialista,
    H.dia_semana,
    H.hora_inicio,
    H.hora_fin
FROM HORARIO H
JOIN ESPECIALISTA E ON H.id_especialista = E.id_especialista
JOIN PERSONAL P ON E.id_personal = P.id_personal;

-- 7.3. Actualización (Update)
UPDATE HORARIO 
SET hora_fin = '13:00:00' 
WHERE id_horario = 1;

-- 7.4. Borrado (Delete)
DELETE FROM HORARIO 
WHERE id_horario = 6;


-- ============================================================================
-- TABLA 8: PACIENTE
-- ============================================================================

-- 8.1. Inserción (Create)
INSERT INTO PACIENTE (tipo_documento, numero_documento, nombres, apellidos, fecha_nacimiento, genero, telefono, email, direccion, estado) 
VALUES ('CC', '1035999888', 'Andrea', 'Morales', '1995-04-12', 'F', '3115554433', 'andrea.morales@email.com', 'Calle 10 #43-12', 'ACTIVO');

-- 8.2. Selección (Read)
SELECT * FROM PACIENTE;

-- 8.3. Actualización por el campo estado (Update)
UPDATE PACIENTE 
SET estado = 'INACTIVO' 
WHERE id_paciente = 10;

-- 8.4. Borrado (Delete)
DELETE FROM PACIENTE 
WHERE id_paciente = 10;


-- ============================================================================
-- TABLA 9: HISTORIA_CLINICA
-- ============================================================================

-- 9.1. Inserción (Create)
INSERT INTO HISTORIA_CLINICA (id_paciente, fecha_apertura, antecedentes_medicos, alergias) 
VALUES (1, NOW(), 'Hipertensión controlada', 'Alergia a la Penicilina');

-- 9.2. Selección (Read)
SELECT 
    HC.id_historia,
    CONCAT(P.nombres, ' ', P.apellidos) AS paciente,
    P.numero_documento,
    HC.fecha_apertura,
    HC.antecedentes_medicos,
    HC.alergias
FROM HISTORIA_CLINICA HC
JOIN PACIENTE P ON HC.id_paciente = P.id_paciente;

-- 9.3. Actualización (Update)
UPDATE HISTORIA_CLINICA 
SET antecedentes_medicos = 'Sin antecedentes de importancia', alergias = 'Ninguna conocida' 
WHERE id_historia = 1;

-- 9.4. Borrado (Delete)
DELETE FROM HISTORIA_CLINICA 
WHERE id_historia = 41;


-- ============================================================================
-- TABLA 10: NOVEDAD_OPERATIVA
-- ============================================================================

-- 10.1. Inserción (Create)
INSERT INTO NOVEDAD_OPERATIVA (id_usuario, tipo_novedad, descripcion, fecha_reporte) 
VALUES (2, 'FALLA_EQUIPO', 'Falla en la unidad odontológica del consultorio 2', NOW());

-- 10.2. Selección (Read)
SELECT 
    N.id_novedad,
    U.email AS reportado_por,
    N.tipo_novedad,
    N.descripcion,
    N.fecha_reporte
FROM NOVEDAD_OPERATIVA N
JOIN USUARIO U ON N.id_usuario = U.id_usuario;

-- 10.3. Actualización (Update)
UPDATE NOVEDAD_OPERATIVA 
SET descripcion = 'Falla corregida por mantenimiento técnico' 
WHERE id_novedad = 1;

-- 10.4. Borrado (Delete)
DELETE FROM NOVEDAD_OPERATIVA 
WHERE id_novedad = 1;


-- ============================================================================
-- TABLA 11: CITA
-- ============================================================================

-- 11.1. Inserción (Create)
INSERT INTO CITA (id_paciente, id_especialista, fecha_cita, hora_cita, motivo, estado) 
VALUES (1, 1, '2026-10-01', '09:00:00', 'Valoración odontológica inicial', 'PROGRAMADA');

-- 11.2. Selección (Read)
SELECT 
    C.id_cita,
    CONCAT(P.nombres, ' ', P.apellidos) AS paciente,
    CONCAT(PERS.nombres, ' ', PERS.apellidos) AS especialista,
    C.fecha_cita,
    C.hora_cita,
    C.motivo,
    C.estado
FROM CITA C
JOIN PACIENTE P ON C.id_paciente = P.id_paciente
JOIN ESPECIALISTA E ON C.id_especialista = E.id_especialista
JOIN PERSONAL PERS ON E.id_personal = PERS.id_personal;

-- 11.3. Actualización por el campo estado (Update)
UPDATE CITA 
SET estado = 'CANCELADA' 
WHERE id_cita = 1;

-- 11.4. Borrado (Delete)
DELETE FROM CITA 
WHERE id_cita = 41;


-- ============================================================================
-- TABLA 12: CONSULTA
-- ============================================================================

-- 12.1. Inserción (Create)
INSERT INTO CONSULTA (id_cita, id_historia, fecha_consulta, observaciones, diagnostico_general) 
VALUES (1, 1, NOW(), 'Paciente asiste a revisión puntual', 'Salud oral satisfactoria');

-- 12.2. Selección (Read)
SELECT 
    CO.id_consulta,
    CO.id_cita,
    CONCAT(P.nombres, ' ', P.apellidos) AS paciente,
    CO.fecha_consulta,
    CO.observaciones,
    CO.diagnostico_general
FROM CONSULTA CO
JOIN HISTORIA_CLINICA HC ON CO.id_historia = HC.id_historia
JOIN PACIENTE P ON HC.id_paciente = P.id_paciente;

-- 12.3. Actualización (Update)
UPDATE CONSULTA 
SET observaciones = 'Paciente reprogramado para profilaxis' 
WHERE id_consulta = 1;

-- 12.4. Borrado (Delete)
DELETE FROM CONSULTA 
WHERE id_consulta = 21;


-- ============================================================================
-- TABLA 13: SERVICIO
-- ============================================================================

-- 13.1. Inserción (Create)
INSERT INTO SERVICIO (codigo_servicio, nombre_servicio, descripcion, precio_base, estado) 
VALUES ('SERV-006', 'Blanqueamiento Dental', 'Aclaramiento dental LED en consultorio', 450000.00, 'ACTIVO');

-- 13.2. Selección (Read)
SELECT * FROM SERVICIO;

-- 13.3. Actualización por el campo estado (Update)
UPDATE SERVICIO 
SET estado = 'INACTIVO' 
WHERE id_servicio = 6;

-- 13.4. Borrado (Delete)
DELETE FROM SERVICIO 
WHERE id_servicio = 6;


-- ============================================================================
-- TABLA 14: CONSULTA_SERVICIO
-- ============================================================================

-- 14.1. Inserción (Create)
INSERT INTO CONSULTA_SERVICIO (id_consulta, id_servicio, cantidad, precio_unitario) 
VALUES (1, 1, 1, 50000.00);

-- 14.2. Selección (Read)
SELECT 
    CS.id_consulta,
    S.nombre_servicio,
    CS.cantidad,
    CS.precio_unitario,
    (CS.cantidad * CS.precio_unitario) AS subtotal
FROM CONSULTA_SERVICIO CS
JOIN SERVICIO S ON CS.id_servicio = S.id_servicio;

-- 14.3. Actualización (Update)
UPDATE CONSULTA_SERVICIO 
SET cantidad = 2 
WHERE id_consulta = 1 AND id_servicio = 1;

-- 14.4. Borrado (Delete)
DELETE FROM CONSULTA_SERVICIO 
WHERE id_consulta = 1 AND id_servicio = 1;


-- ============================================================================
-- TABLA 15: DIENTE
-- ============================================================================

-- 15.1. Inserción (Create)
INSERT INTO DIENTE (numero_fdi, nombre_diente, cuadrante, tipo_denticion, imagen_url) 
VALUES (31, 'Incisivo Central Inferior Izquierdo', 3, 'PERMANENTE', NULL);

-- 15.2. Selección (Read)
SELECT * FROM DIENTE;

-- 15.3. Actualización (Update)
UPDATE DIENTE 
SET tipo_denticion = 'TEMPORAL' 
WHERE id_diente = 11;

-- 15.4. Borrado (Delete)
DELETE FROM DIENTE 
WHERE id_diente = 31;


-- ============================================================================
-- TABLA 16: ODONTOGRAMA
-- ============================================================================

-- 16.1. Inserción (Create)
INSERT INTO ODONTOGRAMA (id_historia, id_diente, cara_diente, diagnostico, estado_tratamiento, fecha_registro) 
VALUES (1, 11, 'OCLUSAL', 'Caries profunda con compromiso pulpar', 'PENDIENTE', NOW());

-- 16.2. Selección (Read)
SELECT 
    O.id_odontograma,
    CONCAT(P.nombres, ' ', P.apellidos) AS paciente,
    D.nombre_diente,
    D.numero_fdi,
    O.cara_diente,
    O.diagnostico,
    O.estado_tratamiento,
    O.fecha_registro
FROM ODONTOGRAMA O
JOIN HISTORIA_CLINICA HC ON O.id_historia = HC.id_historia
JOIN PACIENTE P ON HC.id_paciente = P.id_paciente
JOIN DIENTE D ON O.id_diente = D.id_diente;

-- 16.3. Actualización por el campo estado de tratamiento (Update)
UPDATE ODONTOGRAMA 
SET estado_tratamiento = 'REALIZADO' 
WHERE id_odontograma = 1;

-- 16.4. Borrado (Delete)
DELETE FROM ODONTOGRAMA 
WHERE id_odontograma = 11;


-- ============================================================================
-- TABLA 17: METODO_PAGO
-- ============================================================================

-- 17.1. Inserción (Create)
INSERT INTO METODO_PAGO (nombre_metodo, descripcion, estado) 
VALUES ('Transferencia Bancaria', 'Pagos mediante transferencia o PSE', 'ACTIVO');

-- 17.2. Selección (Read)
SELECT * FROM METODO_PAGO;

-- 17.3. Actualización por el campo estado (Update)
UPDATE METODO_PAGO 
SET estado = 'INACTIVO' 
WHERE id_metodo_pago = 5;

-- 17.4. Borrado (Delete)
DELETE FROM METODO_PAGO 
WHERE id_metodo_pago = 5;


-- ============================================================================
-- TABLA 18: VENTA
-- ============================================================================

-- 18.1. Inserción (Create)
INSERT INTO VENTA (numero_factura, fecha_venta, subtotal, impuestos, total, estado) 
VALUES ('FAC-2026-001', NOW(), 100000.00, 19000.00, 119000.00, 'PAGADA');

-- 18.2. Selección (Read)
SELECT * FROM VENTA;

-- 18.3. Actualización por el campo estado (Update)
UPDATE VENTA 
SET estado = 'ANULADA' 
WHERE id_venta = 1;

-- 18.4. Borrado (Delete)
DELETE FROM VENTA 
WHERE id_venta = 100;


-- ============================================================================
-- TABLA 19: PACIENTE_VENTA
-- ============================================================================

-- 19.1. Inserción (Create)
INSERT INTO PACIENTE_VENTA (id_paciente, id_venta) 
VALUES (1, 1);

-- 19.2. Selección (Read)
SELECT 
    PV.id_venta,
    V.numero_factura,
    CONCAT(P.nombres, ' ', P.apellidos) AS paciente,
    V.total,
    V.estado
FROM PACIENTE_VENTA PV
JOIN PACIENTE P ON PV.id_paciente = P.id_paciente
JOIN VENTA V ON PV.id_venta = V.id_venta;

-- 19.3. Borrado (Delete)
DELETE FROM PACIENTE_VENTA 
WHERE id_paciente = 1 AND id_venta = 1;


-- ============================================================================
-- TABLA 20: PAGO_VENTA
-- ============================================================================

-- 20.1. Inserción (Create)
INSERT INTO PAGO_VENTA (id_venta, id_metodo_pago, monto, fecha_pago) 
VALUES (1, 1, 119000.00, NOW());

-- 20.2. Selección (Read)
SELECT 
    PV.id_pago,
    V.numero_factura,
    MP.nombre_metodo,
    PV.monto,
    PV.fecha_pago
FROM PAGO_VENTA PV
JOIN VENTA V ON PV.id_venta = V.id_venta
JOIN METODO_PAGO MP ON PV.id_metodo_pago = MP.id_metodo_pago;

-- 20.3. Actualización (Update)
UPDATE PAGO_VENTA 
SET monto = 120000.00 
WHERE id_pago = 1;

-- 20.4. Borrado (Delete)
DELETE FROM PAGO_VENTA 
WHERE id_pago = 100;


-- ============================================================================
-- TABLA 21: LOG_AUDITORIA
-- ============================================================================

-- 21.1. Inserción (Create)
INSERT INTO LOG_AUDITORIA (id_usuario, accion, tabla_afectada, detalles, fecha_evento) 
VALUES (1, 'UPDATE', 'USUARIO', 'Inactivación de usuario id_usuario=6', NOW());

-- 21.2. Selección (Read)
SELECT 
    L.id_log,
    U.email AS usuario,
    L.accion,
    L.tabla_afectada,
    L.detalles,
    L.fecha_evento
FROM LOG_AUDITORIA L
LEFT JOIN USUARIO U ON L.id_usuario = U.id_usuario
ORDER BY L.fecha_evento DESC;

-- 21.3. Actualización (Update)
UPDATE LOG_AUDITORIA 
SET detalles = 'Inactivación manual de usuario solicitada por administración' 
WHERE id_log = 1;

-- 21.4. Borrado (Delete)
DELETE FROM LOG_AUDITORIA 
WHERE id_log = 1000;