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
}
