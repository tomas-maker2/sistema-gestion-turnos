using System.Text;
using System.Text.Json.Serialization;
using GestionTurnos.Api.Data;
using GestionTurnos.Api.Errors;
using GestionTurnos.Api.Models;
using GestionTurnos.Api.Seguridad;
using GestionTurnos.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Los enums (Rol, Estado) viajan como texto en el JSON
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
builder.Services.AddExceptionHandler<ManejadorErrores>();
builder.Services.AddProblemDetails();

// Servicios
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<IPasswordHasher<Usuario>, PasswordHasher<Usuario>>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UsuarioService>();
builder.Services.AddScoped<ClienteService>();
builder.Services.AddScoped<ServicioService>();

// Autenticación con JWT: todos los endpoints exigen token salvo los marcados [AllowAnonymous]
builder.Services.Configure<JwtOpciones>(builder.Configuration.GetSection("Jwt"));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtOpciones>>((opciones, jwt) =>
    {
        opciones.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Value.Issuer,
            ValidAudience = jwt.Value.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Value.Key)),
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

// El frontend de desarrollo (Angular) corre en este origen
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:4200").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Primer administrador, si hay credenciales configuradas y no hay usuarios
var sembrado = app.Configuration.GetSection("SembradoAdmin");
if (sembrado["Usuario"] is { Length: > 0 } usuario && sembrado["Password"] is { Length: > 0 } password)
{
    using var alcance = app.Services.CreateScope();
    await SembradoAdmin.EjecutarAsync(
        alcance.ServiceProvider.GetRequiredService<AppDbContext>(),
        alcance.ServiceProvider.GetRequiredService<IPasswordHasher<Usuario>>(),
        usuario, password);
}

app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Permite que los tests levanten la API
public partial class Program;
