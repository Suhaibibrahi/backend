// db.js
const { MongoClient } = require("mongodb");
const logger = require("./ligger");

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  logger.error("Error: MONGO_URI is not set in .env!");
  process.exit(1);
}

let client;
let db;

async function connectToDatabase() {
  try {
    // Notice we no longer pass useNewUrlParser or useUnifiedTopology.
    client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db("SQ23rdApp");
    logger.info("Connected to MongoDB!");

    // Create indexes for the users collection
    await db.collection("users").createIndex({ loginEmail: 1 }, { unique: true });
    await db.collection("users").createIndex({ personalEmail: 1 }, { unique: true });

    return db;
  } catch (error) {
    logger.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
}

module.exports = { connectToDatabase, getDb: () => db };
