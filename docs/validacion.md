# Evidencia de entrega local · 18 de septiembre de 2026

Estado actual: la base se trasladó posteriormente a **10.6.16.10**. El apartado final y [el informe de migración](migracion-sql-server.md) describen la conexión activa. Los apartados anteriores conservan la evidencia de la entrega inicial en LocalDB.

## Resultado

- Aplicación servida en `http://127.0.0.1:3188` y conectada a `(localdb)\ApuntesLocal`, base `ControlDeApuntes`.
- 85 notas importadas: 84 activas, 1 archivada y 3 fijadas. Se mantienen las 6 categorías del respaldo más General, creada al preparar el espacio.
- Verificación de las 85 notas en identificador, título, contenido, categoría, etiquetas, fechas y flags: cero discrepancias. Reimportación del mismo archivo: cero nuevas y 85 omitidas.
- Respaldo SQL inicial con `COPY_ONLY`/`CHECKSUM` y `RESTORE VERIFYONLY` correcto. Se conservan la exportación cifrada original y una copia con SHA-256.
- El HTML original no tiene diferencias respecto al HEAD inicial.

## Design System

Verificación remota por Git; el conector GitHub devolvió 404 para este repositorio y se usó el acceso Git disponible. La release estable es `react-v0.3.0`, objeto tag `76d75a3eedefeeabf8698f0530b25f5fedefabb8`, commit distribuible `bf28fd6b64b56fd041df1e2247e5f0be368c4d67`. El `main` remoto `04a149f8c3d62f713361447d806d1f53d381ccf1` declara 0.3.2; no se instaló como release.

Se verificaron nombre, versión, peers, 48 exports ESM, declaraciones TypeScript, tokens y CSS. React y React DOM 19.3.0 tienen una sola resolución. El manifest fija la referencia HTTPS del tag y el lockfile fija el commit. El instalador acota a su proceso la conversión de SSH a HTTPS; se comprobó una instalación limpia en un directorio temporal, sin cambiar la configuración global de Git. `npm audit`: cero vulnerabilidades informadas.

En navegador, `SaButton` usa las clases públicas SANNA, su fondo de variante primaria y Plus Jakarta Sans local. No se detectaron peticiones a servicios externos. La adopción ampliada usa 27 componentes y `useToast`; el mapa de componentes, funciones y adaptaciones está en [sanna-adopcion.md](sanna-adopcion.md).

## Pruebas ejecutadas

`npm test`: **19 pruebas aprobadas**, sobre normalización, conservación de contenido, fechas y flags, duplicados, categorías huérfanas, estados modernos, autenticación de ciphertext, compatibilidad de backups, filtros y edición reversible de Markdown. Incluye cercos vacíos, incompletos, anidados como texto literal, CRLF, selección parcial y tareas con identificadores duplicados.

`npm run build`: **correcto**. El renderizador Markdown se carga al abrir una vista previa. Con la adopción ampliada de SANNA, el bundle inicial es de aproximadamente 582 kB (175 kB gzip); Markdown se entrega en otro archivo de 154 kB. Vite conserva la advertencia no bloqueante del umbral de 500 kB del archivo principal.

`npm run test:integration`: **33 verificaciones aprobadas**, con SQL Server real y Edge headless, en una base temporal independiente que se eliminó al terminar:

