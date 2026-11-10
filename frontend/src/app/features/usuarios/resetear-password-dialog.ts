import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { mensajeDeError } from '../../shared/errores';
import { Usuario, UsuariosService } from './usuarios.service';

// Un administrador le pone una contraseña nueva a otro usuario
@Component({
  selector: 'app-resetear-password-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './resetear-password-dialog.html',
})
export class ResetearPasswordDialog {
  private readonly servicio = inject(UsuariosService);
  private readonly dialogo = inject(MatDialogRef<ResetearPasswordDialog>);
  readonly usuario = inject<Usuario>(MAT_DIALOG_DATA);

  // El campo va dentro de un grupo para que el envío del formulario llegue a guardar()
  readonly form = new FormGroup({
    passwordNueva: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });
  readonly passwordNueva = this.form.controls.passwordNueva;
  readonly error = signal('');
  readonly guardando = signal(false);

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set('');
    this.guardando.set(true);
    this.servicio.resetearPassword(this.usuario.id, this.passwordNueva.value).subscribe({
      next: () => this.dialogo.close(true),
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(mensajeDeError(e));
      },
    });
  }
}
