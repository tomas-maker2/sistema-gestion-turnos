import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EMPTY, Observable, Subject, catchError, switchMap } from 'rxjs';
import { ConfirmarDialog } from '../../shared/confirmar-dialog';
import { mensajeDeError } from '../../shared/errores';
import {
  aFecha, desdeFecha, esMismoDia, formatoDia, formatoDiaCorto, formatoSemana, hora, lunesDeLaSemana, sumarDias,
} from '../../shared/fechas';
import { TurnoForm, TurnoFormDatos } from './turno-form';
import { Turno, TurnosService } from './turnos.service';

type Vista = 'dia' | 'semana';

interface GrupoDia {
  fecha: string; // "2026-11-10"
  titulo: string;
  turnos: Turno[];
}

// Agenda de turnos, por día o por semana (de lunes a domingo)
@Component({
  selector: 'app-agenda',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, MatButtonToggleModule],
  templateUrl: './agenda.html',
  styleUrl: './agenda.scss',
})
export class Agenda {
  private readonly servicio = inject(TurnosService);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);

  readonly hora = hora;
  readonly fecha = signal(sumarDias(new Date(), 0)); // hoy, a medianoche
  readonly vista = signal<Vista>('dia');
  readonly turnos = signal<Turno[]>([]);

  readonly fechaTexto = computed(() => aFecha(this.fecha()));
  private readonly cantidadDeDias = computed(() => (this.vista() === 'dia' ? 1 : 7));
  private readonly primerDia = computed(() => (this.vista() === 'dia' ? this.fecha() : lunesDeLaSemana(this.fecha())));
  readonly titulo = computed(() =>
    this.vista() === 'dia' ? formatoDia(this.fecha()) : formatoSemana(this.primerDia()),
  );

  // Un grupo por cada día que se muestra, con los turnos que empiezan ese día
  readonly grupos = computed<GrupoDia[]>(() =>
    Array.from({ length: this.cantidadDeDias() }, (_, i) => {
      const dia = sumarDias(this.primerDia(), i);
      const clave = aFecha(dia);
      return {
        fecha: clave,
        titulo: formatoDiaCorto(dia),
        turnos: this.turnos().filter((t) => t.fechaHoraInicio.startsWith(clave)),
      };
    }),
  );

  // Cada recarga cancela la anterior, así una respuesta lenta no pisa a una más nueva
  private readonly recarga = new Subject<void>();

  constructor() {
    this.recarga
      .pipe(
        switchMap(() => {
          const desde = this.primerDia();
          const hasta = sumarDias(desde, this.cantidadDeDias());
          return this.servicio.agenda(aFecha(desde), aFecha(hasta)).pipe(
            catchError((e: HttpErrorResponse) => {
              this.avisarError(e);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((turnos) => this.turnos.set(turnos));
    this.cargar();
  }

  cargar(): void {
    this.recarga.next();
  }

  anterior(): void {
    this.mover(-1);
  }

  siguiente(): void {
    this.mover(1);
  }

  hoy(): void {
    this.fecha.set(sumarDias(new Date(), 0));
    this.cargar();
  }

  irAFecha(texto: string): void {
    if (!texto) return;
    this.fecha.set(desdeFecha(texto));
    this.cargar();
  }

  cambiarVista(vista: Vista): void {
    this.vista.set(vista);
    this.cargar();
  }

  nuevo(): void {
    this.abrirFormulario({ turno: null, fechaInicial: this.fechaInicialDelNuevoTurno() });
  }

  editar(turno: Turno): void {
    this.abrirFormulario({ turno, fechaInicial: new Date() });
  }

  cancelar(turno: Turno): void {
    this.confirmar(
      {
        titulo: 'Cancelar turno',
        mensaje: `¿Querés cancelar el turno de ${turno.clienteNombre} a las ${hora(turno.fechaHoraInicio)}?`,
        textoConfirmar: 'Cancelar turno',
        textoCancelar: 'Volver',
      },
      () => this.ejecutar(this.servicio.cancelar(turno.id), 'Turno cancelado'),
    );
  }

  marcarAtendido(turno: Turno): void {
    this.confirmar(
      {
        titulo: 'Marcar como atendido',
        mensaje: `¿Confirmás que se atendió el turno de ${turno.clienteNombre} de las ${hora(turno.fechaHoraInicio)}?`,
        textoConfirmar: 'Marcar atendido',
        textoCancelar: 'Volver',
      },
      () => this.ejecutar(this.servicio.marcarAtendido(turno.id), 'Turno marcado como atendido'),
    );
  }

  // En la vista de la semana avanza o retrocede siete días
  private mover(sentido: 1 | -1): void {
    this.fecha.set(sumarDias(this.fecha(), sentido * this.cantidadDeDias()));
    this.cargar();
  }

  // Hoy se sugiere la próxima hora redonda; otro día, las 9
  private fechaInicialDelNuevoTurno(): Date {
    const dia = this.fecha();
    const ahora = new Date();
    if (esMismoDia(dia, ahora)) {
      return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), ahora.getHours() + 1, 0);
    }
    return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 9, 0);
  }

  private abrirFormulario(datos: TurnoFormDatos): void {
    this.dialogo
      .open(TurnoForm, { width: '480px', data: datos })
      .afterClosed()
      .subscribe((guardado) => {
        if (!guardado) return;
        this.avisar('Turno guardado');
        this.cargar();
      });
  }

  private confirmar(datos: { titulo: string; mensaje: string; textoConfirmar: string; textoCancelar: string }, alConfirmar: () => void): void {
    this.dialogo
      .open(ConfirmarDialog, { data: datos })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) alConfirmar();
      });
  }

  // Ejecuta una operación, avisa el resultado y recarga la agenda
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
