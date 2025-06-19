const mongoose = require("mongoose")

const touristRegistrationSchema = new mongoose.Schema(
  {
    lugarDestino: {
      type: String,
      required: true,
      trim: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    descripcion: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    ubicacion: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coords) => {
            return (
              coords.length === 2 &&
              coords[1] >= -90 &&
              coords[1] <= 90 && // lat
              coords[0] >= -180 &&
              coords[0] <= 180
            ) // lng
          },
          message: "Las coordenadas deben ser [lng, lat] válidas",
        },
      },
    },
    images: [
      {
        type: String,
      },
    ],
    categoria: {
      type: String,
      required: true,
      enum: ["restaurante", "hotel", "atraccion", "transporte", "servicio", "otro"],
    },
    calificacion: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    createdBy: {
      type: Number,
      required: true,
      // Remover index: true para evitar duplicados
    },
  },
  {
    timestamps: true,
    collection: "tourist_registrations",
  },
)

// Índice geoespacial
touristRegistrationSchema.index({ ubicacion: "2dsphere" })
touristRegistrationSchema.index({ categoria: 1 })
touristRegistrationSchema.index({ calificacion: -1 })
touristRegistrationSchema.index({ nombre: "text", descripcion: "text" })
touristRegistrationSchema.index({ createdBy: 1 })

module.exports = mongoose.model("TouristRegistration", touristRegistrationSchema)
