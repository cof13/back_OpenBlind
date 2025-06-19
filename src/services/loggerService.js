const winston = require("winston")
const DailyRotateFile = require("winston-daily-rotate-file")
const path = require("path")
const config = require("../config/environment")

// Crear directorio de logs si no existe
const fs = require("fs")
const logDir = path.dirname(config.LOG.FILE)
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

// Configurar formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `[${timestamp}] [${level.toUpperCase()}]`

    if (meta.method && meta.url) {
      log += ` [${meta.method}] [${meta.url}]`
    }

    if (meta.status) {
      log += ` [${meta.status}]`
    }

    if (meta.responseTime) {
      log += ` [${meta.responseTime}ms]`
    }

    if (meta.ip) {
      log += ` [${meta.ip}]`
    }

    log += ` - ${message}`

    if (meta.requestBody && Object.keys(meta.requestBody).length > 0) {
      log += ` - REQUEST: ${JSON.stringify(meta.requestBody)}`
    }

    if (meta.responseBody) {
      log += ` - RESPONSE: ${JSON.stringify(meta.responseBody)}`
    }

    if (stack) {
      log += `\n${stack}`
    }

    return log
  }),
)

// Configurar transports
const transports = [
  new DailyRotateFile({
    filename: config.LOG.FILE.replace(".log", "-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "14d",
    format: customFormat,
  }),
]

// Agregar console en desarrollo
if (config.NODE_ENV === "development") {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), customFormat),
    }),
  )
}

const logger = winston.createLogger({
  level: config.LOG.LEVEL,
  transports,
})

module.exports = logger
