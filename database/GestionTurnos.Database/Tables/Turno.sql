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

-- Agenda por rango de fechas y consulta de superposición
CREATE INDEX IX_Turno_FechaHoraInicio
    ON dbo.Turno (FechaHoraInicio)
    INCLUDE (FechaHoraFin, Estado);
GO

CREATE INDEX IX_Turno_ClienteId ON dbo.Turno (ClienteId);
