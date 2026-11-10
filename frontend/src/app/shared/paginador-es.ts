import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';

// Textos del paginador en castellano
@Injectable()
export class PaginadorEs extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Filas por página:';
  override nextPageLabel = 'Página siguiente';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel = 'Primera página';
  override lastPageLabel = 'Última página';

  // La página se cuenta desde 0
  override getRangeLabel = (pagina: number, tamanio: number, total: number): string => {
    if (total === 0) return '0 de 0';
    const desde = pagina * tamanio + 1;
    const hasta = Math.min((pagina + 1) * tamanio, total);
    return `${desde} – ${hasta} de ${total}`;
  };
}
