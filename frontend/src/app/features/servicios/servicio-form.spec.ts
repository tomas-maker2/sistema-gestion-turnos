import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { Servicio, ServiciosService } from './servicios.service';
import { ServicioForm } from './servicio-form';

describe('ServicioForm', () => {
  let servicio: { crear: ReturnType<typeof vi.fn>; modificar: ReturnType<typeof vi.fn> };
  let dialogo: { close: ReturnType<typeof vi.fn> };
  const existente: Servicio = { id: 3, nombre: 'Corte', duracionMinutos: 30, activo: false };

  async function crear(datos: Servicio | null) {
    servicio = { crear: vi.fn(), modificar: vi.fn() };
    dialogo = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ServicioForm],
      providers: [
        { provide: ServiciosService, useValue: servicio },
        { provide: MatDialogRef, useValue: dialogo },
        { provide: MAT_DIALOG_DATA, useValue: datos },
      ],
    });
    const fixture = TestBed.createComponent(ServicioForm);
    await fixture.whenStable();
    return fixture;
  }

  const texto = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent!.replace(/\s+/g, ' ');

  it('titulo_de_alta_y_duracion_por_defecto_de_30_minutos', async () => {
    const fixture = await crear(null);
    expect(texto(fixture)).toContain('Nuevo servicio');
    expect(fixture.componentInstance.form.getRawValue().duracionMinutos).toBe(30);
  });

  it('no_envia_sin_nombre', async () => {
    const fixture = await crear(null);
    fixture.componentInstance.form.patchValue({ nombre: '' });

    fixture.componentInstance.guardar();

    expect(servicio.crear).not.toHaveBeenCalled();
  });

  it.each([4, 481, 0, -5, 30.5])('no_envia_con_duracion_%s', async (minutos) => {
    const fixture = await crear(null);
    fixture.componentInstance.form.patchValue({ nombre: 'Corte', duracionMinutos: minutos });

    fixture.componentInstance.guardar();

    expect(servicio.crear).not.toHaveBeenCalled();
  });

  it.each([5, 480])('envia_con_duracion_en_el_limite_%i', async (minutos) => {
    const fixture = await crear(null);
    servicio.crear.mockReturnValue(of({}));
    fixture.componentInstance.form.patchValue({ nombre: 'Corte', duracionMinutos: minutos });

    fixture.componentInstance.guardar();

    expect(servicio.crear).toHaveBeenCalledWith({ nombre: 'Corte', duracionMinutos: minutos, activo: true });
    expect(dialogo.close).toHaveBeenCalledWith(true);
  });

  it('edicion_precarga_los_datos_y_conserva_el_estado_activo', async () => {
    const fixture = await crear(existente);
    servicio.modificar.mockReturnValue(of({}));
    expect(texto(fixture)).toContain('Editar servicio');
    expect(fixture.componentInstance.form.getRawValue()).toEqual({ nombre: 'Corte', duracionMinutos: 30 });

    fixture.componentInstance.form.patchValue({ duracionMinutos: 45 });
    fixture.componentInstance.guardar();

    expect(servicio.modificar).toHaveBeenCalledWith(3, { nombre: 'Corte', duracionMinutos: 45, activo: false });
    expect(servicio.crear).not.toHaveBeenCalled();
    expect(dialogo.close).toHaveBeenCalledWith(true);
  });

  it('muestra_el_error_de_la_API_y_no_cierra', async () => {
    const fixture = await crear(null);
    servicio.crear.mockReturnValue(throwError(() =>
      new HttpErrorResponse({ status: 409, error: { detail: 'Ya existe un servicio con ese nombre' } })));
    fixture.componentInstance.form.patchValue({ nombre: 'Corte' });

    fixture.componentInstance.guardar();
    await fixture.whenStable();

    expect(texto(fixture)).toContain('Ya existe un servicio con ese nombre');
    expect(dialogo.close).not.toHaveBeenCalled();
  });
});
