import { PaginadorEs } from './paginador-es';

describe('PaginadorEs', () => {
  const paginador = new PaginadorEs();

  it('los_textos_estan_en_castellano', () => {
    expect(paginador.itemsPerPageLabel).toBe('Filas por página:');
    expect(paginador.nextPageLabel).toBe('Página siguiente');
    expect(paginador.previousPageLabel).toBe('Página anterior');
    expect(paginador.firstPageLabel).toBe('Primera página');
    expect(paginador.lastPageLabel).toBe('Última página');
  });

  it.each([
    [0, 5, 12, '1 – 5 de 12'],
    [1, 5, 12, '6 – 10 de 12'],
    [2, 5, 12, '11 – 12 de 12'],
    [0, 100, 3, '1 – 3 de 3'],
    [0, 5, 0, '0 de 0'],
  ])('el_rango_de_la_pagina_%i_con_tamanio_%i_y_total_%i_dice_%s', (pagina, tamanio, total, esperado) => {
    expect(paginador.getRangeLabel(pagina, tamanio, total)).toBe(esperado);
  });
});
