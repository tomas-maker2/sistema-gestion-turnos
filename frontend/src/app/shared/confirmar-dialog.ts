import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmarDatos {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
}

// Modal de confirmación: se cierra con true si el usuario confirma y con false si cancela
@Component({
  selector: 'app-confirmar-dialog',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirmar-dialog.html',
})
export class ConfirmarDialog {
  readonly datos = inject<ConfirmarDatos>(MAT_DIALOG_DATA);
}
