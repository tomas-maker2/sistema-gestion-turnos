using GestionTurnos.Api.Data;
using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Errors;
using GestionTurnos.Api.Models;
using GestionTurnos.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace GestionTurnos.Tests;

public class ClienteServiceTests
{
    private readonly AppDbContext _db = Ayudas.NuevaBase();
    private readonly ClienteService _servicio;

    public ClienteServiceTests() => _servicio = new ClienteService(_db);

    private static ClienteRequest Pedido(string nombre, string apellido, string? email = null) =>
        new(nombre, apellido, "11 4555-1000", email);

    [Fact]
    public async Task Crear_y_obtener_devuelve_los_mismos_datos()
    {
        var creado = await _servicio.CrearAsync(Pedido("Ana", "Pérez", "ana@mail.com"));

        var obtenido = await _servicio.ObtenerAsync(creado.Id);

        Assert.Equal("Ana", obtenido.Nombre);
        Assert.Equal("Pérez", obtenido.Apellido);
        Assert.Equal("11 4555-1000", obtenido.Telefono);
        Assert.Equal("ana@mail.com", obtenido.Email);
        Assert.True(obtenido.Activo);
    }

    [Fact]
    public async Task Crear_con_email_en_blanco_guarda_null()
    {
        var creado = await _servicio.CrearAsync(Pedido("Ana", "Pérez", "  "));
        Assert.Null(creado.Email);
    }

    [Theory]
    [InlineData("no-es-un-email")]
    [InlineData("a@")]
    public async Task Crear_con_email_invalido_lanza_Validacion(string email)
    {
        await Assert.ThrowsAsync<ValidacionException>(() => _servicio.CrearAsync(Pedido("Ana", "Pérez", email)));
    }

    [Fact]
    public async Task Listar_con_texto_filtra_por_nombre_o_apellido_sin_distinguir_mayusculas()
    {
        await _servicio.CrearAsync(Pedido("Ana", "Pérez"));
        await _servicio.CrearAsync(Pedido("Luis", "Anaya"));
        await _servicio.CrearAsync(Pedido("Carlos", "Gómez"));

        var lista = await _servicio.ListarAsync("ANA", false);

        Assert.Equal(["Anaya", "Pérez"], lista.Select(c => c.Apellido));
    }

    [Fact]
    public async Task Listar_no_incluye_inactivos_por_defecto()
    {
        var ana = await _servicio.CrearAsync(Pedido("Ana", "Pérez"));
        await _servicio.CrearAsync(Pedido("Luis", "Gómez"));
        await _servicio.DesactivarAsync(ana.Id);

        Assert.Equal(["Gómez"], (await _servicio.ListarAsync(null, false)).Select(c => c.Apellido));
        Assert.Equal(2, (await _servicio.ListarAsync(null, true)).Count);
    }

    [Fact]
    public async Task Listar_ordena_por_apellido_y_nombre()
    {
        await _servicio.CrearAsync(Pedido("Zoe", "Gómez"));
        await _servicio.CrearAsync(Pedido("Ana", "Gómez"));
        await _servicio.CrearAsync(Pedido("Beto", "Alonso"));

        var lista = await _servicio.ListarAsync(null, false);

        Assert.Equal(["Alonso Beto", "Gómez Ana", "Gómez Zoe"], lista.Select(c => $"{c.Apellido} {c.Nombre}"));
    }

    [Fact]
    public async Task Modificar_cambia_los_datos()
    {
        var creado = await _servicio.CrearAsync(Pedido("Ana", "Pérez"));

        var modificado = await _servicio.ModificarAsync(creado.Id, Pedido("Anita", "Pérez Gil", "nueva@mail.com"));

        Assert.Equal("Anita", modificado.Nombre);
        Assert.Equal("Pérez Gil", modificado.Apellido);
        Assert.Equal("nueva@mail.com", modificado.Email);
    }

    [Fact]
    public async Task Modificar_con_Activo_true_reactiva_un_cliente_inactivo()
    {
        var creado = await _servicio.CrearAsync(Pedido("Ana", "Pérez"));
        await _servicio.DesactivarAsync(creado.Id);

        var modificado = await _servicio.ModificarAsync(creado.Id, Pedido("Ana", "Pérez") with { Activo = true });

        Assert.True(modificado.Activo);
    }

    [Fact]
    public async Task Desactivar_mantiene_la_fila_con_Activo_false()
    {
        var creado = await _servicio.CrearAsync(Pedido("Ana", "Pérez"));

        await _servicio.DesactivarAsync(creado.Id);

        var guardado = await _db.Clientes.SingleAsync(c => c.Id == creado.Id);
        Assert.False(guardado.Activo);
    }

    [Fact]
    public async Task Modificar_inexistente_lanza_NoEncontrado()
    {
        await Assert.ThrowsAsync<NoEncontradoException>(() => _servicio.ModificarAsync(999, Pedido("Ana", "Pérez")));
    }

    [Fact]
    public async Task Desactivar_inexistente_lanza_NoEncontrado()
    {
        await Assert.ThrowsAsync<NoEncontradoException>(() => _servicio.DesactivarAsync(999));
    }
}
