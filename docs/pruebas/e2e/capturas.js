/*
  Genera las capturas de pantalla de la guía de uso en docs/img/uso/.
  Usar con una base recién cargada con database/datos-de-ejemplo.sql (para que la agenda tenga turnos).
  Variables de entorno opcionales: WEB_URL, CHROME_PATH (igual que ejecutar-e2e.js).
*/
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const WEB = process.env.WEB_URL || 'http://localhost:4200';
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SALIDA = path.join(__dirname, '..', '..', 'img', 'uso');
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(SALIDA, { recursive: true });
  const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const p = await navegador.newPage();
  await p.setViewport({ width: 1200, height: 760 });

  const foto = async (nombre) => { await pausa(700); await p.screenshot({ path: path.join(SALIDA, `${nombre}.png`) }); console.log('captura', nombre); };
  const ir = async (ruta) => { await p.goto(WEB + ruta, { waitUntil: 'networkidle0' }); await pausa(300); };
  const clic = (sel) => p.evaluate((s) => document.querySelector(s).click(), sel);
  const botonDe = (ambito, texto) => p.evaluate((a, t) => {
    [...document.querySelectorAll(`${a} button`)].find((b) => b.textContent.includes(t) || b.getAttribute('aria-label') === t).click();
  }, ambito, texto);
  const cerrarDialogo = async () => { await p.keyboard.press('Escape'); await pausa(400); };

  // Login
  await ir('/login');
  await p.evaluate(() => localStorage.clear());
  await ir('/login');
  await foto('01-login');
  await p.type('input[formcontrolname=nombreUsuario]', 'admin');
  await p.type('input[formcontrolname=password]', 'Admin1234!');
  await clic('button[type=submit]');
  await p.waitForSelector('nav a');

  // Agenda: día, semana y alta de turno
  await p.waitForSelector('article.turno');
  await foto('02-agenda-dia');
  await botonDe('section.listado', 'Semana');
  await pausa(700);
  await foto('03-agenda-semana');
  await botonDe('section.listado', 'Día');
  await pausa(500);
  await botonDe('section.listado .encabezado', 'Nuevo turno');
  await p.waitForSelector('mat-dialog-container');
  await foto('04-turno-nuevo');
  await cerrarDialogo();

  // Gestión
  await ir('/clientes');
  await p.waitForSelector('app-grilla tbody tr');
  await foto('05-clientes');
  await botonDe('section.listado .encabezado', 'Nuevo cliente');
  await p.waitForSelector('mat-dialog-container');
  await foto('06-cliente-formulario');
  await cerrarDialogo();

  await ir('/servicios');
  await p.waitForSelector('app-grilla tbody tr');
  await foto('07-servicios');

  await ir('/usuarios');
  await p.waitForSelector('app-grilla tbody tr');
  await foto('08-usuarios');

  // Perfil y cierre de sesión
  await clic('button[aria-label="Mi perfil"]');
  await p.waitForSelector('mat-dialog-container');
  await foto('09-perfil');
  await cerrarDialogo();
  await clic('button[aria-label="Cerrar sesión"]');
  await p.waitForSelector('mat-dialog-container');
  await foto('10-cerrar-sesion');

  await navegador.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
