# Migración a SQL Server · 18 de septiembre de 2026

Destino solicitado: `10.6.16.10`, base `ControlDeApuntes`, autenticación SQL. La contraseña se conserva únicamente en configuración local excluida de Git; no forma parte de este documento.

## Alcance e impacto

Se crea una base exclusiva para Apuntes y se trasladan sus cuatro tablas: Categories, Notes, NoteVersions e Imports. Se conservan IDs, payloads cifrados, revisiones, fechas, categorías e historial. No se modifican otras bases del servidor. La web sigue escuchando solamente en `127.0.0.1:3188`; SQL pasa a estar en el servidor indicado.

El origen LocalDB usa versión 17; el destino usa SQL Server 2019 (15.0.4480.2). No se restaura el backup del motor más nuevo sobre el antiguo: se crea el esquema compatible y se copian los registros mediante parámetros SQL. El respaldo original se conserva como punto de recuperación local.

## Procedimiento y criterios de aceptación

1. Comprobar TCP 1433, autenticación SQL, transporte cifrado y ausencia de una base de destino preexistente.
2. Preparar y probar el soporte de autenticación SQL, conservando el modo Windows para LocalDB y la suite de integración.
3. Detener únicamente el proceso de Apuntes durante el cambio, crear un backup COPY_ONLY/CHECKSUM local y ejecutar RESTORE VERIFYONLY.
4. Leer las cuatro tablas en una transacción estable, copiar los datos cifrados a la base nueva y comparar cantidades y SHA-256 por tabla. Comprobar el descifrado en memoria, sin guardar contenidos en informes.
5. Activar la configuración remota en `.env`, iniciar el proyecto y verificar el servidor declarado por `/api/health`, la biblioteca y la integridad de las filas.
6. Crear y verificar una copia SQL en la carpeta de backup del servidor destino. En SQL remoto el script guarda el .bak en el servidor y el recibo de verificación en `.local/backups`; no afirma haber descargado ese archivo ni calculado su SHA-256 desde el equipo cliente.

## Recuperación del cambio

La base `(localdb)\ApuntesLocal/ControlDeApuntes` se conserva. Antes de volver a ella, comprobar si se guardaron notas nuevas en el servidor remoto: regresar a la copia anterior no incorpora esos cambios automáticamente. Para una reversión inmediata, detener solo el proceso del proyecto, configurar LocalDB con SQL_USER y SQL_PASSWORD vacíos y SQL_ENCRYPT=false, conservar la clave original y reiniciar.

El backup previo, los recibos y las huellas se guardan en `.local`, fuera de Git. La clave `.local/master.key` sigue siendo necesaria para descifrar tanto la base local como la remota. Nunca regenerarla al trasladar el proyecto.

## Llevar la aplicación a otro equipo

Con acceso de red a `10.6.16.10:1433`, llevar el código, la configuración `.env` y la misma `.local/master.key`. Instalar Node y Microsoft ODBC Driver 17, instalar dependencias, compilar e iniciar. La base sigue en el servidor y no se crea una copia independiente por equipo. Los permisos del archivo de clave deben concederse al usuario Windows del nuevo equipo.

Para trasladar también la base a otro servidor se necesita el .bak alojado en el servidor SQL, la clave original y una versión compatible de SQL Server. La conexión actual usa cifrado TLS y acepta el certificado del servidor mediante `SQL_TRUST_SERVER_CERTIFICATE=true`; ese ajuste no acredita validación de su cadena de confianza.

## Resultado

Traslado verificado el 18 de septiembre de 2026: 7 categorías, 85 notas, 85 versiones y 1 registro de importación. Las huellas SHA-256 por tabla coinciden antes del COMMIT y después de persistir. Se verificaron en memoria los 170 payloads cifrados (notas y versiones) con la clave original. La conexión de destino informó transporte cifrado.

Archivos físicos en **el servidor 10.6.16.10**:

```text
C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\ControlDeApuntes.mdf
C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\ControlDeApuntes_log.ldf
```

Respaldo local previo verificado: `.local/backups/ControlDeApuntes-2026-09-18T13-42-58-575Z.bak`, con SHA-256. También se conservó una copia local protegida de la clave.

Respaldo remoto verificado:

```text
C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\Backup\ControlDeApuntes-2026-09-18T13-44-40-869Z.bak
```

El `.bak` remoto está en el servidor; su verificación fue CHECKSUM + RESTORE VERIFYONLY, no una restauración de prueba ni un hash de archivo obtenido desde el cliente. Evidencia local: `.local/sql-migration-result.json` y los recibos de `.local/backups`.

El health de la aplicación declara `server: 10.6.16.10`, `database: ControlDeApuntes`, `authentication: sql`. Se aprobaron 24 pruebas unitarias y 33 verificaciones funcionales en LocalDB independiente. La base local original permanece conservada.

En el destino se probó escritura, lectura y descifrado de una nota sintética y su versión dentro de una transacción revertida. Las huellas de las cuatro tablas no cambiaron. Edge verificó tarjetas (24 en la primera página), tabla, agenda y kanban (84 activas en cuatro columnas), con todas las escrituras HTTP bloqueadas y cero errores JavaScript. Evidencia: `.local/qa/remote-sql-review.json`.
