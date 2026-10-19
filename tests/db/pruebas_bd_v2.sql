-- ============================================================================
-- Pruebas de la base de datos v2 (Fase B) — autoevaluables
-- ----------------------------------------------------------------------------
-- Comprueban que las restricciones de database/CAMBIOS.md funcionan:
--   · lo inválido se RECHAZA (lo hace la base, no la aplicación)
--   · lo válido se acepta y las columnas calculadas responden
--   · los datos de demo quedaron corregidos
--
-- Uso:  mysql -u root dentalcare_bd < tests/db/pruebas_bd_v2.sql
--       (phpMyAdmin: pestaña SQL, pegar el archivo y poner "//" como delimitador)
--
-- No deja rastro: todo corre dentro de una transacción que termina en ROLLBACK,
-- y los procedimientos auxiliares se borran al final.
-- Resultado esperado: la última consulta muestra "fallidas = 0".
-- ============================================================================

USE dentalcare_bd;
SET NAMES utf8mb4;
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

DROP PROCEDURE IF EXISTS debe_fallar;
DROP PROCEDURE IF EXISTS debe_funcionar;
DROP PROCEDURE IF EXISTS comprobar;

DELIMITER //

-- Ejecuta la sentencia y espera que la base la RECHACE por una REGLA (CHECK, FK, NOT NULL…).
-- Si falla porque la prueba está mal escrita (sintaxis, columna o tabla que no existe), eso NO
-- cuenta como acierto: sería un falso positivo.
CREATE PROCEDURE debe_fallar(IN caso VARCHAR(120), IN sentencia TEXT)
BEGIN
  DECLARE codigo INT DEFAULT NULL;
  DECLARE mensaje TEXT DEFAULT NULL;
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
  BEGIN
    -- GET DIAGNOSTICS va PRIMERO: en MySQL 8 cualquier otra sentencia (incluso un IF) vacía el
    -- área de diagnóstico. Luego se conserva solo el PRIMER error: si falla el PREPARE, el
    -- EXECUTE y el DEALLOCATE también fallan y su mensaje taparía la causa real.
    GET DIAGNOSTICS CONDITION 1 @codigo = MYSQL_ERRNO, @mensaje = MESSAGE_TEXT;
    IF codigo IS NULL THEN
      SET codigo = @codigo, mensaje = @mensaje;
    END IF;
  END;
  SET @sentencia = sentencia;
  PREPARE st FROM @sentencia;
  EXECUTE st;
  DEALLOCATE PREPARE st;
  INSERT INTO resultado (caso, ok, detalle) VALUES (
    caso,
    codigo IS NOT NULL AND codigo NOT IN (1064, 1054, 1146),
    CASE
      WHEN codigo IS NULL THEN 'La base ACEPTÓ un dato inválido'
      WHEN codigo IN (1064, 1054, 1146) THEN CONCAT('Prueba mal escrita: ', mensaje)
      ELSE CONCAT(codigo, ' ', mensaje)
    END);
END //

-- Ejecuta la sentencia y espera que la base la ACEPTE.
CREATE PROCEDURE debe_funcionar(IN caso VARCHAR(120), IN sentencia TEXT)
BEGIN
  DECLARE fallo BOOLEAN DEFAULT FALSE;
  DECLARE mensaje TEXT DEFAULT NULL;
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
  BEGIN
    GET DIAGNOSTICS CONDITION 1 @mensaje = MESSAGE_TEXT;
    IF NOT fallo THEN
      SET mensaje = @mensaje;
    END IF;
    SET fallo = TRUE;
  END;
  SET @sentencia = sentencia;
  PREPARE st FROM @sentencia;
  EXECUTE st;
  DEALLOCATE PREPARE st;
  INSERT INTO resultado (caso, ok, detalle) VALUES (caso, NOT fallo, COALESCE(mensaje, ''));
END //

-- Evalúa una condición (SELECT que devuelve 1 o 0).
CREATE PROCEDURE comprobar(IN caso VARCHAR(120), IN condicion TEXT)
BEGIN
  SET @sentencia = CONCAT('SELECT (', condicion, ') INTO @cumple');
  PREPARE st FROM @sentencia;
  EXECUTE st;
  DEALLOCATE PREPARE st;
  INSERT INTO resultado (caso, ok, detalle) VALUES (caso, COALESCE(@cumple, 0) = 1, condicion);
END //

DELIMITER ;

DROP TEMPORARY TABLE IF EXISTS resultado;
-- MEMORY no es transaccional: los resultados sobreviven al ROLLBACK del final
-- (con InnoDB, el ROLLBACK también los borraría).
CREATE TEMPORARY TABLE resultado (
  n INT AUTO_INCREMENT PRIMARY KEY,
  caso VARCHAR(120) NOT NULL,
  ok BOOLEAN NOT NULL,
  detalle VARCHAR(600)
) ENGINE=MEMORY;

