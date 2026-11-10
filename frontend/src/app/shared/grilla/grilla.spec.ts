import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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
    <app-grilla [columnas]="columnas" [filas]="filas" mensajeVacio="No hay cosas.">
      @if (conAcciones) {
        <ng-template #acciones let-fila><button aria-label="Ver">{{ fila.nombre }}</button></ng-template>
      }
    </app-grilla>
  `,
})
class Anfitrion {
  conAcciones = true;
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
    return fixture.nativeElement as HTMLElement;
  }

  const encabezados = (el: HTMLElement) => Array.from(el.querySelectorAll('thead th')).map((t) => t.textContent!.trim());
  const filas = (el: HTMLElement) => Array.from(el.querySelectorAll('tbody tr'));

  it('muestra_las_columnas_de_datos_mas_estado_y_acciones', async () => {
    expect(encabezados(await crear())).toEqual(['Nombre', 'Código', 'Estado', 'Acciones']);
  });

  it('muestra_una_fila_por_dato_con_el_valor_de_cada_columna', async () => {
    const el = await crear();

    expect(filas(el)).toHaveLength(2);
    expect(filas(el)[0].textContent).toContain('Primera');
    expect(filas(el)[0].textContent).toContain('#1');
    expect(filas(el)[1].textContent).toContain('Segunda');
  });

  it('muestra_el_estado_como_etiqueta_activo_o_inactivo', async () => {
    const el = await crear();
    const [activa, inactiva] = filas(el).map((f) => f.querySelector('.estado')!);

    expect(activa.textContent!.trim()).toBe('Activo');
    expect(activa.classList).toContain('activo');
    expect(inactiva.textContent!.trim()).toBe('Inactivo');
    expect(inactiva.classList).toContain('inactivo');
  });

  it('las_filas_inactivas_llevan_la_clase_inactiva', async () => {
    const el = await crear();

    expect(filas(el)[0].classList).not.toContain('inactiva');
    expect(filas(el)[1].classList).toContain('inactiva');
  });

  it('dibuja_las_acciones_de_cada_fila_con_esa_fila_como_contexto', async () => {
    const el = await crear();

    expect(filas(el).map((f) => f.querySelector('.acciones button')!.textContent!.trim())).toEqual(['Primera', 'Segunda']);
  });

  it('sin_plantilla_de_acciones_no_hay_columna_de_acciones', async () => {
    const el = await crear({ conAcciones: false });

    expect(encabezados(el)).toEqual(['Nombre', 'Código', 'Estado']);
    expect(el.querySelectorAll('.acciones')).toHaveLength(0);
  });

  it('sin_filas_muestra_el_mensaje_y_conserva_el_encabezado', async () => {
    const el = await crear({ filas: [] });

    expect(filas(el)).toHaveLength(0);
    expect(el.querySelector('.vacio')!.textContent).toContain('No hay cosas.');
    expect(encabezados(el)).toContain('Nombre');
  });

  it('con_filas_no_muestra_el_mensaje_de_vacio', async () => {
    expect((await crear()).querySelector('.vacio')).toBeNull();
  });
});
