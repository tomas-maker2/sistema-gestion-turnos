import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../core/api-config';
import { ClientesService } from './clientes.service';

describe('ClientesService', () => {
  let servicio: ClientesService;
  let http: HttpTestingController;
  const datos = { nombre: 'Ana', apellido: 'Pérez', telefono: '1111', email: null, activo: true };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(ClientesService);
    http = TestBed.inject(HttpTestingController);
  });

  it('listar_sin_filtros_no_envia_parametros', () => {
    servicio.listar().subscribe();
    const pedido = http.expectOne((r) => r.url === `${API_URL}/clientes`);
    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.params.keys()).toEqual([]);
  });

  it('listar_envia_texto_e_incluirInactivos', () => {
    servicio.listar('ana', true).subscribe();
    const pedido = http.expectOne((r) => r.url === `${API_URL}/clientes`);
    expect(pedido.request.params.get('texto')).toBe('ana');
    expect(pedido.request.params.get('incluirInactivos')).toBe('true');
  });

  it('listar_ignora_un_texto_en_blanco', () => {
    servicio.listar('   ', false).subscribe();
    const pedido = http.expectOne((r) => r.url === `${API_URL}/clientes`);
    expect(pedido.request.params.has('texto')).toBe(false);
  });

  it('crear_envia_POST_con_los_datos', () => {
    servicio.crear(datos).subscribe();
    const pedido = http.expectOne(`${API_URL}/clientes`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual(datos);
  });

  it('modificar_envia_PUT_al_id', () => {
    servicio.modificar(7, datos).subscribe();
    const pedido = http.expectOne(`${API_URL}/clientes/7`);
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body).toEqual(datos);
  });

  it('desactivar_envia_DELETE_al_id', () => {
    servicio.desactivar(7).subscribe();
    expect(http.expectOne(`${API_URL}/clientes/7`).request.method).toBe('DELETE');
  });
});
