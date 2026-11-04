import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = inject(FormBuilder).nonNullable.group({
    nombreUsuario: ['', Validators.required],
    password: ['', Validators.required],
  });
  readonly error = signal('');
  readonly enviando = signal(false);

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nombreUsuario, password } = this.form.getRawValue();
    this.error.set('');
    this.enviando.set(true);

    this.auth.login(nombreUsuario, password).subscribe({
      next: () => this.router.navigateByUrl('/agenda'),
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.error.set(this.mensajeDe(e));
      },
    });
  }

  private mensajeDe(e: HttpErrorResponse): string {
    if (e.status === 401) return 'Usuario o contraseña incorrectos';
    if (e.status === 0) return 'No se pudo conectar con el servidor';
    return 'Ocurrió un error, intentá de nuevo';
  }
}
