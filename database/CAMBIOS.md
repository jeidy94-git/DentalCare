# Cambios a la base de datos: v1 → v2 (Fase B)

Al construir el frontend (fases A5 y A6) contra los datos del script original se encontraron
problemas en la base: datos que contradicen el SRS, columnas que faltan y reglas que nadie hacía
cumplir. El mock del frontend ya trabajaba con la versión corregida. Este documento explica cada
cambio para que la base real quede igual **antes** de construir el backend (fase C).

| Archivo | Para qué sirve |
|---|---|
| `dentalcare_bd.sql` (raíz) | **v1**, el script original. Se conserva sin cambios como referencia. |
| `database/dentalcare_bd_v2.sql` | **v2 completa**: estructura y datos de demo. Para una instalación nueva. |
| `database/migrations.sql` | **Migración v1 → v2** para una base que ya tiene la v1 y datos que se quieren conservar. |

## Cómo aplicarlo

**Instalación nueva (recomendado para el backend):**

```bash
mysql -u root < database/dentalcare_bd_v2.sql
```

En phpMyAdmin también funciona: pestaña *Importar*, sin elegir antes una base, porque el script la
crea. La base no debe existir o debe estar vacía. El script **no** trae `DROP TABLE` a propósito:
si `dentalcare_bd` ya tiene tablas, se detiene con *Table already exists* en vez de borrar datos.

**Ya tengo la v1 con datos propios:**

```bash
mysqldump -u root dentalcare_bd > respaldo_v1.sql   # 1. copia de seguridad
mysql -u root < database/migrations.sql             # 2. una sola vez
```

En MySQL, los `ALTER TABLE` se confirman solos y no se pueden deshacer con `ROLLBACK`. Si la
migración falla a mitad, hay que restaurar la copia, corregir el problema y volver a empezar.

Las contraseñas de la demo **no cambian** (por ejemplo, `admin@dentalcare.com` / `Admin2026*`). Lo
que cambia es cómo se guardan.

## Resumen

| # | Cambio | Requisito | Tipo |
|---|---|---|---|
| B-00 | Las prácticas CRUD salen del script de instalación | — | Organización |
| B-01 | Contraseñas con hash **bcrypt** y `CHECK` que prohíbe el texto plano | RNF-SEG-01 | Seguridad |
| B-02 | `rol.estado` (ACTIVO / INACTIVO) | RF-ROL-06, RN-03 | Columna nueva |
| B-03 | 5 permisos nuevos y matriz `rol_permiso` corregida | **RN-01**, RF-ROL-07 | Datos |
| B-04 | `paciente.departamento` y `paciente.municipio` (DIVIPOLA) | RF-PAC, API externa | Columnas nuevas |
| B-05 | `venta.estado_venta` calculado por la base (columna generada) | Integridad | Corrección |
| B-06 | Se elimina `paciente_venta` (relación duplicada) | Normalización | Tabla eliminada |
| B-07 | `cita.id_servicio` y estados válidos de la cita | RF-CIT-01, HU-06 | Columna nueva + FK |
| B-08 | Tabla `password_reset` (enlaces de recuperación) | HU-01 / login | Tabla nueva |
| B-09 | Más horarios de atención en los datos de demo | RN-02 | Datos |
| B-10 | Restricciones `CHECK` en los valores cerrados | Integridad | Restricciones |
| B-11 | `venta.id_servicio`: el tratamiento que se paga | RF-PAG-01 | Columna nueva + FK |

---

## B-00 · El script de instalación mezclaba prácticas CRUD

**Problema.** Las líneas 1186–1728 de `dentalcare_bd.sql` son prácticas de clase (`INSERT`,
`UPDATE`, `DELETE`, `SELECT`) pegadas al final del volcado. Al importar el archivo completo:

