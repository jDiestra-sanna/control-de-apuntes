# Documentación de Apuntes

Abre [index.html](index.html) en un navegador para consultar la guía completa: uso, arquitectura, datos, API, arranque, respaldo, recuperación y límites del producto. Se puede abrir directamente desde disco; no requiere que la aplicación ni SQL estén iniciados. Mantén la carpeta `docs/` completa para conservar enlaces y capturas.

[Operación Windows: local y servidor](operacion-windows.md) explica los dos `.bat`, puertos fijos 3188/5179, instalación, cierre y preparación de otro host. Los diagramas existentes representan el perfil local; ambos perfiles conservan la misma arquitectura y conexión SQL.

## Diagramas Archify

| Recorrido | Tipo | HTML | Fuente editable |
| --- | --- | --- | --- |
| Aplicación local y SQL remoto | architecture | [Explorar](visual/arquitectura.html) | [JSON](visual/arquitectura.architecture.json) |
| Guardado, revisión y transacción | sequence | [Explorar](visual/guardado.html) | [JSON](visual/guardado.sequence.json) |
| Importación de respaldos | dataflow | [Explorar](visual/respaldos.html) | [JSON](visual/respaldos.dataflow.json) |

Los HTML individuales son autónomos. Sus funciones de búsqueda, zoom, selección, tema y exportación no necesitan conectarse a la API de Apuntes. El contenido está escrito en español; los controles fijos y `html lang` de Archify usan el idioma de respaldo inglés.

El visor generado intenta cargar la fuente JetBrains Mono desde Google Fonts. Si no hay conexión utiliza su fuente de respaldo; el diagrama sigue disponible. El índice usa fuentes del sistema y recursos locales.

[Entrega y revisión visual](visual/entrega.md) reúne los recibos de los tres diagramas. [fuentes.json](visual/fuentes.json) identifica archivos locales y sus SHA-256. Esta documentación no declara que el nuevo proyecto esté publicado ni vincula archivos locales no versionados a un commit remoto.

## Actualizar los diagramas

Requiere Node y el skill Archify instalado. Los comandos se ejecutan desde la raíz del proyecto. Se utilizó Archify 2.16, sin instalar dependencias en la aplicación.

1. Contrasta el cambio con el código. Edita el JSON correspondiente, preservando `meta.quality_profile: "showcase"`. Actualiza la guía cuando cambie el comportamiento descrito.
2. Valida el candidato después de cada edición. Solo continúa si hay 9/9 controles aprobados, cero errores y cero advertencias.
3. Entrega el HTML con `deliver`. Solo después de su salida correcta ejecuta `visual-check`.
4. Inspecciona las capturas de ambos temas; la medición automática no sustituye esta revisión. Registra las rondas y los nuevos hashes en `visual/entrega.md`.
5. Actualiza las huellas de `fuentes.json` únicamente tras volver a revisar los archivos que cambiaron. Comprueba enlaces y abre el índice en escritorio y móvil.

Ejemplo completo para la arquitectura en PowerShell:

```powershell
$archifyCli = Join-Path $env:USERPROFILE '.agents/skills/archify/bin/archify.mjs'
node $archifyCli validate architecture docs/visual/arquitectura.architecture.json --quality showcase --json
if ($LASTEXITCODE -ne 0) { throw 'La validación no pasó.' }
node $archifyCli deliver architecture docs/visual/arquitectura.architecture.json docs/visual/arquitectura.html --quality showcase --json > docs/visual/receipts/arquitectura.delivery.json
if ($LASTEXITCODE -ne 0) { throw 'No se entregó el candidato. No validar visualmente una salida anterior.' }
node $archifyCli visual-check docs/visual/arquitectura.html --json
if ($LASTEXITCODE -ne 0) { throw 'Revisar contención o disponibilidad de Chrome.' }
```

Para los otros recorridos cambia los argumentos según la tabla. `visual-check` escribe recibos y capturas junto al HTML; su campo `visualReview: pending` es intencionado. El resultado de la inspección humana se registra por separado en `entrega.md`.

No modificar directamente los HTML generados: se perdería la correspondencia con la especificación y con el recibo de entrega. No añadir ejemplos con notas personales, contraseñas, archivos de respaldo reales ni contenidos de `.local/master.key`.

## Conexión actual

SQL Server `10.6.16.10`, base `ControlDeApuntes`, autenticación SQL en `.env`. La API sigue en loopback. Consulta [Migración a SQL Server](migracion-sql-server.md) para verificación, rutas, backups y traslado del cliente.

## Referencias complementarias

- [README del proyecto](../README.md): instalación y resumen funcional.
- [Análisis funcional](analisis-funcional.md): alcance inicial y oportunidades.
- [Adopción SANNA](sanna-adopcion.md): componentes y adaptaciones.
- [Validación de la aplicación](validacion.md): pruebas ejecutadas anteriormente, evidencia y limitaciones.

La entrega original de documentación no alteró la aplicación. La actualización posterior refleja la migración autorizada de la base; sus pruebas y alcance están en el informe de migración.
