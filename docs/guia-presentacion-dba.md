# Bot de Monitoreo — guía para revisión con DBA

## Objetivo

El Bot observa ejecuciones de Informatica PowerCenter sin modificar el repositorio. Expone la información al frontend, evalúa reglas de monitoreo y genera alertas en la aplicación y por correo.

## Arquitectura

| Componente | Tecnología | Responsabilidad |
| --- | --- | --- |
| Frontend | Next.js + TypeScript | Terminal de monitoreo, reglas, alertas, Sistema y Chat. |
| API | NestJS + TypeScript | API REST, autenticación AD, consultas, reglas, alertas, correo y diagnóstico. |
| BD propia del Bot | SQL Server + TypeORM | Reglas, dependencias, alertas, conexiones de validación y servidores monitoreados. |
| Repositorio Informatica | SQL Server + `mssql` | Fuente de solo lectura para ejecuciones, tareas y estadísticas. |
| AD | LDAP directo | Valida el usuario con `usuario@dominio`; no almacena contraseñas ni usa cuenta de servicio. |
| Diagnóstico | Gemini | Respuesta técnica limitada al dominio de monitoreo e Informatica. |
| Correo | SMTP / Nodemailer | Alertas de workflow, SLA, volumen, dependencias y servidores. |

## Qué se consulta en el repositorio de Informatica

El usuario de conexión del repositorio debe tener únicamente `SELECT`. La API valida que las consultas del repositorio sean de lectura y no utiliza tablas `OPB_*`.

| Caso | Vista permitida | Datos usados |
| --- | --- | --- |
| Estado y última ejecución | `REP_WFLOW_RUN` | Workflow, folder, inicio, fin, estado y error. |
| Catálogo para reglas | `REP_WFLOW_RUN` | Workflows con actividad en 90 días; promedio de duración en 15 días. |
| Historial | `REP_WFLOW_RUN`, `REP_SESS_LOG` | Duración, estado y filas afectadas por ejecución. |
| Tareas/sesiones | `REP_TASK_INST_RUN`, `REP_SESS_LOG` | Instancia, tipo de tarea, estado, filas origen, cargadas y rechazadas. |
| Validación de dependencias | `REP_WFLOW_RUN` | Confirma que el workflow previo terminó exitosamente antes del principal. |
| Métricas de actividad | `REP_WFLOW_RUN` | Cantidad de ejecuciones en 24 horas y última ejecución. |

No se ejecuta `pmcmd`, `INSERT`, `UPDATE`, `DELETE`, `MERGE`, DDL ni cambios sobre PowerCenter. Ejecutar un workflow es responsabilidad del operador/KPI de Informatica, no del bot.

## Permisos mínimos solicitados al DBA

```sql
GRANT SELECT ON dbo.REP_WFLOW_RUN TO [usuario_bot_monitoreo];
GRANT SELECT ON dbo.REP_TASK_INST_RUN TO [usuario_bot_monitoreo];
GRANT SELECT ON dbo.REP_SESS_LOG TO [usuario_bot_monitoreo];
GRANT SELECT ON dbo.REP_WORKFLOWS TO [usuario_bot_monitoreo];
```

El script de referencia está en `sql/02-sqlserver-permisos-rep-lectura.sql`.

## Cómo funciona una regla de workflow

1. El usuario selecciona un workflow del catálogo y define su hora esperada.
2. El motor revisa a partir de esa hora y continúa hasta obtener un estado terminal.
3. El intervalo es adaptativo: 30 s para procesos cortos, 1 min para medianos, 3 min para procesos de hasta tres horas y 5 min para procesos más largos.
4. Puede evaluar estado final, duración/SLA, filas afectadas, consulta SQL y dependencias de workflow.
5. Cada alerta se deduplica: no vuelve a notificar mientras la misma condición siga abierta.
6. Alerta y correo se generan para error, aborto, suspensión, no inicio, SLA, volumen bajo, dependencia no cumplida o servidor no disponible.

## Datos que sí son reales y datos de referencia