- Se ejecutan y **modifican los datos de demo**: insertan un usuario, borran registros, etc.
- Producen **28 errores**, porque usan columnas y tablas que no existen en el esquema:
  `consulta_servicio`, `venta.numero_factura`, `pago_venta.id_metodo_pago`, `cita.fecha_cita`,
  `novedad_operativa.fecha_reporte`, entre otras. Parecen escritas para una versión anterior del
  modelo.
- Usan nombres en MAYÚSCULAS (`USUARIO`), que funcionan en Windows pero fallan en Linux.
  MySQL distingue mayúsculas en los nombres de tabla según el sistema operativo
  (`lower_case_table_names`).

**Cambio.** La v2 contiene solo la creación de la base. La v1 queda intacta, así que las prácticas
siguen disponibles en ella como material de estudio.

**Evidencia.** Se importó la v1 en un MariaDB 10.4 limpio y la consola listó los 28 errores con su
línea. Solo el volcado (líneas 1–1185) se importa sin errores.

## B-01 · Contraseñas en texto plano → bcrypt

**Problema.** La columna se llama `password_hash`, pero guardaba la contraseña tal cual, por
ejemplo `Admin2026*`. Cualquiera con acceso de lectura a la tabla, a un respaldo o a un volcado
filtrado obtendría las 45 contraseñas. Además, como muchas personas repiten contraseñas, el daño
llegaría a sus otras cuentas. Esto incumple RNF-SEG-01: *"hash con sal; mínimo bcrypt o
equivalente"*.

**Cambio.**

```sql
UPDATE usuario SET password_hash = '$2a$10$QUOB1imQ…' WHERE id_usuario = 1;  -- ×45
ALTER TABLE usuario
  ADD CONSTRAINT chk_usuario_password_bcrypt
    CHECK (password_hash REGEXP '^[$]2[aby][$][0-9]{2}[$][./A-Za-z0-9]{53}$');
```

- Los hashes se generaron con `bcryptjs`, la misma librería que usará el backend, con **costo 10**:
  2¹⁰ = 1.024 rondas. Antes de guardarlos se comprobó cada hash con su contraseña y con una
  contraseña incorrecta.
- Anatomía de un hash bcrypt: `$2a$` (versión) + `10$` (costo) + 22 caracteres de **sal** +
  31 caracteres de hash = 60 caracteres. La sal va dentro del mismo texto, así que no se necesita
  otra columna.
- El `CHECK` es **defensa en profundidad**: si un error futuro del backend intentara guardar una
  contraseña sin hashear, la base rechaza el `INSERT`.
- `usuario.estado` pasa a `NOT NULL` y solo admite `ACTIVO` o `INACTIVO`.

**Impacto en el backend.** `POST /api/auth/login` busca el usuario por correo y compara con
`bcrypt.compare(password, password_hash)`. Nunca compara con `=` en SQL. Si el correo no existe,
igual ejecuta una comparación contra un hash falso, para que la respuesta tarde lo mismo y no
revele qué correos están registrados. El mock ya hacía esto con PBKDF2.

## B-02 · `rol.estado`

**Problema.** RF-ROL-06 pide activar e inactivar roles con confirmación, pero la tabla `rol` no
tenía dónde guardar ese estado.

**Cambio.**

```sql
ALTER TABLE rol
  ADD COLUMN estado varchar(20) NOT NULL DEFAULT 'ACTIVO' AFTER descripcion,
  ADD CONSTRAINT chk_rol_estado CHECK (estado IN ('ACTIVO', 'INACTIVO'));
```

Los 4 roles existentes quedan `ACTIVO` gracias al `DEFAULT`.

**Impacto en el backend.** RN-03 (no inactivar un rol con usuarios activos) relaciona **varias
filas de otra tabla**, y un `CHECK` solo puede mirar la fila que se está guardando. Por eso esa
regla la valida la API antes del `UPDATE`.

## B-03 · Permisos y matriz `rol_permiso` (RN-01)

**Problema.** La matriz de la v1 contradecía el SRS:

