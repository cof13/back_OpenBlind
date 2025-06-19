const mongoose = require("mongoose")
const encryptionService = require("../../services/encryptionService")

const userProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      unique: true,
      // Removido index: true para evitar duplicados
    },
    // Campos encriptados - se almacenan encriptados en la DB
    nombres: {
      type: String,
      required: true,
      set: function(value) {
        if (!value) return value
        try {
          const sanitized = value.toString().trim()
          // Solo encriptar si no está ya encriptado
          if (encryptionService.isEncrypted && encryptionService.isEncrypted(sanitized)) {
            return sanitized
          }
          return encryptionService.encrypt(sanitized)
        } catch (error) {
          console.warn("Error encriptando nombres:", error.message)
          return value.toString().trim()
        }
      },
      get: function(value) {
        if (!value) return value
        try {
          return encryptionService.decrypt(value)
        } catch (error) {
          console.warn("Error desencriptando nombres:", error.message)
          return value
        }
      }
    },
    apellidos: {
      type: String,
      required: true,
      set: function(value) {
        if (!value) return value
        try {
          const sanitized = value.toString().trim()
          if (encryptionService.isEncrypted && encryptionService.isEncrypted(sanitized)) {
            return sanitized
          }
          return encryptionService.encrypt(sanitized)
        } catch (error) {
          console.warn("Error encriptando apellidos:", error.message)
          return value.toString().trim()
        }
      },
      get: function(value) {
        if (!value) return value
        try {
          return encryptionService.decrypt(value)
        } catch (error) {
          console.warn("Error desencriptando apellidos:", error.message)
          return value
        }
      }
    },
    telefono: {
      type: String,
      set: function(value) {
        if (!value) return value
        try {
          const sanitized = value.toString().trim()
          if (encryptionService.isEncrypted && encryptionService.isEncrypted(sanitized)) {
            return sanitized
          }
          return encryptionService.encrypt(sanitized)
        } catch (error) {
          console.warn("Error encriptando teléfono:", error.message)
          return value.toString().trim()
        }
      },
      get: function(value) {
        if (!value) return value
        try {
          return encryptionService.decrypt(value)
        } catch (error) {
          console.warn("Error desencriptando teléfono:", error.message)
          return value
        }
      }
    },
    fechaNacimiento: {
      type: Date,
    },
    profileImage: {
      type: String,
      default: null,
      set: function(value) {
        if (!value) return value
        try {
          const sanitized = value.toString()
          if (encryptionService.isEncrypted && encryptionService.isEncrypted(sanitized)) {
            return sanitized
          }
          return encryptionService.encrypt(sanitized)
        } catch (error) {
          console.warn("Error encriptando profileImage:", error.message)
          return value.toString()
        }
      },
      get: function(value) {
        if (!value) return value
        try {
          return encryptionService.decrypt(value)
        } catch (error) {
          console.warn("Error desencriptando profileImage:", error.message)
          return value
        }
      }
    },
    // Campos no encriptados (configuraciones del sistema)
    preferences: {
      language: {
        type: String,
        default: "es",
        enum: ["es", "en"],
      },
      voiceSpeed: {
        type: Number,
        default: 1.0,
        min: 0.5,
        max: 2.0,
      },
      notifications: {
        type: Boolean,
        default: true,
      },
      theme: {
        type: String,
        default: "light",
        enum: ["light", "dark", "high-contrast"],
      }
    },
    // Metadatos de seguridad (no encriptados)
    lastProfileUpdate: {
      type: Date,
      default: Date.now
    },
    encryptionVersion: {
      type: String,
      default: "v1"
    }
  },
  {
    timestamps: true,
    collection: "user_profiles",
    // Importante: activar getters para que se ejecuten al obtener datos
    toJSON: { getters: true },
    toObject: { getters: true }
  },
)

// Índices únicos (sin duplicados)
userProfileSchema.index({ userId: 1 }, { unique: true })
userProfileSchema.index({ createdAt: -1 })
userProfileSchema.index({ lastProfileUpdate: -1 })
userProfileSchema.index({ encryptionVersion: 1 })

// Método estático para crear perfil con encriptación
userProfileSchema.statics.createEncrypted = async function(profileData) {
  try {
    const profile = new this(profileData)
    return await profile.save()
  } catch (error) {
    console.error("Error creando perfil encriptado:", error)
    throw error
  }
}

