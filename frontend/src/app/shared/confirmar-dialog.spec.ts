import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmarDatos, ConfirmarDialog } from './confirmar-dialog';

describe('ConfirmarDialog', () => {
  async function crear(datos: ConfirmarDatos) {
    TestBed.configureTestingModule({
      imports: [ConfirmarDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(ConfirmarDialog);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const botones = (el: HTMLElement) => Array.from(el.querySelectorAll('button')).map((b) => b.textContent!.trim());

  it('muestra_el_titulo_y_el_mensaje', async () => {
    const el = await crear({ titulo: 'Cerrar sesión', mensaje: '¿Querés cerrar la sesión?' });

    expect(el.textContent).toContain('Cerrar sesión');
    expect(el.textContent).toContain('¿Querés cerrar la sesión?');
  });

  it('el_boton_de_confirmar_dice_Confirmar_por_defecto', async () => {
    const el = await crear({ titulo: 'T', mensaje: 'M' });
    expect(botones(el)).toEqual(['Cancelar', 'Confirmar']);
  });

  it('el_boton_de_confirmar_usa_el_texto_indicado', async () => {
    const el = await crear({ titulo: 'T', mensaje: 'M', textoConfirmar: 'Logout' });
    expect(botones(el)).toEqual(['Cancelar', 'Logout']);
  });

  it('el_boton_de_cancelar_usa_el_texto_indicado', async () => {
    const el = await crear({ titulo: 'T', mensaje: 'M', textoConfirmar: 'Cancelar turno', textoCancelar: 'Volver' });
    expect(botones(el)).toEqual(['Volver', 'Cancelar turno']);
  });
});
