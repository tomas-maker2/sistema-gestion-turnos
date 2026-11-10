import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api-config';

export type EstadoTurno = 'Pendiente' | 'Atendido' | 'Cancelado';

export interface Turno {
  id: number;
  clienteId: number;
  clienteNombre: string;
  servicioId: number;
  servicioNombre: string;
  fechaHoraInicio: string; // "2026-11-10T09:00:00", sin zona horaria
  fechaHoraFin: string;
  estado: EstadoTurno;
  observaciones: string | null;
  usuarioId: number;
}

// Lo que se envía al crear o modificar: la hora de fin la calcula la API con la duración del servicio
export interface TurnoDatos {
  clienteId: number;
  servicioId: number;
  fechaHoraInicio: string;
  observaciones: string | null;
}

@Injectable({ providedIn: 'root' })
export class TurnosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/turnos`;

  // Turnos con inicio desde "desde" (incluido) hasta "hasta" (excluido). Fechas "AAAA-MM-DD".
  agenda(desde: string, hasta: string): Observable<Turno[]> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http.get<Turno[]>(this.url, { params });
  }

  crear(datos: TurnoDatos): Observable<Turno> {
    return this.http.post<Turno>(this.url, datos);
  }

  modificar(id: number, datos: TurnoDatos): Observable<Turno> {
    return this.http.put<Turno>(`${this.url}/${id}`, datos);
  }

  cancelar(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/cancelar`, null);
  }

  marcarAtendido(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${id}/atendido`, null);
  }
}
