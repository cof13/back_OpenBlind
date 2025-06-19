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
  }),

  tourist: Joi.object({
    lugarDestino: Joi.string().min(3).max(255).required(),
    nombre: Joi.string().min(3).max(255).required(),
    descripcion: Joi.string().min(10).max(2000).required(),
    ubicacion: Joi.object({
      coordinates: Joi.array().items(Joi.number()).length(2).required(),
      type: Joi.string().valid("Point").default("Point"),
    }).required(),
    categoria: Joi.string().min(3).max(100).required(),
    calificacion: Joi.number().min(0).max(5).default(0),
  }),
}

module.exports = {
  validate,
  schemas,
}
