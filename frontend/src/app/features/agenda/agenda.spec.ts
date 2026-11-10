import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { ConfirmarDialog } from '../../shared/confirmar-dialog';
import { Agenda } from './agenda';
import { TurnoForm } from './turno-form';
import { EstadoTurno, Turno, TurnosService } from './turnos.service';

describe('Agenda', () => {
  let turnos: { agenda: ReturnType<typeof vi.fn>; cancelar: ReturnType<typeof vi.fn>; marcarAtendido: ReturnType<typeof vi.fn> };
  let dialogo: { open: ReturnType<typeof vi.fn> };
  let aviso: { open: ReturnType<typeof vi.fn> };

  const turno = (id: number, inicio: string, fin: string, estado: EstadoTurno, resto: Partial<Turno> = {}): Turno => ({
    id, clienteId: id, clienteNombre: 'Pérez, Ana', servicioId: 1, servicioNombre: 'Corte de pelo',
    fechaHoraInicio: inicio, fechaHoraFin: fin, estado, observaciones: null, usuarioId: 1, ...resto,
  });
  const pendiente = turno(1, '2026-11-10T10:00:00', '2026-11-10T10:30:00', 'Pendiente', { observaciones: 'Trae foto' });
  const atendido = turno(2, '2026-11-10T11:00:00', '2026-11-10T11:30:00', 'Atendido', { clienteNombre: 'Gómez, Luis' });
  const cancelado = turno(3, '2026-11-10T12:00:00', '2026-11-10T12:30:00', 'Cancelado', { clienteNombre: 'López, Jorge' });

  // "Hoy" es siempre el martes 10/11/2026 a las 8:20, para que las pruebas no dependan del día en que corren
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 10, 8, 20));
  });
  afterEach(() => vi.useRealTimers());

  async function crear(delDia: Turno[] = [pendiente, atendido, cancelado]) {
    turnos = { agenda: vi.fn().mockReturnValue(of(delDia)), cancelar: vi.fn(), marcarAtendido: vi.fn() };
    dialogo = { open: vi.fn() };
    aviso = { open: vi.fn() };
    TestBed.configureTestingModule({
      imports: [Agenda],
      providers: [
        { provide: TurnosService, useValue: turnos },
        { provide: MatDialog, useValue: dialogo },
        { provide: MatSnackBar, useValue: aviso },
      ],
    });
    const fixture = TestBed.createComponent(Agenda);
    await fixture.whenStable();
    return fixture;
  }

  // El modal responde con lo que se elija (true = confirmar o guardar)
  const responder = (r: boolean | undefined) => dialogo.open.mockReturnValue({ afterClosed: () => of(r) });
  const tarjetas = (f: { nativeElement: HTMLElement }) => Array.from(f.nativeElement.querySelectorAll('article.turno'));
  const dias = (f: { nativeElement: HTMLElement }) => Array.from(f.nativeElement.querySelectorAll('section.dia'));
  const botones = (el: Element) => Array.from(el.querySelectorAll('.acciones button')).map((b) => b.getAttribute('aria-label'));
  const texto = (el: Element) => el.textContent!.replace(/\s+/g, ' ');
  const error = (status: number, detail: string) => throwError(() => new HttpErrorResponse({ status, error: { detail } }));

  describe('vista_del_dia', () => {
    it('al_iniciar_pide_la_agenda_de_hoy', async () => {
      await crear();
      expect(turnos.agenda).toHaveBeenCalledWith('2026-11-10', '2026-11-11');
    });

    it('muestra_la_fecha_en_castellano', async () => {
      const fixture = await crear();
      expect(texto(fixture.nativeElement)).toContain('Martes, 10 de noviembre de 2026');
    });

    it('muestra_cada_turno_con_horario_cliente_servicio_y_estado', async () => {
      const fixture = await crear();
      const [primero, segundo] = tarjetas(fixture);

      expect(tarjetas(fixture)).toHaveLength(3);
      for (const dato of ['10:00', '10:30', 'Pérez, Ana', 'Corte de pelo', 'Pendiente', 'Trae foto']) {
        expect(texto(primero)).toContain(dato);
      }
      expect(texto(segundo)).toContain('Gómez, Luis');
      expect(texto(segundo)).toContain('Atendido');
    });

    it('cada_estado_tiene_su_etiqueta_de_color', async () => {
      const fixture = await crear();

      expect(tarjetas(fixture).map((t) => t.querySelector('.estado')!.className.replace('estado', '').trim()))
        .toEqual(['pendiente', 'atendido', 'cancelado']);
    });

    it('los_turnos_cancelados_se_ven_atenuados', async () => {
      const fixture = await crear();

      expect(tarjetas(fixture)[2].classList).toContain('cancelado');
      expect(tarjetas(fixture)[0].classList).not.toContain('cancelado');
    });

    it('solo_los_turnos_pendientes_tienen_acciones', async () => {
      const fixture = await crear();
      const [pend, aten, canc] = tarjetas(fixture);

      expect(botones(pend)).toEqual(['Editar', 'Marcar como atendido', 'Cancelar turno']);
      expect(botones(aten)).toEqual([]);
      expect(botones(canc)).toEqual([]);
    });

    it('un_dia_sin_turnos_lo_avisa', async () => {
      const fixture = await crear([]);
      expect(texto(fixture.nativeElement)).toContain('No hay turnos para este día.');
    });
  });

  describe('navegacion', () => {
    it('siguiente_y_anterior_mueven_un_dia', async () => {
      const fixture = await crear();

      fixture.componentInstance.siguiente();
      expect(turnos.agenda).toHaveBeenLastCalledWith('2026-11-11', '2026-11-12');

      fixture.componentInstance.anterior();
      fixture.componentInstance.anterior();
      expect(turnos.agenda).toHaveBeenLastCalledWith('2026-11-09', '2026-11-10');
    });

    it('hoy_vuelve_al_dia_actual', async () => {
      const fixture = await crear();
      fixture.componentInstance.siguiente();
      fixture.componentInstance.siguiente();

      fixture.componentInstance.hoy();

      expect(turnos.agenda).toHaveBeenLastCalledWith('2026-11-10', '2026-11-11');
    });

    it('irAFecha_elige_un_dia_y_cruza_el_fin_de_mes', async () => {
      const fixture = await crear();

      fixture.componentInstance.irAFecha('2026-11-30');
      await fixture.whenStable();

      expect(turnos.agenda).toHaveBeenLastCalledWith('2026-11-30', '2026-12-01');
      expect(texto(fixture.nativeElement)).toContain('30 de noviembre de 2026');
    });

    it('una_fecha_vacia_se_ignora', async () => {
      const fixture = await crear();
      turnos.agenda.mockClear();

      fixture.componentInstance.irAFecha('');

      expect(turnos.agenda).not.toHaveBeenCalled();
    });

    it('si_falla_la_carga_avisa_y_la_navegacion_sigue_funcionando', async () => {
      const fixture = await crear();
      turnos.agenda.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));

      fixture.componentInstance.siguiente();
      expect(aviso.open).toHaveBeenCalledWith('No se pudo conectar con el servidor', 'Cerrar', expect.anything());

      turnos.agenda.mockReturnValue(of([atendido]));
      fixture.componentInstance.siguiente();
      await fixture.whenStable();
      expect(turnos.agenda).toHaveBeenLastCalledWith('2026-11-12', '2026-11-13');
    });
  });

  describe('vista_de_la_semana', () => {
    it('pide_de_lunes_al_lunes_siguiente', async () => {
      const fixture = await crear();

      fixture.componentInstance.cambiarVista('semana');

      expect(turnos.agenda).toHaveBeenLastCalledWith('2026-11-09', '2026-11-16');
    });

    it('muestra_los_siete_dias_y_el_rango_de_la_semana', async () => {
      const fixture = await crear();

      fixture.componentInstance.cambiarVista('semana');
      await fixture.whenStable();

      expect(dias(fixture)).toHaveLength(7);
      expect(dias(fixture)[0].querySelector('h2')!.textContent).toContain('Lunes, 9 de noviembre');
      expect(dias(fixture)[6].querySelector('h2')!.textContent).toContain('Domingo, 15 de noviembre');
      expect(texto(fixture.nativeElement)).toContain('9 de noviembre al 15 de noviembre de 2026');
    });

    it('reparte_los_turnos_en_su_dia_y_marca_los_dias_sin_turnos', async () => {
      const jueves = turno(9, '2026-11-12T16:00:00', '2026-11-12T16:30:00', 'Pendiente', { clienteNombre: 'Díaz, Marta' });
      const fixture = await crear([pendiente, atendido, jueves]);

      fixture.componentInstance.cambiarVista('semana');
      await fixture.whenStable();

      expect(dias(fixture).map((d) => d.querySelectorAll('article.turno').length)).toEqual([0, 2, 0, 1, 0, 0, 0]);
      expect(texto(dias(fixture)[3])).toContain('Díaz, Marta');
      expect(texto(dias(fixture)[0])).toContain('Sin turnos');
    });

    it('siguiente_y_anterior_mueven_una_semana', async () => {
      const fixture = await crear();
      fixture.componentInstance.cambiarVista('semana');

      fixture.componentInstance.siguiente();
      expect(turnos.agenda).toHaveBeenLastCalledWith('2026-11-16', '2026-11-23');

      fixture.componentInstance.anterior();
      fixture.componentInstance.anterior();
      expect(turnos.agenda).toHaveBeenLastCalledWith('2026-11-02', '2026-11-09');
    });

    it('al_volver_a_la_vista_del_dia_muestra_el_dia_elegido', async () => {
      const fixture = await crear();
      fixture.componentInstance.cambiarVista('semana');

      fixture.componentInstance.cambiarVista('dia');

      expect(turnos.agenda).toHaveBeenLastCalledWith('2026-11-10', '2026-11-11');
      expect(dias(fixture)).toHaveLength(1);
    });
  });

  describe('alta_y_edicion', () => {
    it('nuevo_abre_el_formulario_sugiriendo_la_proxima_hora_redonda_de_hoy', async () => {
      const fixture = await crear();
      responder(true);

      fixture.componentInstance.nuevo();

      expect(dialogo.open).toHaveBeenCalledWith(TurnoForm, expect.objectContaining({
        data: { turno: null, fechaInicial: new Date(2026, 10, 10, 9, 0) },
      }));
    });

    it('nuevo_en_otro_dia_sugiere_las_9_de_ese_dia', async () => {
      const fixture = await crear();
      fixture.componentInstance.irAFecha('2026-11-20');
      responder(true);

      fixture.componentInstance.nuevo();

      expect(dialogo.open).toHaveBeenCalledWith(TurnoForm, expect.objectContaining({
        data: { turno: null, fechaInicial: new Date(2026, 10, 20, 9, 0) },
      }));
    });

    it('si_se_guardo_avisa_y_recarga', async () => {
      const fixture = await crear();
      responder(true);

      fixture.componentInstance.nuevo();

      expect(aviso.open).toHaveBeenCalledWith('Turno guardado', 'Cerrar', expect.anything());
      expect(turnos.agenda).toHaveBeenCalledTimes(2);
    });

    it('si_se_cancela_el_formulario_no_recarga', async () => {
      const fixture = await crear();
      responder(undefined);

      fixture.componentInstance.nuevo();

      expect(aviso.open).not.toHaveBeenCalled();
      expect(turnos.agenda).toHaveBeenCalledTimes(1);
    });

    it('editar_abre_el_formulario_con_el_turno', async () => {
      const fixture = await crear();
      responder(true);

      fixture.componentInstance.editar(pendiente);

      expect(dialogo.open).toHaveBeenCalledWith(TurnoForm, expect.objectContaining({
        data: expect.objectContaining({ turno: pendiente }),
      }));
      expect(turnos.agenda).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancelar_y_marcar_atendido', () => {
    it('cancelar_pide_confirmacion_con_el_cliente_y_la_hora', async () => {
      const fixture = await crear();
      responder(false);

      fixture.componentInstance.cancelar(pendiente);

      expect(dialogo.open).toHaveBeenCalledWith(ConfirmarDialog, expect.objectContaining({
        data: expect.objectContaining({
          mensaje: expect.stringContaining('Pérez, Ana'),
          textoConfirmar: 'Cancelar turno',
          textoCancelar: 'Volver',
        }),
      }));
      expect(dialogo.open.mock.calls[0][1].data.mensaje).toContain('10:00');
    });

    it('si_se_confirma_cancela_avisa_y_recarga', async () => {
      const fixture = await crear();
      turnos.cancelar.mockReturnValue(of(undefined));
      responder(true);

      fixture.componentInstance.cancelar(pendiente);

      expect(turnos.cancelar).toHaveBeenCalledWith(1);
      expect(aviso.open).toHaveBeenCalledWith('Turno cancelado', 'Cerrar', expect.anything());
      expect(turnos.agenda).toHaveBeenCalledTimes(2);
    });

    it('si_se_vuelve_atras_no_cancela', async () => {
      const fixture = await crear();
      responder(false);

      fixture.componentInstance.cancelar(pendiente);

      expect(turnos.cancelar).not.toHaveBeenCalled();
      expect(turnos.agenda).toHaveBeenCalledTimes(1);
    });

    it('marcar_atendido_pide_confirmacion_y_si_se_confirma_lo_marca_y_recarga', async () => {
      const fixture = await crear();
      turnos.marcarAtendido.mockReturnValue(of(undefined));
      responder(true);

      fixture.componentInstance.marcarAtendido(pendiente);

      expect(dialogo.open).toHaveBeenCalledWith(ConfirmarDialog, expect.objectContaining({
        data: expect.objectContaining({ textoConfirmar: 'Marcar atendido', textoCancelar: 'Volver' }),
      }));
      expect(turnos.marcarAtendido).toHaveBeenCalledWith(1);
      expect(aviso.open).toHaveBeenCalledWith('Turno marcado como atendido', 'Cerrar', expect.anything());
      expect(turnos.agenda).toHaveBeenCalledTimes(2);
    });

    it('si_no_se_confirma_no_lo_marca', async () => {
      const fixture = await crear();
      responder(false);

      fixture.componentInstance.marcarAtendido(pendiente);

      expect(turnos.marcarAtendido).not.toHaveBeenCalled();
    });

    it('muestra_el_mensaje_de_la_API_si_la_operacion_falla_y_no_recarga', async () => {
      const fixture = await crear();
      turnos.cancelar.mockReturnValue(error(409, 'El turno ya está atendido'));
      responder(true);

      fixture.componentInstance.cancelar(pendiente);

      expect(aviso.open).toHaveBeenCalledWith('El turno ya está atendido', 'Cerrar', expect.anything());
      expect(turnos.agenda).toHaveBeenCalledTimes(1);
    });
  });

  it('nuevo_hoy_a_media_tarde_sugiere_la_proxima_hora_redonda', async () => {
    vi.setSystemTime(new Date(2026, 10, 10, 14, 40));
    const fixture = await crear();
    responder(undefined);

    fixture.componentInstance.nuevo();

    expect(dialogo.open).toHaveBeenCalledWith(TurnoForm, expect.objectContaining({
      data: { turno: null, fechaInicial: new Date(2026, 10, 10, 15, 0) },
    }));
  });
});
