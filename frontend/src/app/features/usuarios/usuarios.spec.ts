import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { ConfirmarDialog } from '../../shared/confirmar-dialog';
import { ResetearPasswordDialog } from './resetear-password-dialog';
import { UsuarioForm } from './usuario-form';
import { Usuario, UsuariosService } from './usuarios.service';
import { Usuarios } from './usuarios';

describe('Usuarios', () => {
  let servicio: { listar: ReturnType<typeof vi.fn>; desactivar: ReturnType<typeof vi.fn>; modificar: ReturnType<typeof vi.fn> };
  let dialogo: { open: ReturnType<typeof vi.fn> };
  let aviso: { open: ReturnType<typeof vi.fn> };

  const admin: Usuario = { id: 1, nombreUsuario: 'admin', nombreCompleto: 'Administrador', rol: 'Admin', activo: true };
  const ana: Usuario = { id: 2, nombreUsuario: 'ana', nombreCompleto: 'Ana Pérez', rol: 'Operador', activo: false };

  async function crear() {
    servicio = { listar: vi.fn().mockReturnValue(of([admin, ana])), desactivar: vi.fn(), modificar: vi.fn() };
    dialogo = { open: vi.fn() };
    aviso = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [Usuarios],
      providers: [
        { provide: UsuariosService, useValue: servicio },
        { provide: MatDialog, useValue: dialogo },
        { provide: MatSnackBar, useValue: aviso },
      ],
    });
    const fixture = TestBed.createComponent(Usuarios);
    await fixture.whenStable();
    return fixture;
  }

  // El modal responde con lo que se elija (true = confirmar o guardar)
  const responder = (r: boolean | undefined) => dialogo.open.mockReturnValue({ afterClosed: () => of(r) });
  const filas = (f: { nativeElement: HTMLElement }) => Array.from(f.nativeElement.querySelectorAll('app-grilla tbody tr'));
  const botones = (fila: Element) => Array.from(fila.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));
  const error409 = (detail: string) => throwError(() => new HttpErrorResponse({ status: 409, error: { detail } }));

  it('carga_y_muestra_los_usuarios', async () => {
    const fixture = await crear();

    expect(filas(fixture)).toHaveLength(2);
    expect(filas(fixture)[0].textContent).toContain('admin');
    expect(filas(fixture)[0].textContent).toContain('Administrador');
    expect(filas(fixture)[1].textContent).toContain('Ana Pérez');
  });

  it('los_activos_ofrecen_desactivar_y_los_inactivos_reactivar', async () => {
    const fixture = await crear();
    const [activo, inactivo] = filas(fixture);

    expect(botones(activo)).toEqual(['Editar', 'Restablecer contraseña', 'Desactivar']);
    expect(botones(inactivo)).toEqual(['Editar', 'Restablecer contraseña', 'Reactivar']);
    expect(activo.textContent).toContain('Activo');
    expect(inactivo.textContent).toContain('Inactivo');
    expect(inactivo.classList).toContain('inactiva');
    expect(activo.classList).not.toContain('inactiva');
  });

  it('avisa_si_no_hay_usuarios', async () => {
    const fixture = await crear();
    servicio.listar.mockReturnValue(of([]));

    fixture.componentInstance.cargar();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No hay usuarios');
  });

  it('nuevo_abre_el_formulario_sin_datos_y_recarga_si_se_guardo', async () => {
    const fixture = await crear();
    responder(true);

    fixture.componentInstance.nuevo();

    expect(dialogo.open).toHaveBeenCalledWith(UsuarioForm, expect.objectContaining({ data: null }));
    expect(servicio.listar).toHaveBeenCalledTimes(2);
    expect(aviso.open).toHaveBeenCalledWith('Usuario guardado', 'Cerrar', expect.anything());
  });

  it('si_se_cancela_el_formulario_no_recarga', async () => {
    const fixture = await crear();
    responder(undefined);

    fixture.componentInstance.nuevo();

    expect(servicio.listar).toHaveBeenCalledTimes(1);
    expect(aviso.open).not.toHaveBeenCalled();
  });

  it('editar_abre_el_formulario_con_el_usuario', async () => {
    const fixture = await crear();
    responder(true);

    fixture.componentInstance.editar(ana);

    expect(dialogo.open).toHaveBeenCalledWith(UsuarioForm, expect.objectContaining({ data: ana }));
  });

  it('restablecer_password_abre_el_dialogo_y_avisa_al_terminar', async () => {
    const fixture = await crear();
    responder(true);

    fixture.componentInstance.restablecerPassword(ana);

    expect(dialogo.open).toHaveBeenCalledWith(ResetearPasswordDialog, expect.objectContaining({ data: ana }));
    expect(aviso.open).toHaveBeenCalledWith('Contraseña restablecida', 'Cerrar', expect.anything());
  });

  it('desactivar_pide_confirmacion_y_si_se_confirma_desactiva_y_recarga', async () => {
    const fixture = await crear();
    servicio.desactivar.mockReturnValue(of(undefined));
    responder(true);

    fixture.componentInstance.desactivar(admin);

    expect(dialogo.open).toHaveBeenCalledWith(ConfirmarDialog, expect.objectContaining({
      data: expect.objectContaining({ textoConfirmar: 'Desactivar' }),
    }));
    expect(servicio.desactivar).toHaveBeenCalledWith(1);
    expect(servicio.listar).toHaveBeenCalledTimes(2);
    expect(aviso.open).toHaveBeenCalledWith('Usuario desactivado', 'Cerrar', expect.anything());
  });

  it('desactivar_cancelado_no_llama_al_servicio', async () => {
    const fixture = await crear();
    responder(false);

    fixture.componentInstance.desactivar(admin);

    expect(servicio.desactivar).not.toHaveBeenCalled();
  });

  it('reactivar_modifica_con_activo_true_sin_pedir_confirmacion', async () => {
    const fixture = await crear();
    servicio.modificar.mockReturnValue(of({}));

    fixture.componentInstance.reactivar(ana);

    expect(dialogo.open).not.toHaveBeenCalled();
    expect(servicio.modificar).toHaveBeenCalledWith(2, { nombreCompleto: 'Ana Pérez', rol: 'Operador', activo: true });
    expect(servicio.listar).toHaveBeenCalledTimes(2);
  });

  it('muestra_el_mensaje_de_la_API_si_no_se_puede_desactivar', async () => {
    const fixture = await crear();
    servicio.desactivar.mockReturnValue(error409('Tiene que quedar al menos un administrador activo'));
    responder(true);

    fixture.componentInstance.desactivar(admin);

    expect(aviso.open).toHaveBeenCalledWith('Tiene que quedar al menos un administrador activo', 'Cerrar', expect.anything());
    expect(servicio.listar).toHaveBeenCalledTimes(1);
  });

  it('muestra_el_mensaje_si_falla_la_carga', async () => {
    const fixture = await crear();
    servicio.listar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    fixture.componentInstance.cargar();

    expect(aviso.open).toHaveBeenCalledWith('No se pudo conectar con el servidor', 'Cerrar', expect.anything());
  });
});
