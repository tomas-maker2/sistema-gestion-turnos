import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './api-config';
import { AuthService } from './auth.service';

// Agrega el token a las llamadas a la API y cierra la sesión si el servidor responde 401
export const authInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.token();
  const conToken = token && peticion.url.startsWith(API_URL)
    ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : peticion;

  return siguiente(conToken).pipe(
    catchError((error) => {
      // En el login un 401 solo significa "clave incorrecta"
      if (error.status === 401 && !peticion.url.endsWith('/auth/login')) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
