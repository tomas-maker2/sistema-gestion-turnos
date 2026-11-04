using System.Net;
using System.Net.Http.Json;
using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Models;

namespace GestionTurnos.Tests;

public class AuthHttpTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _fabrica;

    public AuthHttpTests(ApiFactory fabrica) => _fabrica = fabrica;

    [Fact]
    public async Task Endpoint_protegido_sin_token_responde_401()
    {
        var cliente = _fabrica.CreateClient();
        var respuesta = await cliente.PostAsJsonAsync("/api/auth/cambiar-password",
            new CambiarPasswordRequest("a", "NuevaClave99"));
        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Endpoint_protegido_con_token_valido_funciona()
    {
        var cliente = await _fabrica.ClienteConRol(Rol.Operador);
        var respuesta = await cliente.PostAsJsonAsync("/api/auth/cambiar-password",
            new CambiarPasswordRequest(ApiFactory.PasswordDePrueba, "NuevaClave99"));
        Assert.Equal(HttpStatusCode.NoContent, respuesta.StatusCode);
    }

    [Fact]
    public async Task Login_con_credenciales_invalidas_responde_401()
    {
        var cliente = _fabrica.CreateClient();
        var respuesta = await cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest("nadie", "nada"));
        Assert.Equal(HttpStatusCode.Unauthorized, respuesta.StatusCode);
    }

    [Fact]
    public async Task Login_sin_cuerpo_valido_responde_400()
    {
        var cliente = _fabrica.CreateClient();
        var respuesta = await cliente.PostAsJsonAsync("/api/auth/login", new { });
        Assert.Equal(HttpStatusCode.BadRequest, respuesta.StatusCode);
    }
}
