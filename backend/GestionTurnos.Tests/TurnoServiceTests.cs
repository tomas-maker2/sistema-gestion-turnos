using GestionTurnos.Api.Data;
using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Errors;
using GestionTurnos.Api.Models;
using GestionTurnos.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Time.Testing;

namespace GestionTurnos.Tests;

// El reloj de las pruebas está fijo en 10/11/2026 08:00
public class TurnoServiceTests : IAsyncLifetime
{
    private readonly AppDbContext _db = Ayudas.NuevaBase();
    private readonly FakeTimeProvider _reloj = new(new DateTimeOffset(2026, 11, 10, 8, 0, 0, TimeSpan.Zero));
    private readonly TurnoService _servicio;
    private Usuario _usuario = null!;
    private Cliente _cliente = null!;
    private Servicio _corte = null!; // 30 minutos

    public TurnoServiceTests() => _servicio = new TurnoService(_db, _reloj);

    public async Task InitializeAsync()
    {
        _usuario = await Ayudas.CrearUsuario(_db, "ana");
        _cliente = await Ayudas.CrearCliente(_db);
        _corte = await Ayudas.CrearServicio(_db, "Corte", 30);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private static DateTime Hoy(int hora, int minuto = 0) => new(2026, 11, 10, hora, minuto, 0);

    private TurnoRequest Pedido(DateTime inicio, string? observaciones = null) =>
        new(_cliente.Id, _corte.Id, inicio, observaciones);

    private Task<TurnoDto> Crear(DateTime inicio) => _servicio.CrearAsync(Pedido(inicio), _usuario.Id);

    // ---- Alta ----

    [Fact]
    public async Task Crear_calcula_FechaHoraFin_con_la_duracion_del_servicio()
    {
        var turno = await Crear(Hoy(10));
        Assert.Equal(Hoy(10, 30), turno.FechaHoraFin);
    }

    [Fact]
    public async Task Crear_deja_Estado_Pendiente_y_registra_el_usuario()
    {
        var turno = await _servicio.CrearAsync(Pedido(Hoy(10), "Primera vez"), _usuario.Id);

        Assert.Equal("Pendiente", turno.Estado);
        Assert.Equal(_usuario.Id, turno.UsuarioId);
        Assert.Equal("Gómez, Luis", turno.ClienteNombre);
        Assert.Equal("Corte", turno.ServicioNombre);
        Assert.Equal("Primera vez", turno.Observaciones);
    }

    // ---- Superposición ----

    [Fact]
    public async Task Crear_que_se_cruza_con_otro_lanza_ReglaNegocio()
    {
        await Crear(Hoy(10)); // 10:00 a 10:30
        await Assert.ThrowsAsync<ReglaNegocioException>(() => Crear(Hoy(10, 15)));
    }

    [Fact]
    public async Task Crear_contiguo_despues_no_se_considera_superposicion()
    {
        await Crear(Hoy(10));
        var turno = await Crear(Hoy(10, 30)); // empieza cuando el otro termina
        Assert.Equal(Hoy(10, 30), turno.FechaHoraInicio);
    }

    [Fact]
    public async Task Crear_contiguo_antes_no_se_considera_superposicion()
    {
        await Crear(Hoy(10));
        var turno = await Crear(Hoy(9, 30)); // termina cuando el otro empieza
        Assert.Equal(Hoy(10), turno.FechaHoraFin);
    }

    [Fact]
    public async Task Crear_que_contiene_a_otro_lanza_ReglaNegocio()
    {
        await Crear(Hoy(10));
        var largo = await Ayudas.CrearServicio(_db, "Color", 90);

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => _servicio.CrearAsync(new TurnoRequest(_cliente.Id, largo.Id, Hoy(9, 30), null), _usuario.Id));
    }

    [Fact]
    public async Task Crear_sobre_un_turno_Cancelado_es_valido()
    {
        var existente = await Crear(Hoy(10));
        await _servicio.CancelarAsync(existente.Id);

        var turno = await Crear(Hoy(10));

        Assert.Equal("Pendiente", turno.Estado);
    }

