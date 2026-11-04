namespace GestionTurnos.Api.Seguridad;

// Se lee de la sección "Jwt" de appsettings
public class JwtOpciones
{
    public string Key { get; set; } = "";
    public string Issuer { get; set; } = "";
    public string Audience { get; set; } = "";
    public int HorasValidez { get; set; } = 8;
}