| Rol | Permisos en la v1 | Problema |
|---|---|---|
| RECEPCIONISTA | CREAR_CITA, VER_HISTORIA, **EDITAR_HISTORIA** | Viola **RN-01**: solo el doctor asignado o el administrador editan la historia clínica |
| ESPECIALISTA | CREAR_CITA, CANCELAR_CITA, **REGISTRAR_PAGO** | Cobra pagos (tarea de recepción) y **no puede ver** historias, que es su trabajo |
| PACIENTE | *(ninguno)* | No podía pedir ni cancelar sus citas (HU-06) |

Además, con 6 permisos no alcanzaba para cubrir las pantallas del SRS.

**Cambio.** Se agregan 5 permisos (ids 7–11) y la matriz se vuelve a cargar **por nombre**, para que
el SQL se lea igual que esta tabla. Es la misma matriz que aplica el frontend en
`frontend/js/core/permissions.js`:

| Permiso | ADMIN | RECEPCIÓN | ESPECIALISTA | PACIENTE |
|---|:-:|:-:|:-:|:-:|
| CREAR_CITA | ✔ | ✔ | ✔ | ✔ (suyas) |
| CANCELAR_CITA | ✔ | ✔ | ✔ | ✔ (suyas) |
| VER_HISTORIA_CLINICA | ✔ | | ✔ | |
| EDITAR_HISTORIA_CLINICA | ✔ | | ✔ (RN-01: solo si es el asignado) | |
| GESTIONAR_USUARIOS | ✔ | | | |
| REGISTRAR_PAGO | ✔ | ✔ | | |
| GESTIONAR_PACIENTES *(nuevo)* | ✔ | ✔ | | |
| GESTIONAR_SERVICIOS *(nuevo)* | ✔ | | | |
| GESTIONAR_ESPECIALISTAS *(nuevo)* | ✔ | | | |
| REGISTRAR_NOVEDAD *(nuevo)* | ✔ | ✔ | ✔ | |
| GESTIONAR_NOVEDADES *(nuevo)* | ✔ | | | |

En total quedan 23 filas en `rol_permiso`.

**Impacto en el backend.** La tabla resuelve "¿este **rol** puede editar historias?". RN-01 exige
algo más fino: "¿este **doctor** está asignado a **este** paciente?". Eso depende de los datos, así
que la API lo verifica en cada petición: el administrador puede, y un especialista solo si tiene
una cita no cancelada con ese paciente. Es la misma regla que `assertRN01` en el mock. Lo mismo
pasa con "(suyas)" en el rol paciente: el permiso existe, pero la API solo deja actuar sobre
`id_paciente` de la sesión.

## B-04 · Ubicación del paciente (DIVIPOLA)

**Por qué.** El registro de pacientes ahora ofrece departamento y municipio desde la API de Datos
Abiertos de Colombia (SUSTENTACION §14).

```sql
ALTER TABLE paciente
  ADD COLUMN departamento varchar(60) DEFAULT NULL AFTER email,
  ADD COLUMN municipio    varchar(80) DEFAULT NULL AFTER departamento;
```

- Son **opcionales**: los 40 pacientes existentes quedan con `NULL`.
- Los largos coinciden con la validación del frontend (`maxLength` 60 y 80). Los nombres más largos
  de DIVIPOLA caben: el departamento de San Andrés, Providencia y Santa Catalina tiene 56 caracteres
  y el municipio más largo, Villa de San Diego de Ubaté, tiene 27.
- Se guarda el **nombre** y no el código DANE. Es una decisión discutible y está explicada en
  SUSTENTACION §14.6. Si llegan reportes por región, la migración natural es `CHAR(5)` con llave
  foránea a una tabla `municipio`.

**Impacto en el backend.** Regla de coherencia: si cambia el departamento y no llega un municipio,
la API deja el municipio en `NULL`. Así nunca queda "Medellín (Caldas)".

## B-05 · Estado de la venta calculado por la base

