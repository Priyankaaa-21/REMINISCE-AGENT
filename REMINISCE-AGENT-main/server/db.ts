import { MongoClient, Db } from "mongodb";
import type { User, Memory, Routine, Medication, EmergencyLog } from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// MongoDB connection
const client = new MongoClient(process.env.DATABASE_URL, {
  maxPoolSize: 20, // Maximum number of connections in the pool
  minPoolSize: 5,  // Minimum number of connections
  maxIdleTimeMS: 30000, // Close idle connections after 30 seconds
  serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds if no server available
});

let cachedDb: Db | null = null;

async function connectToDatabase(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    await client.connect();
    const dbName = process.env.DATABASE_NAME || "reminisce_ai";
    cachedDb = client.db(dbName);
    console.log(`✅ Connected to MongoDB database: ${dbName}`);
    
    // Create indexes for better query performance
    await createIndexes(cachedDb);
    
    return cachedDb;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(-1);
  }
}

async function createIndexes(db: Db) {
  try {
    // Create unique index on username
    await db.collection("users").createIndex({ username: 1 }, { unique: true });
    
    // Create indexes for foreign key-like queries
    await db.collection("users").createIndex({ caretakerId: 1 });
    await db.collection("memories").createIndex({ patientId: 1 });
    await db.collection("routines").createIndex({ patientId: 1 });
    await db.collection("medications").createIndex({ patientId: 1 });
    await db.collection("emergency_logs").createIndex({ patientId: 1 });
    
    // Create index for timestamp queries
    await db.collection("memories").createIndex({ createdAt: -1 });
    await db.collection("emergency_logs").createIndex({ timestamp: -1 });
    
    console.log("✅ MongoDB indexes created successfully");
  } catch (error) {
    console.warn("Warning: Could not create indexes:", error);
  }
}

// Export the database connection function
export const getDb = connectToDatabase;

// Auto-increment counter helper
export async function getNextSequence(db: Db, sequenceName: string): Promise<number> {
  const result = await db.collection<{_id: string; seq: number}>("counters").findOneAndUpdate(
    { _id: sequenceName } as any,
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return result?.seq || 1;
}

// Close connection gracefully
process.on('SIGINT', async () => {
  await client.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});
