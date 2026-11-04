using System.Net.Http.Headers;
using System.Net.Http.Json;
using GestionTurnos.Api.Data;
using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GestionTurnos.Tests;

// Levanta la API completa en memoria, con una base InMemory en lugar de SQL Server
public class ApiFactory : WebApplicationFactory<Program>
{
    public const string PasswordDePrueba = "Clave12345";

    private readonly string _nombreBase = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // "Testing" evita el sembrado del admin, que solo corre en desarrollo
        builder.UseEnvironment("Testing");
        builder.UseSetting("Jwt:Key", new string('k', 40));

        builder.ConfigureServices(servicios =>
        {
            // Quita la configuración de SQL Server registrada por la API
            var sqlServer = servicios
                .Where(d => d.ServiceType.GenericTypeArguments.Contains(typeof(AppDbContext)))
                .ToList();
            foreach (var d in sqlServer) servicios.Remove(d);

            servicios.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(_nombreBase));
        });
    }

    // Crea un usuario con ese rol, inicia sesión por HTTP y devuelve un cliente con el token
    public async Task<HttpClient> ClienteConRol(Rol rol)
    {
        var nombre = $"{rol}-{Guid.NewGuid():N}";

        using (var alcance = Services.CreateScope())
        {
            var db = alcance.ServiceProvider.GetRequiredService<AppDbContext>();
            var hasher = alcance.ServiceProvider.GetRequiredService<IPasswordHasher<Usuario>>();
            var usuario = new Usuario { NombreUsuario = nombre, NombreCompleto = nombre, Rol = rol };
            usuario.PasswordHash = hasher.HashPassword(usuario, PasswordDePrueba);
            db.Usuarios.Add(usuario);
            await db.SaveChangesAsync();
        }

        var cliente = CreateClient();
        var respuesta = await cliente.PostAsJsonAsync("/api/auth/login", new LoginRequest(nombre, PasswordDePrueba));
        respuesta.EnsureSuccessStatusCode();
        var login = (await respuesta.Content.ReadFromJsonAsync<LoginResponse>())!;
        cliente.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login.Token);
        return cliente;
    }
}
