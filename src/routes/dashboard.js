const express = require("express")
const dashboardController = require("../controllers/dashboardController")
const { authenticateToken, requireRole } = require("../middleware/auth")

const router = express.Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardStats:
 *       type: object
 *       properties:
 *         overview:
 *           type: object
 *           properties:
 *             totalUsers:
 *               type: integer
 *               example: 150
 *             totalRoutes:
 *               type: integer
 *               example: 45
 *             totalMessages:
 *               type: integer
 *               example: 230
 *             totalTouristSpots:
 *               type: integer
 *               example: 78
 *             activeUsers:
 *               type: integer
 *               example: 25
 *             recentUsers:
 *               type: integer
 *               example: 12
 *             routesThisMonth:
 *               type: integer
 *               example: 8
 *             messagesThisMonth:
 *               type: integer
 *               example: 35
 *         touristCategories:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *                 example: "restaurante"
 *               count:
 *                 type: integer
 *                 example: 25
 *               avgRating:
 *                 type: number
 *                 example: 4.2
 *         growth:
 *           type: object
 *           properties:
 *             usersGrowth:
 *               type: string
 *               example: "8.00"
 *             routesGrowth:
 *               type: string
 *               example: "17.78"
 *             messagesGrowth:
 *               type: string
 *               example: "15.22"
 *
 *     SystemHealth:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [healthy, degraded, error]
 *           example: "healthy"
 *         databases:
 *           type: object
 *           properties:
 *             mysql:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 message:
 *                   type: string
 *                   example: "MySQL conectado"
 *             mongodb:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 message:
 *                   type: string
 *                   example: "MongoDB conectado"
 *         system:
 *           type: object
 *           properties:
 *             uptime:
 *               type: number
 *               example: 3600.5
 *             memory:
 *               type: object
 *               properties:
 *                 rss:
 *                   type: integer
 *                 heapTotal:
 *                   type: integer
 *                 heapUsed:
 *                   type: integer
 *                 external:
 *                   type: integer
 *             nodeVersion:
 *               type: string
 *               example: "v18.17.0"
 *             platform:
 *               type: string
 *               example: "linux"
 *             environment:
 *               type: string
 *               example: "development"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T10:00:00Z"
 *
 *     Pagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         total:
 *           type: integer
 *           example: 100
 *         totalPages:
 *           type: integer
 *           example: 10
 *         hasNext:
 *           type: boolean
 *           example: true
 *         hasPrev:
 *           type: boolean
 *           example: false
 */

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: Obtener estadísticas generales del sistema (Solo Admin)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/DashboardStats'
 *                 message:
 *                   type: string
 *                   example: "Estadísticas obtenidas correctamente"
 *       403:
 *         description: Sin permisos de administrador
 *       401:
 *         description: No autenticado
 */
router.get("/stats", authenticateToken, requireRole(["admin"]), dashboardController.getStats)

/**
 * @swagger
 * /dashboard/recent-users:
 *   get:
 *     summary: Obtener usuarios recientes (Solo Admin)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Número de usuarios a obtener
 *     responses:
 *       200:
 *         description: Usuarios recientes obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/User'
 *                       - type: object
 *                         properties:
 *                           profile:
 *                             type: object
 *                             properties:
 *                               nombres:
 *                                 type: string
 *                               apellidos:
 *                                 type: string
 *                               telefono:
 *                                 type: string
 *                 message:
 *                   type: string
 *       403:
 *         description: Sin permisos de administrador
 */
router.get("/recent-users", authenticateToken, requireRole(["admin"]), dashboardController.getRecentUsers)

/**
 * @swagger
 * /dashboard/activity:
 *   get:
 *     summary: Obtener actividad del sistema (Solo Admin)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 30
 *           default: 7
 *         description: Número de días para obtener actividad
 *     responses:
 *       200:
 *         description: Actividad del sistema obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           count:
 *                             type: integer
 *                           type:
 *                             type: string
 *                             example: "users"
 *                     routes:
 *                       type: array
 *                       items:
 *                         type: object
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                     tourist:
 *                       type: array
 *                       items:
 *                         type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                         totalRoutes:
 *                           type: integer
 *                         totalMessages:
 *                           type: integer
 *                         totalTourist:
 *                           type: integer
 *                 message:
 *                   type: string
 *       403:
 *         description: Sin permisos de administrador
 */
router.get("/activity", authenticateToken, requireRole(["admin"]), dashboardController.getActivity)

/**
 * @swagger
 * /dashboard/user-stats:
 *   get:
 *     summary: Obtener estadísticas del usuario autenticado
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas del usuario obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalRoutes:
 *                           type: integer
 *                           example: 5
 *                         totalMessages:
 *                           type: integer
 *                           example: 12
 *                         totalTouristSpots:
 *                           type: integer
 *                           example: 3
 *                     recent:
 *                       type: object
 *                       properties:
 *                         routes:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Route'
 *                         messages:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               message:
 *                                 type: string
 *                               routeId:
 *                                 type: integer
 *                               coordinates:
 *                                 type: object
 *                               status:
 *                                 type: string
 *                               createdAt:
 *                                 type: string
 *                                 format: date-time
 *                 message:
 *                   type: string
 *       401:
 *         description: No autenticado
 */
router.get("/user-stats", authenticateToken, dashboardController.getUserStats)

/**
 * @swagger
 * /dashboard/system-health:
 *   get:
 *     summary: Obtener estado de salud del sistema (Solo Admin)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estado del sistema obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SystemHealth'
 *                 message:
 *                   type: string
 *                   example: "Estado del sistema obtenido correctamente"
 *       403:
 *         description: Sin permisos de administrador
 */
router.get("/system-health", authenticateToken, requireRole(["admin"]), dashboardController.getSystemHealth)

module.exports = router
