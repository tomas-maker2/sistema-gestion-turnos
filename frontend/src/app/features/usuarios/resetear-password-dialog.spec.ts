import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { ResetearPasswordDialog } from './resetear-password-dialog';
import { Usuario, UsuariosService } from './usuarios.service';

describe('ResetearPasswordDialog', () => {
  let servicio: { resetearPassword: ReturnType<typeof vi.fn> };
  let dialogo: { close: ReturnType<typeof vi.fn> };
  const usuario: Usuario = { id: 5, nombreUsuario: 'ana', nombreCompleto: 'Ana Pérez', rol: 'Operador', activo: true };

  async function crear() {
    servicio = { resetearPassword: vi.fn() };
    dialogo = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ResetearPasswordDialog],
      providers: [
        { provide: UsuariosService, useValue: servicio },
        { provide: MatDialogRef, useValue: dialogo },
        { provide: MAT_DIALOG_DATA, useValue: usuario },
      ],
    });
    const fixture = TestBed.createComponent(ResetearPasswordDialog);
    await fixture.whenStable();
    return fixture;
  }

  it('indica_a_que_usuario_se_le_cambia_la_clave', async () => {
    const fixture = await crear();
    expect(fixture.nativeElement.textContent).toContain('Ana Pérez');
  });

  it('no_envia_si_la_clave_tiene_menos_de_8_caracteres', async () => {
    const fixture = await crear();
    fixture.componentInstance.passwordNueva.setValue('corta');

    fixture.componentInstance.guardar();

    expect(servicio.resetearPassword).not.toHaveBeenCalled();
  });

  // Se envía el formulario como lo hace el navegador, no llamando a guardar() a mano
  it('al_enviar_el_formulario_desde_la_pantalla_se_restablece_la_clave', async () => {
    const fixture = await crear();
    servicio.resetearPassword.mockReturnValue(of(undefined));
    fixture.componentInstance.passwordNueva.setValue('ClaveNueva99');

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(servicio.resetearPassword).toHaveBeenCalledWith(5, 'ClaveNueva99');
  });

  it('envia_la_clave_nueva_y_cierra_con_true', async () => {
    const fixture = await crear();
    servicio.resetearPassword.mockReturnValue(of(undefined));
    fixture.componentInstance.passwordNueva.setValue('ClaveNueva99');

    fixture.componentInstance.guardar();

    expect(servicio.resetearPassword).toHaveBeenCalledWith(5, 'ClaveNueva99');
    expect(dialogo.close).toHaveBeenCalledWith(true);
  });

  it('muestra_el_error_de_la_API_y_no_cierra', async () => {
    const fixture = await crear();
    servicio.resetearPassword.mockReturnValue(throwError(() =>
      new HttpErrorResponse({ status: 404, error: { detail: 'El usuario no existe' } })));
    fixture.componentInstance.passwordNueva.setValue('ClaveNueva99');

    fixture.componentInstance.guardar();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('El usuario no existe');
    expect(dialogo.close).not.toHaveBeenCalled();
  });
});
