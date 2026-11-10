using GestionTurnos.Api.Data;
using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Errors;
using GestionTurnos.Api.Models;
using GestionTurnos.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace GestionTurnos.Tests;

public class UsuarioServiceTests
{
    private readonly AppDbContext _db = Ayudas.NuevaBase();
    private readonly PasswordHasher<Usuario> _hasher = new();
    private readonly UsuarioService _servicio;

    public UsuarioServiceTests() => _servicio = new UsuarioService(_db, _hasher);

    [Fact]
    public async Task Crear_guarda_hash_y_nunca_la_contrasena_en_texto_plano()
    {
        var dto = await _servicio.CrearAsync(new UsuarioCrearRequest("ana", "Ana Pérez", "Clave12345", Rol.Operador));

        var guardado = await _db.Usuarios.SingleAsync(u => u.Id == dto.Id);
        Assert.NotEqual("Clave12345", guardado.PasswordHash);
        Assert.NotEqual(PasswordVerificationResult.Failed,
            _hasher.VerifyHashedPassword(guardado, guardado.PasswordHash, "Clave12345"));
        Assert.Equal("Operador", dto.Rol);
        Assert.True(dto.Activo);
    }

    [Theory]
    [InlineData("ana")]
    [InlineData("ANA")]
    public async Task Crear_con_NombreUsuario_existente_lanza_ReglaNegocio(string nombre)
    {
        await Ayudas.CrearUsuario(_db, "ana");
        await Assert.ThrowsAsync<ReglaNegocioException>(
            () => _servicio.CrearAsync(new UsuarioCrearRequest(nombre, "Otra", "Clave12345", Rol.Operador)));
    }

    [Fact]
    public async Task Listar_devuelve_todos_ordenados_por_nombre_de_usuario()
    {
        await Ayudas.CrearUsuario(_db, "carla");
        await Ayudas.CrearUsuario(_db, "ana", activo: false);
        await Ayudas.CrearUsuario(_db, "beto");

        var lista = await _servicio.ListarAsync(1, 5);

        Assert.Equal(["ana", "beto", "carla"], lista.Items.Select(u => u.NombreUsuario));
    }

    [Fact]
    public async Task Listar_pagina_los_resultados_ordenados_y_devuelve_el_total()
    {
        for (var i = 1; i <= 7; i++) await Ayudas.CrearUsuario(_db, $"u{i}");

        var primera = await _servicio.ListarAsync(1, 5);
        var segunda = await _servicio.ListarAsync(2, 5);

        Assert.Equal(["u1", "u2", "u3", "u4", "u5"], primera.Items.Select(u => u.NombreUsuario));
        Assert.Equal(["u6", "u7"], segunda.Items.Select(u => u.NombreUsuario));
        Assert.Equal(7, primera.Total);
    }

    [Fact]
    public async Task Listar_con_tamanio_no_permitido_lanza_Validacion()
    {
        await Assert.ThrowsAsync<ValidacionException>(() => _servicio.ListarAsync(1, 20));
    }

    [Fact]
    public async Task Obtener_inexistente_lanza_NoEncontrado()
    {
        await Assert.ThrowsAsync<NoEncontradoException>(() => _servicio.ObtenerAsync(999));
    }

    [Fact]
    public async Task Modificar_cambia_nombre_y_rol()
    {
        var admin = await Ayudas.CrearUsuario(_db, "admin", Rol.Admin);
        var ana = await Ayudas.CrearUsuario(_db, "ana");

        var dto = await _servicio.ModificarAsync(ana.Id,
            new UsuarioModificarRequest("Ana García", Rol.Admin, true), admin.Id);

        Assert.Equal("Ana García", dto.NombreCompleto);
        Assert.Equal("Admin", dto.Rol);
    }

    [Fact]
    public async Task Modificar_con_Activo_true_reactiva_un_usuario_inactivo()
    {
        var admin = await Ayudas.CrearUsuario(_db, "admin", Rol.Admin);
        var ana = await Ayudas.CrearUsuario(_db, "ana", activo: false);

        var dto = await _servicio.ModificarAsync(ana.Id,
            new UsuarioModificarRequest("ana", Rol.Operador, true), admin.Id);

        Assert.True(dto.Activo);
    }

