-- ============================================================================
-- Bot de Monitoreo - Esquema de SQL Server (base PROPIA del bot)
-- Base de datos: BotMonitoreo
--
-- Estas son las UNICAS tablas de escritura del sistema (base de conocimiento).
-- El repositorio de Informatica PowerCenter (REP_*) es 100% lectura y NO
-- requiere ningun DDL aqui.
--
-- Idempotente: puede ejecutarse varias veces sin error.
-- ============================================================================

-- (Opcional) Crear la base si aun no existe
IF DB_ID('BotMonitoreo') IS NULL
BEGIN
    CREATE DATABASE BotMonitoreo;
END;
GO

USE BotMonitoreo;
GO

-- ----------------------------------------------------------------------------
-- Tabla principal: elementos monitoreados
-- ----------------------------------------------------------------------------
IF OBJECT_ID('dbo.elementos_monitoreados', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.elementos_monitoreados
    (
        id                      UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT DF_elementos_id DEFAULT NEWSEQUENTIALID(),
        nombre                  NVARCHAR(255)    NOT NULL,
        tipo                    NVARCHAR(50)     NOT NULL,   -- Workflow | Tabla | Sesion | Query | Objeto | Otro
        esquemaDWH              NVARCHAR(255)    NULL,
        registrosEsperados      INT              NULL,
        columnasAgrupacion      NVARCHAR(MAX)    NOT NULL
            CONSTRAINT DF_elementos_cols DEFAULT '[]',        -- JSON serializado: string[]
        promedioHistorico       FLOAT            NOT NULL
            CONSTRAINT DF_elementos_prom DEFAULT 0,
        duracionMaximaManual    INT              NULL,
        queRevisa               NVARCHAR(MAX)    NOT NULL,
        frecuenciaRevision      NVARCHAR(255)    NOT NULL
            CONSTRAINT DF_elementos_frecuencia DEFAULT 'Automático',
        activo                  BIT              NOT NULL
            CONSTRAINT DF_elementos_activo DEFAULT 1,
        consultaValidacion      NVARCHAR(MAX)    NULL,
        criteriosMonitoreo      NVARCHAR(MAX)    NOT NULL
            CONSTRAINT DF_elementos_criterios DEFAULT '["ESTADO_FINAL","DURACION"]',
        horaInicioEjecucion     NVARCHAR(5)      NULL,
        conexionValidacionId    UNIQUEIDENTIFIER NULL,
        -- Emails a notificar (JSON: string[]); vacio = usa ALERTA_DESTINATARIOS_DEFAULT
        destinatariosAlerta     NVARCHAR(MAX)    NOT NULL
            CONSTRAINT DF_elementos_destinatarios DEFAULT '[]',
        creadoEn                DATETIME2        NOT NULL
            CONSTRAINT DF_elementos_creado DEFAULT SYSUTCDATETIME(),
        actualizadoEn           DATETIME2        NOT NULL
            CONSTRAINT DF_elementos_actualizado DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_elementos_monitoreados PRIMARY KEY CLUSTERED (id)
    );
END;
GO

-- ----------------------------------------------------------------------------
-- Migracion: agregar columnas del motor de monitoreo (instalaciones previas)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('dbo.elementos_monitoreados')
                 AND name = 'horaInicioEjecucion')
    ALTER TABLE dbo.elementos_monitoreados
        ADD horaInicioEjecucion NVARCHAR(5) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('dbo.elementos_monitoreados')
                 AND name = 'criteriosMonitoreo')
    ALTER TABLE dbo.elementos_monitoreados
        ADD criteriosMonitoreo NVARCHAR(MAX) NOT NULL
            CONSTRAINT DF_elementos_criterios DEFAULT '["ESTADO_FINAL","DURACION"]';
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('dbo.elementos_monitoreados')
                 AND name = 'destinatariosAlerta')
    ALTER TABLE dbo.elementos_monitoreados
        ADD destinatariosAlerta NVARCHAR(MAX) NOT NULL
            CONSTRAINT DF_elementos_destinatarios DEFAULT '[]';
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('dbo.elementos_monitoreados')
                 AND name = 'conexionValidacionId')
    ALTER TABLE dbo.elementos_monitoreados
        ADD conexionValidacionId UNIQUEIDENTIFIER NULL;
GO

