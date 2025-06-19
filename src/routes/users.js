const express = require("express")
const userController = require("../controllers/userController")
const { authenticateToken, requireRole } = require("../middleware/auth")
const { validate, schemas } = require("../middleware/validation")

const router = express.Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     EncryptedUserProfile:
 *       type: object
 *       description: Perfil de usuario con datos sensibles encriptados en la base de datos
 *       properties:
 *         nombres:
 *           type: string
 *           example: "Juan"
 *           description: "Nombre encriptado en DB, desencriptado en respuesta"
 *         apellidos:
 *           type: string
 *           example: "Pérez"
 *           description: "Apellidos encriptados en DB, desencriptados en respuesta"
 *         telefono:
 *           type: string
 *           example: "+1234567890"
 *           description: "Teléfono encriptado en DB, desencriptado en respuesta"
 *         fechaNacimiento:
 *           type: string
 *           format: date
 *           example: "1990-01-01"
 *           description: "Fecha de nacimiento (no encriptada)"
 *         profileImage:
 *           type: string
 *           format: uri
 *           example: "https://ejemplo.com/imagen.jpg"
 *           description: "URL de imagen encriptada en DB, desencriptada en respuesta"
 *         preferences:
 *           type: object
 *           description: "Preferencias del usuario (no encriptadas)"
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
 *             theme:
 *               type: string
 *               enum: [light, dark, high-contrast]
 *               example: "light"
 *         lastProfileUpdate:
 *           type: string
 *           format: date-time
 *           description: "Última actualización del perfil"
 *         encryptionVersion:
 *           type: string
 *           example: "v1"
 *           description: "Versión de encriptación utilizada"
 *
 *     EncryptionStatus:
 *       type: object
 *       properties:
 *         migrated:
 *           type: integer
 *           description: "Número de perfiles migrados"
 *           example: 25
 *         errors:
 *           type: integer
 *           description: "Número de errores durante la migración"
 *           example: 0
 *         valid:
 *           type: integer
 *           description: "Número de perfiles con encriptación válida"
 *           example: 100
 *         invalid:
 *           type: integer
 *           description: "Número de perfiles con problemas de encriptación"
 *           example: 2
 */

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Obtener perfil del usuario (datos desencriptados automáticamente)
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
 *                           $ref: '#/components/schemas/EncryptedUserProfile'
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
 *     summary: Actualizar perfil del usuario (datos se encriptan automáticamente)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombres:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Juan Carlos"
 *                 description: "Se encriptará automáticamente"
 *               apellidos:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: "Pérez González"
 *                 description: "Se encriptará automáticamente"
 *               telefono:
 *                 type: string
 *                 pattern: "^[0-9+\\-\\s()]+$"
 *                 example: "+51 987 654 321"
 *                 description: "Se encriptará automáticamente"
 *               fechaNacimiento:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-15"
 *               profileImage:
 *                 type: string
 *                 format: uri
 *                 example: "https://ejemplo.com/mi-foto.jpg"
 *                 description: "URL se encriptará automáticamente"
 *               preferences:
 *                 type: object
 *                 properties:
 *                   language:
 *                     type: string
 *                     enum: [es, en]
 *                   voiceSpeed:
 *                     type: number
 *                     minimum: 0.5
 *                     maximum: 2.0
 *                   notifications:
 *                     type: boolean
 *                   theme:
 *                     type: string
 *                     enum: [light, dark, high-contrast]
 *           examples:
 *             perfil_completo:
 *               summary: Perfil completo
 *               value:
 *                 nombres: "Ana María"
 *                 apellidos: "García López"
 *                 telefono: "+51 987 123 456"
 *                 fechaNacimiento: "1995-03-22"
 *                 profileImage: "https://ejemplo.com/ana-foto.jpg"
 *                 preferences:
 *                   language: "es"
 *                   voiceSpeed: 1.2
 *                   notifications: true
 *                   theme: "high-contrast"
 *     responses:
 *       200:
 *         description: Perfil actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/EncryptedUserProfile'
 *                 message:
 *                   type: string
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autenticado
 */
router.put("/profile", authenticateToken, validate(schemas.updateProfile), userController.updateProfile)

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
router.put("/change-password", authenticateToken, validate(schemas.changePassword), userController.changePassword)

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Obtener lista de usuarios (Solo Admin) - Datos desencriptados
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
 *         description: Buscar por email, nombre o apellidos (busca en datos desencriptados)
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/User'
 *                       - type: object
 *                         properties:
 *                           profile:
 *                             $ref: '#/components/schemas/EncryptedUserProfile'
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
 * /users/search:
 *   get:
 *     summary: Búsqueda avanzada de usuarios (Solo Admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Término de búsqueda (nombre, apellidos, email)
 *         example: "Juan"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Resultados de búsqueda obtenidos
 *       400:
 *         description: Consulta muy corta
 *       403:
 *         description: Sin permisos de administrador
 */
router.get("/search", authenticateToken, requireRole(["admin"]), userController.searchUsers)

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Obtener usuario por ID (Solo Admin) - Datos desencriptados
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
router.put("/:id", authenticateToken, requireRole(["admin"]), validate(schemas.updateUser), userController.updateUser)

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

/**
 * @swagger
 * /users/migrate-encryption:
 *   post:
 *     summary: Migrar datos existentes a formato encriptado (Solo Admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Migra todos los perfiles de usuario existentes para que los datos sensibles
 *       (nombres, apellidos, teléfono, etc.) estén encriptados en la base de datos.
 *       
 *       **IMPORTANTE**: Este endpoint debe ejecutarse solo una vez después de implementar
 *       la encriptación en un sistema existente.
 *     responses:
 *       200:
 *         description: Migración completada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/EncryptionStatus'
 *                 message:
 *                   type: string
 *                   example: "Migración de encriptación completada"
 *       403:
 *         description: Sin permisos de administrador
 *       500:
 *         description: Error durante la migración
 */
router.post("/migrate-encryption", authenticateToken, requireRole(["admin"]), userController.migrateEncryption)

/**
 * @swagger
 * /users/verify-encryption:
 *   get:
 *     summary: Verificar integridad de la encriptación (Solo Admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Verifica que los datos encriptados en la base de datos puedan ser
 *       desencriptados correctamente y que tengan sentido.
 *     responses:
 *       200:
 *         description: Verificación completada
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
 *                     valid:
 *                       type: integer
 *                       description: "Perfiles con encriptación válida"
 *                       example: 95
 *                     invalid:
 *                       type: integer
 *                       description: "Perfiles con problemas"
 *                       example: 2
 *                 message:
 *                   type: string
 *       403:
 *         description: Sin permisos de administrador
 */
router.get("/verify-encryption", authenticateToken, requireRole(["admin"]), userController.verifyEncryption)

module.exports = router