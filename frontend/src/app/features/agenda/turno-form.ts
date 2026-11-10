import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { catchError, filter, of, startWith, switchMap } from 'rxjs';
import { mensajeDeError } from '../../shared/errores';
import { aEntradaLocal, aTextoLocal, desdeEntradaLocal, hora } from '../../shared/fechas';
import { Pagina } from '../../shared/paginado';
import { Cliente, ClientesService } from '../clientes/clientes.service';
import { ServiciosService } from '../servicios/servicios.service';
import { Turno, TurnoDatos, TurnosService } from './turnos.service';

export interface ClienteOpcion {
  id: number;
  texto: string;
}

export interface ServicioOpcion {
  id: number;
  texto: string;
  duracionMinutos: number | null;
}

// turno = null para dar de alta uno nuevo; fechaInicial es la fecha y hora que se sugiere en el alta
export interface TurnoFormDatos {
  turno: Turno | null;
  fechaInicial: Date;
}

const CLIENTES_SUGERIDOS = 10;
const MAX_SERVICIOS = 100;

// El cliente tiene que elegirse de la lista: un texto escrito a medias no vale
const clienteElegido = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'object' && control.value !== null ? null : { sinElegir: true };

const aOpcionDeCliente = (c: Cliente): ClienteOpcion => ({ id: c.id, texto: `${c.apellido}, ${c.nombre}` });

@Component({
  selector: 'app-turno-form',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatAutocompleteModule, MatButtonModule,
  ],
  templateUrl: './turno-form.html',
})
export class TurnoForm {
  private readonly turnosApi = inject(TurnosService);
  private readonly clientesApi = inject(ClientesService);
  private readonly serviciosApi = inject(ServiciosService);
  private readonly dialogo = inject(MatDialogRef<TurnoForm>);
  private readonly datos = inject<TurnoFormDatos>(MAT_DIALOG_DATA);
  private readonly turno = this.datos.turno;

  readonly esNuevo = this.turno === null;
  readonly clientes = signal<ClienteOpcion[]>([]);
  readonly servicios = signal<ServicioOpcion[]>([]);
  readonly error = signal('');
  readonly guardando = signal(false);

  readonly form = new FormGroup({
    // Mientras se escribe es un texto; al elegir de la lista pasa a ser la opción elegida
    cliente: new FormControl<ClienteOpcion | string | null>(
      this.turno ? { id: this.turno.clienteId, texto: this.turno.clienteNombre } : '',
      clienteElegido,
    ),
    servicioId: new FormControl<number | null>(this.turno?.servicioId ?? null, Validators.required),
    fechaHora: new FormControl(
      this.turno ? this.turno.fechaHoraInicio.slice(0, 16) : aEntradaLocal(this.datos.fechaInicial),
      { nonNullable: true, validators: Validators.required },
    ),
    observaciones: new FormControl(this.turno?.observaciones ?? '', {
      nonNullable: true,
      validators: Validators.maxLength(500),
    }),
  });

  constructor() {
    this.cargarServicios();
    this.buscarClientesMientrasSeEscribe();
  }

  // Cómo se muestra el cliente elegido dentro del campo
  readonly mostrarCliente = (cliente: ClienteOpcion | string | null): string =>
    typeof cliente === 'object' && cliente !== null ? cliente.texto : '';

  // Hora a la que termina el turno, según la duración del servicio (la API es la que la calcula de verdad)
  finEstimado(): string | null {
    const { servicioId, fechaHora } = this.form.getRawValue();
    const duracion = this.servicios().find((s) => s.id === servicioId)?.duracionMinutos;
    if (!duracion || !fechaHora) return null;

    const inicio = desdeEntradaLocal(fechaHora);
    return hora(aTextoLocal(new Date(inicio.getTime() + duracion * 60_000)));
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valores = this.form.getRawValue();
    const datos: TurnoDatos = {
      clienteId: (valores.cliente as ClienteOpcion).id,
      servicioId: valores.servicioId!,
      fechaHoraInicio: `${valores.fechaHora}:00`,
      observaciones: valores.observaciones.trim() || null,
    };
    const pedido = this.turno === null
      ? this.turnosApi.crear(datos)
      : this.turnosApi.modificar(this.turno.id, datos);

    this.error.set('');
    this.guardando.set(true);
    pedido.subscribe({
      next: () => this.dialogo.close(true),
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(e));
      },
    });
  }

  // Solo servicios activos. Si el turno ya tenía uno que después se desactivó, se conserva para poder editarlo.
  private cargarServicios(): void {
    this.serviciosApi.listar(false, 1, MAX_SERVICIOS).subscribe({
      next: (pagina) => {
        const opciones: ServicioOpcion[] = pagina.items.map((s) => ({
          id: s.id,
          texto: `${s.nombre} (${s.duracionMinutos} min)`,
          duracionMinutos: s.duracionMinutos,
        }));
        const delTurno = this.turno;
        if (delTurno && !opciones.some((o) => o.id === delTurno.servicioId)) {
          opciones.push({ id: delTurno.servicioId, texto: delTurno.servicioNombre, duracionMinutos: null });
        }
        this.servicios.set(opciones);
      },
      error: (e: HttpErrorResponse) => this.error.set(mensajeDeError(e)),
    });
  }

  // Con cada cambio del texto se piden los primeros clientes activos que coinciden
  private buscarClientesMientrasSeEscribe(): void {
    const control = this.form.controls.cliente;
    control.valueChanges
      .pipe(
        startWith(control.value),
        filter((valor): valor is string => typeof valor === 'string'),
        switchMap((texto) =>
          this.clientesApi.listar(texto, false, 1, CLIENTES_SUGERIDOS).pipe(
            catchError(() => of<Pagina<Cliente>>({ items: [], total: 0, pagina: 1, tamanio: CLIENTES_SUGERIDOS })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((pagina) => this.clientes.set(pagina.items.map(aOpcionDeCliente)));
  }
}
