# Catálogo de pruebas automáticas

Lista de todas las pruebas automáticas del código, agrupadas por archivo. Se genera leyendo los nombres de las pruebas con `node docs/pruebas/generar-catalogo.js`, así que siempre coincide con el código.

- Backend: 133 pruebas escritas. Algunas son parametrizadas y se ejecutan varias veces con distintos datos (la ejecución completa corre 163 casos).
- Frontend: 243 pruebas escritas. Algunas son parametrizadas (la ejecución completa corre 262 casos).

Cómo se ejecutan y cómo se interpretan está en [documentacion-de-pruebas.md](documentacion-de-pruebas.md).

## Backend (xUnit)

### ApiArranqueTests.cs

_La aplicación arranca y protege las rutas_ (1)

- La aplicacion arranca y exige token en cualquier ruta

### AuthHttpTests.cs

_Login y protección de endpoints (por HTTP)_ (4)

- Endpoint protegido sin token responde 401
- Endpoint protegido con token valido funciona
- Login con credenciales invalidas responde 401
- Login sin cuerpo valido responde 400

### AuthServiceTests.cs

_Lógica de login y cambio de contraseña_ (7)

- Login valido devuelve token con rol y vencimiento de horas configuradas
- Login con password incorrecta lanza CredencialesInvalidas
- Login con usuario inexistente lanza CredencialesInvalidas
- Login con usuario inactivo lanza CredencialesInvalidas
- CambiarPassword con actual correcta permite login con la nueva
- CambiarPassword con actual incorrecta lanza Validacion
- Sembrado crea admin si no hay usuarios y no hace nada si ya hay

### ClienteServiceTests.cs

_Lógica de clientes: alta, edición, baja, búsqueda_ (14)

- Crear y obtener devuelve los mismos datos
- Crear con email en blanco guarda null
- Crear con email invalido lanza Validacion
- Listar con texto filtra por nombre o apellido sin distinguir mayusculas
- Listar no incluye inactivos por defecto
- Listar ordena por apellido y nombre
- Listar pagina sobre los resultados filtrados y el total es el del filtro
- Listar cuenta los inactivos en el total solo si se piden
- Listar con tamanio no permitido lanza Validacion
- Modificar cambia los datos
- Modificar con Activo true reactiva un cliente inactivo
- Desactivar mantiene la fila con Activo false
- Modificar inexistente lanza NoEncontrado
- Desactivar inexistente lanza NoEncontrado

### ClientesServiciosHttpTests.cs

_Endpoints de clientes y servicios (por HTTP)_ (11)

- Sin token responde 401 en clientes y servicios
- Operador puede crear y listar clientes
- Cliente con email vacio se crea con email null
- Listado de servicios sin parametros trae 5 por pagina y el total
- Listado de clientes pagina sobre la busqueda
- Listado con parametros de paginacion invalidos responde 400
- Cliente inexistente responde 404
- Servicio con duracion en el limite responde 201
- Servicio con duracion fuera de rango responde 400
- Servicio con nombre duplicado responde 409
- Desactivar un servicio responde 204 y deja de listarse

### ErroresTests.cs

_Traducción de errores a respuestas 400, 401, 404 y 409_ (5)

- ValidacionException responde 400
- NoEncontradoException responde 404
- ReglaNegocioException responde 409
- CredencialesInvalidasException responde 401
- Una excepcion no prevista no se maneja

### PaginacionTests.cs

_Paginado en el servidor: páginas, totales y tamaños permitidos_ (9)

- Devuelve los datos de la pagina pedida y el total
- La ultima pagina puede venir incompleta
- Una pagina fuera de rango viene vacia pero con el total
- Sin datos devuelve una pagina vacia con total cero
- Las paginas juntas recorren todos los datos sin repetir ni saltear
- Acepta los tamanios permitidos
- Rechaza los tamanios no permitidos
- Rechaza una pagina menor a 1
- Rechaza una pagina tan grande que desborda

