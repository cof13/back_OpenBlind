const mongoose = require("mongoose")

const personalizedMessageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "active",
    },
    routeId: {
      type: Number,
      required: true,
      // Remover index: true para evitar duplicados
    },
    coordinates: {
      lat: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },
      lng: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
    },
    audioUrl: {
      type: String,
      default: null,
    },
    createdBy: {
      type: Number,
      required: true,
      // Remover index: true para evitar duplicados
    },
  },
  {
    timestamps: true,
    collection: "personalized_messages",
  },
)

// Índices geoespaciales y compuestos
personalizedMessageSchema.index({
  "coordinates.lat": 1,
  "coordinates.lng": 1,
})

personalizedMessageSchema.index({ routeId: 1, status: 1 })
personalizedMessageSchema.index({ createdBy: 1 })

module.exports = mongoose.model("PersonalizedMessage", personalizedMessageSchema)
