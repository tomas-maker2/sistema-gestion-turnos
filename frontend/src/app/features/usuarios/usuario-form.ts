import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Rol } from '../../core/auth.service';
import { mensajeDeError } from '../../shared/errores';
import { ROLES } from '../../shared/roles';
import { Usuario, UsuariosService } from './usuarios.service';

// Alta de usuario (data = null) o edición (data = el usuario)
@Component({
  selector: 'app-usuario-form',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  templateUrl: './usuario-form.html',
})
export class UsuarioForm {
  private readonly servicio = inject(UsuariosService);
  private readonly dialogo = inject(MatDialogRef<UsuarioForm>);
  readonly usuario = inject<Usuario | null>(MAT_DIALOG_DATA);

  readonly esNuevo = this.usuario === null;
  readonly roles = ROLES;

  readonly form = inject(FormBuilder).nonNullable.group({
    nombreUsuario: [this.usuario?.nombreUsuario ?? '', [Validators.required, Validators.maxLength(50)]],
    nombreCompleto: [this.usuario?.nombreCompleto ?? '', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rol: [this.usuario?.rol ?? ('Operador' as Rol), Validators.required],
  });
  readonly error = signal('');
  readonly guardando = signal(false);

  constructor() {
    // Al editar no se cambia el nombre de usuario ni la clave (la clave se restablece aparte)
    if (!this.esNuevo) {
      this.form.controls.nombreUsuario.disable();
      this.form.controls.password.disable();
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const pedido = this.usuario === null
      ? this.servicio.crear({ nombreUsuario: v.nombreUsuario, nombreCompleto: v.nombreCompleto, password: v.password, rol: v.rol })
      : this.servicio.modificar(this.usuario.id, { nombreCompleto: v.nombreCompleto, rol: v.rol, activo: this.usuario.activo });

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