1. Importación transaccional y repetición sin duplicados.
2. Rechazo completo de importaciones inválidas.
3. Contenido cifrado en SQL.
4. Conflictos de edición simultánea.
5. API conectada y rechazo de orígenes/clientes externos.
6. Validación HTTP de entradas.
7. Componentes SANNA, fuentes locales y ocultación de vistas previas privadas.
8. Biblioteca sin infracciones en la comprobación automática axe WCAG A/AA.
9. Crear nota, etiquetas y checklist; persistencia tras recarga.
10. Kanban por arrastre y por selector.
11. Recuperar una versión del historial como borrador y guardarla.
12. Papelera y restauración desde UI.
13. Búsqueda sin tildes, etiquetas y filtros al fijar.
14. Crear categoría y guardarla sin cambiar su nombre.
15. Reasignar también notas archivadas y eliminadas al quitar una categoría.
16. Descargar un respaldo cifrado completo y descifrarlo.
17. Importar el respaldo por UI sin duplicar notas.
18. Vista móvil a 390 px, sin desbordamiento horizontal de la página.
19. Ausencia de errores de consola y solicitudes a terceros en el recorrido normal.
20. Alternar código/texto sin anidar cercos; vista previa, deshacer/rehacer y continuar fuera del bloque.
21. Guardar con Ctrl+Enter incorpora una tarea aún no añadida; el cierre protege el borrador.
22. Título requerido también por atajo; doble guardado bloqueado y cierre desactivado durante escritura.
23. Fallo de red simulado: conservar el borrador y guardar al reintentar.
24. Conflictos de revisión: guardar el borrador como copia o cargar la versión actual con confirmación.
25. Reordenamiento atómico de categorías; rechazo sin cambios de órdenes incompletos/duplicados e importaciones malformadas.
26. Reordenar categorías desde UI y restablecer el filtro al eliminar la categoría seleccionada.
27. Contraseña incorrecta, archivo JSON inválido y retorno desde la vista previa de importación.
28. Editor móvil a 390 px, formato usable, restauración del scroll y auditoría automática de accesibilidad del editor, categorías, respaldos y editor móvil.
29. Tabla SANNA: filtro por columna, orden por título, paginación, ocultación de contenido privado y retorno desde vista rápida conservando la página.
30. Agenda: selección de fechas, semana alineada de lunes a domingo, porcentajes reales, creación por día, notas sin fecha, etiquetas existentes, mayúsculas/minúsculas y foco estable. Escape cierra primero el calendario, también desde sus botones.
31. Menú de tarjeta: consulta privada explícita, historial, archivar/desarchivar, papelera con confirmación y deshacer desde el toast.
32. Selector de categorías con búsqueda y creación desde plantilla SANNA.
33. Agenda y tabla a 390 px sin desbordamiento global, errores JS ni solicitudes externas; accesibilidad automática de ocho estados adicionales.

Además se abrió la aplicación final con los datos importados, se comprobaron 24 tarjetas paginadas, el contador de 84 activas y las 4 columnas con 84 tarjetas en kanban. Esta comprobación fue de solo lectura y no modificó apuntes.

Las capturas `desktop.png`, `kanban.png`, `mobile.png`, `editor-polished.png` y `editor-mobile.png`, los informes de accesibilidad y el detalle de resultados están en `.local/qa/` y contienen exclusivamente datos sintéticos. El reporte de migración solo contiene cantidades, nombres de campos y la huella del archivo cifrado.

## Límites de la validación

No había scripts previos de lint ni typecheck; la aplicación usa JavaScript y no se reportan esas comprobaciones como realizadas. La comprobación automática axe WCAG A/AA cubre 13 estados: biblioteca, editor, categorías, respaldos, editor móvil, vista rápida, tabla, calendario del editor, agenda, historial, confirmación, agenda móvil y tabla móvil, con cero infracciones detectadas. No sustituye una auditoría manual integral. No se realizó despliegue remoto, QA de autenticación multiusuario ni pruebas de disponibilidad prolongada. El producto entregado es un espacio personal local.

## Corrección y pulido del editor

El fallo reportado se reprodujo sin escribir en las notas personales: dos clics en Código creaban cuatro delimitadores Markdown. La acción ahora detecta el bloque que contiene el cursor o la selección y lo quita al volver a pulsarla. También existe **Texto simple**, que conserva el contenido, y **Continuar debajo del código**, que mantiene el bloque y coloca el cursor fuera. Negrita y listas son reversibles. Deshacer/rehacer del contenido funciona por botones y Ctrl+Z / Ctrl+Shift+Z; el historial del borrador permanece solo en memoria con límite de tamaño.

