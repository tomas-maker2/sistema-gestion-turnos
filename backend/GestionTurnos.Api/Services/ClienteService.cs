using System.ComponentModel.DataAnnotations;
using GestionTurnos.Api.Data;
using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Errors;
using GestionTurnos.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GestionTurnos.Api.Services;

public class ClienteService(AppDbContext db)
{
    public Task<PaginaDto<ClienteDto>> ListarAsync(string? texto, bool incluirInactivos, int pagina, int tamanio)
    {
        var consulta = db.Clientes.AsQueryable();

        if (!incluirInactivos)
            consulta = consulta.Where(c => c.Activo);

        if (!string.IsNullOrWhiteSpace(texto))
        {
            var t = texto.Trim().ToLower();
            consulta = consulta.Where(c => c.Nombre.ToLower().Contains(t) || c.Apellido.ToLower().Contains(t));
        }

        // El Id desempata, así los clientes con igual nombre no cambian de lugar entre páginas
        var ordenada = consulta.OrderBy(c => c.Apellido).ThenBy(c => c.Nombre).ThenBy(c => c.Id);
        return Paginacion.PaginarAsync(ordenada, pagina, tamanio, Mapear);
    }

    public async Task<ClienteDto> ObtenerAsync(int id) => Mapear(await BuscarAsync(id));

    public async Task<ClienteDto> CrearAsync(ClienteRequest pedido)
    {
        var cliente = new Cliente();
        AplicarPedido(pedido, cliente);
        db.Clientes.Add(cliente);
        await db.SaveChangesAsync();
        return Mapear(cliente);
    }

    public async Task<ClienteDto> ModificarAsync(int id, ClienteRequest pedido)
    {
        var cliente = await BuscarAsync(id);
        AplicarPedido(pedido, cliente);
        await db.SaveChangesAsync();
        return Mapear(cliente);
    }

    // Baja lógica: la fila no se borra
    public async Task DesactivarAsync(int id)
    {
        var cliente = await BuscarAsync(id);
        cliente.Activo = false;
        await db.SaveChangesAsync();
    }

    private async Task<Cliente> BuscarAsync(int id) =>
        await db.Clientes.FindAsync(id) ?? throw new NoEncontradoException("El cliente no existe");

    private static void AplicarPedido(ClienteRequest pedido, Cliente cliente)
    {
        cliente.Nombre = pedido.Nombre.Trim();
        cliente.Apellido = pedido.Apellido.Trim();
        cliente.Telefono = pedido.Telefono.Trim();
        // El email es opcional: en blanco se guarda como null
        var email = string.IsNullOrWhiteSpace(pedido.Email) ? null : pedido.Email.Trim();
        if (email is not null && !new EmailAddressAttribute().IsValid(email))
            throw new ValidacionException("El email no es válido");

        cliente.Email = email;
        cliente.Activo = pedido.Activo;
    }

    private static ClienteDto Mapear(Cliente c) =>
        new(c.Id, c.Nombre, c.Apellido, c.Telefono, c.Email, c.Activo);
}
