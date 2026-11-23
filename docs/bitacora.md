# Bitácora de desarrollo – Sistema de gestión de turnos

Registro del trabajo realizado, en orden. Las fechas de la construcción son las de cada commit del repositorio.

## Etapas

| Etapa | Fecha | Qué se hizo | Resultado |
|---|---|---|---|
| **Análisis y elección del proyecto** | Antes del 4/11 | Lectura de los lineamientos y la rúbrica, de la propuesta de trabajo y del ejemplo. Se evaluaron alternativas y se eligió un sistema de gestión de turnos: chico, con reglas de negocio reales y alcanzable en el plazo | Proyecto definido; stack Angular 22, .NET 10 y SQL Server |
| **Propuesta de la práctica** | Antes del 4/11 | Se completó el documento de propuesta con los datos del alumno, las asignaturas relacionadas (Programación 1, 2 y 3, Programación en Base de Datos y Proyecto de Construcción de Software) y el alcance acordado | Propuesta redactada |
| **Modelado y diseño** | Antes del 4/11 | Casos de uso, diagramas de clases, entidad-relación y secuencias; diseño de la base de datos con su diccionario de datos, índices y regla de superposición | [modelado-uml.md](diseno/modelado-uml.md) y [base-de-datos.md](diseno/base-de-datos.md) |
| **Repositorio** | 4/11 | Estructura del repositorio en GitHub, `.gitignore` y documentos de diseño | Repositorio inicial |
| **Base de datos** | 4/11 | Proyecto SQL Server (`.sqlproj`) con las cuatro tablas, para poder compararlo con la base real desde Visual Studio. Se creó la base `GestionTurnos` con datos de prueba | Estructura versionada |
| **Backend: base** | 4/11 | Solución .NET, entidades, contexto de datos (EF Core, base primero) y manejo uniforme de errores como `ProblemDetails` | Esqueleto de la API |
| **Backend: login** | 4/11 | Login con JWT, cambio de contraseña y creación del administrador inicial | Autenticación |
| **Backend: usuarios** | 4/11 | ABM de usuarios con roles y protección del último administrador | Gestión de usuarios |
| **Backend: clientes y servicios** | 4/11 | ABM de clientes y de servicios con baja lógica | Datos maestros |
| **Backend: turnos** | 4/11 | Turnos, agenda por rango y validación de superposición, con las reglas de estado | Núcleo del sistema |
| **Frontend: base** | 4/11 | Proyecto Angular, login, interceptor del token, guardas de rutas, estructura con menú por rol y logo | Entrada al sistema |
| **Frontend: ABM** | 10/11 | Pantallas de usuarios, clientes y servicios sobre una **grilla única compartida**, con estilo moderno y encabezado de color | Gestión completa |
| **Mejora: paginado** | 10/11 | Paginado hecho en el servidor para las tres grillas (5, 10, 30, 50 y 100 filas; 5 por defecto), con el paginador arriba a la izquierda | Listados que escalan |
| **Frontend: agenda** | 10/11 | Agenda por día y por semana, alta y edición de turnos con buscador de clientes, atender y cancelar con confirmación | Funcionalidad completa |
| **Documentación y pruebas finales** | 23/11 | Datos de ejemplo, pruebas de punta a punta con navegador real, medición de cobertura, guía de instalación y uso, documentación funcional y de pruebas | Esta documentación |

## Decisiones técnicas

| Decisión | Motivo |
|---|---|
| **Modelo–Vista–Controlador** en backend y frontend | Separa las reglas de negocio de la pantalla y de la API, y permite probar cada capa por separado |
| **Base primero** con un proyecto `.sqlproj` | La estructura de la base queda versionada junto al código y se puede comparar contra una base real |
| **Baja lógica** en usuarios, clientes y servicios | Los turnos históricos conservan siempre los datos de a quién se atendió y qué se hizo |
| **`FechaHoraFin` guardada** en cada turno | Cambiar la duración de un servicio no altera los turnos ya agendados, y la consulta de superposición no necesita cruzar tablas |
| **Paginado en el backend** (y no en el navegador) | Los listados siguen siendo rápidos con muchos registros. Se evaluó usar OData y se decidió mantener parámetros simples (`pagina` y `tamanio`), más fáciles de entender y de probar |
| **Una sola grilla compartida** | Las tres pantallas de gestión se ven y se comportan igual, y los cambios de estilo se hacen en un solo lugar |
| **Código y comentarios lo más simples posible** | Facilita la lectura, la defensa del trabajo y el mantenimiento |
| **Errores de negocio con 409 y de validación con 400** | El frontend puede mostrar el mensaje exacto que devuelve la API |
| **Angular sin zone.js** (zoneless) y componentes independientes | Menos código y detección de cambios más simple, basada en signals |

## Problemas encontrados y cómo se resolvieron

| Problema | Solución |
|---|---|
| Un diálogo sin `FormGroup` enviaba el formulario por el navegador, recargando la página | Se agregó el `FormGroup` y una prueba que verifica el envío desde el DOM |
| Un email vacío fallaba la validación en lugar de guardarse como "sin email" | La API y el formulario tratan el email vacío como nulo, con pruebas en ambos lados |
| Al dar de baja el único registro de la última página, la grilla quedaba vacía | El estado del paginado detecta la página vacía y pasa a la anterior (RF-26), con pruebas |
| `dotnet test` fallaba si la API estaba corriendo (archivos bloqueados) | Se detiene la API antes de ejecutar las pruebas. Está indicado en la documentación |
| Una prueba de punta a punta leía la pantalla en un instante intermedio (PAG-08) | La prueba espera a que lleguen los datos antes de comprobar |

## Métricas finales

| Qué | Valor |
|---|---|
| Pruebas del backend | 163, todas correctas (95,7 % de líneas) |
| Pruebas del frontend | 262, todas correctas (98,73 % de líneas) |
| Casos de punta a punta | 56 de 56 correctos |

## Herramientas utilizadas

| Categoría | Herramienta | Uso |
|---|---|---|
| Lenguajes y plataformas | C# y .NET 10, TypeScript, SQL (T-SQL) | Backend, frontend y base de datos |
| Backend | ASP.NET Core, Entity Framework Core, autenticación JWT | API REST, acceso a datos y seguridad |
| Frontend | Angular 22, Angular Material, RxJS y signals | Aplicación web |
| Base de datos | SQL Server 2022 y LocalDB, `Microsoft.Build.Sql` (proyecto `.sqlproj`), `sqlcmd`, `sqlpackage` | Almacenamiento, versionado del esquema y carga de datos |
| Pruebas | xUnit, EF Core InMemory, `Microsoft.AspNetCore.Mvc.Testing`, `FakeTimeProvider`, Coverlet; Vitest y jsdom; Puppeteer con Chrome | Pruebas unitarias, de integración y de punta a punta |
| Control de versiones | Git y GitHub | Historial y repositorio público |
| Entornos de trabajo | Visual Studio Code y Visual Studio | Desarrollo y comparación del esquema |
| Modelado | Diagramas UML en Mermaid | Casos de uso, clases, entidad-relación y secuencia |
| Documentación | Markdown | Documentos del repositorio |
