const loggerService = require("../services/loggerService")
const { standardResponse } = require("../utils/responses")

const errorHandler = (err, req, res, next) => {
  loggerService.error("Error no manejado:", {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  })

  // Error de validación de Mongoose
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }))

    return res.status(400).json(standardResponse.error("VALIDATION_ERROR", "Error de validación", errors))
  }

  // Error de duplicado en MongoDB
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(400).json(standardResponse.error("DUPLICATE_ERROR", `El ${field} ya existe`))
  }

  // Error de JWT
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json(standardResponse.error("INVALID_TOKEN", "Token inválido"))
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json(standardResponse.error("TOKEN_EXPIRED", "Token expirado"))
  }

  // Error de conexión a base de datos
  if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
    return res.status(503).json(standardResponse.error("DATABASE_ERROR", "Error de conexión a la base de datos"))
  }

  // Error genérico del servidor
  res.status(500).json(standardResponse.error("INTERNAL_SERVER_ERROR", "Error interno del servidor"))
}

module.exports = errorHandler
