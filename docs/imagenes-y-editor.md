# Imágenes por nota y editor visual

Las notas nuevas abren directamente en **Editor visual**, con la barra de herramientas visible. Los botones **Editor visual** y **Markdown** permiten cambiar de formato sin buscar un desplegable. Al abrir una nota existente se muestra **Escribir**; las notas antiguas conservan su Markdown y la plantilla SQL abre en Markdown. El editor visual habilita tipografía, tamaño, negrita, cursiva, subrayado, tachado, color, alineación, listas con sangría, citas, código, enlaces, emojis y quitar formato. Los botones de código se pueden alternar para volver al texto. Deshacer y rehacer conservan su historial al consultar la vista previa. Las notas anteriores conservan su Markdown. Volver de visual a Markdown pide confirmar la simplificación de los estilos que Markdown no representa.

**Adjuntar imágenes** permite seleccionar varios archivos; también se pueden arrastrar a la nota o pegar capturas con Ctrl+V. La galería permite añadir una descripción, ampliar, descargar y quitar cada imagen. Guardar la nota guarda también sus imágenes y descripciones. Cerrar y descartar un borrador no carga archivos a SQL. La búsqueda incluye nombres y descripciones de imágenes; las tarjetas privadas ocultan su contenido y contador de imágenes.

Límites: 8 imágenes por nota, 4 MiB por archivo y 12 MiB en total; PNG, JPEG y WebP estáticos hasta 24 megapíxeles. El servidor decodifica los píxeles, rechaza archivos falsificados o animados y genera WebP sin pérdida, sin metadatos EXIF. Conserva el nombre original como etiqueta; la descarga entrega la copia WebP. No se admiten adjuntos PDF/Office ni imágenes remotas incrustadas.

## Persistencia e historial

- `Notes.Payload` y `NoteVersions.Payload` incluyen `format`, `content`, `plainText` y referencias `images[]` con nombre, descripción, fecha, tamaño, dimensiones y SHA-256.
- `dbo.NoteImages`: `Id` (PK), `Hash` (UNIQUE), `Payload` AES-256-GCM y `CreatedAt`. El payload contiene el binario base64 y sus metadatos técnicos. La misma imagen se almacena una sola vez aunque se adjunte o duplique varias veces.
- Nota, imágenes nuevas e historial se guardan dentro de una misma transacción. Un error o conflicto revierte todas las escrituras de esa operación.
- Retirar una imagen de la nota actual conserva el binario para consultar o recuperar versiones anteriores. No existe purga automática. Las referencias viven dentro del payload cifrado; la integridad entre notas e imágenes se valida en el repositorio, no mediante FK SQL.
- `GET /api/workspace` y el historial entregan referencias sin binarios. `GET /api/images/:id` entrega WebP con `Cache-Control: no-store` y requiere el mismo encabezado de cliente que el resto de la API. La interfaz usa URLs blob temporales y las libera al cerrar.
- El HTML se sanitiza tanto en la vista como en el servidor: etiquetas y estilos permitidos, sin scripts, manejadores de eventos ni imágenes externas. Los enlaces se abren con `noopener noreferrer`.

## Actualizar una instalación existente

Conserva `.env` y **la clave original** `.local/master.key`. Cierra las instancias de este proyecto antes de migrar. Desde la raíz:

```powershell
.\cerrar-proyecto.bat --local
node scripts/install.js
node scripts/migrate-images.js
.\levantar-proyecto.bat --local --no-browser
```

En el perfil servidor, sustituye `--local` por `--servidor` al cerrar y levantar. El puerto permanece fijo: local 3188 y servidor 5179. Los perfiles siguen escuchando en loopback.

La migración exige primero un backup `COPY_ONLY/CHECKSUM` verificado con `RESTORE VERIFYONLY`; después añade `NoteImages` de forma idempotente. Compara cantidades y huellas de las cuatro tablas anteriores antes/después. El recibo local es `.local/backups/images-migration.json`. No reemplaza claves, notas ni historial. Una instalación nueva usa `scripts/setup.js` con el esquema actualizado.

Rollback del código: mantener la tabla nueva y no borrar binarios. No editar notas visuales o con imágenes desde una versión anterior del programa, que no conoce esos campos. Para retroceder datos, restaurar el backup previo en otra base, conservar la clave original y verificarla antes de cambiar la conexión; esa copia no contendrá notas guardadas después del backup.

## Respaldos y traslado

La exportación portátil v4 (`GET /api/export`) incluye las imágenes de las notas actuales dentro del archivo cifrado con contraseña. Admite 60 MiB de contenido antes de cifrar y hasta 90 MiB de archivo cifrado en la importación; la API admite 64 MiB de JSON descifrado. Las bibliotecas mayores deben trasladarse con el backup SQL completo. Las importaciones antiguas sin imágenes siguen siendo compatibles; se omiten identificadores de nota ya existentes.

El historial, incluidas imágenes retiradas, se traslada mediante **backup SQL + `.local/master.key`**. El archivo portátil no incluye versiones anteriores. Las contraseñas y claves no se publican en el repositorio.

## Verificación

`npm test`, `npm run build` y `npm run test:integration`. La suite crea una base SQL LocalDB temporal y utiliza imágenes sintéticas; cubre formato visual, archivos, eventos de portapapeles y arrastre, persistencia tras recarga, descarga, cifrado, deduplicación, rollback, conflictos, historial, duplicado, papelera, respaldo, conversión Markdown, accesibilidad y móvil. Para ejecutar solo las comprobaciones nuevas: `node scripts/integration-test.js --media-only`.

Fuentes de implementación: [Tiptap React](https://tiptap.dev/docs/editor/getting-started/install/react), [TextStyleKit](https://tiptap.dev/docs/editor/extensions/functionality/text-style-kit), [Sharp](https://sharp.pixelplumbing.com/api-constructor/). Se conserva SANNA estable 0.3.0; no se instala la versión fuente 0.3.2 sin release.

Validación del 18/09/2026: 27 pruebas unitarias y 40 verificaciones funcionales aprobadas; compilación de producción correcta. Tras pulir el editor se repitió la suite específica de medios (13 verificaciones). La migración remota conservó las huellas de 86 notas, 93 versiones, 7 categorías y 1 registro de importación. Evidencia y recibo de backup en `.local/qa` y `.local/backups`, fuera del repositorio.
