using System.Net;
using System.Net.Http.Json;
using GestionTurnos.Api.Models;

namespace GestionTurnos.Tests;

public class ClientesServiciosHttpTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _fabrica;

    public ClientesServiciosHttpTests(ApiFactory fabrica) => _fabrica = fabrica;

    private static object Cliente(string nombre = "Ana", string telefono = "1111", string? email = null) =>
        new { nombre, apellido = "Pérez", telefono, email };

    [Fact]
    public async Task Sin_token_responde_401_en_clientes_y_servicios()
    {
        var cliente = _fabrica.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await cliente.GetAsync("/api/clientes")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await cliente.GetAsync("/api/servicios")).StatusCode);
    }

    [Fact]
    public async Task Operador_puede_crear_y_listar_clientes()
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Operador);

        var creado = await cliente.PostAsJsonAsync("/api/clientes", Cliente("Operado"));
        var lista = await cliente.GetAsync("/api/clientes?texto=operado");

        Assert.Equal(HttpStatusCode.Created, creado.StatusCode);
        Assert.Contains("Operado", await lista.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("", "1111", null)]                           // nombre vacío
    [InlineData("Ana", "", null)]                            // teléfono vacío
    [InlineData("Ana", "123456789012345678901234567890X", null)] // teléfono de 31 caracteres
    [InlineData("Ana", "1111", "no-es-un-email")]
    public async Task Cliente_con_datos_invalidos_responde_400(string nombre, string telefono, string? email)
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Operador);
        var respuesta = await cliente.PostAsJsonAsync("/api/clientes", Cliente(nombre, telefono, email));
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Cliente_con_email_vacio_se_crea_con_email_null()
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Operador);

        var respuesta = await cliente.PostAsJsonAsync("/api/clientes", Cliente("SinMail", email: ""));

        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        Assert.Contains("\"email\":null", await respuesta.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Listado_de_servicios_sin_parametros_trae_5_por_pagina_y_el_total()
    {
        using var fabrica = new ApiFactory();
        var http = await fabrica.ClienteConRol(Rol.Operador);
        for (var i = 1; i <= 7; i++)
            await http.PostAsJsonAsync("/api/servicios", new { nombre = $"Servicio {i}", duracionMinutos = 30 });

        var primera = (await http.GetFromJsonAsync<PaginaDeServicios>("/api/servicios"))!;
        var segunda = (await http.GetFromJsonAsync<PaginaDeServicios>("/api/servicios?pagina=2"))!;

        Assert.Equal(5, primera.Items.Count);
        Assert.Equal(7, primera.Total);
        Assert.Equal(5, primera.Tamanio);
        Assert.Equal(2, segunda.Items.Count);
    }

    [Fact]
    public async Task Listado_de_clientes_pagina_sobre_la_busqueda()
    {
        using var fabrica = new ApiFactory();
        var http = await fabrica.ClienteConRol(Rol.Operador);
        for (var i = 1; i <= 6; i++) await http.PostAsJsonAsync("/api/clientes", Cliente($"Busca{i}"));
        await http.PostAsJsonAsync("/api/clientes", Cliente("Otro"));

        var pagina = (await http.GetFromJsonAsync<PaginaDeServicios>("/api/clientes?texto=busca&tamanio=5"))!;

        Assert.Equal(5, pagina.Items.Count);
        Assert.Equal(6, pagina.Total); // el total es el de la búsqueda, no el de todos los clientes
    }

    [Theory]
    [InlineData("/api/clientes?tamanio=7")]
    [InlineData("/api/clientes?pagina=0")]
    [InlineData("/api/servicios?tamanio=101")]
    [InlineData("/api/servicios?pagina=-3")]
    public async Task Listado_con_parametros_de_paginacion_invalidos_responde_400(string ruta)
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Operador);
        Assert.Equal(HttpStatusCode.BadRequest, (await cliente.GetAsync(ruta)).StatusCode);
    }

    // Sirve para leer cualquiera de las páginas (solo interesan estos campos)
    private record PaginaDeServicios(List<System.Text.Json.JsonElement> Items, int Total, int Pagina, int Tamanio);

    [Fact]
    public async Task Cliente_inexistente_responde_404()
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Operador);
        Assert.Equal(HttpStatusCode.NotFound, (await cliente.GetAsync("/api/clientes/9999")).StatusCode);
    }

    [Theory]
    [InlineData(5)]
    [InlineData(480)]
    public async Task Servicio_con_duracion_en_el_limite_responde_201(int minutos)
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Operador);
        var respuesta = await cliente.PostAsJsonAsync("/api/servicios",
            new { nombre = $"Limite {minutos}", duracionMinutos = minutos });
        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
    }

    [Theory]
    [InlineData(4)]
    [InlineData(481)]
    [InlineData(0)]
    public async Task Servicio_con_duracion_fuera_de_rango_responde_400(int minutos)
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Operador);
        var respuesta = await cliente.PostAsJsonAsync("/api/servicios",
            new { nombre = $"Fuera {minutos}", duracionMinutos = minutos });
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Servicio_con_nombre_duplicado_responde_409()
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Operador);
        await cliente.PostAsJsonAsync("/api/servicios", new { nombre = "Duplicado", duracionMinutos = 30 });

        var respuesta = await cliente.PostAsJsonAsync("/api/servicios", new { nombre = "duplicado", duracionMinutos = 30 });

        Assert.Equal(HttpStatusCode.Conflict, respuesta.StatusCode);
    }

    [Fact]
    public async Task Desactivar_un_servicio_responde_204_y_deja_de_listarse()
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Operador);
        var creado = await cliente.PostAsJsonAsync("/api/servicios", new { nombre = "Para baja", duracionMinutos = 30 });
        var url = creado.Headers.Location!.ToString();

        var baja = await cliente.DeleteAsync(url);
        var lista = await (await cliente.GetAsync("/api/servicios?tamanio=100")).Content.ReadAsStringAsync();
        var conInactivos = await (await cliente.GetAsync("/api/servicios?incluirInactivos=true&tamanio=100")).Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.NoContent, baja.StatusCode);
        Assert.DoesNotContain("Para baja", lista);
        Assert.Contains("Para baja", conInactivos);
    }
}
