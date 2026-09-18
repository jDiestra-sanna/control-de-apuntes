# Apuntes

Espacio personal de notas con React, SANNA Design System, Node y SQL Server. Incluye biblioteca en tarjetas/lista, tabla con filtros y paginación, agenda con calendario, vista rápida, kanban, categorías, etiquetas, prioridades, fechas objetivo, Markdown, bloques de código, listas de tareas, fijadas, archivo, papelera, historial y respaldos cifrados compatibles con la versión anterior.

## Documentación visual

Abre la [guía del proyecto](docs/index.html): arquitectura interactiva con Archify, secuencia de guardado, importación de respaldos, modelo SQL, contratos API y operación local. Funciona directamente desde disco. Las [fuentes y la guía de mantenimiento](docs/README.md) permiten reproducir los diagramas y consultar su evidencia de validación.

## Abrir en este equipo

Haz doble clic en **Iniciar Apuntes.cmd** o ejecuta desde esta carpeta:

```powershell
.\start-apuntes.ps1
```

Dirección: **http://127.0.0.1:3188**. La aplicación se conecta a **SQL Server `10.6.16.10`**, base **`ControlDeApuntes`**, mediante autenticación SQL configurada en `.env`. El lanzador verifica la base, compila e inicia Node sin abrir una consola adicional. Si este proyecto ya ocupa el puerto con la misma configuración SQL, lo reutiliza; si pertenece a otro proceso, se detiene sin tocarlo.

Requisitos: Windows, Node >=22.12, Microsoft ODBC Driver 17 y acceso de red al servidor SQL por TCP 1433. LocalDB solo es necesario para las pruebas de integración o el modo local opcional. No se cambiaron otras bases ni servicios del servidor compartido.

## Instalación reproducible

```powershell
node scripts/install.js
# Preparar .env y la clave original antes de conectar a una base existente.
npm run db:setup
npm run build
npm start
```

El instalador ejecuta `npm ci` con una conversión temporal de GitHub SSH a HTTPS, porque npm puede normalizar la referencia del Design System a SSH. No cambia la configuración global de Git. Hace falta acceso al repositorio del paquete si no está en caché.

Desarrollo: `npm run dev` sirve la API y Vite en el mismo puerto 3188. La configuración activa está en `.env`, excluida de Git y con permisos Windows restringidos. `.env.example` contiene campos de ejemplo, sin contraseña. El lanzador usa 3188; para otro puerto usa `npm start` o `npm run dev` con `PORT` configurado.

Para trasladar el cliente a otro equipo, conserva el código, `.env` y **la misma `.local/master.key`**, y habilita acceso al servidor SQL. La base permanece centralizada. El detalle de la migración, las rutas del servidor y la recuperación están en [Migración a SQL Server](docs/migracion-sql-server.md). Sin `.env`, el modo alternativo sigue usando `(localdb)\ApuntesLocal` con autenticación Windows.

## Vistas y organización

Los cinco botones junto a «Todas las notas» cambian entre tarjetas, lista, tabla, agenda y kanban. La preferencia de vista se conserva en este navegador.

- **Tabla:** ordena al pulsar los encabezados, filtra por columna y cambia la cantidad por página. «Ver» abre una consulta lateral; cerrar conserva la página y los filtros.
- **Agenda:** selecciona un día para consultar sus notas o crearlas con esa fecha. La pestaña «Sin fecha» reúne las pendientes de programar. Se aplican la búsqueda y los filtros de la biblioteca.
- **Acciones de una tarjeta:** vista rápida, editar, historial, duplicar, archivar o mover a papelera. La eliminación requiere confirmación y permite deshacer desde la notificación.
- **Editor:** el calendario permite elegir o quitar la fecha. El selector de etiquetas reutiliza las existentes; también puedes escribir etiquetas nuevas separadas por comas. Las mayúsculas y minúsculas se conservan.
- **Historial:** consulta versiones en el panel lateral y recupera una como borrador. El cambio se hace efectivo al guardar.

## Datos, seguridad y recuperación

