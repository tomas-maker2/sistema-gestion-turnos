import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Exige haber iniciado sesión
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthService).estaAutenticado() || router.createUrlTree(['/login']);
};

// Exige ser administrador
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthService).esAdmin() || router.createUrlTree(['/agenda']);
};