    [Fact]
    public async Task Desactivar_pone_Activo_false_y_no_borra_la_fila()
    {
        var admin = await Ayudas.CrearUsuario(_db, "admin", Rol.Admin);
        var ana = await Ayudas.CrearUsuario(_db, "ana");

        await _servicio.DesactivarAsync(ana.Id, admin.Id);

        var guardado = await _db.Usuarios.SingleAsync(u => u.Id == ana.Id);
        Assert.False(guardado.Activo);
    }

    [Fact]
    public async Task Desactivar_un_admin_cuando_hay_otro_admin_activo_funciona()
    {
        var admin1 = await Ayudas.CrearUsuario(_db, "admin1", Rol.Admin);
        var admin2 = await Ayudas.CrearUsuario(_db, "admin2", Rol.Admin);

        await _servicio.DesactivarAsync(admin2.Id, admin1.Id);

        Assert.False((await _db.Usuarios.SingleAsync(u => u.Id == admin2.Id)).Activo);
    }

    [Fact]
    public async Task Desactivar_al_ultimo_admin_activo_lanza_ReglaNegocio()
    {
        var admin = await Ayudas.CrearUsuario(_db, "admin", Rol.Admin);
        // Un segundo admin inactivo no cuenta como administrador disponible
        await Ayudas.CrearUsuario(_db, "viejo", Rol.Admin, activo: false);
        var operador = await Ayudas.CrearUsuario(_db, "ana");

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _servicio.DesactivarAsync(admin.Id, operador.Id));
    }

    [Fact]
    public async Task Desactivarse_a_si_mismo_lanza_ReglaNegocio()
    {
        var admin1 = await Ayudas.CrearUsuario(_db, "admin1", Rol.Admin);
        await Ayudas.CrearUsuario(_db, "admin2", Rol.Admin);

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _servicio.DesactivarAsync(admin1.Id, admin1.Id));
    }

    [Fact]
    public async Task Modificar_bajando_de_Admin_a_Operador_al_ultimo_admin_lanza_ReglaNegocio()
    {
        var admin = await Ayudas.CrearUsuario(_db, "admin", Rol.Admin);
        var operador = await Ayudas.CrearUsuario(_db, "ana");

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _servicio.ModificarAsync(admin.Id,
            new UsuarioModificarRequest("admin", Rol.Operador, true), operador.Id));
    }

    [Fact]
    public async Task Modificar_desactivandose_a_si_mismo_lanza_ReglaNegocio()
    {
        var admin1 = await Ayudas.CrearUsuario(_db, "admin1", Rol.Admin);
        await Ayudas.CrearUsuario(_db, "admin2", Rol.Admin);

        await Assert.ThrowsAsync<ReglaNegocioException>(() => _servicio.ModificarAsync(admin1.Id,
            new UsuarioModificarRequest("admin1", Rol.Admin, false), admin1.Id));
    }

    [Fact]
    public async Task ResetearPassword_permite_login_con_la_nueva_clave()
    {
        var ana = await Ayudas.CrearUsuario(_db, "ana", password: "ClaveVieja1");

        await _servicio.ResetearPasswordAsync(ana.Id, new ResetearPasswordRequest("ClaveNueva99"));

        var guardado = await _db.Usuarios.SingleAsync(u => u.Id == ana.Id);
        Assert.NotEqual(PasswordVerificationResult.Failed,
            _hasher.VerifyHashedPassword(guardado, guardado.PasswordHash, "ClaveNueva99"));
        Assert.Equal(PasswordVerificationResult.Failed,
            _hasher.VerifyHashedPassword(guardado, guardado.PasswordHash, "ClaveVieja1"));
    }

    [Fact]
    public async Task ResetearPassword_de_usuario_inexistente_lanza_NoEncontrado()
    {
        await Assert.ThrowsAsync<NoEncontradoException>(
            () => _servicio.ResetearPasswordAsync(999, new ResetearPasswordRequest("ClaveNueva99")));
    }
}