### PersistenciaTests.cs

_Mapeo del modelo: relaciones y valores por defecto (base en memoria)_ (2)

- Guarda un turno con cliente servicio y usuario
- Un usuario nuevo nace activo

### ServicioServiceTests.cs

_Lógica de servicios: alta, edición, baja, duración_ (10)

- Crear y obtener devuelve los mismos datos
- Crear con nombre existente lanza ReglaNegocio
- Modificar a nombre de otro servicio lanza ReglaNegocio
- Modificar conservando su propio nombre cambia la duracion
- Listar no incluye inactivos por defecto y ordena por nombre
- Listar pagina los resultados ordenados y devuelve el total
- Listar con pagina cero lanza Validacion
- Modificar con Activo true reactiva un servicio inactivo
- Desactivar mantiene la fila con Activo false
- Obtener inexistente lanza NoEncontrado

### TurnoServiceTests.cs

_Lógica de turnos: superposición, estados, pasado, agenda_ (37)

- Crear calcula FechaHoraFin con la duracion del servicio
- Crear deja Estado Pendiente y registra el usuario
- Crear que se cruza con otro lanza ReglaNegocio
- Crear contiguo despues no se considera superposicion
- Crear contiguo antes no se considera superposicion
- Crear que contiene a otro lanza ReglaNegocio
- Crear sobre un turno Cancelado es valido
- Crear sobre un turno Atendido lanza ReglaNegocio
- Crear con cliente inactivo lanza ReglaNegocio
- Crear con servicio inactivo lanza ReglaNegocio
- Crear con cliente inexistente lanza NoEncontrado
- Crear con servicio inexistente lanza NoEncontrado
- Crear con inicio en el pasado lanza Validacion
- Crear justo a la hora actual es valido
- Modificar sin cambiar horario no choca consigo mismo
- Modificar a un horario ocupado por otro lanza ReglaNegocio
- Modificar a un horario libre cambia inicio y fin
- Modificar sin cambiar inicio de un turno de hoy ya pasado no lanza Validacion
- Modificar moviendo el turno al pasado lanza Validacion
- Modificar conservando un cliente que luego se desactivo no lanza
- Modificar cambiando a un cliente inactivo lanza ReglaNegocio
- Modificar inexistente lanza NoEncontrado
- Cambiar la duracion del servicio no altera FechaHoraFin de turnos existentes
- Modificar solo las observaciones no recalcula FechaHoraFin
- Modificar el horario usa la duracion actual del servicio
- Cancelar pasa a Cancelado
- MarcarAtendido pasa a Atendido
- Cancelar un Atendido lanza ReglaNegocio
- MarcarAtendido un Cancelado lanza ReglaNegocio
- Cancelar dos veces lanza ReglaNegocio
- Modificar un turno Cancelado o Atendido lanza ReglaNegocio
- Cancelar o marcar atendido un turno inexistente lanza NoEncontrado
- Agenda devuelve solo turnos del rango ordenados por inicio
- Agenda incluye cancelados y el limite superior queda afuera
- Agenda con hasta menor o igual a desde lanza Validacion
- Agenda de mas de 31 dias lanza Validacion y de 31 dias no
- HaySuperposicion excluye el turno indicado

### TurnosHttpTests.cs

_Endpoints de turnos (por HTTP)_ (8)

- Sin token responde 401
- Crear valido responde 201 con Location
- Crear superpuesto responde 409 y al cancelar el primero se puede
- Crear en el pasado responde 400
- Crear con cliente inexistente responde 404
- Crear con ids en cero responde 400
- Agenda lista los turnos del dia y sin parametros responde 400
- Modificar cancelar y marcar atendido funcionan y los estados se validan

### UsuarioServiceTests.cs

_Lógica de usuarios: alta, edición, roles, contraseñas_ (16)