// Método estático para buscar por userId (común)
userProfileSchema.statics.findByUserId = async function(userId) {
  try {
    return await this.findOne({ userId })
  } catch (error) {
    console.error("Error buscando perfil por userId:", error)
    throw error
  }
}

// Método para actualizar perfil de forma segura
userProfileSchema.methods.updateSafely = async function(updateData) {
  try {
    // Filtrar campos permitidos para actualizar
    const allowedFields = ['nombres', 'apellidos', 'telefono', 'fechaNacimiento', 'profileImage', 'preferences']
    const filteredData = {}
    
    allowedFields.forEach(field => {
      if (updateData.hasOwnProperty(field)) {
        filteredData[field] = updateData[field]
      }
    })
    
    // Actualizar timestamp y versión
    filteredData.lastProfileUpdate = new Date()
    filteredData.encryptionVersion = 'v1'
    
    // Aplicar actualizaciones
    Object.assign(this, filteredData)
    
    return await this.save()
  } catch (error) {
    console.error("Error actualizando perfil:", error)
    throw error
  }
}

// Método para obtener datos desencriptados explícitamente
userProfileSchema.methods.getDecryptedData = function() {
  try {
    const obj = this.toObject()
    
    return {
      userId: obj.userId,
      nombres: obj.nombres,
      apellidos: obj.apellidos,
      telefono: obj.telefono,
      fechaNacimiento: obj.fechaNacimiento,
      profileImage: obj.profileImage,
      preferences: obj.preferences,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
      lastProfileUpdate: obj.lastProfileUpdate,
      encryptionVersion: obj.encryptionVersion
    }
  } catch (error) {
    console.error("Error obteniendo datos desencriptados:", error)
    return this.toObject()
  }
}

// Método estático para migrar datos existentes (mejorado)
userProfileSchema.statics.migrateEncryption = async function() {
  try {
    console.log("🔄 Iniciando migración de encriptación de perfiles...")
    
    // Obtener perfiles sin encriptar (lean para acceso directo a datos)
    const profiles = await this.find({
      $or: [
        { encryptionVersion: { $exists: false } },
        { encryptionVersion: { $ne: 'v1' } }
      ]
    }).lean()
    
    let migratedCount = 0
    let errorCount = 0
    
    console.log(`📊 Perfiles a migrar: ${profiles.length}`)
    
    for (const profile of profiles) {
      try {
        const updates = {}
        let needsUpdate = false
        
        // Verificar y encriptar campos si no están encriptados
        if (profile.nombres && !encryptionService.isEncrypted(profile.nombres)) {
          updates.nombres = encryptionService.encrypt(profile.nombres)
          needsUpdate = true
          console.log(`🔐 Encriptando nombres para usuario ${profile.userId}`)
        }
        
        if (profile.apellidos && !encryptionService.isEncrypted(profile.apellidos)) {
          updates.apellidos = encryptionService.encrypt(profile.apellidos)
          needsUpdate = true
          console.log(`🔐 Encriptando apellidos para usuario ${profile.userId}`)
        }
        
        if (profile.telefono && !encryptionService.isEncrypted(profile.telefono)) {
          updates.telefono = encryptionService.encrypt(profile.telefono)
          needsUpdate = true
          console.log(`🔐 Encriptando teléfono para usuario ${profile.userId}`)
        }
        
        if (profile.profileImage && !encryptionService.isEncrypted(profile.profileImage)) {
          updates.profileImage = encryptionService.encrypt(profile.profileImage)
          needsUpdate = true
          console.log(`🔐 Encriptando imagen para usuario ${profile.userId}`)
        }
        
        if (needsUpdate) {
          updates.encryptionVersion = 'v1'
          updates.lastProfileUpdate = new Date()
          
          await this.updateOne({ _id: profile._id }, { $set: updates })
          migratedCount++
          console.log(`✅ Perfil migrado para usuario ${profile.userId}`)
        } else {
          // Solo actualizar versión si no está marcado
          await this.updateOne(
            { _id: profile._id }, 
            { $set: { encryptionVersion: 'v1', lastProfileUpdate: new Date() } }
          )
          console.log(`✅ Versión actualizada para usuario ${profile.userId}`)
        }
        
      } catch (error) {
        console.error(`❌ Error migrando perfil ${profile._id}:`, error.message)
        errorCount++
      }
    }
    
    console.log(`✅ Migración completada: ${migratedCount} migrados, ${errorCount} errores`)
    return { migrated: migratedCount, errors: errorCount }
    
  } catch (error) {
    console.error("❌ Error en migración de perfiles:", error)
    throw error
  }
}

