import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { mensajeDeError } from '../../shared/errores';
import { Cliente, ClientesService } from './clientes.service';

// Alta de cliente (data = null) o edición (data = el cliente)
@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './cliente-form.html',
})
export class ClienteForm {
  private readonly servicio = inject(ClientesService);
  private readonly dialogo = inject(MatDialogRef<ClienteForm>);
  readonly cliente = inject<Cliente | null>(MAT_DIALOG_DATA);

  readonly esNuevo = this.cliente === null;
  readonly form = inject(FormBuilder).nonNullable.group({
    nombre: [this.cliente?.nombre ?? '', [Validators.required, Validators.maxLength(100)]],
    apellido: [this.cliente?.apellido ?? '', [Validators.required, Validators.maxLength(100)]],
    telefono: [this.cliente?.telefono ?? '', [Validators.required, Validators.maxLength(30)]],
    email: [this.cliente?.email ?? '', [Validators.email, Validators.maxLength(150)]],
  });
  readonly error = signal('');
  readonly guardando = signal(false);

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    // Un cliente nuevo nace activo; al editar se conserva su estado
    const datos = { ...v, email: v.email.trim() || null, activo: this.cliente?.activo ?? true };
    const pedido = this.cliente === null
      ? this.servicio.crear(datos)
      : this.servicio.modificar(this.cliente.id, datos);

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
