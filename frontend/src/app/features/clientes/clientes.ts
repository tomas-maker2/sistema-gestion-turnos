import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EMPTY, Observable, Subject, catchError, switchMap } from 'rxjs';
import { ConfirmarDialog } from '../../shared/confirmar-dialog';
import { mensajeDeError } from '../../shared/errores';
import { ColumnaGrilla, Grilla } from '../../shared/grilla/grilla';
import { CambioDePagina, EstadoPaginado } from '../../shared/paginado';
import { ClienteForm } from './cliente-form';
import { Cliente, ClientesService } from './clientes.service';

// Listado de clientes: búsqueda, alta, edición y baja lógica
@Component({
  selector: 'app-clientes',
  imports: [
    Grilla, MatButtonModule, MatIconModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSlideToggleModule,
  ],
  templateUrl: './clientes.html',
})
export class Clientes {
  private readonly servicio = inject(ClientesService);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);

  readonly columnas: ColumnaGrilla<Cliente>[] = [
    { titulo: 'Cliente', valor: (c) => `${c.apellido}, ${c.nombre}` },
    { titulo: 'Teléfono', valor: (c) => c.telefono },
    { titulo: 'Email', valor: (c) => c.email ?? '—' },
  ];
  readonly filas = signal<Cliente[]>([]);
  readonly texto = signal('');
  readonly inactivos = signal(false);
  readonly paginado = new EstadoPaginado();

  // Cada recarga cancela la anterior, así una respuesta lenta no pisa a una más nueva
  private readonly recarga = new Subject<void>();

  constructor() {
    this.recarga
      .pipe(
        switchMap(() =>
          this.servicio.listar(this.texto(), this.inactivos(), this.paginado.pagina(), this.paginado.tamanio()).pipe(
            catchError((e: HttpErrorResponse) => {
              this.avisarError(e);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((pagina) => {
        this.filas.set(pagina.items);
        // Si la página quedó vacía (se dio de baja lo último que tenía), se pide la anterior
        if (this.paginado.actualizar(pagina.total, pagina.items.length)) this.cargar();
      });
    this.cargar();
  }

  cargar(): void {
    this.recarga.next();
  }

  buscar(texto: string): void {
    this.texto.set(texto);
    this.paginado.volverALaPrimera();
    this.cargar();
  }

  mostrarInactivos(mostrar: boolean): void {
    this.inactivos.set(mostrar);
    this.paginado.volverALaPrimera();
    this.cargar();
  }

  cambiarPagina(cambio: CambioDePagina): void {
    this.paginado.cambiar(cambio);
    this.cargar();
  }

  nuevo(): void {
    this.abrirFormulario(null);
  }

  editar(cliente: Cliente): void {
    this.abrirFormulario(cliente);
  }

  desactivar(cliente: Cliente): void {
    this.dialogo
      .open(ConfirmarDialog, {
        data: {
          titulo: 'Desactivar cliente',
          mensaje: `¿Querés desactivar a ${cliente.nombre} ${cliente.apellido}? Podés reactivarlo después.`,
          textoConfirmar: 'Desactivar',
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) this.ejecutar(this.servicio.desactivar(cliente.id), 'Cliente desactivado');
      });
  }

  reactivar(cliente: Cliente): void {
    const { id, ...datos } = cliente;
    this.ejecutar(this.servicio.modificar(id, { ...datos, activo: true }), 'Cliente reactivado');
  }

  private abrirFormulario(cliente: Cliente | null): void {
    this.dialogo
      .open(ClienteForm, { width: '440px', data: cliente })
      .afterClosed()
      .subscribe((guardado) => {
        if (!guardado) return;
        this.avisar('Cliente guardado');
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
