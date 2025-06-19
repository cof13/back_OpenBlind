const standardResponse = {
  success: (data, message = "Operación exitosa") => ({
    success: true,
    data,
    message,
  }),

  error: (code, message, details = null) => ({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  }),

  paginated: (data, pagination, message = "Datos obtenidos correctamente") => ({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1,
    },
    message,
  }),
}

module.exports = {
  standardResponse,
}
