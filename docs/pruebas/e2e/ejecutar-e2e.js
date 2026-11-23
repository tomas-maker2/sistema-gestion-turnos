/*
  Pruebas de punta a punta del sistema de gestión de turnos.

  Abren un Chrome real, usan la aplicación como lo haría una persona y comprueban lo que se ve en pantalla
  y lo que responde la API. Al terminar escriben la tabla de resultados en docs/pruebas/resultados-e2e.md.

  IMPORTANTE: crean y modifican datos. Usar solo con una base de PRUEBAS, recién cargada con
  database/datos-de-ejemplo.sql. Los datos que crean llevan el prefijo "E2E" y se dejan dados de baja.

  Variables de entorno (todas opcionales):
    WEB_URL      dirección del frontend      (por defecto http://localhost:4200)
    API_URL      dirección de la API         (por defecto http://localhost:5080/api)
    CHROME_PATH  ruta de chrome.exe          (por defecto la instalación habitual de Windows)
*/
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const WEB = process.env.WEB_URL || 'http://localhost:4200';
const API = process.env.API_URL || 'http://localhost:5080/api';
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ADMIN = { usuario: 'admin', clave: 'Admin1234!' };
const OPERADOR = { usuario: 'operador', clave: 'Operador1234!' };

// Cada ejecución usa nombres propios para no chocar con ejecuciones anteriores
const SUF = String(Date.now()).slice(-6);
const resultados = [];
let grupoActual = '';
let p; // la página del navegador
const peticionesApi = [];

// ---------- fechas (hora local, como la API) ----------
const dos = (n) => String(n).padStart(2, '0');
const aFecha = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
const sumarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const lunesDe = (d) => sumarDias(d, -((d.getDay() + 6) % 7));
const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const formato = (o, d) => new Intl.DateTimeFormat('es-AR', o).format(d);
const formatoDia = (d) => mayuscula(formato({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, d));
const formatoDiaCorto = (d) => mayuscula(formato({ weekday: 'long', day: 'numeric', month: 'long' }, d));
const formatoSemana = (lunes) =>
  `${formato({ day: 'numeric', month: 'long' }, lunes)} al ${formato({ day: 'numeric', month: 'long', year: 'numeric' }, sumarDias(lunes, 6))}`;

const HOY = sumarDias(new Date(), 0);
// Un día futuro distinto en cada ejecución, para que los turnos de una corrida no estorben a la siguiente
const DIA = sumarDias(HOY, 30 + (Date.now() % 300));

// ---------- marco de pruebas ----------
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const grupo = (nombre) => { grupoActual = nombre; console.log(`\n== ${nombre}`); };
const afirmar = (condicion, mensaje) => { if (!condicion) throw new Error(mensaje); };
const igual = (actual, esperado, mensaje) => {
  if (actual !== esperado) throw new Error(`${mensaje}: se esperaba "${esperado}" y fue "${actual}"`);
};

// Espera a que una condición se cumpla (la pantalla tarda un instante en reflejar los cambios)
async function hasta(condicion, mensaje, limite = 7000) {
  const inicio = Date.now();
  for (;;) {
    let valor;
    try { valor = await condicion(); } catch { valor = false; }
    if (valor) return valor;
    if (Date.now() - inicio > limite) throw new Error(mensaje);
    await pausa(120);
  }
}

async function caso(id, descripcion, cuerpo) {
  let ok = true;
  let detalle = '';
  try {
    await cuerpo();
  } catch (e) {
    ok = false;
    detalle = e.message.replace(/\s+/g, ' ');
    await limpiarDialogos();
  }
  resultados.push({ id, grupo: grupoActual, descripcion, ok, detalle });
  console.log(`${ok ? 'OK    ' : 'FALLO '} ${id}  ${descripcion}${ok ? '' : '\n         -> ' + detalle}`);
}

// Si un caso falla con un diálogo abierto, se cierra para no arrastrar el problema a los siguientes
async function limpiarDialogos() {
  for (let i = 0; i < 3; i++) {
    if (!(await p.$('mat-dialog-container'))) return;
    await p.keyboard.press('Escape');
    await pausa(300);
  }
}

// ---------- API ----------
async function api(metodo, ruta, cuerpo, token) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  return { status: r.status, datos: texto ? JSON.parse(texto) : null };
}
const tokenDe = async (u) => (await api('POST', '/auth/login', { nombreUsuario: u.usuario, password: u.clave })).datos?.token;
const estadoLogin = async (usuario, clave) => (await api('POST', '/auth/login', { nombreUsuario: usuario, password: clave })).status;

