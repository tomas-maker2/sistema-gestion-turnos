# Resultados de las pruebas de punta a punta

Ejecución del 2026-11-23 11:19 contra el frontend `http://localhost:4200` y la API `http://localhost:5080/api`, en un navegador Chrome real.

**Resultado: 56 de 56 casos correctos.**

Este archivo lo genera `docs/pruebas/e2e/ejecutar-e2e.js`. Cómo se ejecutan y qué recorre cada grupo está en [documentacion-de-pruebas.md](documentacion-de-pruebas.md).

## Autenticación y sesión

| Caso | Descripción | Resultado |
|---|---|---|
| AUT-01 | Sin sesión, entrar a la raíz redirige al login | ✅ Correcto |
| AUT-02 | Sin sesión, entrar a una pantalla protegida (/usuarios) redirige al login | ✅ Correcto |
| AUT-03 | Login con los campos vacíos muestra los mensajes de validación | ✅ Correcto |
| AUT-04 | Login con contraseña incorrecta muestra el mensaje y no deja entrar | ✅ Correcto |
| AUT-05 | El administrador entra a la agenda y ve los cuatro menús | ✅ Correcto |
| AUT-06 | El operador ve solo tres menús y no puede entrar a /usuarios por la dirección | ✅ Correcto |
| AUT-07 | Recargar la página conserva la sesión | ✅ Correcto |
| AUT-08 | Con un token inválido la API responde 401 y la aplicación vuelve al login | ✅ Correcto |
| AUT-09 | El logout pide confirmación y, si se cancela, la sesión sigue | ✅ Correcto |
| AUT-10 | Confirmar el logout cierra la sesión y vuelve al login | ✅ Correcto |

## Perfil y cambio de contraseña

| Caso | Descripción | Resultado |
|---|---|---|
| PER-01 | El modal "Mi perfil" muestra nombre, usuario y rol | ✅ Correcto |
| PER-02 | Cambiar la contraseña con una confirmación distinta muestra un mensaje | ✅ Correcto |
| PER-03 | Con la contraseña actual equivocada se muestra el error y no se cierra la sesión | ✅ Correcto |
| PER-04 | Con los datos correctos la contraseña cambia: sirve la nueva y no la vieja | ✅ Correcto |

## Usuarios (solo administrador)

| Caso | Descripción | Resultado |
|---|---|---|
| USU-01 | El listado muestra a los usuarios con su rol y su estado | ✅ Correcto |
| USU-02 | El alta con una contraseña de menos de 8 caracteres muestra un mensaje | ✅ Correcto |
| USU-03 | El alta correcta agrega al usuario al listado y avisa | ✅ Correcto |
| USU-04 | No permite repetir un nombre de usuario (aunque cambien las mayúsculas) | ✅ Correcto |
| USU-05 | Al editar no se cambia el usuario ni se pide la clave; sí el nombre y el rol | ✅ Correcto |
| USU-06 | Restablecer la contraseña de otro usuario: sirve la nueva y no la vieja | ✅ Correcto |
| USU-07 | Desactivar impide el ingreso y reactivar lo devuelve | ✅ Correcto |
| USU-08 | Un administrador no puede desactivar su propio usuario | ✅ Correcto |

## Clientes

| Caso | Descripción | Resultado |
|---|---|---|
| CLI-01 | La búsqueda por texto filtra los clientes | ✅ Correcto |
| CLI-02 | Una búsqueda sin resultados muestra el mensaje "No hay clientes." | ✅ Correcto |
| CLI-03 | El alta valida los campos obligatorios y el formato del email | ✅ Correcto |
| CLI-04 | El alta correcta (con el email vacío) agrega al cliente y avisa | ✅ Correcto |
| CLI-05 | La edición precarga los datos y guarda los cambios | ✅ Correcto |
| CLI-06 | Desactivar pide confirmación (se puede cancelar) y oculta al cliente | ✅ Correcto |
| CLI-07 | Reactivar vuelve a dejar al cliente activo | ✅ Correcto |

## Servicios

| Caso | Descripción | Resultado |
|---|---|---|
| SER-01 | El listado muestra cada servicio con su duración en minutos | ✅ Correcto |
| SER-02 | No permite repetir el nombre de un servicio (aunque cambien las mayúsculas) | ✅ Correcto |
| SER-03 | La duración tiene que estar entre 5 y 480 minutos | ✅ Correcto |
| SER-04 | El alta correcta y la edición de la duración se reflejan en el listado | ✅ Correcto |
| SER-05 | Desactivar oculta al servicio, "Mostrar inactivos" lo muestra y reactivar lo devuelve | ✅ Correcto |

## Paginado de las grillas

| Caso | Descripción | Resultado |
|---|---|---|
| PAG-01 | Por defecto muestra 5 filas por página y el contador "1 – 5 de N" | ✅ Correcto |
| PAG-02 | Las opciones de filas por página son 5, 10, 30, 50 y 100 | ✅ Correcto |
| PAG-03 | Se navega con primera, anterior, siguiente y última página | ✅ Correcto |
| PAG-04 | Cambiar a 10 filas por página muestra más filas y vuelve a la primera página | ✅ Correcto |
| PAG-05 | El paginador queda arriba y a la izquierda de la grilla | ✅ Correcto |
| PAG-06 | La API recibe la página y el tamaño pedidos (paginado en el backend) | ✅ Correcto |
| PAG-07 | Buscar estando en otra página vuelve a la primera | ✅ Correcto |
| PAG-08 | Si se da de baja lo único que tenía la última página, la pantalla vuelve a la anterior | ✅ Correcto |

## Agenda y turnos

| Caso | Descripción | Resultado |
|---|---|---|
| AGE-01 | La agenda de hoy muestra la fecha en castellano y los turnos de ejemplo | ✅ Correcto |
| AGE-02 | Cada turno muestra su estado; solo los pendientes tienen botones y los cancelados se atenúan | ✅ Correcto |
| AGE-03 | Se navega por día con anterior, siguiente, "Hoy" y el selector de fecha | ✅ Correcto |
| AGE-04 | La vista semanal muestra los siete días con los turnos de cada uno | ✅ Correcto |
| AGE-05 | El alta de un turno valida cliente y servicio, y el cliente tiene que elegirse de la lista | ✅ Correcto |
| AGE-06 | El buscador de clientes sugiere a los que coinciden con lo escrito | ✅ Correcto |
| AGE-07 | El alta correcta muestra la hora de fin estimada, guarda y ordena por hora | ✅ Correcto |
| AGE-08 | No permite un turno que se superponga con otro (por dentro ni por el inicio) | ✅ Correcto |
| AGE-09 | No permite un turno que empiece en el pasado | ✅ Correcto |
| AGE-10 | Un turno contiguo (empieza cuando otro termina) sí se permite | ✅ Correcto |
| AGE-11 | Editar un turno precarga sus datos y, al cambiar la hora, reordena la agenda | ✅ Correcto |
| AGE-12 | Marcar como atendido pide confirmación y deja al turno sin botones | ✅ Correcto |
| AGE-13 | Cancelar un turno lo deja cancelado y libera el horario para otro | ✅ Correcto |
| AGE-14 | En la vista semanal los turnos aparecen en su día | ✅ Correcto |