- **Repositorio Informatica:** reales, porque provienen de `REP_WFLOW_RUN`.
- **Base propia del Bot:** reales, porque consulta el motor SQL Server y el nombre de la base configurada.
- **Plataforma Informatica:** valores de referencia configurados en el API. No son telemetría en tiempo real de JVM, DTM ni sistema operativo.

## Resultados de validación — 3 de septiembre de 2026

| Prueba | Resultado |
| --- | --- |
| Salud de la API | Correcta (`200`). |
| Swagger | Disponible en `/docs` (`200`). |
| Catálogo de workflows | Correcto: 117 workflows devueltos. |
| Ejecuciones del día | Correcto: 170 ejecuciones devueltas para `2026-09-03`. |
| Historial y tareas | Correctos para `WF_EMMANUEL_PRUEBAS`: 1 historial y 2 tareas. |
| Homologación de estado | Código 4 observado y mostrado como `Abortado`. |
| Métricas, casos y configuración | Correctos (`200`). |
| Chat / Gemini | Correcto (`200` y respuesta no vacía). |
| SMTP | Conexión y autenticación verificadas. |
| Dependencia de workflow | Alerta `DEPENDENCIA_NO_CUMPLIDA` registrada en Chat con una regla QA temporal. |
| CRUD de reglas | Crear, actualizar y eliminar: correcto. |
| Frontend | Login, Reglas y Sistema responden correctamente en el puerto 3000. |
| LDAP | Host y puerto 389 alcanzables; un login funcional requiere las credenciales AD de un usuario. |

La regla de prueba de dependencia quedó **inactiva** para no generar más alertas. La alerta QA permanece como evidencia visual en Chat.

## Preguntas probables del DBA

### ¿De dónde sale el catálogo?

De `REP_WFLOW_RUN`, tomando workflows con actividad en los últimos 90 días. Se eligió esta vista porque `REP_WORKFLOWS` tarda más de 15 segundos en el repositorio actual incluso para consultas simples. Si se requiere incluir workflows nunca ejecutados o sin actividad reciente, el DBA debe optimizar `REP_WORKFLOWS` o publicar una vista REP equivalente con ese catálogo.

### ¿Qué genera carga?

Las consultas de monitoreo se ejecutan solo sobre reglas activas y a intervalos adaptativos. El catálogo se conserva en caché 15 minutos. Las consultas siempre filtran por workflow, fecha, ejecución o ventana de tiempo.

### ¿Puede modificar PowerCenter?

No. El pool del repositorio solo admite `SELECT`/`WITH`; el usuario tiene permisos de lectura y el código rechaza DML, DDL, `OPB_*`, `SYS` e `INFORMATION_SCHEMA`.

### ¿Cómo se calculan las filas afectadas?

Se suma `SUCCESSFUL_ROWS` de `REP_SESS_LOG` por `WORKFLOW_RUN_ID`. Para detalle de tareas se usan también `SUCCESSFUL_SOURCE_ROWS` y `FAILED_ROWS`.

### ¿Qué ocurre cuando falla una dependencia?

Para una dependencia tipo Workflow, se busca su última ejecución terminada dentro de las 24 horas anteriores al inicio del workflow principal. Debe haber terminado en estado exitoso. De lo contrario se registra una alerta crítica en Chat y se intenta enviar correo.

### ¿Por qué no se ejecutó un workflow durante la prueba?

El diseño es de monitoreo pasivo. La prueba usa datos reales existentes en vistas REP y reglas QA controladas en la base del Bot; iniciar procesos de ETL es una actividad operacional que debe autorizar y realizar el equipo de Informatica/KPI.

## Cómo levantar la demostración

```powershell
# Terminal 1 — API
cd C:\Users\ivan_\Desktop\Linus\bot-monitoreo-api
npm run start:dev

# Terminal 2 — Frontend
cd C:\Users\ivan_\Desktop\Linus\bot-monitoreo-web
npm run dev
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:3001/api`
- Swagger: `http://localhost:3001/docs`
