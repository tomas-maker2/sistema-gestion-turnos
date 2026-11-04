/*
  Sistema de gestión de turnos – Esquema de base de datos (SQL Server)
  Diseño de referencia: cuando se cree el proyecto de base de datos (.sqlproj),
  cada tabla pasa a ser un archivo propio dentro de la carpeta Tables/.
*/

CREATE TABLE dbo.Usuario (
    Id              INT IDENTITY(1,1)  NOT NULL,
    NombreUsuario   NVARCHAR(50)       NOT NULL,
    NombreCompleto  NVARCHAR(100)      NOT NULL,
    PasswordHash    NVARCHAR(500)      NOT NULL,
    Rol             NVARCHAR(20)       NOT NULL,
    Activo          BIT                NOT NULL CONSTRAINT DF_Usuario_Activo DEFAULT (1),
    FechaAlta       DATETIME2(0)       NOT NULL CONSTRAINT DF_Usuario_FechaAlta DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Usuario PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Usuario_NombreUsuario UNIQUE (NombreUsuario),
    CONSTRAINT CK_Usuario_Rol CHECK (Rol IN (N'Admin', N'Operador'))
);
GO

CREATE TABLE dbo.Cliente (
    Id         INT IDENTITY(1,1)  NOT NULL,
    Nombre     NVARCHAR(100)      NOT NULL,
    Apellido   NVARCHAR(100)      NOT NULL,
    Telefono   NVARCHAR(30)       NOT NULL,
    Email      NVARCHAR(150)      NULL,
    Activo     BIT                NOT NULL CONSTRAINT DF_Cliente_Activo DEFAULT (1),
    FechaAlta  DATETIME2(0)       NOT NULL CONSTRAINT DF_Cliente_FechaAlta DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Cliente PRIMARY KEY CLUSTERED (Id)
);
GO

CREATE INDEX IX_Cliente_Apellido_Nombre ON dbo.Cliente (Apellido, Nombre);
GO

CREATE TABLE dbo.Servicio (
    Id               INT IDENTITY(1,1)  NOT NULL,
    Nombre           NVARCHAR(100)      NOT NULL,
    DuracionMinutos  INT                NOT NULL,
    Activo           BIT                NOT NULL CONSTRAINT DF_Servicio_Activo DEFAULT (1),
    CONSTRAINT PK_Servicio PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Servicio_Nombre UNIQUE (Nombre),
    CONSTRAINT CK_Servicio_Duracion CHECK (DuracionMinutos BETWEEN 5 AND 480)
);
GO

CREATE TABLE dbo.Turno (
    Id               INT IDENTITY(1,1)  NOT NULL,
    ClienteId        INT                NOT NULL,
    ServicioId       INT                NOT NULL,
    UsuarioId        INT                NOT NULL,
    FechaHoraInicio  DATETIME2(0)       NOT NULL,
    FechaHoraFin     DATETIME2(0)       NOT NULL,
    Estado           NVARCHAR(20)       NOT NULL CONSTRAINT DF_Turno_Estado DEFAULT (N'Pendiente'),
    Observaciones    NVARCHAR(500)      NULL,
    FechaAlta        DATETIME2(0)       NOT NULL CONSTRAINT DF_Turno_FechaAlta DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_Turno PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT FK_Turno_Cliente  FOREIGN KEY (ClienteId)  REFERENCES dbo.Cliente (Id),
    CONSTRAINT FK_Turno_Servicio FOREIGN KEY (ServicioId) REFERENCES dbo.Servicio (Id),
    CONSTRAINT FK_Turno_Usuario  FOREIGN KEY (UsuarioId)  REFERENCES dbo.Usuario (Id),
    CONSTRAINT CK_Turno_Estado   CHECK (Estado IN (N'Pendiente', N'Atendido', N'Cancelado')),
    CONSTRAINT CK_Turno_Horario  CHECK (FechaHoraFin > FechaHoraInicio)
);
GO

-- Soporta la agenda (rango de fechas) y la consulta de superposición.
CREATE INDEX IX_Turno_FechaHoraInicio
    ON dbo.Turno (FechaHoraInicio)
    INCLUDE (FechaHoraFin, Estado);
GO

CREATE INDEX IX_Turno_ClienteId ON dbo.Turno (ClienteId);
GO

/*
  Consulta de superposición usada por TurnoService (al modificar un turno se excluye el propio Id):

  SELECT COUNT(1)
  FROM dbo.Turno
  WHERE Estado <> N'Cancelado'
    AND Id <> @ExcluirId
    AND @Inicio < FechaHoraFin
    AND @Fin    > FechaHoraInicio;
*/
