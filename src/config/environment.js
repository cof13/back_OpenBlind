require("dotenv").config()

const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 3000,

  // MySQL
  MYSQL: {
    HOST: process.env.MYSQL_HOST || "localhost",
    PORT: process.env.MYSQL_PORT || 3306,
    DATABASE: process.env.MYSQL_DATABASE || "openblind",
    USER: process.env.MYSQL_USER || "root",
    PASSWORD: process.env.MYSQL_PASSWORD || "",
  },

  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/openblind",

  // JWT
  JWT: {
    SECRET: process.env.JWT_SECRET || "your-super-secret-key-change-this-in-production-min-32-chars",
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key-change-this-in-production-min-32-chars",
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1h",
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  // Encryption
  ENCRYPTION: {
    KEY: process.env.ENCRYPTION_KEY || "your-32-character-encryption-key!!",
    ALGORITHM: process.env.ENCRYPTION_ALGORITHM || "aes-256-gcm",
  },

  // Logging
  LOG: {
    LEVEL: process.env.LOG_LEVEL || "info",
    FILE: process.env.LOG_FILE || "logs/application.log",
  },

  // CORS
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:4200",

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    MAX_REQUESTS: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },
}

module.exports = config
