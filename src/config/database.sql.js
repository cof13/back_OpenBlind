const mysql = require("mysql2/promise")
const loggerService = require("../services/loggerService")

let connection = null

const connectMySQL = async () => {
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      charset: "utf8mb4",
    })

    // Crear tablas si no existen
    await createTables()

    loggerService.info("✅ Conexión a MySQL establecida correctamente")
    return connection
  } catch (error) {
    loggerService.error("❌ Error conectando a MySQL:", error)
    throw error
  }
}

const createTables = async () => {
  try {
    // Tabla de usuarios
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `)

    // Tabla de rutas
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS routes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        transport_name VARCHAR(255) NOT NULL,
        user_id INT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `)

    // Tabla de sesiones
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token VARCHAR(500) NOT NULL,
        refresh_token VARCHAR(500),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    loggerService.info("✅ Tablas MySQL creadas/verificadas correctamente")
  } catch (error) {
    loggerService.error("❌ Error creando tablas MySQL:", error)
    throw error
  }
}

const getConnection = () => {
  if (!connection) {
    throw new Error("Base de datos MySQL no conectada")
  }
  return connection
}

module.exports = {
  connectMySQL,
  getConnection,
}
