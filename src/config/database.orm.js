const mongoose = require("mongoose")
const loggerService = require("../services/loggerService")

const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    loggerService.info("✅ Conexión a MongoDB establecida correctamente")

    // Configurar eventos de conexión
    mongoose.connection.on("error", (err) => {
      loggerService.error("❌ Error en MongoDB:", err)
    })

    mongoose.connection.on("disconnected", () => {
      loggerService.warn("⚠️ MongoDB desconectado")
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
