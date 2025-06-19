const express = require("express")
const messageController = require("../controllers/messageController")
const { authenticateToken, requireRole } = require("../middleware/auth")
const { validate, schemas } = require("../middleware/validation")
const Joi = require("joi")

const router = express.Router()

// Esquema de validación para actualizar mensaje
const updateMessageSchema = Joi.object({
  message: Joi.string().min(1).max(1000),
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
  }),
  audioUrl: Joi.string().uri().allow(null, ""),
  status: Joi.string().valid("active", "inactive", "pending"),
})

/**
 * @swagger
 * components:
 *   schemas:
 *     PersonalizedMessage:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         message:
 *           type: string
 *           example: "Gira a la derecha en la próxima esquina"
 *         status:
 *           type: string
 *           enum: [active, inactive, pending]
 *           example: "active"
 *         routeId:
 *           type: integer
 *           example: 1
 *         coordinates:
 *           type: object
 *           properties:
 *             lat:
 *               type: number
 *               minimum: -90
 *               maximum: 90
 *               example: -12.0464
 *             lng:
 *               type: number
 *               minimum: -180
 *               maximum: 180
 *               example: -77.0428
 *         audioUrl:
 *           type: string
 *           format: uri
 *           nullable: true
 *           example: "https://ejemplo.com/audio.mp3"
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
 *     MessageRequest:
 *       type: object
 *       required:
 *         - message
 *         - routeId
 *         - coordinates
 *       properties:
 *         message:
 *           type: string
 *           minLength: 1
 *           maxLength: 1000
 *           example: "Gira a la derecha en la próxima esquina"
 *         routeId:
 *           type: integer
 *           example: 1
 *         coordinates:
 *           type: object
 *           required:
 *             - lat
 *             - lng
 *           properties:
 *             lat:
 *               type: number
 *               minimum: -90
 *               maximum: 90
 *               example: -12.0464
 *             lng:
 *               type: number
 *               minimum: -180
 *               maximum: 180
 *               example: -77.0428
 *         audioUrl:
 *           type: string
 *           format: uri
 *           example: "https://ejemplo.com/audio.mp3"
 */

/**
 * @swagger
 * /messages:
 *   get:
 *     summary: Obtener lista de mensajes personalizados
 *     tags: [Mensajes]
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
 *         name: routeId
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de ruta
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, pending]
 *         description: Filtrar por estado
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por texto en el mensaje
 *     responses:
 *       200:
 *         description: Lista de mensajes obtenida correctamente
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
 *                     $ref: '#/components/schemas/PersonalizedMessage'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *       401:
 *         description: No autenticado
 */
router.get("/", authenticateToken, messageController.getAllMessages)

/**
 * @swagger
 * /messages/{id}:
 *   get:
 *     summary: Obtener mensaje por ID
 *     tags: [Mensajes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del mensaje
 *     responses:
 *       200:
 *         description: Mensaje obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PersonalizedMessage'
 *                 message:
 *                   type: string
 *       404:
 *         description: Mensaje no encontrado
 *       403:
 *         description: Sin permisos para ver este mensaje
 */
router.get("/:id", authenticateToken, messageController.getMessageById)

/**
 * @swagger
 * /messages:
 *   post:
 *     summary: Crear nuevo mensaje personalizado
 *     tags: [Mensajes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MessageRequest'
 *     responses:
 *       201:
 *         description: Mensaje creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PersonalizedMessage'
 *                 message:
 *                   type: string
 *       400:
 *         description: Error de validación o coordenadas inválidas
 *       404:
 *         description: Ruta no encontrada
 *       403:
 *         description: Sin permisos para crear mensajes en esta ruta
 */
router.post("/", authenticateToken, validate(schemas.message), messageController.createMessage)

/**
 * @swagger
 * /messages/{id}:
 *   put:
 *     summary: Actualizar mensaje personalizado
 *     tags: [Mensajes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del mensaje
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                     minimum: -90
 *                     maximum: 90
 *                   lng:
 *                     type: number
 *                     minimum: -180
 *                     maximum: 180
 *               audioUrl:
 *                 type: string
 *                 format: uri
 *               status:
 *                 type: string
 *                 enum: [active, inactive, pending]
 *     responses:
 *       200:
 *         description: Mensaje actualizado correctamente
 *       404:
 *         description: Mensaje no encontrado
 *       403:
 *         description: Sin permisos para editar este mensaje
 */
router.put("/:id", authenticateToken, validate(updateMessageSchema), messageController.updateMessage)

/**
 * @swagger
 * /messages/{id}:
 *   delete:
 *     summary: Eliminar mensaje personalizado
 *     tags: [Mensajes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del mensaje
 *     responses:
 *       200:
 *         description: Mensaje eliminado correctamente
 *       404:
 *         description: Mensaje no encontrado
 *       403:
 *         description: Sin permisos para eliminar este mensaje
 */
router.delete("/:id", authenticateToken, messageController.deleteMessage)

/**
 * @swagger
 * /messages/route/{routeId}:
 *   get:
 *     summary: Obtener mensajes de una ruta específica
 *     tags: [Mensajes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la ruta
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, pending]
 *           default: active
 *         description: Filtrar por estado
 *     responses:
 *       200:
 *         description: Mensajes de la ruta obtenidos correctamente
 *       404:
 *         description: Ruta no encontrada
 *       403:
 *         description: Sin permisos para ver mensajes de esta ruta
 */
router.get("/route/:routeId", authenticateToken, messageController.getMessagesByRoute)

/**
 * @swagger
 * /messages/nearby:
 *   get:
 *     summary: Obtener mensajes cercanos a una ubicación
 *     tags: [Mensajes]
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
 *           default: 1000
 *         description: Radio de búsqueda en metros
 *     responses:
 *       200:
 *         description: Mensajes cercanos obtenidos correctamente
 *       400:
 *         description: Coordenadas requeridas o inválidas
 */
router.get("/nearby", authenticateToken, messageController.getNearbyMessages)

module.exports = router
