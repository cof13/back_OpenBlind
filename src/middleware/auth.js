const authService = require("../services/authService")
const loggerService = require("../services/loggerService")
const { standardResponse } = require("../utils/responses")

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return res.status(401).json(standardResponse.error("UNAUTHORIZED", "Token de acceso requerido"))
    }

    // Verificar token
    const decoded = authService.verifyToken(token)

    // Validar sesión en base de datos
    const isValidSession = await authService.validateSession(token)
    if (!isValidSession) {
      return res.status(401).json(standardResponse.error("SESSION_EXPIRED", "Sesión expirada"))
    }

    req.user = decoded
    req.token = token

    loggerService.info(`Usuario autenticado: ${decoded.email}`, {
      userId: decoded.id,
      email: decoded.email,
    })

    next()
  } catch (error) {
    loggerService.error("Error en autenticación:", error)
    return res.status(401).json(standardResponse.error("INVALID_TOKEN", "Token inválido"))
  }
}

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(standardResponse.error("UNAUTHORIZED", "Usuario no autenticado"))
    }

    if (!roles.includes(req.user.role)) {
      loggerService.warn(`Acceso denegado para usuario ${req.user.email} con rol ${req.user.role}`)
      return res.status(403).json(standardResponse.error("FORBIDDEN", "No tienes permisos para acceder a este recurso"))
    }

    next()
  }
}

module.exports = {
  authenticateToken,
  requireRole,
}
