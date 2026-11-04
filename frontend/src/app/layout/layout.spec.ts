import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ConfirmarDialog } from '../shared/confirmar-dialog';
import { Layout } from './layout';
import { PerfilDialog } from './perfil-dialog';

describe('Layout', () => {
  let auth: { sesion: ReturnType<typeof signal>; esAdmin: ReturnType<typeof signal>; logout: ReturnType<typeof vi.fn> };
  let dialogo: { open: ReturnType<typeof vi.fn>; closeAll: ReturnType<typeof vi.fn> };

  async function crear(esAdmin: boolean) {
    auth = {
      sesion: signal({ nombreCompleto: 'Ana Pérez', rol: esAdmin ? 'Admin' : 'Operador' }),
      esAdmin: signal(esAdmin),
      logout: vi.fn(),
    };
    dialogo = { open: vi.fn(), closeAll: vi.fn() };
    TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: MatDialog, useValue: dialogo },
        provideRouter([]),
      ],
    });
    const fixture = TestBed.createComponent(Layout);
    await fixture.whenStable();
    return fixture;
  }

  // El modal responde con lo que se elija (true = confirmar)
  function responderModal(respuesta: boolean | undefined) {
    dialogo.open.mockReturnValue({ afterClosed: () => of(respuesta) });
  }

  function enlaces(fixture: { nativeElement: HTMLElement }): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('nav a')).map((a) => a.textContent!.trim());
  }

  // Los botones de la barra son íconos: se distinguen por su etiqueta de accesibilidad
  function botones(fixture: { nativeElement: HTMLElement }): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('mat-toolbar button')).map((b) => b.getAttribute('aria-label')!);
  }

  it('el_Admin_ve_los_cuatro_enlaces', async () => {
    const fixture = await crear(true);
    expect(enlaces(fixture)).toEqual(['Agenda', 'Clientes', 'Servicios', 'Usuarios']);
  });

  it('el_Operador_no_ve_el_enlace_Usuarios', async () => {
    const fixture = await crear(false);
    expect(enlaces(fixture)).toEqual(['Agenda', 'Clientes', 'Servicios']);
  });

  it('muestra_el_logo_blanco_a_la_izquierda_y_lleva_a_la_agenda', async () => {
    const fixture = await crear(false);

    const enlace = fixture.nativeElement.querySelector('mat-toolbar a.marca') as HTMLAnchorElement;
    const logo = enlace.querySelector('img') as HTMLImageElement;

    expect(logo.getAttribute('src')).toBe('logo-blanco.svg');
    expect(logo.alt).toBe('Gestión Turnos');
    expect(enlace.getAttribute('href')).toBe('/agenda');
    expect(enlace.matches('mat-toolbar > a:first-child')).toBe(true);
  });

  it('la_barra_tiene_solo_los_botones_de_perfil_y_cerrar_sesion', async () => {
    const fixture = await crear(false);
    expect(botones(fixture)).toEqual(['Mi perfil', 'Cerrar sesión']);
  });

  it('la_barra_ya_no_muestra_el_nombre_del_usuario', async () => {
    const fixture = await crear(false);
    expect(fixture.nativeElement.textContent).not.toContain('Ana Pérez');
  });

  it('el_icono_de_usuario_abre_el_perfil', async () => {
    const fixture = await crear(false);

    fixture.nativeElement.querySelector('button[aria-label="Mi perfil"]').click();

    expect(dialogo.open).toHaveBeenCalledWith(PerfilDialog, expect.anything());
  });

  it('el_icono_de_logout_abre_la_confirmacion', async () => {
    const fixture = await crear(false);
    responderModal(false);

    fixture.nativeElement.querySelector('button[aria-label="Cerrar sesión"]').click();

    expect(dialogo.open).toHaveBeenCalledWith(ConfirmarDialog, expect.anything());
  });

  it('al_salir_de_la_pantalla_cierra_los_dialogos_abiertos', async () => {
    const fixture = await crear(false);

    fixture.destroy();

    expect(dialogo.closeAll).toHaveBeenCalled();
  });

  it('logout_pide_confirmacion_antes_de_cerrar_la_sesion', async () => {
    const fixture = await crear(false);
    responderModal(false);

    fixture.componentInstance.cerrarSesion();

    expect(dialogo.open).toHaveBeenCalledWith(ConfirmarDialog, expect.objectContaining({
      data: expect.objectContaining({ textoConfirmar: 'Logout' }),
    }));
  });

  it('logout_cancelado_no_cierra_la_sesion', async () => {
    const fixture = await crear(false);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    for (const respuesta of [false, undefined]) { // undefined = se cerró el modal sin elegir
      responderModal(respuesta);
      fixture.componentInstance.cerrarSesion();
    }

    expect(auth.logout).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('logout_confirmado_cierra_la_sesion_y_vuelve_al_login', async () => {
    const fixture = await crear(false);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    responderModal(true);

    fixture.componentInstance.cerrarSesion();

    expect(auth.logout).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });
});