    [Fact]
    public async Task Crear_sobre_un_turno_Atendido_lanza_ReglaNegocio()
    {
        var existente = await Crear(Hoy(10));
        await _servicio.MarcarAtendidoAsync(existente.Id);

        await Assert.ThrowsAsync<ReglaNegocioException>(() => Crear(Hoy(10, 15)));
    }

    // ---- Cliente y servicio ----

    [Fact]
    public async Task Crear_con_cliente_inactivo_lanza_ReglaNegocio()
    {
        var inactivo = await Ayudas.CrearCliente(_db, "Ana", "Pérez", activo: false);
        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _servicio.CrearAsync(new TurnoRequest(inactivo.Id, _corte.Id, Hoy(10), null), _usuario.Id));
    }

    [Fact]
    public async Task Crear_con_servicio_inactivo_lanza_ReglaNegocio()
    {
        var inactivo = await Ayudas.CrearServicio(_db, "Viejo", 30, activo: false);
        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _servicio.CrearAsync(new TurnoRequest(_cliente.Id, inactivo.Id, Hoy(10), null), _usuario.Id));
    }

    [Fact]
    public async Task Crear_con_cliente_inexistente_lanza_NoEncontrado()
    {
        await Assert.ThrowsAsync<NoEncontradoException>(() =>
            _servicio.CrearAsync(new TurnoRequest(999, _corte.Id, Hoy(10), null), _usuario.Id));
    }

    [Fact]
    public async Task Crear_con_servicio_inexistente_lanza_NoEncontrado()
    {
        await Assert.ThrowsAsync<NoEncontradoException>(() =>
            _servicio.CrearAsync(new TurnoRequest(_cliente.Id, 999, Hoy(10), null), _usuario.Id));
    }

    // ---- Inicio en el pasado ----

    [Fact]
    public async Task Crear_con_inicio_en_el_pasado_lanza_Validacion()
    {
        await Assert.ThrowsAsync<ValidacionException>(() => Crear(Hoy(7, 59)));
    }

    [Fact]
    public async Task Crear_justo_a_la_hora_actual_es_valido()
    {
        var turno = await Crear(Hoy(8));
        Assert.Equal(Hoy(8), turno.FechaHoraInicio);
    }

    // ---- Modificación ----

    [Fact]
    public async Task Modificar_sin_cambiar_horario_no_choca_consigo_mismo()
    {
        var turno = await Crear(Hoy(10));

        var modificado = await _servicio.ModificarAsync(turno.Id, Pedido(Hoy(10), "Con nota"));

        Assert.Equal("Con nota", modificado.Observaciones);
        Assert.Equal(Hoy(10), modificado.FechaHoraInicio);
    }

    [Fact]
    public async Task Modificar_a_un_horario_ocupado_por_otro_lanza_ReglaNegocio()
    {
        await Crear(Hoy(10));
        var otro = await Crear(Hoy(11));

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _servicio.ModificarAsync(otro.Id, Pedido(Hoy(10, 15))));
    }

    [Fact]
    public async Task Modificar_a_un_horario_libre_cambia_inicio_y_fin()
    {
        var turno = await Crear(Hoy(10));

        var modificado = await _servicio.ModificarAsync(turno.Id, Pedido(Hoy(15)));

        Assert.Equal(Hoy(15), modificado.FechaHoraInicio);
        Assert.Equal(Hoy(15, 30), modificado.FechaHoraFin);
    }

    [Fact]
    public async Task Modificar_sin_cambiar_inicio_de_un_turno_de_hoy_ya_pasado_no_lanza_Validacion()
    {
        var turno = await Crear(Hoy(10));
        _reloj.Advance(TimeSpan.FromHours(3)); // ahora son las 11:00

        var modificado = await _servicio.ModificarAsync(turno.Id, Pedido(Hoy(10), "Anotación"));

        Assert.Equal("Anotación", modificado.Observaciones);
    }

    [Fact]
    public async Task Modificar_moviendo_el_turno_al_pasado_lanza_Validacion()
    {
        var turno = await Crear(Hoy(10));
        await Assert.ThrowsAsync<ValidacionException>(() => _servicio.ModificarAsync(turno.Id, Pedido(Hoy(7))));
    }

    [Fact]
    public async Task Modificar_conservando_un_cliente_que_luego_se_desactivo_no_lanza()
    {
        var turno = await Crear(Hoy(10));
        _cliente.Activo = false;
        await _db.SaveChangesAsync();

        var modificado = await _servicio.ModificarAsync(turno.Id, Pedido(Hoy(10), "Nota"));

        Assert.Equal("Nota", modificado.Observaciones);
    }

    [Fact]
    public async Task Modificar_cambiando_a_un_cliente_inactivo_lanza_ReglaNegocio()
    {
        var turno = await Crear(Hoy(10));
        var inactivo = await Ayudas.CrearCliente(_db, "Ana", "Pérez", activo: false);

        await Assert.ThrowsAsync<ReglaNegocioException>(() =>
            _servicio.ModificarAsync(turno.Id, new TurnoRequest(inactivo.Id, _corte.Id, Hoy(10), null)));
    }

    [Fact]
    public async Task Modificar_inexistente_lanza_NoEncontrado()
    {
        await Assert.ThrowsAsync<NoEncontradoException>(() => _servicio.ModificarAsync(999, Pedido(Hoy(10))));
    }

    // ---- La hora de fin se guarda y no cambia sola ----

    [Fact]
    public async Task Cambiar_la_duracion_del_servicio_no_altera_FechaHoraFin_de_turnos_existentes()
    {
        var turno = await Crear(Hoy(10));
        _corte.DuracionMinutos = 60;
        await _db.SaveChangesAsync();

        var actual = await _servicio.ObtenerAsync(turno.Id);

        Assert.Equal(Hoy(10, 30), actual.FechaHoraFin);
    }

    [Fact]
    public async Task Modificar_solo_las_observaciones_no_recalcula_FechaHoraFin()
    {
        var turno = await Crear(Hoy(10));
        _corte.DuracionMinutos = 60;
        await _db.SaveChangesAsync();

        var modificado = await _servicio.ModificarAsync(turno.Id, Pedido(Hoy(10), "Nota"));

        Assert.Equal(Hoy(10, 30), modificado.FechaHoraFin);
    }

    [Fact]
    public async Task Modificar_el_horario_usa_la_duracion_actual_del_servicio()
    {
        var turno = await Crear(Hoy(10));
        _corte.DuracionMinutos = 60;
        await _db.SaveChangesAsync();

        var modificado = await _servicio.ModificarAsync(turno.Id, Pedido(Hoy(12)));

        Assert.Equal(Hoy(13), modificado.FechaHoraFin);
    }

    // ---- Estados ----

    [Fact]
    public async Task Cancelar_pasa_a_Cancelado()
    {
        var turno = await Crear(Hoy(10));

        await _servicio.CancelarAsync(turno.Id);

        Assert.Equal("Cancelado", (await _servicio.ObtenerAsync(turno.Id)).Estado);
    }

    [Fact]
    public async Task MarcarAtendido_pasa_a_Atendido()
    {
        var turno = await Crear(Hoy(10));

        await _servicio.MarcarAtendidoAsync(turno.Id);

        Assert.Equal("Atendido", (await _servicio.ObtenerAsync(turno.Id)).Estado);
    }

    [Fact]
    public async Task Cancelar_un_Atendido_lanza_ReglaNegocio()
    {
        var turno = await Crear(Hoy(10));
        await _servicio.MarcarAtendidoAsync(turno.Id);

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _servicio.CancelarAsync(turno.Id));
    }

    [Fact]
    public async Task MarcarAtendido_un_Cancelado_lanza_ReglaNegocio()
    {
        var turno = await Crear(Hoy(10));
        await _servicio.CancelarAsync(turno.Id);

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _servicio.MarcarAtendidoAsync(turno.Id));
    }

    [Fact]
    public async Task Cancelar_dos_veces_lanza_ReglaNegocio()
    {
        var turno = await Crear(Hoy(10));
        await _servicio.CancelarAsync(turno.Id);

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _servicio.CancelarAsync(turno.Id));
    }

    [Fact]
    public async Task Modificar_un_turno_Cancelado_o_Atendido_lanza_ReglaNegocio()
    {
        var cancelado = await Crear(Hoy(10));
        await _servicio.CancelarAsync(cancelado.Id);
        var atendido = await Crear(Hoy(11));
        await _servicio.MarcarAtendidoAsync(atendido.Id);

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _servicio.ModificarAsync(cancelado.Id, Pedido(Hoy(14))));
        await Assert.ThrowsAsync<ReglaNegocioException>(() => _servicio.ModificarAsync(atendido.Id, Pedido(Hoy(15))));
    }

    [Fact]
    public async Task Cancelar_o_marcar_atendido_un_turno_inexistente_lanza_NoEncontrado()
    {
        await Assert.ThrowsAsync<NoEncontradoException>(() => _servicio.CancelarAsync(999));
        await Assert.ThrowsAsync<NoEncontradoException>(() => _servicio.MarcarAtendidoAsync(999));
        await Assert.ThrowsAsync<NoEncontradoException>(() => _servicio.ObtenerAsync(999));
    }

    // ---- Agenda ----

    [Fact]
    public async Task Agenda_devuelve_solo_turnos_del_rango_ordenados_por_inicio()
    {
        await Crear(Hoy(15));
        await Crear(Hoy(9));
        await Crear(new DateTime(2026, 11, 11, 10, 0, 0)); // otro día

        var agenda = await _servicio.ObtenerAgendaAsync(new DateTime(2026, 11, 10), new DateTime(2026, 11, 11));

        Assert.Equal([Hoy(9), Hoy(15)], agenda.Select(t => t.FechaHoraInicio));
    }

    [Fact]
    public async Task Agenda_incluye_cancelados_y_el_limite_superior_queda_afuera()
    {
        var cancelado = await Crear(Hoy(9));
        await _servicio.CancelarAsync(cancelado.Id);
        await Crear(new DateTime(2026, 11, 11, 0, 0, 0)); // justo en "hasta"

        var agenda = await _servicio.ObtenerAgendaAsync(new DateTime(2026, 11, 10), new DateTime(2026, 11, 11));

        var unico = Assert.Single(agenda);
        Assert.Equal("Cancelado", unico.Estado);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Agenda_con_hasta_menor_o_igual_a_desde_lanza_Validacion(int dias)
    {
        var desde = new DateTime(2026, 11, 10);
        await Assert.ThrowsAsync<ValidacionException>(() => _servicio.ObtenerAgendaAsync(desde, desde.AddDays(dias)));
    }

    [Fact]
    public async Task Agenda_de_mas_de_31_dias_lanza_Validacion_y_de_31_dias_no()
    {
        var desde = new DateTime(2026, 11, 1);

        await Assert.ThrowsAsync<ValidacionException>(() => _servicio.ObtenerAgendaAsync(desde, desde.AddDays(32)));
        Assert.Empty(await _servicio.ObtenerAgendaAsync(desde, desde.AddDays(31)));
    }

    // ---- Consulta de superposición ----

    [Fact]
    public async Task HaySuperposicion_excluye_el_turno_indicado()
    {
        var turno = await Crear(Hoy(10));

        Assert.True(await _servicio.HaySuperposicionAsync(Hoy(10), Hoy(10, 30), excluirId: 0));
        Assert.False(await _servicio.HaySuperposicionAsync(Hoy(10), Hoy(10, 30), excluirId: turno.Id));
    }
}
