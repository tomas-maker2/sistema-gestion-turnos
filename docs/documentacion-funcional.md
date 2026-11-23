# Documentación funcional – Sistema de gestión de turnos

Qué hace el sistema, para quién, con qué reglas y cómo se comporta ante cada situación. Para instalarlo y usarlo paso a paso, ver la [guía de instalación y uso](guia-de-instalacion-y-uso.md). Para el diseño técnico, ver [modelado UML](diseno/modelado-uml.md) y [diseño de la base de datos](diseno/base-de-datos.md).

## 1. Objetivo y alcance

El sistema permite a un negocio de atención al público (peluquería, consultorio, taller) **administrar sus clientes, los servicios que ofrece y la agenda de turnos**, evitando que dos turnos se superpongan en el horario.

**Incluye**

- Inicio de sesión con usuario y contraseña, con dos roles (Administrador y Operador).
- ABM (alta, baja, modificación y consulta) de usuarios, clientes y servicios.
- Agenda de turnos con vista por día y por semana, alta, edición, atención y cancelación.
- Control automático de superposición de horarios.
- Listados paginados desde el servidor.

**No incluye** (queda fuera del alcance de esta versión)

- Recordatorios por mail o mensaje al cliente.
- Turnos que se repiten, ni varios profesionales con agendas separadas.
- Cobros, facturación o reportes.
- Recuperación de contraseña por mail (un administrador la restablece desde la pantalla de Usuarios).
- Borrado físico de datos: todas las bajas son lógicas.

## 2. Usuarios del sistema

| Rol | Quién es | Qué puede hacer |
|---|---|---|
| **Administrador** | Responsable del negocio | Todo lo del operador, más la gestión de usuarios |
| **Operador** | Quien atiende y agenda | Agenda, clientes y servicios |

### Permisos por pantalla

| Pantalla | Administrador | Operador |
|---|---|---|
| Login | ✅ | ✅ |
| Agenda | ✅ | ✅ |
| Clientes | ✅ | ✅ |
| Servicios | ✅ | ✅ |
| Usuarios | ✅ | ❌ (no ve el menú; si entra por la dirección vuelve a la agenda) |
| Mi perfil y cambio de contraseña propia | ✅ | ✅ |

El control se hace en los dos lados: el frontend oculta lo que no corresponde y la API responde **403** si un operador intenta usar los endpoints de usuarios.

## 3. Requerimientos funcionales

### 3.1 Sesión y perfil

| Id | Requerimiento |
|---|---|
| RF-01 | Iniciar sesión con usuario y contraseña. Si los datos son incorrectos o el usuario está dado de baja, se informa "Usuario o contraseña incorrectos" (el mensaje no revela cuál de los dos falló). |
| RF-02 | La sesión se mantiene al recargar la página y vence a las 8 horas. Si el servidor responde 401 (sesión vencida o inválida), la aplicación vuelve al login. |
| RF-03 | Cerrar sesión (ícono de salida del encabezado), con un diálogo de confirmación. |
| RF-04 | Ver el perfil propio (nombre, usuario y rol) desde el ícono de usuario del encabezado. |
| RF-05 | Cambiar la contraseña propia: se pide la actual, la nueva (mínimo 8 caracteres) y su confirmación. |

### 3.2 Usuarios (solo administrador)

| Id | Requerimiento |
|---|---|
| RF-06 | Listar usuarios, paginado, con su rol y estado (Activo / Inactivo). |
| RF-07 | Dar de alta un usuario: nombre de usuario, nombre completo, contraseña inicial y rol. |
| RF-08 | Modificar el nombre completo y el rol. El nombre de usuario no se puede cambiar. |
| RF-09 | Restablecer la contraseña de otro usuario. |
| RF-10 | Desactivar y reactivar usuarios (baja lógica). Un usuario inactivo no puede iniciar sesión. |

### 3.3 Clientes

| Id | Requerimiento |
|---|---|
| RF-11 | Listar clientes, paginado y ordenado por apellido y nombre, con búsqueda por nombre o apellido (sin distinguir mayúsculas). Por defecto no se muestran los inactivos; un interruptor "Mostrar inactivos" los incluye. |
| RF-12 | Dar de alta un cliente: nombre, apellido y teléfono obligatorios; email opcional. |
| RF-13 | Modificar los datos de un cliente. |
| RF-14 | Desactivar (con confirmación) y reactivar clientes. |

### 3.4 Servicios

| Id | Requerimiento |
|---|---|
| RF-15 | Listar servicios, paginado, con su duración en minutos. Mismo interruptor "Mostrar inactivos". |
| RF-16 | Dar de alta un servicio: nombre y duración en minutos. |
| RF-17 | Modificar nombre y duración. |
| RF-18 | Desactivar (con confirmación) y reactivar servicios. |

