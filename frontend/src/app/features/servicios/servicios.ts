import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { ConfirmarDialog } from '../../shared/confirmar-dialog';
import { mensajeDeError } from '../../shared/errores';
import { ColumnaGrilla, Grilla } from '../../shared/grilla/grilla';
import { ServicioForm } from './servicio-form';
import { Servicio, ServiciosService } from './servicios.service';

// Listado de servicios: alta, edición y baja lógica
@Component({
  selector: 'app-servicios',
  imports: [Grilla, MatButtonModule, MatIconModule, MatTooltipModule, MatSlideToggleModule],
  templateUrl: './servicios.html',
})
export class Servicios {
  private readonly servicio = inject(ServiciosService);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);

  readonly columnas: ColumnaGrilla<Servicio>[] = [
    { titulo: 'Servicio', valor: (s) => s.nombre },
    { titulo: 'Duración', valor: (s) => `${s.duracionMinutos} min` },
  ];
  readonly filas = signal<Servicio[]>([]);
  readonly inactivos = signal(false);

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.servicio.listar(this.inactivos()).subscribe({
      next: (servicios) => this.filas.set(servicios),
      error: (e: HttpErrorResponse) => this.avisarError(e),
    });
  }

  mostrarInactivos(mostrar: boolean): void {
    this.inactivos.set(mostrar);
    this.cargar();
  }

  nuevo(): void {
    this.abrirFormulario(null);
  }

  editar(servicio: Servicio): void {
    this.abrirFormulario(servicio);
  }

  desactivar(servicio: Servicio): void {
    this.dialogo
      .open(ConfirmarDialog, {
        data: {
          titulo: 'Desactivar servicio',
          mensaje: `¿Querés desactivar el servicio "${servicio.nombre}"? Podés reactivarlo después.`,
          textoConfirmar: 'Desactivar',
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) this.ejecutar(this.servicio.desactivar(servicio.id), 'Servicio desactivado');
      });
  }

  reactivar(servicio: Servicio): void {
    const { id, ...datos } = servicio;
    this.ejecutar(this.servicio.modificar(id, { ...datos, activo: true }), 'Servicio reactivado');
  }

  private abrirFormulario(servicio: Servicio | null): void {
    this.dialogo
      .open(ServicioForm, { width: '440px', data: servicio })
      .afterClosed()
      .subscribe((guardado) => {
        if (!guardado) return;
        this.avisar('Servicio guardado');
        this.cargar();
      });
  }

  // Ejecuta una operación, avisa el resultado y recarga la lista
  private ejecutar(operacion: Observable<unknown>, mensaje: string): void {
    operacion.subscribe({
      next: () => {
        this.avisar(mensaje);
        this.cargar();
      },
      error: (e: HttpErrorResponse) => this.avisarError(e),
    });
  }

  private avisar(mensaje: string): void {
    this.aviso.open(mensaje, 'Cerrar', { duration: 3000 });
  }

  private avisarError(e: HttpErrorResponse): void {
    this.aviso.open(mensajeDeError(e), 'Cerrar', { duration: 5000 });
  }
}
