const Joi = require("joi")
const { standardResponse } = require("../utils/responses")

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false })

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }))

      return res.status(400).json(standardResponse.error("VALIDATION_ERROR", "Datos de entrada inválidos", details))
    }

    next()
  }
}

// Esquemas de validación
const schemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "El email debe tener un formato válido",
      "any.required": "El email es requerido",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "La contraseña debe tener al menos 6 caracteres",
      "any.required": "La contraseña es requerida",
    }),
    nombres: Joi.string().min(2).required().messages({
      "string.min": "El nombre debe tener al menos 2 caracteres",
      "any.required": "El nombre es requerido",
    }),
    apellidos: Joi.string().min(2).required().messages({
      "string.min": "Los apellidos deben tener al menos 2 caracteres",
      "any.required": "Los apellidos son requeridos",
    }),
    telefono: Joi.string()
      .pattern(/^[0-9+\-\s()]+$/)
      .messages({
        "string.pattern.base": "El teléfono debe contener solo números y caracteres válidos",
      }),
    fechaNacimiento: Joi.date().max("now").messages({
      "date.max": "La fecha de nacimiento no puede ser futura",
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  route: Joi.object({
    name: Joi.string().min(3).max(255).required(),
    location: Joi.string().min(3).max(255).required(),
    transport_name: Joi.string().min(3).max(255).required(),
  }),

  message: Joi.object({
    message: Joi.string().min(1).max(1000).required(),
    routeId: Joi.number().integer().positive().required(),
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
    }).required(),
    audioUrl: Joi.string().uri().allow(null, "").optional(),
  }),

  tourist: Joi.object({
    lugarDestino: Joi.string().min(3).max(255).required().messages({
      "string.min": "El lugar destino debe tener al menos 3 caracteres",
      "string.max": "El lugar destino no puede exceder 255 caracteres",
      "any.required": "El lugar destino es requerido",
    }),
    nombre: Joi.string().min(3).max(255).required().messages({
      "string.min": "El nombre debe tener al menos 3 caracteres",
      "string.max": "El nombre no puede exceder 255 caracteres",
      "any.required": "El nombre es requerido",
    }),
    descripcion: Joi.string().min(10).max(2000).required().messages({
      "string.min": "La descripción debe tener al menos 10 caracteres",
      "string.max": "La descripción no puede exceder 2000 caracteres",
      "any.required": "La descripción es requerida",
    }),
    ubicacion: Joi.object({
      coordinates: Joi.array().items(Joi.number()).length(2).required().messages({
        "array.length": "Las coordenadas deben contener exactamente 2 valores [lng, lat]",
        "any.required": "Las coordenadas son requeridas",
      }),
      type: Joi.string().valid("Point").default("Point"),
    }).required().messages({
      "any.required": "La ubicación es requerida",
    }),
    images: Joi.array().items(Joi.string().uri().messages({
      "string.uri": "Cada imagen debe ser una URL válida",
    })).optional().default([]).messages({
      "array.base": "Las imágenes deben ser un array de URLs",
    }),
    categoria: Joi.string().valid(
      "restaurante", 
      "hotel", 
      "atraccion", 
      "transporte", 
      "servicio", 
      "otro"
    ).required().messages({
      "any.only": "La categoría debe ser una de: restaurante, hotel, atraccion, transporte, servicio, otro",
      "any.required": "La categoría es requerida",
    }),
    calificacion: Joi.number().min(0).max(5).default(0).messages({
      "number.min": "La calificación debe ser entre 0 y 5",
      "number.max": "La calificación debe ser entre 0 y 5",
    }),
  }),

  // Esquema para actualizar puntos turísticos
  updateTourist: Joi.object({
    lugarDestino: Joi.string().min(3).max(255).optional(),
    nombre: Joi.string().min(3).max(255).optional(),
    descripcion: Joi.string().min(10).max(2000).optional(),
    ubicacion: Joi.object({
      coordinates: Joi.array().items(Joi.number()).length(2).required(),
      type: Joi.string().valid("Point").default("Point"),
    }).optional(),
    images: Joi.array().items(Joi.string().uri()).optional().default([]),
    categoria: Joi.string().valid(
      "restaurante", 
      "hotel", 
      "atraccion", 
      "transporte", 
      "servicio", 
      "otro"
    ).optional(),
    calificacion: Joi.number().min(0).max(5).optional(),
  }),

  // Esquema para actualizar mensajes
  updateMessage: Joi.object({
    message: Joi.string().min(1).max(1000).optional(),
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90),
      lng: Joi.number().min(-180).max(180),
    }).optional(),
    audioUrl: Joi.string().uri().allow(null, "").optional(),
    status: Joi.string().valid("active", "inactive", "pending").optional(),
  }),

  // Esquema para cambiar contraseña
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      "any.required": "La contraseña actual es requerida",
    }),
    newPassword: Joi.string().min(6).required().messages({
      "string.min": "La nueva contraseña debe tener al menos 6 caracteres",
      "any.required": "La nueva contraseña es requerida",
    }),
  }),

  // Esquema para actualizar perfil de usuario
  updateProfile: Joi.object({
    nombres: Joi.string().min(2).max(100).optional(),
    apellidos: Joi.string().min(2).max(100).optional(),
    telefono: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional(),
    fechaNacimiento: Joi.date().max("now").optional(),
    profileImage: Joi.string().uri().optional(),
    preferences: Joi.object({
      language: Joi.string().valid("es", "en").optional(),
      voiceSpeed: Joi.number().min(0.5).max(2.0).optional(),
      notifications: Joi.boolean().optional(),
    }).optional(),
  }),

  // Esquema para actualizar usuarios (admin)
  updateUser: Joi.object({
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).optional(),
    role: Joi.string().valid("admin", "user").optional(),
    active: Joi.boolean().optional(),
  }),

  // Esquema para refresh token
  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      "any.required": "El refresh token es requerido",
    }),
  }),
}

module.exports = {
  validate,
  schemas,
}