import { signal } from '@angular/core';

// Tamaños de página que acepta la API (el primero es el predeterminado)
export const TAMANIOS_PAGINA = [5, 10, 30, 50, 100];
export const TAMANIO_POR_DEFECTO = TAMANIOS_PAGINA[0];

// Lo que devuelve la API en los listados: una página y el total de resultados
export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  tamanio: number;
}

// La pagina se cuenta desde 1
export interface CambioDePagina {
  pagina: number;
  tamanio: number;
}

// Estado del paginado de un listado: página actual, tamaño y total
export class EstadoPaginado {
  readonly pagina = signal(1);
  readonly tamanio = signal(TAMANIO_POR_DEFECTO);
  readonly total = signal(0);

  cambiar(cambio: CambioDePagina): void {
    this.pagina.set(cambio.pagina);
    this.tamanio.set(cambio.tamanio);
  }

  // Cuando cambia un filtro hay que mirar los resultados desde el principio
  volverALaPrimera(): void {
    this.pagina.set(1);
  }

  // Guarda el total. Si la página quedó vacía (se dio de baja lo último que tenía), pasa a la
  // última página con datos y devuelve true para que se vuelva a pedir.
  actualizar(total: number, cantidadEnLaPagina: number): boolean {
    this.total.set(total);
    if (cantidadEnLaPagina === 0 && total > 0 && this.pagina() > 1) {
      this.pagina.set(Math.ceil(total / this.tamanio()));
      return true;
    }
    return false;
  }
}
