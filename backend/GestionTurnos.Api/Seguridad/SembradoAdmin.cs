using GestionTurnos.Api.Data;
using GestionTurnos.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GestionTurnos.Api.Seguridad;

public static class SembradoAdmin
{
    // Crea el primer administrador solo si todavía no hay usuarios
    public static async Task EjecutarAsync(
        AppDbContext db, IPasswordHasher<Usuario> hasher, string nombreUsuario, string password)
    {
        if (await db.Usuarios.AnyAsync()) return;

        var admin = new Usuario { NombreUsuario = nombreUsuario, NombreCompleto = "Administrador", Rol = Rol.Admin };
        admin.PasswordHash = hasher.HashPassword(admin, password);
        db.Usuarios.Add(admin);
        await db.SaveChangesAsync();
    }
}
