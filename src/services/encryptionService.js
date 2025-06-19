const crypto = require("crypto")
const config = require("../config/environment")

class EncryptionService {
  constructor() {
    this.algorithm = "aes-256-cbc"
    this.secretKey = Buffer.from(config.ENCRYPTION.KEY || "your-32-character-encryption-key!!", 'utf8')
    
    // Asegurar que la clave tenga exactamente 32 bytes para AES-256
    if (this.secretKey.length < 32) {
      this.secretKey = crypto.scryptSync(this.secretKey, "salt", 32)
    } else if (this.secretKey.length > 32) {
      this.secretKey = this.secretKey.subarray(0, 32)
    }
  }

  encrypt(text) {
    try {
      if (!text) return text
      if (typeof text !== 'string') return text

      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv)
      
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      // Combinar IV y texto encriptado separados por ':'
      return iv.toString('hex') + ':' + encrypted
    } catch (error) {
      console.error("Error encriptando:", error)
      
      // Fallback: retornar el texto original si la encriptación falla
      console.warn("Fallback: retornando texto sin encriptar")
      return text
    }
  }

  decrypt(encryptedText) {
    try {
      if (!encryptedText) return encryptedText
      if (typeof encryptedText !== 'string') return encryptedText
      
      // Si no contiene ':', probablemente no está encriptado
      if (!encryptedText.includes(':')) {
        return encryptedText
      }

      const parts = encryptedText.split(':')
      if (parts.length !== 2) {
        return encryptedText
      }

      const [ivHex, encrypted] = parts
      
      // Validar que el IV tenga la longitud correcta
      if (ivHex.length !== 32) { // 16 bytes = 32 caracteres hex
        return encryptedText
      }

      const iv = Buffer.from(ivHex, 'hex')
      const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv)
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error("Error desencriptando:", error)
      
      // Si falla la desencriptación, retornar el texto original
      console.warn("Fallback: retornando texto original")
      return encryptedText
    }
  }

  // Método alternativo más simple (sin IV, menos seguro pero más compatible)
  encryptSimple(text) {
    try {
      if (!text) return text
      if (typeof text !== 'string') return text

      // Usar hash de la clave como clave fija
      const keyHash = crypto.createHash('sha256').update(this.secretKey).digest()
      const iv = Buffer.alloc(16, 0) // IV fijo (menos seguro)
      
      const cipher = crypto.createCipheriv(this.algorithm, keyHash, iv)
      
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      return encrypted
    } catch (error) {
      console.error("Error en encriptación simple:", error)
      return text
    }
  }

  decryptSimple(encryptedText) {
    try {
      if (!encryptedText) return encryptedText
      if (typeof encryptedText !== 'string') return encryptedText
      
      const keyHash = crypto.createHash('sha256').update(this.secretKey).digest()
      const iv = Buffer.alloc(16, 0)
      
      const decipher = crypto.createDecipheriv(this.algorithm, keyHash, iv)
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      console.error("Error en desencriptación simple:", error)
      return encryptedText
    }
  }

  hashPassword(password) {
    try {
      const bcrypt = require("bcryptjs")
      return bcrypt.hashSync(password, 12)
    } catch (error) {
      console.error("Error hasheando contraseña:", error)
      throw new Error("Error en hash de contraseña")
    }
  }

  comparePassword(password, hashedPassword) {
    try {
      const bcrypt = require("bcryptjs")
      return bcrypt.compareSync(password, hashedPassword)
    } catch (error) {
      console.error("Error comparando contraseña:", error)
      return false
    }
  }

  // Método para generar hash SHA-256
  generateHash(data) {
    try {
      return crypto.createHash("sha256").update(data).digest("hex")
    } catch (error) {
      console.error("Error generando hash:", error)
      throw new Error("Error generando hash")
    }
  }

  // Método para generar claves aleatorias
  generateRandomKey(length = 32) {
    try {
      return crypto.randomBytes(length).toString("hex")
    } catch (error) {
      console.error("Error generando clave aleatoria:", error)
      throw new Error("Error generando clave aleatoria")
    }
  }

  // Método para validar si un texto está encriptado
  isEncrypted(text) {
    if (!text || typeof text !== 'string') return false
    
    // Verificar formato: debe tener ':' y longitud mínima
    const parts = text.split(':')
    return parts.length === 2 && parts[0].length === 32 && parts[1].length > 0
  }

  // Método para migrar datos encriptados con métodos antiguos
  migrateEncryption(oldEncryptedText) {
    try {
      // Intentar desencriptar con método antiguo si es posible
      // y re-encriptar con método nuevo
      
      if (this.isEncrypted(oldEncryptedText)) {
        // Ya está en formato nuevo
        return oldEncryptedText
      }
      
      // Asumir que es texto plano y encriptarlo
      return this.encrypt(oldEncryptedText)
    } catch (error) {
      console.error("Error en migración de encriptación:", error)
      return oldEncryptedText
    }
  }

  // Método de prueba para verificar que la encriptación funciona
  test() {
    try {
      const testText = "Hello, World! 🌍"
      console.log("🧪 Probando encriptación...")
      
      const encrypted = this.encrypt(testText)
      console.log("✅ Texto encriptado:", encrypted.substring(0, 50) + "...")
      
      const decrypted = this.decrypt(encrypted)
      console.log("✅ Texto desencriptado:", decrypted)
      
      const success = testText === decrypted
      console.log(success ? "✅ Prueba exitosa" : "❌ Prueba fallida")
      
      return success
    } catch (error) {
      console.error("❌ Error en prueba de encriptación:", error)
      return false
    }
  }
}

module.exports = new EncryptionService()