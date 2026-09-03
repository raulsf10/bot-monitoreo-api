-- ============================================================================
-- Bot de Monitoreo - Permisos de SOLO LECTURA para el repositorio Informatica
-- Ejecutar en SQL Server con una cuenta DBA o propietaria del repositorio.
-- Sustituir [LOGIN_BOT_MONITOREO] por el login técnico ya creado en el servidor.
-- ============================================================================

-- USE [NOMBRE_REPOSITORIO_INFORMATICA];
-- GO

-- Si el usuario de base aún no existe, descomentar y ajustar:
-- CREATE USER [LOGIN_BOT_MONITOREO] FOR LOGIN [LOGIN_BOT_MONITOREO];
-- GO

GRANT SELECT ON OBJECT::dbo.REP_WFLOW_RUN TO [LOGIN_BOT_MONITOREO];
GRANT SELECT ON OBJECT::dbo.REP_WORKFLOWS TO [LOGIN_BOT_MONITOREO];
GRANT SELECT ON OBJECT::dbo.REP_TASK_INST_RUN TO [LOGIN_BOT_MONITOREO];
GRANT SELECT ON OBJECT::dbo.REP_SESS_LOG TO [LOGIN_BOT_MONITOREO];
GO
