import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, contentChild, input } from '@angular/core';

export interface ColumnaGrilla<T> {
  titulo: string;
  valor: (fila: T) => string | number;
}

// Grilla común de las pantallas de gestión: columnas de datos, estado y acciones por fila.
// Las filas inactivas se muestran atenuadas.
@Component({
  selector: 'app-grilla',
  imports: [NgTemplateOutlet],
  templateUrl: './grilla.html',
  styleUrl: './grilla.scss',
})
export class Grilla<T extends { activo: boolean }> {
  readonly columnas = input.required<ColumnaGrilla<T>[]>();
  readonly filas = input.required<T[]>();
  readonly mensajeVacio = input('No hay datos.');

  // Botones de cada fila: plantilla con la referencia #acciones, que recibe la fila
  readonly acciones = contentChild<TemplateRef<{ $implicit: T }>>('acciones');
}
