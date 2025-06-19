const express = require("express")
const touristController = require("../controllers/touristController")
const { authenticateToken, requireRole } = require("../middleware/auth")
const { validate, schemas } = require("../middleware/validation")
const Joi = require("joi")

const router = express.Router()

// Esquema de validación para actualizar punto turístico
const updateTouristSchema = Joi.object({
  lugarDestino: Joi.string().min(3).max(255),
  nombre: Joi.string().min(3).max(255),
  descripcion: Joi.string().min(10).max(2000),
  ubicacion: Joi.object({
    coordinates: Joi.array().items(Joi.number()).length(2),
    type: Joi.string().valid("Point").default("Point"),
  }),
  images: Joi.array().items(Joi.string().uri()),
  categoria: Joi.string().valid("restaurante", "hotel", "atraccion", "transporte", "servicio", "otro"),
  calificacion: Joi.number().min(0).max(5),
})

/**
 * @swagger
 * components:
 *   schemas:
 *     TouristSpot:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         lugarDestino:
 *           type: string
 *           example: "Centro Histórico de Lima"
 *         nombre:
 *           type: string
 *           example: "Plaza de Armas"
 *         descripcion:
 *           type: string
 *           example: "Plaza principal de Lima con arquitectura colonial"
 *         ubicacion:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [Point]
 *               example: "Point"
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *               minItems: 2
 *               maxItems: 2
 *               example: [-77.0428, -12.0464]
 *         images:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           example: ["https://ejemplo.com/imagen1.jpg", "https://ejemplo.com/imagen2.jpg"]
 *         categoria:
 *           type: string
 *           enum: [restaurante, hotel, atraccion, transporte, servicio, otro]
 *           example: "atraccion"
 *         calificacion:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *           example: 4.5
 *         createdBy:
 *           type: integer
 *           example: 1
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T10:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T10:00:00Z"
 *
 *     TouristSpotRequest:
 *       type: object
 *       required:
 *         - lugarDestino
 *         - nombre
 *         - descripcion
 *         - ubicacion
 *         - categoria
 *       properties:
 *         lugarDestino:
 *           type: string
 *           minLength: 3
 *           maxLength: 255
 *           example: "Centro Histórico de Lima"
 *         nombre:
 *           type: string
 *           minLength: 3
 *           maxLength: 255
 *           example: "Plaza de Armas"
 *         descripcion:
 *           type: string
 *           minLength: 10
 *           maxLength: 2000
 *           example: "Plaza principal de Lima con arquitectura colonial"
 *         ubicacion:
 *           type: object
 *           required:
 *             - coordinates
 *           properties:
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *               minItems: 2
 *               maxItems: 2
 *               example: [-77.0428, -12.0464]
 *             type:
 *               type: string
 *               enum: [Point]
 *               default: "Point"
 *         images:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           example: ["https://ejemplo.com/imagen1.jpg"]
 *         categoria:
 *           type: string
 *           enum: [restaurante, hotel, atraccion, transporte, servicio, otro]
 *           example: "atraccion"
 *         calificacion:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *           default: 0
 *           example: 4.5
 */

/**
 * @swagger
 * /tourist:
 *   get:
 *     summary: Obtener lista de puntos turísticos
 *     tags: [Turismo]
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
 *         name: categoria
 *         schema:
 *           type: string
 *           enum: [restaurante, hotel, atraccion, transporte, servicio, otro]
 *         description: Filtrar por categoría
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o descripción
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *         description: Calificación mínima
 *     responses:
 *       200:
 *         description: Lista de puntos turísticos obtenida correctamente
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
 *                     $ref: '#/components/schemas/TouristSpot'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *       401:
 *         description: No autenticado
 */
router.get("/", authenticateToken, touristController.getAllTouristSpots)

