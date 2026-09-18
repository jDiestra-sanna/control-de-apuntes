# Entrega Archify · 18 de septiembre de 2026

Tres diagramas independientes, con contenido en español y visor en inglés. Generados con Archify 2.16 desde fuentes locales revisadas. Los recibos de entrega vinculan los bytes exactos de cada especificación con su HTML; la revisión visual se documenta aparte.

## Aplicación local y SQL remoto

```text
diagram_type: architecture
output: C:/Users/jdiestra/Desktop/control-de-apuntes/docs/visual/arquitectura.html
specification_sha256: 2f6b879edfaef7aae1a7d1853f9cbb3bcc0452c8c7cf4641214955b69827a732
specification_bytes: 5028
artifact_sha256: b5339d7bccc3fc321ff57b700fc931eae78a0c8afb4a1d08d3a2a95f41ca18c5
artifact_bytes: 712831
validation: 9/9 showcase, 0 errors, 0 warnings
visual_review: passed
correction_rounds: 0
```

[Abrir HTML](arquitectura.html) · [Especificación](arquitectura.architecture.json) · [Recibo](receipts/arquitectura.delivery.json) · [Capturas](arquitectura.visual-check.html) · [Mediciones](arquitectura.visual-check.json)

## Guardar una nota

```text
diagram_type: sequence
output: C:/Users/jdiestra/Desktop/control-de-apuntes/docs/visual/guardado.html
specification_sha256: eb745cd23def268b60f68cc2453a642be49a42fec18cd63781a6b8dfa2862bf8
specification_bytes: 3813
artifact_sha256: 8c857d4b1ac990c5ded2445256d59411b85fe01db1d8d3f688b3bdc64b7c87ed
artifact_bytes: 707407
validation: 9/9 showcase, 0 errors, 0 warnings
visual_review: passed
correction_rounds: 2
```

[Abrir HTML](guardado.html) · [Especificación](guardado.sequence.json) · [Recibo](receipts/guardado.delivery.json) · [Capturas](guardado.visual-check.html) · [Mediciones](guardado.visual-check.json)

La primera composición tenía desbordamiento vertical. Se compactó el espaciado de mensajes y se integró la confirmación SQL en la descripción del COMMIT. Se conservan las operaciones y el orden del guardado; no se redujo la tipografía. La secuencia representa el camino correcto, con conflictos y fallos explicados en las tarjetas inferiores y en la guía.

La segunda corrección retiró tres anotaciones secundarias que se solapaban al exportar PNG. Su explicación ya aparece en la guía de contratos y persistencia. Se conservaron las etiquetas de todas las llamadas, las revisiones, la escritura y la confirmación de la transacción.

## Importar un respaldo

```text
diagram_type: dataflow
output: C:/Users/jdiestra/Desktop/control-de-apuntes/docs/visual/respaldos.html
specification_sha256: 52c69047552c7a2f37d702eb83213db8edb9920a9949285cde04448e87d79c0a
specification_bytes: 3706
artifact_sha256: d439b622e2d8edc6dbd30087b5dc2da75d701aa20a798d7d51cb62366b10c298
artifact_bytes: 708265
validation: 9/9 showcase, 0 errors, 0 warnings
visual_review: passed
correction_rounds: 0
```

[Abrir HTML](respaldos.html) · [Especificación](respaldos.dataflow.json) · [Recibo](receipts/respaldos.delivery.json) · [Capturas](respaldos.visual-check.html) · [Mediciones](respaldos.visual-check.json)

## Alcance de la revisión

- Los tres comandos `deliver` terminaron correctamente y aprobaron los nueve controles del perfil showcase. Los hashes corresponden a los HTML entregados, sin ediciones manuales posteriores.
- `visual-check` aprobó contención horizontal y vertical en 1440×900, 1600×1000, 1920×1080 y 2048×1320 para cada diagrama.
- Se inspeccionaron las doce capturas: temas claro y oscuro en los tamaños menor y mayor. Se revisaron legibilidad, tarjetas, etiquetas, trayectorias, distribución vertical y ausencia de recortes. Los diagramas mantienen su contenido completo en la primera pantalla de los cuatro tamaños comprobados.
- Los JSON automáticos mantienen `visualReview: pending`: ese campo no prueba inspección visual. El estado `visual_review: passed` anterior corresponde a la revisión de sus capturas realizada después de la entrega.
- En los tres HTML se probaron búsqueda, selección de un componente, cierre de su ficha, cambio de tema y descarga PNG, bloqueando solicitudes HTTP externas. No hubo errores JavaScript. Se inspeccionaron las tres imágenes exportadas y no incluyen los controles del visor. Evidencia: `.local/qa/docs-viewer-review.json` y `docs-*-export.png`.
- `correction_rounds` cuenta rondas de corrección visual. Los ajustes previos por diagnósticos deterministas no constituyen pruebas de ejecución de la aplicación.
- [fuentes.json](fuentes.json) permite detectar cambios respecto al código revisado. No contiene apuntes ni secretos. El contenido deriva del checkout local; no acredita publicación remota.

La entrega inicial de documentación no inició operaciones SQL. Posteriormente se actualizó la arquitectura tras la migración autorizada a 10.6.16.10; su evidencia está en [migracion-sql-server.md](../migracion-sql-server.md). Las pruebas de aplicación previas siguen documentadas por separado en [validacion.md](../validacion.md).

## Índice de documentación

Se abrió `docs/index.html` en Edge con una sesión independiente, a 1440×1000 y 390×844. Sus 36 enlaces se verificaron contra destinos locales o anclas; las tres imágenes cargaron correctamente. No hubo desbordamiento horizontal global ni errores JavaScript. Axe no detectó infracciones WCAG A/AA en esos dos tamaños; esta comprobación automática no sustituye una auditoría manual integral.

Se inspeccionaron las capturas de portada y modelo de datos en ambos tamaños. Las tablas conservan su anchura de lectura con desplazamiento horizontal en móvil. El índice no solicitó recursos externos. Evidencia local: `.local/qa/docs-review.json`, `docs-portal-*.png` y `docs-datos-*.png`, fuera de Git.
