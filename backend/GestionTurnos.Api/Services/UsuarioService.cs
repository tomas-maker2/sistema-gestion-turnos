using GestionTurnos.Api.Data;
using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Errors;
using GestionTurnos.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GestionTurnos.Api.Services;

public class UsuarioService(AppDbContext db, IPasswordHasher<Usuario> hasher)
{
    public Task<PaginaDto<UsuarioDto>> ListarAsync(int pagina, int tamanio) =>
        Paginacion.PaginarAsync(db.Usuarios.OrderBy(u => u.NombreUsuario), pagina, tamanio, Mapear);

    public async Task<UsuarioDto> ObtenerAsync(int id) => Mapear(await BuscarAsync(id));

    public async Task<UsuarioDto> CrearAsync(UsuarioCrearRequest pedido)
    {
        var nombre = pedido.NombreUsuario.Trim();
        if (await db.Usuarios.AnyAsync(u => u.NombreUsuario.ToLower() == nombre.ToLower()))
            throw new ReglaNegocioException("Ya existe un usuario con ese nombre");

        var usuario = new Usuario { NombreUsuario = nombre, NombreCompleto = pedido.NombreCompleto.Trim(), Rol = pedido.Rol };
        usuario.PasswordHash = hasher.HashPassword(usuario, pedido.Password);
        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync();
        return Mapear(usuario);
    }

    public async Task<UsuarioDto> ModificarAsync(int id, UsuarioModificarRequest pedido, int idUsuarioActual)
    {
        var usuario = await BuscarAsync(id);

        if (!pedido.Activo) NoDesactivarse(id, idUsuarioActual);
        // Si deja de ser administrador activo, tiene que quedar otro
        if (usuario.Rol == Rol.Admin && usuario.Activo && (pedido.Rol != Rol.Admin || !pedido.Activo))
            await ExigirOtroAdminAsync(usuario);

        usuario.NombreCompleto = pedido.NombreCompleto.Trim();
        usuario.Rol = pedido.Rol;
        usuario.Activo = pedido.Activo;
        await db.SaveChangesAsync();
        return Mapear(usuario);
    }

    // Baja lógica: la fila no se borra
    public async Task DesactivarAsync(int id, int idUsuarioActual)
    {
        var usuario = await BuscarAsync(id);

        NoDesactivarse(id, idUsuarioActual);
        if (usuario.Rol == Rol.Admin && usuario.Activo)
            await ExigirOtroAdminAsync(usuario);

        usuario.Activo = false;
        await db.SaveChangesAsync();
    }

    public async Task ResetearPasswordAsync(int id, ResetearPasswordRequest pedido)
    {
        var usuario = await BuscarAsync(id);
        usuario.PasswordHash = hasher.HashPassword(usuario, pedido.PasswordNueva);
        await db.SaveChangesAsync();
    }

    private async Task<Usuario> BuscarAsync(int id) =>
        await db.Usuarios.FindAsync(id) ?? throw new NoEncontradoException("El usuario no existe");

    private static void NoDesactivarse(int id, int idUsuarioActual)
    {
        if (id == idUsuarioActual)
            throw new ReglaNegocioException("No podés desactivar tu propio usuario");
    }

    // Evita dejar el sistema sin administradores activos
    private async Task ExigirOtroAdminAsync(Usuario usuario)
    {
        var hayOtro = await db.Usuarios.AnyAsync(u => u.Rol == Rol.Admin && u.Activo && u.Id != usuario.Id);
        if (!hayOtro)
            throw new ReglaNegocioException("Tiene que quedar al menos un administrador activo");
    }

    private static UsuarioDto Mapear(Usuario u) =>
        new(u.Id, u.NombreUsuario, u.NombreCompleto, u.Rol.ToString(), u.Activo);
}
