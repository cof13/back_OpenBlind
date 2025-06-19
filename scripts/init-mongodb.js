/**
 * OpenBlind MongoDB Database Initialization Script
 * This script initializes the MongoDB collections and indexes
 */

// Connect to the database
const db = db.getSiblingDB('openblind_nosql');

print('Initializing OpenBlind MongoDB database...');

// Create collections if they don't exist
db.createCollection('userprofiles');
db.createCollection('voiceguides');
db.createCollection('systemlogs');

print('Collections created successfully.');

// Create indexes for user_profiles collection
db.userprofiles.createIndex({ "user_id": 1 }, { unique: true });
db.userprofiles.createIndex({ "last_login": -1 });
db.userprofiles.createIndex({ "created_at": -1 });

print('User profiles indexes created.');

// Create indexes for voice_guides collection
db.voiceguides.createIndex({ "route_id": 1 });
db.voiceguides.createIndex({ "status": 1 });
db.voiceguides.createIndex({ "language": 1 });
db.voiceguides.createIndex({ "created_at": -1 });

print('Voice guides indexes created.');

// Create indexes for system_logs collection
db.systemlogs.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL
db.systemlogs.createIndex({ "level": 1, "timestamp": -1 });
db.systemlogs.createIndex({ "user_id": 1, "timestamp": -1 });
db.systemlogs.createIndex({ "ip_address": 1, "timestamp": -1 });
db.systemlogs.createIndex({ "status_code": 1, "timestamp": -1 });
db.systemlogs.createIndex({ "correlation_id": 1 });

print('System logs indexes created.');

// Insert sample user profiles
const sampleUserProfiles = [
    {
        user_id: "admin-user-id", // This should match an actual user ID from PostgreSQL
        profile_image: null,
        preferences: {
            language: "es",
            notifications: true,
            audio_enabled: true,
            theme: "light",
            voice_speed: 1.0
        },
        last_login: new Date(),
        login_history: [
            {
                timestamp: new Date(),
                ip_address: "127.0.0.1",
                user_agent: "OpenBlind-App/1.0"
            }
        ],
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        user_id: "test-user-id", // This should match an actual user ID from PostgreSQL
        profile_image: null,
        preferences: {
            language: "es",
            notifications: true,
            audio_enabled: true,
            theme: "high-contrast",
            voice_speed: 0.8
        },
        last_login: null,
        login_history: [],
        created_at: new Date(),
        updated_at: new Date()
    }
];

// Insert sample profiles (only if they don't exist)
sampleUserProfiles.forEach(profile => {
    const existing = db.userprofiles.findOne({ user_id: profile.user_id });
    if (!existing) {
        db.userprofiles.insertOne(profile);
        print(`Sample user profile created for user: ${profile.user_id}`);
    }
});

// Insert sample voice guides
const sampleVoiceGuides = [
    {
        route_id: "sample-route-id-1", // This should match an actual route ID from PostgreSQL
        audio_file_url: "https://example.com/audio/route1_guide.mp3",
        title: "Guía de voz - Ruta Centro Terminal",
        description: "Guía de audio con indicaciones para la ruta del centro al terminal",
        duration: 180, // 3 minutes
        language: "es",
        status: "active",
        file_size: 2048000, // 2MB
        mime_type: "audio/mpeg",
        metadata: {
            sample_rate: 44100,
            channels: 2,
            bitrate: 128000
        },
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        route_id: "sample-route-id-2", // This should match an actual route ID from PostgreSQL
        audio_file_url: "https://example.com/audio/metro_line_a.mp3",
        title: "Guía Metro Línea A",
        description: "Instrucciones de audio para navegación en Metro Línea A",
        duration: 240, // 4 minutes
        language: "es",
        status: "active",
        file_size: 3072000, // 3MB
        mime_type: "audio/mpeg",
        metadata: {
            sample_rate: 44100,
            channels: 1,
            bitrate: 96000
        },
        created_at: new Date(),
        updated_at: new Date()
    }
];

// Insert sample voice guides (only if collection is empty)
if (db.voiceguides.countDocuments() === 0) {
    db.voiceguides.insertMany(sampleVoiceGuides);
    print(`${sampleVoiceGuides.length} sample voice guides created.`);
} else {
    print('Voice guides collection already contains data, skipping sample data insertion.');
}

