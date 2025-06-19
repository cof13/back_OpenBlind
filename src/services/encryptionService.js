const crypto = require("crypto")
const config = require("../config/environment")

class EncryptionService {
  constructor() {
    this.algorithm = config.ENCRYPTION.ALGORITHM
    this.secretKey = crypto.scryptSync(config.ENCRYPTION.KEY, "salt", 32)
  }

  encrypt(text) {
    try {
      if (!text) return text

      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipherGCM(this.algorithm, this.secretKey, iv)

      let encrypted = cipher.update(text, "utf8", "hex")
      encrypted += cipher.final("hex")

      const authTag = cipher.getAuthTag()

      // Combinar IV, authTag y texto encriptado
      return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted
    } catch (error) {
      console.error("Error encriptando:", error)
      throw new Error("Error en encriptación")
    }
  }

  decrypt(encryptedText) {
    try {
      if (!encryptedText || !encryptedText.includes(":")) return encryptedText

      const parts = encryptedText.split(":")
      if (parts.length !== 3) return encryptedText

      const [ivHex, authTagHex, encrypted] = parts
      const iv = Buffer.from(ivHex, "hex")
      const authTag = Buffer.from(authTagHex, "hex")

      const decipher = crypto.createDecipherGCM(this.algorithm, this.secretKey, iv)
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(encrypted, "hex", "utf8")
      decrypted += decipher.final("utf8")

      return decrypted
    } catch (error) {
      console.error("Error desencriptando:", error)
      return encryptedText // Retornar texto original si falla
    }
  }

  // Método alternativo usando AES-256-CBC (más compatible)
  encryptCBC(text) {
    try {
      if (!text) return text

      const iv = crypto.randomBytes(16)
      const cipher = crypto.createCipher("aes-256-cbc", this.secretKey)

      let encrypted = cipher.update(text, "utf8", "hex")
      encrypted += cipher.final("hex")

      return iv.toString("hex") + ":" + encrypted
    } catch (error) {
      console.error("Error encriptando CBC:", error)
      throw new Error("Error en encriptación")
    }
  }

  decryptCBC(encryptedText) {
    try {
      if (!encryptedText || !encryptedText.includes(":")) return encryptedText

      const [ivHex, encrypted] = encryptedText.split(":")
      const iv = Buffer.from(ivHex, "hex")

      const decipher = crypto.createDecipher("aes-256-cbc", this.secretKey)

      let decrypted = decipher.update(encrypted, "hex", "utf8")
      decrypted += decipher.final("utf8")

      return decrypted
    } catch (error) {
      console.error("Error desencriptando CBC:", error)
      return encryptedText
    }
  }

  hashPassword(password) {
    const bcrypt = require("bcryptjs")
    return bcrypt.hashSync(password, 12)
  }

  comparePassword(password, hashedPassword) {
    const bcrypt = require("bcryptjs")
    return bcrypt.compareSync(password, hashedPassword)
  }

  // Método para generar hash SHA-256 (para tokens, etc.)
  generateHash(data) {
    return crypto.createHash("sha256").update(data).digest("hex")
  }

  // Método para generar claves aleatorias
  generateRandomKey(length = 32) {
    return crypto.randomBytes(length).toString("hex")
  }
}

module.exports = new EncryptionService()
