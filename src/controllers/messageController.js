const PersonalizedMessage = require("../models/mongodb/PersonalizedMessage")
const Route = require("../models/sql/Route")
const loggerService = require("../services/loggerService")
const { standardResponse } = require("../utils/responses")
const helpers = require("../utils/helpers")

class MessageController {
  // GET /api/messages
  async getAllMessages(req, res, next) {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10
      const routeId = req.query.routeId
      const status = req.query.status
      const search = req.query.search || ""

      // Construir filtros
      const filters = {}
      if (routeId) filters.routeId = Number.parseInt(routeId)
      if (status) filters.status = status

      // Si no es admin, solo ver sus propios mensajes
      if (req.user.role !== "admin") {
        filters.createdBy = req.user.id
      }

      // Búsqueda por texto
      if (search) {
        filters.$text = { $search: search }
      }

      const skip = (page - 1) * limit

      const [messages, total] = await Promise.all([
        PersonalizedMessage.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        PersonalizedMessage.countDocuments(filters),
      ])

      const pagination = helpers.calculatePagination(page, limit, total)

      res.json(standardResponse.paginated(messages, pagination, "Mensajes obtenidos correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo mensajes:", error)
      next(error)
    }
  }

  // GET /api/messages/:id
  async getMessageById(req, res, next) {
    try {
      const { id } = req.params

      const message = await PersonalizedMessage.findById(id)
      if (!message) {
        return res.status(404).json(standardResponse.error("MESSAGE_NOT_FOUND", "Mensaje no encontrado"))
      }

      // Verificar permisos
      if (req.user.role !== "admin" && message.createdBy !== req.user.id) {
        return res.status(403).json(standardResponse.error("FORBIDDEN", "No tienes permisos para ver este mensaje"))
      }

      res.json(standardResponse.success(message, "Mensaje obtenido correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo mensaje:", error)
      next(error)
    }
  }

  // POST /api/messages
  async createMessage(req, res, next) {
    try {
      const { message, routeId, coordinates, audioUrl } = req.body
      const createdBy = req.user.id

      // Verificar que la ruta existe y el usuario tiene permisos
      const route = await Route.findById(routeId)
      if (!route) {
        return res.status(404).json(standardResponse.error("ROUTE_NOT_FOUND", "Ruta no encontrada"))
      }

      if (req.user.role !== "admin" && route.user_id !== req.user.id) {
        return res
          .status(403)
          .json(standardResponse.error("FORBIDDEN", "No tienes permisos para crear mensajes en esta ruta"))
      }

      // Validar coordenadas
      if (!helpers.validateCoordinates(coordinates.lat, coordinates.lng)) {
        return res.status(400).json(standardResponse.error("INVALID_COORDINATES", "Coordenadas inválidas"))
      }

      const newMessage = new PersonalizedMessage({
        message: helpers.sanitizeText(message),
        routeId: Number.parseInt(routeId),
        coordinates: {
          lat: Number.parseFloat(coordinates.lat),
          lng: Number.parseFloat(coordinates.lng),
        },
        audioUrl: audioUrl || null,
        createdBy,
        status: "active",
      })

      await newMessage.save()

      loggerService.info(`Mensaje personalizado creado`, {
        messageId: newMessage._id,
        routeId,
        userId: createdBy,
      })

      res.status(201).json(standardResponse.success(newMessage, "Mensaje creado correctamente"))
    } catch (error) {
      loggerService.error("Error creando mensaje:", error)
      next(error)
    }
  }

  // PUT /api/messages/:id
  async updateMessage(req, res, next) {
    try {
      const { id } = req.params
      const { message, coordinates, audioUrl, status } = req.body

      const existingMessage = await PersonalizedMessage.findById(id)
      if (!existingMessage) {
        return res.status(404).json(standardResponse.error("MESSAGE_NOT_FOUND", "Mensaje no encontrado"))
      }

      // Verificar permisos
      if (req.user.role !== "admin" && existingMessage.createdBy !== req.user.id) {
        return res.status(403).json(standardResponse.error("FORBIDDEN", "No tienes permisos para editar este mensaje"))
      }

      const updateData = {}
      if (message) updateData.message = helpers.sanitizeText(message)
      if (coordinates) {
        if (!helpers.validateCoordinates(coordinates.lat, coordinates.lng)) {
          return res.status(400).json(standardResponse.error("INVALID_COORDINATES", "Coordenadas inválidas"))
        }
        updateData.coordinates = {
          lat: Number.parseFloat(coordinates.lat),
          lng: Number.parseFloat(coordinates.lng),
        }
      }
      if (audioUrl !== undefined) updateData.audioUrl = audioUrl
      if (status) updateData.status = status

      const updatedMessage = await PersonalizedMessage.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })

      loggerService.info(`Mensaje personalizado actualizado`, {
        messageId: id,
        userId: req.user.id,
        changes: Object.keys(updateData),
      })

      res.json(standardResponse.success(updatedMessage, "Mensaje actualizado correctamente"))
    } catch (error) {
      loggerService.error("Error actualizando mensaje:", error)
      next(error)
    }
  }

  // DELETE /api/messages/:id
  async deleteMessage(req, res, next) {
    try {
      const { id } = req.params

      const message = await PersonalizedMessage.findById(id)
      if (!message) {
        return res.status(404).json(standardResponse.error("MESSAGE_NOT_FOUND", "Mensaje no encontrado"))
      }

      // Verificar permisos
      if (req.user.role !== "admin" && message.createdBy !== req.user.id) {
        return res
          .status(403)
          .json(standardResponse.error("FORBIDDEN", "No tienes permisos para eliminar este mensaje"))
      }

      await PersonalizedMessage.findByIdAndDelete(id)

      loggerService.info(`Mensaje personalizado eliminado`, {
        messageId: id,
        userId: req.user.id,
      })

      res.json(standardResponse.success(null, "Mensaje eliminado correctamente"))
    } catch (error) {
      loggerService.error("Error eliminando mensaje:", error)
      next(error)
    }
  }

  // GET /api/messages/route/:routeId
  async getMessagesByRoute(req, res, next) {
    try {
      const { routeId } = req.params
      const status = req.query.status || "active"

      // Verificar que la ruta existe
      const route = await Route.findById(routeId)
      if (!route) {
        return res.status(404).json(standardResponse.error("ROUTE_NOT_FOUND", "Ruta no encontrada"))
      }

      // Verificar permisos
      if (req.user.role !== "admin" && route.user_id !== req.user.id) {
        return res
          .status(403)
          .json(standardResponse.error("FORBIDDEN", "No tienes permisos para ver mensajes de esta ruta"))
      }

      const messages = await PersonalizedMessage.find({
        routeId: Number.parseInt(routeId),
        status,
      }).sort({ createdAt: -1 })

      res.json(standardResponse.success(messages, "Mensajes de la ruta obtenidos correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo mensajes por ruta:", error)
      next(error)
    }
  }

  // GET /api/messages/nearby
  async getNearbyMessages(req, res, next) {
    try {
      const { lat, lng, radius = 1000 } = req.query // radius en metros

      if (!lat || !lng) {
        return res.status(400).json(standardResponse.error("COORDINATES_REQUIRED", "Coordenadas requeridas"))
      }

      if (!helpers.validateCoordinates(Number.parseFloat(lat), Number.parseFloat(lng))) {
        return res.status(400).json(standardResponse.error("INVALID_COORDINATES", "Coordenadas inválidas"))
      }

      // Buscar mensajes cercanos usando agregación
      const messages = await PersonalizedMessage.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [Number.parseFloat(lng), Number.parseFloat(lat)],
            },
            distanceField: "distance",
            maxDistance: Number.parseInt(radius),
            spherical: true,
          },
        },
        {
          $match: {
            status: "active",
          },
        },
        {
          $sort: { distance: 1 },
        },
      ])

      res.json(standardResponse.success(messages, "Mensajes cercanos obtenidos correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo mensajes cercanos:", error)
      next(error)
    }
  }
}

module.exports = new MessageController()
