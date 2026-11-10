import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../core/api-config';
import { TurnosService } from './turnos.service';

describe('TurnosService', () => {
  let servicio: TurnosService;
  let http: HttpTestingController;
  const datos = { clienteId: 7, servicioId: 1, fechaHoraInicio: '2026-11-12T10:00:00', observaciones: null };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(TurnosService);
    http = TestBed.inject(HttpTestingController);
  });

  it('agenda_pide_GET_con_desde_y_hasta', () => {
    servicio.agenda('2026-11-10', '2026-11-11').subscribe();

    const pedido = http.expectOne((r) => r.url === `${API_URL}/turnos`);
    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.params.get('desde')).toBe('2026-11-10');
    expect(pedido.request.params.get('hasta')).toBe('2026-11-11');
  });

  it('crear_envia_POST_con_los_datos_y_la_fecha_sin_zona_horaria', () => {
    servicio.crear(datos).subscribe();

    const pedido = http.expectOne(`${API_URL}/turnos`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual(datos);
    expect(pedido.request.body.fechaHoraInicio).not.toMatch(/Z|[+-]\d\d:\d\d$/);
  });

  it('modificar_envia_PUT_al_id', () => {
    servicio.modificar(9, datos).subscribe();

    const pedido = http.expectOne(`${API_URL}/turnos/9`);
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body).toEqual(datos);
  });

  it('cancelar_envia_POST_a_cancelar', () => {
    servicio.cancelar(9).subscribe();
    expect(http.expectOne(`${API_URL}/turnos/9/cancelar`).request.method).toBe('POST');
  });

  it('marcarAtendido_envia_POST_a_atendido', () => {
    servicio.marcarAtendido(9).subscribe();
    expect(http.expectOne(`${API_URL}/turnos/9/atendido`).request.method).toBe('POST');
  });
});
