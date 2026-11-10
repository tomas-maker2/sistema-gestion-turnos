using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace GestionTurnos.Api.Controllers;

// Accesible a cualquier usuario autenticado (Admin u Operador)
[ApiController]
[Route("api/clientes")]
public class ClientesController(ClienteService servicio) : ControllerBase
{
    [HttpGet]
    public Task<PaginaDto<ClienteDto>> Listar(
        string? texto, bool incluirInactivos = false, int pagina = 1, int tamanio = Paginacion.TamanioPorDefecto) =>
        servicio.ListarAsync(texto, incluirInactivos, pagina, tamanio);

    [HttpGet("{id:int}")]
    public Task<ClienteDto> Obtener(int id) => servicio.ObtenerAsync(id);

    [HttpPost]
    public async Task<IActionResult> Crear(ClienteRequest pedido)
    {
        var creado = await servicio.CrearAsync(pedido);
        return CreatedAtAction(nameof(Obtener), new { id = creado.Id }, creado);
    }

    [HttpPut("{id:int}")]
    public Task<ClienteDto> Modificar(int id, ClienteRequest pedido) => servicio.ModificarAsync(id, pedido);

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Desactivar(int id)
    {
        await servicio.DesactivarAsync(id);
        return NoContent();
    }
}
