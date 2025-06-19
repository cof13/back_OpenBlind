const User = require("../models/sql/User")
const UserProfile = require("../models/mongodb/UserProfile")
const loggerService = require("../services/loggerService")
const { standardResponse } = require("../utils/responses")
const helpers = require("../utils/helpers")

class UserController {
  // GET /api/users/profile
  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id)
      if (!user) {
        return res.status(404).json(standardResponse.error("USER_NOT_FOUND", "Usuario no encontrado"))
      }

      const userProfile = await UserProfile.findByUserId(user.id)

      // Los datos del perfil ya vienen desencriptados gracias a los getters del modelo
      const profileData = userProfile ? userProfile.getDecryptedData() : null

      res.json(
        standardResponse.success(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            active: user.active,
            created_at: user.created_at,
            profile: profileData,
          },
          "Perfil obtenido correctamente",
        ),
      )
    } catch (error) {
      loggerService.error("Error obteniendo perfil:", error)
      next(error)
    }
  }

  // PUT /api/users/profile
  async updateProfile(req, res, next) {
    try {
      const { nombres, apellidos, telefono, fechaNacimiento, preferences, profileImage } = req.body
      const userId = req.user.id

      // Preparar datos para actualización (la encriptación se maneja automáticamente en el modelo)
      const updateData = {}
      
      if (nombres !== undefined) {
        updateData.nombres = helpers.sanitizeText(nombres)
      }
      
      if (apellidos !== undefined) {
        updateData.apellidos = helpers.sanitizeText(apellidos)
      }
      
      if (telefono !== undefined) {
        updateData.telefono = helpers.sanitizeText(telefono)
      }
      
      if (fechaNacimiento !== undefined) {
        updateData.fechaNacimiento = fechaNacimiento ? new Date(fechaNacimiento) : null
      }
      
      if (profileImage !== undefined) {
        updateData.profileImage = profileImage
      }
      
      if (preferences !== undefined) {
        updateData.preferences = preferences
      }

      // Buscar perfil existente o crear uno nuevo
      let userProfile = await UserProfile.findByUserId(userId)
      
      if (userProfile) {
        // Actualizar perfil existente usando método seguro
        userProfile = await userProfile.updateSafely(updateData)
      } else {
        // Crear nuevo perfil
        userProfile = await UserProfile.createEncrypted({
          userId,
          ...updateData
        })
      }

      loggerService.info(`Perfil actualizado para usuario: ${req.user.email}`, { 
        userId,
        fieldsUpdated: Object.keys(updateData)
      })

      // Devolver datos desencriptados
      const responseData = userProfile.getDecryptedData()

      res.json(standardResponse.success(responseData, "Perfil actualizado correctamente"))
    } catch (error) {
      loggerService.error("Error actualizando perfil:", error)
      next(error)
    }
  }

  // GET /api/users (Admin only)
  async getAllUsers(req, res, next) {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10
      const search = req.query.search || ""

      const { users, total } = await User.findAll(page, limit)

      // Obtener perfiles de MongoDB (los datos vienen desencriptados automáticamente)
      const userIds = users.map((user) => user.id)
      const profiles = await UserProfile.find({ userId: { $in: userIds } })

      // Combinar datos
      const usersWithProfiles = users.map((user) => {
        const profile = profiles.find((p) => p.userId === user.id)
        return {
          ...user,
          profile: profile ? profile.getDecryptedData() : null,
        }
      })

      // Filtrar por búsqueda si se proporciona
      let filteredUsers = usersWithProfiles
      if (search) {
        filteredUsers = usersWithProfiles.filter((user) => {
          // Buscar en email
          if (user.email.toLowerCase().includes(search.toLowerCase())) {
            return true
          }
          
          // Buscar en perfil (nombres y apellidos ya desencriptados)
          if (user.profile) {
            const fullName = `${user.profile.nombres || ''} ${user.profile.apellidos || ''}`.toLowerCase()
            if (fullName.includes(search.toLowerCase())) {
              return true
            }
          }
          
          return false
        })
      }

      const pagination = helpers.calculatePagination(page, limit, total)

      res.json(standardResponse.paginated(filteredUsers, pagination, "Usuarios obtenidos correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo usuarios:", error)
      next(error)
    }
  }

  // GET /api/users/:id (Admin only)
  async getUserById(req, res, next) {
    try {
      const { id } = req.params

      const user = await User.findById(id)
      if (!user) {
        return res.status(404).json(standardResponse.error("USER_NOT_FOUND", "Usuario no encontrado"))
      }

      const userProfile = await UserProfile.findByUserId(user.id)

      res.json(
        standardResponse.success(
          {
            ...user,
            profile: userProfile ? userProfile.getDecryptedData() : null,
          },
          "Usuario obtenido correctamente",
        ),
      )
    } catch (error) {
      loggerService.error("Error obteniendo usuario:", error)
      next(error)
    }
  }

  // PUT /api/users/:id (Admin only)
  async updateUser(req, res, next) {
    try {
      const { id } = req.params
      const { email, password, role, active } = req.body

      const user = await User.findById(id)
      if (!user) {
        return res.status(404).json(standardResponse.error("USER_NOT_FOUND", "Usuario no encontrado"))
      }

      // Actualizar datos en MySQL
      const updateData = {}
      if (email) updateData.email = email
      if (password) updateData.password = password
      if (role) updateData.role = role
      if (typeof active === "boolean") updateData.active = active

      const updated = await User.update(id, updateData)
      if (!updated) {
        return res.status(400).json(standardResponse.error("UPDATE_FAILED", "Error actualizando usuario"))
      }

      loggerService.info(`Usuario actualizado por admin: ${user.email}`, {
        adminId: req.user.id,
        targetUserId: id,
        changes: Object.keys(updateData)
      })

      res.json(standardResponse.success(null, "Usuario actualizado correctamente"))
    } catch (error) {
      loggerService.error("Error actualizando usuario:", error)
      next(error)
    }
  }

  // DELETE /api/users/:id (Admin only)
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params

      if (Number.parseInt(id) === req.user.id) {
        return res.status(400).json(standardResponse.error("CANNOT_DELETE_SELF", "No puedes eliminar tu propia cuenta"))
      }

      const user = await User.findById(id)
      if (!user) {
        return res.status(404).json(standardResponse.error("USER_NOT_FOUND", "Usuario no encontrado"))
      }

      // Eliminar usuario en MySQL
      const deleted = await User.delete(id)
      if (!deleted) {
        return res.status(400).json(standardResponse.error("DELETE_FAILED", "Error eliminando usuario"))
      }

      // Opcional: También eliminar el perfil en MongoDB
      try {
        await UserProfile.deleteOne({ userId: Number.parseInt(id) })
        loggerService.info(`Perfil de usuario eliminado: ${user.email}`)
      } catch (profileError) {
        loggerService.warn(`Error eliminando perfil para usuario ${id}:`, profileError)
        // No fallar la operación principal si falla la eliminación del perfil
      }

      loggerService.info(`Usuario eliminado por admin: ${user.email}`, {
        adminId: req.user.id,
        targetUserId: id,
      })

      res.json(standardResponse.success(null, "Usuario eliminado correctamente"))
    } catch (error) {
      loggerService.error("Error eliminando usuario:", error)
      next(error)
    }
  }

  // PUT /api/users/change-password
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body
      const userId = req.user.id

      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json(standardResponse.error("USER_NOT_FOUND", "Usuario no encontrado"))
      }

      // Verificar contraseña actual
      const encryptionService = require("../services/encryptionService")
      const isValidPassword = encryptionService.comparePassword(currentPassword, user.password)
      if (!isValidPassword) {
        return res.status(400).json(standardResponse.error("INVALID_CURRENT_PASSWORD", "Contraseña actual incorrecta"))
      }

      // Actualizar contraseña
      const updated = await User.update(userId, { password: newPassword })
      if (!updated) {
        return res.status(400).json(standardResponse.error("UPDATE_FAILED", "Error actualizando contraseña"))
      }

      loggerService.info(`Contraseña cambiada para usuario: ${user.email}`, { userId })

      res.json(standardResponse.success(null, "Contraseña actualizada correctamente"))
    } catch (error) {
      loggerService.error("Error cambiando contraseña:", error)
      next(error)
    }
  }

  // GET /api/users/search (Admin only) - Búsqueda avanzada
  async searchUsers(req, res, next) {
    try {
      const { query, page = 1, limit = 10 } = req.query

      if (!query || query.length < 2) {
        return res.status(400).json(standardResponse.error("INVALID_SEARCH", "La consulta debe tener al menos 2 caracteres"))
      }

      // Búsqueda en perfiles (nombres, apellidos)
      const profiles = await UserProfile.searchByName(query)
      
      // Obtener usuarios correspondientes
      const userIds = profiles.map(p => p.userId)
      const users = await User.findAll(1, 1000) // Obtener todos para filtrar
      
      const filteredUsers = users.users.filter(user => {
        return userIds.includes(user.id) || 
               user.email.toLowerCase().includes(query.toLowerCase())
      })

      // Combinar con perfiles
      const usersWithProfiles = filteredUsers.map(user => {
        const profile = profiles.find(p => p.userId === user.id)
        return {
          ...user,
          profile: profile ? profile.getDecryptedData() : null
        }
      })

      // Paginación manual
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + parseInt(limit)
      const paginatedResults = usersWithProfiles.slice(startIndex, endIndex)
      
      const pagination = helpers.calculatePagination(page, limit, usersWithProfiles.length)

      res.json(standardResponse.paginated(paginatedResults, pagination, "Búsqueda completada"))
    } catch (error) {
      loggerService.error("Error en búsqueda de usuarios:", error)
      next(error)
    }
  }

  // POST /api/users/migrate-encryption (Admin only) - Migrar encriptación
  async migrateEncryption(req, res, next) {
    try {
      loggerService.info(`Migración de encriptación iniciada por admin: ${req.user.email}`)

      const result = await UserProfile.migrateEncryption()

      loggerService.info(`Migración completada`, result)

      res.json(standardResponse.success(result, "Migración de encriptación completada"))
    } catch (error) {
      loggerService.error("Error en migración de encriptación:", error)
      next(error)
    }
  }

  // GET /api/users/verify-encryption (Admin only) - Verificar encriptación
  async verifyEncryption(req, res, next) {
    try {
      const result = await UserProfile.verifyEncryption()

      res.json(standardResponse.success(result, "Verificación de encriptación completada"))
    } catch (error) {
      loggerService.error("Error verificando encriptación:", error)
      next(error)
    }
  }
}

module.exports = new UserController()