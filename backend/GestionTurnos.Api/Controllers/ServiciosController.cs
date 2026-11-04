using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace GestionTurnos.Api.Controllers;

// Accesible a cualquier usuario autenticado (Admin u Operador)
[ApiController]
[Route("api/servicios")]
public class ServiciosController(ServicioService servicio) : ControllerBase
{
    [HttpGet]
    public Task<List<ServicioDto>> Listar(bool incluirInactivos = false) => servicio.ListarAsync(incluirInactivos);

    [HttpGet("{id:int}")]
    public Task<ServicioDto> Obtener(int id) => servicio.ObtenerAsync(id);

    [HttpPost]
    public async Task<IActionResult> Crear(ServicioRequest pedido)
    {
        var creado = await servicio.CrearAsync(pedido);
        return CreatedAtAction(nameof(Obtener), new { id = creado.Id }, creado);
    }

    [HttpPut("{id:int}")]
    public Task<ServicioDto> Modificar(int id, ServicioRequest pedido) => servicio.ModificarAsync(id, pedido);

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Desactivar(int id)
    {
        await servicio.DesactivarAsync(id);
        return NoContent();
    }
}
