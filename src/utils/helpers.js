const crypto = require("crypto")

const helpers = {
  // Generar ID único
  generateId: () => {
    return crypto.randomBytes(16).toString("hex")
  },

  // Validar coordenadas geográficas
  validateCoordinates: (lat, lng) => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  },

  // Sanitizar texto
  sanitizeText: (text) => {
    if (!text || typeof text !== "string") return text
    return text.trim().replace(/[<>]/g, "")
  },

  // Formatear fecha
  formatDate: (date) => {
    return new Date(date).toISOString().split("T")[0]
  },

  // Calcular paginación
  calculatePagination: (page = 1, limit = 10, total = 0) => {
    const offset = (page - 1) * limit
    const totalPages = Math.ceil(total / limit)

    return {
      page: Number.parseInt(page),
      limit: Number.parseInt(limit),
      offset,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }
  },

  // Validar email
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  // Generar slug
  generateSlug: (text) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
  },
}

module.exports = helpers
