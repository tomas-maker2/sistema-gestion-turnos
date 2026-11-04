using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Seguridad;
using GestionTurnos.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GestionTurnos.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AuthService servicio) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public Task<LoginResponse> Login(LoginRequest pedido) => servicio.LoginAsync(pedido);

    [HttpPost("cambiar-password")]
    public async Task<IActionResult> CambiarPassword(CambiarPasswordRequest pedido)
    {
        await servicio.CambiarPasswordAsync(User.IdUsuario(), pedido);
        return NoContent();
    }
}
