import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { Usuario, UsuariosService } from './usuarios.service';
import { UsuarioForm } from './usuario-form';

describe('UsuarioForm', () => {
  let servicio: { crear: ReturnType<typeof vi.fn>; modificar: ReturnType<typeof vi.fn> };
  let dialogo: { close: ReturnType<typeof vi.fn> };
  const existente: Usuario = { id: 5, nombreUsuario: 'ana', nombreCompleto: 'Ana Pérez', rol: 'Admin', activo: false };

  async function crear(usuario: Usuario | null) {
    servicio = { crear: vi.fn(), modificar: vi.fn() };
    dialogo = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [UsuarioForm],
      providers: [
        { provide: UsuariosService, useValue: servicio },
        { provide: MatDialogRef, useValue: dialogo },
        { provide: MAT_DIALOG_DATA, useValue: usuario },
      ],
    });
    const fixture = TestBed.createComponent(UsuarioForm);
    await fixture.whenStable();
    return fixture;
  }

  const texto = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent!.replace(/\s+/g, ' ');

  describe('alta', () => {
    it('titulo_y_rol_por_defecto', async () => {
      const fixture = await crear(null);
      expect(texto(fixture)).toContain('Nuevo usuario');
      expect(fixture.componentInstance.form.getRawValue().rol).toBe('Operador');
    });

    it('no_envia_si_faltan_datos', async () => {
      const fixture = await crear(null);

      fixture.componentInstance.guardar();

      expect(servicio.crear).not.toHaveBeenCalled();
    });

    it('no_envia_si_la_clave_tiene_menos_de_8_caracteres', async () => {
      const fixture = await crear(null);
      fixture.componentInstance.form.patchValue({ nombreUsuario: 'ana', nombreCompleto: 'Ana', password: 'corta' });

      fixture.componentInstance.guardar();

      expect(servicio.crear).not.toHaveBeenCalled();
    });

    it('crea_con_los_datos_y_cierra_con_true', async () => {
      const fixture = await crear(null);
      servicio.crear.mockReturnValue(of({}));
      fixture.componentInstance.form.patchValue({
        nombreUsuario: 'ana', nombreCompleto: 'Ana Pérez', password: 'Clave12345', rol: 'Admin',
      });

      fixture.componentInstance.guardar();

      expect(servicio.crear).toHaveBeenCalledWith({
        nombreUsuario: 'ana', nombreCompleto: 'Ana Pérez', password: 'Clave12345', rol: 'Admin',
      });
      expect(dialogo.close).toHaveBeenCalledWith(true);
    });

    it('muestra_el_error_de_la_API_y_no_cierra', async () => {
      const fixture = await crear(null);
      servicio.crear.mockReturnValue(throwError(() =>
        new HttpErrorResponse({ status: 409, error: { detail: 'Ya existe un usuario con ese nombre' } })));
      fixture.componentInstance.form.patchValue({ nombreUsuario: 'ana', nombreCompleto: 'Ana', password: 'Clave12345' });

      fixture.componentInstance.guardar();
      await fixture.whenStable();

      expect(texto(fixture)).toContain('Ya existe un usuario con ese nombre');
      expect(dialogo.close).not.toHaveBeenCalled();
    });
  });

  describe('edicion', () => {
    it('precarga_los_datos_y_no_deja_cambiar_usuario_ni_clave', async () => {
      const fixture = await crear(existente);
      const { form } = fixture.componentInstance;

      expect(texto(fixture)).toContain('Editar usuario');
      expect(form.getRawValue()).toMatchObject({ nombreUsuario: 'ana', nombreCompleto: 'Ana Pérez', rol: 'Admin' });
      expect(form.controls.nombreUsuario.disabled).toBe(true);
      expect(form.controls.password.disabled).toBe(true);
    });

    it('modifica_y_conserva_el_estado_activo', async () => {
      const fixture = await crear(existente);
      servicio.modificar.mockReturnValue(of({}));
      fixture.componentInstance.form.patchValue({ nombreCompleto: 'Ana García', rol: 'Operador' });

      fixture.componentInstance.guardar();

      expect(servicio.modificar).toHaveBeenCalledWith(5, { nombreCompleto: 'Ana García', rol: 'Operador', activo: false });
      expect(servicio.crear).not.toHaveBeenCalled();
      expect(dialogo.close).toHaveBeenCalledWith(true);
    });

    it('muestra_el_error_de_la_API_al_modificar', async () => {
      const fixture = await crear(existente);
      servicio.modificar.mockReturnValue(throwError(() =>
        new HttpErrorResponse({ status: 409, error: { detail: 'Tiene que quedar al menos un administrador activo' } })));

      fixture.componentInstance.guardar();
      await fixture.whenStable();

      expect(texto(fixture)).toContain('Tiene que quedar al menos un administrador activo');
      expect(dialogo.close).not.toHaveBeenCalled();
    });
  });
});
