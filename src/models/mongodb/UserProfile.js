const mongoose = require("mongoose")

const userProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      unique: true,
      // Remover index: true ya que usamos unique: true
    },
    nombres: {
      type: String,
      required: true,
      trim: true,
    },
    apellidos: {
      type: String,
      required: true,
      trim: true,
    },
    telefono: {
      type: String,
      trim: true,
    },
    fechaNacimiento: {
      type: Date,
    },
    profileImage: {
      type: String,
      default: null,
    },
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
    },
  },
  {
    timestamps: true,
    collection: "user_profiles",
  },
)

// Solo mantener los índices necesarios sin duplicados
userProfileSchema.index({ nombres: "text", apellidos: "text" })

module.exports = mongoose.model("UserProfile", userProfileSchema)