Las tareas pendientes se incluyen al guardar; los campos se bloquean durante la escritura y el borrador permanece abierto cuando falla la red. Un conflicto de versiones ofrece guardar como copia o cargar la versión actual con confirmación. No se sobrescribe silenciosamente la otra edición.

El cierre por fondo del modal SANNA se inicia únicamente cuando la pulsación comienza sobre el fondo, evitando cierres por soltar fuera después de seleccionar texto dentro. Se bloquea el scroll del fondo y se restaura al cerrar. El botón de guardar conserva su nombre accesible mientras está cargando. Se ajustó el contraste de los textos del editor y del historial.

El reordenamiento de categorías usa una sola transacción. La eliminación de una categoría activa restablece el filtro. Los respaldos inválidos producen mensajes de validación; se puede volver a elegir archivo desde su vista previa. Se validan duplicados de identificadores de notas sin distinción de mayúsculas y duplicados de tareas.

Antes del pulido se generó y verificó `ControlDeApuntes-2026-09-18T05-39-26-284Z.bak`, además de una copia del código anterior en `.local/backups/`. La clave `.local/master.key` sigue siendo necesaria para restaurar el contenido cifrado. No hubo migraciones de esquema ni cambios deliberados en notas personales.

Comprobación final del 18 de septiembre de 2026, 01:05 de Lima: las 85 notas y 7 categorías mantienen la misma huella SHA-256 de filas cifradas, revisiones y metadatos antes/después del pulido. No quedaron bases de QA. El servidor actualizado respondió correctamente en el puerto 3188 y una sesión independiente de Edge verificó 24 tarjetas paginadas y la conversión código/texto en un borrador descartado, con cero escrituras sobre las notas reales y cero errores de ejecución. Evidencia: `.local/qa/personal-data-before-polish.json` y `personal-data-after-polish.json`.


## Adopción ampliada de SANNA · entrega posterior al pulido

Se añadieron agenda, tabla, vista rápida e historial lateral y se migraron formularios, respaldos, menús, alertas y notificaciones. Los encabezados del calendario se alinean con la cuadrícula; los campos conservan mayúsculas/minúsculas y el foco. La tabla conserva su página al consultar una nota. Las métricas de la agenda calculan porcentajes reales según los filtros; no muestran valores de demostración del paquete.

Respaldo previo verificado: `.local/backups/ControlDeApuntes-2026-09-18T06-17-20-480Z.bak`; código previo: `.local/backups/source-sanna-20260918-011617.zip`. No hubo cambios de esquema ni escrituras de pruebas sobre la base personal.

El servidor local se inició en 3188. Una sesión independiente de Edge, con todas las escrituras API bloqueadas, verificó tarjetas, tabla, agenda y kanban sobre los datos personales: 85 notas, 84 activas y 7 categorías, sin errores de ejecución ni intentos de mutación. La huella de las filas SQL permaneció idéntica antes/después de este recorrido. Evidencia: `.local/qa/personal-data-before-live-sanna.json` y `personal-data-after-sanna.json`.

Capturas adicionales con datos sintéticos: `agenda.png`, `table.png`, `quick-note.png`, `history.png`, `agenda-mobile.png` y `table-mobile.png`, en `.local/qa/`. Las pruebas no recargan ni alteran la pestaña del usuario. Para ver la nueva compilación en una pestaña ya abierta, guardar primero el borrador y recargar.


## Alineación de cierres · 18 de septiembre de 2026

Se corrigió únicamente la presentación de las X en los diálogos, paneles laterales y avisos. El carácter tipográfico original aparecía 4 px por debajo del centro del botón. Ahora se dibuja un icono SVG mediante una máscara CSS, centrado dentro de un control fijo de 36 × 36 px; se conservan su etiqueta accesible y las acciones originales. El ajuste está acotado a `src/sanna-workspace.css`.

