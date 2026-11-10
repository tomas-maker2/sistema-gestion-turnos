using GestionTurnos.Api.Data;
using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Errors;
using GestionTurnos.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace GestionTurnos.Tests;

public class ServicioServiceTests
{
    private readonly AppDbContext _db = Ayudas.NuevaBase();
    private readonly ServicioService _servicio;

    public ServicioServiceTests() => _servicio = new ServicioService(_db);

    [Fact]
    public async Task Crear_y_obtener_devuelve_los_mismos_datos()
    {
        var creado = await _servicio.CrearAsync(new ServicioRequest("Corte de pelo", 30));

        var obtenido = await _servicio.ObtenerAsync(creado.Id);

        Assert.Equal("Corte de pelo", obtenido.Nombre);
        Assert.Equal(30, obtenido.DuracionMinutos);
        Assert.True(obtenido.Activo);
    }

    [Theory]
    [InlineData("Corte")]
    [InlineData("CORTE")]
    public async Task Crear_con_nombre_existente_lanza_ReglaNegocio(string nombre)
    {
        await _servicio.CrearAsync(new ServicioRequest("Corte", 30));
        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => _servicio.CrearAsync(new ServicioRequest(nombre, 45)));
    }

    [Fact]
    public async Task Modificar_a_nombre_de_otro_servicio_lanza_ReglaNegocio()
    {
        await _servicio.CrearAsync(new ServicioRequest("Corte", 30));
        var color = await _servicio.CrearAsync(new ServicioRequest("Color", 90));

        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => _servicio.ModificarAsync(color.Id, new ServicioRequest("Corte", 90)));
    }

    [Fact]
    public async Task Modificar_conservando_su_propio_nombre_cambia_la_duracion()
    {
        var corte = await _servicio.CrearAsync(new ServicioRequest("Corte", 30));

        var modificado = await _servicio.ModificarAsync(corte.Id, new ServicioRequest("Corte", 45));

        Assert.Equal(45, modificado.DuracionMinutos);
    }

    [Fact]
    public async Task Listar_no_incluye_inactivos_por_defecto_y_ordena_por_nombre()
    {
        await _servicio.CrearAsync(new ServicioRequest("Peinado", 45));
        var barba = await _servicio.CrearAsync(new ServicioRequest("Barba", 20));
        await _servicio.CrearAsync(new ServicioRequest("Color", 90));
        await _servicio.DesactivarAsync(barba.Id);

        Assert.Equal(["Color", "Peinado"], (await _servicio.ListarAsync(false, 1, 5)).Items.Select(s => s.Nombre));
        Assert.Equal(["Barba", "Color", "Peinado"], (await _servicio.ListarAsync(true, 1, 5)).Items.Select(s => s.Nombre));
    }

    [Fact]
    public async Task Listar_pagina_los_resultados_ordenados_y_devuelve_el_total()
    {
        for (var i = 1; i <= 7; i++) await _servicio.CrearAsync(new ServicioRequest($"S{i}", 30));

        var primera = await _servicio.ListarAsync(false, 1, 5);
        var segunda = await _servicio.ListarAsync(false, 2, 5);

        Assert.Equal(["S1", "S2", "S3", "S4", "S5"], primera.Items.Select(s => s.Nombre));
        Assert.Equal(["S6", "S7"], segunda.Items.Select(s => s.Nombre));
        Assert.Equal(7, primera.Total);
    }

    [Fact]
    public async Task Listar_con_pagina_cero_lanza_Validacion()
    {
        await Assert.ThrowsAsync<ValidacionException>(() => _servicio.ListarAsync(false, 0, 5));
    }

    [Fact]
    public async Task Modificar_con_Activo_true_reactiva_un_servicio_inactivo()
    {
        var corte = await _servicio.CrearAsync(new ServicioRequest("Corte", 30));
        await _servicio.DesactivarAsync(corte.Id);

        var modificado = await _servicio.ModificarAsync(corte.Id, new ServicioRequest("Corte", 30, true));

        Assert.True(modificado.Activo);
    }

    [Fact]
    public async Task Desactivar_mantiene_la_fila_con_Activo_false()
    {
        var corte = await _servicio.CrearAsync(new ServicioRequest("Corte", 30));

        await _servicio.DesactivarAsync(corte.Id);

        Assert.False((await _db.Servicios.SingleAsync(s => s.Id == corte.Id)).Activo);
    }

    [Fact]
    public async Task Obtener_inexistente_lanza_NoEncontrado()
    {
        await Assert.ThrowsAsync<NoEncontradoException>(() => _servicio.ObtenerAsync(999));
    }
}