- Servidor activo: `10.6.16.10`. Base: `ControlDeApuntes`. Usuario SQL configurado: `sa`; contraseña solo en `.env`. Transporte cifrado; `SQL_TRUST_SERVER_CERTIFICATE=true` acepta el certificado del servidor sin validar su cadena de confianza.
- `dbo.Categories`: identificadores, nombres, colores y orden. `dbo.Notes`: relación con categoría, contenido cifrado, revisión y fechas. `dbo.NoteVersions`: versiones cifradas. `dbo.Imports`: registros de importación por huella SHA-256.
- Títulos, contenido, etiquetas, tareas y demás propiedades se cifran con AES-256-GCM antes de almacenarse. Identificadores, categorías y fechas quedan como metadatos SQL.
- La clave aleatoria está en `.local/master.key`, con permisos restringidos al usuario Windows. **Conserva esa clave junto con una copia segura de la base**: un `.bak` solo no permite descifrar el contenido. El instalador no reemplaza claves existentes.
- La contraseña del respaldo se utiliza únicamente para descifrarlo; no se guarda en el proyecto ni se convierte en contraseña de acceso.
- Uso local de una persona: Node escucha exclusivamente en `127.0.0.1`, rechaza hosts/orígenes externos y exige un encabezado propio en la API. No incluye cuentas ni permisos multiusuario. Quien tenga acceso a tu sesión Windows y a la aplicación puede consultar las notas. Para exposición en red se requiere una implementación adicional de identidad, autorización y HTTPS.
- La vista previa de las notas importadas en categorías de acceso se oculta. Al abrirlas puedes consultar su contenido; la opción se puede cambiar individualmente.
- La papelera es reversible y no tiene vaciado permanente. Archivar es una operación distinta. Las ediciones simultáneas devuelven un conflicto sin sobrescribir silenciosamente la versión actual.
- No se guardan apuntes ni borradores en `localStorage`; solo la preferencia de vista. Los cambios del editor se guardan con el botón o `Ctrl+Enter`. Cerrar un borrador modificado exige confirmar su descarte. El historial contiene cada guardado, no cada pulsación.
- Dentro de un bloque de código, vuelve a pulsar **Código** o usa **Texto simple** para quitar el formato conservando el contenido. **Continuar debajo del código** crea espacio para escribir fuera del bloque. Usa **Deshacer/Rehacer** o `Ctrl+Z` / `Ctrl+Shift+Z` para corregir cambios del contenido.
- Guardar incluye la tarea que todavía está escrita en el campo «Nueva tarea». Si otra ventana cambió la nota, el borrador se conserva y puedes guardarlo como copia o cargar la versión actual.

Desde **Importar / exportar** puedes descargar un respaldo AES-GCM con contraseña. Incluye todas las notas actuales, categorías, estados, etiquetas, tareas, archivadas y papelera; **no incluye el historial**. La importación agrega identificadores nuevos y omite existentes. Nunca sustituye toda la biblioteca.

Para respaldar también el historial:

```powershell
node scripts/backup-database.js
```

Genera un `.bak` con `COPY_ONLY` y `CHECKSUM` y ejecuta `RESTORE VERIFYONLY`. Con SQL remoto, el archivo se guarda en la carpeta de backup **del servidor** (o en `SQL_BACKUP_DIRECTORY`) y se registra el recibo en `.local/backups`; no se descarga el .bak al cliente. En LocalDB se guarda localmente y se calcula también SHA-256. Conserva `.local/master.key` en una ubicación segura; no la publiques. Recuperar un `.bak` debe hacerse hacia una base nueva y verificarse antes de sustituir datos actuales. No se pueden restaurar backups de motores SQL más nuevos en versiones anteriores.

## SANNA Design System

- Canal estable `@sanna-ui/react@0.3.0`, tag `react-v0.3.0`.
- Commit distribuible: `bf28fd6b64b56fd041df1e2247e5f0be368c4d67`.
- `main` verificado: `04a149f8c3d62f713361447d806d1f53d381ccf1`, versión fuente 0.3.2. No se instaló el código sin release.
- Imports globales: tokens, estilos SANNA, fuentes locales, estilos del proyecto y adaptación. Se utilizan 27 componentes públicos y `useToast`: formularios, selectores con búsqueda, calendario, tabla, tarjetas, indicadores, diálogos, paneles laterales, historial, menús, progreso, alertas, notificaciones, carga de archivos y estados de carga/vacío. Detalle en [Adopción SANNA](docs/sanna-adopcion.md).
- La fuente Plus Jakarta Sans se sirve desde `@fontsource`. Vite retira únicamente los imports remotos de Google Fonts presentes en los CSS del paquete; no modifica `node_modules`.

Documentación de herramientas: [SANNA](https://github.com/JDiestra/Design-System-React), [Vite](https://vite.dev/guide/), [driver SQL Server](https://github.com/TimelordUK/node-sqlserver-v8).

## Validación

```powershell
npm test
npm run build
npm run test:integration
```

Las pruebas de integración fuerzan LocalDB con autenticación Windows y crean una base aleatoria `ControlDeApuntes_QA...`; no usan el servidor remoto configurado en .env. Levantan una API independiente y Edge headless con datos sintéticos. Comprueban persistencia, cifrado, importación, conflictos, historial, papelera, categorías, kanban, importación/exportación, estilos SANNA y tamaños de pantalla. La base temporal se elimina al finalizar. Evidencia y capturas sintéticas: `.local/qa/` (fuera de Git).

## Estructura y publicación

- `src/`: interfaz y utilidades del navegador.
- `server/`: API, validación, cifrado y repositorio SQL parametrizado.
- `database/schema.sql`: esquema inicial idempotente.
- `scripts/`: instalación, importación, backup y QA.
- `docs/analisis-funcional.md`: análisis del proyecto original y alcance de la mejora.
- `Control de apuntesv2.html`: versión original preservada sin cambios.

GitHub Pages sigue publicando **solo el HTML original**. El workflow prepara una carpeta explícita y ya no sube el repositorio entero. La nueva aplicación necesita Node y SQL Server; no se ha publicado ni desplegado a un servidor externo. `.local`, contraseñas, claves, respaldos y datos de notas están excluidos de Git.