### 3.5 Agenda y turnos

| Id | Requerimiento |
|---|---|
| RF-19 | Ver la agenda de un día: cada turno con hora de inicio y fin, cliente, servicio, observaciones y estado. Los turnos se ordenan por hora. |
| RF-20 | Ver la agenda de una semana (lunes a domingo), con los turnos agrupados por día. |
| RF-21 | Navegar entre días o semanas con las flechas, volver a hoy con el botón "Hoy" o elegir una fecha en el selector. |
| RF-22 | Agendar un turno: elegir un cliente (con buscador), un servicio, fecha y hora, y observaciones opcionales. El sistema muestra la hora de fin estimada ("Termina a las 09:30"). |
| RF-23 | Modificar un turno pendiente (cliente, servicio, fecha y hora, observaciones). |
| RF-24 | Marcar un turno pendiente como atendido, con confirmación. |
| RF-25 | Cancelar un turno pendiente, con confirmación que nombra al cliente y la hora. |

### 3.6 Transversales

| Id | Requerimiento |
|---|---|
| RF-26 | Todos los listados (usuarios, clientes, servicios) se paginan **en el servidor**: 5 filas por defecto, con opciones de 10, 30, 50 y 100. El paginador está arriba a la izquierda de la grilla e incluye primera, anterior, siguiente y última página. Al buscar o cambiar un filtro se vuelve a la primera página; si se da de baja lo último que tenía la última página, se pasa a la anterior. |
| RF-27 | Todo error se informa con un mensaje claro en castellano: debajo del campo cuando es de validación, dentro del diálogo cuando lo rechaza la API, o en un aviso temporal en pantalla. |

## 4. Reglas de negocio

| Id | Regla | Respuesta de la API |
|---|---|---|
| RN-01 | El nombre de usuario es único, sin distinguir mayúsculas. | 409 "Ya existe un usuario con ese nombre" |
| RN-02 | La contraseña tiene al menos 8 caracteres. Se guarda siempre como hash, nunca en texto plano. | 400 |
| RN-03 | Un administrador no puede desactivar su propio usuario. | 409 "No podés desactivar tu propio usuario" |
| RN-04 | Siempre tiene que quedar al menos un administrador activo. | 409 "Tiene que quedar al menos un administrador activo" |
| RN-05 | El nombre de servicio es único, sin distinguir mayúsculas. | 409 "Ya existe un servicio con ese nombre" |
| RN-06 | La duración de un servicio está entre 5 y 480 minutos. | 400 |
| RN-07 | El email del cliente, si se carga, tiene que tener un formato válido. Un email vacío se guarda como "sin email". | 400 "El email no es válido" |
| RN-08 | **No se borra nada**: usuarios, clientes y servicios se dan de baja (Activo = no). Los turnos históricos conservan sus datos. | — |
| RN-09 | Un turno solo se puede crear con un cliente y un servicio activos. | 409 |
| RN-10 | La hora de fin de un turno es el inicio más la duración del servicio, y queda guardada. Si después cambia la duración del servicio, los turnos ya agendados no se alteran. | — |
| RN-11 | **Dos turnos no pueden superponerse**: un turno nuevo (o modificado) choca con otro si empieza antes de que el otro termine y termina después de que el otro empiece. Un turno que empieza justo cuando otro termina (09:00–09:30 y 09:30–10:00) **no** es una superposición. | 409 "El horario está ocupado por otro turno" |
| RN-12 | Los turnos cancelados no cuentan para la superposición: cancelar libera el horario. Al modificar un turno no choca consigo mismo. | — |
| RN-13 | Un turno no puede empezar en el pasado. | 400 "El turno no puede empezar en el pasado" |
| RN-14 | Estados de un turno: **Pendiente → Atendido** o **Pendiente → Cancelado**. Solo un turno pendiente se puede modificar, atender o cancelar; los atendidos y cancelados quedan como registro. | 409 |
| RN-15 | La agenda se consulta por rango de fechas, de hasta 31 días. | 400 |
| RN-16 | Los listados aceptan solo los tamaños de página 5, 10, 30, 50 y 100, y páginas desde la 1. | 400 |
| RN-17 | Las observaciones de un turno admiten hasta 500 caracteres. | 400 |

### Estados de un turno

```
            ┌──────────► Atendido
Pendiente ──┤
            └──────────► Cancelado
```

En la agenda cada estado tiene su color: Pendiente (amarillo), Atendido (verde) y Cancelado (gris, con el texto atenuado y tachado). Solo los turnos pendientes muestran los botones de editar, atender y cancelar.

