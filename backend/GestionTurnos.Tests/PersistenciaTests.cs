using GestionTurnos.Api.Data;
using GestionTurnos.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GestionTurnos.Tests;

public class PersistenciaTests
{
    private static AppDbContext CrearContexto() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    [Fact]
    public async Task Guarda_un_turno_con_cliente_servicio_y_usuario()
    {
        using var db = CrearContexto();
        var usuario = new Usuario { NombreUsuario = "ana", NombreCompleto = "Ana", PasswordHash = "x", Rol = Rol.Operador };
        var cliente = new Cliente { Nombre = "Luis", Apellido = "Gómez", Telefono = "1111" };
        var servicio = new Servicio { Nombre = "Corte", DuracionMinutos = 30 };
        db.Turnos.Add(new Turno
        {
            Usuario = usuario,
            Cliente = cliente,
            Servicio = servicio,
            FechaHoraInicio = new DateTime(2026, 11, 10, 10, 0, 0),
            FechaHoraFin = new DateTime(2026, 11, 10, 10, 30, 0)
        });
        await db.SaveChangesAsync();

        var turno = await db.Turnos
            .Include(t => t.Cliente).Include(t => t.Servicio).Include(t => t.Usuario)
            .SingleAsync();

        Assert.Equal("Gómez", turno.Cliente.Apellido);
        Assert.Equal("Corte", turno.Servicio.Nombre);
        Assert.Equal(Rol.Operador, turno.Usuario.Rol);
        Assert.Equal(EstadoTurno.Pendiente, turno.Estado);
    }

    [Fact]
    public void Un_usuario_nuevo_nace_activo()
    {
        Assert.True(new Usuario().Activo);
        Assert.True(new Cliente().Activo);
        Assert.True(new Servicio().Activo);
    }
}
