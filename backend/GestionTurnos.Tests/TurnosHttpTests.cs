using System.Net;
using System.Net.Http.Json;
using GestionTurnos.Api.Models;

namespace GestionTurnos.Tests;

public class TurnosHttpTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _fabrica;

    public TurnosHttpTests(ApiFactory fabrica) => _fabrica = fabrica;

    private record Creado(int Id);

    // Crea un cliente y un servicio de 30 minutos y devuelve sus ids
    private static async Task<(int Cliente, int Servicio)> Preparar(HttpClient http)
    {
        var sufijo = Guid.NewGuid().ToString("N");
        var cliente = await http.PostAsJsonAsync("/api/clientes",
            new { nombre = "Ana", apellido = sufijo, telefono = "1111" });
        var servicio = await http.PostAsJsonAsync("/api/servicios",
            new { nombre = $"Corte {sufijo}", duracionMinutos = 30 });
        return ((await cliente.Content.ReadFromJsonAsync<Creado>())!.Id,
                (await servicio.Content.ReadFromJsonAsync<Creado>())!.Id);
    }

    // Fecha futura distinta por prueba, para no superponerse con otras
    private static DateTime Dia(int diasAdelante, int hora, int minuto = 0) =>
        DateTime.Now.Date.AddDays(diasAdelante).AddHours(hora).AddMinutes(minuto);

    private static object Pedido(int cliente, int servicio, DateTime inicio) =>
        new { clienteId = cliente, servicioId = servicio, fechaHoraInicio = inicio };

    [Fact]
    public async Task Sin_token_responde_401()
    {
        var respuesta = await _fabrica.CreateClient().GetAsync("/api/turnos?desde=2026-11-10&hasta=2026-11-11");
        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_valido_responde_201_con_Location()
    {
        var http = await _fabrica.ClienteConRol(Rol.Operador);
        var (cliente, servicio) = await Preparar(http);

        var respuesta = await http.PostAsJsonAsync("/api/turnos", Pedido(cliente, servicio, Dia(30, 10)));

        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        Assert.Contains("/api/turnos/", respuesta.Headers.Location!.ToString());
        var cuerpo = await respuesta.Content.ReadAsStringAsync();
        Assert.Contains("\"estado\":\"Pendiente\"", cuerpo);
    }

    [Fact]
    public async Task Crear_superpuesto_responde_409_y_al_cancelar_el_primero_se_puede()
    {
        var http = await _fabrica.ClienteConRol(Rol.Operador);
        var (cliente, servicio) = await Preparar(http);
        var primero = await http.PostAsJsonAsync("/api/turnos", Pedido(cliente, servicio, Dia(31, 10)));
        var idPrimero = (await primero.Content.ReadFromJsonAsync<Creado>())!.Id;

        var superpuesto = await http.PostAsJsonAsync("/api/turnos", Pedido(cliente, servicio, Dia(31, 10, 15)));
        var cancelar = await http.PostAsync($"/api/turnos/{idPrimero}/cancelar", null);
        var reintento = await http.PostAsJsonAsync("/api/turnos", Pedido(cliente, servicio, Dia(31, 10, 15)));

        Assert.Equal(HttpStatusCode.Conflict, superpuesto.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, cancelar.StatusCode);
        Assert.Equal(HttpStatusCode.Created, reintento.StatusCode);
    }

    [Fact]
    public async Task Crear_en_el_pasado_responde_400()
    {
        var http = await _fabrica.ClienteConRol(Rol.Operador);
        var (cliente, servicio) = await Preparar(http);

        var respuesta = await http.PostAsJsonAsync("/api/turnos", Pedido(cliente, servicio, Dia(-1, 10)));

        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_con_cliente_inexistente_responde_404()
    {
        var http = await _fabrica.ClienteConRol(Rol.Operador);
        var (_, servicio) = await Preparar(http);

        var respuesta = await http.PostAsJsonAsync("/api/turnos", Pedido(99999, servicio, Dia(32, 10)));

        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_con_ids_en_cero_responde_400()
    {
        var http = await _fabrica.ClienteConRol(Rol.Operador);
        var respuesta = await http.PostAsJsonAsync("/api/turnos", Pedido(0, 0, Dia(33, 10)));
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Agenda_lista_los_turnos_del_dia_y_sin_parametros_responde_400()
    {
        var http = await _fabrica.ClienteConRol(Rol.Operador);
        var (cliente, servicio) = await Preparar(http);
        var dia = Dia(40, 0);
        await http.PostAsJsonAsync("/api/turnos", Pedido(cliente, servicio, dia.AddHours(11)));

        var agenda = await http.GetAsync($"/api/turnos?desde={dia:yyyy-MM-dd}&hasta={dia.AddDays(1):yyyy-MM-dd}");
        var sinParametros = await http.GetAsync("/api/turnos");

        Assert.Equal(HttpStatusCode.OK, agenda.StatusCode);
        Assert.Contains("\"estado\":\"Pendiente\"", await agenda.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.BadRequest, sinParametros.StatusCode);
    }

    [Fact]
    public async Task Modificar_cancelar_y_marcar_atendido_funcionan_y_los_estados_se_validan()
    {
        var http = await _fabrica.ClienteConRol(Rol.Operador);
        var (cliente, servicio) = await Preparar(http);
        var creado = await http.PostAsJsonAsync("/api/turnos", Pedido(cliente, servicio, Dia(50, 10)));
        var id = (await creado.Content.ReadFromJsonAsync<Creado>())!.Id;

        var modificar = await http.PutAsJsonAsync($"/api/turnos/{id}", Pedido(cliente, servicio, Dia(50, 12)));
        var atendido = await http.PostAsync($"/api/turnos/{id}/atendido", null);
        var cancelarAtendido = await http.PostAsync($"/api/turnos/{id}/cancelar", null);
        var inexistente = await http.PostAsync("/api/turnos/99999/cancelar", null);

        Assert.Equal(HttpStatusCode.OK, modificar.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, atendido.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, cancelarAtendido.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, inexistente.StatusCode);
    }
}
