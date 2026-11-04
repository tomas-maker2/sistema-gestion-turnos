using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Seguridad;
using GestionTurnos.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestionTurnos.Api.Controllers;

[ApiController]
[Route("api/usuarios")]
[Authorize(Roles = "Admin")]
public class UsuariosController(UsuarioService servicio) : ControllerBase
{
    [HttpGet]
    public Task<List<UsuarioDto>> Listar() => servicio.ListarAsync();

    [HttpGet("{id:int}")]
    public Task<UsuarioDto> Obtener(int id) => servicio.ObtenerAsync(id);

    [HttpPost]
    public async Task<IActionResult> Crear(UsuarioCrearRequest pedido)
    {
        var creado = await servicio.CrearAsync(pedido);
        return CreatedAtAction(nameof(Obtener), new { id = creado.Id }, creado);
    }

    [HttpPut("{id:int}")]
    public Task<UsuarioDto> Modificar(int id, UsuarioModificarRequest pedido) =>
        servicio.ModificarAsync(id, pedido, User.IdUsuario());

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Desactivar(int id)
    {
        await servicio.DesactivarAsync(id, User.IdUsuario());
        return NoContent();
    }

    [HttpPost("{id:int}/resetear-password")]
    public async Task<IActionResult> ResetearPassword(int id, ResetearPasswordRequest pedido)
    {
        await servicio.ResetearPasswordAsync(id, pedido);
        return NoContent();
    }
}