**Problema.** La venta #2 decía `PAGADO` con 350.000 de total y solo 150.000 pagados, o sea,
200.000 de saldo. Era el único caso, pero bastaba para que el reporte de cartera mintiera.
El origen del problema es de diseño: `estado_venta` se escribía a mano, aunque se puede **deducir**
de los montos. Un dato que se puede deducir y además se guarda aparte termina contradiciéndose.

**Cambio.** El estado pasa a ser una **columna generada**, igual que `saldo_pendiente`, que ya lo
era en la v1:

```sql
ALTER TABLE venta DROP COLUMN estado_venta;
ALTER TABLE venta
  ADD COLUMN estado_venta varchar(20)
    GENERATED ALWAYS AS (CASE WHEN monto_pagado >= monto_total THEN 'PAGADO' ELSE 'PENDIENTE' END) STORED,
  ADD CONSTRAINT chk_venta_montos CHECK (monto_total > 0 AND monto_pagado >= 0 AND monto_pagado <= monto_total),
  ADD CONSTRAINT chk_venta_modalidad CHECK (modalidad_pago IN ('CONTADO', 'CREDITO')),
  ADD CONSTRAINT chk_venta_cuotas CHECK (numero_cuotas >= 1);
ALTER TABLE pago_venta ADD CONSTRAINT chk_pago_monto CHECK (monto_abonado > 0);
```

- Ahora es **imposible** que el estado contradiga los montos. La venta #2 queda `PENDIENTE`, y al
  registrar el abono de 200.000 pasa sola a `PAGADO`. Esto se probó.
- `STORED` guarda el valor calculado en disco, así que se puede indexar y filtrar como una
  columna normal.
- También se verificó que, en las 40 ventas, `monto_pagado` es igual a la suma de sus abonos en
  `pago_venta`.

**Alternativa descartada.** Dejar la columna normal con un `CHECK` que compare estado y montos.
Funciona, pero obliga a la API a calcular y enviar el estado en cada abono. Con la columna generada
no hay nada que enviar y por tanto nada que equivocar.

**Impacto en el backend.** Los `INSERT` y `UPDATE` de `venta` **no deben incluir** `estado_venta`
ni `saldo_pendiente`: MySQL 8 los rechaza (error 3105). Registrar un abono es una
**transacción**: `INSERT pago_venta` + `UPDATE venta SET monto_pagado = monto_pagado + ?`. Si falla
cualquiera de los dos, se revierte todo.

## B-06 · Se elimina `paciente_venta`

**Problema.** `venta` ya tiene `id_paciente` con su llave foránea, y `paciente_venta` repetía esa
misma relación. Se comprobó: las 40 filas coinciden exactamente con `venta.id_paciente`. Guardar dos
veces el mismo hecho viola la normalización. Cuando el backend cree una venta y olvide la segunda
tabla, las dos fuentes dirán cosas distintas. El mock nunca la replicó.

**Cambio.** `DROP TABLE paciente_venta;`. Ninguna otra tabla dependía de ella.

**Si el modelo necesitara ventas compartidas** entre varios pacientes, por ejemplo un plan
familiar, entonces la tabla intermedia sería correcta y lo que habría que quitar es
`venta.id_paciente`. Mantener las dos no es correcto en ningún caso.

## B-07 · Tratamiento de la cita y estados válidos

**Problema.** RF-CIT-01 dice *"agendar una cita seleccionando paciente, **tratamiento**, fecha…"*,
pero `cita` no tenía dónde guardar el tratamiento. Además, HU-06 introduce el estado
`PENDIENTE_CONFIRMACION`: el paciente solicita la cita y la recepción la confirma.

**Cambio.**

