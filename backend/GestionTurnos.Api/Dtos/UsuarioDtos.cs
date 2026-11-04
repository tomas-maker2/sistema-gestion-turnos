using System.ComponentModel.DataAnnotations;
using GestionTurnos.Api.Models;

namespace GestionTurnos.Api.Dtos;

public record UsuarioDto(int Id, string NombreUsuario, string NombreCompleto, string Rol, bool Activo);

public record UsuarioCrearRequest(
    [Required, StringLength(50)] string NombreUsuario,
    [Required, StringLength(100)] string NombreCompleto,
    [Required, MinLength(8)] string Password,
    [EnumDataType(typeof(Rol))] Rol Rol);

public record UsuarioModificarRequest(
    [Required, StringLength(100)] string NombreCompleto,
    [EnumDataType(typeof(Rol))] Rol Rol,
    bool Activo);

public record ResetearPasswordRequest([Required, MinLength(8)] string PasswordNueva);
