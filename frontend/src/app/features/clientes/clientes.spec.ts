import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { ConfirmarDialog } from '../../shared/confirmar-dialog';
import { ClienteForm } from './cliente-form';
import { Cliente, ClientesService } from './clientes.service';
import { Clientes } from './clientes';

describe('Clientes', () => {
  let servicio: { listar: ReturnType<typeof vi.fn>; desactivar: ReturnType<typeof vi.fn>; modificar: ReturnType<typeof vi.fn> };
  let dialogo: { open: ReturnType<typeof vi.fn> };
  let aviso: { open: ReturnType<typeof vi.fn> };

  const ana: Cliente = { id: 1, nombre: 'Ana', apellido: 'Pérez', telefono: '1111', email: 'ana@mail.com', activo: true };
  const luis: Cliente = { id: 2, nombre: 'Luis', apellido: 'Gómez', telefono: '2222', email: null, activo: false };
  const pagina = (items: Cliente[], total = items.length) => ({ items, total, pagina: 1, tamanio: 5 });

  async function crear() {
    servicio = { listar: vi.fn().mockReturnValue(of(pagina([ana, luis]))), desactivar: vi.fn(), modificar: vi.fn() };
    dialogo = { open: vi.fn() };
    aviso = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [Clientes],
      providers: [
        { provide: ClientesService, useValue: servicio },
        { provide: MatDialog, useValue: dialogo },
        { provide: MatSnackBar, useValue: aviso },
      ],
    });
    const fixture = TestBed.createComponent(Clientes);
    await fixture.whenStable();
    return fixture;
  }

  const responder = (r: boolean | undefined) => dialogo.open.mockReturnValue({ afterClosed: () => of(r) });
  const filas = (f: { nativeElement: HTMLElement }) => Array.from(f.nativeElement.querySelectorAll('app-grilla tbody tr'));
  const botones = (fila: Element) => Array.from(fila.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));
  const ultimaLlamada = () => servicio.listar.mock.calls.at(-1);

  it('carga_los_clientes_activos_por_defecto', async () => {
    await crear();
    expect(servicio.listar).toHaveBeenCalledWith('', false, 1, 5);
  });

  it('muestra_apellido_y_nombre_telefono_y_email', async () => {
    const fixture = await crear();
    const [conEmail, sinEmail] = filas(fixture);

    expect(conEmail.textContent).toContain('Pérez, Ana');
    expect(conEmail.textContent).toContain('1111');
    expect(conEmail.textContent).toContain('ana@mail.com');
    expect(sinEmail.textContent).toContain('—');
  });

  it('los_activos_ofrecen_desactivar_y_los_inactivos_reactivar', async () => {
    const fixture = await crear();
    const [activo, inactivo] = filas(fixture);

    expect(botones(activo)).toEqual(['Editar', 'Desactivar']);
    expect(botones(inactivo)).toEqual(['Editar', 'Reactivar']);
    expect(inactivo.classList).toContain('inactiva');
    expect(inactivo.textContent).toContain('Inactivo');
  });

  it('buscar_recarga_con_el_texto', async () => {
    const fixture = await crear();

    fixture.componentInstance.buscar('ana');

    expect(ultimaLlamada()).toEqual(['ana', false, 1, 5]);
  });

  it('mostrar_inactivos_recarga_incluyendolos', async () => {
    const fixture = await crear();

    fixture.componentInstance.mostrarInactivos(true);

    expect(ultimaLlamada()).toEqual(['', true, 1, 5]);
  });

  it('buscar_y_mostrar_inactivos_se_combinan', async () => {
    const fixture = await crear();

    fixture.componentInstance.buscar('go');
    fixture.componentInstance.mostrarInactivos(true);

    expect(ultimaLlamada()).toEqual(['go', true, 1, 5]);
  });

  it('cambiar_de_pagina_o_de_tamanio_recarga_manteniendo_los_filtros', async () => {
    const fixture = await crear();
    fixture.componentInstance.buscar('an');
    fixture.componentInstance.mostrarInactivos(true);

    fixture.componentInstance.cambiarPagina({ pagina: 2, tamanio: 10 });

    expect(ultimaLlamada()).toEqual(['an', true, 2, 10]);
  });

  it('buscar_vuelve_a_la_primera_pagina_pero_conserva_el_tamanio', async () => {
    const fixture = await crear();
    fixture.componentInstance.cambiarPagina({ pagina: 3, tamanio: 10 });

    fixture.componentInstance.buscar('ana');

    expect(ultimaLlamada()).toEqual(['ana', false, 1, 10]);
  });

  it('mostrar_inactivos_vuelve_a_la_primera_pagina', async () => {
    const fixture = await crear();
    fixture.componentInstance.cambiarPagina({ pagina: 4, tamanio: 5 });

    fixture.componentInstance.mostrarInactivos(true);

    expect(ultimaLlamada()).toEqual(['', true, 1, 5]);
  });

  it('la_grilla_muestra_el_total_que_informa_la_API', async () => {
    const fixture = await crear();
    servicio.listar.mockReturnValue(of(pagina([ana], 23)));

    fixture.componentInstance.buscar('a');

    expect(fixture.componentInstance.paginado.total()).toBe(23);
  });

  it('si_la_pagina_queda_vacia_pide_la_ultima_que_tiene_datos', async () => {
    const fixture = await crear();
    fixture.componentInstance.cambiarPagina({ pagina: 3, tamanio: 5 });
    servicio.listar.mockReturnValueOnce(of(pagina([], 10)));
    servicio.listar.mockReturnValueOnce(of(pagina([ana], 10)));

    fixture.componentInstance.cargar();

    expect(ultimaLlamada()).toEqual(['', false, 2, 5]);
  });

  it('avisa_si_no_hay_clientes', async () => {
    const fixture = await crear();
    servicio.listar.mockReturnValue(of(pagina([])));

    fixture.componentInstance.buscar('zzz');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No hay clientes');
  });

  it('nuevo_abre_el_formulario_sin_datos_y_recarga_si_se_guardo', async () => {
    const fixture = await crear();
    responder(true);

    fixture.componentInstance.nuevo();

    expect(dialogo.open).toHaveBeenCalledWith(ClienteForm, expect.objectContaining({ data: null }));
    expect(servicio.listar).toHaveBeenCalledTimes(2);
    expect(aviso.open).toHaveBeenCalledWith('Cliente guardado', 'Cerrar', expect.anything());
  });

  it('si_se_cancela_el_formulario_no_recarga', async () => {
    const fixture = await crear();
    responder(undefined);

    fixture.componentInstance.nuevo();

    expect(servicio.listar).toHaveBeenCalledTimes(1);
  });

  it('editar_abre_el_formulario_con_el_cliente', async () => {
    const fixture = await crear();
    responder(true);

    fixture.componentInstance.editar(ana);

    expect(dialogo.open).toHaveBeenCalledWith(ClienteForm, expect.objectContaining({ data: ana }));
  });

  it('desactivar_pide_confirmacion_con_el_nombre_y_si_se_confirma_desactiva', async () => {
    const fixture = await crear();
    servicio.desactivar.mockReturnValue(of(undefined));
    responder(true);

    fixture.componentInstance.desactivar(ana);

    expect(dialogo.open).toHaveBeenCalledWith(ConfirmarDialog, expect.objectContaining({
      data: expect.objectContaining({ mensaje: expect.stringContaining('Ana Pérez'), textoConfirmar: 'Desactivar' }),
    }));
    expect(servicio.desactivar).toHaveBeenCalledWith(1);
    expect(servicio.listar).toHaveBeenCalledTimes(2);
    expect(aviso.open).toHaveBeenCalledWith('Cliente desactivado', 'Cerrar', expect.anything());
  });

  it('desactivar_cancelado_no_llama_al_servicio', async () => {
    const fixture = await crear();
    responder(false);

    fixture.componentInstance.desactivar(ana);

    expect(servicio.desactivar).not.toHaveBeenCalled();
  });

  it('reactivar_modifica_con_activo_true_conservando_los_datos', async () => {
    const fixture = await crear();
    servicio.modificar.mockReturnValue(of({}));

    fixture.componentInstance.reactivar(luis);

    expect(dialogo.open).not.toHaveBeenCalled();
    expect(servicio.modificar).toHaveBeenCalledWith(2, {
      nombre: 'Luis', apellido: 'Gómez', telefono: '2222', email: null, activo: true,
    });
    expect(aviso.open).toHaveBeenCalledWith('Cliente reactivado', 'Cerrar', expect.anything());
  });

  it('muestra_el_mensaje_de_la_API_si_falla_una_operacion', async () => {
    const fixture = await crear();
    servicio.desactivar.mockReturnValue(throwError(() =>
      new HttpErrorResponse({ status: 404, error: { detail: 'El cliente no existe' } })));
    responder(true);

    fixture.componentInstance.desactivar(ana);

    expect(aviso.open).toHaveBeenCalledWith('El cliente no existe', 'Cerrar', expect.anything());
  });

  it('muestra_el_mensaje_si_falla_la_carga', async () => {
    const fixture = await crear();
    servicio.listar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    fixture.componentInstance.buscar('x');

    expect(aviso.open).toHaveBeenCalledWith('No se pudo conectar con el servidor', 'Cerrar', expect.anything());
  });

  it('despues_de_un_error_de_carga_la_busqueda_sigue_funcionando', async () => {
    const fixture = await crear();
    servicio.listar.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    fixture.componentInstance.buscar('x');
    servicio.listar.mockReturnValue(of(pagina([ana])));

    fixture.componentInstance.buscar('ana');
    await fixture.whenStable();

    expect(filas(fixture)).toHaveLength(1);
  });
});
