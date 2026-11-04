using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Seguridad;
using GestionTurnos.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace GestionTurnos.Api.Controllers;

// Accesible a cualquier usuario autenticado (Admin u Operador)
[ApiController]
[Route("api/turnos")]
public class TurnosController(TurnoService servicio) : ControllerBase
{
    [HttpGet]
    public Task<List<TurnoDto>> Agenda(DateTime desde, DateTime hasta) => servicio.ObtenerAgendaAsync(desde, hasta);

    [HttpGet("{id:int}")]
    public Task<TurnoDto> Obtener(int id) => servicio.ObtenerAsync(id);

    [HttpPost]
    public async Task<IActionResult> Crear(TurnoRequest pedido)
    {
        var creado = await servicio.CrearAsync(pedido, User.IdUsuario());
        return CreatedAtAction(nameof(Obtener), new { id = creado.Id }, creado);
    }

    [HttpPut("{id:int}")]
    public Task<TurnoDto> Modificar(int id, TurnoRequest pedido) => servicio.ModificarAsync(id, pedido);

    [HttpPost("{id:int}/cancelar")]
    public async Task<IActionResult> Cancelar(int id)
    {
        await servicio.CancelarAsync(id);
        return NoContent();
    }

    [HttpPost("{id:int}/atendido")]
    public async Task<IActionResult> MarcarAtendido(int id)
    {
        await servicio.MarcarAtendidoAsync(id);
        return NoContent();
    }
}
