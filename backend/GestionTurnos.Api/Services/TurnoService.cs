using System.Linq.Expressions;
using GestionTurnos.Api.Data;
using GestionTurnos.Api.Dtos;
using GestionTurnos.Api.Errors;
using GestionTurnos.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GestionTurnos.Api.Services;

public class TurnoService(AppDbContext db, TimeProvider reloj)
{
    private const int MaxDiasAgenda = 31;

    // Única forma de armar un TurnoDto; EF la traduce a SQL con los nombres incluidos
    private static readonly Expression<Func<Turno, TurnoDto>> ADto = t => new TurnoDto(
        t.Id, t.ClienteId, t.Cliente.Apellido + ", " + t.Cliente.Nombre,
        t.ServicioId, t.Servicio.Nombre, t.FechaHoraInicio, t.FechaHoraFin,
        t.Estado.ToString(), t.Observaciones, t.UsuarioId);

    public async Task<TurnoDto> ObtenerAsync(int id) =>
        await db.Turnos.Where(t => t.Id == id).Select(ADto).SingleOrDefaultAsync()
            ?? throw new NoEncontradoException("El turno no existe");

    // Turnos con inicio en [desde, hasta), incluidos los cancelados
    public async Task<List<TurnoDto>> ObtenerAgendaAsync(DateTime desde, DateTime hasta)
    {
        if (hasta <= desde)
            throw new ValidacionException("La fecha final tiene que ser posterior a la inicial");
        if ((hasta - desde).TotalDays > MaxDiasAgenda)
            throw new ValidacionException($"La agenda no puede abarcar más de {MaxDiasAgenda} días");

        return await db.Turnos
            .Where(t => t.FechaHoraInicio >= desde && t.FechaHoraInicio < hasta)
            .OrderBy(t => t.FechaHoraInicio)
            .Select(ADto)
            .ToListAsync();
    }

    public async Task<TurnoDto> CrearAsync(TurnoRequest pedido, int idUsuario)
    {
        ExigirQueNoSeaPasado(pedido.FechaHoraInicio);
        await ExigirClienteAsync(pedido.ClienteId, exigirActivo: true);
        var servicio = await ExigirServicioAsync(pedido.ServicioId, exigirActivo: true);

        var fin = pedido.FechaHoraInicio.AddMinutes(servicio.DuracionMinutos);
        await ExigirHorarioLibreAsync(pedido.FechaHoraInicio, fin, excluirId: 0);

        var turno = new Turno
        {
            ClienteId = pedido.ClienteId,
            ServicioId = pedido.ServicioId,
            UsuarioId = idUsuario,
            FechaHoraInicio = pedido.FechaHoraInicio,
            FechaHoraFin = fin,
            Observaciones = pedido.Observaciones
        };
        db.Turnos.Add(turno);
        await db.SaveChangesAsync();
        return await ObtenerAsync(turno.Id);
    }

    public async Task<TurnoDto> ModificarAsync(int id, TurnoRequest pedido)
    {
        var turno = await BuscarAsync(id);
        if (turno.Estado != EstadoTurno.Pendiente)
            throw new ReglaNegocioException("Solo se puede modificar un turno pendiente");

        var cambiaInicio = pedido.FechaHoraInicio != turno.FechaHoraInicio;
        var cambiaServicio = pedido.ServicioId != turno.ServicioId;

        if (cambiaInicio) ExigirQueNoSeaPasado(pedido.FechaHoraInicio);
        // Cliente o servicio inactivos solo molestan si se los elige de nuevo
        await ExigirClienteAsync(pedido.ClienteId, exigirActivo: pedido.ClienteId != turno.ClienteId);
        var servicio = await ExigirServicioAsync(pedido.ServicioId, exigirActivo: cambiaServicio);

        // La hora de fin solo se recalcula si cambia el horario o el servicio
        var fin = cambiaInicio || cambiaServicio
            ? pedido.FechaHoraInicio.AddMinutes(servicio.DuracionMinutos)
            : turno.FechaHoraFin;
        await ExigirHorarioLibreAsync(pedido.FechaHoraInicio, fin, excluirId: id);

        turno.ClienteId = pedido.ClienteId;
        turno.ServicioId = pedido.ServicioId;
        turno.FechaHoraInicio = pedido.FechaHoraInicio;
        turno.FechaHoraFin = fin;
        turno.Observaciones = pedido.Observaciones;
        await db.SaveChangesAsync();
        return await ObtenerAsync(id);
    }

    public async Task CancelarAsync(int id)
    {
        var turno = await BuscarAsync(id);
        turno.Cancelar();
        await db.SaveChangesAsync();
    }

    public async Task MarcarAtendidoAsync(int id)
    {
        var turno = await BuscarAsync(id);
        turno.MarcarAtendido();
        await db.SaveChangesAsync();
    }

    // Se superpone si los intervalos se cruzan; los cancelados no cuentan.
    // Un turno que termina cuando otro empieza no se superpone.
    public Task<bool> HaySuperposicionAsync(DateTime inicio, DateTime fin, int excluirId) =>
        db.Turnos.AnyAsync(t =>
            t.Estado != EstadoTurno.Cancelado
            && t.Id != excluirId
            && inicio < t.FechaHoraFin
            && fin > t.FechaHoraInicio);

    private async Task<Turno> BuscarAsync(int id) =>
        await db.Turnos.FindAsync(id) ?? throw new NoEncontradoException("El turno no existe");

    private void ExigirQueNoSeaPasado(DateTime inicio)
    {
        if (inicio < reloj.GetLocalNow().DateTime)
            throw new ValidacionException("El turno no puede empezar en el pasado");
    }

    private async Task ExigirClienteAsync(int id, bool exigirActivo)
    {
        var cliente = await db.Clientes.FindAsync(id) ?? throw new NoEncontradoException("El cliente no existe");
        if (exigirActivo && !cliente.Activo)
            throw new ReglaNegocioException("El cliente está inactivo");
    }

    private async Task<Servicio> ExigirServicioAsync(int id, bool exigirActivo)
    {
        var servicio = await db.Servicios.FindAsync(id) ?? throw new NoEncontradoException("El servicio no existe");
        if (exigirActivo && !servicio.Activo)
            throw new ReglaNegocioException("El servicio está inactivo");
        return servicio;
    }

    private async Task ExigirHorarioLibreAsync(DateTime inicio, DateTime fin, int excluirId)
    {
        if (await HaySuperposicionAsync(inicio, fin, excluirId))
            throw new ReglaNegocioException("El horario está ocupado por otro turno");
    }
}