/**
 * @swagger
 * /tourist/{id}:
 *   get:
 *     summary: Obtener punto turístico por ID
 *     tags: [Turismo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del punto turístico
 *     responses:
 *       200:
 *         description: Punto turístico obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TouristSpot'
 *                 message:
 *                   type: string
 *       404:
 *         description: Punto turístico no encontrado
 */
router.get("/:id", authenticateToken, touristController.getTouristSpotById)

/**
 * @swagger
 * /tourist:
 *   post:
 *     summary: Crear nuevo punto turístico
 *     tags: [Turismo]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TouristSpotRequest'
 *     responses:
 *       201:
 *         description: Punto turístico creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TouristSpot'
 *                 message:
 *                   type: string
 *       400:
 *         description: Error de validación o coordenadas inválidas
 *       401:
 *         description: No autenticado
 */
router.post("/", authenticateToken, validate(schemas.tourist), touristController.createTouristSpot)

/**
 * @swagger
 * /tourist/{id}:
 *   put:
 *     summary: Actualizar punto turístico
 *     tags: [Turismo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del punto turístico
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lugarDestino:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *               nombre:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *               descripcion:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *               ubicacion:
 *                 type: object
 *                 properties:
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                     minItems: 2
 *                     maxItems: 2
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *               categoria:
 *                 type: string
 *                 enum: [restaurante, hotel, atraccion, transporte, servicio, otro]
 *               calificacion:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Punto turístico actualizado correctamente
 *       404:
 *         description: Punto turístico no encontrado
 *       403:
 *         description: Sin permisos para editar este punto turístico
 */
router.put("/:id", authenticateToken, validate(updateTouristSchema), touristController.updateTouristSpot)

/**
 * @swagger
 * /tourist/{id}:
 *   delete:
 *     summary: Eliminar punto turístico
 *     tags: [Turismo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del punto turístico
 *     responses:
 *       200:
 *         description: Punto turístico eliminado correctamente
 *       404:
 *         description: Punto turístico no encontrado
 *       403:
 *         description: Sin permisos para eliminar este punto turístico
 */
router.delete("/:id", authenticateToken, touristController.deleteTouristSpot)

/**
 * @swagger
 * /tourist/nearby:
 *   get:
 *     summary: Obtener puntos turísticos cercanos a una ubicación
 *     tags: [Turismo]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitud
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitud
 *       - in: query
 *         name: radius
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 5000
 *         description: Radio de búsqueda en metros
 *       - in: query
 *         name: categoria
 *         schema:
 *           type: string
 *           enum: [restaurante, hotel, atraccion, transporte, servicio, otro]
 *         description: Filtrar por categoría
 *     responses:
 *       200:
 *         description: Puntos turísticos cercanos obtenidos correctamente
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
 *                       - $ref: '#/components/schemas/TouristSpot'
 *                       - type: object
 *                         properties:
 *                           distance:
 *                             type: number
 *                             description: Distancia en metros
 *                             example: 1250.5
 *                 message:
 *                   type: string
 *       400:
 *         description: Coordenadas requeridas o inválidas
 */
router.get("/nearby", authenticateToken, touristController.getNearbyTouristSpots)

/**
 * @swagger
 * /tourist/categories:
 *   get:
 *     summary: Obtener lista de categorías disponibles
 *     tags: [Turismo]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categorías obtenidas correctamente
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
 *                     type: string
 *                   example: ["restaurante", "hotel", "atraccion", "transporte", "servicio", "otro"]
 *                 message:
 *                   type: string
 */
router.get("/categories", authenticateToken, touristController.getCategories)

/**
 * @swagger
 * /tourist/user/{userId}:
 *   get:
 *     summary: Obtener puntos turísticos de un usuario específico (Solo Admin)
 *     tags: [Turismo]
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
 *         description: Puntos turísticos del usuario obtenidos correctamente
 *       403:
 *         description: Sin permisos de administrador
 */
router.get("/user/:userId", authenticateToken, requireRole(["admin"]), touristController.getTouristSpotsByUser)

module.exports = router
