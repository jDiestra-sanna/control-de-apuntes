# Iniciar y cerrar Apuntes en Windows

Los dos archivos de la raíz son `levantar-proyecto.bat` y `cerrar-proyecto.bat`. Usan Windows PowerShell 5.1, funcionan desde otra carpeta y admiten rutas con espacios. `Iniciar Apuntes.cmd` y `start-apuntes.ps1` siguen disponibles como accesos compatibles.

| Perfil | Puerto fijo para web y API | Dirección en el equipo donde se ejecuta |
| --- | --- | --- |
| Local | 3188 | http://127.0.0.1:3188 |
| Servidor Windows | 5179 | http://127.0.0.1:5179 |

No hay un puerto separado para Vite: los lanzadores sirven la compilación React desde Express. Ambos perfiles utilizan la conexión SQL de `.env`; seleccionar «local» no cambia SQL Server a LocalDB ni copia la base. El puerto SQL 1433 es independiente de los puertos HTTP.

## Uso diario

```bat
levantar-proyecto.bat --local
cerrar-proyecto.bat --local

levantar-proyecto.bat --servidor
cerrar-proyecto.bat --servidor

cerrar-proyecto.bat --todos
```

Sin argumentos, se usa `APUNTES_PROFILE` del entorno, después de `.env`, o `local` si no está configurado. En el servidor agrega `APUNTES_PROFILE=servidor` a su `.env`; así el doble clic usa 5179. La opción explícita `--local` o `--servidor` tiene prioridad. El perfil servidor no abre un navegador. Para evitar abrirlo en local usa `--no-browser`.

Los lanzadores fuerzan el puerto del perfil **solo en el proceso iniciado**, incluso si `.env` o el entorno contienen otro `PORT`. Nunca seleccionan puertos aleatorios ni pasan al siguiente disponible. Si el puerto está ocupado por otro proceso, muestran el PID y terminan con error sin detenerlo. Si Apuntes ya está activo con el código y la configuración esperados, reutilizan su PID; si cambió la versión, indican cerrar y volver a iniciar.

## Preparar otro equipo o un servidor

1. Instalar Windows, Node >=22.12 con npm y Microsoft ODBC Driver 17 para SQL Server. La cuenta que ejecuta Apuntes necesita acceso de red a `10.6.16.10:1433`.
2. Copiar o clonar el proyecto. Llevar por un medio seguro `.env` y **la clave original `.local/master.key`**. Conservar permisos restringidos a la cuenta Windows que ejecutará el proceso. Esos archivos no están en Git.
3. Configurar `APUNTES_PROFILE=servidor` en `.env` para el servidor, o `local` para el equipo personal.
4. Instalar las dependencias una vez, con acceso al repositorio del Design System:

```bat
levantar-proyecto.bat --install-dependencies
levantar-proyecto.bat --servidor --check
levantar-proyecto.bat --servidor
```

`--check` verifica Node, dependencias, puerto, conexión, tablas y descifrado de una muestra sin mostrar notas, iniciar servicios ni ejecutar migraciones. En una base vacía solo se valida el formato de la clave. El inicio normal tampoco crea bases, tablas ni claves. `npm run db:setup` queda como una operación explícita para aprovisionamiento; no es necesario repetirla al trasladar el cliente hacia la base existente.

La instalación es explícita y se rechaza si hay procesos de Apuntes abiertos en este checkout. Un inicio normal reutiliza `node_modules`. Si cambia el código de la interfaz o se pierde/modifica `dist`, recompila antes de iniciar. `--rebuild` fuerza esa compilación con el perfil detenido.

Para actualizar el código en un equipo que ya lo ejecuta, cierra ambos perfiles con `cerrar-proyecto.bat --todos`, actualiza el repositorio y vuelve a levantar el perfil correspondiente. Así la API y los archivos compilados pertenecen a la misma versión.

## Alcance del perfil servidor

El perfil servidor permite ejecutar el mismo proyecto compilado en un host Windows con puerto fijo **5179**, sin abrir ventanas de consola adicionales. Comprueba la disponibilidad en el equipo donde se ejecuta; la comprobación local no garantiza que ese puerto esté disponible en otro servidor.

La aplicación actual es personal y **escucha en 127.0.0.1 en ambos perfiles**. Se puede utilizar desde el navegador de la sesión del servidor. Para acceso desde otros equipos falta configurar una publicación con autenticación, HTTPS y los hosts/orígenes permitidos de la API. Estos `.bat` no abren firewall, túneles ni acceso anónimo por LAN. Tampoco instalan un servicio Windows ni arranque automático tras reiniciar el equipo.

## Cierre y diagnóstico

El cierre contrasta el ejecutable Node, la ruta absoluta `server/index.js`, el PID y su fecha de creación. Un registro antiguo no permite detener procesos ajenos ni el otro perfil. `--todos` revisa ambos puertos antes de detener nada. No se detiene SQL Server ni se cierran los otros proyectos Node del equipo.

Inicio y cierre comparten un bloqueo en `.local/launcher.lock`: si otra operación está ejecutándose, el segundo comando termina con un mensaje para reintentarlo. Que el archivo exista no significa que haya un bloqueo; Windows libera el bloqueo al terminar el proceso.

| Archivo local | Contenido |
| --- | --- |
| `.local/server-local.log` / `server-local-error.log` | Salida y errores del perfil local |
| `.local/server-servidor.log` / `server-servidor-error.log` | Salida y errores del perfil servidor |
| `.local/run-local.json` / `run-servidor.json` | PID, inicio, ruta, puerto y huellas para comprobar la instancia |
| `.local/build-state.json` | Huella de fuentes y compilación reutilizable |

Estos archivos están excluidos de Git. Los logs del perfil se reinician en cada arranque efectivo. Un error devuelve código de salida 1; un inicio, comprobación o cierre correcto devuelve 0. Con doble clic, un error mantiene abierta la ventana para leerlo.

Pruebas de operación, con reinicio de Apuntes y restauración del perfil local al terminar:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/test-launchers.ps1
```

La suite usa procesos de prueba para verificar colisiones, PID obsoletos, bloqueo y rutas con espacios. Comprueba también ambos perfiles contra la configuración SQL existente mediante consultas de lectura. No ejecuta `db:setup`, no cambia notas y no detiene otros proyectos. Evidencia local: `.local/qa/launchers.json`.
