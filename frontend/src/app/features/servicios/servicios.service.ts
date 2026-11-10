import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api-config';

export interface Servicio {
  id: number;
  nombre: string;
  duracionMinutos: number;
  activo: boolean;
}

// Lo que se envía al crear o modificar (el id va en la URL)
export type ServicioDatos = Omit<Servicio, 'id'>;

@Injectable({ providedIn: 'root' })
export class ServiciosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/servicios`;

  listar(incluirInactivos = false): Observable<Servicio[]> {
    let params = new HttpParams();
    if (incluirInactivos) params = params.set('incluirInactivos', true);
    return this.http.get<Servicio[]>(this.url, { params });
  }

  crear(datos: ServicioDatos): Observable<Servicio> {
    return this.http.post<Servicio>(this.url, datos);
  }

  modificar(id: number, datos: ServicioDatos): Observable<Servicio> {
    return this.http.put<Servicio>(`${this.url}/${id}`, datos);
  }

  // Baja lógica: el servicio queda inactivo
  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
