CREATE TABLE dbo.Servicio (
    Id               INT IDENTITY(1,1)  NOT NULL,
    Nombre           NVARCHAR(100)      NOT NULL,
    DuracionMinutos  INT                NOT NULL,
    Activo           BIT                NOT NULL CONSTRAINT DF_Servicio_Activo DEFAULT (1),
    CONSTRAINT PK_Servicio PRIMARY KEY CLUSTERED (Id),
    CONSTRAINT UQ_Servicio_Nombre UNIQUE (Nombre),
    CONSTRAINT CK_Servicio_Duracion CHECK (DuracionMinutos BETWEEN 5 AND 480)
);
