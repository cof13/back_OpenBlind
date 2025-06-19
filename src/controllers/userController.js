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

      const userProfile = await UserProfile.findOne({ userId: user.id })

      res.json(
        standardResponse.success(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            active: user.active,
            created_at: user.created_at,
            profile: userProfile || null,
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

      // Actualizar perfil en MongoDB
      const updateData = {}
      if (nombres) updateData.nombres = helpers.sanitizeText(nombres)
      if (apellidos) updateData.apellidos = helpers.sanitizeText(apellidos)
      if (telefono) updateData.telefono = helpers.sanitizeText(telefono)
      if (fechaNacimiento) updateData.fechaNacimiento = new Date(fechaNacimiento)
      if (profileImage) updateData.profileImage = profileImage
      if (preferences) updateData.preferences = preferences

      const userProfile = await UserProfile.findOneAndUpdate({ userId }, updateData, {
        new: true,
        upsert: true,
        runValidators: true,
      })

      loggerService.info(`Perfil actualizado para usuario: ${req.user.email}`, { userId })

      res.json(standardResponse.success(userProfile, "Perfil actualizado correctamente"))
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

      // Obtener perfiles de MongoDB
      const userIds = users.map((user) => user.id)
      const profiles = await UserProfile.find({ userId: { $in: userIds } })

      // Combinar datos
      const usersWithProfiles = users.map((user) => {
        const profile = profiles.find((p) => p.userId === user.id)
        return {
          ...user,
          profile: profile || null,
        }
      })

      // Filtrar por búsqueda si se proporciona
      let filteredUsers = usersWithProfiles
      if (search) {
        filteredUsers = usersWithProfiles.filter(
          (user) =>
            user.email.toLowerCase().includes(search.toLowerCase()) ||
            (user.profile &&
              (user.profile.nombres.toLowerCase().includes(search.toLowerCase()) ||
                user.profile.apellidos.toLowerCase().includes(search.toLowerCase()))),
        )
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

      const userProfile = await UserProfile.findOne({ userId: user.id })

      res.json(
        standardResponse.success(
          {
            ...user,
            profile: userProfile || null,
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

      const deleted = await User.delete(id)
      if (!deleted) {
        return res.status(400).json(standardResponse.error("DELETE_FAILED", "Error eliminando usuario"))
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
}

module.exports = new UserController()
