# Documentación de pruebas – Sistema de gestión de turnos

Cómo se prueba el sistema, qué cubre cada tipo de prueba, cómo ejecutarlas y qué resultados dieron. Las reglas que se prueban están en la [documentación funcional](../documentacion-funcional.md).

## 1. Resumen de resultados

| Nivel | Herramienta | Pruebas ejecutadas | Resultado | Cobertura |
|---|---|---|---|---|
| Backend (servicios, endpoints) | xUnit | **163** | ✅ todas correctas | 95,7 % de líneas, 93,4 % de ramas |
| Frontend (componentes, servicios) | Vitest (`ng test`) | **262** en 26 archivos | ✅ todas correctas | 98,73 % de líneas, 94,53 % de sentencias, 97,98 % de ramas, 85,32 % de funciones |
| Punta a punta (navegador real) | Puppeteer + Chrome | **56** casos | ✅ 56 de 56 correctos | — |

Resultado detallado de punta a punta, caso por caso: [resultados-e2e.md](resultados-e2e.md). Listado de todas las pruebas automáticas: [catalogo-de-pruebas.md](catalogo-de-pruebas.md).

## 2. Estrategia

Se prueba en tres niveles, de lo más chico y rápido a lo más parecido al uso real:

| Nivel | Qué prueba | Qué detecta |
|---|---|---|
| **1. Unitarias** | Una pieza aislada: un servicio del backend, un componente o servicio del frontend | Errores en una regla de negocio o en el comportamiento de una pantalla |
| **2. Integración (backend)** | La API completa por HTTP: rutas, autenticación, roles, validaciones y formato de las respuestas | Que las piezas, bien probadas por separado, también funcionen juntas |
| **3. Punta a punta** | Un navegador real usando la aplicación contra la API y SQL Server | Que lo que ve y hace una persona funcione de verdad, incluida la base de datos |

Criterios generales:

- **Las reglas de negocio se prueban en los servicios del backend**, donde viven (superposición de turnos, estados, baja lógica, roles, contraseñas, paginado). Cada regla tiene su caso feliz y sus casos de error.
- **Se prueban los límites**: un turno contiguo (que no se superpone) frente a uno que se cruza; la duración de un servicio en el límite y fuera de rango; la última página incompleta y una página fuera de rango; una agenda de 31 días frente a una de más.
- **Se prueba lo que no se debe poder hacer**: acceso sin sesión, operador en pantallas de administrador, usuario inactivo, desactivarse a uno mismo, dejar el sistema sin administradores.
- **El reloj es controlable**: la regla "no empezar en el pasado" se prueba con un reloj falso (`FakeTimeProvider`), así las pruebas dan el mismo resultado cualquier día.

## 3. Pruebas del backend (xUnit)

Proyecto: `backend/GestionTurnos.Tests`.

| Tipo | Archivos | Cómo funciona |
|---|---|---|
| Servicios (reglas de negocio) | `AuthServiceTests`, `UsuarioServiceTests`, `ClienteServiceTests`, `ServicioServiceTests`, `TurnoServiceTests`, `PaginacionTests` | Cada servicio se prueba directamente, con una base de datos **en memoria** nueva por prueba, para que ninguna dependa de otra |
| API por HTTP | `AuthHttpTests`, `UsuariosHttpTests`, `ClientesServiciosHttpTests`, `TurnosHttpTests`, `ApiArranqueTests` | `ApiFactory` levanta la API completa en memoria (con `WebApplicationFactory`) y se la consulta con un cliente HTTP, con o sin token y con cada rol |
| Errores | `ErroresTests` | Verifica que cada tipo de excepción se traduzca al código correcto: 400, 401, 404 y 409 |
| Modelo | `PersistenciaTests` | Verifica relaciones y valores por defecto de las entidades |

El archivo con más casos es `TurnoServiceTests` (37 métodos), porque concentra la regla más delicada del sistema: la superposición de turnos. Entre otros, cubre:

- turno que se cruza con otro y turno que contiene a otro (rechazados);
- turnos contiguos, antes y después de otro (permitidos);
- turno sobre uno cancelado (permitido) y sobre uno atendido (rechazado);
- modificar un turno sin chocar consigo mismo;
- cálculo y persistencia de la hora de fin, y que un cambio posterior en la duración del servicio no altere turnos existentes;
- rechazo de cliente o servicio inactivos;
- turno en el pasado y turno justo a la hora actual (permitido), con reloj controlado;
- transiciones de estado: solo un turno pendiente se modifica, atiende o cancela;
- agenda por rango, incluido el límite de 31 días.

