import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, UrlTree, provideRouter } from '@angular/router';
import { adminGuard, authGuard } from './auth.guard';

describe('guards', () => {
  function sesion(rol: string) {
    localStorage.setItem('sesion', JSON.stringify({
      token: 't', nombreUsuario: 'ana', nombreCompleto: 'Ana', rol, expira: '2999-01-01T00:00:00Z',
    }));
  }

  // Ejecuta el guard como lo haría el router y devuelve a dónde manda
  function ejecutar(guard: CanActivateFn): string | boolean {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    const resultado = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    return resultado instanceof UrlTree ? TestBed.inject(Router).serializeUrl(resultado) : (resultado as boolean);
  }

  beforeEach(() => localStorage.clear());

  it('authGuard_redirige_a_login_sin_sesion', () => {
    expect(ejecutar(authGuard)).toBe('/login');
  });

  it('authGuard_permite_el_paso_con_sesion', () => {
    sesion('Operador');
    expect(ejecutar(authGuard)).toBe(true);
  });

  it('adminGuard_redirige_a_agenda_si_es_Operador', () => {
    sesion('Operador');
    expect(ejecutar(adminGuard)).toBe('/agenda');
  });

  it('adminGuard_permite_el_paso_a_un_Admin', () => {
    sesion('Admin');
    expect(ejecutar(adminGuard)).toBe(true);
  });
});