-- ---------------------------------------------------------------------------
-- Alertas persistentes: se muestran en el chat y se envían por correo.
-- ---------------------------------------------------------------------------
IF OBJECT_ID('dbo.alertas_monitoreo', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.alertas_monitoreo
    (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_alertas_id DEFAULT NEWSEQUENTIALID(),
        elementoId UNIQUEIDENTIFIER NULL,
        nombreElemento NVARCHAR(255) NOT NULL,
        tipo NVARCHAR(50) NOT NULL,
        severidad NVARCHAR(20) NOT NULL,
        mensaje NVARCHAR(MAX) NOT NULL,
        claveDedupe NVARCHAR(100) NULL,
        leidaEn DATETIME2 NULL,
        resueltaEn DATETIME2 NULL,
        creadaEn DATETIME2 NOT NULL CONSTRAINT DF_alertas_creada DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_alertas_monitoreo PRIMARY KEY CLUSTERED (id)
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_alertas_pendientes'
               AND object_id = OBJECT_ID('dbo.alertas_monitoreo'))
    CREATE INDEX IX_alertas_pendientes ON dbo.alertas_monitoreo (leidaEn, creadaEn DESC);
GO

-- ---------------------------------------------------------------------------
-- Conexiones de consultas de validación. contrasenaCifrada usa AES-GCM.
-- ---------------------------------------------------------------------------
IF OBJECT_ID('dbo.conexiones_validacion', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.conexiones_validacion
    (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_conexiones_id DEFAULT NEWSEQUENTIALID(),
        nombre NVARCHAR(100) NOT NULL,
        tipo NVARCHAR(20) NOT NULL,
        host NVARCHAR(255) NOT NULL,
        puerto INT NOT NULL,
        baseDatos NVARCHAR(255) NOT NULL,
        usuario NVARCHAR(255) NOT NULL,
        contrasenaCifrada NVARCHAR(MAX) NOT NULL,
        encriptar BIT NOT NULL CONSTRAINT DF_conexiones_encriptar DEFAULT 0,
        activo BIT NOT NULL CONSTRAINT DF_conexiones_activo DEFAULT 1,
        creadoEn DATETIME2 NOT NULL CONSTRAINT DF_conexiones_creada DEFAULT SYSUTCDATETIME(),
        actualizadoEn DATETIME2 NOT NULL CONSTRAINT DF_conexiones_actualizada DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_conexiones_validacion PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_conexiones_validacion_nombre UNIQUE (nombre)
    );
END;
GO

-- ---------------------------------------------------------------------------
-- Servidores monitoreados: prueba ICMP y, opcionalmente, puerto TCP.
-- ---------------------------------------------------------------------------
IF OBJECT_ID('dbo.servidores_monitoreados', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.servidores_monitoreados
    (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_servidores_id DEFAULT NEWSEQUENTIALID(),
        nombre NVARCHAR(100) NOT NULL,
        host NVARCHAR(255) NOT NULL,
        puerto INT NULL,
        descripcion NVARCHAR(MAX) NULL,
        activo BIT NOT NULL CONSTRAINT DF_servidores_activo DEFAULT 1,
        creadoEn DATETIME2 NOT NULL CONSTRAINT DF_servidores_creada DEFAULT SYSUTCDATETIME(),
        actualizadoEn DATETIME2 NOT NULL CONSTRAINT DF_servidores_actualizada DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_servidores_monitoreados PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_servidores_monitoreados_nombre UNIQUE (nombre)
    );
END;
GO

-- ----------------------------------------------------------------------------
-- Tabla hija: dependencias de cada elemento (relacion 1:N)
-- ----------------------------------------------------------------------------
IF OBJECT_ID('dbo.dependencias_elemento', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.dependencias_elemento
    (
        id         UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT DF_dependencias_id DEFAULT NEWSEQUENTIALID(),
        nombre     NVARCHAR(255)    NOT NULL,
        tipo       NVARCHAR(100)    NOT NULL,
        accion     NVARCHAR(255)    NOT NULL,
        elementoId UNIQUEIDENTIFIER NULL,
        CONSTRAINT PK_dependencias_elemento PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_dependencias_elemento FOREIGN KEY (elementoId)
            REFERENCES dbo.elementos_monitoreados (id)
            ON DELETE CASCADE
    );
END;
GO

-- ----------------------------------------------------------------------------
-- Indices de apoyo a las consultas del servicio
--   - filtro por tipo (obtenerPorTipo)
--   - orden por creadoEn (obtenerTodos)
--   - FK sin indice = lentitud en DELETE con cascada
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_elementos_tipo'
                 AND object_id = OBJECT_ID('dbo.elementos_monitoreados'))
    CREATE INDEX IX_elementos_tipo ON dbo.elementos_monitoreados (tipo);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_elementos_creado'
                 AND object_id = OBJECT_ID('dbo.elementos_monitoreados'))
    CREATE INDEX IX_elementos_creado ON dbo.elementos_monitoreados (creadoEn DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'IX_dependencias_elementoId'
                 AND object_id = OBJECT_ID('dbo.dependencias_elemento'))
    CREATE INDEX IX_dependencias_elementoId ON dbo.dependencias_elemento (elementoId);
GO
