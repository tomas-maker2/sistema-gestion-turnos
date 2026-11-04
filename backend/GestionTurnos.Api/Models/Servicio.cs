namespace GestionTurnos.Api.Models;

public class Servicio
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public int DuracionMinutos { get; set; }
    public bool Activo { get; set; } = true;
}
