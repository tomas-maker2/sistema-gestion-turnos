import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { Cliente, ClientesService } from '../clientes/clientes.service';
import { Servicio, ServiciosService } from '../servicios/servicios.service';
import { TurnoForm, TurnoFormDatos } from './turno-form';
import { Turno, TurnosService } from './turnos.service';

describe('TurnoForm', () => {
  let turnos: { crear: ReturnType<typeof vi.fn>; modificar: ReturnType<typeof vi.fn> };
  let clientes: { listar: ReturnType<typeof vi.fn> };
  let servicios: { listar: ReturnType<typeof vi.fn> };
  let dialogo: { close: ReturnType<typeof vi.fn> };

  const ana: Cliente = { id: 7, nombre: 'Ana', apellido: 'Pérez', telefono: '1111', email: null, activo: true };
  const luis: Cliente = { id: 8, nombre: 'Luis', apellido: 'Gómez', telefono: '2222', email: null, activo: true };
  const corte: Servicio = { id: 1, nombre: 'Corte de pelo', duracionMinutos: 30, activo: true };
  const color: Servicio = { id: 2, nombre: 'Coloración', duracionMinutos: 90, activo: true };
  const pagina = <T>(items: T[]) => ({ items, total: items.length, pagina: 1, tamanio: 10 });
  const opcionAna = { id: 7, texto: 'Pérez, Ana' };

  const nuevo: TurnoFormDatos = { turno: null, fechaInicial: new Date(2026, 10, 12, 9, 0) };
  const existente: Turno = {
    id: 20, clienteId: 7, clienteNombre: 'Pérez, Ana', servicioId: 1, servicioNombre: 'Corte de pelo',
    fechaHoraInicio: '2026-11-12T10:00:00', fechaHoraFin: '2026-11-12T10:30:00', estado: 'Pendiente',
    observaciones: 'Trae foto', usuarioId: 1,
  };

  async function crear(datos: TurnoFormDatos) {
    turnos = { crear: vi.fn(), modificar: vi.fn() };
    clientes = { listar: vi.fn().mockReturnValue(of(pagina([ana, luis]))) };
    servicios = { listar: vi.fn().mockReturnValue(of(pagina([corte, color]))) };
    dialogo = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [TurnoForm],
      providers: [
        { provide: TurnosService, useValue: turnos },
        { provide: ClientesService, useValue: clientes },
        { provide: ServiciosService, useValue: servicios },
        { provide: MatDialogRef, useValue: dialogo },
        { provide: MAT_DIALOG_DATA, useValue: datos },
      ],
    });
    const fixture = TestBed.createComponent(TurnoForm);
    await fixture.whenStable();
    return fixture;
  }

  const texto = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent!.replace(/\s+/g, ' ');

  // Completa el formulario como lo haría el usuario
  function completar(f: Awaited<ReturnType<typeof crear>>, valores: Record<string, unknown> = {}) {
    f.componentInstance.form.patchValue({
      cliente: opcionAna, servicioId: 1, fechaHora: '2026-11-12T10:00', observaciones: '', ...valores,
    });
  }

  describe('alta', () => {
    it('titulo_y_fecha_inicial_sugerida', async () => {
      const fixture = await crear(nuevo);

      expect(texto(fixture)).toContain('Nuevo turno');
      expect(fixture.componentInstance.form.getRawValue().fechaHora).toBe('2026-11-12T09:00');
    });

    it('carga_solo_los_servicios_activos_con_su_duracion', async () => {
      const fixture = await crear(nuevo);

      expect(servicios.listar).toHaveBeenCalledWith(false, 1, 100);
      expect(fixture.componentInstance.servicios()).toEqual([
        { id: 1, texto: 'Corte de pelo (30 min)', duracionMinutos: 30 },
        { id: 2, texto: 'Coloración (90 min)', duracionMinutos: 90 },
      ]);
    });

    it('al_abrir_sugiere_los_primeros_10_clientes_activos', async () => {
      const fixture = await crear(nuevo);

      expect(clientes.listar).toHaveBeenCalledWith('', false, 1, 10);
      expect(fixture.componentInstance.clientes()).toEqual([opcionAna, { id: 8, texto: 'Gómez, Luis' }]);
    });

    it('al_escribir_busca_clientes_por_el_texto', async () => {
      const fixture = await crear(nuevo);

      fixture.componentInstance.form.controls.cliente.setValue('pe');

      expect(clientes.listar).toHaveBeenLastCalledWith('pe', false, 1, 10);
    });

    it('al_elegir_un_cliente_no_vuelve_a_buscar', async () => {
      const fixture = await crear(nuevo);
      clientes.listar.mockClear();

      fixture.componentInstance.form.controls.cliente.setValue(opcionAna);

      expect(clientes.listar).not.toHaveBeenCalled();
    });

    it.each(['cliente', 'servicioId', 'fechaHora'])('no_envia_si_falta_%s', async (campo) => {
      const fixture = await crear(nuevo);
      completar(fixture, { [campo]: campo === 'fechaHora' ? '' : null });

      fixture.componentInstance.guardar();

      expect(turnos.crear).not.toHaveBeenCalled();
    });

    it('no_envia_si_el_cliente_es_solo_texto_escrito_sin_elegir_de_la_lista', async () => {
      const fixture = await crear(nuevo);
      completar(fixture, { cliente: 'Pérez' });

      fixture.componentInstance.guardar();

      expect(turnos.crear).not.toHaveBeenCalled();
    });

    it('no_envia_observaciones_de_mas_de_500_caracteres', async () => {
      const fixture = await crear(nuevo);
      completar(fixture, { observaciones: 'x'.repeat(501) });

      fixture.componentInstance.guardar();

      expect(turnos.crear).not.toHaveBeenCalled();
    });

    it('crea_con_los_datos_la_fecha_con_segundos_y_cierra_con_true', async () => {
      const fixture = await crear(nuevo);
      turnos.crear.mockReturnValue(of({}));
      completar(fixture);

      fixture.componentInstance.guardar();

      expect(turnos.crear).toHaveBeenCalledWith({
        clienteId: 7, servicioId: 1, fechaHoraInicio: '2026-11-12T10:00:00', observaciones: null,
      });
      expect(turnos.modificar).not.toHaveBeenCalled();
      expect(dialogo.close).toHaveBeenCalledWith(true);
    });

    it('recorta_las_observaciones', async () => {
      const fixture = await crear(nuevo);
      turnos.crear.mockReturnValue(of({}));
      completar(fixture, { observaciones: '  Trae foto  ' });

      fixture.componentInstance.guardar();

      expect(turnos.crear).toHaveBeenCalledWith(expect.objectContaining({ observaciones: 'Trae foto' }));
    });

    it('si_el_horario_esta_ocupado_muestra_el_mensaje_de_la_API_y_no_cierra', async () => {
      const fixture = await crear(nuevo);
      turnos.crear.mockReturnValue(throwError(() =>
        new HttpErrorResponse({ status: 409, error: { detail: 'El horario está ocupado por otro turno' } })));
      completar(fixture);

      fixture.componentInstance.guardar();
      await fixture.whenStable();

      expect(texto(fixture)).toContain('El horario está ocupado por otro turno');
      expect(dialogo.close).not.toHaveBeenCalled();
    });

    it('si_el_turno_empieza_en_el_pasado_muestra_el_mensaje_de_la_API', async () => {
      const fixture = await crear(nuevo);
      turnos.crear.mockReturnValue(throwError(() =>
        new HttpErrorResponse({ status: 400, error: { detail: 'El turno no puede empezar en el pasado' } })));
      completar(fixture);

      fixture.componentInstance.guardar();
      await fixture.whenStable();

      expect(texto(fixture)).toContain('El turno no puede empezar en el pasado');
    });

    it('despues_de_un_error_se_puede_corregir_y_volver_a_guardar', async () => {
      const fixture = await crear(nuevo);
      turnos.crear.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'ocupado' } })));
      turnos.crear.mockReturnValueOnce(of({}));
      completar(fixture);

      fixture.componentInstance.guardar();
      fixture.componentInstance.guardar();

      expect(turnos.crear).toHaveBeenCalledTimes(2);
      expect(dialogo.close).toHaveBeenCalledWith(true);
    });
  });

  describe('hora_de_fin_estimada', () => {
    it('se_calcula_con_la_duracion_del_servicio', async () => {
      const fixture = await crear(nuevo);

      completar(fixture, { servicioId: 2, fechaHora: '2026-11-12T10:00' });

      expect(fixture.componentInstance.finEstimado()).toBe('11:30');
    });

    it('se_muestra_en_pantalla', async () => {
      const fixture = await crear(nuevo);
      completar(fixture);

      fixture.detectChanges();

      expect(texto(fixture)).toContain('Termina a las 10:30');
    });

    it.each([
      ['sin_servicio', { servicioId: null }],
      ['sin_fecha', { fechaHora: '' }],
    ])('no_hay_hora_de_fin_%s', async (_nombre, valores) => {
      const fixture = await crear(nuevo);
      completar(fixture, valores);

      expect(fixture.componentInstance.finEstimado()).toBeNull();
    });
  });

  describe('edicion', () => {
    it('precarga_los_datos_del_turno', async () => {
      const fixture = await crear({ turno: existente, fechaInicial: new Date() });

      expect(texto(fixture)).toContain('Editar turno');
      expect(fixture.componentInstance.form.getRawValue()).toEqual({
        cliente: opcionAna, servicioId: 1, fechaHora: '2026-11-12T10:00', observaciones: 'Trae foto',
      });
    });

    it('no_busca_clientes_al_abrir_porque_ya_hay_uno_elegido', async () => {
      await crear({ turno: existente, fechaInicial: new Date() });
      expect(clientes.listar).not.toHaveBeenCalled();
    });

    it('guarda_con_modificar_y_cierra_con_true', async () => {
      const fixture = await crear({ turno: existente, fechaInicial: new Date() });
      turnos.modificar.mockReturnValue(of({}));
      fixture.componentInstance.form.patchValue({ fechaHora: '2026-11-12T15:30' });

      fixture.componentInstance.guardar();

      expect(turnos.modificar).toHaveBeenCalledWith(20, {
        clienteId: 7, servicioId: 1, fechaHoraInicio: '2026-11-12T15:30:00', observaciones: 'Trae foto',
      });
      expect(turnos.crear).not.toHaveBeenCalled();
      expect(dialogo.close).toHaveBeenCalledWith(true);
    });

    it('si_el_servicio_del_turno_ya_no_esta_activo_se_conserva_como_opcion', async () => {
      const viejo = { ...existente, servicioId: 99, servicioNombre: 'Servicio viejo' };

      const fixture = await crear({ turno: viejo, fechaInicial: new Date() });

      expect(fixture.componentInstance.servicios()).toContainEqual({ id: 99, texto: 'Servicio viejo', duracionMinutos: null });
      expect(fixture.componentInstance.form.getRawValue().servicioId).toBe(99);
    });

    it('muestra_el_error_de_la_API_al_modificar', async () => {
      const fixture = await crear({ turno: existente, fechaInicial: new Date() });
      turnos.modificar.mockReturnValue(throwError(() =>
        new HttpErrorResponse({ status: 409, error: { detail: 'Solo se puede modificar un turno pendiente' } })));

      fixture.componentInstance.guardar();
      await fixture.whenStable();

      expect(texto(fixture)).toContain('Solo se puede modificar un turno pendiente');
      expect(dialogo.close).not.toHaveBeenCalled();
    });
  });
});
