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
