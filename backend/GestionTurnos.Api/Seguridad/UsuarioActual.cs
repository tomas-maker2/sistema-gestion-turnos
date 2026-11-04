using System.Security.Claims;

namespace GestionTurnos.Api.Seguridad;

public static class UsuarioActual
{
    // Id del usuario que hace la petición, tomado del token
    public static int IdUsuario(this ClaimsPrincipal usuario) =>
        int.Parse(usuario.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
