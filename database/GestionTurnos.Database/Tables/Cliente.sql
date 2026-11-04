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
