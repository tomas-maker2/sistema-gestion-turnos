using GestionTurnos.Api.Data;
using GestionTurnos.Api.Errors;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddExceptionHandler<ManejadorErrores>();
builder.Services.AddProblemDetails();

// El frontend de desarrollo (Angular) corre en este origen
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:4200").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();
app.MapControllers();

app.Run();

// Permite que los tests levanten la API
public partial class Program;
