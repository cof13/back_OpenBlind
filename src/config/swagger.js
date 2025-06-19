const swaggerJsdoc = require("swagger-jsdoc")
const swaggerUi = require("swagger-ui-express")

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "OpenBlind API",
      version: "1.0.0",
      description: "API para aplicación de asistencia a personas con discapacidad visual",
      contact: {
        name: "OpenBlind Team",
        email: "support@openblind.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000/api",
        description: "Servidor de desarrollo",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["admin", "user"] },
            active: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Route: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            location: { type: "string" },
            transport_name: { type: "string" },
            user_id: { type: "integer" },
            active: { type: "boolean" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                details: { type: "object" },
              },
            },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
            message: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
}

const specs = swaggerJsdoc(options)

const swaggerSetup = (app) => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "OpenBlind API Documentation",
    }),
  )
}

module.exports = swaggerSetup
