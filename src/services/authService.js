const jwt = require("jsonwebtoken")
const config = require("../config/environment")
const { getConnection } = require("../config/database.sql")
const encryptionService = require("./encryptionService")
const loggerService = require("./loggerService")

class AuthService {
  generateTokens(payload) {
    const accessToken = jwt.sign(payload, config.JWT.SECRET, {
      expiresIn: config.JWT.EXPIRES_IN,
    })

    const refreshToken = jwt.sign(payload, config.JWT.REFRESH_SECRET, {
      expiresIn: config.JWT.REFRESH_EXPIRES_IN,
    })

    return { accessToken, refreshToken }
  }

  verifyToken(token, isRefresh = false) {
    try {
      const secret = isRefresh ? config.JWT.REFRESH_SECRET : config.JWT.SECRET
      return jwt.verify(token, secret)
    } catch (error) {
      throw new Error("Token inválido")
    }
  }

  async saveSession(userId, accessToken, refreshToken) {
    try {
      const connection = getConnection()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días

      await connection.execute(
        "INSERT INTO user_sessions (user_id, token, refresh_token, expires_at) VALUES (?, ?, ?, ?)",
        [userId, accessToken, refreshToken, expiresAt],
      )

      loggerService.info(`Sesión guardada para usuario ${userId}`)
    } catch (error) {
      loggerService.error("Error guardando sesión:", error)
      throw error
    }
  }

  async removeSession(token) {
    try {
      const connection = getConnection()
      await connection.execute("DELETE FROM user_sessions WHERE token = ?", [token])
      loggerService.info("Sesión removida correctamente")
    } catch (error) {
      loggerService.error("Error removiendo sesión:", error)
      throw error
    }
  }

  async validateSession(token) {
    try {
      const connection = getConnection()
      const [rows] = await connection.execute("SELECT * FROM user_sessions WHERE token = ? AND expires_at > NOW()", [
        token,
      ])

      return rows.length > 0
    } catch (error) {
      loggerService.error("Error validando sesión:", error)
      return false
    }
  }

  async cleanExpiredSessions() {
    try {
      const connection = getConnection()
      await connection.execute("DELETE FROM user_sessions WHERE expires_at < NOW()")
      loggerService.info("Sesiones expiradas limpiadas")
    } catch (error) {
      loggerService.error("Error limpiando sesiones:", error)
    }
  }
}

module.exports = new AuthService()
