// Utilidades de fechas. Todo trabaja en hora local y sin zona horaria, que es como lo maneja la API.

const dos = (n: number): string => String(n).padStart(2, '0');

// "2026-11-10"
export const aFecha = (d: Date): string => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

// "2026-11-10T09:05": el formato del campo <input type="datetime-local">
export const aEntradaLocal = (d: Date): string => `${aFecha(d)}T${dos(d.getHours())}:${dos(d.getMinutes())}`;

// "2026-11-10T09:05:07": el formato que recibe la API
export const aTextoLocal = (d: Date): string => `${aEntradaLocal(d)}:${dos(d.getSeconds())}`;

// Se arma con las partes para que la zona horaria no corra el día (new Date("2026-11-10") lo toma en UTC)
export const desdeFecha = (texto: string): Date => {
  const [anio, mes, dia] = texto.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
};

// Acepta "2026-11-10T09:05" y "2026-11-10T09:05:00"
export const desdeEntradaLocal = (texto: string): Date => {
  const [fecha, horaTexto] = texto.split('T');
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [horas, minutos] = horaTexto.split(':').map(Number);
  return new Date(anio, mes - 1, dia, horas, minutos);
};

// "09:05" a partir de "2026-11-10T09:05:00"
export const hora = (texto: string): string => texto.slice(11, 16);

// Devuelve la medianoche del día resultante
export const sumarDias = (d: Date, dias: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias);

// La semana va de lunes a domingo
export const lunesDeLaSemana = (d: Date): Date => sumarDias(d, -((d.getDay() + 6) % 7));

export const esMismoDia = (a: Date, b: Date): boolean => aFecha(a) === aFecha(b);

const formato = (opciones: Intl.DateTimeFormatOptions, d: Date): string => new Intl.DateTimeFormat('es-AR', opciones).format(d);
const capitalizar = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

// "Martes, 10 de noviembre de 2026"
export const formatoDia = (d: Date): string =>
  capitalizar(formato({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, d));

// "Martes, 10 de noviembre"
export const formatoDiaCorto = (d: Date): string =>
  capitalizar(formato({ weekday: 'long', day: 'numeric', month: 'long' }, d));

// "9 de noviembre al 15 de noviembre de 2026"
export const formatoSemana = (lunes: Date): string =>
  `${formato({ day: 'numeric', month: 'long' }, lunes)} al ${formato({ day: 'numeric', month: 'long', year: 'numeric' }, sumarDias(lunes, 6))}`;
