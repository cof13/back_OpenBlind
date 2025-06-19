const express = require("express")
const routeController = require("../controllers/routeController")
const { authenticateToken, requireRole } = require("../middleware/auth")
const { validate, schemas } = require("../middleware/validation")

const router = express.Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     Route:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Ruta Centro - Universidad"
 *         location:
 *           type: string
 *           example: "Centro de la ciudad"
 *         transport_name:
 *           type: string
 *           example: "Autobús Línea 5"
 *         user_id:
 *           type: integer
 *           example: 1
 *         active:
 *           type: boolean
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T10:00:00Z"
 *
 *     RouteRequest:
 *       type: object
 *       required:
 *         - name
 *         - location
 *         - transport_name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 255
 *           example: "Ruta Centro - Universidad"
 *         location:
 *           type: string
 *           minLength: 3
 *           maxLength: 255
 *           example: "Centro de la ciudad"
 *         transport_name:
 *           type: string
 *           minLength: 3
 *           maxLength: 255
 *           example: "Autobús Línea 5"
 */

/**
 * @swagger
 * /routes:
 *   get:
 *     summary: Obtener lista de rutas
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Elementos por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre, ubicación o transporte
 *     responses:
 *       200:
 *         description: Lista de rutas obtenida correctamente
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
 *                     $ref: '#/components/schemas/Route'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *       401:
 *         description: No autenticado
 */
router.get("/", authenticateToken, routeController.getAllRoutes)

/**
 * @swagger
 * /routes/{id}:
 *   get:
 *     summary: Obtener ruta por ID
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la ruta
 *     responses:
 *       200:
 *         description: Ruta obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Route'
 *                 message:
 *                   type: string
 *       404:
 *         description: Ruta no encontrada
 *       403:
 *         description: Sin permisos para ver esta ruta
 */
router.get("/:id", authenticateToken, routeController.getRouteById)

/**
 * @swagger
 * /routes:
 *   post:
 *     summary: Crear nueva ruta
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RouteRequest'
 *     responses:
 *       201:
 *         description: Ruta creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Route'
 *                 message:
 *                   type: string
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 */
router.post("/", authenticateToken, validate(schemas.route), routeController.createRoute)

/**
 * @swagger
 * /routes/{id}:
 *   put:
 *     summary: Actualizar ruta
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la ruta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RouteRequest'
 *     responses:
 *       200:
 *         description: Ruta actualizada correctamente
 *       404:
 *         description: Ruta no encontrada
 *       403:
 *         description: Sin permisos para editar esta ruta
 */
router.put("/:id", authenticateToken, validate(schemas.route), routeController.updateRoute)

/**
 * @swagger
 * /routes/{id}:
 *   delete:
 *     summary: Eliminar ruta
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la ruta
 *     responses:
 *       200:
 *         description: Ruta eliminada correctamente
 *       404:
 *         description: Ruta no encontrada
 *       403:
 *         description: Sin permisos para eliminar esta ruta
 */
router.delete("/:id", authenticateToken, routeController.deleteRoute)

/**
 * @swagger
 * /routes/user/{userId}:
 *   get:
 *     summary: Obtener rutas de un usuario específico (Solo Admin)
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: Rutas del usuario obtenidas correctamente
 *       403:
 *         description: Sin permisos de administrador
 */
router.get("/user/:userId", authenticateToken, requireRole(["admin"]), routeController.getRoutesByUser)

module.exports = router
