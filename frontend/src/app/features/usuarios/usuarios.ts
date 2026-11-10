import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { ConfirmarDialog } from '../../shared/confirmar-dialog';
import { mensajeDeError } from '../../shared/errores';
import { ColumnaGrilla, Grilla } from '../../shared/grilla/grilla';
import { CambioDePagina, EstadoPaginado, Pagina } from '../../shared/paginado';
import { etiquetaRol } from '../../shared/roles';
import { ResetearPasswordDialog } from './resetear-password-dialog';
import { UsuarioForm } from './usuario-form';
import { Usuario, UsuariosService } from './usuarios.service';

// Listado de usuarios (solo para administradores): alta, edición, baja lógica y restablecer clave
@Component({
  selector: 'app-usuarios',
  imports: [Grilla, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './usuarios.html',
})
export class Usuarios {
  private readonly servicio = inject(UsuariosService);
  private readonly dialogo = inject(MatDialog);
  private readonly aviso = inject(MatSnackBar);

  readonly columnas: ColumnaGrilla<Usuario>[] = [
    { titulo: 'Usuario', valor: (u) => u.nombreUsuario },
    { titulo: 'Nombre', valor: (u) => u.nombreCompleto },
    { titulo: 'Rol', valor: (u) => etiquetaRol(u.rol) },
  ];
  readonly filas = signal<Usuario[]>([]);
  readonly paginado = new EstadoPaginado();

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.servicio.listar(this.paginado.pagina(), this.paginado.tamanio()).subscribe({
      next: (pagina) => this.mostrar(pagina),
      error: (e: HttpErrorResponse) => this.avisarError(e),
    });
  }

  cambiarPagina(cambio: CambioDePagina): void {
    this.paginado.cambiar(cambio);
    this.cargar();
  }

  nuevo(): void {
    this.abrirFormulario(null);
  }

  editar(usuario: Usuario): void {
    this.abrirFormulario(usuario);
  }

  restablecerPassword(usuario: Usuario): void {
    this.dialogo
      .open(ResetearPasswordDialog, { width: '420px', data: usuario })
      .afterClosed()
      .subscribe((hecho) => {
        if (hecho) this.avisar('Contraseña restablecida');
      });
  }

  desactivar(usuario: Usuario): void {
    this.dialogo
      .open(ConfirmarDialog, {
        data: {
          titulo: 'Desactivar usuario',
          mensaje: `¿Querés desactivar a ${usuario.nombreCompleto}? Podés reactivarlo después.`,
          textoConfirmar: 'Desactivar',
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) this.ejecutar(this.servicio.desactivar(usuario.id), 'Usuario desactivado');
      });
  }

  reactivar(usuario: Usuario): void {
    const datos = { nombreCompleto: usuario.nombreCompleto, rol: usuario.rol, activo: true };
    this.ejecutar(this.servicio.modificar(usuario.id, datos), 'Usuario reactivado');
  }

  private mostrar(pagina: Pagina<Usuario>): void {
    this.filas.set(pagina.items);
    // Si la página quedó vacía (se dio de baja lo último que tenía), se pide la anterior
    if (this.paginado.actualizar(pagina.total, pagina.items.length)) this.cargar();
  }

  private abrirFormulario(usuario: Usuario | null): void {
    this.dialogo
      .open(UsuarioForm, { width: '440px', data: usuario })
      .afterClosed()
      .subscribe((guardado) => {
        if (!guardado) return;
        this.avisar('Usuario guardado');
        this.cargar();
      });
  }

  // Ejecuta una operación, avisa el resultado y recarga la lista
  private ejecutar(operacion: Observable<unknown>, mensaje: string): void {
    operacion.subscribe({
      next: () => {
        this.avisar(mensaje);
        this.cargar();
      },
      error: (e: HttpErrorResponse) => this.avisarError(e),
    });
  }

  private avisar(mensaje: string): void {
    this.aviso.open(mensaje, 'Cerrar', { duration: 3000 });
  }

  private avisarError(e: HttpErrorResponse): void {
    this.aviso.open(mensajeDeError(e), 'Cerrar', { duration: 5000 });
  }
}