START TRANSACTION;

-- ---------------------------------------------------------------- datos corregidos
CALL comprobar('B-01 Ninguna contraseña en texto plano',
  "(SELECT COUNT(*) FROM usuario WHERE password_hash NOT REGEXP '^[$]2[aby][$][0-9]{2}[$]') = 0");
CALL comprobar('B-02 Todos los roles tienen estado',
  "(SELECT COUNT(*) FROM rol WHERE estado IS NULL) = 0");
CALL comprobar('B-03 RN-01: la recepcionista NO edita historias',
  "NOT EXISTS (SELECT 1 FROM rol_permiso rp JOIN rol r USING (id_rol) JOIN permiso p USING (id_permiso) WHERE r.nombre_rol = 'RECEPCIONISTA' AND p.nombre_permiso = 'EDITAR_HISTORIA_CLINICA')");
CALL comprobar('B-03 El especialista ve y edita historias',
  "(SELECT COUNT(*) FROM rol_permiso rp JOIN rol r USING (id_rol) JOIN permiso p USING (id_permiso) WHERE r.nombre_rol = 'ESPECIALISTA' AND p.nombre_permiso IN ('VER_HISTORIA_CLINICA', 'EDITAR_HISTORIA_CLINICA')) = 2");
CALL comprobar('B-03 El especialista NO registra pagos',
  "NOT EXISTS (SELECT 1 FROM rol_permiso rp JOIN rol r USING (id_rol) JOIN permiso p USING (id_permiso) WHERE r.nombre_rol = 'ESPECIALISTA' AND p.nombre_permiso = 'REGISTRAR_PAGO')");
CALL comprobar('B-03 El administrador tiene los 11 permisos',
  "(SELECT COUNT(*) FROM rol_permiso rp JOIN rol r USING (id_rol) WHERE r.nombre_rol = 'ADMINISTRADOR') = (SELECT COUNT(*) FROM permiso)");
CALL comprobar('B-05 Ninguna venta PAGADO con saldo',
  "(SELECT COUNT(*) FROM venta WHERE estado_venta = 'PAGADO' AND saldo_pendiente > 0) = 0");
CALL comprobar('B-05 La venta #2 quedó PENDIENTE',
  "(SELECT estado_venta FROM venta WHERE id_venta = 2) = 'PENDIENTE'");
CALL comprobar('B-05 monto_pagado = suma de abonos',
  "(SELECT COUNT(*) FROM venta v WHERE v.monto_pagado <> (SELECT COALESCE(SUM(monto_abonado), 0) FROM pago_venta p WHERE p.id_venta = v.id_venta)) = 0");
CALL comprobar('B-06 paciente_venta ya no existe',
  "(SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paciente_venta') = 0");
CALL comprobar('B-07 Todas las citas tienen tratamiento',
  "(SELECT COUNT(*) FROM cita WHERE id_servicio IS NULL) = 0");
CALL comprobar('B-09 Cada odontólogo atiende más de un día',
  "(SELECT MIN(dias) FROM (SELECT COUNT(DISTINCT dia_semana) dias FROM horario GROUP BY id_especialista) t) > 1");

-- ---------------------------------------------------------------- debe rechazar
CALL debe_fallar('B-01 INSERT con contraseña en claro',
  "INSERT INTO usuario (id_rol, email, password_hash) VALUES (2, 'plano@prueba.com', 'Clave123*')");
CALL debe_fallar('B-01 UPDATE que vuelve al texto plano',
  "UPDATE usuario SET password_hash = 'Admin2026*' WHERE id_usuario = 1");
CALL debe_fallar('B-01 Estado de usuario inventado',
  "UPDATE usuario SET estado = 'BORRADO' WHERE id_usuario = 1");
CALL debe_fallar('B-02 Estado de rol inventado',
  "UPDATE rol SET estado = 'SUSPENDIDO' WHERE id_rol = 1");
CALL debe_fallar('B-05 Escribir estado_venta a mano',
  "UPDATE venta SET estado_venta = 'PAGADO' WHERE id_venta = 2");
CALL debe_fallar('B-05 Pagar más que el total',
  "UPDATE venta SET monto_pagado = monto_total + 1 WHERE id_venta = 2");
CALL debe_fallar('B-05 Monto pagado negativo',
  "UPDATE venta SET monto_pagado = -1 WHERE id_venta = 2");
CALL debe_fallar('B-05 Modalidad de pago inventada',
  "INSERT INTO venta (id_paciente, monto_total, modalidad_pago) VALUES (11, 100000, 'TRUEQUE')");