## 5. Campos y validaciones

### Usuario

| Campo | Obligatorio | Restricciones |
|---|---|---|
| Usuario | Sí | Hasta 50 caracteres, único. No se modifica después del alta. |
| Nombre completo | Sí | Hasta 100 caracteres |
| Contraseña | Sí (alta) | Mínimo 8 caracteres |
| Rol | Sí | Administrador u Operador |

### Cliente

| Campo | Obligatorio | Restricciones |
|---|---|---|
| Nombre | Sí | Hasta 100 caracteres |
| Apellido | Sí | Hasta 100 caracteres |
| Teléfono | Sí | Hasta 30 caracteres |
| Email | No | Hasta 150 caracteres, formato de email |

### Servicio

| Campo | Obligatorio | Restricciones |
|---|---|---|
| Nombre | Sí | Hasta 100 caracteres, único |
| Duración (minutos) | Sí | Entre 5 y 480 |

### Turno

| Campo | Obligatorio | Restricciones |
|---|---|---|
| Cliente | Sí | Se elige de la lista del buscador (no alcanza con escribir el nombre) |
| Servicio | Sí | Solo servicios activos |
| Fecha y hora | Sí | No puede estar en el pasado; no puede superponerse |
| Observaciones | No | Hasta 500 caracteres |

## 6. Flujos principales

### Agendar un turno

1. En **Agenda**, el usuario elige el día y pulsa **Nuevo turno**.
2. Busca al cliente escribiendo parte del nombre o apellido y lo elige de la lista.
3. Elige el servicio; el sistema calcula y muestra a qué hora termina.
4. Confirma con **Guardar**. La API valida que el horario esté libre y que no esté en el pasado.
5. Si hay un problema, el mensaje aparece dentro del diálogo y el usuario puede corregir la hora sin perder lo cargado. Si todo está bien, el turno aparece en la agenda, ordenado por hora.

### Atender o cancelar un turno

1. En la agenda, sobre un turno pendiente, el usuario pulsa **Marcar como atendido** o **Cancelar turno**.
2. El sistema pide confirmación (se puede volver atrás).
3. El turno cambia de estado y deja de mostrar botones. Si se cancela, el horario queda libre para otro turno.

### Dar de baja un cliente, servicio o usuario

1. En la grilla correspondiente, el usuario pulsa el ícono de desactivar y confirma.
2. El registro deja de aparecer en el listado normal (y en los buscadores de la agenda).
3. Con **Mostrar inactivos** se lo puede ver y **reactivar**.

## 7. Interfaz de usuario

- **Encabezado:** logo, menú (Agenda, Clientes, Servicios y, para el administrador, Usuarios), ícono de perfil e ícono de cierre de sesión.
- **Grilla compartida:** las tres pantallas de gestión usan el mismo componente: paginador arriba a la izquierda, encabezado de color, filas con estado como etiqueta y acciones como íconos.
- **Diálogos:** los formularios y confirmaciones se abren sobre la pantalla; se pueden cerrar con Escape o con Cancelar.
- **Avisos:** el resultado de cada operación se muestra unos segundos en un aviso inferior ("Cliente guardado", "Turno guardado", etc.).

