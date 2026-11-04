import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { API_URL } from './api-config';

export type Rol = 'Admin' | 'Operador';

export interface Sesion {
  token: string;
  nombreUsuario: string;
  nombreCompleto: string;
  rol: Rol;
  expira: string;
}

const CLAVE_SESION = 'sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly sesion = signal<Sesion | null>(this.leerSesionGuardada());
  readonly estaAutenticado = computed(() => this.sesion() !== null);
  readonly esAdmin = computed(() => this.sesion()?.rol === 'Admin');
  readonly token = computed(() => this.sesion()?.token ?? null);

  login(nombreUsuario: string, password: string): Observable<void> {
    return this.http.post<Sesion>(`${API_URL}/auth/login`, { nombreUsuario, password }).pipe(
      tap((sesion) => this.guardarSesion(sesion)),
      map(() => undefined),
    );
  }

  logout(): void {
    localStorage.removeItem(CLAVE_SESION);
    this.sesion.set(null);
  }

  cambiarPassword(passwordActual: string, passwordNueva: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/auth/cambiar-password`, { passwordActual, passwordNueva });
  }

  private guardarSesion(sesion: Sesion): void {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    this.sesion.set(sesion);
  }

  // Recupera la sesión guardada si sigue vigente
  private leerSesionGuardada(): Sesion | null {
    try {
      const texto = localStorage.getItem(CLAVE_SESION);
      if (!texto) return null;

      const sesion = JSON.parse(texto) as Sesion;
      if (new Date(sesion.expira) > new Date()) return sesion;

      localStorage.removeItem(CLAVE_SESION);
    } catch {
      // Formato inválido: se ignora
    }
    return null;
  }
}