// Insert initial system log entry
const initialLog = {
    timestamp: new Date(),
    level: "info",
    message: "OpenBlind MongoDB database initialized",
    method: "INIT",
    url: "/init",
    status_code: 200,
    user_id: null,
    ip_address: "127.0.0.1",
    user_agent: "MongoDB Init Script",
    error_details: null,
    response_time: 0,
    request_body: null,
    response_body: null,
    session_id: null,
    correlation_id: "init_" + new Date().getTime()
};

db.systemlogs.insertOne(initialLog);
print('Initial system log entry created.');

// Create validation rules for collections
db.runCommand({
    collMod: "userprofiles",
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["user_id", "created_at", "updated_at"],
            properties: {
                user_id: {
                    bsonType: "string",
                    description: "User ID is required and must be a string"
                },
                preferences: {
                    bsonType: "object",
                    properties: {
                        language: { bsonType: "string" },
                        notifications: { bsonType: "bool" },
                        audio_enabled: { bsonType: "bool" },
                        theme: { 
                            bsonType: "string",
                            enum: ["light", "dark", "high-contrast"]
                        },
                        voice_speed: { 
                            bsonType: "number",
                            minimum: 0.5,
                            maximum: 2.0
                        }
                    }
                },
                last_login: { bsonType: ["date", "null"] },
                login_history: { bsonType: "array" },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" }
            }
        }
    }
});

db.runCommand({
    collMod: "voiceguides",
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["route_id", "audio_file_url", "created_at", "updated_at"],
            properties: {
                route_id: {
                    bsonType: "string",
                    description: "Route ID is required and must be a string"
                },
                audio_file_url: {
                    bsonType: "string",
                    description: "Audio file URL is required and must be a string"
                },
                title: { bsonType: ["string", "null"] },
                description: { bsonType: ["string", "null"] },
                duration: { 
                    bsonType: ["number", "null"],
                    minimum: 0
                },
                language: { 
                    bsonType: "string",
                    enum: ["es", "en", "fr", "pt"]
                },
                status: { 
                    bsonType: "string",
                    enum: ["active", "inactive", "processing"]
                },
                file_size: { 
                    bsonType: ["number", "null"],
                    minimum: 0
                },
                mime_type: { bsonType: ["string", "null"] },
                metadata: { bsonType: ["object", "null"] },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" }
            }
        }
    }
});

db.runCommand({
    collMod: "systemlogs",
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["timestamp", "level", "message"],
            properties: {
                timestamp: { bsonType: "date" },
                level: { 
                    bsonType: "string",
                    enum: ["info", "warn", "error", "debug"]
                },
                message: { bsonType: "string" },
                method: { bsonType: ["string", "null"] },
                url: { bsonType: ["string", "null"] },
                status_code: { bsonType: ["number", "null"] },
                user_id: { bsonType: ["string", "null"] },
                ip_address: { bsonType: ["string", "null"] },
                user_agent: { bsonType: ["string", "null"] },
                response_time: { bsonType: ["number", "null"] },
                correlation_id: { bsonType: ["string", "null"] }
            }
        }
    }
});

print('Collection validation rules applied.');

// Create database user for application (adjust credentials as needed)
// Note: Uncomment and modify for production use
/*
db.createUser({
    user: "openblind_app",
    pwd: "secure_password_change_in_production",
    roles: [
        {
            role: "readWrite",
            db: "openblind_nosql"
        }
    ]
});
print('Application database user created.');
*/

// Display database statistics
print('\n=== Database Statistics ===');
print('User Profiles:', db.userprofiles.countDocuments());
print('Voice Guides:', db.voiceguides.countDocuments());
print('System Logs:', db.systemlogs.countDocuments());

print('\n=== Indexes ===');
print('User Profiles indexes:', db.userprofiles.getIndexes().length);
print('Voice Guides indexes:', db.voiceguides.getIndexes().length);
print('System Logs indexes:', db.systemlogs.getIndexes().length);

print('\nOpenBlind MongoDB database initialization completed successfully!');
print('Database name: openblind_nosql');
print('Collections: userprofiles, voiceguides, systemlogs');
print('\nIMPORTANT: Remember to update the sample data with actual user and route IDs from PostgreSQL.');
print('For production: Change default passwords and remove sample data.');