CALL debe_fallar('B-05 Abono de $0',
  "INSERT INTO pago_venta (id_venta, id_metodo, monto_abonado) VALUES (2, 1, 0)");
CALL debe_fallar('B-07 Cita sin tratamiento',
  "INSERT INTO cita (id_paciente, id_especialista, fecha_hora, motivo) VALUES (11, 1, '2026-11-02 08:00:00', 'Sin servicio')");
CALL debe_fallar('B-07 Cita con tratamiento inexistente',
  "INSERT INTO cita (id_paciente, id_especialista, id_servicio, fecha_hora, motivo) VALUES (11, 1, 999, '2026-11-02 08:00:00', 'Servicio 999')");
CALL debe_fallar('B-07 Estado de cita inventado',
  "UPDATE cita SET estado_cita = 'PERDIDA' WHERE id_cita = 1");
CALL debe_fallar('B-07 Precio de servicio negativo',
  "UPDATE servicio SET precio_base = -5 WHERE id_servicio = 1");
CALL debe_fallar('B-08 Token de un usuario inexistente',
  "INSERT INTO password_reset (id_usuario, token_hash, expira_en) VALUES (999999, REPEAT('a', 64), NOW())");
CALL debe_fallar('B-09 Horario que termina antes de empezar',
  "INSERT INTO horario (id_especialista, dia_semana, hora_inicio, hora_fin) VALUES (1, 'Lunes', '12:00:00', '08:00:00')");
CALL debe_fallar('B-09 Día de la semana en inglés',
  "INSERT INTO horario (id_especialista, dia_semana, hora_inicio, hora_fin) VALUES (1, 'Monday', '08:00:00', '12:00:00')");
CALL debe_fallar('B-10 Género fuera de la lista',
  "UPDATE paciente SET genero = 'M' WHERE id_paciente = 11");
CALL debe_fallar('B-10 Tipo de documento fuera de la lista',
  "UPDATE paciente SET tipo_documento = 'NIT' WHERE id_paciente = 11");

-- ---------------------------------------------------------------- debe aceptar
CALL debe_funcionar('B-04 Paciente con departamento y municipio',
  "INSERT INTO paciente (tipo_documento, numero_documento, nombres, apellidos, fecha_nacimiento, genero, telefono, departamento, municipio) VALUES ('CE', 'PRUEBA-BD-1', 'Ana', 'Prueba', '1990-01-01', 'OTRO', '3000000000', 'Antioquia', 'Medellín')");
CALL debe_funcionar('B-05 Abono que salda la venta #2',
  "INSERT INTO pago_venta (id_venta, id_metodo, monto_abonado) VALUES (2, 1, 200000)");
CALL debe_funcionar('B-05 Actualizar monto_pagado (sin tocar el estado)',
  "UPDATE venta SET monto_pagado = monto_pagado + 200000 WHERE id_venta = 2");
CALL comprobar('B-05 …y la venta #2 pasa sola a PAGADO',
  "(SELECT CONCAT(estado_venta, '/', saldo_pendiente) FROM venta WHERE id_venta = 2) = 'PAGADO/0.00'");
CALL debe_funcionar('B-07 Cita pedida por un paciente (HU-06)',
  "INSERT INTO cita (id_paciente, id_especialista, id_servicio, fecha_hora, motivo, estado_cita) VALUES (11, 1, 2, '2026-11-02 08:00:00', 'Limpieza', 'PENDIENTE_CONFIRMACION')");
CALL debe_funcionar('B-08 Token de recuperación con vencimiento',
  "INSERT INTO password_reset (id_usuario, token_hash, expira_en) VALUES (1, SHA2('token-de-prueba', 256), NOW() + INTERVAL 30 MINUTE)");
CALL debe_fallar('B-08 El mismo token no se puede repetir',
  "INSERT INTO password_reset (id_usuario, token_hash, expira_en) VALUES (2, SHA2('token-de-prueba', 256), NOW() + INTERVAL 30 MINUTE)");
CALL debe_funcionar('B-02 Inactivar un rol',
  "UPDATE rol SET estado = 'INACTIVO' WHERE nombre_rol = 'PACIENTE'");

ROLLBACK;

DROP PROCEDURE debe_fallar;
DROP PROCEDURE debe_funcionar;
DROP PROCEDURE comprobar;

SELECT n, caso, IF(ok, 'OK', 'FALLA') AS resultado, LEFT(detalle, 90) AS detalle FROM resultado ORDER BY n;
SELECT COUNT(*) AS total, SUM(ok) AS correctas, SUM(NOT ok) AS fallidas FROM resultado;
