using System.Net;

namespace GestionTurnos.Tests;

public class ApiArranqueTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _cliente;

    public ApiArranqueTests(ApiFactory fabrica) => _cliente = fabrica.CreateClient();

    [Fact]
    public async Task La_aplicacion_arranca_con_base_en_memoria()
    {
        var respuesta = await _cliente.GetAsync("/api/inexistente");
        Assert.Equal(HttpStatusCode.NotFound, respuesta.StatusCode);
    }
}
