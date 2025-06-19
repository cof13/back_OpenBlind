const TouristRegistration = require("../models/mongodb/TouristRegistration")
const loggerService = require("../services/loggerService")
const { standardResponse } = require("../utils/responses")
const helpers = require("../utils/helpers")

class TouristController {
  // GET /api/tourist
  async getAllTouristSpots(req, res, next) {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10
      const categoria = req.query.categoria
      const search = req.query.search || ""
      const minRating = req.query.minRating ? Number.parseFloat(req.query.minRating) : 0

      // Construir filtros
      const filters = {}
      if (categoria) filters.categoria = categoria
      if (minRating > 0) filters.calificacion = { $gte: minRating }

      // Búsqueda por texto
      if (search) {
        filters.$text = { $search: search }
      }

      const skip = (page - 1) * limit

      const [touristSpots, total] = await Promise.all([
        TouristRegistration.find(filters).sort({ calificacion: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
        TouristRegistration.countDocuments(filters),
      ])

      const pagination = helpers.calculatePagination(page, limit, total)

      res.json(standardResponse.paginated(touristSpots, pagination, "Puntos turísticos obtenidos correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo puntos turísticos:", error)
      next(error)
    }
  }

  // GET /api/tourist/:id
  async getTouristSpotById(req, res, next) {
    try {
      const { id } = req.params

      const touristSpot = await TouristRegistration.findById(id)
      if (!touristSpot) {
        return res.status(404).json(standardResponse.error("TOURIST_SPOT_NOT_FOUND", "Punto turístico no encontrado"))
      }

      res.json(standardResponse.success(touristSpot, "Punto turístico obtenido correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo punto turístico:", error)
      next(error)
    }
  }

  // POST /api/tourist
  async createTouristSpot(req, res, next) {
    try {
      const { lugarDestino, nombre, descripcion, ubicacion, images, categoria, calificacion } = req.body
      const createdBy = req.user.id

      // Validar coordenadas
      const [lng, lat] = ubicacion.coordinates
      if (!helpers.validateCoordinates(lat, lng)) {
        return res.status(400).json(standardResponse.error("INVALID_COORDINATES", "Coordenadas inválidas"))
      }

      const newTouristSpot = new TouristRegistration({
        lugarDestino: helpers.sanitizeText(lugarDestino),
        nombre: helpers.sanitizeText(nombre),
        descripcion: helpers.sanitizeText(descripcion),
        ubicacion: {
          type: "Point",
          coordinates: [Number.parseFloat(lng), Number.parseFloat(lat)],
        },
        images: images || [],
        categoria,
        calificacion: calificacion || 0,
        createdBy,
      })

      await newTouristSpot.save()

      loggerService.info(`Punto turístico creado: ${nombre}`, {
        touristSpotId: newTouristSpot._id,
        userId: createdBy,
        categoria,
      })

      res.status(201).json(standardResponse.success(newTouristSpot, "Punto turístico creado correctamente"))
    } catch (error) {
      loggerService.error("Error creando punto turístico:", error)
      next(error)
    }
  }

  // PUT /api/tourist/:id
  async updateTouristSpot(req, res, next) {
    try {
      const { id } = req.params
      const { lugarDestino, nombre, descripcion, ubicacion, images, categoria, calificacion } = req.body

      const touristSpot = await TouristRegistration.findById(id)
      if (!touristSpot) {
        return res.status(404).json(standardResponse.error("TOURIST_SPOT_NOT_FOUND", "Punto turístico no encontrado"))
      }

      // Verificar permisos
      if (req.user.role !== "admin" && touristSpot.createdBy !== req.user.id) {
        return res
          .status(403)
          .json(standardResponse.error("FORBIDDEN", "No tienes permisos para editar este punto turístico"))
      }

      const updateData = {}
      if (lugarDestino) updateData.lugarDestino = helpers.sanitizeText(lugarDestino)
      if (nombre) updateData.nombre = helpers.sanitizeText(nombre)
      if (descripcion) updateData.descripcion = helpers.sanitizeText(descripcion)
      if (ubicacion) {
        const [lng, lat] = ubicacion.coordinates
        if (!helpers.validateCoordinates(lat, lng)) {
          return res.status(400).json(standardResponse.error("INVALID_COORDINATES", "Coordenadas inválidas"))
        }
        updateData.ubicacion = {
          type: "Point",
          coordinates: [Number.parseFloat(lng), Number.parseFloat(lat)],
        }
      }
      if (images !== undefined) updateData.images = images
      if (categoria) updateData.categoria = categoria
      if (calificacion !== undefined) updateData.calificacion = Number.parseFloat(calificacion)

      const updatedTouristSpot = await TouristRegistration.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })

      loggerService.info(`Punto turístico actualizado: ${touristSpot.nombre}`, {
        touristSpotId: id,
        userId: req.user.id,
        changes: Object.keys(updateData),
      })

      res.json(standardResponse.success(updatedTouristSpot, "Punto turístico actualizado correctamente"))
    } catch (error) {
      loggerService.error("Error actualizando punto turístico:", error)
      next(error)
    }
  }

  // DELETE /api/tourist/:id
  async deleteTouristSpot(req, res, next) {
    try {
      const { id } = req.params

      const touristSpot = await TouristRegistration.findById(id)
      if (!touristSpot) {
        return res.status(404).json(standardResponse.error("TOURIST_SPOT_NOT_FOUND", "Punto turístico no encontrado"))
      }

      // Verificar permisos
      if (req.user.role !== "admin" && touristSpot.createdBy !== req.user.id) {
        return res
          .status(403)
          .json(standardResponse.error("FORBIDDEN", "No tienes permisos para eliminar este punto turístico"))
      }

      await TouristRegistration.findByIdAndDelete(id)

      loggerService.info(`Punto turístico eliminado: ${touristSpot.nombre}`, {
        touristSpotId: id,
        userId: req.user.id,
      })

      res.json(standardResponse.success(null, "Punto turístico eliminado correctamente"))
    } catch (error) {
      loggerService.error("Error eliminando punto turístico:", error)
      next(error)
    }
  }

  // GET /api/tourist/nearby
  async getNearbyTouristSpots(req, res, next) {
    try {
      const { lat, lng, radius = 5000, categoria } = req.query // radius en metros

      if (!lat || !lng) {
        return res.status(400).json(standardResponse.error("COORDINATES_REQUIRED", "Coordenadas requeridas"))
      }

      if (!helpers.validateCoordinates(Number.parseFloat(lat), Number.parseFloat(lng))) {
        return res.status(400).json(standardResponse.error("INVALID_COORDINATES", "Coordenadas inválidas"))
      }

      // Pipeline de agregación para buscar puntos cercanos
      const pipeline = [
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
          $sort: { calificacion: -1, distance: 1 },
        },
      ]

      // Filtrar por categoría si se especifica
      if (categoria) {
        pipeline.push({
          $match: { categoria },
        })
      }

      const touristSpots = await TouristRegistration.aggregate(pipeline)

      res.json(standardResponse.success(touristSpots, "Puntos turísticos cercanos obtenidos correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo puntos turísticos cercanos:", error)
      next(error)
    }
  }

  // GET /api/tourist/categories
  async getCategories(req, res, next) {
    try {
      const categories = await TouristRegistration.distinct("categoria")

      res.json(standardResponse.success(categories, "Categorías obtenidas correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo categorías:", error)
      next(error)
    }
  }

  // GET /api/tourist/user/:userId (Admin only)
  async getTouristSpotsByUser(req, res, next) {
    try {
      const { userId } = req.params
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10

      const skip = (page - 1) * limit

      const [touristSpots, total] = await Promise.all([
        TouristRegistration.find({ createdBy: Number.parseInt(userId) })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        TouristRegistration.countDocuments({ createdBy: Number.parseInt(userId) }),
      ])

      const pagination = helpers.calculatePagination(page, limit, total)

      res.json(
        standardResponse.paginated(touristSpots, pagination, "Puntos turísticos del usuario obtenidos correctamente"),
      )
    } catch (error) {
      loggerService.error("Error obteniendo puntos turísticos por usuario:", error)
      next(error)
    }
  }
}

module.exports = new TouristController()
