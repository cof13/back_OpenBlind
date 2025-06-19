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

      // Crear perfil encriptado en MongoDB
      const profileData = {
        userId,
        nombres,
        apellidos,
        telefono,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        // Los datos se encriptarán automáticamente gracias a los setters del modelo
      }

      const userProfile = await UserProfile.createEncrypted(profileData)

      // Generar tokens
      const { accessToken, refreshToken } = authService.generateTokens({
        id: userId,
        email,
        role: "user",
      })

      // Guardar sesión
      await authService.saveSession(userId, accessToken, refreshToken)

      loggerService.info(`Usuario registrado exitosamente: ${email}`, { 
        userId, 
        email,
        encryptedProfile: true 
      })

      // Devolver datos desencriptados para la respuesta
      const responseProfile = userProfile.getDecryptedData()

      res.status(201).json(
        standardResponse.success(
          {
            user: {
              id: userId,
              email,
              role: "user",
              profile: responseProfile,
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

      // Obtener perfil (datos se desencriptan automáticamente)
      const userProfile = await UserProfile.findByUserId(user.id)

      // Generar tokens
      const { accessToken, refreshToken } = authService.generateTokens({
        id: user.id,
        email: user.email,
        role: user.role,
      })

      // Guardar sesión
      await authService.saveSession(user.id, accessToken, refreshToken)

      loggerService.info(`Usuario logueado exitosamente: ${email}`, { 
        userId: user.id, 
        email,
        hasProfile: !!userProfile 
      })

      res.json(
        standardResponse.success(
          {
            user: {
              id: user.id,
              email: user.email,
              role: user.role,
              profile: userProfile ? userProfile.getDecryptedData() : null,
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

      const userProfile = await UserProfile.findByUserId(user.id)

      res.json(
        standardResponse.success(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            active: user.active,
            created_at: user.created_at,
            profile: userProfile ? userProfile.getDecryptedData() : null,
          },
          "Perfil obtenido correctamente",
        ),
      )
    } catch (error) {
      loggerService.error("Error obteniendo perfil:", error)
      next(error)
    }
  }

  // POST /api/auth/complete-profile - Completar perfil después del registro
  async completeProfile(req, res, next) {
    try {
      const { nombres, apellidos, telefono, fechaNacimiento, preferences } = req.body
      const userId = req.user.id

      // Verificar si ya tiene perfil
      let userProfile = await UserProfile.findByUserId(userId)

      const profileData = {
        nombres,
        apellidos,
        telefono,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        preferences: preferences || {}
      }

      if (userProfile) {
        // Actualizar perfil existente
        userProfile = await userProfile.updateSafely(profileData)
      } else {
        // Crear nuevo perfil
        userProfile = await UserProfile.createEncrypted({
          userId,
          ...profileData
        })
      }

      loggerService.info(`Perfil completado para usuario: ${req.user.email}`, { 
        userId,
        fieldsProvided: Object.keys(profileData)
      })

      res.json(
        standardResponse.success(
          userProfile.getDecryptedData(),
          "Perfil completado exitosamente"
        )
      )
    } catch (error) {
      loggerService.error("Error completando perfil:", error)
      next(error)
    }
  }

  // POST /api/auth/verify-profile - Verificar estado del perfil
  async verifyProfile(req, res, next) {
    try {
      const userId = req.user.id
      const userProfile = await UserProfile.findByUserId(userId)

      const isComplete = userProfile && 
                        userProfile.nombres && 
                        userProfile.apellidos

      const profileStatus = {
        hasProfile: !!userProfile,
        isComplete,
        missingFields: []
      }

      if (userProfile) {
        if (!userProfile.nombres) profileStatus.missingFields.push('nombres')
        if (!userProfile.apellidos) profileStatus.missingFields.push('apellidos')
      } else {
        profileStatus.missingFields = ['nombres', 'apellidos']
      }

      res.json(
        standardResponse.success(
          {
            ...profileStatus,
            profile: userProfile ? userProfile.getDecryptedData() : null
          },
          "Estado del perfil verificado"
        )
      )
    } catch (error) {
      loggerService.error("Error verificando perfil:", error)
      next(error)
    }
  }
}

module.exports = new AuthController()