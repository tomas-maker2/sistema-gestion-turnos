/*
  Datos de ejemplo para probar el sistema de gestión de turnos.

  Cuándo usarlo: sobre una base recién creada (con las cuatro tablas y sin datos).
  Si la tabla Usuario ya tiene filas, el script no carga nada.

  Qué carga:
    - 2 usuarios:  admin / Admin1234!   (rol Admin)
                   operador / Operador1234!   (rol Operador)
    - 6 clientes, 5 servicios
    - turnos de ayer, hoy, mañana y pasado mañana (las fechas son relativas al día en que se ejecuta,
      así la agenda siempre tiene datos para mirar)

  Las contraseñas son de ejemplo: no usar estos usuarios en un entorno real.
*/
SET NOCOUNT ON;

IF EXISTS (SELECT 1 FROM dbo.Usuario)
BEGIN
    PRINT 'La base ya tiene usuarios: no se carga ningún dato de ejemplo.';
END
ELSE
BEGIN
    -- Las contraseñas están guardadas como hash (formato del PasswordHasher de ASP.NET Core)
    INSERT dbo.Usuario (NombreUsuario, NombreCompleto, PasswordHash, Rol) VALUES
     (N'admin',    N'Administrador',  N'AQAAAAIAAYagAAAAEPcLIbjSxnTpsmWjTqs7ZUX1GitvfqThTEA9tEn5XT6LRMskN5lewVgB6PCSg7ckrA==', N'Admin'),
     (N'operador', N'Operador Demo',  N'AQAAAAIAAYagAAAAEPrWpn8+8vO1h6vOiwBsBcvD5ketaQY1bl3IiY1pFZQ++J+yunHX2RckvGOLS1eqcw==', N'Operador');

    INSERT dbo.Cliente (Nombre, Apellido, Telefono, Email) VALUES
     (N'Ana',    N'Pérez',     N'11 4555-1001', N'ana.perez@mail.com'),
     (N'Luis',   N'Gómez',     N'11 4555-1002', NULL),
     (N'María',  N'Rodríguez', N'11 4555-1003', N'maria.r@mail.com'),
     (N'Carlos', N'Fernández', N'11 4555-1004', NULL),
     (N'Lucía',  N'Martínez',  N'11 4555-1005', N'lucia.m@mail.com'),
     (N'Jorge',  N'López',     N'11 4555-1006', NULL);

    INSERT dbo.Servicio (Nombre, DuracionMinutos) VALUES
     (N'Corte de pelo',       30),
     (N'Coloración',          90),
     (N'Arreglo de barba',    20),
     (N'Peinado',             45),
     (N'Tratamiento capilar', 60);

    -- Medianoche de hoy; a partir de ahí se arman las horas de cada turno
    DECLARE @hoy DATETIME2(0) = CAST(CAST(GETDATE() AS DATE) AS DATETIME2(0));
    DECLARE @ayer DATETIME2(0) = DATEADD(DAY, -1, @hoy);
    DECLARE @manana DATETIME2(0) = DATEADD(DAY, 1, @hoy);
    DECLARE @pasado DATETIME2(0) = DATEADD(DAY, 2, @hoy);

    -- Orden de las columnas: cliente, servicio, usuario que lo cargó, inicio, fin, estado, observaciones
    INSERT dbo.Turno (ClienteId, ServicioId, UsuarioId, FechaHoraInicio, FechaHoraFin, Estado, Observaciones) VALUES
     -- Ayer: dos turnos ya atendidos
     (1, 1, 1, DATEADD(HOUR, 10, @ayer),               DATEADD(MINUTE, 10 * 60 + 30, @ayer),  N'Atendido',  NULL),
     (2, 2, 2, DATEADD(HOUR, 11, @ayer),               DATEADD(MINUTE, 12 * 60 + 30, @ayer),  N'Atendido',  N'Primera vez'),
     -- Hoy
     (3, 3, 2, DATEADD(HOUR, 9, @hoy),                 DATEADD(MINUTE, 9 * 60 + 20, @hoy),    N'Atendido',  NULL),
     (4, 1, 1, DATEADD(HOUR, 17, @hoy),                DATEADD(MINUTE, 17 * 60 + 30, @hoy),   N'Pendiente', NULL),
     (5, 4, 2, DATEADD(MINUTE, 18 * 60, @hoy),         DATEADD(MINUTE, 18 * 60 + 45, @hoy),   N'Pendiente', N'Evento por la noche'),
     -- Un turno cancelado puede superponerse con uno pendiente: el cancelado libera el horario
     (2, 1, 2, DATEADD(MINUTE, 19 * 60, @hoy),         DATEADD(MINUTE, 19 * 60 + 30, @hoy),   N'Cancelado', N'Canceló el cliente'),
     (6, 2, 1, DATEADD(MINUTE, 19 * 60, @hoy),         DATEADD(MINUTE, 20 * 60 + 30, @hoy),   N'Pendiente', NULL),
     -- Mañana
     (1, 5, 1, DATEADD(HOUR, 10, @manana),             DATEADD(MINUTE, 11 * 60, @manana),     N'Pendiente', NULL),
     (3, 1, 2, DATEADD(MINUTE, 11 * 60 + 30, @manana), DATEADD(MINUTE, 12 * 60, @manana),     N'Pendiente', NULL),
     -- Pasado mañana
     (6, 3, 1, DATEADD(HOUR, 15, @pasado),             DATEADD(MINUTE, 15 * 60 + 20, @pasado), N'Pendiente', N'Retoque');

    PRINT 'Datos de ejemplo cargados: 2 usuarios, 6 clientes, 5 servicios y 10 turnos.';
END
