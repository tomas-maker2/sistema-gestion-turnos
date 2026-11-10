using GestionTurnos.Api.Data;
using GestionTurnos.Api.Errors;
using GestionTurnos.Api.Models;
using GestionTurnos.Api.Services;

namespace GestionTurnos.Tests;

public class PaginacionTests
{
    private readonly AppDbContext _db = Ayudas.NuevaBase();

    // Crea clientes con nombres N001, N002... para poder comprobar el orden
    private async Task CrearClientes(int cantidad)
    {
        for (var i = 1; i <= cantidad; i++)
            _db.Clientes.Add(new Cliente { Nombre = $"N{i:000}", Apellido = "A", Telefono = "1" });
        await _db.SaveChangesAsync();
    }

    private Task<Api.Dtos.PaginaDto<string>> Pagina(int pagina, int tamanio) =>
        Paginacion.PaginarAsync(_db.Clientes.OrderBy(c => c.Nombre), pagina, tamanio, c => c.Nombre);

    [Fact]
    public async Task Devuelve_los_datos_de_la_pagina_pedida_y_el_total()
    {
        await CrearClientes(12);

        var pagina = await Pagina(2, 5);

        Assert.Equal(["N006", "N007", "N008", "N009", "N010"], pagina.Items);
        Assert.Equal(12, pagina.Total);
        Assert.Equal(2, pagina.Pagina);
        Assert.Equal(5, pagina.Tamanio);
    }

    [Fact]
    public async Task La_ultima_pagina_puede_venir_incompleta()
    {
        await CrearClientes(12);

        var pagina = await Pagina(3, 5);

        Assert.Equal(["N011", "N012"], pagina.Items);
    }

    [Fact]
    public async Task Una_pagina_fuera_de_rango_viene_vacia_pero_con_el_total()
    {
        await CrearClientes(12);

        var pagina = await Pagina(9, 5);

        Assert.Empty(pagina.Items);
        Assert.Equal(12, pagina.Total);
    }

    [Fact]
    public async Task Sin_datos_devuelve_una_pagina_vacia_con_total_cero()
    {
        var pagina = await Pagina(1, 5);

        Assert.Empty(pagina.Items);
        Assert.Equal(0, pagina.Total);
    }

    [Fact]
    public async Task Las_paginas_juntas_recorren_todos_los_datos_sin_repetir_ni_saltear()
    {
        await CrearClientes(23);

        var todos = new List<string>();
        for (var numero = 1; numero <= 3; numero++)
            todos.AddRange((await Pagina(numero, 10)).Items);

        Assert.Equal(Enumerable.Range(1, 23).Select(i => $"N{i:000}"), todos);
    }

    [Theory]
    [InlineData(5)]
    [InlineData(10)]
    [InlineData(30)]
    [InlineData(50)]
    [InlineData(100)]
    public async Task Acepta_los_tamanios_permitidos(int tamanio)
    {
        await CrearClientes(3);
        var pagina = await Pagina(1, tamanio);
        Assert.Equal(tamanio, pagina.Tamanio);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(1)]
    [InlineData(7)]
    [InlineData(20)]
    [InlineData(101)]
    [InlineData(1000)]
    public async Task Rechaza_los_tamanios_no_permitidos(int tamanio)
    {
        await Assert.ThrowsAsync<ValidacionException>(() => Pagina(1, tamanio));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Rechaza_una_pagina_menor_a_1(int pagina)
    {
        await Assert.ThrowsAsync<ValidacionException>(() => Pagina(pagina, 5));
    }

    [Fact]
    public async Task Rechaza_una_pagina_tan_grande_que_desborda()
    {
        await Assert.ThrowsAsync<ValidacionException>(() => Pagina(int.MaxValue, 100));
    }
}
