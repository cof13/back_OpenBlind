const mongoose = require("mongoose")

const voiceGuideSchema = new mongoose.Schema(
  {
    routeId: {
      type: Number,
      required: true,
      // Remover index: true para evitar duplicados
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PersonalizedMessage",
      required: true,
    },
    audioFile: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["processing", "ready", "error"],
      default: "processing",
    },
    fechaRegistro: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      quality: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
      },
      format: {
        type: String,
        enum: ["mp3", "wav", "ogg"],
        default: "mp3",
      },
      size: {
        type: Number,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
    collection: "voice_guides",
  },
)

voiceGuideSchema.index({ routeId: 1, status: 1 })
voiceGuideSchema.index({ messageId: 1 })

module.exports = mongoose.model("VoiceGuide", voiceGuideSchema)
