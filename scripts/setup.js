const mysql = require("mysql2/promise")
require("dotenv").config()

async function setupDatabase() {
  let connection = null

  try {
    console.log("🔧 Configurando base de datos MySQL...")

    // Conectar a MySQL sin especificar base de datos
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || "localhost",
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "openblind",
    })

    console.log("✅ Conectado a MySQL")

    // Crear base de datos
    const dbName = process.env.MYSQL_DATABASE || "openblind"
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``)
    console.log(`✅ Base de datos '${dbName}' creada/verificada`)

    // Usar la base de datos
    await connection.end()
connection = await mysql.createConnection({ /* ... */ database: dbName })


    // Crear tablas
    console.log("🔧 Creando tablas...")

    // Tabla de usuarios
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_active (active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log("✅ Tabla 'users' creada")

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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_active (active),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log("✅ Tabla 'routes' creada")

    // Tabla de sesiones
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token VARCHAR(500) NOT NULL,
        refresh_token VARCHAR(500),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_token (token(255)),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log("✅ Tabla 'user_sessions' creada")

    // Crear usuario administrador por defecto si no existe
    const adminEmail = "admin@openblind.com"
    const [existingAdmin] = await connection.execute("SELECT id FROM users WHERE email = ?", [adminEmail])

    if (existingAdmin.length === 0) {
      const bcrypt = require("bcryptjs")
      const hashedPassword = bcrypt.hashSync("admin123", 12)

      await connection.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [
        adminEmail,
        hashedPassword,
        "admin",
      ])
      console.log("✅ Usuario administrador creado:")
      console.log("   Email: admin@openblind.com")
      console.log("   Password: admin123")
      console.log("   ⚠️  CAMBIAR LA CONTRASEÑA EN PRODUCCIÓN")
    } else {
      console.log("ℹ️  Usuario administrador ya existe")
    }

    console.log("\n🎉 ¡Base de datos configurada exitosamente!")
    console.log("\n📋 Resumen:")
    console.log(`   - Base de datos: ${dbName}`)
    console.log("   - Tablas: users, routes, user_sessions")
    console.log("   - Usuario admin: admin@openblind.com")
    console.log("\n🚀 Puedes iniciar el servidor con: npm run dev")
  } catch (error) {
    console.error("❌ Error configurando la base de datos:", error)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupDatabase()
}

module.exports = setupDatabase
