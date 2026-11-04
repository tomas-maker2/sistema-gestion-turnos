using System.Security.Claims;
using System.Text;
using GestionTurnos.Api.Data;
using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Errors;
using GestionTurnos.Api.Models;
using GestionTurnos.Api.Seguridad;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace GestionTurnos.Api.Services;

public class AuthService(
    AppDbContext db, IPasswordHasher<Usuario> hasher, IOptions<JwtOpciones> opciones, TimeProvider reloj)
{
    private readonly JwtOpciones _jwt = opciones.Value;

    public async Task<LoginResponse> LoginAsync(LoginRequest pedido)
    {
        var usuario = await db.Usuarios.SingleOrDefaultAsync(u => u.NombreUsuario == pedido.NombreUsuario);

        // Mismo error si no existe, está inactivo o la clave no coincide
        if (usuario is null || !usuario.Activo || !PasswordCorrecta(usuario, pedido.Password))
            throw new CredencialesInvalidasException();

        var expira = reloj.GetUtcNow().UtcDateTime.AddHours(_jwt.HorasValidez);
        return new LoginResponse(GenerarToken(usuario, expira), usuario.NombreUsuario,
            usuario.NombreCompleto, usuario.Rol.ToString(), expira);
    }

    public async Task CambiarPasswordAsync(int idUsuario, CambiarPasswordRequest pedido)
    {
        var usuario = await db.Usuarios.FindAsync(idUsuario)
            ?? throw new NoEncontradoException("El usuario no existe");

        if (!PasswordCorrecta(usuario, pedido.PasswordActual))
            throw new ValidacionException("La contraseña actual es incorrecta");

        usuario.PasswordHash = hasher.HashPassword(usuario, pedido.PasswordNueva);
        await db.SaveChangesAsync();
    }

    private bool PasswordCorrecta(Usuario usuario, string password) =>
        hasher.VerifyHashedPassword(usuario, usuario.PasswordHash, password) != PasswordVerificationResult.Failed;

    private string GenerarToken(Usuario usuario, DateTime expira)
    {
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                new Claim(ClaimTypes.Name, usuario.NombreUsuario),
                new Claim(ClaimTypes.Role, usuario.Rol.ToString())
            ]),
            Issuer = _jwt.Issuer,
            Audience = _jwt.Audience,
            Expires = expira,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key)), SecurityAlgorithms.HmacSha256)
        };
        return new JsonWebTokenHandler().CreateToken(descriptor);
    }
}
