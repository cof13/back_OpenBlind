const { getConnection } = require("../../config/database.sql")
const encryptionService = require("../../services/encryptionService")

class User {
  static async create(userData) {
    const connection = getConnection()
    const { email, password, role = "user" } = userData

    try {
      const hashedPassword = encryptionService.hashPassword(password)
      
      // Intentar encriptar el email, si falla usar el email original
      let emailToStore = email
      try {
        emailToStore = encryptionService.encrypt(email)
        if (!emailToStore || emailToStore === email) {
          console.warn("⚠️ Encriptación de email falló, usando email sin encriptar")
          emailToStore = email
        }
      } catch (encryptError) {
        console.warn("⚠️ Error encriptando email, usando email sin encriptar:", encryptError.message)
        emailToStore = email
      }

      const [result] = await connection.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [
        emailToStore,
        hashedPassword,
        role,
      ])

      return result.insertId
    } catch (error) {
      console.error("Error creando usuario:", error)
      throw error
    }
  }

  static async findByEmail(email) {
    const connection = getConnection()
    
    try {
      // Estrategia 1: Buscar por email encriptado
      let emailToSearch = email
      try {
        emailToSearch = encryptionService.encrypt(email)
      } catch (encryptError) {
        console.warn("⚠️ Error encriptando email para búsqueda:", encryptError.message)
        emailToSearch = email
      }

      let [rows] = await connection.execute("SELECT * FROM users WHERE email = ? AND active = true", [emailToSearch])

      // Estrategia 2: Si no encuentra, buscar por email sin encriptar
      if (rows.length === 0) {
        [rows] = await connection.execute("SELECT * FROM users WHERE email = ? AND active = true", [email])
      }

      // Estrategia 3: Si aún no encuentra, buscar en todos los usuarios y comparar
      if (rows.length === 0) {
        const [allUsers] = await connection.execute("SELECT * FROM users WHERE active = true")
        
        for (const user of allUsers) {
          try {
            const decryptedEmail = encryptionService.decrypt(user.email)
            if (decryptedEmail === email) {
              rows = [user]
              break
            }
          } catch (decryptError) {
            // Si no se puede desencriptar, comparar directamente
            if (user.email === email) {
              rows = [user]
              break
            }
          }
        }
      }

      if (rows.length > 0) {
        const user = rows[0]
        
        // Intentar desencriptar el email para devolverlo limpio
        try {
          const decryptedEmail = encryptionService.decrypt(user.email)
          user.email = decryptedEmail
        } catch (decryptError) {
          console.warn("⚠️ Error desencriptando email en findByEmail:", decryptError.message)
          // Si no se puede desencriptar, asumir que ya está en texto plano
        }
        
        return user
      }

      return null
    } catch (error) {
      console.error("Error buscando usuario por email:", error)
      throw error
    }
  }

  static async findById(id) {
    const connection = getConnection()

    try {
      const [rows] = await connection.execute("SELECT * FROM users WHERE id = ? AND active = true", [id])

      if (rows.length > 0) {
        const user = rows[0]
        
        try {
          const decryptedEmail = encryptionService.decrypt(user.email)
          user.email = decryptedEmail
        } catch (decryptError) {
          console.warn("⚠️ Error desencriptando email en findById:", decryptError.message)
          // Mantener el email como está si no se puede desencriptar
        }
        
        return user
      }

      return null
    } catch (error) {
      console.error("Error buscando usuario por ID:", error)
      throw error
    }
  }

  static async findAll(page = 1, limit = 10) {
    const connection = getConnection()
    const offset = (page - 1) * limit

    try {
      const [rows] = await connection.execute(
        "SELECT id, email, role, active, created_at FROM users WHERE active = true LIMIT ? OFFSET ?",
        [limit, offset],
      )

      const [countResult] = await connection.execute("SELECT COUNT(*) as total FROM users WHERE active = true")

      const users = rows.map((user) => {
        try {
          return {
            ...user,
            email: encryptionService.decrypt(user.email),
          }
        } catch (decryptError) {
          console.warn("⚠️ Error desencriptando email en findAll:", decryptError.message)
          return user // Mantener el usuario como está si no se puede desencriptar
        }
      })

      return {
        users,
        total: countResult[0].total,
      }
    } catch (error) {
      console.error("Error obteniendo todos los usuarios:", error)
      throw error
    }
  }

  static async update(id, userData) {
    const connection = getConnection()
    const updates = []
    const values = []

    try {
      if (userData.email) {
        updates.push("email = ?")
        
        try {
          const encryptedEmail = encryptionService.encrypt(userData.email)
          values.push(encryptedEmail)
        } catch (encryptError) {
          console.warn("⚠️ Error encriptando email en update:", encryptError.message)
          values.push(userData.email)
        }
      }

      if (userData.password) {
        updates.push("password = ?")
        values.push(encryptionService.hashPassword(userData.password))
      }

      if (userData.role) {
        updates.push("role = ?")
        values.push(userData.role)
      }

      if (typeof userData.active === "boolean") {
        updates.push("active = ?")
        values.push(userData.active)
      }

      if (updates.length === 0) {
        return true // No hay nada que actualizar
      }

      values.push(id)

      const [result] = await connection.execute(
        `UPDATE users SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
      )

      return result.affectedRows > 0
    } catch (error) {
      console.error("Error actualizando usuario:", error)
      throw error
    }
  }

  static async delete(id) {
    const connection = getConnection()

    try {
      const [result] = await connection.execute("UPDATE users SET active = false WHERE id = ?", [id])

      return result.affectedRows > 0
    } catch (error) {
      console.error("Error eliminando usuario:", error)
      throw error
    }
  }

  // Método para verificar la integridad de la encriptación
  static async checkEncryptionIntegrity() {
    const connection = getConnection()
    
    try {
      console.log("🔍 Verificando integridad de encriptación de usuarios...")
      
      const [users] = await connection.execute("SELECT id, email FROM users LIMIT 10")
      
      for (const user of users) {
        try {
          const decrypted = encryptionService.decrypt(user.email)
          const reEncrypted = encryptionService.encrypt(decrypted)
          
          console.log(`✅ Usuario ${user.id}: Email OK`)
        } catch (error) {
          console.log(`⚠️ Usuario ${user.id}: Posible email sin encriptar`)
        }
      }
      
      console.log("✅ Verificación completada")
    } catch (error) {
      console.error("❌ Error verificando integridad:", error)
    }
  }

  // Método para migrar emails sin encriptar a encriptados
  static async migrateEmailEncryption() {
    const connection = getConnection()
    
    try {
      console.log("🔄 Iniciando migración de encriptación de emails...")
      
      const [users] = await connection.execute("SELECT id, email FROM users")
      let migratedCount = 0
      
      for (const user of users) {
        try {
          // Verificar si ya está encriptado
          if (encryptionService.isEncrypted(user.email)) {
            continue // Ya está encriptado
          }
          
          // Intentar encriptar
          const encrypted = encryptionService.encrypt(user.email)
          
          if (encrypted && encrypted !== user.email) {
            await connection.execute("UPDATE users SET email = ? WHERE id = ?", [encrypted, user.id])
            console.log(`✅ Encriptado email para usuario ID: ${user.id}`)
            migratedCount++
          }
          
        } catch (error) {
          console.warn(`⚠️ Error procesando usuario ID ${user.id}:`, error.message)
        }
      }
      
      console.log(`✅ Migración completada. ${migratedCount} usuarios migrados.`)
      return migratedCount
    } catch (error) {
      console.error("❌ Error en migración de encriptación:", error)
      throw error
    }
  }

  // Método para reparar emails corruptos
  static async repairCorruptedEmails() {
    const connection = getConnection()
    
    try {
      console.log("🔧 Reparando emails corruptos...")
      
      const [users] = await connection.execute("SELECT id, email FROM users")
      let repairedCount = 0
      
      for (const user of users) {
        try {
          // Intentar desencriptar
          const decrypted = encryptionService.decrypt(user.email)
          
          // Si la desencriptación produce algo que no parece un email válido
          if (!decrypted.includes('@') || decrypted.length < 5) {
            console.log(`⚠️ Email corrupto detectado para usuario ${user.id}: ${decrypted}`)
            // Este usuario necesitará que se le asigne un nuevo email manualmente
          }
          
        } catch (error) {
          console.log(`⚠️ Usuario ${user.id}: Email no se puede desencriptar`)
          repairedCount++
        }
      }
      
      console.log(`✅ Reparación completada. ${repairedCount} emails necesitan atención manual.`)
      return repairedCount
    } catch (error) {
      console.error("❌ Error reparando emails:", error)
      throw error
    }
  }
}

module.exports = User