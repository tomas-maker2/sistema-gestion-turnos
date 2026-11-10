using GestionTurnos.Api.Data;
using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Errors;
using GestionTurnos.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GestionTurnos.Api.Services;

public class ServicioService(AppDbContext db)
{
    public Task<PaginaDto<ServicioDto>> ListarAsync(bool incluirInactivos, int pagina, int tamanio) =>
        Paginacion.PaginarAsync(
            db.Servicios.Where(s => incluirInactivos || s.Activo).OrderBy(s => s.Nombre),
            pagina, tamanio, Mapear);

    public async Task<ServicioDto> ObtenerAsync(int id) => Mapear(await BuscarAsync(id));

    public async Task<ServicioDto> CrearAsync(ServicioRequest pedido)
    {
        await ValidarNombreLibreAsync(pedido.Nombre, idPropio: 0);
        var servicio = new Servicio();
        Copiar(pedido, servicio);
        db.Servicios.Add(servicio);
        await db.SaveChangesAsync();
        return Mapear(servicio);
    }

    public async Task<ServicioDto> ModificarAsync(int id, ServicioRequest pedido)
    {
        var servicio = await BuscarAsync(id);
        await ValidarNombreLibreAsync(pedido.Nombre, idPropio: id);
        Copiar(pedido, servicio);
        await db.SaveChangesAsync();
        return Mapear(servicio);
    }

    // Baja lógica: la fila no se borra
    public async Task DesactivarAsync(int id)
    {
        var servicio = await BuscarAsync(id);
        servicio.Activo = false;
        await db.SaveChangesAsync();
    }

    private async Task<Servicio> BuscarAsync(int id) =>
        await db.Servicios.FindAsync(id) ?? throw new NoEncontradoException("El servicio no existe");

    // El nombre es único (sin distinguir mayúsculas), salvo para el propio servicio
    private async Task ValidarNombreLibreAsync(string nombre, int idPropio)
    {
        var n = nombre.Trim().ToLower();
        if (await db.Servicios.AnyAsync(s => s.Id != idPropio && s.Nombre.ToLower() == n))
            throw new ReglaNegocioException("Ya existe un servicio con ese nombre");
    }

    private static void Copiar(ServicioRequest pedido, Servicio servicio)
    {
        servicio.Nombre = pedido.Nombre.Trim();
        servicio.DuracionMinutos = pedido.DuracionMinutos;
        servicio.Activo = pedido.Activo;
    }

    private static ServicioDto Mapear(Servicio s) => new(s.Id, s.Nombre, s.DuracionMinutos, s.Activo);
}
