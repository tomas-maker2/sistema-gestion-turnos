using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Errors;
using Microsoft.EntityFrameworkCore;

namespace GestionTurnos.Api.Services;

// Paginado de los listados: se hace en la base, la API nunca trae todos los datos
public static class Paginacion
{
    public const int TamanioPorDefecto = 5;
    public static readonly int[] TamaniosPermitidos = [5, 10, 30, 50, 100];

    // La consulta tiene que venir ordenada, para que las páginas sean estables
    public static async Task<PaginaDto<TDto>> PaginarAsync<TEntidad, TDto>(
        IOrderedQueryable<TEntidad> consulta, int pagina, int tamanio, Func<TEntidad, TDto> mapear)
    {
        if (pagina < 1)
            throw new ValidacionException("La página tiene que ser 1 o mayor");
        if (!TamaniosPermitidos.Contains(tamanio))
            throw new ValidacionException($"El tamaño de página tiene que ser uno de: {string.Join(", ", TamaniosPermitidos)}");

        var saltear = (long)(pagina - 1) * tamanio;
        if (saltear > int.MaxValue)
            throw new ValidacionException("La página es demasiado grande");

        var total = await consulta.CountAsync();
        var entidades = await consulta.Skip((int)saltear).Take(tamanio).ToListAsync();
        return new PaginaDto<TDto>(entidades.Select(mapear).ToList(), total, pagina, tamanio);
    }
}
