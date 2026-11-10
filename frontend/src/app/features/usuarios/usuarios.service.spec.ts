import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../core/api-config';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  let servicio: UsuariosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(UsuariosService);
    http = TestBed.inject(HttpTestingController);
  });

  it('listar_pide_la_pagina_y_el_tamanio', () => {
    servicio.listar(2, 10).subscribe();
    const pedido = http.expectOne((r) => r.url === `${API_URL}/usuarios`);
    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.params.get('pagina')).toBe('2');
    expect(pedido.request.params.get('tamanio')).toBe('10');
  });

  it('listar_sin_argumentos_pide_la_primera_pagina_de_5', () => {
    servicio.listar().subscribe();
    const pedido = http.expectOne((r) => r.url === `${API_URL}/usuarios`);
    expect(pedido.request.params.get('pagina')).toBe('1');
    expect(pedido.request.params.get('tamanio')).toBe('5');
  });

  it('crear_envia_POST_con_los_datos', () => {
    const datos = { nombreUsuario: 'ana', nombreCompleto: 'Ana Pérez', password: 'Clave12345', rol: 'Operador' as const };
    servicio.crear(datos).subscribe();
    const pedido = http.expectOne(`${API_URL}/usuarios`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual(datos);
  });

  it('modificar_envia_PUT_al_id', () => {
    const datos = { nombreCompleto: 'Ana', rol: 'Admin' as const, activo: true };
    servicio.modificar(5, datos).subscribe();
    const pedido = http.expectOne(`${API_URL}/usuarios/5`);
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body).toEqual(datos);
  });

  it('desactivar_envia_DELETE_al_id', () => {
    servicio.desactivar(5).subscribe();
    expect(http.expectOne(`${API_URL}/usuarios/5`).request.method).toBe('DELETE');
  });

  it('resetearPassword_envia_POST_con_la_clave_nueva', () => {
    servicio.resetearPassword(5, 'ClaveNueva99').subscribe();
    const pedido = http.expectOne(`${API_URL}/usuarios/5/resetear-password`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({ passwordNueva: 'ClaveNueva99' });
  });
});