- Crear guarda hash y nunca la contrasena en texto plano
- Crear con NombreUsuario existente lanza ReglaNegocio
- Listar devuelve todos ordenados por nombre de usuario
- Listar pagina los resultados ordenados y devuelve el total
- Listar con tamanio no permitido lanza Validacion
- Obtener inexistente lanza NoEncontrado
- Modificar cambia nombre y rol
- Modificar con Activo true reactiva un usuario inactivo
- Desactivar pone Activo false y no borra la fila
- Desactivar un admin cuando hay otro admin activo funciona
- Desactivar al ultimo admin activo lanza ReglaNegocio
- Desactivarse a si mismo lanza ReglaNegocio
- Modificar bajando de Admin a Operador al ultimo admin lanza ReglaNegocio
- Modificar desactivandose a si mismo lanza ReglaNegocio
- ResetearPassword permite login con la nueva clave
- ResetearPassword de usuario inexistente lanza NoEncontrado

### UsuariosHttpTests.cs

_Endpoints de usuarios y permisos por rol (por HTTP)_ (9)

- Operador recibe 403 en GET usuarios
- Sin token recibe 401 en GET usuarios
- Admin recibe 200 en GET usuarios
- Crear valido responde 201 y el rol viaja como texto
- Crear con nombre duplicado responde 409
- Crear con rol invalido responde 400
- Desactivarse a si mismo responde 409
- Listado devuelve items total pagina y tamanio
- Listado con parametros de paginacion invalidos responde 400

## Frontend (Vitest)

### app.spec.ts

_Componente raíz_ (1)

- Se crea correctamente

### auth.guard.spec.ts

_Guardas de rutas (sesión y rol)_ (4)

- AuthGuard redirige a login sin sesion
- AuthGuard permite el paso con sesion
- AdminGuard redirige a agenda si es Operador
- AdminGuard permite el paso a un Admin

### auth.interceptor.spec.ts

_Envío del token y cierre de sesión ante un 401_ (6)

- Adjunta Bearer cuando hay token
- No adjunta Authorization sin token
- No adjunta el token a otros servidores
- Hace logout y va al login ante 401 fuera del login
- No hace logout ante 401 en el login
- No hace logout ante otros errores

### auth.service.spec.ts

_Sesión: login, logout, persistencia y cambio de contraseña_ (8)

- Login guarda la sesion y estaAutenticado es true
- Login fallido no guarda sesion
- Logout borra la sesion
- EsAdmin es true solo para rol Admin
- Sesion vencida en localStorage se descarta al iniciar
- Sesion vigente en localStorage se restaura al iniciar
- Sesion guardada con formato invalido se ignora
- CambiarPassword envia POST con las dos claves

### agenda.spec.ts

_Pantalla de agenda: vistas día y semana, navegación y acciones_ (29)

- Al iniciar pide la agenda de hoy
- Muestra la fecha en castellano
- Muestra cada turno con horario cliente servicio y estado
- Cada estado tiene su etiqueta de color
- Los turnos cancelados se ven atenuados
- Solo los turnos pendientes tienen acciones
- Un dia sin turnos lo avisa
- Siguiente y anterior mueven un dia
- Hoy vuelve al dia actual
- IrAFecha elige un dia y cruza el fin de mes
- Una fecha vacia se ignora
- Si falla la carga avisa y la navegacion sigue funcionando
- Pide de lunes al lunes siguiente
- Muestra los siete dias y el rango de la semana
- Reparte los turnos en su dia y marca los dias sin turnos
- Siguiente y anterior mueven una semana
- Al volver a la vista del dia muestra el dia elegido
- Nuevo abre el formulario sugiriendo la proxima hora redonda de hoy
- Nuevo en otro dia sugiere las 9 de ese dia
- Si se guardo avisa y recarga
- Si se cancela el formulario no recarga
- Editar abre el formulario con el turno
- Cancelar pide confirmacion con el cliente y la hora
- Si se confirma cancela avisa y recarga
- Si se vuelve atras no cancela
- Marcar atendido pide confirmacion y si se confirma lo marca y recarga
- Si no se confirma no lo marca
- Muestra el mensaje de la API si la operacion falla y no recarga
- Nuevo hoy a media tarde sugiere la proxima hora redonda

