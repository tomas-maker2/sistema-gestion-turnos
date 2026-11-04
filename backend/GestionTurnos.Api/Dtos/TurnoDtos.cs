using System.ComponentModel.DataAnnotations;

namespace GestionTurnos.Api.Dtos;

// La fecha viaja sin zona horaria (hora local del negocio)
public record TurnoRequest(
    [Range(1, int.MaxValue)] int ClienteId,
    [Range(1, int.MaxValue)] int ServicioId,
    DateTime FechaHoraInicio,
    [StringLength(500)] string? Observaciones);

public record TurnoDto(
    int Id,
    int ClienteId,
    string ClienteNombre,
    int ServicioId,
    string ServicioNombre,
    DateTime FechaHoraInicio,
    DateTime FechaHoraFin,
    string Estado,
    string? Observaciones,
    int UsuarioId);
