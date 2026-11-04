using GestionTurnos.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace GestionTurnos.Tests;

// Levanta la API completa en memoria, con una base InMemory en lugar de SQL Server
public class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _nombreBase = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
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
}
