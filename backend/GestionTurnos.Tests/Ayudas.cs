using GestionTurnos.Api.Data;
using GestionTurnos.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GestionTurnos.Tests;

// Utilidades compartidas por los tests de servicios
public static class Ayudas
{
    public static AppDbContext NuevaBase() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    public static async Task<Usuario> CrearUsuario(
        AppDbContext db, string nombre, Rol rol = Rol.Operador, bool activo = true, string password = "Clave12345")
    {
        var usuario = new Usuario { NombreUsuario = nombre, NombreCompleto = nombre, Rol = rol, Activo = activo };
        usuario.PasswordHash = new PasswordHasher<Usuario>().HashPassword(usuario, password);
        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync();
        return usuario;
    }

    public static async Task<Cliente> CrearCliente(
        AppDbContext db, string nombre = "Luis", string apellido = "Gómez", bool activo = true)
    {
        var cliente = new Cliente { Nombre = nombre, Apellido = apellido, Telefono = "1111", Activo = activo };
        db.Clientes.Add(cliente);
        await db.SaveChangesAsync();
        return cliente;
    }

    public static async Task<Servicio> CrearServicio(
        AppDbContext db, string nombre = "Corte", int minutos = 30, bool activo = true)
    {
        var servicio = new Servicio { Nombre = nombre, DuracionMinutos = minutos, Activo = activo };
        db.Servicios.Add(servicio);
        await db.SaveChangesAsync();
        return servicio;
    }
}
