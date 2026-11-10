import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api-config';
import { Pagina, TAMANIO_POR_DEFECTO } from '../../shared/paginado';

export interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  activo: boolean;
}

// Lo que se envía al crear o modificar (el id va en la URL)
export type ClienteDatos = Omit<Cliente, 'id'>;

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/clientes`;

  listar(texto = '', incluirInactivos = false, pagina = 1, tamanio = TAMANIO_POR_DEFECTO): Observable<Pagina<Cliente>> {
    let params = new HttpParams().set('pagina', pagina).set('tamanio', tamanio);
    if (texto.trim()) params = params.set('texto', texto.trim());
    if (incluirInactivos) params = params.set('incluirInactivos', true);
    return this.http.get<Pagina<Cliente>>(this.url, { params });
  }

  crear(datos: ClienteDatos): Observable<Cliente> {
    return this.http.post<Cliente>(this.url, datos);
  }

  modificar(id: number, datos: ClienteDatos): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.url}/${id}`, datos);
  }

  // Baja lógica: el cliente queda inactivo
  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
