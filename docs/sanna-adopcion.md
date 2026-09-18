# Adopción de SANNA en Apuntes

La interfaz utiliza la distribución estable `@sanna-ui/react@0.3.0`, tag `react-v0.3.0`, commit `bf28fd6b64b56fd041df1e2247e5f0be368c4d67`. El `main` verificado declara 0.3.2, todavía fuera del canal estable. Se conserva el manifest y lockfile existentes: esta mejora amplía el uso del paquete instalado, sin cambiar su versión.

## Componentes y uso real

| Función | Componentes públicos |
| --- | --- |
| Escritura y organización | `SaInput`, `SaTextarea`, `SaSelect`, `SaSelectFilter`, `SaCombobox`, `SaCheckbox`, `SaSwitch` |
| Fechas y agenda | `SaCalendar`, `SaTabs`, `SaMetricCard` |
| Biblioteca, lista y kanban | `SaCard`, `SaTag`, `SaProgress`, `SaStat` |
| Tabla | `SaTable`, con orden por encabezados, filtros por columna y paginación |
| Editor y confirmaciones | `SaDialog`, `SaButton`, `SaMessagebox` |
| Consulta e historial | `SaDrawer`, `SaTimeline` |
| Acciones y ayuda | `SaDropdown`, `SaTooltip` |
| Respaldo cifrado | `SaFileUpload`, sin conversión a base64 |
| Respuesta de la interfaz | `SaSkeleton`, `SaSpinner`, `SaEmptyState`, `SaToastProvider` y `useToast` |

Total: 27 componentes y un hook. La navegación, el arrastre kanban, el manejo de borradores, el formato Markdown y la persistencia siguen siendo lógica de Apuntes; el Design System aporta los controles y la presentación.

## Comportamiento

- Cinco vistas conservan la búsqueda, categoría, estado y prioridad: tarjetas, lista, tabla, agenda y kanban.
- La agenda presenta las notas del día seleccionado y las que aún no tienen fecha. Crear desde un día precarga la fecha objetivo. Los puntos del calendario indican días con apuntes.
- La tabla muestra metadatos, permite filtrar/ordenar columnas y paginar. La vista rápida conserva la página y los filtros al cerrarse.
- El menú de tarjeta permite consultar, editar, revisar historial, duplicar, archivar/desarchivar y enviar a papelera. Esta última acción se confirma y se puede deshacer.
- El panel lateral muestra la nota al abrirla explícitamente; la biblioteca, la tabla y la agenda no muestran el contenido de vistas previas privadas.
- El historial se consulta sin abrir dos ventanas modales a la vez. Recuperar una versión prepara un borrador; solo guardar escribe el cambio.
- Las confirmaciones conservan los cambios mientras se decide. Los errores de red y los conflictos de revisión mantienen el borrador.
- La carga de respaldos admite JSON cifrado de hasta 15 MB, verifica contraseña y presenta un resumen antes de importar. Cambiar archivo o pestaña limpia el estado anterior.

## Adaptaciones del consumidor

- Tokens y CSS global SANNA importados una sola vez, en el orden requerido. Plus Jakarta Sans permanece local, sin solicitudes a Google Fonts.
- Los campos `SaInput` usan `uppercase={false}` para conservar la escritura del usuario.
- Los callbacks de cierre son estables: no reinician el gestor de foco al escribir.
- Escape cierra primero el calendario o el selector abierto; no descarta accidentalmente el editor. El calendario devuelve el foco a su campo.
- Los encabezados abreviados del calendario comienzan en lunes, igual que su cuadrícula. La versión 0.3.0 recibe los encabezados en el orden de presentación.
- Las fechas objetivo se convierten entre días `YYYY-MM-DD` y fechas locales, sin usar UTC para extraer el día. «Mi día» conserva la zona America/Lima.
- Los datos de la tabla se memorizan para evitar que abrir un panel reinicie la paginación.
- Se oculta la flecha de tendencia predeterminada de `SaStat`: los contadores expresan cantidades, no crecimiento.
- `SaMetricCard` muestra porcentajes calculados sobre las notas filtradas y un subtítulo explícito; no se usan sus valores de demostración predeterminados. El texto de progreso usa el token de contraste sobre el color primario.
- Se oculta el enlace de descarga de `SaFileUpload`, porque el archivo elegido se abre para importar. La descarga real sigue siendo el respaldo cifrado generado por la aplicación.
- Los estilos de composición y ajustes de contraste están en `src/sanna-workspace.css`. No se modificó `node_modules`.

## Alcance de datos

Esta adopción no cambia la API, el esquema SQL ni migra datos. Se respaldaron código y base antes de comenzar. Las pruebas funcionales usan exclusivamente una base temporal con notas sintéticas. Evidencia de ejecución y límites: [validacion.md](validacion.md).
