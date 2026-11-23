/*
  Genera docs/pruebas/catalogo-de-pruebas.md leyendo los nombres de las pruebas automáticas del código.
  Uso (desde la raíz del repositorio):  node docs/pruebas/generar-catalogo.js
*/
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..', '..');

// Qué verifica cada archivo de pruebas
const descripciones = {
  'ApiArranqueTests.cs': 'La aplicación arranca y protege las rutas',
  'AuthHttpTests.cs': 'Login y protección de endpoints (por HTTP)',
  'AuthServiceTests.cs': 'Lógica de login y cambio de contraseña',
  'ClienteServiceTests.cs': 'Lógica de clientes: alta, edición, baja, búsqueda',
  'ClientesServiciosHttpTests.cs': 'Endpoints de clientes y servicios (por HTTP)',
  'ErroresTests.cs': 'Traducción de errores a respuestas 400, 401, 404 y 409',
  'PaginacionTests.cs': 'Paginado en el servidor: páginas, totales y tamaños permitidos',
  'PersistenciaTests.cs': 'Mapeo del modelo: relaciones y valores por defecto (base en memoria)',
  'ServicioServiceTests.cs': 'Lógica de servicios: alta, edición, baja, duración',
  'TurnoServiceTests.cs': 'Lógica de turnos: superposición, estados, pasado, agenda',
  'TurnosHttpTests.cs': 'Endpoints de turnos (por HTTP)',
  'UsuarioServiceTests.cs': 'Lógica de usuarios: alta, edición, roles, contraseñas',
  'UsuariosHttpTests.cs': 'Endpoints de usuarios y permisos por rol (por HTTP)',
  'app.spec.ts': 'Componente raíz',
  'auth.guard.spec.ts': 'Guardas de rutas (sesión y rol)',
  'auth.interceptor.spec.ts': 'Envío del token y cierre de sesión ante un 401',
  'auth.service.spec.ts': 'Sesión: login, logout, persistencia y cambio de contraseña',
  'agenda.spec.ts': 'Pantalla de agenda: vistas día y semana, navegación y acciones',
  'turno-form.spec.ts': 'Formulario de turno: validaciones, buscador de cliente, hora de fin',
  'turnos.service.spec.ts': 'Servicio HTTP de turnos',
  'cliente-form.spec.ts': 'Formulario de cliente',
  'clientes.service.spec.ts': 'Servicio HTTP de clientes',
  'clientes.spec.ts': 'Pantalla de clientes: listado, búsqueda, paginado, alta, edición y baja',
  'login.spec.ts': 'Pantalla de login',
  'servicio-form.spec.ts': 'Formulario de servicio',
  'servicios.service.spec.ts': 'Servicio HTTP de servicios',
  'servicios.spec.ts': 'Pantalla de servicios: listado, paginado, alta, edición y baja',
  'resetear-password-dialog.spec.ts': 'Diálogo para restablecer la contraseña de un usuario',
  'usuario-form.spec.ts': 'Formulario de usuario',
  'usuarios.service.spec.ts': 'Servicio HTTP de usuarios',
  'usuarios.spec.ts': 'Pantalla de usuarios: listado, paginado, alta, edición, baja y restablecer clave',
  'layout.spec.ts': 'Estructura de la aplicación: menú por rol, perfil y cierre de sesión',
  'perfil-dialog.spec.ts': 'Diálogo "Mi perfil" y cambio de contraseña',
  'confirmar-dialog.spec.ts': 'Diálogo de confirmación reutilizable',
  'errores.spec.ts': 'Conversión de errores de la API a mensajes',
  'fechas.spec.ts': 'Utilidades de fechas (formatos, semanas, rangos)',
  'grilla.spec.ts': 'Grilla compartida: columnas, estados, acciones y paginador',
  'paginado.spec.ts': 'Estado del paginado (página, tamaño, total)',
  'paginador-es.spec.ts': 'Textos del paginador en castellano',
};

function archivos(dir, termina, lista = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['bin', 'obj', 'node_modules', 'TestResults'].includes(e.name)) archivos(ruta, termina, lista);
    } else if (e.name.endsWith(termina)) lista.push(ruta);
  }
  return lista.sort();
}

const legible = (n) => { const t = n.replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
const backend = (t) => [...t.matchAll(/\[(?:Fact|Theory)[^\]]*\]\s*(?:\[[^\]]*\]\s*)*public (?:async )?(?:Task|void) (\w+)\(/g)].map((m) => m[1]);
const frontend = (t) => [...t.matchAll(/^\s*it(?:\.each\([^)]*\))?\(\s*['"`]([^'"`]+)['"`]/gm)].map((m) => m[1]);

function seccion(titulo, dir, termina, extraer) {
  let texto = `## ${titulo}\n`;
  let total = 0;
  for (const f of archivos(dir, termina)) {
    const nombres = extraer(fs.readFileSync(f, 'utf8'));
    if (!nombres.length) continue;
    total += nombres.length;
    const base = path.basename(f);
    texto += `\n### ${base}\n\n_${descripciones[base] ?? ''}_ (${nombres.length})\n\n`;
    texto += nombres.map((n) => `- ${legible(n)}`).join('\n') + '\n';
  }
  return { texto, total };
}

const b = seccion('Backend (xUnit)', path.join(raiz, 'backend', 'GestionTurnos.Tests'), 'Tests.cs', backend);
const f = seccion('Frontend (Vitest)', path.join(raiz, 'frontend', 'src'), '.spec.ts', frontend);

const md = `# Catálogo de pruebas automáticas

Lista de todas las pruebas automáticas del código, agrupadas por archivo. Se genera leyendo los nombres de las pruebas con \`node docs/pruebas/generar-catalogo.js\`, así que siempre coincide con el código.

- Backend: ${b.total} pruebas escritas. Algunas son parametrizadas y se ejecutan varias veces con distintos datos (la ejecución completa corre 163 casos).
- Frontend: ${f.total} pruebas escritas. Algunas son parametrizadas (la ejecución completa corre 262 casos).

Cómo se ejecutan y cómo se interpretan está en [documentacion-de-pruebas.md](documentacion-de-pruebas.md).

${b.texto}
${f.texto}`;

fs.writeFileSync(path.join(__dirname, 'catalogo-de-pruebas.md'), md, 'utf8');
console.log(`Catálogo generado: backend ${b.total}, frontend ${f.total}`);