### turno-form.spec.ts

_Formulario de turno: validaciones, buscador de cliente, hora de fin_ (21)

- Titulo y fecha inicial sugerida
- Carga solo los servicios activos con su duracion
- Al abrir sugiere los primeros 10 clientes activos
- Al escribir busca clientes por el texto
- Al elegir un cliente no vuelve a buscar
- No envia si falta %s
- No envia si el cliente es solo texto escrito sin elegir de la lista
- No envia observaciones de mas de 500 caracteres
- Crea con los datos la fecha con segundos y cierra con true
- Recorta las observaciones
- Si el horario esta ocupado muestra el mensaje de la API y no cierra
- Si el turno empieza en el pasado muestra el mensaje de la API
- Despues de un error se puede corregir y volver a guardar
- Se calcula con la duracion del servicio
- Se muestra en pantalla
- No hay hora de fin %s
- Precarga los datos del turno
- No busca clientes al abrir porque ya hay uno elegido
- Guarda con modificar y cierra con true
- Si el servicio del turno ya no esta activo se conserva como opcion
- Muestra el error de la API al modificar

### turnos.service.spec.ts

_Servicio HTTP de turnos_ (5)

- Agenda pide GET con desde y hasta
- Crear envia POST con los datos y la fecha sin zona horaria
- Modificar envia PUT al id
- Cancelar envia POST a cancelar
- MarcarAtendido envia POST a atendido

### cliente-form.spec.ts

_Formulario de cliente_ (7)

- Titulo de alta y de edicion
- No envia si falta %s
- No envia si el email es invalido
- Crea con email null si se deja vacio y cierra con true
- Crea con el email cuando se completa
- Edicion precarga los datos y conserva el estado activo
- Muestra el error de la API y no cierra

### clientes.service.spec.ts

_Servicio HTTP de clientes_ (6)

- Listar sin filtros pide la primera pagina de 5 y nada mas
- Listar envia texto incluirInactivos pagina y tamanio
- Listar ignora un texto en blanco
- Crear envia POST con los datos
- Modificar envia PUT al id
- Desactivar envia DELETE al id

### clientes.spec.ts

_Pantalla de clientes: listado, búsqueda, paginado, alta, edición y baja_ (21)

- Carga los clientes activos por defecto
- Muestra apellido y nombre telefono y email
- Los activos ofrecen desactivar y los inactivos reactivar
- Buscar recarga con el texto
- Mostrar inactivos recarga incluyendolos
- Buscar y mostrar inactivos se combinan
- Cambiar de pagina o de tamanio recarga manteniendo los filtros
- Buscar vuelve a la primera pagina pero conserva el tamanio
- Mostrar inactivos vuelve a la primera pagina
- La grilla muestra el total que informa la API
- Si la pagina queda vacia pide la ultima que tiene datos
- Avisa si no hay clientes
- Nuevo abre el formulario sin datos y recarga si se guardo
- Si se cancela el formulario no recarga
- Editar abre el formulario con el cliente
- Desactivar pide confirmacion con el nombre y si se confirma desactiva
- Desactivar cancelado no llama al servicio
- Reactivar modifica con activo true conservando los datos
- Muestra el mensaje de la API si falla una operacion
- Muestra el mensaje si falla la carga
- Despues de un error de carga la busqueda sigue funcionando

### login.spec.ts

_Pantalla de login_ (5)

- Muestra el logo a color
- No envia si el formulario es invalido
- Login correcto navega a agenda
- Login con 401 muestra usuario o contrasena incorrectos
- Login sin conexion muestra que no se pudo conectar

### servicio-form.spec.ts