// ---------- pantalla ----------
const ruta = () => new URL(p.url()).pathname;
const normalizar = (t) => t.replace(/\s+/g, ' ').trim();
const textoDe = (sel) => p.$eval(sel, (e, n) => e.textContent.replace(/\s+/g, ' ').trim(), 0);
const existe = async (sel) => (await p.$(sel)) !== null;
const hayDialogo = () => existe('mat-dialog-container');
const dialogo = () => p.evaluate(() => {
  const d = [...document.querySelectorAll('mat-dialog-container')].at(-1);
  return d ? d.textContent.replace(/\s+/g, ' ').trim() : '';
});
const snack = () => p.$eval('mat-snack-bar-container', (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
const filas = () => p.$$eval('app-grilla tbody tr', (rs) => rs.map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
const tarjetas = () => p.$$eval('article.turno', (ts) => ts.map((t) => t.textContent.replace(/\s+/g, ' ').trim()));
const hayFila = async (texto) => (await filas()).some((f) => f.includes(texto));
const rango = () => p.$eval('app-grilla .mat-mdc-paginator-range-label', (e) => e.textContent.trim());
const enlaces = () => p.$$eval('nav a', (a) => a.map((x) => x.textContent.trim()));
const sesionGuardada = () => p.evaluate(() => localStorage.getItem('sesion'));

const clic = (sel) => p.evaluate((s) => document.querySelector(s).click(), sel);
const clicBotonDe = (ambito, texto) => p.evaluate((a, t) => {
  const el = [...document.querySelectorAll(`${a} button`)].find((b) => b.textContent.trim() === t || b.getAttribute('aria-label') === t);
  el.click();
}, ambito, texto);
const botonDialogo = (texto) => p.evaluate((t) => {
  const d = [...document.querySelectorAll('mat-dialog-container')].at(-1);
  [...d.querySelectorAll('button')].find((b) => b.textContent.trim() === t).click();
}, texto);
const botonPagina = (texto) => p.evaluate((t) => {
  [...document.querySelectorAll('section.listado .encabezado button')].find((b) => b.textContent.includes(t)).click();
}, texto);
const accionDeFila = (selector, textoFila, etiqueta) => p.evaluate((sel, tf, et) => {
  const fila = [...document.querySelectorAll(sel)].find((r) => r.textContent.includes(tf));
  fila.querySelector(`button[aria-label="${et}"]`).click();
}, selector, textoFila, etiqueta);
const accionDeUsuarioCliente = (textoFila, etiqueta) => accionDeFila('app-grilla tbody tr', textoFila, etiqueta);
const accionDeTurno = (textoTurno, etiqueta) => accionDeFila('article.turno', textoTurno, etiqueta);

async function escribir(sel, texto) {
  await p.focus(sel);
  await p.keyboard.down('Control'); await p.keyboard.press('KeyA'); await p.keyboard.up('Control');
  await p.keyboard.press('Backspace');
  if (texto) await p.type(sel, texto);
}
const ponerValor = (sel, valor) => p.evaluate((s, v) => {
  const el = document.querySelector(s);
  el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, sel, valor);

async function abrir(destino) {
  await p.goto(WEB + destino, { waitUntil: 'networkidle0' });
  await pausa(300);
}

async function cerrarSesionRapido() {
  await p.goto(WEB + '/login', { waitUntil: 'networkidle0' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle0' });
}

async function entrar(u) {
  await cerrarSesionRapido();
  await p.type('input[formcontrolname=nombreUsuario]', u.usuario);
  await p.type('input[formcontrolname=password]', u.clave);
  await clic('button[type=submit]');
  await hasta(() => ruta() === '/agenda', 'no entró a la agenda');
  await p.waitForSelector('nav a');
}

async function elegirTamanio(n) {
  await clic('app-grilla .mat-mdc-paginator-page-size mat-select');
  await p.waitForSelector('mat-option');
  await pausa(250);
  await p.evaluate((x) => [...document.querySelectorAll('mat-option')].find((o) => o.textContent.trim() === String(x)).click(), n);
  await hasta(async () => (await rango()).includes(' de '), 'el paginador no se actualizó');
  await pausa(500);
}

async function opcionesDelMenu() {
  return p.$$eval('mat-option', (o) => o.map((x) => x.textContent.trim()));
}

// Entra a una sección de gestión mostrando 100 filas por página, para encontrar los datos sin paginar
async function seccionConTodo(destino) {
  await abrir(destino);
  await p.waitForSelector('app-grilla tbody tr');
  await elegirTamanio(100);
}

// ---------- ayudas de la agenda ----------
const cantidadDe = (arr, texto) => arr.filter((t) => t.includes(texto)).length;
async function abrirNuevoTurno() {
  await botonPagina('Nuevo turno');
  await p.waitForSelector('mat-dialog-container');
  await pausa(600);
}
async function elegirCliente(busqueda, texto) {
  await escribir('input[formcontrolname=cliente]', busqueda);
  await hasta(async () => (await opcionesDelMenu()).some((o) => o.includes(texto)), 'el buscador no ofreció el cliente');
  await p.evaluate((t) => [...document.querySelectorAll('mat-option')].find((o) => o.textContent.includes(t)).click(), texto);
  await pausa(250);
}
async function elegirServicio(texto) {
  await clic('mat-select[formcontrolname=servicioId]');
  await p.waitForSelector('mat-option');
  await pausa(250);
  await p.evaluate((t) => [...document.querySelectorAll('mat-option')].find((o) => o.textContent.includes(t)).click(), texto);
  await pausa(250);
}
async function llenarTurno({ hora, obs, dia = DIA }) {
  await elegirCliente('ana', 'Pérez, Ana');
  await elegirServicio('Corte de pelo');
  await ponerValor('input[formcontrolname=fechaHora]', `${aFecha(dia)}T${hora}`);
  if (obs) await ponerValor('textarea[formcontrolname=observaciones]', obs);
}
async function irADia(dia) {
  await ponerValor('.selector-fecha', aFecha(dia));
  await hasta(async () => (await textoDe('.rango')) === formatoDia(dia), 'la agenda no cambió de día');
  await pausa(500);
}
async function guardarTurno() {
  await botonDialogo('Guardar');
}

// ============================================================================================
async function main() {
  const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  p = await navegador.newPage();
  await p.setViewport({ width: 1200, height: 800 });
  p.on('request', (r) => { if (r.url().startsWith(API) && r.method() === 'GET') peticionesApi.push(r.url().replace(API, '')); });

  const tokenAdmin = await tokenDe(ADMIN);
  afirmar(tokenAdmin, 'No se pudo iniciar sesión como admin por la API: ¿la base tiene los datos de ejemplo?');

  // ------------------------------------------------------------------ Autenticación y sesión
  grupo('Autenticación y sesión');

  await caso('AUT-01', 'Sin sesión, entrar a la raíz redirige al login', async () => {
    await cerrarSesionRapido();
    await abrir('/');
    await hasta(() => ruta() === '/login', 'no redirigió al login');
  });

  await caso('AUT-02', 'Sin sesión, entrar a una pantalla protegida (/usuarios) redirige al login', async () => {
    await cerrarSesionRapido();
    await abrir('/usuarios');
    await hasta(() => ruta() === '/login', 'no redirigió al login');
  });

  await caso('AUT-03', 'Login con los campos vacíos muestra los mensajes de validación', async () => {
    await cerrarSesionRapido();
    await clic('button[type=submit]');
    await hasta(async () => {
      const m = await p.$$eval('mat-error', (e) => e.map((x) => x.textContent.trim()));
      return m.includes('Ingresá tu usuario') && m.includes('Ingresá tu contraseña');
    }, 'faltan los mensajes de validación');
  });

  await caso('AUT-04', 'Login con contraseña incorrecta muestra el mensaje y no deja entrar', async () => {
    await cerrarSesionRapido();
    await p.type('input[formcontrolname=nombreUsuario]', ADMIN.usuario);
    await p.type('input[formcontrolname=password]', 'clave-equivocada');
    await clic('button[type=submit]');
    await hasta(async () => (await textoDe('.error')) === 'Usuario o contraseña incorrectos', 'no apareció el mensaje de error');
    igual(ruta(), '/login', 'ruta después del intento');
  });

  await caso('AUT-05', 'El administrador entra a la agenda y ve los cuatro menús', async () => {
    await entrar(ADMIN);
    igual((await enlaces()).join(','), 'Agenda,Clientes,Servicios,Usuarios', 'menús del administrador');
  });

  await caso('AUT-06', 'El operador ve solo tres menús y no puede entrar a /usuarios por la dirección', async () => {
    await entrar(OPERADOR);
    igual((await enlaces()).join(','), 'Agenda,Clientes,Servicios', 'menús del operador');
    await abrir('/usuarios');
    await hasta(() => ruta() === '/agenda', 'no lo redirigió a la agenda');
  });

  await caso('AUT-07', 'Recargar la página conserva la sesión', async () => {
    await entrar(ADMIN);
    await p.reload({ waitUntil: 'networkidle0' });
    igual(ruta(), '/agenda', 'ruta después de recargar');
    afirmar(await existe('nav a'), 'no se ve el menú');
  });

  await caso('AUT-08', 'Con un token inválido la API responde 401 y la aplicación vuelve al login', async () => {
    await entrar(ADMIN);
    await p.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('sesion'));
      s.token = 'token.invalido.xyz';
      localStorage.setItem('sesion', JSON.stringify(s));
    });
    await p.reload({ waitUntil: 'networkidle0' });
    await hasta(() => ruta() === '/login', 'no volvió al login');
    igual(await sesionGuardada(), null, 'sesión guardada');
  });

  await caso('AUT-09', 'El logout pide confirmación y, si se cancela, la sesión sigue', async () => {
    await entrar(ADMIN);
    await clic('button[aria-label="Cerrar sesión"]');
    await hasta(async () => (await dialogo()).includes('¿Querés cerrar la sesión?'), 'no apareció la confirmación');
    await botonDialogo('Cancelar');
    await hasta(async () => !(await hayDialogo()), 'el diálogo no se cerró');
    igual(ruta(), '/agenda', 'ruta después de cancelar');
    afirmar(await sesionGuardada(), 'la sesión se perdió');
  });

  await caso('AUT-10', 'Confirmar el logout cierra la sesión y vuelve al login', async () => {
    await clic('button[aria-label="Cerrar sesión"]');
    await hasta(async () => await hayDialogo(), 'no apareció la confirmación');
    await pausa(400);
    await botonDialogo('Logout');
    await hasta(() => ruta() === '/login', 'no volvió al login');
    igual(await sesionGuardada(), null, 'sesión guardada');
  });

  // ------------------------------------------------------------------ Perfil y contraseña
  grupo('Perfil y cambio de contraseña');

  await caso('PER-01', 'El modal "Mi perfil" muestra nombre, usuario y rol', async () => {
    await entrar(ADMIN);
    await clic('button[aria-label="Mi perfil"]');
    await hasta(async () => {
      const t = await dialogo();
      return t.includes('Mi perfil') && t.includes('admin') && t.includes('Administrador');
    }, 'el perfil no muestra los datos');
    await botonDialogo('Cerrar');
  });

  const usuarioPerfil = `e2e_perfil_${SUF}`;
  await api('POST', '/usuarios', { nombreUsuario: usuarioPerfil, nombreCompleto: 'Prueba Perfil', password: 'Clave12345', rol: 'Operador' }, tokenAdmin);

  await caso('PER-02', 'Cambiar la contraseña con una confirmación distinta muestra un mensaje', async () => {
    await entrar({ usuario: usuarioPerfil, clave: 'Clave12345' });
    await clic('button[aria-label="Mi perfil"]');
    await p.waitForSelector('mat-dialog-container');
    await pausa(500);
    await clicBotonDe('mat-dialog-container', 'Cambiar contraseña');
    await p.waitForSelector('mat-dialog-container input');
    await escribir('input[formcontrolname=passwordActual]', 'Clave12345');
    await escribir('input[formcontrolname=passwordNueva]', 'NuevaClave99');
    await escribir('input[formcontrolname=confirmacion]', 'Distinta1234');
    await botonDialogo('Guardar');
    await hasta(async () => (await dialogo()).includes('Las contraseñas no coinciden'), 'no apareció el mensaje');
  });

  await caso('PER-03', 'Con la contraseña actual equivocada se muestra el error y no se cierra la sesión', async () => {
    await escribir('input[formcontrolname=passwordActual]', 'equivocada1');
    await escribir('input[formcontrolname=confirmacion]', 'NuevaClave99');
    await botonDialogo('Guardar');
    await hasta(async () => (await dialogo()).includes('La contraseña actual es incorrecta'), 'no apareció el error de la API');
    igual(ruta(), '/agenda', 'ruta (la sesión sigue abierta)');
  });

  await caso('PER-04', 'Con los datos correctos la contraseña cambia: sirve la nueva y no la vieja', async () => {
    await escribir('input[formcontrolname=passwordActual]', 'Clave12345');
    await botonDialogo('Guardar');
    await hasta(async () => !(await hayDialogo()), 'el diálogo no se cerró');
    await hasta(async () => (await snack()).includes('Contraseña actualizada'), 'no apareció el aviso');
    igual(await estadoLogin(usuarioPerfil, 'NuevaClave99'), 200, 'login con la clave nueva');
    igual(await estadoLogin(usuarioPerfil, 'Clave12345'), 401, 'login con la clave vieja');
  });

  // ------------------------------------------------------------------ Usuarios
  grupo('Usuarios (solo administrador)');
  const usuarioE2E = `e2e_usu_${SUF}`;

  await caso('USU-01', 'El listado muestra a los usuarios con su rol y su estado', async () => {
    await entrar(ADMIN);
    await seccionConTodo('/usuarios');
    const f = await filas();
    afirmar(f.some((x) => x.includes('admin') && x.includes('Administrador') && x.includes('Activo')), 'falta el administrador');
    afirmar(f.some((x) => x.includes('operador') && x.includes('Operador') && x.includes('Activo')), 'falta el operador');
  });

  await caso('USU-02', 'El alta con una contraseña de menos de 8 caracteres muestra un mensaje', async () => {
    await botonPagina('Nuevo usuario');
    await p.waitForSelector('mat-dialog-container');
    await pausa(500);
    await escribir('input[formcontrolname=nombreUsuario]', usuarioE2E);
    await escribir('input[formcontrolname=nombreCompleto]', 'Prueba E2E');
    await escribir('input[formcontrolname=password]', 'corta');
    await botonDialogo('Guardar');
    await hasta(async () => (await dialogo()).includes('al menos 8 caracteres'), 'no apareció el mensaje');
  });

  await caso('USU-03', 'El alta correcta agrega al usuario al listado y avisa', async () => {
    await escribir('input[formcontrolname=password]', 'Temporal123');
    await botonDialogo('Guardar');
    await hasta(async () => !(await hayDialogo()), 'el diálogo no se cerró');
    await hasta(async () => (await filas()).some((x) => x.includes(usuarioE2E) && x.includes('Operador')), 'no apareció en el listado');
    afirmar((await snack()).includes('Usuario guardado'), 'no apareció el aviso');
  });

  await caso('USU-04', 'No permite repetir un nombre de usuario (aunque cambien las mayúsculas)', async () => {
    await botonPagina('Nuevo usuario');
    await p.waitForSelector('mat-dialog-container');
    await pausa(500);
    await escribir('input[formcontrolname=nombreUsuario]', usuarioE2E.toUpperCase());
    await escribir('input[formcontrolname=nombreCompleto]', 'Otra persona');
    await escribir('input[formcontrolname=password]', 'Temporal123');
    await botonDialogo('Guardar');
    await hasta(async () => (await dialogo()).includes('Ya existe un usuario con ese nombre'), 'no apareció el mensaje de la API');
    await botonDialogo('Cancelar');
    await hasta(async () => !(await hayDialogo()), 'el diálogo no se cerró');
  });

  await caso('USU-05', 'Al editar no se cambia el usuario ni se pide la clave; sí el nombre y el rol', async () => {
    await accionDeUsuarioCliente(usuarioE2E, 'Editar');
    await p.waitForSelector('mat-dialog-container');
    await pausa(500);
    afirmar(await p.$eval('input[formcontrolname=nombreUsuario]', (i) => i.disabled), 'el usuario se puede editar');
    afirmar(!(await existe('input[formcontrolname=password]')), 'pide la contraseña');
    await escribir('input[formcontrolname=nombreCompleto]', 'Prueba Editada');
    await clic('mat-select[formcontrolname=rol]');
    await p.waitForSelector('mat-option');
    await pausa(250);
    await p.evaluate(() => [...document.querySelectorAll('mat-option')].find((o) => o.textContent.includes('Administrador')).click());
    await pausa(250);
    await botonDialogo('Guardar');
    await hasta(async () => (await filas()).some((x) => x.includes(usuarioE2E) && x.includes('Prueba Editada') && x.includes('Administrador')),
      'el listado no muestra los cambios');
  });

  await caso('USU-06', 'Restablecer la contraseña de otro usuario: sirve la nueva y no la vieja', async () => {
    await accionDeUsuarioCliente(usuarioE2E, 'Restablecer contraseña');
    await p.waitForSelector('mat-dialog-container input');
    await pausa(400);
    await escribir('mat-dialog-container input', 'NuevaTmp1234');
    await botonDialogo('Guardar');
    await hasta(async () => (await snack()).includes('Contraseña restablecida'), 'no apareció el aviso');
    igual(await estadoLogin(usuarioE2E, 'NuevaTmp1234'), 200, 'login con la clave nueva');
    igual(await estadoLogin(usuarioE2E, 'Temporal123'), 401, 'login con la clave vieja');
  });

  await caso('USU-07', 'Desactivar impide el ingreso y reactivar lo devuelve', async () => {
    await accionDeUsuarioCliente(usuarioE2E, 'Desactivar');
    await hasta(async () => await hayDialogo(), 'no apareció la confirmación');
    await pausa(400);
    await botonDialogo('Desactivar');
    await hasta(async () => (await filas()).some((x) => x.includes(usuarioE2E) && x.includes('Inactivo')), 'no quedó inactivo');
    igual(await estadoLogin(usuarioE2E, 'NuevaTmp1234'), 401, 'login del usuario inactivo');
    await accionDeUsuarioCliente(usuarioE2E, 'Reactivar');
    await hasta(async () => (await filas()).some((x) => x.includes(usuarioE2E) && !x.includes('Inactivo')), 'no volvió a estar activo');
    igual(await estadoLogin(usuarioE2E, 'NuevaTmp1234'), 200, 'login después de reactivar');
  });

  await caso('USU-08', 'Un administrador no puede desactivar su propio usuario', async () => {
    await accionDeUsuarioCliente('admin', 'Desactivar');
    await hasta(async () => await hayDialogo(), 'no apareció la confirmación');
    await pausa(400);
    await botonDialogo('Desactivar');
    await hasta(async () => (await snack()).includes('No podés desactivar tu propio usuario'), 'no apareció el mensaje de la API');
    afirmar((await filas()).some((x) => x.startsWith('admin') && x.includes('Activo') && !x.includes('Inactivo')), 'el admin quedó inactivo');
  });

  // ------------------------------------------------------------------ Clientes
  grupo('Clientes');
  const apellidoE2E = `Temporal${SUF}`;
  const buscar = async (texto) => { await escribir('input[matinput]', texto); await pausa(900); };

  await caso('CLI-01', 'La búsqueda por texto filtra los clientes', async () => {
    await abrir('/clientes');
    await p.waitForSelector('app-grilla tbody tr');
    await buscar('ana');
    await hasta(async () => (await hayFila('Pérez, Ana')), 'la búsqueda no encontró a Pérez, Ana');
  });

  await caso('CLI-02', 'Una búsqueda sin resultados muestra el mensaje "No hay clientes."', async () => {
    await buscar('zzzzz');
    await hasta(async () => (await textoDe('section.listado')).includes('No hay clientes.'), 'no apareció el mensaje');
    await buscar('');
  });

  await caso('CLI-03', 'El alta valida los campos obligatorios y el formato del email', async () => {
    await botonPagina('Nuevo cliente');
    await p.waitForSelector('mat-dialog-container');
    await pausa(500);
    await botonDialogo('Guardar');
    await hasta(async () => {
      const m = await p.$$eval('mat-dialog-container mat-error', (e) => e.map((x) => x.textContent.trim()));
      return ['Ingresá el nombre', 'Ingresá el apellido', 'Ingresá un teléfono'].every((x) => m.includes(x));
    }, 'faltan los mensajes de campos obligatorios');
    await escribir('input[formcontrolname=nombre]', 'E2E');
    await escribir('input[formcontrolname=apellido]', apellidoE2E);
    await escribir('input[formcontrolname=telefono]', '000');
    await escribir('input[formcontrolname=email]', 'no-es-un-email');
    await botonDialogo('Guardar');
    await hasta(async () => (await dialogo()).includes('El email no es válido'), 'no apareció el mensaje del email');
  });

  await caso('CLI-04', 'El alta correcta (con el email vacío) agrega al cliente y avisa', async () => {
    await escribir('input[formcontrolname=email]', '');
    await botonDialogo('Guardar');
    await hasta(async () => !(await hayDialogo()), 'el diálogo no se cerró');
    await hasta(async () => (await snack()).includes('Cliente guardado'), 'no apareció el aviso');
    await buscar(apellidoE2E);
    await hasta(async () => await hayFila(`${apellidoE2E}, E2E`), 'no apareció en el listado');
  });

  await caso('CLI-05', 'La edición precarga los datos y guarda los cambios', async () => {
    await accionDeUsuarioCliente(apellidoE2E, 'Editar');
    await p.waitForSelector('mat-dialog-container');
    await pausa(500);
    igual(await p.$eval('input[formcontrolname=apellido]', (i) => i.value), apellidoE2E, 'apellido precargado');
    await escribir('input[formcontrolname=telefono]', '999');
    await botonDialogo('Guardar');
    await hasta(async () => (await filas()).some((x) => x.includes(apellidoE2E) && x.includes('999')), 'el teléfono no se actualizó');
  });

  await caso('CLI-06', 'Desactivar pide confirmación (se puede cancelar) y oculta al cliente', async () => {
    await accionDeUsuarioCliente(apellidoE2E, 'Desactivar');
    await hasta(async () => (await dialogo()).includes('E2E'), 'la confirmación no nombra al cliente');
    await botonDialogo('Cancelar');
    await hasta(async () => !(await hayDialogo()), 'el diálogo no se cerró');
    afirmar(await hayFila(apellidoE2E), 'el cliente desapareció al cancelar');
    await accionDeUsuarioCliente(apellidoE2E, 'Desactivar');
    await hasta(async () => await hayDialogo(), 'no apareció la confirmación');
    await pausa(400);
    await botonDialogo('Desactivar');
    await hasta(async () => !(await hayFila(apellidoE2E)), 'el cliente sigue en el listado');
    await p.click('mat-slide-toggle button[role=switch]');
    await hasta(async () => (await filas()).some((x) => x.includes(apellidoE2E) && x.includes('Inactivo')), '"Mostrar inactivos" no lo muestra');
  });

  await caso('CLI-07', 'Reactivar vuelve a dejar al cliente activo', async () => {
    await accionDeUsuarioCliente(apellidoE2E, 'Reactivar');
    await hasta(async () => (await filas()).some((x) => x.includes(apellidoE2E) && !x.includes('Inactivo')), 'no volvió a estar activo');
    const r = await api('GET', `/clientes?texto=${apellidoE2E}&incluirInactivos=true`, null, tokenAdmin);
    for (const c of r.datos.items) await api('DELETE', `/clientes/${c.id}`, null, tokenAdmin); // se deja dado de baja
  });

  // ------------------------------------------------------------------ Servicios
  grupo('Servicios');
  const servicioE2E = `E2E Serv ${SUF}`;

  await caso('SER-01', 'El listado muestra cada servicio con su duración en minutos', async () => {
    await seccionConTodo('/servicios');
    afirmar((await filas()).some((x) => x.includes('Corte de pelo') && x.includes('30 min')), 'falta "Corte de pelo 30 min"');
  });

  await caso('SER-02', 'No permite repetir el nombre de un servicio (aunque cambien las mayúsculas)', async () => {
    await botonPagina('Nuevo servicio');
    await p.waitForSelector('mat-dialog-container');
    await pausa(500);
    await escribir('input[formcontrolname=nombre]', 'corte de pelo');
    await botonDialogo('Guardar');
    await hasta(async () => (await dialogo()).includes('Ya existe un servicio con ese nombre'), 'no apareció el mensaje de la API');
    afirmar(await hayDialogo(), 'el diálogo se cerró');
  });

  await caso('SER-03', 'La duración tiene que estar entre 5 y 480 minutos', async () => {
    await escribir('input[formcontrolname=nombre]', servicioE2E);
    await escribir('input[formcontrolname=duracionMinutos]', '4');
    await botonDialogo('Guardar');
    await hasta(async () => (await dialogo()).includes('entre 5 y 480'), 'no apareció el mensaje de validación');
  });

  await caso('SER-04', 'El alta correcta y la edición de la duración se reflejan en el listado', async () => {
    await escribir('input[formcontrolname=duracionMinutos]', '25');
    await botonDialogo('Guardar');
    await hasta(async () => (await filas()).some((x) => x.includes(servicioE2E) && x.includes('25 min')), 'no apareció con 25 min');
    await accionDeUsuarioCliente(servicioE2E, 'Editar');
    await p.waitForSelector('mat-dialog-container');
    await pausa(500);
    await escribir('input[formcontrolname=duracionMinutos]', '40');
    await botonDialogo('Guardar');
    await hasta(async () => (await filas()).some((x) => x.includes(servicioE2E) && x.includes('40 min')), 'no se actualizó a 40 min');
  });

  await caso('SER-05', 'Desactivar oculta al servicio, "Mostrar inactivos" lo muestra y reactivar lo devuelve', async () => {
    await accionDeUsuarioCliente(servicioE2E, 'Desactivar');
    await hasta(async () => await hayDialogo(), 'no apareció la confirmación');
    await pausa(400);
    await botonDialogo('Desactivar');
    await hasta(async () => !(await hayFila(servicioE2E)), 'el servicio sigue en el listado');
    await p.click('mat-slide-toggle button[role=switch]');
    await hasta(async () => (await filas()).some((x) => x.includes(servicioE2E) && x.includes('Inactivo')), 'no aparece como inactivo');
    await accionDeUsuarioCliente(servicioE2E, 'Reactivar');
    await hasta(async () => (await filas()).some((x) => x.includes(servicioE2E) && !x.includes('Inactivo')), 'no volvió a estar activo');
    const r = await api('GET', '/servicios?incluirInactivos=true&tamanio=100', null, tokenAdmin);
    for (const s of r.datos.items.filter((x) => x.nombre === servicioE2E)) await api('DELETE', `/servicios/${s.id}`, null, tokenAdmin);
  });

  // ------------------------------------------------------------------ Paginado
  grupo('Paginado de las grillas');
  const totalClientes = (await api('GET', '/clientes?tamanio=100', null, tokenAdmin)).datos.total;
  const ultimaPagina = Math.ceil(totalClientes / 5);

  await caso('PAG-01', 'Por defecto muestra 5 filas por página y el contador "1 – 5 de N"', async () => {
    afirmar(totalClientes > 5, `hacen falta más de 5 clientes activos (hay ${totalClientes})`);
    await abrir('/clientes');
    await p.waitForSelector('app-grilla tbody tr');
    igual(await rango(), `1 – 5 de ${totalClientes}`, 'contador');
    igual((await filas()).length, 5, 'filas en pantalla');
  });

  await caso('PAG-02', 'Las opciones de filas por página son 5, 10, 30, 50 y 100', async () => {
    await clic('app-grilla .mat-mdc-paginator-page-size mat-select');
    await p.waitForSelector('mat-option');
    await pausa(250);
    igual((await opcionesDelMenu()).join(','), '5,10,30,50,100', 'opciones');
    await p.keyboard.press('Escape');
    await pausa(400);
  });

  await caso('PAG-03', 'Se navega con primera, anterior, siguiente y última página', async () => {
    await clicBotonDe('app-grilla', 'Página siguiente');
    await hasta(async () => (await rango()) === `6 – ${Math.min(10, totalClientes)} de ${totalClientes}`, 'la página siguiente no mostró el rango esperado');
    await clicBotonDe('app-grilla', 'Página anterior');
    await hasta(async () => (await rango()) === `1 – 5 de ${totalClientes}`, 'la página anterior no volvió al inicio');
    await clicBotonDe('app-grilla', 'Última página');
    await hasta(async () => (await rango()) === `${(ultimaPagina - 1) * 5 + 1} – ${totalClientes} de ${totalClientes}`, 'la última página no mostró el rango esperado');
    await clicBotonDe('app-grilla', 'Primera página');
    await hasta(async () => (await rango()) === `1 – 5 de ${totalClientes}`, 'la primera página no volvió al inicio');
  });

  await caso('PAG-04', 'Cambiar a 10 filas por página muestra más filas y vuelve a la primera página', async () => {
    await clicBotonDe('app-grilla', 'Página siguiente');
    await pausa(700);
    await elegirTamanio(10);
    igual(await rango(), `1 – ${Math.min(10, totalClientes)} de ${totalClientes}`, 'contador');
    igual((await filas()).length, Math.min(10, totalClientes), 'filas en pantalla');
  });

  await caso('PAG-05', 'El paginador queda arriba y a la izquierda de la grilla', async () => {
    const pos = await p.evaluate(() => {
      const pag = document.querySelector('app-grilla mat-paginator').getBoundingClientRect();
      const tabla = document.querySelector('app-grilla .contenedor').getBoundingClientRect();
      const etiqueta = document.querySelector('app-grilla .mat-mdc-paginator-page-size-label').getBoundingClientRect();
      return { arriba: pag.bottom <= tabla.top + 1, izquierda: etiqueta.left - tabla.left };
    });
    afirmar(pos.arriba, 'el paginador no está arriba de la tabla');
    afirmar(pos.izquierda < 40, `el paginador no está pegado a la izquierda (${Math.round(pos.izquierda)} px)`);
  });

  await caso('PAG-06', 'La API recibe la página y el tamaño pedidos (paginado en el backend)', async () => {
    afirmar(peticionesApi.some((u) => /\/clientes\?.*pagina=2/.test(u) && /tamanio=5/.test(u)), 'no se pidió la página 2 con 5 filas');
    afirmar(peticionesApi.some((u) => /\/clientes\?.*pagina=1/.test(u) && /tamanio=10/.test(u)), 'no se pidió la página 1 con 10 filas');
  });

  await caso('PAG-07', 'Buscar estando en otra página vuelve a la primera', async () => {
    await abrir('/clientes');
    await p.waitForSelector('app-grilla tbody tr');
    await clicBotonDe('app-grilla', 'Página siguiente');
    await hasta(async () => (await rango()).startsWith('6'), 'no pasó a la página 2');
    await escribir('input[matinput]', 'a');
    await hasta(async () => (await rango()).startsWith('1 –'), 'la búsqueda no volvió a la primera página');
  });

  await caso('PAG-08', 'Si se da de baja lo único que tenía la última página, la pantalla vuelve a la anterior', async () => {
    const activos = async () => (await api('GET', '/servicios?tamanio=100', null, tokenAdmin)).datos.total;
    const temporales = [];
    let total = await activos();
    // Se crean los servicios necesarios para que la última página tenga exactamente una fila
    for (let i = 1; total % 5 !== 1; i++) {
      const r = await api('POST', '/servicios', { nombre: `ZZ E2E ${SUF} ${i}`, duracionMinutos: 30 }, tokenAdmin);
      temporales.push(r.datos.id);
      total = await activos();
    }
    await abrir('/servicios');
    await p.waitForSelector('app-grilla tbody tr');
    await clicBotonDe('app-grilla', 'Última página');
    await hasta(async () => (await rango()) === `${total} – ${total} de ${total}`, 'la última página no tiene una sola fila');
    await hasta(async () => (await filas()).length === 1, 'la última página no muestra su única fila');
    const ultima = (await filas())[0];
    await accionDeUsuarioCliente(ultima.slice(0, 12), 'Desactivar');
    await hasta(async () => await hayDialogo(), 'no apareció la confirmación');
    await pausa(400);
    await botonDialogo('Desactivar');
    await hasta(async () => (await rango()) === `${total - 5} – ${total - 1} de ${total - 1}`, 'no volvió a la página anterior');
    await hasta(async () => (await filas()).length === 5, 'la página anterior no muestra sus 5 filas');
    for (const id of temporales) await api('DELETE', `/servicios/${id}`, null, tokenAdmin);
  });

  // ------------------------------------------------------------------ Agenda y turnos
  grupo('Agenda y turnos');

  await caso('AGE-01', 'La agenda de hoy muestra la fecha en castellano y los turnos de ejemplo', async () => {
    await entrar(ADMIN);
    await abrir('/agenda');
    await hasta(async () => (await tarjetas()).length >= 3, 'no hay turnos de ejemplo para hoy');
    igual(await textoDe('.rango'), formatoDia(HOY), 'título del día');
  });

  await caso('AGE-02', 'Cada turno muestra su estado; solo los pendientes tienen botones y los cancelados se atenúan', async () => {
    const t = await tarjetas();
    for (const estado of ['Pendiente', 'Atendido', 'Cancelado']) afirmar(cantidadDe(t, estado) > 0, `no hay turnos ${estado}`);
    const info = await p.$$eval('article.turno', (ts) => ts.map((x) => ({
      estado: x.querySelector('.estado').textContent.trim(),
      botones: x.querySelectorAll('.acciones button').length,
      atenuado: x.classList.contains('cancelado'),
    })));
    for (const x of info) {
      igual(x.botones, x.estado === 'Pendiente' ? 3 : 0, `botones de un turno ${x.estado}`);
      igual(x.atenuado, x.estado === 'Cancelado', `atenuado de un turno ${x.estado}`);
    }
  });

  await caso('AGE-03', 'Se navega por día con anterior, siguiente, "Hoy" y el selector de fecha', async () => {
    await clic('button[aria-label="Siguiente"]');
    await hasta(async () => (await textoDe('.rango')) === formatoDia(sumarDias(HOY, 1)), 'siguiente no avanzó un día');
    await clic('button[aria-label="Anterior"]');
    await hasta(async () => (await textoDe('.rango')) === formatoDia(HOY), 'anterior no volvió');
    await irADia(DIA);
    await clicBotonDe('section.listado', 'Hoy');
    await hasta(async () => (await textoDe('.rango')) === formatoDia(HOY), '"Hoy" no volvió al día actual');
  });

  await caso('AGE-04', 'La vista semanal muestra los siete días con los turnos de cada uno', async () => {
    await clicBotonDe('section.listado', 'Semana');
    const lunes = lunesDe(HOY);
    await hasta(async () => (await textoDe('.rango')) === formatoSemana(lunes), 'el rango de la semana es incorrecto');
    await pausa(600);
    igual((await p.$$('section.dia')).length, 7, 'días mostrados');
    const enLaApi = (await api('GET', `/turnos?desde=${aFecha(lunes)}&hasta=${aFecha(sumarDias(lunes, 7))}`, null, tokenAdmin)).datos.length;
    igual((await tarjetas()).length, enLaApi, 'turnos en pantalla frente a los de la API');
    await clicBotonDe('section.listado', 'Día');
    await hasta(async () => (await textoDe('.rango')) === formatoDia(HOY), 'no volvió a la vista del día');
  });

  await caso('AGE-05', 'El alta de un turno valida cliente y servicio, y el cliente tiene que elegirse de la lista', async () => {
    await irADia(DIA);
    await abrirNuevoTurno();
    igual(await p.$eval('input[formcontrolname=fechaHora]', (i) => i.value), `${aFecha(DIA)}T09:00`, 'fecha sugerida');
    await botonDialogo('Guardar');
    await hasta(async () => {
      const m = await p.$$eval('mat-dialog-container mat-error', (e) => e.map((x) => x.textContent.trim()));
      return m.includes('Elegí un cliente de la lista') && m.includes('Elegí un servicio');
    }, 'faltan los mensajes de validación');
    await escribir('input[formcontrolname=cliente]', 'ana');
    await p.keyboard.press('Escape');
    await botonDialogo('Guardar');
    await hasta(async () => (await dialogo()).includes('Elegí un cliente de la lista'), 'aceptó un cliente escrito sin elegir');
  });

  await caso('AGE-06', 'El buscador de clientes sugiere a los que coinciden con lo escrito', async () => {
    await escribir('input[formcontrolname=cliente]', 'ana');
    await hasta(async () => (await opcionesDelMenu()).some((o) => o.includes('Pérez, Ana')), 'no ofreció a Pérez, Ana');
    await p.keyboard.press('Escape');
    await escribir('input[formcontrolname=cliente]', '');
  });

  await caso('AGE-07', 'El alta correcta muestra la hora de fin estimada, guarda y ordena por hora', async () => {
    await llenarTurno({ hora: '09:00', obs: 'E2E primero' });
    await hasta(async () => (await textoDe('mat-dialog-container mat-hint')) === 'Termina a las 09:30', 'no calculó la hora de fin');
    await guardarTurno();
    await hasta(async () => !(await hayDialogo()), 'el diálogo no se cerró');
    await hasta(async () => (await snack()).includes('Turno guardado'), 'no apareció el aviso');
    await hasta(async () => (await tarjetas()).some((t) => t.includes('E2E primero') && t.startsWith('09:00') && t.includes('Pendiente')), 'el turno no aparece en la agenda');
  });

  await caso('AGE-08', 'No permite un turno que se superponga con otro (por dentro ni por el inicio)', async () => {
    await abrirNuevoTurno();
    await llenarTurno({ hora: '09:15', obs: 'E2E superpuesto' });
    await guardarTurno();
    await hasta(async () => (await dialogo()).includes('El horario está ocupado por otro turno'), 'aceptó 09:15');
    afirmar(await hayDialogo(), 'el diálogo se cerró');
    await ponerValor('input[formcontrolname=fechaHora]', `${aFecha(DIA)}T08:45`);
    await guardarTurno();
    await hasta(async () => (await dialogo()).includes('El horario está ocupado por otro turno'), 'aceptó 08:45');
  });

  await caso('AGE-09', 'No permite un turno que empiece en el pasado', async () => {
    await ponerValor('input[formcontrolname=fechaHora]', `${aFecha(sumarDias(HOY, -1))}T10:00`);
    await guardarTurno();
    await hasta(async () => (await dialogo()).includes('El turno no puede empezar en el pasado'), 'no apareció el mensaje');
  });

  await caso('AGE-10', 'Un turno contiguo (empieza cuando otro termina) sí se permite', async () => {
    await ponerValor('input[formcontrolname=fechaHora]', `${aFecha(DIA)}T09:30`);
    await guardarTurno();
    await hasta(async () => !(await hayDialogo()), 'el diálogo no se cerró');
    await hasta(async () => (await tarjetas()).map((t) => t.slice(0, 5)).join(',') === '09:00,09:30', 'la agenda no quedó ordenada por hora');
  });

  await caso('AGE-11', 'Editar un turno precarga sus datos y, al cambiar la hora, reordena la agenda', async () => {
    await accionDeTurno('E2E primero', 'Editar');
    await p.waitForSelector('mat-dialog-container');
    await pausa(600);
    igual(await p.$eval('input[formcontrolname=fechaHora]', (i) => i.value), `${aFecha(DIA)}T09:00`, 'hora precargada');
    igual(await p.$eval('input[formcontrolname=cliente]', (i) => i.value), 'Pérez, Ana', 'cliente precargado');
    await ponerValor('input[formcontrolname=fechaHora]', `${aFecha(DIA)}T11:00`);
    await guardarTurno();
    await hasta(async () => (await tarjetas()).map((t) => t.slice(0, 5)).join(',') === '09:30,11:00', 'la agenda no se reordenó');
  });

  await caso('AGE-12', 'Marcar como atendido pide confirmación y deja al turno sin botones', async () => {
    await p.evaluate(() => document.querySelectorAll('article.turno')[0].querySelector('button[aria-label="Marcar como atendido"]').click());
    await hasta(async () => (await dialogo()).includes('Marcar como atendido'), 'no apareció la confirmación');
    await pausa(400);
    await botonDialogo('Volver');
    await hasta(async () => !(await hayDialogo()), 'el diálogo no se cerró');
    afirmar((await tarjetas())[0].includes('Pendiente'), 'cambió de estado al volver');
    await p.evaluate(() => document.querySelectorAll('article.turno')[0].querySelector('button[aria-label="Marcar como atendido"]').click());
    await hasta(async () => await hayDialogo(), 'no apareció la confirmación');
    await pausa(400);
    await botonDialogo('Marcar atendido');
    await hasta(async () => (await tarjetas())[0].includes('Atendido'), 'no quedó atendido');
    igual(await p.$eval('article.turno .acciones', (e) => e.querySelectorAll('button').length), 0, 'botones del turno atendido');
  });

  await caso('AGE-13', 'Cancelar un turno lo deja cancelado y libera el horario para otro', async () => {
    await accionDeTurno('E2E primero', 'Cancelar turno');
    await hasta(async () => (await dialogo()).includes('¿Querés cancelar el turno de Pérez, Ana a las 11:00?'), 'la confirmación no menciona al cliente y la hora');
    await pausa(400);
    await botonDialogo('Cancelar turno');
    await hasta(async () => (await tarjetas()).some((t) => t.includes('E2E primero') && t.includes('Cancelado')), 'no quedó cancelado');
    afirmar(await p.evaluate(() => [...document.querySelectorAll('article.turno')].find((a) => a.textContent.includes('E2E primero')).classList.contains('cancelado')), 'no se ve atenuado');
    await abrirNuevoTurno();
    await llenarTurno({ hora: '11:00', obs: 'E2E reutiliza el horario' });
    await guardarTurno();
    await hasta(async () => !(await hayDialogo()), 'no permitió reutilizar el horario del turno cancelado');
    await hasta(async () => (await tarjetas()).some((t) => t.includes('E2E reutiliza el horario') && t.includes('Pendiente')), 'el turno nuevo no aparece');
  });

  await caso('AGE-14', 'En la vista semanal los turnos aparecen en su día', async () => {
    await clicBotonDe('section.listado', 'Semana');
    await hasta(async () => (await textoDe('.rango')) === formatoSemana(lunesDe(DIA)), 'no mostró la semana del turno');
    await pausa(600);
    const porDia = await p.$$eval('section.dia', (ss) => ss.map((s) => ({ titulo: s.querySelector('h2').textContent.trim(), turnos: s.querySelectorAll('article.turno').length })));
    const delDia = porDia.find((d) => d.titulo === formatoDiaCorto(DIA));
    afirmar(delDia, `no se encontró el día ${formatoDiaCorto(DIA)}`);
    igual(delDia.turnos, 3, 'turnos del día (atendido, cancelado y pendiente)');
    igual(porDia.reduce((s, d) => s + d.turnos, 0), 3, 'turnos de toda la semana');
    await clicBotonDe('section.listado', 'Día');
  });

  // Limpieza: se cancelan los turnos pendientes que dejó la prueba
  const delDia = (await api('GET', `/turnos?desde=${aFecha(DIA)}&hasta=${aFecha(sumarDias(DIA, 1))}`, null, tokenAdmin)).datos;
  for (const t of delDia.filter((x) => x.estado === 'Pendiente')) await api('POST', `/turnos/${t.id}/cancelar`, null, tokenAdmin);
  const perfil = (await api('GET', '/usuarios?tamanio=100', null, tokenAdmin)).datos.items.filter((u) => u.nombreUsuario.startsWith('e2e_') && u.activo);
  for (const u of perfil) await api('DELETE', `/usuarios/${u.id}`, null, tokenAdmin);

  await navegador.close();
}

// ---------- informe ----------
function escribirInforme() {
  const total = resultados.length;
  const correctos = resultados.filter((r) => r.ok).length;
  const ahora = new Date();
  const fecha = `${aFecha(ahora)} ${dos(ahora.getHours())}:${dos(ahora.getMinutes())}`;
  const grupos = [...new Set(resultados.map((r) => r.grupo))];
  const celda = (t) => t.replace(/\|/g, '/');

  let md = '# Resultados de las pruebas de punta a punta\n\n';
  md += `Ejecución del ${fecha} contra el frontend \`${WEB}\` y la API \`${API}\`, en un navegador Chrome real.\n\n`;
  md += `**Resultado: ${correctos} de ${total} casos correctos${correctos === total ? '' : ` (${total - correctos} con fallas)`}.**\n\n`;
  md += 'Este archivo lo genera `docs/pruebas/e2e/ejecutar-e2e.js`. Cómo se ejecutan y qué recorre cada grupo está en [documentacion-de-pruebas.md](documentacion-de-pruebas.md).\n';
  for (const g of grupos) {
    md += `\n## ${g}\n\n| Caso | Descripción | Resultado |\n|---|---|---|\n`;
    for (const r of resultados.filter((x) => x.grupo === g)) {
      md += `| ${r.id} | ${celda(r.descripcion)} | ${r.ok ? '✅ Correcto' : '❌ Falla: ' + celda(r.detalle)} |\n`;
    }
  }
  const destino = process.env.RESULTADOS || path.join(__dirname, '..', 'resultados-e2e.md');
  fs.writeFileSync(destino, md, 'utf8');
  console.log(`\nResultado: ${correctos} de ${total} casos correctos. Informe: ${destino}`);
  return correctos === total;
}

main()
  .catch((e) => { console.error('\nLa ejecución se interrumpió:', e.message); resultados.push({ id: 'ERROR', grupo: grupoActual || 'General', descripcion: 'La ejecución se interrumpió', ok: false, detalle: e.message }); })
  .finally(() => { process.exitCode = escribirInforme() ? 0 : 1; });