### Cómo ejecutarlas

Desde la raíz del repositorio (**con la API detenida**: si está corriendo bloquea los archivos y la compilación falla):

```powershell
dotnet test backend/GestionTurnos.Tests
```

Con informe de cobertura:

```powershell
dotnet test backend/GestionTurnos.Tests --collect:"XPlat Code Coverage"
```

El informe queda en `backend/GestionTurnos.Tests/TestResults/<id>/coverage.cobertura.xml`.

### Límite conocido

Las pruebas del backend usan una base **en memoria**, que no aplica las restricciones propias de SQL Server (`UNIQUE`, `CHECK`, claves foráneas). Esas restricciones están definidas en `database/GestionTurnos.Database/Tables/` y se comprobaron contra un SQL Server real durante el diseño (ver [diseño de la base de datos](../diseno/base-de-datos.md#validación)) y de forma indirecta en las pruebas de punta a punta, que corren contra SQL Server.

## 4. Pruebas del frontend (Vitest)

Se ejecutan con `ng test`, que usa Vitest sobre un navegador simulado (jsdom). Hay un archivo `.spec.ts` junto a cada componente, servicio o utilidad.

| Tipo | Ejemplos | Qué verifica |
|---|---|---|
| Servicios HTTP | `clientes.service.spec.ts`, `turnos.service.spec.ts` | Que cada operación pida la URL correcta, con el método, los parámetros de paginado y el cuerpo esperados (con `HttpTestingController`, sin red real) |
| Pantallas | `agenda.spec.ts`, `clientes.spec.ts`, `servicios.spec.ts`, `usuarios.spec.ts` | Lo que se ve y lo que pasa al pulsar: listado, búsqueda, paginado, abrir formularios, confirmar bajas, avisos de resultado y de error |
| Formularios | `turno-form.spec.ts`, `cliente-form.spec.ts`, `servicio-form.spec.ts`, `usuario-form.spec.ts` | Validaciones y mensajes bajo cada campo, errores que devuelve la API dentro del diálogo, buscador de cliente, hora de fin estimada |
| Sesión y seguridad | `auth.service.spec.ts`, `auth.guard.spec.ts`, `auth.interceptor.spec.ts`, `login.spec.ts`, `layout.spec.ts` | Login, persistencia de sesión, token solo hacia la API, cierre de sesión ante un 401, menú según rol, rutas protegidas |
| Componentes compartidos | `grilla.spec.ts`, `paginado.spec.ts`, `paginador-es.spec.ts`, `confirmar-dialog.spec.ts` | La grilla única usada por las tres pantallas de gestión, el estado del paginado y el diálogo de confirmación |
| Utilidades | `fechas.spec.ts`, `errores.spec.ts` | Formatos de fecha en castellano, semanas y rangos; conversión de errores de la API en mensajes |

### Cómo ejecutarlas

```powershell
cd frontend
npm install
npx ng test --no-watch
```

Con informe de cobertura (la herramienta de cobertura no está en las dependencias del proyecto; se instala sin modificar `package.json`):

```powershell
npm install --no-save @vitest/coverage-v8
npx ng test --no-watch --coverage
```

El informe queda en `frontend/coverage/`.

## 5. Pruebas de punta a punta (navegador real)

Carpeta: `docs/pruebas/e2e/`. Un script de Node (`ejecutar-e2e.js`) abre Chrome con **Puppeteer**, usa el sistema como lo haría una persona (escribe, pulsa, elige opciones, confirma diálogos) y comprueba lo que se ve en pantalla. En los casos que lo requieren, además consulta la API directamente para comprobar el efecto real (por ejemplo, que la contraseña vieja ya no sirva).

Al terminar escribe [resultados-e2e.md](resultados-e2e.md).

### Cómo prepararlas y ejecutarlas

Necesitan el sistema completo andando (base de datos, API y frontend; ver la [guía de instalación](../guia-de-instalacion-y-uso.md)) y Google Chrome instalado.

> ⚠️ **Estas pruebas crean y modifican datos.** Usarlas solo con una base de **pruebas**, recién cargada con `database/datos-de-ejemplo.sql`. Los datos que crean llevan el prefijo "E2E" y se dejan dados de baja al terminar.

```powershell
cd docs/pruebas/e2e
npm install
npm run e2e
```

Variables opcionales: `WEB_URL` (por defecto `http://localhost:4200`), `API_URL` (`http://localhost:5080/api`) y `CHROME_PATH` (la ruta habitual de Chrome en Windows). El proceso termina con código 0 si todos los casos pasan y 1 si alguno falla.

Cada caso empieza desde cero (recarga la página o vuelve a iniciar sesión) para que un fallo no arrastre a los siguientes. Las fechas de los turnos de prueba se eligen en un día futuro distinto en cada ejecución, de modo que se puede ejecutar varias veces sin limpiar la base.

### Casos (56)

| Grupo | Casos | Qué recorre |
|---|---|---|
| Autenticación y sesión | AUT-01 a AUT-10 (10) | Redirecciones sin sesión, validación y error del login, menús por rol, protección de `/usuarios`, sesión que sobrevive a recargar, token inválido, cierre de sesión con y sin confirmación |
| Perfil y cambio de contraseña | PER-01 a PER-04 (4) | Datos del perfil, confirmación distinta, contraseña actual equivocada, cambio correcto (sirve la nueva, no la vieja) |
| Usuarios | USU-01 a USU-08 (8) | Listado, validación de la contraseña, alta, nombre repetido, edición, restablecer contraseña, baja y reactivación, imposibilidad de desactivarse a uno mismo |
| Clientes | CLI-01 a CLI-07 (7) | Búsqueda, búsqueda sin resultados, validaciones, alta, edición, baja con y sin confirmación, "Mostrar inactivos", reactivación |
| Servicios | SER-01 a SER-05 (5) | Listado con duración, nombre repetido, rango de duración, alta y edición, baja y reactivación |
| Paginado | PAG-01 a PAG-08 (8) | 5 filas por defecto, opciones 5/10/30/50/100, navegación, cambio de tamaño, posición del paginador, paginado hecho por la API, búsqueda que vuelve a la página 1, última página que queda vacía |
| Agenda y turnos | AGE-01 a AGE-14 (14) | Agenda del día y de la semana, navegación, validaciones del formulario, buscador de clientes, alta, superposición (por dentro y por el borde), turno en el pasado, turno contiguo, edición, atender, cancelar y reutilizar el horario liberado |

La descripción completa de cada caso (identificador, qué se comprueba y resultado) está en [resultados-e2e.md](resultados-e2e.md).

### Qué falló durante el desarrollo de estas pruebas

En la primera ejecución completa, 55 de 56 casos pasaron. El caso que falló (PAG-08, última página que queda vacía) fue un problema **de la prueba, no de la aplicación**: leía las filas de la pantalla en el instante en que el paginador ya mostraba la página nueva pero todavía no habían llegado los datos de esa consulta. Se corrigió haciendo que la prueba espere a que lleguen las filas. Al repetir la verificación sobre una copia limpia del repositorio apareció una segunda variante del mismo problema de sincronización, que también se corrigió.

Después de las correcciones, los 56 casos pasaron en tres ejecuciones seguidas sobre una copia limpia del repositorio, con una base creada desde cero siguiendo la [guía de instalación](../guia-de-instalacion-y-uso.md). En esa misma copia limpia las pruebas del backend (163) y del frontend (262) también pasaron.

## 6. Datos de prueba

`database/datos-de-ejemplo.sql` carga un conjunto fijo y repetible, útil tanto para probar a mano como para las pruebas de punta a punta:

| Dato | Cantidad | Detalle |
|---|---|---|
| Usuarios | 2 | `admin` / `Admin1234!` (administrador) y `operador` / `Operador1234!` (operador) |
| Clientes | 6 | Suficientes para que el paginado de 5 filas tenga una segunda página |
| Servicios | 5 | Duraciones de 20 a 90 minutos |
| Turnos | 10 | Ayer, hoy, mañana y pasado, relativos al día en que se ejecuta el script. Incluyen turnos atendidos, pendientes y un cancelado que se superpone con uno pendiente |

El script es idempotente: si la tabla de usuarios ya tiene datos, no carga nada.

## 7. Cómo repetir toda la verificación

Con la base de pruebas cargada y la API y el frontend levantados:

```powershell
# 1. Backend (con la API detenida)
dotnet test backend/GestionTurnos.Tests

# 2. Frontend
cd frontend; npx ng test --no-watch; cd ..

# 3. Punta a punta (con la API y el frontend levantados)
cd docs/pruebas/e2e; npm run e2e
```

Si los tres terminan sin fallas, el sistema cumple con lo descrito en la [documentación funcional](../documentacion-funcional.md).
