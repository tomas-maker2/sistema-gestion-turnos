import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../core/api-config';
import { ServiciosService } from './servicios.service';

describe('ServiciosService', () => {
  let servicio: ServiciosService;
  let http: HttpTestingController;
  const datos = { nombre: 'Corte', duracionMinutos: 30, activo: true };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(ServiciosService);
    http = TestBed.inject(HttpTestingController);
  });

  it('listar_sin_filtros_no_envia_parametros', () => {
    servicio.listar().subscribe();
    const pedido = http.expectOne((r) => r.url === `${API_URL}/servicios`);
    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.params.keys()).toEqual([]);
  });

  it('listar_envia_incluirInactivos', () => {
    servicio.listar(true).subscribe();
    const pedido = http.expectOne((r) => r.url === `${API_URL}/servicios`);
    expect(pedido.request.params.get('incluirInactivos')).toBe('true');
  });

  it('crear_envia_POST_con_los_datos', () => {
    servicio.crear(datos).subscribe();
    const pedido = http.expectOne(`${API_URL}/servicios`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual(datos);
  });

  it('modificar_envia_PUT_al_id', () => {
    servicio.modificar(3, datos).subscribe();
    const pedido = http.expectOne(`${API_URL}/servicios/3`);
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body).toEqual(datos);
  });

  it('desactivar_envia_DELETE_al_id', () => {
    servicio.desactivar(3).subscribe();
    expect(http.expectOne(`${API_URL}/servicios/3`).request.method).toBe('DELETE');
  });
});
