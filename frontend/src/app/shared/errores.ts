import { HttpErrorResponse } from '@angular/common/http';

// Texto para mostrarle al usuario cuando la API responde con un error
export function mensajeDeError(e: HttpErrorResponse): string {
  if (e.status === 0) return 'No se pudo conectar con el servidor';
  if (e.error?.errors) return 'Revisá los datos ingresados';
  return e.error?.detail ?? e.error?.title ?? 'Ocurrió un error, intentá de nuevo';
}
