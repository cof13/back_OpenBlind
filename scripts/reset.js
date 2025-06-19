const mysql = require("mysql2/promise")
const mongoose = require("mongoose")
require("dotenv").config()

async function resetDatabase() {
  let mysqlConnection = null

  try {
    console.log("🔄 Reiniciando bases de datos...")

    // Reset MySQL
    console.log("🔧 Reiniciando MySQL...")
    mysqlConnection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || "localhost",
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
    })

    const dbName = process.env.MYSQL_DATABASE || "openblind"
    await mysqlConnection.execute(`DROP DATABASE IF EXISTS \`${dbName}\``)
    console.log(`✅ Base de datos MySQL '${dbName}' eliminada`)

    // Reset MongoDB
    console.log("🔧 Reiniciando MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/openblind")
    await mongoose.connection.db.dropDatabase()
    console.log("✅ Base de datos MongoDB eliminada")
    await mongoose.disconnect()

    console.log("\n🎉 ¡Bases de datos reiniciadas exitosamente!")
    console.log("\n🔧 Ejecuta 'npm run setup' para configurar nuevamente")
  } catch (error) {
    console.error("❌ Error reiniciando las bases de datos:", error)
    process.exit(1)
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end()
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  resetDatabase()
}

module.exports = resetDatabase
np