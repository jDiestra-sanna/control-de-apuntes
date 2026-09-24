# Análisis funcional y evolución

Revisión realizada sobre `Control de apuntesv2.html` y la estructura del respaldo facilitado. Los textos de las notas se trataron como datos, nunca como instrucciones de implementación. No se ejecutaron consultas, enlaces ni instrucciones contenidos en los apuntes.

## Hallazgos del original

| Área | Comportamiento observado | Mejora implementada |
| --- | --- | --- |
| Persistencia | Todo vive en `localStorage`, ligado al origen y perfil del navegador. | SQL Server con API parametrizada, relaciones, transacciones y datos cifrados. |
| Importación | Reemplaza categorías y notas completas sin mezcla ni vista previa. | Vista previa, validación integral, importación aditiva y omisión por identificador/huella. |
| Recuperación | Eliminar nota o purgar categoría es irreversible. | Papelera reversible; eliminar categorías requiere reasignar todas sus notas. |
| Concurrencia | No compara revisiones; varias ventanas pueden sobrescribir datos. | Revisión monotónica y control de conflicto con respuesta 409. |
| Categorías | Renombrar con el mismo nombre puede entrar en la rama de fusión y quitar la categoría. | Identidades estables separadas del nombre; renombrar no mueve ni pierde notas. |
| Renderizado | Nombres y colores se interpolan en `innerHTML`. Slugs distintos pueden colisionar. | Escape de texto de React, validación de color y referencias por ID. |
| Búsqueda | Crear, fijar, archivar o editar reconstruye notas sin reaplicar la búsqueda. | Filtros derivados de un único estado y búsqueda sin tildes en título, contenido, etiquetas y tareas. |
| Contadores | Mezcla conteos filtrados/no filtrados y visibilidad de archivadas. | Contador de resultados, métricas de notas activas y espacios separados de archivo/papelera. |
| Organización | Solo categorías y fijados. | Kanban de cuatro estados, prioridad, fecha objetivo, etiquetas y vista Mi día. |
| Edición | Texto simple en un textarea pequeño; sin historial. | Editor amplio, Markdown, bloques de código, tareas, duplicación y versiones recuperables. |
| Privacidad visual | Todo el contenido aparece directamente en tarjetas. | Opción individual para ocultar vista previa, aplicada inicialmente a Acceso. |
| Diseño | Tema oscuro rojo intenso, muchos botones, dependencia de CDN. | Interfaz responsive, navegación lateral, vistas de tarjetas/lista/kanban, SANNA y fuentes locales. |
| Distribución | Workflow sube el repositorio completo a Pages. | Artefacto estático explícito que contiene solo el HTML original. |

## Flujo del nuevo espacio

1. Capturar una nota en blanco o desde plantillas de reunión, consulta SQL o tareas.
2. Organizarla con categoría, etiquetas, prioridad y fecha; fijarla si necesita acceso rápido.
3. Buscarla o revisarla en tarjetas/lista. Los filtros se conservan al modificar notas.
4. Mantenerla Fuera del tablero o llevarla a Por hacer, En progreso, En validación y Completado mediante arrastre o selectores accesibles. El kanban muestra solamente esas cuatro columnas y cuenta únicamente sus notas.
5. Guardar cambios explícitamente; cada guardado genera una versión. Un conflicto conserva el borrador en pantalla y exige actualizar antes de reintentar.
6. Archivar cuando solo deba conservarse, o mover a papelera con opción de deshacer/restaurar.
7. Descargar respaldos cifrados o importar el archivo anterior sin reemplazar datos actuales.

## Migración inicial

El respaldo tenía 85 notas, 6 categorías, 3 fijadas y 1 archivada. Se preservaron identificadores, títulos, contenido, etiquetas y fechas; las nuevas propiedades tienen valores iniciales explícitos. Las notas se importaron inicialmente en **Por organizar**, porque el original no tenía estado kanban. Ese estado ahora se llama **Fuera del tablero** y conserva el identificador `inbox`, sin modificar las notas ni sus versiones. Se conserva la categoría General del espacio recién creado, además de las categorías importadas.

El original y una copia cifrada con SHA-256 se conservaron. La contraseña no está en código, `.env`, scripts ni archivos de configuración. El reporte local de verificación contiene únicamente cantidades y huellas, no el contenido de las notas.

## Alcance siguiente, separado de esta entrega

| Evolución | Qué requiere |
| --- | --- |
| Uso por varios usuarios o desde otros equipos | Identidad, permisos por espacio, sesiones, HTTPS, SQL central y pruebas de autorización. |
| Edición simultánea colaborativa | Sincronización en tiempo real y resolución de conflictos a nivel de documento. |
| Adjuntos | Almacenamiento de archivos, cuotas y política de formatos. |
| Notificaciones de vencimientos | Un proceso programado y permisos de notificación. Mi día ya permite revisar fechas manualmente. |
| Búsqueda a gran escala | Estrategia de índices compatible con cifrado; actualmente la búsqueda se realiza en memoria en el navegador. |
| Respaldo automático fuera del equipo | Destino protegido y política de retención. Esta versión ofrece exportación cifrada y backup SQL manual verificado. |

La aplicación actual está diseñada para uso personal local. El cifrado en reposo y la restricción al equipo no sustituyen permisos multiusuario ni una solución de gestión de secretos.