```sql
ALTER TABLE cita ADD COLUMN id_servicio int(11) DEFAULT NULL AFTER id_especialista;
UPDATE cita SET id_servicio = CASE id_cita WHEN 3 THEN 3 WHEN 4 THEN 4 ELSE 1 END;
ALTER TABLE cita
  MODIFY id_servicio int(11) NOT NULL,
  ADD CONSTRAINT fk_cita_servicio FOREIGN KEY (id_servicio) REFERENCES servicio (id_servicio) ON UPDATE CASCADE,
  ADD CONSTRAINT chk_cita_estado
    CHECK (estado_cita IN ('PENDIENTE_CONFIRMACION', 'PROGRAMADA', 'COMPLETADA', 'CANCELADA'));
```

- Se hace en tres pasos porque no se puede crear una columna `NOT NULL` sin valor en filas que ya
  existen. Primero se crea admitiendo `NULL`, luego se llena según el motivo de cada cita (la 3 es
  una calza y la 4 una endodoncia) y al final se vuelve obligatoria.
- La llave foránea no tiene `ON DELETE CASCADE`: borrar un tratamiento **no** debe borrar el
  historial de citas. Los tratamientos se **inactivan** (`servicio.estado`).
- `servicio.estado` también queda limitado a `ACTIVO` / `INACTIVO`, y `precio_base` a valores
  `>= 0`.

## B-08 · Tabla `password_reset`

**Por qué.** La pantalla de login ofrece "¿Olvidaste tu contraseña?". El enlace de recuperación
necesita un token que **vence** y que **solo sirve una vez**.

```sql
CREATE TABLE password_reset (
  id_reset       int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_usuario     int(11) NOT NULL,              -- FK usuario, ON DELETE CASCADE
  token_hash     char(64) NOT NULL UNIQUE,      -- SHA-256 en hexadecimal
  expira_en      datetime NOT NULL,
  usado_en       datetime DEFAULT NULL,         -- NULL = no se ha usado
  fecha_creacion datetime NOT NULL DEFAULT current_timestamp()
);
```

- Se guarda el **hash** del token, no el token, por la misma razón que con las contraseñas: quien
  lea la tabla no puede usar los enlaces. Basta SHA-256 y no hace falta bcrypt, porque el token es
  aleatorio y largo (32 bytes), así que no se puede adivinar por fuerza bruta. Una contraseña
  humana sí.
- `usado_en` dice **cuándo** se usó, no solo si se usó. Eso sirve para la auditoría.

## B-09 · Más horarios de atención

**Problema.** La v1 traía un solo día por odontólogo, y RN-02 impide agendar fuera del horario, así
que casi no había cupos para probar el sistema.

**Cambio.** Se agregan 11 franjas (ids 5–15): el Dr. Roberto atiende de martes a viernes, la
Dra. Sofía los jueves y sábados y el Dr. Andrés los viernes. Son las mismas franjas que ya usa el
frontend (`data/mock/especialistas.js`). También se agregan dos `CHECK`: `hora_fin > hora_inicio` y
un día válido (Lunes…Domingo, con tilde, como lo guarda la v1).

## B-10 · Otras restricciones `CHECK`

| Restricción | Valores permitidos | Igual que el frontend |
|---|---|---|
| `chk_paciente_genero` | MASCULINO, FEMENINO, OTRO | `patient-fields.js` |
| `chk_paciente_tipo_doc` | CC, TI, CE, PA | `TIPOS_DOCUMENTO` |

**Por qué validar en la base si el frontend ya valida.** El frontend se puede saltar con Postman,
con `curl` o editando el JavaScript en el navegador. La API también valida, pero la base es la
**última línea**: protege los datos aunque algún día exista otra aplicación o un script que escriba
directamente. Los valores son **exactamente** los mismos en las tres capas. Si la base aceptara
menos que el formulario, el usuario vería un error 500 incomprensible.

**Requisito de versión.** MySQL ignoraba los `CHECK` hasta la versión 8.0.16: los aceptaba en el
`CREATE TABLE` y no los aplicaba. MariaDB los aplica desde la 10.2. Las versiones del proyecto,
MariaDB 10.4 (XAMPP) y MySQL 8.0.36, los aplican.

