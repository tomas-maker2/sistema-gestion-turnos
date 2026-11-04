using System.ComponentModel.DataAnnotations;

namespace GestionTurnos.Api.Dtos;

public record ClienteDto(int Id, string Nombre, string Apellido, string Telefono, string? Email, bool Activo);

public record ClienteRequest(
    [Required, StringLength(100)] string Nombre,
    [Required, StringLength(100)] string Apellido,
    [Required, StringLength(30)] string Telefono,
    [StringLength(150)] string? Email,
    bool Activo = true);
