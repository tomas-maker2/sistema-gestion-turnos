import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatPaginator } from '@angular/material/paginator';
import { By } from '@angular/platform-browser';
import { CambioDePagina } from '../paginado';
import { ColumnaGrilla, Grilla } from './grilla';

interface Cosa {
  nombre: string;
  codigo: number;
  activo: boolean;
}

// Anfitrión de prueba: usa la grilla como la usan las pantallas reales
@Component({
  imports: [Grilla],
  template: `
    <app-grilla [columnas]="columnas" [filas]="filas" [total]="total" [pagina]="pagina" [tamanio]="tamanio"
                mensajeVacio="No hay cosas." (paginaCambiada)="cambios.push($event)">
      @if (conAcciones) {
        <ng-template #acciones let-fila><button aria-label="Ver">{{ fila.nombre }}</button></ng-template>
      }
    </app-grilla>
  `,
})
class Anfitrion {
  conAcciones = true;
  total = 12;
  pagina = 1;
  tamanio = 5;
  cambios: CambioDePagina[] = [];
  columnas: ColumnaGrilla<Cosa>[] = [
    { titulo: 'Nombre', valor: (c) => c.nombre },
    { titulo: 'Código', valor: (c) => `#${c.codigo}` },
  ];
  filas: Cosa[] = [
    { nombre: 'Primera', codigo: 1, activo: true },
    { nombre: 'Segunda', codigo: 2, activo: false },
  ];
}

describe('Grilla', () => {
  async function crear(ajustes: Partial<Anfitrion> = {}) {
    TestBed.configureTestingModule({ imports: [Anfitrion] });
    const fixture = TestBed.createComponent(Anfitrion);
    Object.assign(fixture.componentInstance, ajustes);
    await fixture.whenStable();
    return fixture;
  }

  const raiz = (f: { nativeElement: HTMLElement }) => f.nativeElement;
  const encabezados = (el: HTMLElement) => Array.from(el.querySelectorAll('thead th')).map((t) => t.textContent!.trim());
  const filas = (el: HTMLElement) => Array.from(el.querySelectorAll('tbody tr'));
  const paginador = (f: Awaited<ReturnType<typeof crear>>) => f.debugElement.query(By.directive(MatPaginator)).componentInstance as MatPaginator;

  describe('tabla', () => {
    it('muestra_las_columnas_de_datos_mas_estado_y_acciones', async () => {
      expect(encabezados(raiz(await crear()))).toEqual(['Nombre', 'Código', 'Estado', 'Acciones']);
    });

    it('muestra_una_fila_por_dato_con_el_valor_de_cada_columna', async () => {
      const el = raiz(await crear());

      expect(filas(el)).toHaveLength(2);
      expect(filas(el)[0].textContent).toContain('Primera');
      expect(filas(el)[0].textContent).toContain('#1');
      expect(filas(el)[1].textContent).toContain('Segunda');
    });

    it('muestra_el_estado_como_etiqueta_activo_o_inactivo', async () => {
      const el = raiz(await crear());
      const [activa, inactiva] = filas(el).map((f) => f.querySelector('.estado')!);

      expect(activa.textContent!.trim()).toBe('Activo');
      expect(activa.classList).toContain('activo');
      expect(inactiva.textContent!.trim()).toBe('Inactivo');
      expect(inactiva.classList).toContain('inactivo');
    });

    it('las_filas_inactivas_llevan_la_clase_inactiva', async () => {
      const el = raiz(await crear());

      expect(filas(el)[0].classList).not.toContain('inactiva');
      expect(filas(el)[1].classList).toContain('inactiva');
    });

    it('dibuja_las_acciones_de_cada_fila_con_esa_fila_como_contexto', async () => {
      const el = raiz(await crear());

      expect(filas(el).map((f) => f.querySelector('.acciones button')!.textContent!.trim())).toEqual(['Primera', 'Segunda']);
    });

    it('sin_plantilla_de_acciones_no_hay_columna_de_acciones', async () => {
      const el = raiz(await crear({ conAcciones: false }));

      expect(encabezados(el)).toEqual(['Nombre', 'Código', 'Estado']);
      expect(el.querySelectorAll('.acciones')).toHaveLength(0);
    });

    it('sin_filas_muestra_el_mensaje_y_conserva_el_encabezado', async () => {
      const el = raiz(await crear({ filas: [], total: 0 }));

      expect(filas(el)).toHaveLength(0);
      expect(el.querySelector('.vacio')!.textContent).toContain('No hay cosas.');
      expect(encabezados(el)).toContain('Nombre');
    });

    it('con_filas_no_muestra_el_mensaje_de_vacio', async () => {
      expect(raiz(await crear()).querySelector('.vacio')).toBeNull();
    });
  });

  describe('paginado', () => {
    it('el_paginador_esta_arriba_de_la_tabla', async () => {
      const el = raiz(await crear());
      const paginadorEl = el.querySelector('mat-paginator')!;
      const tabla = el.querySelector('table')!;

      expect(paginadorEl.compareDocumentPosition(tabla) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('ofrece_5_10_30_50_y_100_filas_por_pagina_con_5_por_defecto', async () => {
      const fixture = await crear();

      expect(paginador(fixture).pageSizeOptions).toEqual([5, 10, 30, 50, 100]);
      expect(paginador(fixture).pageSize).toBe(5);
    });

    it('muestra_el_total_la_pagina_y_el_tamanio_que_recibe', async () => {
      const fixture = await crear({ total: 42, pagina: 3, tamanio: 10 });

      expect(paginador(fixture).length).toBe(42);
      expect(paginador(fixture).pageIndex).toBe(2); // el paginador cuenta desde 0
      expect(paginador(fixture).pageSize).toBe(10);
    });

    it('al_cambiar_de_pagina_emite_la_pagina_contando_desde_1_y_el_tamanio', async () => {
      const fixture = await crear();

      paginador(fixture).page.emit({ pageIndex: 1, pageSize: 5, length: 12, previousPageIndex: 0 });

      expect(fixture.componentInstance.cambios).toEqual([{ pagina: 2, tamanio: 5 }]);
    });

    it('al_cambiar_el_tamanio_vuelve_a_la_primera_pagina', async () => {
      const fixture = await crear({ pagina: 3 });

      paginador(fixture).page.emit({ pageIndex: 1, pageSize: 30, length: 12, previousPageIndex: 2 });

      expect(fixture.componentInstance.cambios).toEqual([{ pagina: 1, tamanio: 30 }]);
    });

    it('los_textos_del_paginador_estan_en_castellano', async () => {
      const el = raiz(await crear({ total: 12 }));

      expect(el.querySelector('mat-paginator')!.textContent).toContain('Filas por página');
      expect(el.querySelector('mat-paginator')!.textContent).toContain('1 – 5 de 12');
    });

    it('el_paginador_se_muestra_tambien_sin_datos', async () => {
      const el = raiz(await crear({ filas: [], total: 0 }));
      expect(el.querySelector('mat-paginator')).not.toBeNull();
    });
  });
});