_Formulario de servicio_ (6)

- Titulo de alta y duracion por defecto de 30 minutos
- No envia sin nombre
- No envia con duracion %s
- Envia con duracion en el limite %i
- Edicion precarga los datos y conserva el estado activo
- Muestra el error de la API y no cierra

### servicios.service.spec.ts

_Servicio HTTP de servicios_ (5)

- Listar sin filtros pide la primera pagina de 5 y nada mas
- Listar envia incluirInactivos pagina y tamanio
- Crear envia POST con los datos
- Modificar envia PUT al id
- Desactivar envia DELETE al id

### servicios.spec.ts

_Pantalla de servicios: listado, paginado, alta, edición y baja_ (17)

- Carga solo los servicios activos por defecto
- Muestra el nombre y la duracion en minutos
- Los activos ofrecen desactivar y los inactivos reactivar
- Mostrar inactivos recarga incluyendolos
- Cambiar de pagina o de tamanio recarga manteniendo el filtro
- Mostrar inactivos vuelve a la primera pagina pero conserva el tamanio
- La grilla muestra el total que informa la API
- Si la pagina queda vacia pide la ultima que tiene datos
- Avisa si no hay servicios
- Nuevo abre el formulario sin datos y recarga si se guardo
- Si se cancela el formulario no recarga
- Editar abre el formulario con el servicio
- Desactivar pide confirmacion y si se confirma desactiva y recarga
- Desactivar cancelado no llama al servicio
- Reactivar modifica con activo true conservando los datos
- Muestra el mensaje de la API si falla una operacion
- Muestra el mensaje si falla la carga

### resetear-password-dialog.spec.ts

_Diálogo para restablecer la contraseña de un usuario_ (5)

- Indica a que usuario se le cambia la clave
- No envia si la clave tiene menos de 8 caracteres
- Al enviar el formulario desde la pantalla se restablece la clave
- Envia la clave nueva y cierra con true
- Muestra el error de la API y no cierra

### usuario-form.spec.ts

_Formulario de usuario_ (8)

- Titulo y rol por defecto
- No envia si faltan datos
- No envia si la clave tiene menos de 8 caracteres
- Crea con los datos y cierra con true
- Muestra el error de la API y no cierra
- Precarga los datos y no deja cambiar usuario ni clave
- Modifica y conserva el estado activo
- Muestra el error de la API al modificar

### usuarios.service.spec.ts

_Servicio HTTP de usuarios_ (6)

- Listar pide la pagina y el tamanio
- Listar sin argumentos pide la primera pagina de 5
- Crear envia POST con los datos
- Modificar envia PUT al id
- Desactivar envia DELETE al id
- ResetearPassword envia POST con la clave nueva

### usuarios.spec.ts

_Pantalla de usuarios: listado, paginado, alta, edición, baja y restablecer clave_ (17)

- Carga y muestra los usuarios
- Los activos ofrecen desactivar y los inactivos reactivar
- Carga la primera pagina de 5
- La grilla muestra el total que informa la API
- Cambiar de pagina recarga con la pagina pedida
- Cambiar el tamanio recarga con el tamanio pedido
- Si la pagina queda vacia pide la ultima que tiene datos
- Avisa si no hay usuarios
- Nuevo abre el formulario sin datos y recarga si se guardo
- Si se cancela el formulario no recarga
- Editar abre el formulario con el usuario
- Restablecer password abre el dialogo y avisa al terminar
- Desactivar pide confirmacion y si se confirma desactiva y recarga
- Desactivar cancelado no llama al servicio
- Reactivar modifica con activo true sin pedir confirmacion
- Muestra el mensaje de la API si no se puede desactivar
- Muestra el mensaje si falla la carga

### layout.spec.ts

_Estructura de la aplicación: menú por rol, perfil y cierre de sesión_ (11)

