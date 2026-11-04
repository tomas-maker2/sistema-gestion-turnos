using System.ComponentModel.DataAnnotations;

namespace GestionTurnos.Api.Dtos;

public record LoginRequest(
    [Required] string NombreUsuario,
    [Required] string Password);

public record LoginResponse(
    string Token,
    string NombreUsuario,
    string NombreCompleto,
    string Rol,
    DateTime Expira);

public record CambiarPasswordRequest(
    [Required] string PasswordActual,
    [Required, MinLength(8)] string PasswordNueva);
