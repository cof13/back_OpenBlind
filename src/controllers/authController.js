const User = require("../models/sql/User")
const UserProfile = require("../models/mongodb/UserProfile")
const authService = require("../services/authService")
const loggerService = require("../services/loggerService")
const { standardResponse } = require("../utils/responses")

class AuthController {
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const { email, password, nombres, apellidos, telefono, fechaNacimiento } = req.body

      // Verificar si el usuario ya existe
      const existingUser = await User.findByEmail(email)
      if (existingUser) {
        return res.status(400).json(standardResponse.error("USER_EXISTS", "El usuario ya existe"))
      }

      // Crear usuario en MySQL
      const userId = await User.create({ email, password, role: "user" })

      // Crear perfil en MongoDB
      const userProfile = new UserProfile({
        userId,
        nombres,
        apellidos,
        telefono,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
      })

      await userProfile.save()

      // Generar tokens
      const { accessToken, refreshToken } = authService.generateTokens({
        id: userId,
        email,
        role: "user",
      })

      // Guardar sesión
      await authService.saveSession(userId, accessToken, refreshToken)

      loggerService.info(`Usuario registrado exitosamente: ${email}`, { userId, email })

      res.status(201).json(
        standardResponse.success(
          {
            user: {
              id: userId,
              email,
              role: "user",
              profile: {
                nombres,
                apellidos,
                telefono,
                fechaNacimiento,
              },
            },
            token: accessToken,
            refreshToken,
          },
          "Usuario registrado exitosamente",
        ),
      )
    } catch (error) {
      loggerService.error("Error en registro:", error)
      next(error)
    }
  }

  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body

      // Buscar usuario
      const user = await User.findByEmail(email)
      if (!user) {
        return res.status(401).json(standardResponse.error("INVALID_CREDENTIALS", "Credenciales inválidas"))
      }

      // Verificar contraseña
      const encryptionService = require("../services/encryptionService")
      const isValidPassword = encryptionService.comparePassword(password, user.password)
      if (!isValidPassword) {
        return res.status(401).json(standardResponse.error("INVALID_CREDENTIALS", "Credenciales inválidas"))
      }

      // Obtener perfil
      const userProfile = await UserProfile.findOne({ userId: user.id })

      // Generar tokens
      const { accessToken, refreshToken } = authService.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
      })

      // Guardar sesión
      await authService.saveSession(user.id, accessToken, refreshToken)

      loggerService.info(`Usuario logueado exitosamente: ${email}`, { userId: user.id, email })

      res.json(
        standardResponse.success(
          {
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              profile: userProfile
                ? {
                    nombres: userProfile.nombres,
                    apellidos: userProfile.apellidos,
                    telefono: userProfile.telefono,
                    fechaNacimiento: userProfile.fechaNacimiento,
                    preferences: userProfile.preferences,
                  }
                : null,
            },
            token: accessToken,
            refreshToken,
          },
          "Login exitoso",
        ),
      )
    } catch (error) {
      loggerService.error("Error en login:", error)
      next(error)
    }
  }

  // POST /api/auth/refresh
  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body

      if (!refreshToken) {
        return res.status(401).json(standardResponse.error("REFRESH_TOKEN_REQUIRED", "Refresh token requerido"))
      }

      // Verificar refresh token
      const decoded = authService.verifyToken(refreshToken, true)

      // Buscar usuario
      const user = await User.findById(decoded.id)
      if (!user) {
        return res.status(401).json(standardResponse.error("USER_NOT_FOUND", "Usuario no encontrado"))
      }

      // Generar nuevos tokens
      const { accessToken, refreshToken: newRefreshToken } = authService.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
      })

      // Actualizar sesión
      await authService.saveSession(user.id, accessToken, newRefreshToken)

      loggerService.info(`Token renovado para usuario: ${user.email}`, { userId: user.id })

      res.json(
        standardResponse.success(
          {
            token: accessToken,
            refreshToken: newRefreshToken,
          },
          "Token renovado exitosamente",
        ),
      )
    } catch (error) {
      loggerService.error("Error renovando token:", error)
      if (error.message === "Token inválido") {
        return res.status(401).json(standardResponse.error("INVALID_REFRESH_TOKEN", "Refresh token inválido"))
      }
      next(error)
    }
  }

  // POST /api/auth/logout
  async logout(req, res, next) {
    try {
      const token = req.token

      // Remover sesión
      await authService.removeSession(token)

      loggerService.info(`Usuario deslogueado: ${req.user.email}`, { userId: req.user.id })

      res.json(standardResponse.success(null, "Logout exitoso"))
    } catch (error) {
      loggerService.error("Error en logout:", error)
      next(error)
    }
  }

  // GET /api/auth/me
  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id)
      if (!user) {
        return res.status(404).json(standardResponse.error("USER_NOT_FOUND", "Usuario no encontrado"))
      }

      const userProfile = await UserProfile.findOne({ userId: user.id })

      res.json(
        standardResponse.success(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            active: user.active,
            created_at: user.created_at,
            profile: userProfile
              ? {
                  nombres: userProfile.nombres,
                  apellidos: userProfile.apellidos,
                  telefono: userProfile.telefono,
                  fechaNacimiento: userProfile.fechaNacimiento,
                  profileImage: userProfile.profileImage,
                  preferences: userProfile.preferences,
                }
              : null,
          },
          "Perfil obtenido correctamente",
        ),
      )
    } catch (error) {
      loggerService.error("Error obteniendo perfil:", error)
      next(error)
    }
  }
}

module.exports = new AuthController()
