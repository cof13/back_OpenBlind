-- OpenBlind PostgreSQL Database Initialization Script
-- This script creates the database schema and initial data

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'user')) DEFAULT 'user',
    telefono TEXT,
    nombres TEXT,
    apellidos TEXT,
    fecha_nacimiento TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Create routes table
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    transport_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create personalized_messages table
CREATE TABLE IF NOT EXISTS personalized_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tourist_registrations table
CREATE TABLE IF NOT EXISTS tourist_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destination_place VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(20) CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at 
    BEFORE UPDATE ON routes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personalized_messages_updated_at 
    BEFORE UPDATE ON personalized_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tourist_registrations_updated_at 
    BEFORE UPDATE ON tourist_registrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_created_by ON routes(created_by);
CREATE INDEX IF NOT EXISTS idx_routes_transport ON routes(transport_name);
CREATE INDEX IF NOT EXISTS idx_routes_location ON routes(location);
CREATE INDEX IF NOT EXISTS idx_routes_created_at ON routes(created_at);

CREATE INDEX IF NOT EXISTS idx_messages_status ON personalized_messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_route_id ON personalized_messages(route_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_by ON personalized_messages(created_by);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON personalized_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_tourist_status ON tourist_registrations(status);
CREATE INDEX IF NOT EXISTS idx_tourist_created_by ON tourist_registrations(created_by);
CREATE INDEX IF NOT EXISTS idx_tourist_location ON tourist_registrations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_tourist_created_at ON tourist_registrations(created_at);

-- Insert default admin user (password: Admin123!)
-- Note: In production, change this password immediately
INSERT INTO users (email, password_hash, role, nombres, apellidos, is_active)
VALUES (
    'admin@openblind.com',
    '$2b$12$8K0yKWO8HkYpGgJsGjMSleF4vQFRm1tL5KGxRzRzRzRzRzRzRzRzRe', -- Admin123!
    'admin',
    'System',
    'Administrator',
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert test user (password: User123!)
-- Note: Remove this in production
INSERT INTO users (email, password_hash, role, nombres, apellidos, is_active)
VALUES (
    'user@openblind.com',
    '$2b$12$3K0yKWO8HkYpGgJsGjMSleF4vQFRm1tL5KGxRzRzRzRzRzRzRzRzRe', -- User123!
    'user',
    'Test',
    'User',
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert sample routes
DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_id FROM users WHERE email = 'admin@openblind.com';
    
    IF admin_id IS NOT NULL THEN
        -- Insert sample routes
        INSERT INTO routes (name, location, transport_name, created_by)
        VALUES 
            ('Ruta Centro - Terminal', 'Centro de la ciudad', 'Autobús Municipal', admin_id),
            ('Línea Metro A', 'Estación Central - Estación Norte', 'Metro', admin_id),
            ('Ruta Universitaria', 'Campus - Centro Comercial', 'Transporte Universitario', admin_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Insert sample tourist registrations
DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_id FROM users WHERE email = 'admin@openblind.com';
    
    IF admin_id IS NOT NULL THEN
        -- Insert sample tourist registrations
        INSERT INTO tourist_registrations (destination_place, name, description, latitude, longitude, created_by)
        VALUES 
            ('Plaza Principal', 'Plaza de Armas', 'Plaza central histórica de la ciudad con fuentes y jardines', -12.0464, -77.0428, admin_id),
            ('Museo Nacional', 'Museo de Historia', 'Museo con exhibiciones permanentes de arte y cultura local', -12.0532, -77.0365, admin_id),
            ('Parque Central', 'Parque de los Olivos', 'Amplio parque público con áreas recreativas y senderos', -12.0401, -77.0445, admin_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Insert sample personalized messages
DO $$
DECLARE
    admin_id UUID;
    route_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_id FROM users WHERE email = 'admin@openblind.com';
    
    -- Get first route ID
    SELECT id INTO route_id FROM routes LIMIT 1;
    
    IF admin_id IS NOT NULL AND route_id IS NOT NULL THEN
        -- Insert sample messages
        INSERT INTO personalized_messages (message, route_id, created_by)
        VALUES 
            ('Próxima parada: Terminal de autobuses. Prepare su tarjeta de transporte.', route_id, admin_id),
            ('Recuerde mantener su equipaje seguro durante el viaje.', route_id, admin_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Create views for reporting
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as regular_users,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_last_30_days
FROM users;

CREATE OR REPLACE VIEW route_statistics AS
SELECT 
    COUNT(*) as total_routes,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_routes,
    COUNT(DISTINCT transport_name) as unique_transports,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_routes_last_30_days
FROM routes;

-- Grant permissions (adjust as needed for your environment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO openblind_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO openblind_app;

-- Display completion message
SELECT 'OpenBlind PostgreSQL database initialized successfully!' as message;
