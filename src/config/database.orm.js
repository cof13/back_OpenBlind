const mongoose = require("mongoose")
const loggerService = require("../services/loggerService")

const connectMongoDB = async () => {
  try {
    // Remover las opciones deprecadas useNewUrlParser y useUnifiedTopology
    await mongoose.connect(process.env.MONGODB_URI)

    loggerService.info("✅ Conexión a MongoDB establecida correctamente")

    // Configurar eventos de conexión
    mongoose.connection.on("error", (err) => {
      loggerService.error("❌ Error en MongoDB:", err)
    })

    mongoose.connection.on("disconnected", () => {
      loggerService.warn("⚠️ MongoDB desconectado")
    })

    mongoose.connection.on("reconnected", () => {
      loggerService.info("🔄 MongoDB reconectado")
    })

    return mongoose.connection
  } catch (error) {
    loggerService.error("❌ Error conectando a MongoDB:", error)
    throw error
  }
}

module.exports = {
  connectMongoDB,
}