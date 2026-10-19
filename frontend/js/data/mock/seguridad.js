/**
 * Mock de las tablas de seguridad: `rol`, `permiso`, `rol_permiso` y `usuario` (seed de dentalcare_bd.sql).
 * Archivo generado desde el SQL. Diferencias con el seed, documentadas para la Fase B (database/CAMBIOS.md):
 *  - password_hash: el seed guarda las contraseñas EN TEXTO PLANO (incumple RNF-SEG-01). Aquí ya están
 *    derivadas con PBKDF2-SHA256 (100.000 iteraciones + sal aleatoria de 16 bytes); el backend usará bcrypt.
 *  - rol.estado no existe en la BD (lo pide RF-ROL-06): se agrega con valor 'ACTIVO'.
 *  - rol_permiso del seed contradice el SRS (la recepcionista puede EDITAR historias, contra RN-01, y el
 *    especialista puede REGISTRAR_PAGO). Se copia tal cual como referencia; la matriz que aplica el
 *    frontend está en js/core/permissions.js.
 */

export const ROLES_SEED = [
  { id_rol: 1, nombre_rol: 'ADMINISTRADOR', descripcion: 'Acceso total al sistema', estado: 'ACTIVO' },
  { id_rol: 2, nombre_rol: 'RECEPCIONISTA', descripcion: 'Gestión de citas y pacientes', estado: 'ACTIVO' },
  { id_rol: 3, nombre_rol: 'ESPECIALISTA', descripcion: 'Atención médica y odontograma', estado: 'ACTIVO' },
  { id_rol: 4, nombre_rol: 'PACIENTE', descripcion: 'Acceso al portal del paciente', estado: 'ACTIVO' },
];

export const PERMISOS_SEED = [
  { id_permiso: 1, nombre_permiso: 'CREAR_CITA', descripcion: 'Permite agendar nuevas citas en el sistema' },
  { id_permiso: 2, nombre_permiso: 'CANCELAR_CITA', descripcion: 'Permite cancelar citas existentes' },
  { id_permiso: 3, nombre_permiso: 'VER_HISTORIA_CLINICA', descripcion: 'Acceso a la lectura de historias clínicas' },
  { id_permiso: 4, nombre_permiso: 'EDITAR_HISTORIA_CLINICA', descripcion: 'Permite registrar hallazgos y diagnósticos' },
  { id_permiso: 5, nombre_permiso: 'GESTIONAR_USUARIOS', descripcion: 'Acceso total para crear y modificar usuarios' },
  { id_permiso: 6, nombre_permiso: 'REGISTRAR_PAGO', descripcion: 'Permite procesar pagos y facturación' },
];

export const ROL_PERMISO_SEED = [
  { id_rol: 1, id_permiso: 1 },
  { id_rol: 1, id_permiso: 2 },
  { id_rol: 1, id_permiso: 3 },
  { id_rol: 1, id_permiso: 4 },
  { id_rol: 1, id_permiso: 5 },
  { id_rol: 1, id_permiso: 6 },
  { id_rol: 2, id_permiso: 1 },
  { id_rol: 2, id_permiso: 3 },
  { id_rol: 2, id_permiso: 4 },
  { id_rol: 3, id_permiso: 1 },
  { id_rol: 3, id_permiso: 2 },
  { id_rol: 3, id_permiso: 6 },
];