// Método estático para verificar integridad de encriptación (mejorado)
userProfileSchema.statics.verifyEncryption = async function() {
  try {
    console.log("🔍 Verificando integridad de encriptación...")
    
    const profiles = await this.find({}).limit(10)
    let validCount = 0
    let invalidCount = 0
    let detailsCount = {
      encrypted: 0,
      unencrypted: 0,
      mixed: 0
    }
    
    for (const profile of profiles) {
      try {
        // Obtener datos raw para verificar encriptación
        const rawProfile = await this.findById(profile._id).lean()
        
        // Verificar estado de encriptación de cada campo
        const encryptionStatus = {
          nombres: encryptionService.isEncrypted(rawProfile.nombres || ''),
          apellidos: encryptionService.isEncrypted(rawProfile.apellidos || ''),
          telefono: rawProfile.telefono ? encryptionService.isEncrypted(rawProfile.telefono) : true,
          profileImage: rawProfile.profileImage ? encryptionService.isEncrypted(rawProfile.profileImage) : true
        }
        
        // Intentar acceder a los campos encriptados (esto ejecuta los getters)
        const nombres = profile.nombres
        const apellidos = profile.apellidos
        const telefono = profile.telefono
        
        // Verificar que los datos tienen sentido
        if (nombres && apellidos) {
          validCount++
          
          // Determinar tipo de encriptación
          const allEncrypted = Object.values(encryptionStatus).every(status => status === true)
          const noneEncrypted = Object.values(encryptionStatus).every(status => status === false)
          
          if (allEncrypted) {
            detailsCount.encrypted++
            console.log(`✅ Perfil ${profile.userId}: ${nombres} ${apellidos} (totalmente encriptado)`)
          } else if (noneEncrypted) {
            detailsCount.unencrypted++
            console.log(`⚠️ Perfil ${profile.userId}: ${nombres} ${apellidos} (sin encriptar)`)
          } else {
            detailsCount.mixed++
            console.log(`🔄 Perfil ${profile.userId}: ${nombres} ${apellidos} (parcialmente encriptado)`)
          }
        } else {
          invalidCount++
          console.log(`❌ Perfil ${profile.userId}: Datos incompletos o corruptos`)
        }
        
      } catch (error) {
        invalidCount++
        console.log(`❌ Perfil ${profile.userId}: Error de encriptación - ${error.message}`)
      }
    }
    
    console.log(`📊 Resultado: ${validCount} válidos, ${invalidCount} con problemas`)
    console.log(`🔐 Detalles: ${detailsCount.encrypted} encriptados, ${detailsCount.unencrypted} sin encriptar, ${detailsCount.mixed} mixtos`)
    
    return { 
      valid: validCount, 
      invalid: invalidCount,
      details: detailsCount
    }
    
  } catch (error) {
    console.error("❌ Error verificando encriptación:", error)
    throw error
  }
}

// Método estático para búsqueda segura (para futuras implementaciones)
userProfileSchema.statics.searchByName = async function(searchTerm) {
  try {
    console.warn("⚠️ Búsqueda en campos encriptados - uso limitado para datasets grandes")
    
    const profiles = await this.find({})
    const results = []
    
    for (const profile of profiles) {
      try {
        const fullName = `${profile.nombres} ${profile.apellidos}`.toLowerCase()
        if (fullName.includes(searchTerm.toLowerCase())) {
          results.push(profile)
        }
      } catch (error) {
        // Ignorar perfiles con errores de desencriptación
      }
    }
    
    return results
  } catch (error) {
    console.error("Error en búsqueda de perfiles:", error)
    return []
  }
}

// Método estático para estadísticas de encriptación
userProfileSchema.statics.getEncryptionStats = async function() {
  try {
    const total = await this.countDocuments()
    const encrypted = await this.countDocuments({ encryptionVersion: 'v1' })
    const unencrypted = total - encrypted
    
    return {
      total,
      encrypted,
      unencrypted,
      coverage: total > 0 ? Math.round((encrypted / total) * 100) : 0
    }
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error)
    return { total: 0, encrypted: 0, unencrypted: 0, coverage: 0 }
  }
}

module.exports = mongoose.model("UserProfile", userProfileSchema)