const Route = require("../models/sql/Route")
const loggerService = require("../services/loggerService")
const { standardResponse } = require("../utils/responses")
const helpers = require("../utils/helpers")

class RouteController {
  // GET /api/routes
  async getAllRoutes(req, res, next) {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10
      const search = req.query.search || ""
      const userId = req.user.role === "admin" ? null : req.user.id

      const { routes, total } = await Route.findAll(page, limit, userId)

      // Filtrar por búsqueda si se proporciona
      let filteredRoutes = routes
      if (search) {
        filteredRoutes = routes.filter(
          (route) =>
            route.name.toLowerCase().includes(search.toLowerCase()) ||
            route.location.toLowerCase().includes(search.toLowerCase()) ||
            route.transport_name.toLowerCase().includes(search.toLowerCase()),
        )
      }

      const pagination = helpers.calculatePagination(page, limit, total)

      res.json(standardResponse.paginated(filteredRoutes, pagination, "Rutas obtenidas correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo rutas:", error)
      next(error)
    }
  }

  // GET /api/routes/:id
  async getRouteById(req, res, next) {
    try {
      const { id } = req.params

      const route = await Route.findById(id)
      if (!route) {
        return res.status(404).json(standardResponse.error("ROUTE_NOT_FOUND", "Ruta no encontrada"))
      }

      // Verificar permisos
      if (req.user.role !== "admin" && route.user_id !== req.user.id) {
        return res.status(403).json(standardResponse.error("FORBIDDEN", "No tienes permisos para ver esta ruta"))
      }

      res.json(standardResponse.success(route, "Ruta obtenida correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo ruta:", error)
      next(error)
    }
  }

  // POST /api/routes
  async createRoute(req, res, next) {
    try {
      const { name, location, transport_name } = req.body
      const user_id = req.user.id

      const routeData = {
        name: helpers.sanitizeText(name),
        location: helpers.sanitizeText(location),
        transport_name: helpers.sanitizeText(transport_name),
        user_id,
      }

      const routeId = await Route.create(routeData)

      loggerService.info(`Ruta creada: ${name}`, {
        routeId,
        userId: user_id,
        name,
        location,
      })

      res.status(201).json(
        standardResponse.success(
          {
            id: routeId,
            ...routeData,
          },
          "Ruta creada correctamente",
        ),
      )
    } catch (error) {
      loggerService.error("Error creando ruta:", error)
      next(error)
    }
  }

  // PUT /api/routes/:id
  async updateRoute(req, res, next) {
    try {
      const { id } = req.params
      const { name, location, transport_name } = req.body

      const route = await Route.findById(id)
      if (!route) {
        return res.status(404).json(standardResponse.error("ROUTE_NOT_FOUND", "Ruta no encontrada"))
      }

      // Verificar permisos
      if (req.user.role !== "admin" && route.user_id !== req.user.id) {
        return res.status(403).json(standardResponse.error("FORBIDDEN", "No tienes permisos para editar esta ruta"))
      }

      const updateData = {}
      if (name) updateData.name = helpers.sanitizeText(name)
      if (location) updateData.location = helpers.sanitizeText(location)
      if (transport_name) updateData.transport_name = helpers.sanitizeText(transport_name)

      const updated = await Route.update(id, updateData)
      if (!updated) {
        return res.status(400).json(standardResponse.error("UPDATE_FAILED", "Error actualizando ruta"))
      }

      loggerService.info(`Ruta actualizada: ${route.name}`, {
        routeId: id,
        userId: req.user.id,
        changes: updateData,
      })

      res.json(standardResponse.success(null, "Ruta actualizada correctamente"))
    } catch (error) {
      loggerService.error("Error actualizando ruta:", error)
      next(error)
    }
  }

  // DELETE /api/routes/:id
  async deleteRoute(req, res, next) {
    try {
      const { id } = req.params

      const route = await Route.findById(id)
      if (!route) {
        return res.status(404).json(standardResponse.error("ROUTE_NOT_FOUND", "Ruta no encontrada"))
      }

      // Verificar permisos
      if (req.user.role !== "admin" && route.user_id !== req.user.id) {
        return res.status(403).json(standardResponse.error("FORBIDDEN", "No tienes permisos para eliminar esta ruta"))
      }

      const deleted = await Route.delete(id)
      if (!deleted) {
        return res.status(400).json(standardResponse.error("DELETE_FAILED", "Error eliminando ruta"))
      }

      loggerService.info(`Ruta eliminada: ${route.name}`, {
        routeId: id,
        userId: req.user.id,
        routeName: route.name,
      })

      res.json(standardResponse.success(null, "Ruta eliminada correctamente"))
    } catch (error) {
      loggerService.error("Error eliminando ruta:", error)
      next(error)
    }
  }

  // GET /api/routes/user/:userId (Admin only)
  async getRoutesByUser(req, res, next) {
    try {
      const { userId } = req.params
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10

      const { routes, total } = await Route.findAll(page, limit, userId)

      const pagination = helpers.calculatePagination(page, limit, total)

      res.json(standardResponse.paginated(routes, pagination, "Rutas del usuario obtenidas correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo rutas por usuario:", error)
      next(error)
    }
  }
}

module.exports = new RouteController()
