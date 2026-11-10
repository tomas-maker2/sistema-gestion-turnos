namespace GestionTurnos.Api.Dtos;

// Una página de resultados: los datos de esa página y cuántos hay en total
public record PaginaDto<T>(List<T> Items, int Total, int Pagina, int Tamanio);