export const USUARIOS_SEED = [
  { id_usuario: 1, id_rol: 1, email: 'admin@dentalcare.com', password_hash: 'pbkdf2_sha256$100000$yT9xLHL20S3LAzUF0UBkUg==$54958FCbp12A0aHhkyyINljIvceUQbjNJcjKOBef05g=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:50:59' },
  { id_usuario: 2, id_rol: 2, email: 'recepcion@dentalcare.com', password_hash: 'pbkdf2_sha256$100000$7McCGvBy1fMm1PRl4uw1VQ==$r+knqtPUrA5M2ZNutQOu5o2ERlF/ZAKUbKQHQUS1vjE=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:50:59' },
  { id_usuario: 3, id_rol: 3, email: 'dr.roberto@dentalcare.com', password_hash: 'pbkdf2_sha256$100000$CqYObsJHly/8MOyEOtcayw==$BRBVeC2tuCW1eXQMn+l7WFZKgw4EMQbQ7t8CQpmHZY0=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:50:59' },
  { id_usuario: 4, id_rol: 3, email: 'dra.sofia@dentalcare.com', password_hash: 'pbkdf2_sha256$100000$2HLaOD6PKiLvm5gPXz72PA==$D4Mk2GG2EnseZqckegzjh3pEs0tDnQIwEnvHEDcecWg=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:50:59' },
  { id_usuario: 5, id_rol: 3, email: 'dr.andres@dentalcare.com', password_hash: 'pbkdf2_sha256$100000$ROEWOj4bPIE0DgKhKIc6tw==$+VnJOXA6fMLLwqMy5zUMrlDMQ9TRcEU+Nks7DQVWbts=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:50:59' },
  { id_usuario: 16, id_rol: 4, email: 'andres.galvis@gmail.com', password_hash: 'pbkdf2_sha256$100000$mnMEBXq855mV+nJtCNO2aA==$Pz6rZ2iiYlTkyqsO/86vgQcm7Byr0CtOMAl63cPz4Uc=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 17, id_rol: 4, email: 'carolina.villa@hotmail.com', password_hash: 'pbkdf2_sha256$100000$+cUoGBrYAX6j5LFgRd/Udw==$/48QWrVXcMv4hEhycnGf54XTncb4IoXw86KoN/x1jUk=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 18, id_rol: 4, email: 'mateo.londono@outlook.com', password_hash: 'pbkdf2_sha256$100000$PJWt63t/oGvsARnkVv2MlQ==$7tiN9WEHTmCp67qa1cCZPzJ+jgweBRKhgGJT3l5jWM0=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 19, id_rol: 4, email: 'daniela.cardona@yahoo.com', password_hash: 'pbkdf2_sha256$100000$TC7xIyELQ3nyD3nK2rsq7A==$fmaazPP5kTbYwge7fpFN0/A6JKKq+zdUzhc/+xEaT7k=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 20, id_rol: 4, email: 'sebastian.marin@gmail.com', password_hash: 'pbkdf2_sha256$100000$WQMXE+RvVMaCzKUADX/ecQ==$/Y/X23X2pX/n0h4RKzGinLg6GLlf1l4ree4+xuohKOM=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 21, id_rol: 4, email: 'camila.restrepo@hotmail.com', password_hash: 'pbkdf2_sha256$100000$0pVwySZySl4nzzPIMy48ZQ==$fsCkGkKAo7auWyOIu9WDk+spBv9+lGhwDbhVZ2CNFD8=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 22, id_rol: 4, email: 'nicolas.arango@gmail.com', password_hash: 'pbkdf2_sha256$100000$Iof1rjaOi8xDLyJ4nxFnrg==$5SR/40J/XUa6Hpw2EHjUrUF++05TDfMqQq6RZ6YbhmA=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 23, id_rol: 4, email: 'mariana.zapata@outlook.com', password_hash: 'pbkdf2_sha256$100000$dWC05nGclHYfP/uF6zCwhg==$UG9Lul21OGnRfU2mkUZmtuhHHTo5kL0rDOnVZ9iTUfo=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 24, id_rol: 4, email: 'alejandro.henao@yahoo.com', password_hash: 'pbkdf2_sha256$100000$jAxzFmLnAYJIHk8nIJTLgw==$e3lfm9jDU78S+BFDp4dPq4iPI8ilVpeWXfdtUkbc3h4=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 25, id_rol: 4, email: 'valeria.duque@gmail.com', password_hash: 'pbkdf2_sha256$100000$O8df/vdDIhYRJruCbWbplQ==$Q2uykuHUKVphB6g74Drev85Aa+tyLNMCUeJmxzFHal8=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 26, id_rol: 4, email: 'david.buitrago@hotmail.com', password_hash: 'pbkdf2_sha256$100000$JN6g4PFi7KXN26Q+NS6GqQ==$WR2vkPx/6mGuk85W6Y4MH17CYnmHDawPUP1y+T0fhrM=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 27, id_rol: 4, email: 'isabella.gomez@outlook.com', password_hash: 'pbkdf2_sha256$100000$4pZ0zG26Z9222KcgWv/HxA==$WcVK6MTDBMw2gZWkTorxe1COcqPNd5vY6WAnEbPqYow=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 28, id_rol: 4, email: 'samuel.cano@gmail.com', password_hash: 'pbkdf2_sha256$100000$rrRLrdHnScf4xsmxkSyhkw==$bANGt8z8qTj3MtaCM5Q2pqG0JSvbJ2rA/uea9Qb2RwQ=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 29, id_rol: 4, email: 'gabriela.echeverri@yahoo.com', password_hash: 'pbkdf2_sha256$100000$tOuAdyjBr2HxLWUyTFg5zg==$FAMG2XctqC4GHFZhBuTucJ808qYt/wAe9HQabRSi3gc=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 30, id_rol: 4, email: 'tomas.velez@hotmail.com', password_hash: 'pbkdf2_sha256$100000$Y/BSjrCao72adn62XUp1/A==$zSvcx/iVb2JF+EtgDmBqoiJszv/vpdqZNqQDiwKyTKM=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 31, id_rol: 4, email: 'luciana.mejia@gmail.com', password_hash: 'pbkdf2_sha256$100000$9Q9bsrcQXdgtcQ3sEoS0qw==$gQJoU0BkwBdlKEs8ZQuDxjPSsjDibAIIUURHd8J5ADU=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 32, id_rol: 4, email: 'santiago.bedoya@outlook.com', password_hash: 'pbkdf2_sha256$100000$+v1Ft2fllegPc66KxYdslQ==$lagu/W0IUCH/1/1VwjH9uGZ5bpauV3U3zDRXpJJvmzo=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 33, id_rol: 4, email: 'sofia.correa@yahoo.com', password_hash: 'pbkdf2_sha256$100000$X5YYqYFm87DmFlKdPM2IIA==$N5YdgKoRVov5lnDxk+HpY0el3uRPRtKZjlOtG+wP/hI=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 34, id_rol: 4, email: 'juan.pablo.rios@gmail.com', password_hash: 'pbkdf2_sha256$100000$ppXihLbdP+BPqObtEcvFRA==$8IDMacUARkeqde7+y5Kt5ITK1n0zE7KeS7PsgNyJ3H4=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 35, id_rol: 4, email: 'salome.vargas@hotmail.com', password_hash: 'pbkdf2_sha256$100000$odeeguEzBqbGeFUl6Cukhw==$zNLAxCAvwAFs8o+YdNI5L1oWVSpZqT+40PYFo/TI8l4=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 36, id_rol: 4, email: 'emilio.munoz@outlook.com', password_hash: 'pbkdf2_sha256$100000$84LuSbTOq4uSMsoBvOB8JQ==$+KOuJkCOF6gfB4i5IwCZ9cjxiWBEkOFYmVuioVPR2SU=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 37, id_rol: 4, email: 'renata.florez@gmail.com', password_hash: 'pbkdf2_sha256$100000$4mUl2A9EK52by4VcytmqTA==$jw5omikQwFGTWerTJUzMHeTmohFIBEgjR+P5EBq5nkg=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 38, id_rol: 4, email: 'lucas.agudelo@yahoo.com', password_hash: 'pbkdf2_sha256$100000$UxyeUFNHWVcxKrmN9ZP6vA==$aiDxBtvDbTuUYIEvlCsT7wcInaAB8FwLRETwzwnPf3k=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 39, id_rol: 4, email: 'antonia.giraldo@hotmail.com', password_hash: 'pbkdf2_sha256$100000$Cx79leIqOddx5Pp8dGpfKg==$U/p6SWCPG8/EZIhtU+dkuF85XXM3SILMXCLKuWkPmic=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 40, id_rol: 4, email: 'pablo.saldarriaga@gmail.com', password_hash: 'pbkdf2_sha256$100000$B3rge6bssuhLrYN6Dqe/VQ==$PRU7G+Pd+bAr3Hu+h5q2lON7FCiPCzizaMJ2DHlz3TI=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 41, id_rol: 4, email: 'manuela.castrillon@outlook.com', password_hash: 'pbkdf2_sha256$100000$J3j48OV8luQgAVOVFmPSiQ==$qZ97LignbA8YMlAEBMe6/HZal51M0lzjsX+U4Spp+94=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 42, id_rol: 4, email: 'joaquin.posada@yahoo.com', password_hash: 'pbkdf2_sha256$100000$JWilFHfSN1UXKEht+63kfA==$o0qqlYvmkqcjSKxiiEtLntoEU7A4n/LrkofVDdw1lFg=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 43, id_rol: 4, email: 'victoria.hoyos@gmail.com', password_hash: 'pbkdf2_sha256$100000$nO6D9OlbuGzXjvZU3QLm1g==$Doix49yQ5gqLELdqNVJkT6rntC+C6bCNThzJZ8od/gg=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 44, id_rol: 4, email: 'martin.tobon@hotmail.com', password_hash: 'pbkdf2_sha256$100000$twarqAN/NaN0gFVyOF9JFQ==$G/09AZHBqaaliyKX3bJWij7A8+zZqBAR6xCPCIsdgSY=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 45, id_rol: 4, email: 'alicia.quintero@outlook.com', password_hash: 'pbkdf2_sha256$100000$B7wUDeAWB1HCZteBXoXPaQ==$EVtyZ7T9SaMDGF1OYeWOW+zy5eF0lqvRzU+faO8emOg=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 46, id_rol: 4, email: 'emmanuel.valencia@gmail.com', password_hash: 'pbkdf2_sha256$100000$x7YZ8tOnMr5tmHW6lLYkxg==$j0G3iqYFKJ1LXJLYV1y2l1gfdlTBgxfCvZrwNblucLI=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 47, id_rol: 4, email: 'guadalupe.usme@yahoo.com', password_hash: 'pbkdf2_sha256$100000$tI7ZTZFM324WvzaigcMqHg==$Czq309qHFUwJ0MXx50Xj30rul3nHniVOyVozw8wrYss=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 48, id_rol: 4, email: 'simon.rendon@hotmail.com', password_hash: 'pbkdf2_sha256$100000$mfazhnhXj9aKfenoWlWf0g==$1CjFmSn9kvS19Yc/e0F5VsAil++iLguadK6YdzShNRU=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 49, id_rol: 4, email: 'milena.villegas@gmail.com', password_hash: 'pbkdf2_sha256$100000$JRY1lvyHFvY8dHav3mNW4g==$5GJ5VFEZFgfr2VPXvNclv8uIScdN9e0PtN7zreLvUqE=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 50, id_rol: 4, email: 'rodrigo.palacio@outlook.com', password_hash: 'pbkdf2_sha256$100000$1XpE91xFLFj4Qo34HN2W8g==$FS1L4grMHBgR10/CzlOM8NUP9qgc8GGZ6wMzAZscA6A=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 51, id_rol: 4, email: 'elena.tamayo@yahoo.com', password_hash: 'pbkdf2_sha256$100000$rMb3dmAkSOp3t50ihCi6bg==$rFKbXUPIntbm6r+3dZQxNEqw4DNGi2FitahW5L78Wl0=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 52, id_rol: 4, email: 'gabriel.monsalve@gmail.com', password_hash: 'pbkdf2_sha256$100000$hUnuDGbPBQ7PYM0YmARzPQ==$9+L8IUyBHLRphPtOnJaE6PG5caieCAgDw9bhnjszQ/Q=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 53, id_rol: 4, email: 'cecilia.botero@hotmail.com', password_hash: 'pbkdf2_sha256$100000$TWD52pIY7YoHeCkdAHcY1g==$70gG8x1HOzFZcNpJsgHCAzkCEfv8KWUad7+YShy3eN8=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 54, id_rol: 4, email: 'felipe.alvarez@outlook.com', password_hash: 'pbkdf2_sha256$100000$7CZS/f1rbHOt+WDQlh7/Nw==$wAlggCaViAGiHyYzsoJ1lnT0cTHk/41AQccWcXvwQMQ=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
  { id_usuario: 55, id_rol: 4, email: 'andrea.osorio@gmail.com', password_hash: 'pbkdf2_sha256$100000$UP7Tac344YuOojw/gH5tag==$x29kZX0Ll7rAmjFqkKoid8XkXC8pxHWjs8Yq71k8xAw=', estado: 'ACTIVO', fecha_creacion: '2026-09-11 17:40:31' },
];
