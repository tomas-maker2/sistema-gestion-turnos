import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { ConfirmarDialog } from '../../shared/confirmar-dialog';
import { ServicioForm } from './servicio-form';
import { Servicio, ServiciosService } from './servicios.service';
import { Servicios } from './servicios';

describe('Servicios', () => {
  let servicio: { listar: ReturnType<typeof vi.fn>; desactivar: ReturnType<typeof vi.fn>; modificar: ReturnType<typeof vi.fn> };
  let dialogo: { open: ReturnType<typeof vi.fn> };
  let aviso: { open: ReturnType<typeof vi.fn> };

  const corte: Servicio = { id: 1, nombre: 'Corte de pelo', duracionMinutos: 30, activo: true };
  const color: Servicio = { id: 2, nombre: 'Coloración', duracionMinutos: 90, activo: false };
  const pagina = (items: Servicio[], total = items.length) => ({ items, total, pagina: 1, tamanio: 5 });

  async function crear() {
    servicio = { listar: vi.fn().mockReturnValue(of(pagina([corte, color]))), desactivar: vi.fn(), modificar: vi.fn() };
    dialogo = { open: vi.fn() };
    aviso = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [Servicios],
      providers: [
        { provide: ServiciosService, useValue: servicio },
        { provide: MatDialog, useValue: dialogo },
        { provide: MatSnackBar, useValue: aviso },
      ],
    });
    const fixture = TestBed.createComponent(Servicios);
    await fixture.whenStable();
    return fixture;
  }

  const responder = (r: boolean | undefined) => dialogo.open.mockReturnValue({ afterClosed: () => of(r) });
  const filas = (f: { nativeElement: HTMLElement }) => Array.from(f.nativeElement.querySelectorAll('app-grilla tbody tr'));
  const botones = (fila: Element) => Array.from(fila.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));

  it('carga_solo_los_servicios_activos_por_defecto', async () => {
    await crear();
    expect(servicio.listar).toHaveBeenCalledWith(false, 1, 5);
  });

  it('muestra_el_nombre_y_la_duracion_en_minutos', async () => {
    const fixture = await crear();

    expect(filas(fixture)[0].textContent).toContain('Corte de pelo');
    expect(filas(fixture)[0].textContent).toContain('30 min');
    expect(filas(fixture)[1].textContent).toContain('90 min');
  });

  it('los_activos_ofrecen_desactivar_y_los_inactivos_reactivar', async () => {
    const fixture = await crear();
    const [activo, inactivo] = filas(fixture);

    expect(botones(activo)).toEqual(['Editar', 'Desactivar']);
    expect(botones(inactivo)).toEqual(['Editar', 'Reactivar']);
    expect(inactivo.classList).toContain('inactiva');
    expect(inactivo.textContent).toContain('Inactivo');
  });

  it('mostrar_inactivos_recarga_incluyendolos', async () => {
    const fixture = await crear();

    fixture.componentInstance.mostrarInactivos(true);

    expect(servicio.listar).toHaveBeenLastCalledWith(true, 1, 5);
  });

  it('cambiar_de_pagina_o_de_tamanio_recarga_manteniendo_el_filtro', async () => {
    const fixture = await crear();
    fixture.componentInstance.mostrarInactivos(true);

    fixture.componentInstance.cambiarPagina({ pagina: 2, tamanio: 10 });

    expect(servicio.listar).toHaveBeenLastCalledWith(true, 2, 10);
  });

  it('mostrar_inactivos_vuelve_a_la_primera_pagina_pero_conserva_el_tamanio', async () => {
    const fixture = await crear();
    fixture.componentInstance.cambiarPagina({ pagina: 3, tamanio: 10 });

    fixture.componentInstance.mostrarInactivos(true);

    expect(servicio.listar).toHaveBeenLastCalledWith(true, 1, 10);
  });

  it('la_grilla_muestra_el_total_que_informa_la_API', async () => {
    const fixture = await crear();
    servicio.listar.mockReturnValue(of(pagina([corte], 23)));

    fixture.componentInstance.cargar();

    expect(fixture.componentInstance.paginado.total()).toBe(23);
  });

  it('si_la_pagina_queda_vacia_pide_la_ultima_que_tiene_datos', async () => {
    const fixture = await crear();
    fixture.componentInstance.cambiarPagina({ pagina: 3, tamanio: 5 });
    servicio.listar.mockReturnValueOnce(of(pagina([], 10)));
    servicio.listar.mockReturnValueOnce(of(pagina([corte], 10)));

    fixture.componentInstance.cargar();

    expect(servicio.listar).toHaveBeenLastCalledWith(false, 2, 5);
  });

  it('avisa_si_no_hay_servicios', async () => {
    const fixture = await crear();
    servicio.listar.mockReturnValue(of(pagina([])));

    fixture.componentInstance.cargar();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No hay servicios');
  });

  it('nuevo_abre_el_formulario_sin_datos_y_recarga_si_se_guardo', async () => {
    const fixture = await crear();
    responder(true);

    fixture.componentInstance.nuevo();

    expect(dialogo.open).toHaveBeenCalledWith(ServicioForm, expect.objectContaining({ data: null }));
    expect(servicio.listar).toHaveBeenCalledTimes(2);
    expect(aviso.open).toHaveBeenCalledWith('Servicio guardado', 'Cerrar', expect.anything());
  });

  it('si_se_cancela_el_formulario_no_recarga', async () => {
    const fixture = await crear();
    responder(undefined);

    fixture.componentInstance.nuevo();

    expect(servicio.listar).toHaveBeenCalledTimes(1);
  });

  it('editar_abre_el_formulario_con_el_servicio', async () => {
    const fixture = await crear();
    responder(true);

    fixture.componentInstance.editar(corte);

    expect(dialogo.open).toHaveBeenCalledWith(ServicioForm, expect.objectContaining({ data: corte }));
  });

  it('desactivar_pide_confirmacion_y_si_se_confirma_desactiva_y_recarga', async () => {
    const fixture = await crear();
    servicio.desactivar.mockReturnValue(of(undefined));
    responder(true);

    fixture.componentInstance.desactivar(corte);

    expect(dialogo.open).toHaveBeenCalledWith(ConfirmarDialog, expect.objectContaining({
      data: expect.objectContaining({ mensaje: expect.stringContaining('Corte de pelo'), textoConfirmar: 'Desactivar' }),
    }));
    expect(servicio.desactivar).toHaveBeenCalledWith(1);
    expect(servicio.listar).toHaveBeenCalledTimes(2);
    expect(aviso.open).toHaveBeenCalledWith('Servicio desactivado', 'Cerrar', expect.anything());
  });

  it('desactivar_cancelado_no_llama_al_servicio', async () => {
    const fixture = await crear();
    responder(false);

    fixture.componentInstance.desactivar(corte);

    expect(servicio.desactivar).not.toHaveBeenCalled();
  });

  it('reactivar_modifica_con_activo_true_conservando_los_datos', async () => {
    const fixture = await crear();
    servicio.modificar.mockReturnValue(of({}));

    fixture.componentInstance.reactivar(color);

    expect(dialogo.open).not.toHaveBeenCalled();
    expect(servicio.modificar).toHaveBeenCalledWith(2, { nombre: 'Coloración', duracionMinutos: 90, activo: true });
    expect(aviso.open).toHaveBeenCalledWith('Servicio reactivado', 'Cerrar', expect.anything());
  });

  it('muestra_el_mensaje_de_la_API_si_falla_una_operacion', async () => {
    const fixture = await crear();
    servicio.modificar.mockReturnValue(throwError(() =>
      new HttpErrorResponse({ status: 409, error: { detail: 'Ya existe un servicio con ese nombre' } })));

    fixture.componentInstance.reactivar(color);

    expect(aviso.open).toHaveBeenCalledWith('Ya existe un servicio con ese nombre', 'Cerrar', expect.anything());
  });

  it('muestra_el_mensaje_si_falla_la_carga', async () => {
    const fixture = await crear();
    servicio.listar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    fixture.componentInstance.cargar();

    expect(aviso.open).toHaveBeenCalledWith('No se pudo conectar con el servidor', 'Cerrar', expect.anything());
  });
});
