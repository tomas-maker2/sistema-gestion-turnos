using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace GestionTurnos.Api.Errors;

public class ManejadorErrores : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext contexto, Exception ex, CancellationToken ct)
    {
        var (estado, titulo) = ex switch
        {
            ValidacionException => (400, "Datos inválidos"),
            CredencialesInvalidasException => (401, "Credenciales inválidas"),
            NoEncontradoException => (404, "No encontrado"),
            ReglaNegocioException => (409, "Regla de negocio"),
            _ => (0, "")
        };

        // Otras excepciones las resuelve el manejador por defecto (500)
        if (estado == 0) return false;

        contexto.Response.StatusCode = estado;
        var problema = new ProblemDetails { Status = estado, Title = titulo, Detail = ex.Message };
        await contexto.Response.WriteAsJsonAsync(problema, (JsonSerializerOptions?)null, "application/problem+json", ct);
        return true;
    }
}
