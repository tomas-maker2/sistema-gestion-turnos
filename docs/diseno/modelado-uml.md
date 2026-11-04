# Modelado UML – Sistema de gestión de turnos

Práctica de Laboratorio – Tecnicatura en Programación de Computadoras (560)
Alumno: Tomás Bolotnicoff · Docente: Mg. Ing. Guillermo Ramiro Maquieira

Diagramas en sintaxis [Mermaid](https://mermaid.js.org/). Se visualizan directamente en VS Code (extensión *Markdown Preview Mermaid Support*) y en GitHub. Las imágenes exportadas están en [`img/`](img/).

Contenido:

1. Diagrama de casos de uso
2. Diagrama de clases del dominio
3. Diagrama de clases de la arquitectura (backend)
4. Diagrama entidad-relación
5. Diagrama de secuencia: iniciar sesión
6. Diagrama de secuencia: alta de turno

---

## 1. Diagrama de casos de uso

Actores: **Administrador** y **Operador**. El Administrador hereda todo lo que puede hacer el Operador y además gestiona usuarios.

```mermaid
flowchart LR
    Admin["Administrador"]
    Op["Operador"]

    subgraph SIS["Sistema de gestión de turnos"]
        direction TB
        UC1(["Iniciar sesión"])
        UC2(["Cambiar contraseña propia"])
        UC3(["Gestionar clientes"])
        UC4(["Gestionar servicios"])
        UC5(["Gestionar turnos"])
        UC6(["Validar superposición de horarios"])
        UC7(["Consultar agenda diaria / semanal"])
        UC8(["Gestionar usuarios"])
    end

    Admin -- "es un" --> Op
    Op --- UC1
    Op --- UC2
    Op --- UC3
    Op --- UC4
    Op --- UC5
    Op --- UC7
    Admin --- UC8
    UC5 -. "«include»" .-> UC6
```

| Caso de uso | Descripción | Actor |
|---|---|---|
| Iniciar sesión | Valida usuario y contraseña y entrega un token JWT. Es precondición de todos los demás casos de uso, por eso no se dibuja una relación hacia cada uno. | Operador, Administrador |
| Cambiar contraseña propia | El usuario autenticado modifica su contraseña. | Operador, Administrador |
| Gestionar clientes | Alta, modificación, consulta y baja lógica de clientes. | Operador, Administrador |
| Gestionar servicios | Alta, modificación, consulta y baja lógica de servicios (nombre y duración en minutos). | Operador, Administrador |
| Gestionar turnos | Alta, modificación, cancelación y marcado como atendido de turnos. | Operador, Administrador |
| Validar superposición de horarios | Rechaza un turno que se superponga con otro vigente. Se ejecuta siempre al crear o modificar un turno. | (incluido) |
| Consultar agenda diaria / semanal | Muestra los turnos de un día o de una semana. | Operador, Administrador |
| Gestionar usuarios | Alta, modificación, baja lógica, asignación de rol y reseteo de contraseña. | Administrador |

---

## 2. Diagrama de clases del dominio

```mermaid
classDiagram
    direction LR

    class Rol {
        <<enumeration>>
        Admin
        Operador
    }

    class EstadoTurno {
        <<enumeration>>
        Pendiente
        Atendido
        Cancelado
    }

    class Usuario {
        +int Id
        +string NombreUsuario
        +string NombreCompleto
        +string PasswordHash
        +Rol Rol
        +bool Activo
        +DateTime FechaAlta
    }

    class Cliente {
        +int Id
        +string Nombre
        +string Apellido
        +string Telefono
        +string? Email
        +bool Activo
        +DateTime FechaAlta
    }

    class Servicio {
        +int Id
        +string Nombre
        +int DuracionMinutos
        +bool Activo
    }

    class Turno {
        +int Id
        +DateTime FechaHoraInicio
        +DateTime FechaHoraFin
        +EstadoTurno Estado
        +string? Observaciones
        +DateTime FechaAlta
        +Cancelar()
        +MarcarAtendido()
    }

    Usuario --> Rol
    Turno --> EstadoTurno
    Cliente "1" -- "0..*" Turno : solicita
    Servicio "1" -- "0..*" Turno : se presta en
    Usuario "1" -- "0..*" Turno : registra
```

Notas:

- `FechaHoraFin` se calcula al guardar: `FechaHoraInicio + Servicio.DuracionMinutos`.
- `Activo = false` representa la baja lógica de usuarios, clientes y servicios; así los turnos históricos conservan sus referencias.
- Un turno `Cancelado` no bloquea el horario; `Atendido` y `Pendiente` sí.

---

## 3. Diagrama de clases de la arquitectura (backend)

Capas: **Controllers** (HTTP, autorización por rol) → **Services** (reglas de negocio) → **AppDbContext** (EF Core, acceso a SQL Server).

```mermaid
classDiagram
    direction LR

    class AuthController {
        +Login(LoginRequest) LoginResponse
        +CambiarPassword(CambiarPasswordRequest)
    }
    class UsuariosController {
        <<Admin>>
        +Listar()
        +Obtener(id)
        +Crear(UsuarioDto)
        +Modificar(id, UsuarioDto)
        +Desactivar(id)
        +ResetearPassword(id)
    }
    class ClientesController {
        +Listar(texto)
        +Obtener(id)
        +Crear(ClienteDto)
        +Modificar(id, ClienteDto)
        +Desactivar(id)
    }
    class ServiciosController {
        +Listar()
        +Obtener(id)
        +Crear(ServicioDto)
        +Modificar(id, ServicioDto)
        +Desactivar(id)
    }
    class TurnosController {
        +Agenda(desde, hasta)
        +Obtener(id)
        +Crear(TurnoDto)
        +Modificar(id, TurnoDto)
        +Cancelar(id)
        +MarcarAtendido(id)
    }

    class AuthService {
        +Login(usuario, password) string
        +CambiarPassword(idUsuario, actual, nueva)
        -GenerarToken(Usuario) string
    }
    class UsuarioService
    class ClienteService
    class ServicioService
    class TurnoService {
        +Crear(TurnoDto) Turno
        +Modificar(id, TurnoDto) Turno
        +Cancelar(id)
        +MarcarAtendido(id)
        +ObtenerAgenda(desde, hasta) List~Turno~
        -HaySuperposicion(inicio, fin, excluirId) bool
    }

    class AppDbContext {
        +DbSet~Usuario~ Usuarios
        +DbSet~Cliente~ Clientes
        +DbSet~Servicio~ Servicios
        +DbSet~Turno~ Turnos
    }

    AuthController --> AuthService
    UsuariosController --> UsuarioService
    ClientesController --> ClienteService
    ServiciosController --> ServicioService
    TurnosController --> TurnoService

    AuthService --> AppDbContext
    UsuarioService --> AppDbContext
    ClienteService --> AppDbContext
    ServicioService --> AppDbContext
    TurnoService --> AppDbContext
```

Los servicios se registran por inyección de dependencias. La regla de superposición vive únicamente en `TurnoService` y es lo que se cubre con pruebas unitarias (xUnit).

---

## 4. Diagrama entidad-relación

```mermaid
erDiagram
    USUARIO ||--o{ TURNO : registra
    CLIENTE ||--o{ TURNO : solicita
    SERVICIO ||--o{ TURNO : "se presta en"

    USUARIO {
        int Id PK
        nvarchar NombreUsuario UK
        nvarchar NombreCompleto
        nvarchar PasswordHash
        nvarchar Rol "Admin | Operador"
        bit Activo
        datetime2 FechaAlta
    }
    CLIENTE {
        int Id PK
        nvarchar Nombre
        nvarchar Apellido
        nvarchar Telefono
        nvarchar Email "opcional"
        bit Activo
        datetime2 FechaAlta
    }
    SERVICIO {
        int Id PK
        nvarchar Nombre UK
        int DuracionMinutos
        bit Activo
    }
    TURNO {
        int Id PK
        int ClienteId FK
        int ServicioId FK
        int UsuarioId FK
        datetime2 FechaHoraInicio
        datetime2 FechaHoraFin
        nvarchar Estado "Pendiente | Atendido | Cancelado"
        nvarchar Observaciones "opcional"
        datetime2 FechaAlta
    }
```

El detalle de tipos, restricciones e índices está en [base-de-datos.md](base-de-datos.md).

---

## 5. Diagrama de secuencia: iniciar sesión

```mermaid
sequenceDiagram
    actor U as Usuario
    participant UI as Angular (LoginComponent)
    participant API as AuthController
    participant S as AuthService
    participant DB as SQL Server

    U->>UI: Ingresa usuario y contraseña
    UI->>API: POST /api/auth/login
    API->>S: Login(usuario, password)
    S->>DB: Buscar usuario por NombreUsuario
    DB-->>S: Usuario (o ninguno)
    S->>S: Verificar estado activo y hash de la contraseña
    alt Usuario inexistente, inactivo o contraseña incorrecta
        S-->>API: Credenciales inválidas
        API-->>UI: 401 Unauthorized
        UI-->>U: Muestra mensaje de error
    else Credenciales válidas
        S->>S: Generar token JWT (id, rol, vencimiento)
        S-->>API: Token
        API-->>UI: 200 OK + token y rol
        UI->>UI: Guarda el token (el interceptor lo adjunta a cada request)
        UI-->>U: Redirige a la agenda
    end
```

---

## 6. Diagrama de secuencia: alta de turno

```mermaid
sequenceDiagram
    actor O as Operador
    participant UI as Angular (TurnoFormComponent)
    participant API as TurnosController
    participant S as TurnoService
    participant DB as SQL Server

    O->>UI: Elige cliente, servicio, fecha y hora
    UI->>API: POST /api/turnos (Authorization: Bearer token)
    API->>API: Valida token y rol
    API->>S: Crear(TurnoDto)
    S->>DB: Obtener Servicio (DuracionMinutos)
    DB-->>S: Servicio
    S->>S: FechaHoraFin = Inicio + Duración
    S->>DB: Buscar turnos no cancelados que se superpongan
    DB-->>S: Resultado
    alt Existe superposición
        S-->>API: Error de regla de negocio
        API-->>UI: 409 Conflict
        UI-->>O: Informa que el horario está ocupado
    else Horario libre
        S->>DB: INSERT Turno (Estado = Pendiente)
        DB-->>S: Id del turno
        S-->>API: Turno creado
        API-->>UI: 201 Created
        UI-->>O: Muestra el turno en la agenda
    end
```
