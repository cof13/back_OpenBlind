const express = require("express")
const userController = require("../controllers/userController")
const { authenticateToken, requireRole } = require("../middleware/auth")
const { validate, schemas } = require("../middleware/validation")
const Joi = require("joi")

const router = express.Router()

// Esquemas de validación específicos para usuarios
const updateProfileSchema = Joi.object({
  nombres: Joi.string().min(2).max(100),
  apellidos: Joi.string().min(2).max(100),
  telefono: Joi.string().pattern(/^[0-9+\-\s()]+$/),
  fechaNacimiento: Joi.date().max("now"),
  profileImage: Joi.string().uri(),
  preferences: Joi.object({
    language: Joi.string().valid("es", "en"),
    voiceSpeed: Joi.number().min(0.5).max(2.0),
    notifications: Joi.boolean(),
  }),
})

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
})

const updateUserSchema = Joi.object({
  email: Joi.string().email(),
  password: Joi.string().min(6),
  role: Joi.string().valid("admin", "user"),
  active: Joi.boolean(),
})

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         nombres:
 *           type: string
 *           example: "Juan"
 *         apellidos:
 *           type: string
 *           example: "Pérez"
 *         telefono:
 *           type: string
 *           example: "+1234567890"
 *         fechaNacimiento:
 *           type: string
 *           format: date
 *           example: "1990-01-01"
 *         profileImage:
 *           type: string
 *           format: uri
 *           example: "https://ejemplo.com/imagen.jpg"
 *         preferences:
 *           type: object
 *           properties:
 *             language:
 *               type: string
 *               enum: [es, en]
 *               example: "es"
 *             voiceSpeed:
 *               type: number
 *               minimum: 0.5
 *               maximum: 2.0
 *               example: 1.0
 *             notifications:
 *               type: boolean
 *               example: true
 */

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Obtener perfil del usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         profile:
 *                           $ref: '#/components/schemas/UserProfile'
 *                 message:
 *                   type: string
 *       401:
 *         description: No autenticado
 */
router.get("/profile", authenticateToken, userController.getProfile)

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Actualizar perfil del usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserProfile'
 *     responses:
 *       200:
 *         description: Perfil actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 */
router.put("/profile", authenticateToken, validate(updateProfileSchema), userController.updateProfile)

/**
 * @swagger
 * /users/change-password:
 *   put:
 *     summary: Cambiar contraseña del usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "password123"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente
 *       400:
 *         description: Contraseña actual incorrecta
 *       401:
 *         description: No autenticado
 */
router.put("/change-password", authenticateToken, validate(changePasswordSchema), userController.changePassword)

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Obtener lista de usuarios (Solo Admin)
 *     tags: [Usuarios]
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
 *         description: Buscar por email o nombre
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida correctamente
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
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 message:
 *                   type: string
 *       403:
 *         description: Sin permisos de administrador
 */
router.get("/", authenticateToken, requireRole(["admin"]), userController.getAllUsers)

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Obtener usuario por ID (Solo Admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario obtenido correctamente
 *       404:
 *         description: Usuario no encontrado
 *       403:
 *         description: Sin permisos de administrador
 */
router.get("/:id", authenticateToken, requireRole(["admin"]), userController.getUserById)

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Actualizar usuario (Solo Admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Usuario actualizado correctamente
 *       404:
 *         description: Usuario no encontrado
 *       403:
 *         description: Sin permisos de administrador
 */
router.put("/:id", authenticateToken, requireRole(["admin"]), validate(updateUserSchema), userController.updateUser)

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Eliminar usuario (Solo Admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Usuario eliminado correctamente
 *       400:
 *         description: No se puede eliminar a sí mismo
 *       404:
 *         description: Usuario no encontrado
 *       403:
 *         description: Sin permisos de administrador
 */
router.delete("/:id", authenticateToken, requireRole(["admin"]), userController.deleteUser)

module.exports = router
