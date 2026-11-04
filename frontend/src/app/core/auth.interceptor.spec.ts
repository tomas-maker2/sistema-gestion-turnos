import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_URL } from './api-config';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controlador: HttpTestingController;
  let auth: AuthService;
  let navegar: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    controlador = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as never;
  });

  function iniciarSesion() {
    auth.login('ana', 'clave').subscribe();
    controlador.expectOne(`${API_URL}/auth/login`).flush({
      token: 'tok123', nombreUsuario: 'ana', nombreCompleto: 'Ana', rol: 'Operador', expira: '2999-01-01T00:00:00Z',
    });
  }

  it('adjunta_Bearer_cuando_hay_token', () => {
    iniciarSesion();

    http.get(`${API_URL}/clientes`).subscribe();

    const pedido = controlador.expectOne(`${API_URL}/clientes`);
    expect(pedido.request.headers.get('Authorization')).toBe('Bearer tok123');
  });

  it('no_adjunta_Authorization_sin_token', () => {
    http.get(`${API_URL}/clientes`).subscribe();

    const pedido = controlador.expectOne(`${API_URL}/clientes`);
    expect(pedido.request.headers.has('Authorization')).toBe(false);
  });

  it('no_adjunta_el_token_a_otros_servidores', () => {
    iniciarSesion();

    http.get('https://otro-sitio.com/datos').subscribe();

    const pedido = controlador.expectOne('https://otro-sitio.com/datos');
    expect(pedido.request.headers.has('Authorization')).toBe(false);
  });

  it('hace_logout_y_va_al_login_ante_401_fuera_del_login', () => {
    iniciarSesion();

    http.get(`${API_URL}/clientes`).subscribe({ error: () => {} });
    controlador.expectOne(`${API_URL}/clientes`).flush('', { status: 401, statusText: 'Unauthorized' });

    expect(auth.estaAutenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

  it('no_hace_logout_ante_401_en_el_login', () => {
    auth.login('ana', 'mala').subscribe({ error: () => {} });
    controlador.expectOne(`${API_URL}/auth/login`).flush('', { status: 401, statusText: 'Unauthorized' });

    expect(navegar).not.toHaveBeenCalled();
  });

  it('no_hace_logout_ante_otros_errores', () => {
    iniciarSesion();

    http.get(`${API_URL}/clientes`).subscribe({ error: () => {} });
    controlador.expectOne(`${API_URL}/clientes`).flush('', { status: 400, statusText: 'Bad Request' });

    expect(auth.estaAutenticado()).toBe(true);
    expect(navegar).not.toHaveBeenCalled();
  });
});