Build correcto. Se verificaron 14 cierres en escritorio (1536 px) y móvil (390 px): editor, confirmación, respaldos, categorías, vista rápida, historial y avisos. También se comprobó el botón Cerrar del editor y Escape del historial. Las capturas muestran un desvío máximo de medio píxel por rasterización, frente a los 4 px anteriores. Se usó una sesión independiente con respuestas API sintéticas interceptadas; no hubo escrituras SQL. Evidencia: `.local/qa/close-alignment-results.json` y `close-*.png`.

## Migración a SQL Server 10.6.16.10

Se creó `ControlDeApuntes` en el servidor solicitado con autenticación SQL y transporte cifrado. Se conservaron 7 categorías, 85 notas, 85 versiones y 1 registro de importación. Los SHA-256 por tabla coinciden entre origen y destino; se verificó descifrado de los 170 payloads en memoria. No se modificaron otras bases del servidor. Se conservó la base LocalDB original y su backup previo verificado.

Las 24 pruebas unitarias (incluidas cinco nuevas de configuración y escape ODBC), el build y las 33 verificaciones funcionales pasaron. La suite de integración fuerza LocalDB y credenciales Windows para evitar ejecutarse contra el servidor compartido cuando .env apunta a SQL remoto.

Prueba remota adicional: INSERT/lectura/descifrado de una nota sintética y su versión dentro de una transacción revertida, seguida de comparación de huellas sin cambios. Una sesión independiente de Edge recorrió tarjetas, tabla, agenda y kanban, con escrituras HTTP bloqueadas; confirmó 85 notas, 7 categorías y 84 activas, sin errores JavaScript. El health reportó el servidor 10.6.16.10 y autenticación SQL. Se generó también un .bak remoto con CHECKSUM y RESTORE VERIFYONLY; ese archivo está en el servidor, no descargado al cliente.

Evidencia y rutas: [migracion-sql-server.md](migracion-sql-server.md), `.local/sql-migration-result.json`, `.local/qa/remote-sql-review.json` y recibos de `.local/backups`. Las credenciales y la clave están excluidas de Git. No se realizó QA multiusuario ni despliegue remoto de la web.

## Lanzadores Windows: local y servidor

Se añadieron `levantar-proyecto.bat` y `cerrar-proyecto.bat`, con puertos fijos 3188 (local) y 5179 (servidor), compartidos por la web y la API. Se conservaron los accesos anteriores y se separó la instalación explícita del arranque habitual. El preflight consulta SQL y comprueba la clave sin ejecutar DDL, migraciones ni escrituras de notas.

Pasaron las 13 pruebas operativas de `scripts/test-launchers.ps1`: ayuda y errores de argumentos; cierre repetido; colisión con un proceso ajeno; PID obsoleto; metadatos del otro perfil; bloqueo de operaciones simultáneas; rutas con espacios; comprobación sin arranque; puerto servidor fijo pese a PORT externo; reutilización del PID; rechazo de instalación con la aplicación abierta; independencia de perfiles; y cierre conjunto. La suite termina con el perfil local iniciado. Los procesos del proyecto de referencia en 3002/5176 conservaron sus PID.

Edge verificó la aplicación iniciada por el nuevo lanzador: 24 tarjetas en la primera página, SQL Server 10.6.16.10, cero errores JavaScript y cero escrituras HTTP. La compilación pasó y se comprobó su reutilización. El índice documental pasó enlaces, ausencia de desbordamiento e inspección automática de accesibilidad en 1440×1000 y 390×844. Evidencias locales: `.local/qa/launchers.json`, `.local/qa/launcher-browser.json` y `.local/qa/docs-review.json`.

Los dos perfiles se probaron en este Windows. El puerto 5179 deberá comprobarse de nuevo en el host destino, como hace automáticamente el lanzador. El perfil servidor sigue escuchando en 127.0.0.1; no se desplegó la web ni se habilitó acceso por LAN. [Operación y preparación del servidor](operacion-windows.md).
