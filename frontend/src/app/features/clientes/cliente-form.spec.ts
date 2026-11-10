import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { Cliente, ClientesService } from './clientes.service';
import { ClienteForm } from './cliente-form';

describe('ClienteForm', () => {
  let servicio: { crear: ReturnType<typeof vi.fn>; modificar: ReturnType<typeof vi.fn> };
  let dialogo: { close: ReturnType<typeof vi.fn> };
  const existente: Cliente = { id: 7, nombre: 'Ana', apellido: 'Pérez', telefono: '1111', email: 'ana@mail.com', activo: false };

  async function crear(cliente: Cliente | null) {
    servicio = { crear: vi.fn(), modificar: vi.fn() };
    dialogo = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ClienteForm],
      providers: [
        { provide: ClientesService, useValue: servicio },
        { provide: MatDialogRef, useValue: dialogo },
        { provide: MAT_DIALOG_DATA, useValue: cliente },
      ],
    });
    const fixture = TestBed.createComponent(ClienteForm);
    await fixture.whenStable();
    return fixture;
  }

  const texto = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent!.replace(/\s+/g, ' ');
  const completo = { nombre: 'Ana', apellido: 'Pérez', telefono: '11 4555-1000', email: '' };

  it('titulo_de_alta_y_de_edicion', async () => {
    expect(texto(await crear(null))).toContain('Nuevo cliente');
    TestBed.resetTestingModule();
    expect(texto(await crear(existente))).toContain('Editar cliente');
  });

  it.each(['nombre', 'apellido', 'telefono'])('no_envia_si_falta_%s', async (campo) => {
    const fixture = await crear(null);
    fixture.componentInstance.form.setValue({ ...completo, [campo]: '' });

    fixture.componentInstance.guardar();

    expect(servicio.crear).not.toHaveBeenCalled();
  });

  it('no_envia_si_el_email_es_invalido', async () => {
    const fixture = await crear(null);
    fixture.componentInstance.form.setValue({ ...completo, email: 'no-es-un-email' });

    fixture.componentInstance.guardar();

    expect(servicio.crear).not.toHaveBeenCalled();
  });

  it('crea_con_email_null_si_se_deja_vacio_y_cierra_con_true', async () => {
    const fixture = await crear(null);
    servicio.crear.mockReturnValue(of({}));
    fixture.componentInstance.form.setValue({ ...completo, email: '' });

    fixture.componentInstance.guardar();

    expect(servicio.crear).toHaveBeenCalledWith({
      nombre: 'Ana', apellido: 'Pérez', telefono: '11 4555-1000', email: null, activo: true,
    });
    expect(dialogo.close).toHaveBeenCalledWith(true);
  });

  it('crea_con_el_email_cuando_se_completa', async () => {
    const fixture = await crear(null);
    servicio.crear.mockReturnValue(of({}));
    fixture.componentInstance.form.setValue({ ...completo, email: 'ana@mail.com' });

    fixture.componentInstance.guardar();

    expect(servicio.crear).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@mail.com' }));
  });

  it('edicion_precarga_los_datos_y_conserva_el_estado_activo', async () => {
    const fixture = await crear(existente);
    servicio.modificar.mockReturnValue(of({}));
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      nombre: 'Ana', apellido: 'Pérez', telefono: '1111', email: 'ana@mail.com',
    });

    fixture.componentInstance.form.patchValue({ telefono: '2222' });
    fixture.componentInstance.guardar();

    expect(servicio.modificar).toHaveBeenCalledWith(7, {
      nombre: 'Ana', apellido: 'Pérez', telefono: '2222', email: 'ana@mail.com', activo: false,
    });
    expect(servicio.crear).not.toHaveBeenCalled();
    expect(dialogo.close).toHaveBeenCalledWith(true);
  });

  it('muestra_el_error_de_la_API_y_no_cierra', async () => {
    const fixture = await crear(null);
    servicio.crear.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    fixture.componentInstance.form.setValue(completo);

    fixture.componentInstance.guardar();
    await fixture.whenStable();

    expect(texto(fixture)).toContain('No se pudo conectar con el servidor');
    expect(dialogo.close).not.toHaveBeenCalled();
  });
});
