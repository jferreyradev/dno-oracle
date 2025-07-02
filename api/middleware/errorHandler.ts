/**
 * Middleware para manejo de errores
 */

export function errorHandler(error: Error): Response {
  console.error("Error:", error.message);
  console.error("Stack:", error.stack);

  // Determinar el código de estado basado en el tipo de error
  let status = 500;
  let message = "Error interno del servidor";

  if (error.message.includes("ORA-")) {
    // Error de Oracle Database
    status = 400;
    message = "Error en la base de datos: " + error.message;
  } else if (error.message.includes("not found")) {
    status = 404;
    message = "Recurso no encontrado";
  } else if (error.message.includes("validation")) {
    status = 400;
    message = "Error de validación: " + error.message;
  }

  return new Response(
    JSON.stringify({
      error: true,
      message: message,
      timestamp: new Date().toISOString(),
    }),
    {
      status: status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
