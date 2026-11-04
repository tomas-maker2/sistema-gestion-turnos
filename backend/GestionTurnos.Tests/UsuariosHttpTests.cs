using System.Net;
using System.Net.Http.Json;
using GestionTurnos.Api.Models;

namespace GestionTurnos.Tests;

public class UsuariosHttpTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _fabrica;

    public UsuariosHttpTests(ApiFactory fabrica) => _fabrica = fabrica;

    private static object NuevoUsuario(string nombre, string rol = "Operador") =>
        new { nombreUsuario = nombre, nombreCompleto = "Persona", password = "Clave12345", rol };

    [Fact]
    public async Task Operador_recibe_403_en_GET_usuarios()
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Operador);
        var respuesta = await cliente.GetAsync("/api/usuarios");
        Assert.Equal(HttpStatusCode.Forbidden, respuesta.StatusCode);
    }

    [Fact]
    public async Task Sin_token_recibe_401_en_GET_usuarios()
    {
        var respuesta = await _fabrica.CreateClient().GetAsync("/api/usuarios");
        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Admin_recibe_200_en_GET_usuarios()
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Admin);
        var respuesta = await cliente.GetAsync("/api/usuarios");
        Assert.Equal(HttpStatusCode.OK, respuesta.StatusCode);
    }

    [Fact]
    public async Task Crear_valido_responde_201_y_el_rol_viaja_como_texto()
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Admin);

        var respuesta = await cliente.PostAsJsonAsync("/api/usuarios", NuevoUsuario("nuevo1", "Admin"));

        Assert.Equal(HttpStatusCode.Created, respuesta.StatusCode);
        var cuerpo = await respuesta.Content.ReadAsStringAsync();
        Assert.Contains("\"rol\":\"Admin\"", cuerpo);
        Assert.DoesNotContain("assword", cuerpo);
    }

    [Fact]
    public async Task Crear_con_nombre_duplicado_responde_409()
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Admin);
        await cliente.PostAsJsonAsync("/api/usuarios", NuevoUsuario("repetido"));

        var respuesta = await cliente.PostAsJsonAsync("/api/usuarios", NuevoUsuario("repetido"));

        Assert.Equal(HttpStatusCode.Conflict, respuesta.StatusCode);
    }

    [Theory]
    [InlineData("Otro")]
    [InlineData("7")]
    public async Task Crear_con_rol_invalido_responde_400(string rol)
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Admin);
        var respuesta = await cliente.PostAsJsonAsync("/api/usuarios", NuevoUsuario("conrolmalo" + rol, rol));
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }

    [Fact]
    public async Task Desactivarse_a_si_mismo_responde_409()
    {
        // Fábrica propia: la base compartida de la clase tiene más usuarios
        using var fabrica = new ApiFactory();
        var cliente = await fabrica.ClienteConRol(Rol.Admin);
        var yo = (await cliente.GetFromJsonAsync<List<UsuarioListado>>("/api/usuarios"))!.Single();

        var respuesta = await cliente.DeleteAsync($"/api/usuarios/{yo.Id}");

        Assert.Equal(HttpStatusCode.Conflict, respuesta.StatusCode);
    }

    private record UsuarioListado(int Id);
}