Capturas de cada pantalla en la [guía de instalación y uso](guia-de-instalacion-y-uso.md#4-uso-del-sistema).

## 8. Arquitectura (resumen)

```
Navegador (Angular)  ──HTTP/JSON──►  API REST (.NET 10)  ──EF Core──►  SQL Server
   Vista y Controlador                 Controllers → Services              4 tablas
   (componentes) + Modelo              (reglas de negocio)
   (servicios e interfaces)
```

Se trabaja con el patrón **Modelo–Vista–Controlador** en las dos capas:

| | Backend | Frontend |
|---|---|---|
| **Modelo** | Entidades (`Models/`), contexto de datos (`Data/`) y servicios con las reglas de negocio (`Services/`) | Interfaces y servicios HTTP |
| **Vista** | Las respuestas JSON (DTOs en `Dtos/`) | Plantillas HTML de los componentes |
| **Controlador** | Controllers (`Controllers/`): reciben la petición, llaman al servicio y devuelven la respuesta | Clase de cada componente: reacciona a la pantalla y llama a los servicios |

Los controllers no contienen reglas de negocio: todas las reglas de este documento están en los servicios y se prueban de forma automática (ver [documentación de pruebas](pruebas/documentacion-de-pruebas.md)).

### Seguridad

- Autenticación con **JWT** (HS256), con rol y nombre de usuario dentro del token; vence a las 8 horas.
- Contraseñas con hash del `PasswordHasher` de ASP.NET Core.
- **Toda** la API exige token, salvo el login. Los endpoints de usuarios exigen además el rol Administrador.
- CORS limitado al origen del frontend (`http://localhost:4200`).
- El administrador inicial se crea al primer arranque solo si la tabla de usuarios está vacía, con las credenciales de la configuración `SembradoAdmin`.

### Respuestas de error de la API

Los errores se devuelven como `ProblemDetails` (JSON con `title` y `status`):

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos (campo vacío, formato, rango, página fuera de lo permitido, turno en el pasado) |
| 401 | Sin sesión, token inválido o vencido, credenciales incorrectas |
| 403 | Un operador intenta usar un endpoint de administrador |
| 404 | El registro no existe |
| 409 | Se rechaza por una regla de negocio (duplicado, horario ocupado, estado que no admite el cambio) |

## 9. API REST

Todas las rutas cuelgan de `/api` y, salvo el login, requieren el encabezado `Authorization: Bearer <token>`. Los listados aceptan `?pagina=1&tamanio=5` y responden `{ items, total, pagina, tamanio }`.

| Método y ruta | Qué hace | Rol |
|---|---|---|
| `POST /auth/login` | Inicia sesión y devuelve el token | Público |
| `POST /auth/cambiar-password` | Cambia la contraseña propia | Todos |
| `GET /usuarios` · `GET /usuarios/{id}` | Lista (paginado) / consulta | Administrador |
| `POST /usuarios` · `PUT /usuarios/{id}` | Alta / modificación | Administrador |
| `DELETE /usuarios/{id}` | Baja lógica | Administrador |
| `POST /usuarios/{id}/resetear-password` | Restablece la contraseña | Administrador |
| `GET /clientes` (`?texto=&incluirInactivos=`) · `GET /clientes/{id}` | Lista (paginado, con búsqueda) / consulta | Todos |
| `POST /clientes` · `PUT /clientes/{id}` · `DELETE /clientes/{id}` | Alta / modificación / baja lógica | Todos |
| `GET /servicios` (`?incluirInactivos=`) · `GET /servicios/{id}` | Lista (paginado) / consulta | Todos |
| `POST /servicios` · `PUT /servicios/{id}` · `DELETE /servicios/{id}` | Alta / modificación / baja lógica | Todos |
| `GET /turnos?desde=&hasta=` | Agenda del rango `[desde, hasta)`, hasta 31 días | Todos |
| `GET /turnos/{id}` | Consulta un turno | Todos |
| `POST /turnos` · `PUT /turnos/{id}` | Alta / modificación de un turno pendiente | Todos |
| `POST /turnos/{id}/atendido` · `POST /turnos/{id}/cancelar` | Cambia el estado | Todos |

## 10. Trazabilidad: requerimientos y pruebas

Cada requerimiento está cubierto por pruebas automáticas (backend: reglas y endpoints; frontend: pantallas) y por casos de punta a punta en un navegador real. El detalle de cada caso está en [resultados-e2e.md](pruebas/resultados-e2e.md) y el listado de todas las pruebas automáticas en el [catálogo de pruebas](pruebas/catalogo-de-pruebas.md).

| Requerimiento | Casos de punta a punta |
|---|---|
| RF-01, RF-02, RF-03 | AUT-01 a AUT-10 |
| RF-04, RF-05 | PER-01 a PER-04 |
| RF-06 a RF-10 | USU-01 a USU-08 |
| RF-11 a RF-14 | CLI-01 a CLI-07 |
| RF-15 a RF-18 | SER-01 a SER-05 |
| RF-26 | PAG-01 a PAG-08 |
| RF-19 a RF-25 | AGE-01 a AGE-14 |

| Regla de negocio | Casos de punta a punta |
|---|---|
| RN-01 | USU-04 |
| RN-02 | USU-02, PER-02 |
| RN-03 | USU-08 |
| RN-05, RN-06 | SER-02, SER-03 |
| RN-07 | CLI-03, CLI-04 |
| RN-08 | CLI-06, CLI-07, SER-05, USU-07 |
| RN-11, RN-12 | AGE-08, AGE-10, AGE-13 |
| RN-13 | AGE-09 |
| RN-14 | AGE-02, AGE-12, AGE-13 |
| RN-16 | PAG-02, PAG-06 |

Las reglas RN-04, RN-09, RN-10 y RN-15 se verifican en las pruebas automáticas del backend (`UsuarioServiceTests`, `TurnoServiceTests`). El límite de 500 caracteres de las observaciones (RN-17) lo hacen cumplir la validación de la API y la restricción de la columna en la base de datos; no tiene una prueba propia.
