const loggerService = require("../services/loggerService");

const loggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Capturar el body original
  const originalSend = res.send.bind(res);
  let responseBody;

  res.send = function (body) {
    responseBody = body;
    return originalSend(body);
  };

  // Continuar con la petición
  res.on("finish", () => {
    const responseTime = Date.now() - startTime;
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    // Filtrar información sensible del body
    const sanitizedBody = sanitizeRequestBody(req.body);
    const sanitizedResponse = sanitizeResponseBody(responseBody);

    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime,
      ip,
      requestBody: sanitizedBody,
      responseBody: sanitizedResponse,
    };

    if (res.statusCode >= 400) {
      loggerService.error(`${req.method} ${req.originalUrl} - ${res.statusCode}`, logData);
    } else {
      loggerService.info(`${req.method} ${req.originalUrl} - ${res.statusCode}`, logData);
    }
  });

  next();
};

const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== "object") return body;

  const sanitized = { ...body };
  const sensitiveFields = ["password", "token", "refresh_token", "authorization"];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = "***HIDDEN***";
    }
  });

  return sanitized;
};

const sanitizeResponseBody = (body) => {
  if (!body) return body;

  try {
    const parsed = typeof body === "string" ? JSON.parse(body) : body;
    if (parsed && typeof parsed === "object") {
      const sanitized = { ...parsed };

      if (sanitized.data) {
        if (sanitized.data.token) {
          sanitized.data.token = "***HIDDEN***";
        }
        if (sanitized.data.refreshToken) {
          sanitized.data.refreshToken = "***HIDDEN***";
        }
      }

      return sanitized;
    }
  } catch (e) {
    // Si no se puede parsear, devolver como está
  }

  return body;
};

module.exports = loggerMiddleware;
