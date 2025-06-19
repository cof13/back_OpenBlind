const User = require("../models/sql/User")
const Route = require("../models/sql/Route")
const UserProfile = require("../models/mongodb/UserProfile")
const PersonalizedMessage = require("../models/mongodb/PersonalizedMessage")
const TouristRegistration = require("../models/mongodb/TouristRegistration")
const VoiceGuide = require("../models/mongodb/VoiceGuide")
const { getConnection } = require("../config/database.sql")
const loggerService = require("../services/loggerService")
const { standardResponse } = require("../utils/responses")

class DashboardController {
  // GET /api/dashboard/stats
  async getStats(req, res, next) {
    try {
      const connection = getConnection()

      // Estadísticas básicas
      const [
        totalUsers,
        totalRoutes,
        totalMessages,
        totalTouristSpots,
        activeUsers,
        recentUsers,
        routesThisMonth,
        messagesThisMonth,
      ] = await Promise.all([
        // Total de usuarios
        connection
          .execute("SELECT COUNT(*) as count FROM users WHERE active = true")
          .then((result) => result[0][0].count),

        // Total de rutas
        connection
          .execute("SELECT COUNT(*) as count FROM routes WHERE active = true")
          .then((result) => result[0][0].count),

        // Total de mensajes
        PersonalizedMessage.countDocuments({ status: "active" }),

        // Total de puntos turísticos
        TouristRegistration.countDocuments(),

        // Usuarios activos (con sesiones válidas)
        connection
          .execute("SELECT COUNT(DISTINCT user_id) as count FROM user_sessions WHERE expires_at > NOW()")
          .then((result) => result[0][0].count),

        // Usuarios registrados en los últimos 7 días
        connection
          .execute("SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
          .then((result) => result[0][0].count),

        // Rutas creadas este mes
        connection
          .execute("SELECT COUNT(*) as count FROM routes WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")
          .then((result) => result[0][0].count),

        // Mensajes creados este mes
        PersonalizedMessage.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
      ])

      // Estadísticas por categoría de turismo
      const touristCategories = await TouristRegistration.aggregate([
        {
          $group: {
            _id: "$categoria",
            count: { $sum: 1 },
            avgRating: { $avg: "$calificacion" },
          },
        },
        {
          $sort: { count: -1 },
        },
      ])

      // Actividad por día (últimos 7 días)
      const activityData = await connection.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as users_registered
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `)

      const stats = {
        overview: {
          totalUsers,
          totalRoutes,
          totalMessages,
          totalTouristSpots,
          activeUsers,
          recentUsers,
          routesThisMonth,
          messagesThisMonth,
        },
        touristCategories,
        activityData: activityData[0],
        growth: {
          usersGrowth: recentUsers > 0 ? ((recentUsers / totalUsers) * 100).toFixed(2) : 0,
          routesGrowth: routesThisMonth > 0 ? ((routesThisMonth / totalRoutes) * 100).toFixed(2) : 0,
          messagesGrowth: messagesThisMonth > 0 ? ((messagesThisMonth / totalMessages) * 100).toFixed(2) : 0,
        },
      }

      res.json(standardResponse.success(stats, "Estadísticas obtenidas correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo estadísticas:", error)
      next(error)
    }
  }

  // GET /api/dashboard/recent-users
  async getRecentUsers(req, res, next) {
    try {
      const limit = Number.parseInt(req.query.limit) || 10
      const connection = getConnection()

      // Obtener usuarios recientes
      const [users] = await connection.execute(
        `SELECT id, email, role, created_at 
         FROM users 
         WHERE active = true 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [limit],
      )

      // Obtener perfiles
      const userIds = users.map((user) => user.id)
      const profiles = await UserProfile.find({ userId: { $in: userIds } }).lean()

      const recentUsers = users.map((user) => {
        const profile = profiles.find((p) => p.userId === user.id)
        return {
          id: user.id,
          email: user.email, // Ya no está encriptado
          role: user.role,
          created_at: user.created_at,
          profile: profile
            ? {
                nombres: profile.nombres,
                apellidos: profile.apellidos,
                telefono: profile.telefono,
              }
            : null,
        }
      })

      res.json(standardResponse.success(recentUsers, "Usuarios recientes obtenidos correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo usuarios recientes:", error)
      next(error)
    }
  }

  // GET /api/dashboard/activity
  async getActivity(req, res, next) {
    try {
      const days = Number.parseInt(req.query.days) || 7
      const connection = getConnection()

      // Actividad de usuarios (registros)
      const [userActivity] = await connection.execute(
        `SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          'users' as type
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC`,
        [days],
      )

      // Actividad de rutas
      const [routeActivity] = await connection.execute(
        `SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          'routes' as type
        FROM routes 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC`,
        [days],
      )

      // Actividad de mensajes
      const messageActivity = await PersonalizedMessage.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            date: "$_id",
            count: 1,
            type: { $literal: "messages" },
            _id: 0,
          },
        },
        {
          $sort: { date: -1 },
        },
      ])

      // Actividad de puntos turísticos
      const touristActivity = await TouristRegistration.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            date: "$_id",
            count: 1,
            type: { $literal: "tourist" },
            _id: 0,
          },
        },
        {
          $sort: { date: -1 },
        },
      ])

      const activity = {
        users: userActivity,
        routes: routeActivity,
        messages: messageActivity,
        tourist: touristActivity,
        summary: {
          totalUsers: userActivity.reduce((sum, item) => sum + item.count, 0),
          totalRoutes: routeActivity.reduce((sum, item) => sum + item.count, 0),
          totalMessages: messageActivity.reduce((sum, item) => sum + item.count, 0),
          totalTourist: touristActivity.reduce((sum, item) => sum + item.count, 0),
        },
      }

      res.json(standardResponse.success(activity, "Actividad obtenida correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo actividad:", error)
      next(error)
    }
  }

  // GET /api/dashboard/user-stats (Para usuarios normales)
  async getUserStats(req, res, next) {
    try {
      const userId = req.user.id
      const connection = getConnection()

      const [userRoutes, userMessages, userTouristSpots] = await Promise.all([
        // Rutas del usuario
        connection
          .execute("SELECT COUNT(*) as count FROM routes WHERE user_id = ? AND active = true", [userId])
          .then((result) => result[0][0].count),

        // Mensajes del usuario
        PersonalizedMessage.countDocuments({ createdBy: userId, status: "active" }),

        // Puntos turísticos del usuario
        TouristRegistration.countDocuments({ createdBy: userId }),
      ])

      // Rutas más recientes
      const [recentRoutes] = await connection.execute(
        "SELECT id, name, location, transport_name, created_at FROM routes WHERE user_id = ? AND active = true ORDER BY created_at DESC LIMIT 5",
        [userId],
      )

      // Mensajes más recientes
      const recentMessages = await PersonalizedMessage.find({ createdBy: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("message routeId coordinates status createdAt")
        .lean()

      const stats = {
        overview: {
          totalRoutes: userRoutes,
          totalMessages: userMessages,
          totalTouristSpots: userTouristSpots,
        },
        recent: {
          routes: recentRoutes,
          messages: recentMessages,
        },
      }

      res.json(standardResponse.success(stats, "Estadísticas del usuario obtenidas correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo estadísticas del usuario:", error)
      next(error)
    }
  }

  // GET /api/dashboard/system-health
  async getSystemHealth(req, res, next) {
    try {
      const connection = getConnection()

      // Verificar conexiones a bases de datos
      const mysqlHealth = await connection
        .execute("SELECT 1")
        .then(() => ({ status: "healthy", message: "MySQL conectado" }))
        .catch((error) => ({ status: "error", message: error.message }))

      const mongoHealth = await PersonalizedMessage.findOne()
        .limit(1)
        .then(() => ({ status: "healthy", message: "MongoDB conectado" }))
        .catch((error) => ({ status: "error", message: error.message }))

      // Información del sistema
      const systemInfo = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV,
      }

      // Limpiar sesiones expiradas
      const authService = require("../services/authService")
      await authService.cleanExpiredSessions()

      const health = {
        status: mysqlHealth.status === "healthy" && mongoHealth.status === "healthy" ? "healthy" : "degraded",
        databases: {
          mysql: mysqlHealth,
          mongodb: mongoHealth,
        },
        system: systemInfo,
        timestamp: new Date().toISOString(),
      }

      res.json(standardResponse.success(health, "Estado del sistema obtenido correctamente"))
    } catch (error) {
      loggerService.error("Error obteniendo estado del sistema:", error)
      next(error)
    }
  }
}

module.exports = new DashboardController()
