# Manual de publicación — IIS + ARR + URL Rewrite + PM2

Este manual publica la API NestJS detrás de IIS. IIS recibe HTTPS y reenvía internamente a Node.js; PM2 mantiene la API viva y la recupera después de un reinicio del servidor.

## 1. Arquitectura objetivo

```text
Usuario / Frontend
        |
      HTTPS 443
        |
      IIS + ARR + URL Rewrite
        |
http://127.0.0.1:<PUERTO>
        |
 PM2 -> Node.js -> NestJS
        |
 SQL Server Bot / SQL Server Informatica / AD / SMTP / Gemini
```

La API escucha de forma predeterminada en `127.0.0.1`, no en la red. Así solo IIS puede consumirla localmente. Para exponerla deliberadamente en la red se puede cambiar `HOST_API`, aunque no se recomienda en producción.

## 2. Requisitos del servidor

1. Windows Server con IIS instalado.
2. Node.js 20 LTS instalado para el usuario que ejecutará PM2.
3. PM2 instalado globalmente:

   ```powershell
   npm install --global pm2
   pm2 --version
   ```

4. Módulos IIS instalados:
   - **URL Rewrite**
   - **Application Request Routing (ARR)**

5. En IIS Manager, a nivel de servidor:
   - Abrir **Application Request Routing Cache**.
   - Seleccionar **Server Proxy Settings**.
   - Activar **Enable Proxy**.
   - Aplicar cambios.

6. Un usuario de servicio de Windows, por ejemplo `DOMINIO\svc_botmonitoreo`, con permiso de lectura y ejecución sobre la carpeta de la API. Este usuario será dueño del proceso PM2 y de su tarea programada.

## 3. Preparar la carpeta de aplicación

Ejemplo de destino:

```text
C:\Apps\bot-monitoreo-api
```

Copiar al destino:

- `dist`
- `node_modules`
- `package.json`
- `package-lock.json`
- `ecosystem.config.js`
- `.env`
- Carpeta `sql` y `docs` como referencia operativa

La forma más simple de preparar el artefacto en el servidor es:

```powershell
cd C:\Apps\bot-monitoreo-api
npm ci
npm run build
npm prune --omit=dev
```

Para una publicación formal se recomienda construir en CI o una máquina de compilación, y copiar el artefacto ya generado. Nunca copiar un `.env` de desarrollo al servidor productivo.

## 4. Elegir el puerto

El puerto lo defines únicamente en `C:\Apps\bot-monitoreo-api\.env`:

```env
NODE_ENV=production
PUERTO=3101
HOST_API=127.0.0.1
URL_DASHBOARD=https://bot-monitoreo.midominio.com
```

En el ejemplo se usa **3101**, pero puede ser cualquier puerto TCP libre entre 1024 y 65535. No es necesario modificar código ni `ecosystem.config.js`.

Para verificar que está libre:

```powershell
netstat -ano | findstr :3101
```

Si no se muestra ninguna línea `LISTENING`, el puerto está disponible.

> `ecosystem.config.js` ya no fuerza el puerto 3001. PM2 carga `NODE_ENV=production` y la API obtiene `PUERTO` desde `.env`.

## 5. Configurar `.env` de producción

Copiar `.env.example` como `.env` y completar los valores reales. Las variables principales son:

| Grupo | Variables |
| --- | --- |
| Servidor | `PUERTO`, `HOST_API`, `NODE_ENV`, `URL_DASHBOARD` |
| Base propia del Bot | `SQLSERVER_*` |
| Repositorio Informatica de solo lectura | `INFORMATICA_*` |
| Active Directory | `AD_URL`, `AD_DOMINIO` |
| Sesiones | `JWT_SECRET`, `JWT_EXPIRACION` |
| Cifrado de conexiones | `CIFRADO_CONFIG_SECRET` |
| Chat | `GEMINI_API_KEY`, `GEMINI_MODELO` |
| Alertas | `SMTP_*`, `ALERTA_DESTINATARIOS_DEFAULT` |

Recomendaciones:

- Generar valores largos y aleatorios para `JWT_SECRET` y `CIFRADO_CONFIG_SECRET`.
- No cambiar `CIFRADO_CONFIG_SECRET` después de guardar conexiones externas: se utiliza para descifrar sus contraseñas.
- Limitar permisos del archivo `.env` al usuario de servicio y administradores.
- Usar una cuenta SQL Server de solo lectura en `INFORMATICA_USERNAME`.

## 6. Preparar SQL Server

1. Ejecutar el esquema de la base propia del Bot usando:

   ```text
   sql\01-sqlserver-esquema.sql
   ```

2. Aplicar al usuario del repositorio Informatica solamente los permisos `SELECT` descritos en:

   ```text
   sql\02-sqlserver-permisos-rep-lectura.sql
   ```

La API consulta exclusivamente vistas `REP_*` para el repositorio Informatica. No requiere ni debe recibir permisos de modificación sobre PowerCenter.

## 7. Iniciar y validar PM2

Abrir PowerShell como el usuario de servicio y ejecutar:

```powershell
cd C:\Apps\bot-monitoreo-api
pm2 start ecosystem.config.js --env production
pm2 status
pm2 logs bot-monitoreo-api
```

