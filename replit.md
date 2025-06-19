# OpenBlind Backend API

## Overview

OpenBlind is a backend API service designed to assist visually impaired users with navigation and accessibility features. The system provides voice-guided routes, personalized messages, tourist information, and user management capabilities. It serves as the backend for a mobile application that helps blind and visually impaired users navigate public transportation and tourist destinations.

## System Architecture

The application follows a layered architecture pattern with the following structure:

- **API Layer**: Express.js REST API with route handlers
- **Service Layer**: Business logic and data processing
- **Data Layer**: Dual database approach with PostgreSQL and MongoDB
- **Middleware Layer**: Authentication, validation, logging, and security
- **Configuration Layer**: Environment-based configuration management

## Key Components

### Backend Framework
- **Express.js 5.1.0**: Modern web framework for API development
- **Node.js 20**: Runtime environment with ES modules support
- **Security**: Helmet for security headers, CORS for cross-origin requests, rate limiting

### Database Architecture
- **PostgreSQL**: Primary relational database for core data (users, routes, messages, tourist registrations)
- **MongoDB**: NoSQL database for flexible data (user profiles, voice guides, system logs)
- **Data Encryption**: AES-256 encryption for sensitive user data

### Authentication & Authorization
- **JWT Tokens**: JSON Web Tokens for stateless authentication
- **BCrypt**: Password hashing with configurable rounds
- **Role-based Access**: Admin and user roles with middleware enforcement

### Core Modules

#### User Management
- User registration and authentication
- Profile management with encrypted personal data
- Role-based permissions (admin/user)
- User preferences stored in MongoDB

#### Route Management
- Transportation route creation and management
- Location-based route discovery
- Status management (active/inactive)

#### Messaging System
- Personalized messages for routes
- Bulk message management
- Status tracking and updates

#### Tourist Information
- Tourist destination registration
- Location-based search with coordinates
- Destination descriptions and metadata

#### Voice Guides
- Audio file management for routes
- Multi-language support
- File metadata tracking (duration, size, format)

### Security Features
- Input validation using Joi schemas
- SQL injection prevention through parameterized queries
- XSS protection via Helmet middleware
- Rate limiting to prevent abuse
- Request/response logging for audit trails

### Logging & Monitoring
- Winston-based logging with multiple transports
- Structured logging with correlation IDs
- Error tracking and exception handling
- Database query performance monitoring

## Data Flow

1. **Request Processing**: Incoming requests pass through security middleware, rate limiting, and CORS
2. **Authentication**: JWT tokens are validated and user context is established
3. **Validation**: Request data is validated using Joi schemas
4. **Business Logic**: Service layer processes the request with appropriate business rules
5. **Data Access**: Data is retrieved/stored using appropriate database (PostgreSQL/MongoDB)
6. **Response**: Formatted JSON responses with consistent structure
7. **Logging**: All operations are logged with appropriate detail levels

## External Dependencies

### Database Connections
- **PostgreSQL**: Connection pooling with automatic reconnection
- **MongoDB**: Mongoose ODM with connection management

### Security Libraries
- **jsonwebtoken**: JWT token generation and validation
- **bcrypt**: Password hashing and comparison
- **helmet**: Security headers middleware
- **cors**: Cross-origin resource sharing

### Validation & Utilities
- **joi**: Schema validation for request data
- **uuid**: UUID generation for database records
- **winston**: Comprehensive logging solution

## Deployment Strategy

### Environment Configuration
- Environment-specific configuration using dotenv
- Separate configurations for development and production
- Database connection strings and security keys externalized

### Database Initialization
- SQL scripts for PostgreSQL schema creation
- MongoDB initialization scripts for collections and indexes
- Automated database setup on startup

### Process Management
- Graceful shutdown handling for SIGTERM/SIGINT
- Database connection cleanup on process termination
- Health check endpoints for monitoring

### Security Considerations
- Default passwords and keys require change in production
- Encryption keys should be randomly generated
- JWT secrets must be secure and unique per environment

## Changelog

```
Changelog:
- June 19, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```