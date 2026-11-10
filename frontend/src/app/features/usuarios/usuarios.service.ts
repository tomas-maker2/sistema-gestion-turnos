import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api-config';
import { Rol } from '../../core/auth.service';

export interface Usuario {
  id: number;
  nombreUsuario: string;
  nombreCompleto: string;
  rol: Rol;
  activo: boolean;
}

export interface UsuarioCrear {
  nombreUsuario: string;
  nombreCompleto: string;
  password: string;
  rol: Rol;
}

export interface UsuarioModificar {
  nombreCompleto: string;
  rol: Rol;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/usuarios`;

  listar(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.url);
  }

  crear(datos: UsuarioCrear): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, datos);
  }

  modificar(id: number, datos: UsuarioModificar): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.url}/${id}`, datos);
  }

  // Baja lógica: el usuario queda inactivo
  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  resetearPassword(id: number, passwordNueva: string): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/resetear-password`, { passwordNueva });
  }
}
