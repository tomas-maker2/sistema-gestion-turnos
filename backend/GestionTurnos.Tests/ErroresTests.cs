using GestionTurnos.Api.Errors;
using Microsoft.AspNetCore.Http;

namespace GestionTurnos.Tests;

public class ErroresTests
{
    // Ejecuta el manejador con una excepción y devuelve lo que respondería la API
    private static async Task<(bool Manejado, DefaultHttpContext Contexto)> Manejar(Exception ex)
    {
        var contexto = new DefaultHttpContext();
        contexto.Response.Body = new MemoryStream();
        var manejado = await new ManejadorErrores().TryHandleAsync(contexto, ex, CancellationToken.None);
        return (manejado, contexto);
    }

    [Fact]
    public async Task ValidacionException_responde_400()
    {
        var (manejado, contexto) = await Manejar(new ValidacionException("dato inválido"));
        Assert.True(manejado);
        Assert.Equal(400, contexto.Response.StatusCode);
        Assert.Equal("application/problem+json", contexto.Response.ContentType);
    }

    [Fact]
    public async Task NoEncontradoException_responde_404()
    {
        var (manejado, contexto) = await Manejar(new NoEncontradoException("no existe"));
        Assert.True(manejado);
        Assert.Equal(404, contexto.Response.StatusCode);
        Assert.Equal("application/problem+json", contexto.Response.ContentType);
    }

    [Fact]
    public async Task ReglaNegocioException_responde_409()
    {
        var (manejado, contexto) = await Manejar(new ReglaNegocioException("horario ocupado"));
        Assert.True(manejado);
        Assert.Equal(409, contexto.Response.StatusCode);
        Assert.Equal("application/problem+json", contexto.Response.ContentType);
    }

    [Fact]
    public async Task CredencialesInvalidasException_responde_401()
    {
        var (manejado, contexto) = await Manejar(new CredencialesInvalidasException());
        Assert.True(manejado);
        Assert.Equal(401, contexto.Response.StatusCode);
        Assert.Equal("application/problem+json", contexto.Response.ContentType);
    }

    [Fact]
    public async Task Una_excepcion_no_prevista_no_se_maneja()
    {
        var (manejado, _) = await Manejar(new InvalidOperationException());
        Assert.False(manejado);
    }
}
