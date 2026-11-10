import { HttpErrorResponse } from '@angular/common/http';
import { mensajeDeError } from './errores';

describe('mensajeDeError', () => {
  it('usa_el_detail_que_manda_la_API', () => {
    const e = new HttpErrorResponse({ status: 409, error: { detail: 'Ya existe un usuario con ese nombre', title: 'Regla de negocio' } });
    expect(mensajeDeError(e)).toBe('Ya existe un usuario con ese nombre');
  });

  it('usa_el_title_si_no_hay_detail', () => {
    const e = new HttpErrorResponse({ status: 404, error: { title: 'No encontrado' } });
    expect(mensajeDeError(e)).toBe('No encontrado');
  });

  it('avisa_si_no_hay_conexion', () => {
    expect(mensajeDeError(new HttpErrorResponse({ status: 0 }))).toBe('No se pudo conectar con el servidor');
  });

  it('en_errores_de_validacion_pide_revisar_los_datos', () => {
    const e = new HttpErrorResponse({ status: 400, error: { title: 'One or more validation errors occurred.', errors: { Nombre: ['x'] } } });
    expect(mensajeDeError(e)).toBe('Revisá los datos ingresados');
  });

  it('da_un_mensaje_generico_si_no_hay_nada_mas', () => {
    expect(mensajeDeError(new HttpErrorResponse({ status: 500 }))).toBe('Ocurrió un error, intentá de nuevo');
  });
});
