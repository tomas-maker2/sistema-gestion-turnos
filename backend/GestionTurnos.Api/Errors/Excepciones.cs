namespace GestionTurnos.Api.Errors;

// Cada excepción se traduce a un código HTTP en ManejadorErrores

public class ValidacionException(string mensaje) : Exception(mensaje);

public class NoEncontradoException(string mensaje) : Exception(mensaje);

public class ReglaNegocioException(string mensaje) : Exception(mensaje);

public class CredencialesInvalidasException() : Exception("Usuario o contraseña incorrectos");
