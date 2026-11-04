import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from './api-config';
import { AuthService } from './auth.service';

const respuestaLogin = (rol = 'Operador', expira = '2999-01-01T00:00:00Z') => ({
  token: 'tok123',
  nombreUsuario: 'ana',
  nombreCompleto: 'Ana Pérez',
  rol,
  expira,
});

describe('AuthService', () => {
  let http: HttpTestingController;

  // Se crea después de preparar localStorage, porque lee la sesión al construirse
  function crearServicio(): AuthService {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  beforeEach(() => localStorage.clear());

  it('login_guarda_la_sesion_y_estaAutenticado_es_true', () => {
    const auth = crearServicio();

    auth.login('ana', 'clave').subscribe();
    const pedido = http.expectOne(`${API_URL}/auth/login`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({ nombreUsuario: 'ana', password: 'clave' });
    pedido.flush(respuestaLogin());

    expect(auth.estaAutenticado()).toBe(true);
    expect(auth.token()).toBe('tok123');
    expect(JSON.parse(localStorage.getItem('sesion')!).nombreUsuario).toBe('ana');
  });

  it('login_fallido_no_guarda_sesion', () => {
    const auth = crearServicio();

    auth.login('ana', 'mala').subscribe({ error: () => {} });
    http.expectOne(`${API_URL}/auth/login`).flush('', { status: 401, statusText: 'Unauthorized' });

    expect(auth.estaAutenticado()).toBe(false);
    expect(localStorage.getItem('sesion')).toBeNull();
  });

  it('logout_borra_la_sesion', () => {
    const auth = crearServicio();
    auth.login('ana', 'clave').subscribe();
    http.expectOne(`${API_URL}/auth/login`).flush(respuestaLogin());

    auth.logout();

    expect(auth.estaAutenticado()).toBe(false);
    expect(auth.token()).toBeNull();
    expect(localStorage.getItem('sesion')).toBeNull();
  });

  it('esAdmin_es_true_solo_para_rol_Admin', () => {
    const auth = crearServicio();
    expect(auth.esAdmin()).toBe(false);

    auth.login('ana', 'clave').subscribe();
    http.expectOne(`${API_URL}/auth/login`).flush(respuestaLogin('Operador'));
    expect(auth.esAdmin()).toBe(false);

    auth.login('ana', 'clave').subscribe();
    http.expectOne(`${API_URL}/auth/login`).flush(respuestaLogin('Admin'));
    expect(auth.esAdmin()).toBe(true);
  });

  it('sesion_vencida_en_localStorage_se_descarta_al_iniciar', () => {
    localStorage.setItem('sesion', JSON.stringify(respuestaLogin('Admin', '2000-01-01T00:00:00Z')));

    const auth = crearServicio();

    expect(auth.estaAutenticado()).toBe(false);
    expect(localStorage.getItem('sesion')).toBeNull();
  });

  it('sesion_vigente_en_localStorage_se_restaura_al_iniciar', () => {
    localStorage.setItem('sesion', JSON.stringify(respuestaLogin('Admin')));

    const auth = crearServicio();

    expect(auth.estaAutenticado()).toBe(true);
    expect(auth.esAdmin()).toBe(true);
  });

  it('sesion_guardada_con_formato_invalido_se_ignora', () => {
    localStorage.setItem('sesion', 'esto no es json');

    const auth = crearServicio();

    expect(auth.estaAutenticado()).toBe(false);
  });

  it('cambiarPassword_envia_POST_con_las_dos_claves', () => {
    const auth = crearServicio();

    auth.cambiarPassword('vieja1234', 'nueva1234').subscribe();

    const pedido = http.expectOne(`${API_URL}/auth/cambiar-password`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({ passwordActual: 'vieja1234', passwordNueva: 'nueva1234' });
    pedido.flush(null, { status: 204, statusText: 'No Content' });
  });
});
