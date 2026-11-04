import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../core/auth.service';

// La confirmación tiene que ser igual a la clave nueva
const coinciden = (grupo: AbstractControl) =>
  grupo.get('passwordNueva')?.value === grupo.get('confirmacion')?.value ? null : { noCoinciden: true };

// Muestra los datos del usuario y permite cambiar su contraseña
@Component({
  selector: 'app-perfil-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './perfil-dialog.html',
  styleUrl: './perfil-dialog.scss',
})
export class PerfilDialog {
  private readonly auth = inject(AuthService);
  private readonly dialogo = inject(MatDialogRef<PerfilDialog>);
  private readonly aviso = inject(MatSnackBar);

  readonly sesion = this.auth.sesion;
  readonly rol = computed(() => (this.sesion()?.rol === 'Admin' ? 'Administrador' : 'Operador'));
  readonly cambiando = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group(
    {
      passwordActual: ['', Validators.required],
      passwordNueva: ['', [Validators.required, Validators.minLength(8)]],
      confirmacion: ['', Validators.required],
    },
    { validators: coinciden },
  );
  readonly error = signal('');

  cancelarCambio(): void {
    this.cambiando.set(false);
    this.form.reset();
    this.error.set('');
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { passwordActual, passwordNueva } = this.form.getRawValue();
    this.auth.cambiarPassword(passwordActual, passwordNueva).subscribe({
      next: () => {
        this.aviso.open('Contraseña actualizada', 'Cerrar', { duration: 3000 });
        this.dialogo.close(true);
      },
      error: (e: HttpErrorResponse) =>
        this.error.set(e.error?.detail ?? 'No se pudo cambiar la contraseña'),
    });
  }
}
