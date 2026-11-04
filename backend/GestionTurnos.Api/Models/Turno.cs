using GestionTurnos.Api.Errors;

namespace GestionTurnos.Api.Models;

public class Turno
{
    public int Id { get; set; }
    public int ClienteId { get; set; }
    public int ServicioId { get; set; }
    public int UsuarioId { get; set; }
    public Cliente Cliente { get; set; } = null!;
    public Servicio Servicio { get; set; } = null!;
    public Usuario Usuario { get; set; } = null!;
    public DateTime FechaHoraInicio { get; set; }
    public DateTime FechaHoraFin { get; set; }
    public EstadoTurno Estado { get; set; } = EstadoTurno.Pendiente;
    public string? Observaciones { get; set; }
    public DateTime FechaAlta { get; set; } = DateTime.UtcNow;

    // Solo un turno pendiente puede cancelarse o marcarse como atendido
    public void Cancelar() => CambiarEstado(EstadoTurno.Cancelado);

    public void MarcarAtendido() => CambiarEstado(EstadoTurno.Atendido);

    private void CambiarEstado(EstadoTurno nuevo)
    {
        if (Estado != EstadoTurno.Pendiente)
            throw new ReglaNegocioException($"El turno ya está {Estado.ToString().ToLower()}");
        Estado = nuevo;
    }
}
