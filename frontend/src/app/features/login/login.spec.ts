import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { Login } from './login';

describe('Login', () => {
  let auth: { login: ReturnType<typeof vi.fn> };
  let navegar: ReturnType<typeof vi.fn>;

  async function crear() {
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [{ provide: AuthService, useValue: auth }, provideRouter([])],
    });
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true) as never;
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    return fixture;
  }

  beforeEach(() => {
    auth = { login: vi.fn() };
  });

  it('muestra_el_logo_a_color', async () => {
    const fixture = await crear();

    const logo = fixture.nativeElement.querySelector('img.logo') as HTMLImageElement;

    expect(logo.getAttribute('src')).toBe('logo.svg');
    expect(logo.alt).toBe('Gestión Turnos');
  });

  it('no_envia_si_el_formulario_es_invalido', async () => {
    const fixture = await crear();

    fixture.componentInstance.enviar();

    expect(auth.login).not.toHaveBeenCalled();
  });

  it('login_correcto_navega_a_agenda', async () => {
    auth.login.mockReturnValue(of(undefined));
    const fixture = await crear();
    fixture.componentInstance.form.setValue({ nombreUsuario: 'ana', password: 'clave' });

    fixture.componentInstance.enviar();

    expect(auth.login).toHaveBeenCalledWith('ana', 'clave');
    expect(navegar).toHaveBeenCalledWith('/agenda');
  });

  it('login_con_401_muestra_usuario_o_contrasena_incorrectos', async () => {
    auth.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const fixture = await crear();
    fixture.componentInstance.form.setValue({ nombreUsuario: 'ana', password: 'mala' });

    fixture.componentInstance.enviar();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Usuario o contraseña incorrectos');
    expect(navegar).not.toHaveBeenCalled();
  });

  it('login_sin_conexion_muestra_que_no_se_pudo_conectar', async () => {
    auth.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    const fixture = await crear();
    fixture.componentInstance.form.setValue({ nombreUsuario: 'ana', password: 'clave' });

    fixture.componentInstance.enviar();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No se pudo conectar con el servidor');
  });
});
