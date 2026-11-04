using System.ComponentModel.DataAnnotations;

namespace GestionTurnos.Api.Dtos;

public record ServicioDto(int Id, string Nombre, int DuracionMinutos, bool Activo);

public record ServicioRequest(
    [Required, StringLength(100)] string Nombre,
    [Range(5, 480)] int DuracionMinutos,
    bool Activo = true);
