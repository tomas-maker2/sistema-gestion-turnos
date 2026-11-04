import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { PerfilDialog } from './perfil-dialog';

describe('PerfilDialog', () => {
  let auth: { sesion: ReturnType<typeof signal>; cambiarPassword: ReturnType<typeof vi.fn> };
  let dialogo: { close: ReturnType<typeof vi.fn> };

  async function crear(rol = 'Admin') {
    auth = {
      sesion: signal({ nombreCompleto: 'Ana Pérez', nombreUsuario: 'ana', rol }),
      cambiarPassword: vi.fn(),
    };
    dialogo = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [PerfilDialog],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: MatDialogRef, useValue: dialogo },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(PerfilDialog);
    await fixture.whenStable();
    return fixture;
  }

  const texto = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent!.replace(/\s+/g, ' ');
  const campos = (f: { nativeElement: HTMLElement }) => f.nativeElement.querySelectorAll('input').length;

  function rellenar(fixture: Awaited<ReturnType<typeof crear>>, actual: string, nueva: string, confirmacion: string) {
    fixture.componentInstance.form.setValue({ passwordActual: actual, passwordNueva: nueva, confirmacion });
  }

  it('muestra_nombre_usuario_y_rol_del_usuario', async () => {
    const fixture = await crear('Admin');

    expect(texto(fixture)).toContain('Ana Pérez');
    expect(texto(fixture)).toContain('ana');
    expect(texto(fixture)).toContain('Administrador');
  });

  it('muestra_Operador_como_rol_de_un_operador', async () => {
    const fixture = await crear('Operador');
    expect(texto(fixture)).toContain('Operador');
    expect(texto(fixture)).not.toContain('Administrador');
  });

  it('el_formulario_de_clave_esta_oculto_hasta_pedir_el_cambio', async () => {
    const fixture = await crear();
    expect(campos(fixture)).toBe(0);

    fixture.componentInstance.cambiando.set(true);
    await fixture.whenStable();

    expect(campos(fixture)).toBe(3);
  });

  it('cancelar_el_cambio_oculta_el_formulario_y_lo_limpia', async () => {
    const fixture = await crear();
    fixture.componentInstance.cambiando.set(true);
    rellenar(fixture, 'vieja1234', 'nueva1234', 'nueva1234');

    fixture.componentInstance.cancelarCambio();
    await fixture.whenStable();

    expect(campos(fixture)).toBe(0);
    expect(fixture.componentInstance.form.getRawValue().passwordActual).toBe('');
  });

  it('no_envia_si_la_confirmacion_no_coincide', async () => {
    const fixture = await crear();
    rellenar(fixture, 'vieja1234', 'nueva1234', 'otra12345');

    fixture.componentInstance.enviar();

    expect(auth.cambiarPassword).not.toHaveBeenCalled();
  });

  it('muestra_un_mensaje_si_la_confirmacion_no_coincide', async () => {
    const fixture = await crear();
    fixture.componentInstance.cambiando.set(true);
    rellenar(fixture, 'vieja1234', 'nueva1234', 'otra12345');

    fixture.componentInstance.enviar();
    await fixture.whenStable();

    expect(texto(fixture)).toContain('Las contraseñas no coinciden');
  });

  it('no_envia_si_la_clave_nueva_tiene_menos_de_8_caracteres', async () => {
    const fixture = await crear();
    rellenar(fixture, 'vieja1234', 'corta', 'corta');

    fixture.componentInstance.enviar();

    expect(auth.cambiarPassword).not.toHaveBeenCalled();
  });

  it('envia_las_claves_y_cierra_el_dialogo', async () => {
    const fixture = await crear();
    auth.cambiarPassword.mockReturnValue(of(undefined));
    rellenar(fixture, 'vieja1234', 'nueva1234', 'nueva1234');

    fixture.componentInstance.enviar();

    expect(auth.cambiarPassword).toHaveBeenCalledWith('vieja1234', 'nueva1234');
    expect(dialogo.close).toHaveBeenCalled();
  });

  it('muestra_el_detalle_del_error_de_la_API', async () => {
    const fixture = await crear();
    auth.cambiarPassword.mockReturnValue(throwError(() =>
      new HttpErrorResponse({ status: 400, error: { detail: 'La contraseña actual es incorrecta' } })));
    fixture.componentInstance.cambiando.set(true);
    rellenar(fixture, 'mala12345', 'nueva1234', 'nueva1234');

    fixture.componentInstance.enviar();
    await fixture.whenStable();

    expect(texto(fixture)).toContain('La contraseña actual es incorrecta');
    expect(dialogo.close).not.toHaveBeenCalled();
  });
});
