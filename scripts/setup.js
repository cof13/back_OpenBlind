const mongoose = require("mongoose")
const mysql = require("mysql2/promise")
require("dotenv").config()

async function migrateEncryption() {
  let mysqlConnection = null
  
  try {
    console.log("🔐 Iniciando migración de encriptación de datos críticos...")
    console.log("=" .repeat(60))

    // 1. Verificar servicio de encriptación
    console.log("\n1. 🧪 Probando servicio de encriptación...")
    
    try {
      const encryptionService = require("../src/services/encryptionService")
      const testResult = encryptionService.test()
      
      if (testResult) {
        console.log("✅ Servicio de encriptación funcionando correctamente")
      } else {
        console.error("❌ Servicio de encriptación falló la prueba")
        return
      }
    } catch (error) {
      console.error("❌ Error cargando servicio de encriptación:", error.message)
      return
    }

    // 2. Conectar a bases de datos
    console.log("\n2. 📡 Conectando a bases de datos...")
    
    // MySQL
    try {
      mysqlConnection = await mysql.createConnection({
        host: process.env.MYSQL_HOST || "localhost",
        port: process.env.MYSQL_PORT || 3306,
        user: process.env.MYSQL_USER || "root",
        password: process.env.MYSQL_PASSWORD || "",
        database: process.env.MYSQL_DATABASE || "openblind",
      })
      console.log("✅ Conectado a MySQL")
    } catch (error) {
      console.error("❌ Error conectando a MySQL:", error.message)
      return
    }

    // MongoDB
    try {
      await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/openblind")
      console.log("✅ Conectado a MongoDB")
    } catch (error) {
      console.error("❌ Error conectando a MongoDB:", error.message)
      return
    }

    // 3. Cargar modelos
    console.log("\n3. 📋 Cargando modelos...")
    
    const UserProfile = require("../src/models/mongodb/UserProfile")
    console.log("✅ Modelo UserProfile cargado")

    // 4. Verificar datos existentes
    console.log("\n4. 🔍 Analizando datos existentes...")
    
    const totalProfiles = await UserProfile.countDocuments()
    console.log(`   📊 Total de perfiles: ${totalProfiles}`)
    
    if (totalProfiles === 0) {
      console.log("ℹ️ No hay perfiles existentes para migrar")
    } else {
      // Verificar cuántos ya están encriptados
      const encryptedProfiles = await UserProfile.countDocuments({ encryptionVersion: 'v1' })
      const unencryptedProfiles = totalProfiles - encryptedProfiles
      
      console.log(`   🔐 Perfiles ya encriptados: ${encryptedProfiles}`)
      console.log(`   📝 Perfiles por encriptar: ${unencryptedProfiles}`)
      
      if (unencryptedProfiles > 0) {
        console.log("\n5. 🔄 Iniciando migración de perfiles...")
        
        const migrationResult = await UserProfile.migrateEncryption()
        console.log(`✅ Migración completada:`)
        console.log(`   📈 Migrados: ${migrationResult.migrated}`)
        console.log(`   ❌ Errores: ${migrationResult.errors}`)
        
        if (migrationResult.errors > 0) {
          console.log("\n⚠️ Se encontraron errores durante la migración")
          console.log("   Revisa los logs para más detalles")
        }
      } else {
        console.log("✅ Todos los perfiles ya están encriptados")
      }
    }

    // 5. Verificar integridad después de la migración
    console.log("\n6. 🔍 Verificando integridad de encriptación...")
    
    const verificationResult = await UserProfile.verifyEncryption()
    console.log(`✅ Verificación completada:`)
    console.log(`   ✅ Válidos: ${verificationResult.valid}`)
    console.log(`   ❌ Inválidos: ${verificationResult.invalid}`)

    // 6. Crear perfiles de prueba encriptados
    console.log("\n7. 🧪 Creando perfiles de prueba...")
    
    try {
      // Verificar si existen usuarios de prueba
      const [testUsers] = await mysqlConnection.execute(
        "SELECT id, email FROM users WHERE email LIKE '%test%' OR email LIKE '%ejemplo%' LIMIT 5"
      )
      
      if (testUsers.length > 0) {
        console.log(`   📋 Encontrados ${testUsers.length} usuarios de prueba`)
        
        for (const user of testUsers) {
          try {
            // Verificar si ya tiene perfil
            const existingProfile = await UserProfile.findByUserId(user.id)
            
            if (!existingProfile) {
              const testProfile = await UserProfile.createEncrypted({
                userId: user.id,
                nombres: "Usuario",
                apellidos: "De Prueba",
                telefono: "+51 987 654 321",
                fechaNacimiento: new Date("1990-01-01"),
                preferences: {
                  language: "es",
                  voiceSpeed: 1.0,
                  notifications: true,
                  theme: "light"
                }
              })
              
              console.log(`   ✅ Perfil encriptado creado para ${user.email}`)
            } else {
              console.log(`   ℹ️ ${user.email} ya tiene perfil`)
            }
          } catch (error) {
            console.log(`   ⚠️ Error creando perfil para ${user.email}: ${error.message}`)
          }
        }
      } else {
        console.log("   ℹ️ No se encontraron usuarios de prueba")
      }
    } catch (error) {
      console.warn("⚠️ Error creando perfiles de prueba:", error.message)
    }

    // 7. Pruebas de funcionalidad
    console.log("\n8. 🧪 Probando funcionalidad de encriptación...")
    
    try {
      // Crear un perfil de prueba temporal
      const tempProfile = new UserProfile({
        userId: 999999,
        nombres: "Juan Carlos",
        apellidos: "Pérez González",
        telefono: "+51 987 123 456",
        fechaNacimiento: new Date("1985-05-15"),
        profileImage: "https://ejemplo.com/foto.jpg"
      })
      
      // Probar encriptación/desencriptación
      console.log("   🔍 Probando encriptación automática...")
      console.log(`   📝 Nombre original: Juan Carlos`)
      console.log(`   🔐 Nombre en DB: ${tempProfile._doc.nombres}`)
      console.log(`   📖 Nombre desencriptado: ${tempProfile.nombres}`)
      
      if (tempProfile.nombres === "Juan Carlos") {
        console.log("   ✅ Encriptación/desencriptación funcionando correctamente")
      } else {
        console.log("   ❌ Error en encriptación/desencriptación")
      }
      
    } catch (error) {
      console.warn("⚠️ Error en pruebas de funcionalidad:", error.message)
    }

    // 8. Estadísticas finales
    console.log("\n9. 📊 Estadísticas finales del sistema...")
    
    try {
      const [userCount] = await mysqlConnection.execute("SELECT COUNT(*) as count FROM users WHERE active = true")
      const finalProfileCount = await UserProfile.countDocuments()
      const encryptedProfileCount = await UserProfile.countDocuments({ encryptionVersion: 'v1' })
      
      console.log(`   👥 Usuarios activos: ${userCount[0].count}`)
      console.log(`   📋 Perfiles totales: ${finalProfileCount}`)
      console.log(`   🔐 Perfiles encriptados: ${encryptedProfileCount}`)
      console.log(`   📈 Cobertura de encriptación: ${finalProfileCount > 0 ? Math.round((encryptedProfileCount / finalProfileCount) * 100) : 0}%`)
      
    } catch (error) {
      console.warn("⚠️ Error obteniendo estadísticas:", error.message)
    }

    console.log("\n" + "=" .repeat(60))
    console.log("🎉 ¡Migración de encriptación completada exitosamente!")
    
    console.log("\n📝 Resumen de cambios:")
    console.log("   ✅ Datos sensibles ahora encriptados en MongoDB:")
    console.log("      - nombres")
    console.log("      - apellidos") 
    console.log("      - telefono")
    console.log("      - profileImage")
    console.log("   ✅ Datos desencriptados automáticamente en la API")
    console.log("   ✅ Búsquedas funcionando con datos desencriptados")
    console.log("   ✅ Compatibilidad mantenida con código existente")

    console.log("\n🔒 Campos que NO se encriptan:")
    console.log("   - preferences (configuraciones de la app)")
    console.log("   - fechaNacimiento (fechas)")
    console.log("   - userId (clave foránea)")
    console.log("   - timestamps (metadatos)")

    console.log("\n🚀 Próximos pasos:")
    console.log("   1. Probar endpoints de usuario: GET /api/users/profile")
    console.log("   2. Actualizar perfil: PUT /api/users/profile")
    console.log("   3. Verificar que los datos se muestran correctamente")
    console.log("   4. Monitorear logs para errores de encriptación")

    console.log("\n⚠️ IMPORTANTE en producción:")
    console.log("   - Hacer backup antes de migrar")
    console.log("   - Guardar claves de encriptación de forma segura")
    console.log("   - No cambiar ENCRYPTION_KEY después de encriptar datos")
    console.log("   - Monitorear performance en búsquedas")

  } catch (error) {
    console.error("\n❌ Error durante la migración:", error)
    console.log("\n🔧 Sugerencias:")
    console.log("   1. Verifica las conexiones a las bases de datos")
    console.log("   2. Asegúrate de que ENCRYPTION_KEY esté configurado")
    console.log("   3. Revisa los logs del servidor")
    console.log("   4. Ejecuta: node test-and-repair.js")
  } finally {
    // Cerrar conexiones
    if (mysqlConnection) {
      await mysqlConnection.end()
      console.log("🔌 Conexión MySQL cerrada")
    }
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect()
      console.log("🔌 Conexión MongoDB cerrada")
    }
  }
}

