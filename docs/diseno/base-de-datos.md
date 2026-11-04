# Diseño de la base de datos – Sistema de gestión de turnos

Motor: **Microsoft SQL Server**. Script de creación: [base-de-datos.sql](base-de-datos.sql). Diagrama entidad-relación: sección 4 de [modelado-uml.md](modelado-uml.md).

## Decisiones de diseño

- **Cuatro tablas** (`Usuario`, `Cliente`, `Servicio`, `Turno`), normalizadas hasta 3FN. No hay datos repetidos entre tablas.
- **Baja lógica** (`Activo = 0`) en usuarios, clientes y servicios. Un turno histórico siempre puede mostrar a quién se atendió y qué servicio se prestó.
- **Rol y estado como texto con `CHECK`** (no como tablas de catálogo). Son conjuntos cerrados de 2 y 3 valores; una tabla extra no aporta nada a este alcance.
- **`FechaHoraFin` se persiste** (inicio + duración del servicio al momento de agendar). Si luego se cambia la duración de un servicio, los turnos ya agendados no se alteran, y la consulta de superposición no necesita hacer joins.
- **Fechas en `DATETIME2(0)`** (precisión de segundos). Las fechas de alta se guardan en UTC (`SYSUTCDATETIME()`); la fecha y hora del turno se guardan tal cual las ingresa el usuario (hora local del negocio).
- **La contraseña nunca se guarda en texto plano**: `PasswordHash` almacena el hash generado por el `PasswordHasher` de ASP.NET Core.
- **El usuario administrador inicial no se inserta con SQL**, porque el hash lo genera la aplicación. La API lo crea en el primer arranque si la tabla `Usuario` está vacía, tomando las credenciales de la configuración.

## Diccionario de datos

### Usuario

| Columna | Tipo | Nulo | Restricciones / Default | Descripción |
|---|---|---|---|---|
| Id | INT IDENTITY | No | PK | Identificador |
| NombreUsuario | NVARCHAR(50) | No | UNIQUE | Nombre para iniciar sesión |
| NombreCompleto | NVARCHAR(100) | No | | Nombre para mostrar |
| PasswordHash | NVARCHAR(500) | No | | Hash de la contraseña |
| Rol | NVARCHAR(20) | No | CHECK en (`Admin`, `Operador`) | Perfil de permisos |
| Activo | BIT | No | Default 1 | Baja lógica |
| FechaAlta | DATETIME2(0) | No | Default `SYSUTCDATETIME()` | Alta del registro |

### Cliente

| Columna | Tipo | Nulo | Restricciones / Default | Descripción |
|---|---|---|---|---|
| Id | INT IDENTITY | No | PK | Identificador |
| Nombre | NVARCHAR(100) | No | | |
| Apellido | NVARCHAR(100) | No | | |
| Telefono | NVARCHAR(30) | No | | Contacto principal |
| Email | NVARCHAR(150) | Sí | | Opcional |
| Activo | BIT | No | Default 1 | Baja lógica |
| FechaAlta | DATETIME2(0) | No | Default `SYSUTCDATETIME()` | Alta del registro |

### Servicio

| Columna | Tipo | Nulo | Restricciones / Default | Descripción |
|---|---|---|---|---|
| Id | INT IDENTITY | No | PK | Identificador |
| Nombre | NVARCHAR(100) | No | UNIQUE | Ej.: "Corte de pelo" |
| DuracionMinutos | INT | No | CHECK entre 5 y 480 | Duración estándar |
| Activo | BIT | No | Default 1 | Baja lógica |

### Turno

| Columna | Tipo | Nulo | Restricciones / Default | Descripción |
|---|---|---|---|---|
| Id | INT IDENTITY | No | PK | Identificador |
| ClienteId | INT | No | FK → Cliente(Id) | Quién tiene el turno |
| ServicioId | INT | No | FK → Servicio(Id) | Qué se va a realizar |
| UsuarioId | INT | No | FK → Usuario(Id) | Quién cargó el turno |
| FechaHoraInicio | DATETIME2(0) | No | | Comienzo |
| FechaHoraFin | DATETIME2(0) | No | CHECK `Fin > Inicio` | Inicio + duración del servicio |
| Estado | NVARCHAR(20) | No | CHECK en (`Pendiente`, `Atendido`, `Cancelado`); default `Pendiente` | |
| Observaciones | NVARCHAR(500) | Sí | | Opcional |
| FechaAlta | DATETIME2(0) | No | Default `SYSUTCDATETIME()` | Alta del registro |

## Relaciones

| Relación | Cardinalidad | Regla |
|---|---|---|
| Cliente – Turno | 1 a N | Un cliente puede tener muchos turnos; un turno pertenece a un único cliente |
| Servicio – Turno | 1 a N | Ídem |
| Usuario – Turno | 1 a N | Ídem (el usuario que lo registró) |

Las claves foráneas no tienen borrado en cascada: como las bajas son lógicas, nunca se borran físicamente clientes, servicios ni usuarios con turnos.

## Índices

| Índice | Tabla | Para qué |
|---|---|---|
| `IX_Turno_FechaHoraInicio` (incluye `FechaHoraFin`, `Estado`) | Turno | Agenda por rango de fechas y consulta de superposición, sin acceder a la tabla |
| `IX_Turno_ClienteId` | Turno | Historial de turnos de un cliente |
| `IX_Cliente_Apellido_Nombre` | Cliente | Búsqueda y orden por apellido y nombre |
| Únicos de `Usuario.NombreUsuario` y `Servicio.Nombre` | Usuario, Servicio | Evitan duplicados (los crea la restricción `UNIQUE`) |

## Regla de superposición

Un turno nuevo (o modificado) con inicio `@Inicio` y fin `@Fin` se superpone con otro si ambos intervalos se cruzan. Los turnos cancelados no cuentan, y al modificar un turno se excluye a sí mismo:

```sql
SELECT COUNT(1)
FROM dbo.Turno
WHERE Estado <> N'Cancelado'
  AND Id <> @ExcluirId
  AND @Inicio < FechaHoraFin
  AND @Fin    > FechaHoraInicio;
```

Si el resultado es mayor que cero, `TurnoService` rechaza la operación (HTTP 409). Dos turnos contiguos (uno termina a las 10:30 y el otro empieza a las 10:30) **no** se consideran superpuestos.

## Validación

El script se ejecutó sobre una base vacía de SQL Server (LocalDB, 2019) sin errores. Se comprobó que:

- la consulta de superposición devuelve 1 para un turno que se cruza y 0 para uno contiguo;
- se rechaza un rol inválido (`CK_Usuario_Rol`);
- se rechaza un turno cuyo fin es anterior a su inicio (`CK_Turno_Horario`).

## Pasos siguientes

Al crear el repositorio, estas tablas pasan a un proyecto de base de datos de SQL Server (`.sqlproj`), un archivo por tabla, para poder usar *Schema Compare* de Visual Studio contra la base real.
