# bot-monitoreo-api

Backend del **Bot de Monitoreo** de procesos ETL de Informatica PowerCenter v10.5.
Lee datos de ejecución de workflows desde Oracle (vistas `REP_*`, solo lectura),
almacena su configuración en SQL Server y expone una API REST consumida por el
frontend Next.js.

## Stack

| Componente | Tecnología |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | NestJS 10 |
| ORM (SQL Server) | TypeORM (`mssql`) |
| Oracle (solo lectura) | `oracledb` (thin mode) |
| Autenticación | Passport LDAP + JWT |
| LLM | `@google/generative-ai` (Gemini) |
| Email | Nodemailer (SMTP) |
| Proceso | PM2 |

## Configuración

```bash
cp .env.example .env
# Completar credenciales de SQL Server, Oracle, LDAP, JWT_SECRET, Gemini y SMTP.
```

`JWT_SECRET` es obligatorio (mínimo 16 caracteres). El resto de integraciones se
degrada de forma controlada si no está configurada (Oracle/SMTP se deshabilitan
con advertencia en el log).

## Ejecución

```bash
npm install
npm run build          # compila a dist/
npm run start:dev      # desarrollo con watch
```

Producción con PM2:

```bash
npm run build
pm2 start ecosystem.config.js --env production
```

El servicio queda detrás de IIS (ARR + URL Rewrite) apuntando al puerto `3001`.

## Endpoints (prefijo `/api`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Autenticación LDAP → JWT |
| GET | `/auth/perfil` | Perfil del usuario autenticado |
| GET | `/salud` | Health check (público) |
| GET | `/configuracion` | Estado y base de conocimiento |
| GET | `/workflows` | Estado de workflows (Oracle) |
| GET | `/workflows/:nombre/historial` | Historial de ejecuciones |
| GET | `/workflows/:nombre/tareas` | Tareas/sesiones de una ejecución |
| POST | `/diagnostico` | Proxy al modelo AIOps (Gemini) |
| GET/POST/PUT/DELETE | `/base-conocimiento` | CRUD de elementos monitoreados |
| GET | `/metricas-ipc` | Métricas de plataforma |
| GET | `/casos-prueba` | Escenarios preconfigurados |

Todos los endpoints salvo `/auth/login` y `/salud` requieren `Authorization: Bearer <token>`.

## Notas de seguridad

- Las conexiones a Oracle son estrictamente de solo lectura (`OracleService`
  rechaza cualquier sentencia que no sea `SELECT`/`WITH`).
- El código generado debe pasar por revisión humana y pruebas de seguridad antes
  de su despliegue en producción.
- `synchronize` de TypeORM está activo solo fuera de producción; en producción se
  deben usar migraciones.
