using GestionTurnos.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GestionTurnos.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> opciones) : DbContext(opciones)
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Servicio> Servicios => Set<Servicio>();
    public DbSet<Turno> Turnos => Set<Turno>();

    // El esquema lo define el proyecto de base de datos; acá solo se mapea
    protected override void OnModelCreating(ModelBuilder modelo)
    {
        modelo.Entity<Usuario>(e =>
        {
            e.ToTable("Usuario");
            e.Property(x => x.NombreUsuario).HasMaxLength(50);
            e.Property(x => x.NombreCompleto).HasMaxLength(100);
            e.Property(x => x.PasswordHash).HasMaxLength(500);
            e.Property(x => x.Rol).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(x => x.NombreUsuario).IsUnique();
        });

        modelo.Entity<Cliente>(e =>
        {
            e.ToTable("Cliente");
            e.Property(x => x.Nombre).HasMaxLength(100);
            e.Property(x => x.Apellido).HasMaxLength(100);
            e.Property(x => x.Telefono).HasMaxLength(30);
            e.Property(x => x.Email).HasMaxLength(150);
        });

        modelo.Entity<Servicio>(e =>
        {
            e.ToTable("Servicio");
            e.Property(x => x.Nombre).HasMaxLength(100);
            e.HasIndex(x => x.Nombre).IsUnique();
        });

        modelo.Entity<Turno>(e =>
        {
            e.ToTable("Turno");
            e.Property(x => x.Estado).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Observaciones).HasMaxLength(500);
            e.HasOne(x => x.Cliente).WithMany().HasForeignKey(x => x.ClienteId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Servicio).WithMany().HasForeignKey(x => x.ServicioId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Usuario).WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Restrict);
        });
    }
}
