import { EstadoPaginado } from './paginado';

describe('EstadoPaginado', () => {
  it('empieza_en_la_pagina_1_con_5_por_pagina_y_sin_total', () => {
    const estado = new EstadoPaginado();

    expect(estado.pagina()).toBe(1);
    expect(estado.tamanio()).toBe(5);
    expect(estado.total()).toBe(0);
  });

  it('cambiar_actualiza_la_pagina_y_el_tamanio', () => {
    const estado = new EstadoPaginado();

    estado.cambiar({ pagina: 3, tamanio: 30 });

    expect(estado.pagina()).toBe(3);
    expect(estado.tamanio()).toBe(30);
  });

  it('volverALaPrimera_deja_el_tamanio_como_estaba', () => {
    const estado = new EstadoPaginado();
    estado.cambiar({ pagina: 4, tamanio: 10 });

    estado.volverALaPrimera();

    expect(estado.pagina()).toBe(1);
    expect(estado.tamanio()).toBe(10);
  });

  it('actualizar_guarda_el_total_y_no_pide_recargar_si_la_pagina_tiene_datos', () => {
    const estado = new EstadoPaginado();
    estado.cambiar({ pagina: 2, tamanio: 5 });

    const recargar = estado.actualizar(12, 5);

    expect(estado.total()).toBe(12);
    expect(estado.pagina()).toBe(2);
    expect(recargar).toBe(false);
  });

  it('si_la_pagina_quedo_vacia_pasa_a_la_ultima_que_tiene_datos_y_pide_recargar', () => {
    const estado = new EstadoPaginado();
    estado.cambiar({ pagina: 3, tamanio: 5 }); // se borró lo último de la página 3

    const recargar = estado.actualizar(10, 0);

    expect(estado.pagina()).toBe(2);
    expect(recargar).toBe(true);
  });

  it('una_primera_pagina_vacia_no_pide_recargar', () => {
    const estado = new EstadoPaginado();

    expect(estado.actualizar(0, 0)).toBe(false);
    expect(estado.pagina()).toBe(1);
  });
});
