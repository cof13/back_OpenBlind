const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const compression = require("compression")
const rateLimit = require("express-rate-limit")
require("dotenv").config()

// Importar configuraciones
const { connectMySQL } = require("./src/config/database.sql")
const { connectMongoDB } = require("./src/config/database.orm")
const swaggerSetup = require("./src/config/swagger")

// Importar middleware
const logger = require("./src/middleware/logger")
const errorHandler = require("./src/middleware/errorHandler")

// Importar rutas
const authRoutes = require("./src/routes/auth")
const userRoutes = require("./src/routes/users")
const routeRoutes = require("./src/routes/routes")
const messageRoutes = require("./src/routes/messages")
const touristRoutes = require("./src/routes/tourist")
const dashboardRoutes = require("./src/routes/dashboard")

const app = express()
const PORT = process.env.PORT || 3000

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana de tiempo
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.",
    },
  },
})

// Middleware de seguridad
app.use(helmet())
app.use(limiter)
app.use(
  cors({
    origin: ["http://localhost:4200", "http://localhost:3000"],
    credentials: true,
  }),
)
app.use(compression())
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Middleware de logging
app.use(logger)

// Swagger Documentation
swaggerSetup(app)

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "OK",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    },
    message: "Servidor funcionando correctamente",
  })
})

// Rutas de la API
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/routes", routeRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/tourist", touristRoutes)
app.use("/api/dashboard", dashboardRoutes)

// Middleware de manejo de errores
app.use(errorHandler)

// Ruta 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "Ruta no encontrada",
    },
  })
})

// Inicializar servidor
async function startServer() {
  try {
    // Conectar a las bases de datos
    await connectMySQL()
    await connectMongoDB()

    app.listen(PORT, () => {
      console.log(`🚀 Servidor OpenBlind ejecutándose en puerto ${PORT}`)
      console.log(`📚 Documentación disponible en http://localhost:${PORT}/api-docs`)
      console.log(`🏥 Health check en http://localhost:${PORT}/api/health`)
    })
  } catch (error) {
    console.error("❌ Error al iniciar el servidor:", error)
    process.exit(1)
  }
}

startServer()

// Manejo de errores no capturados
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err)
  process.exit(1)
})

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err)
  process.exit(1)
})
