import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { mensajeDeError } from '../../shared/errores';
import { Servicio, ServiciosService } from './servicios.service';

// Alta de servicio (data = null) o edición (data = el servicio)
@Component({
  selector: 'app-servicio-form',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './servicio-form.html',
})
export class ServicioForm {
  private readonly servicio = inject(ServiciosService);
  private readonly dialogo = inject(MatDialogRef<ServicioForm>);
  readonly datos = inject<Servicio | null>(MAT_DIALOG_DATA);

  readonly esNuevo = this.datos === null;
  readonly form = inject(FormBuilder).nonNullable.group({
    nombre: [this.datos?.nombre ?? '', [Validators.required, Validators.maxLength(100)]],
    duracionMinutos: [
      this.datos?.duracionMinutos ?? 30,
      [Validators.required, Validators.min(5), Validators.max(480), Validators.pattern('^[0-9]+$')],
    ],
  });
  readonly error = signal('');
  readonly guardando = signal(false);

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Un servicio nuevo nace activo; al editar se conserva su estado
    const nuevos = { ...this.form.getRawValue(), activo: this.datos?.activo ?? true };
    const pedido = this.datos === null
      ? this.servicio.crear(nuevos)
      : this.servicio.modificar(this.datos.id, nuevos);

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
}