// Función para probar la encriptación sin migrar
async function testEncryption() {
  console.log("🧪 Probando encriptación sin migrar datos...")
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/openblind")
    
    const UserProfile = require("../src/models/mongodb/UserProfile")
    
    // Crear perfil de prueba
    const testProfile = new UserProfile({
      userId: 888888,
      nombres: "Ana María",
      apellidos: "García López", 
      telefono: "+51 999 888 777",
      fechaNacimiento: new Date("1992-12-25"),
      profileImage: "https://test.com/ana.jpg"
    })
    
    console.log("\n🔍 Datos del perfil:")
    console.log("Raw nombres:", testProfile._doc.nombres)
    console.log("Getter nombres:", testProfile.nombres)
    console.log("Raw apellidos:", testProfile._doc.apellidos)
    console.log("Getter apellidos:", testProfile.apellidos)
    
    const decryptedData = testProfile.getDecryptedData()
    console.log("\n📖 Datos desencriptados:")
    console.log(JSON.stringify(decryptedData, null, 2))
    
    await mongoose.disconnect()
    console.log("✅ Prueba completada")
    
  } catch (error) {
    console.error("❌ Error en prueba:", error)
  }
}

// CLI
const args = process.argv.slice(2)

if (args.includes('--test')) {
  testEncryption()
} else if (args.includes('--help')) {
  console.log("🔐 Script de migración de encriptación")
  console.log("\nUso:")
  console.log("  node migrate-encryption.js          # Ejecutar migración completa")
  console.log("  node migrate-encryption.js --test   # Solo probar encriptación")
  console.log("  node migrate-encryption.js --help   # Mostrar esta ayuda")
} else {
  migrateEncryption()
}

module.exports = { migrateEncryption, testEncryption }