---

## B-11 · Tratamiento que se paga en cada venta

**Problema.** La venta guardaba paciente y montos, pero no **qué** tratamiento se cobraba. Las
pantallas de pagos, el abono y el comprobante solo podían mostrar "venta #2 · $ 350.000", y el
paciente no sabía a qué correspondía cada saldo.

**Cambio.**

```sql
ALTER TABLE venta ADD COLUMN id_servicio int(11) DEFAULT NULL AFTER id_paciente;
UPDATE venta SET id_servicio = CASE id_venta WHEN 1 THEN 3 WHEN 2 THEN 4 ELSE 2 END;
ALTER TABLE venta
  MODIFY id_servicio int(11) NOT NULL,
  ADD KEY fk_venta_servicio (id_servicio),
  ADD CONSTRAINT fk_venta_servicio FOREIGN KEY (id_servicio) REFERENCES servicio (id_servicio) ON UPDATE CASCADE;
```

- Los mismos tres pasos de B-07 (columna con `NULL`, se llena, se vuelve obligatoria).
- Valores del seed: la venta 1 (140.000) es una calza en resina, la 2 (350.000) un tratamiento de
  conducto y las demás (150.000) limpiezas profundas. El monto de la venta puede diferir del
  `precio_base` (ajustes o descuentos): por eso se guarda el monto y no se calcula.
- Una venta, un tratamiento: es lo que hace hoy el consultorio. Si algún día una venta agrupa
  varios, el paso siguiente es una tabla `detalle_venta`; no se crea antes de necesitarla.
- Igual que en la cita, la llave foránea **no** borra en cascada: un tratamiento con ventas no se
  puede eliminar, se **inactiva**.

**Cómo aplicarlo.** En una instalación nueva ya viene en `dentalcare_bd_v2.sql`. Desde la v1, va al
final de `migrations.sql`. Si la base **ya está en la v2**, ejecuta solo
`database/b11_venta_servicio.sql` (una vez, después de la copia de seguridad).

---

## No incluido en la v2 (pendientes conscientes)

- **Piezas ausentes en el odontograma.** El frontend permite marcarlas pero avisa que no se guardan.
  Falta decidir el modelo: una tabla `pieza_ausente (id_historia, id_diente)` o un estado en
  `odontograma`. Se deja para cuando se construya ese módulo en la API.
- **`log_auditoria.id_usuario`** admite `NULL` (login fallido de un correo inexistente). Es
  correcto así y no se cambia.
- **Tipos de novedad** (`tipo_novedad`) siguen como texto libre en la base. El frontend ofrece 5 y
  no se agregó un `CHECK`, porque el SRS no cierra la lista.

## Cómo se verificó

Las pruebas se hicieron en servidores **desechables**, con datos temporales y puertos 3307 y 3308,
sin tocar las bases de XAMPP ni de MySQL instaladas:

1. **v1 limpia** (volcado, líneas 1–1185) → se aplica `migrations.sql` sin errores, en MariaDB
   10.4.32 y en MySQL 8.0.36.
2. **v2 desde cero** → la estructura (`SHOW CREATE TABLE`) y los datos (`CHECKSUM TABLE … EXTENDED`)
   de las 20 tablas son **idénticos** a los de "v1 + migración". Se probó en dos rondas.
3. **18 escrituras inválidas** fallan con la restricción esperada en ambos motores: contraseña en
   claro, venta con más pagado que el total, cita sin tratamiento, horario al revés, token de un
   usuario inexistente, etc.
4. **Casos válidos** funcionan: un abono que salda la venta #2 la pasa a `PAGADO`, una cita
   `PENDIENTE_CONFIRMACION`, un paciente con municipio y un token de recuperación.
5. Reimportar la v2 sobre una base con datos se detiene con *Table 'cita' already exists*, sin
   borrar nada.
6. Los 45 hashes bcrypt se verificaron con su contraseña real y con una incorrecta.
