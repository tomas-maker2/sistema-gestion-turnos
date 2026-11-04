import { Component, OnDestroy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ConfirmarDialog } from '../shared/confirmar-dialog';
import { PerfilDialog } from './perfil-dialog';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout implements OnDestroy {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly dialogo = inject(MatDialog);

  abrirPerfil(): void {
    this.dialogo.open(PerfilDialog, { width: '440px' });
  }

  // Pide confirmación antes de cerrar la sesión
  cerrarSesion(): void {
    this.dialogo
      .open(ConfirmarDialog, {
        data: { titulo: 'Cerrar sesión', mensaje: '¿Querés cerrar la sesión?', textoConfirmar: 'Logout' },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) return;
        this.auth.logout();
        this.router.navigate(['/login']);
      });
  }

  // Al salir (por "Logout" o por sesión vencida) no deben quedar diálogos sobre el login
  ngOnDestroy(): void {
    this.dialogo.closeAll();
  }
}