- El Admin ve los cuatro enlaces
- El Operador no ve el enlace Usuarios
- Muestra el logo blanco a la izquierda y lleva a la agenda
- La barra tiene solo los botones de perfil y cerrar sesion
- La barra ya no muestra el nombre del usuario
- El icono de usuario abre el perfil
- El icono de logout abre la confirmacion
- Al salir de la pantalla cierra los dialogos abiertos
- Logout pide confirmacion antes de cerrar la sesion
- Logout cancelado no cierra la sesion
- Logout confirmado cierra la sesion y vuelve al login

### perfil-dialog.spec.ts

_Diálogo "Mi perfil" y cambio de contraseña_ (9)

- Muestra nombre usuario y rol del usuario
- Muestra Operador como rol de un operador
- El formulario de clave esta oculto hasta pedir el cambio
- Cancelar el cambio oculta el formulario y lo limpia
- No envia si la confirmacion no coincide
- Muestra un mensaje si la confirmacion no coincide
- No envia si la clave nueva tiene menos de 8 caracteres
- Envia las claves y cierra el dialogo
- Muestra el detalle del error de la API

### confirmar-dialog.spec.ts

_Diálogo de confirmación reutilizable_ (4)

- Muestra el titulo y el mensaje
- El boton de confirmar dice Confirmar por defecto
- El boton de confirmar usa el texto indicado
- El boton de cancelar usa el texto indicado

### errores.spec.ts

_Conversión de errores de la API a mensajes_ (5)

- Usa el detail que manda la API
- Usa el title si no hay detail
- Avisa si no hay conexion
- En errores de validacion pide revisar los datos
- Da un mensaje generico si no hay nada mas

### fechas.spec.ts

_Utilidades de fechas (formatos, semanas, rangos)_ (14)

- AFecha da AAAA MM DD
- AEntradaLocal da el formato de datetime local
- ATextoLocal agrega los segundos
- Completa con ceros los numeros de un digito
- DesdeFecha lee el dia en hora local sin correrse por la zona horaria
- DesdeEntradaLocal lee %s
- Hora extrae HH mm de un texto de la API
- SumarDias cruza el fin de mes y deja la hora en cero
- SumarDias acepta negativos
- EsMismoDia ignora la hora
- FormatoDia arranca con mayuscula
- FormatoDiaCorto no lleva el anio
- FormatoSemana va del lunes al domingo
- FormatoSemana cruza de mes

### grilla.spec.ts

_Grilla compartida: columnas, estados, acciones y paginador_ (15)

- Muestra las columnas de datos mas estado y acciones
- Muestra una fila por dato con el valor de cada columna
- Muestra el estado como etiqueta activo o inactivo
- Las filas inactivas llevan la clase inactiva
- Dibuja las acciones de cada fila con esa fila como contexto
- Sin plantilla de acciones no hay columna de acciones
- Sin filas muestra el mensaje y conserva el encabezado
- Con filas no muestra el mensaje de vacio
- El paginador esta arriba de la tabla
- Ofrece 5 10 30 50 y 100 filas por pagina con 5 por defecto
- Muestra el total la pagina y el tamanio que recibe
- Al cambiar de pagina emite la pagina contando desde 1 y el tamanio
- Al cambiar el tamanio vuelve a la primera pagina
- Los textos del paginador estan en castellano
- El paginador se muestra tambien sin datos

### paginado.spec.ts

_Estado del paginado (página, tamaño, total)_ (6)

- Empieza en la pagina 1 con 5 por pagina y sin total
- Cambiar actualiza la pagina y el tamanio
- VolverALaPrimera deja el tamanio como estaba
- Actualizar guarda el total y no pide recargar si la pagina tiene datos
- Si la pagina quedo vacia pasa a la ultima que tiene datos y pide recargar
- Una primera pagina vacia no pide recargar

### paginador-es.spec.ts

_Textos del paginador en castellano_ (2)

- Los textos estan en castellano
- El rango de la pagina %i con tamanio %i y total %i dice %s
