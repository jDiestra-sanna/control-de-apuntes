# Guardado local y sincronización

El modo predeterminado guarda primero en archivos locales cifrados. No requiere instalar otra base de datos. Después de completar la primera descarga con VPN, permite consultar, crear y editar notas, adjuntar imágenes, usar categorías, kanban, archivo, papelera, historial y exportación sin acceso a SQL Server.

Cada guardado confirma la escritura local antes de responder. La aplicación intenta sincronizar al iniciar y cada 60 segundos mientras el proceso Node esté activo, aunque cierres la pestaña. También puedes pulsar **Sincronizar ahora**. Cerrar el proyecto detiene los intentos; al iniciarlo nuevamente se recupera la cola. El editor sigue requiriendo **Guardar** o Ctrl+Enter: no guarda automáticamente cada pulsación ni los borradores descartados.

## Dónde se guarda

Dentro del proyecto:

```text
.local/
  master.key
  offline/
    <identificador del servidor y base>/
      workspace.enc.json
      images/
        <sha256>.enc.json
```

`workspace.enc.json` contiene notas, categorías, historial, referencias a imágenes, cola de operaciones, revisiones remotas y última sincronización. Cada archivo de `images` contiene un binario cifrado. Se incluyen las imágenes de versiones anteriores, aunque se hayan retirado de la nota actual. Los archivos usan AES-256-GCM con la clave original; ni su contenido ni la clave se publican en Git. No edites manualmente estos archivos ni cambies la clave.

La carpeta del destino se deriva de servidor/base. Cambiar `.env` a otra base no reutiliza accidentalmente la cola anterior. Los perfiles 3188 y 5179 del mismo checkout comparten copia y bloqueos; equipos o checkouts distintos mantienen copias independientes.

## Sincronización y conflictos

1. Una escritura local reemplaza el archivo mediante un temporal cifrado, vaciado a disco y renombrado. La nota y su operación pendiente se confirman juntas. Los binarios se escriben antes de publicar sus referencias.
2. Cada operación tiene un UUID persistente. SQL aplica el cambio y su recibo cifrado en `dbo.SyncOperations` dentro de una única transacción. Si se pierde la respuesta después del COMMIT, el siguiente intento recupera el recibo y no repite la escritura.
3. Cada guardado de nota conserva una versión. Las operaciones sucesivas dependen del recibo de la anterior, incluso si se sigue editando mientras hay una sincronización en curso.
4. Una revisión remota diferente provoca una **copia por conflicto**. Se mantienen la nota original del servidor y la copia local, incluidas las ediciones locales posteriores. La interfaz avisa. Las notas abiertas antes de una actualización conservan su borrador y requieren resolver el conflicto de revisión al guardar.
5. Las categorías nuevas con el mismo nombre se unifican. Renombrados incompatibles conservan una copia de la categoría; las notas ya sincronizadas permanecen en su categoría original y las pendientes siguen su destino local. El orden combina los IDs conocidos con las categorías nuevas del servidor. Una categoría con notas o cambios remotos nuevos no se elimina.
6. Se descarga una instantánea consistente de categorías, notas y todas sus versiones; los binarios ya disponibles se reutilizan por SHA-256. Los cambios locales pendientes se conservan sobre esa instantánea. No se implementa eliminación permanente ni purga de historial/recibos.

**Guardado localmente** confirma persistencia en el equipo. **Cambios pendientes** significa que SQL todavía no confirmó esos guardados. **Última sincronización** corresponde a la última descarga completada; si hay pendientes, esa fecha no significa que ya se hayan enviado. La API `/api/health` verifica disponibilidad local; su `sync.remoteOnline` refleja el último intento, no una comprobación continua de VPN.

## Actualizar una instalación existente

Cierra ambos perfiles. Con VPN, configuración y clave originales:

```powershell
.\cerrar-proyecto.bat --todos
node scripts/migrate-offline.js
.\levantar-proyecto.bat --local --no-browser
```

La migración genera un backup SQL `COPY_ONLY/CHECKSUM`, ejecuta `RESTORE VERIFYONLY` y añade únicamente la tabla `SyncOperations`. Compara cantidades y huellas de las cinco tablas anteriores. Recibo: `.local/backups/offline-migration.json`. No se ejecuta automáticamente al arrancar. Una instalación nueva usa `scripts/setup.js` con el esquema completo.

Al iniciar, espera **Guardado localmente y sincronizado** antes de desconectar la VPN por primera vez. Sin copia previa, la interfaz indica que falta la primera descarga y evita presentar la biblioteca como vacía. El preflight de los `.bat` comprueba la copia y la clave sin depender de SQL.

Configuración opcional: `APUNTES_STORAGE=files` (predeterminado). `APUNTES_STORAGE=sql` conserva el modo anterior de conexión directa; no lo uses para trabajar sin VPN. `APUNTES_OFFLINE_ROOT` permite cambiar la raíz de archivos y se utiliza para aislar las pruebas; cambiarlo no mueve la copia existente.

## Respaldo, traslado y recuperación

- Para llevar **todo**, incluidos cambios pendientes e historial, detén ambos perfiles y copia `.local/offline/` junto con `.local/master.key`, código y `.env` por un medio seguro. Conserva permisos Windows restringidos. El destino SQL debe seguir siendo el mismo para reutilizar esa cola.
- La exportación portátil desde la web funciona sin VPN e incluye notas actuales e imágenes, hasta 60 MiB de contenido; no incluye versiones anteriores. Los respaldos SQL solo incluyen cambios que ya llegaron al servidor.
- La sincronización no sustituye una copia de seguridad: una avería de disco puede afectar a cambios que aún no llegaron a SQL. Conserva respaldos aparte de la carpeta activa.
- Si falta la clave, el cifrado está dañado o no se puede escribir, la aplicación falla sin reemplazar la copia por una biblioteca vacía. Restaura desde una copia verificada en otra carpeta; no borres la cola para resolver un error.
- Los bloqueos de un proceso que ya terminó se recuperan al reiniciar. Un bloqueo ilegible o una interrupción durante su recuperación falla de forma conservadora: detén ambos perfiles, conserva una copia de la carpeta y revisa únicamente los archivos `.lock`/`.recovery` antes de retirarlos. Nunca borres los JSON cifrados.
- Para retroceder el código, sincroniza todos los pendientes y respalda la carpeta primero. El código anterior ignora los archivos locales y no enviará sus cambios; conserva `SyncOperations` y las imágenes.

## Pruebas

```powershell
npm test
npm run build
npm run test:integration
node scripts/offline-test.js
```

La suite tradicional fuerza `APUNTES_STORAGE=sql` y valida los contratos SQL existentes. La suite offline crea su propia base LocalDB aleatoria y su propia carpeta cifrada: prueba persistencia, operaciones simultáneas, imágenes históricas, pérdida de respuesta tras COMMIT, conflictos, importación, papelera y sincronización. Desconecta esa base temporal mediante `SET OFFLINE`, inicia/reinicia la web y guarda desde Edge sin SQL; después reconecta y verifica el envío. No desconecta la VPN, no utiliza notas reales ni cambia otras bases. Evidencia: `.local/qa/offline-results.json`.

Validación del 21/09/2026: 35 pruebas unitarias, 40 verificaciones del modo SQL y 12 verificaciones del modo offline aprobadas. Compilación correcta. La migración remota conservó las huellas de las cinco tablas existentes; la primera copia se comparó íntegramente con SQL (notas, categorías, versiones y hashes de imágenes). Los recibos y datos permanecen fuera de Git.
