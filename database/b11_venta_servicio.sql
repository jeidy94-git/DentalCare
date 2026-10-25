-- ============================================================================
-- DentalCare · B-11 para una base que YA está en la v2
-- ----------------------------------------------------------------------------
-- Agrega venta.id_servicio (el tratamiento que se paga en cada venta). Es el
-- mismo bloque B-11 del final de migrations.sql; explicación en CAMBIOS.md.
--
--   mysqldump -u root dentalcare_bd > respaldo.sql      (copia de seguridad)
--   mysql -u root < database/b11_venta_servicio.sql     (una sola vez)
--
-- Con una instalación nueva no hace falta: dentalcare_bd_v2.sql ya lo trae.
-- ============================================================================

USE dentalcare_bd;
SET NAMES utf8mb4;

ALTER TABLE `venta`
  ADD COLUMN `id_servicio` int(11) DEFAULT NULL AFTER `id_paciente`;

-- Ventas del seed (ver CAMBIOS.md). Si tienes ventas propias, ajusta este UPDATE antes de ejecutarlo.
UPDATE `venta` SET `id_servicio` = CASE `id_venta` WHEN 1 THEN 3 WHEN 2 THEN 4 ELSE 2 END;

ALTER TABLE `venta`
  MODIFY `id_servicio` int(11) NOT NULL,
  ADD KEY `fk_venta_servicio` (`id_servicio`),
  ADD CONSTRAINT `fk_venta_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicio` (`id_servicio`) ON UPDATE CASCADE;
