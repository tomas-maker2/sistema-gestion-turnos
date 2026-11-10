import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, contentChild, input, output } from '@angular/core';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CambioDePagina, TAMANIOS_PAGINA, TAMANIO_POR_DEFECTO } from '../paginado';
import { PaginadorEs } from '../paginador-es';

export interface ColumnaGrilla<T> {
  titulo: string;
  valor: (fila: T) => string | number;
}

// Grilla común de las pantallas de gestión: paginador (arriba a la izquierda), columnas de datos,
// estado y acciones por fila. El paginado lo resuelve el backend: la grilla solo avisa qué página se pidió.
// Las filas inactivas se muestran atenuadas.
@Component({
  selector: 'app-grilla',
  imports: [NgTemplateOutlet, MatPaginatorModule],
  // El paginador se muestra en castellano (se registra acá para no engordar el arranque de la app)
  providers: [{ provide: MatPaginatorIntl, useClass: PaginadorEs }],
  templateUrl: './grilla.html',
  styleUrl: './grilla.scss',
})
export class Grilla<T extends { activo: boolean }> {
  readonly columnas = input.required<ColumnaGrilla<T>[]>();
  readonly filas = input.required<T[]>();
  readonly mensajeVacio = input('No hay datos.');

  // Paginado: total de resultados y página actual (desde 1)
  readonly total = input(0);
  readonly pagina = input(1);
  readonly tamanio = input(TAMANIO_POR_DEFECTO);
  readonly paginaCambiada = output<CambioDePagina>();

  readonly tamaniosDePagina = TAMANIOS_PAGINA;

  // Botones de cada fila: plantilla con la referencia #acciones, que recibe la fila
  readonly acciones = contentChild<TemplateRef<{ $implicit: T }>>('acciones');

  alCambiarLaPagina(evento: PageEvent): void {
    // Si cambió la cantidad de filas por página, se vuelve a la primera
    const cambioElTamanio = evento.pageSize !== this.tamanio();
    this.paginaCambiada.emit({ pagina: cambioElTamanio ? 1 : evento.pageIndex + 1, tamanio: evento.pageSize });
  }
}