Validar localmente, sustituyendo `3101` por el puerto elegido:

```powershell
Invoke-WebRequest http://127.0.0.1:3101/api/salud
Invoke-WebRequest http://127.0.0.1:3101/docs
```

Resultados esperados:

- `/api/salud`: HTTP 200.
- `/docs`: Swagger UI.
- En `pm2 logs`: conexión a SQL Server, repositorio Informatica y módulos NestJS inicializados.

Comandos operativos:

```powershell
pm2 status
pm2 logs bot-monitoreo-api --lines 200
pm2 restart bot-monitoreo-api
pm2 reload bot-monitoreo-api
pm2 stop bot-monitoreo-api
pm2 delete bot-monitoreo-api
```

Después de iniciar correctamente, guardar la lista de procesos:

```powershell
pm2 save
```

## 8. Recuperación automática de PM2 en Windows

En Windows, crear una tarea programada es la forma estable de ejecutar `pm2 resurrect` al iniciar el servidor.

1. Como usuario de servicio, ejecutar `where pm2` y conservar la ruta a `pm2.cmd`.
2. Ejecutar `pm2 save` una vez que el proceso aparezca como `online`.
3. Abrir **Task Scheduler** y crear una tarea llamada `PM2 Bot Monitoreo API`.
4. Configurar:
   - **Ejecutar tanto si el usuario inició sesión como si no**.
   - Usuario: `DOMINIO\svc_botmonitoreo`.
   - Trigger: **At startup**.
   - Acción: iniciar el programa `cmd.exe`.
   - Argumentos: `/c "<RUTA_A_PM2.CMD> resurrect"`.
   - Directorio inicial: la carpeta donde reside `pm2.cmd`.
   - Activar **Run with highest privileges**.
   - Reiniciar en caso de error, con un retraso de 1 minuto.

La tarea debe ejecutarse con el mismo usuario con el que se ejecutó `pm2 save`, porque PM2 conserva su estado en el perfil de ese usuario.

## 9. Configurar IIS como reverse proxy

1. Crear un sitio IIS, por ejemplo `bot-monitoreo-api`.
2. Asignar el host HTTPS, por ejemplo `api-bot-monitoreo.midominio.com`, y su certificado.
3. Usar una carpeta física de proxy, por ejemplo:

   ```text
   C:\inetpub\bot-monitoreo-api-proxy
   ```

4. Crear dentro de esa carpeta un archivo `web.config`.
5. Sustituir `3101` por el valor definido en `PUERTO`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <proxy enabled="true" preserveHostHeader="true" />
    <rewrite>
      <rules>
        <rule name="Proxy Bot Monitoreo API" stopProcessing="true">
          <match url="(.*)" />
          <action
            type="Rewrite"
            url="http://127.0.0.1:3101/{R:1}"
            appendQueryString="true" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

6. Reiniciar IIS:

```powershell
iisreset
```

7. Validar desde el servidor:

```powershell
Invoke-WebRequest https://api-bot-monitoreo.midominio.com/api/salud
```

## 10. Publicar una nueva versión

```powershell
cd C:\Apps\bot-monitoreo-api
pm2 stop bot-monitoreo-api

# Copiar el nuevo artefacto y actualizar dependencias.
npm ci
npm run build
npm prune --omit=dev

pm2 start ecosystem.config.js --env production
pm2 save
pm2 status
```

Si solo cambiaste el valor de `PUERTO` en `.env`:

1. Actualizar `PUERTO` en `.env`.
2. Actualizar el puerto en `web.config`.
3. Ejecutar:

   ```powershell
   pm2 restart bot-monitoreo-api
   iisreset
   ```

## 11. Diagnóstico rápido

| Síntoma | Revisión |
| --- | --- |
| IIS devuelve 502.3 | Confirmar `pm2 status`, puerto de `.env`, `web.config` y `/api/salud` local. |
| API no inicia | Revisar `pm2 logs bot-monitoreo-api --lines 200`; validar `.env`, SQL Server y Node 20. |
| Login no funciona | Verificar DNS/VPN/firewall hacia `AD_URL:389` y usuario/contraseña AD. |
| No hay workflows | Confirmar `INFORMATICA_*`, permisos `SELECT` y actividad en `REP_WFLOW_RUN`. |
| No llegan correos | Revisar `SMTP_*`, `ALERTA_DESTINATARIOS_DEFAULT` y logs PM2. |
| Chat no responde | Confirmar `GEMINI_API_KEY`, modelo configurado y salida HTTPS a Google. |

## 12. Lista final de salida a producción

- [ ] Puerto elegido, libre y reflejado en `.env` y `web.config`.
- [ ] `HOST_API=127.0.0.1`.
- [ ] HTTPS y certificado activos en IIS.
- [ ] ARR Proxy habilitado y URL Rewrite instalado.
- [ ] Base `BotMonitoreo` creada y scripts SQL aplicados.
- [ ] Usuario Informatica con solo `SELECT` a vistas `REP_*`.
- [ ] `.env` protegido y sin secretos en repositorio.
- [ ] `pm2 status` muestra `bot-monitoreo-api` como `online`.
- [ ] `pm2 save` ejecutado y tarea programada configurada.
- [ ] `/api/salud`, `/docs`, login, workflows y correo validados desde IIS.
