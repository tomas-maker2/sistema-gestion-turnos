using System.Security.Claims;
using GestionTurnos.Api.Data;
using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Errors;
using GestionTurnos.Api.Models;
using GestionTurnos.Api.Seguridad;
using GestionTurnos.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Microsoft.IdentityModel.JsonWebTokens;

namespace GestionTurnos.Tests;

public class AuthServiceTests
{
    private readonly AppDbContext _db = new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private readonly PasswordHasher<Usuario> _hasher = new();
    private readonly FakeTimeProvider _reloj = new(new DateTimeOffset(2026, 11, 10, 9, 0, 0, TimeSpan.Zero));
    private readonly AuthService _servicio;

    public AuthServiceTests()
    {
        var jwt = Options.Create(new JwtOpciones
        {
            Key = new string('k', 40), Issuer = "test", Audience = "test", HorasValidez = 8
        });
        _servicio = new AuthService(_db, _hasher, jwt, _reloj);
    }

    private async Task<Usuario> CrearUsuario(string nombre, string password, Rol rol = Rol.Operador, bool activo = true)
    {
        var usuario = new Usuario { NombreUsuario = nombre, NombreCompleto = nombre, Rol = rol, Activo = activo };
        usuario.PasswordHash = _hasher.HashPassword(usuario, password);
        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync();
        return usuario;
    }

    [Fact]
    public async Task Login_valido_devuelve_token_con_rol_y_vencimiento_de_horas_configuradas()
    {
        await CrearUsuario("ana", "Clave12345", Rol.Admin);

        var respuesta = await _servicio.LoginAsync(new LoginRequest("ana", "Clave12345"));

        Assert.Equal("Admin", respuesta.Rol);
        Assert.Equal("ana", respuesta.NombreUsuario);
        Assert.Equal(_reloj.GetUtcNow().UtcDateTime.AddHours(8), respuesta.Expira);
        var token = new JsonWebTokenHandler().ReadJsonWebToken(respuesta.Token);
        Assert.Equal("Admin", token.Claims.First(c => c.Type == ClaimTypes.Role).Value);
    }

    [Fact]
    public async Task Login_con_password_incorrecta_lanza_CredencialesInvalidas()
    {
        await CrearUsuario("ana", "Clave12345");
        await Assert.ThrowsAsync<CredencialesInvalidasException>(
            () => _servicio.LoginAsync(new LoginRequest("ana", "otra-clave")));
    }

    [Fact]
    public async Task Login_con_usuario_inexistente_lanza_CredencialesInvalidas()
    {
        await Assert.ThrowsAsync<CredencialesInvalidasException>(
            () => _servicio.LoginAsync(new LoginRequest("nadie", "Clave12345")));
    }

    [Fact]
    public async Task Login_con_usuario_inactivo_lanza_CredencialesInvalidas()
    {
        await CrearUsuario("ana", "Clave12345", activo: false);
        await Assert.ThrowsAsync<CredencialesInvalidasException>(
            () => _servicio.LoginAsync(new LoginRequest("ana", "Clave12345")));
    }

    [Fact]
    public async Task CambiarPassword_con_actual_correcta_permite_login_con_la_nueva()
    {
        var usuario = await CrearUsuario("ana", "Clave12345");

        await _servicio.CambiarPasswordAsync(usuario.Id, new CambiarPasswordRequest("Clave12345", "NuevaClave99"));

        var respuesta = await _servicio.LoginAsync(new LoginRequest("ana", "NuevaClave99"));
        Assert.Equal("ana", respuesta.NombreUsuario);
        await Assert.ThrowsAsync<CredencialesInvalidasException>(
            () => _servicio.LoginAsync(new LoginRequest("ana", "Clave12345")));
    }

    [Fact]
    public async Task CambiarPassword_con_actual_incorrecta_lanza_Validacion()
    {
        var usuario = await CrearUsuario("ana", "Clave12345");
        await Assert.ThrowsAsync<ValidacionException>(
            () => _servicio.CambiarPasswordAsync(usuario.Id, new CambiarPasswordRequest("equivocada", "NuevaClave99")));
    }

    [Fact]
    public async Task Sembrado_crea_admin_si_no_hay_usuarios_y_no_hace_nada_si_ya_hay()
    {
        await SembradoAdmin.EjecutarAsync(_db, _hasher, "admin", "Admin1234!");
        await SembradoAdmin.EjecutarAsync(_db, _hasher, "otro", "Otra12345!");

        var admin = await _db.Usuarios.SingleAsync();
        Assert.Equal("admin", admin.NombreUsuario);
        Assert.Equal(Rol.Admin, admin.Rol);
        var respuesta = await _servicio.LoginAsync(new LoginRequest("admin", "Admin1234!"));
        Assert.Equal("Admin", respuesta.Rol);
    }
}
