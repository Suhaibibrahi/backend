// redis.js
const redis = require("redis");
const client = redis.createClient(); // Uses default settings (localhost:6379)

client.on("error", (err) => {
  console.error("Redis error:", err);
});

// For node-redis v4, connect() returns a promise:
client.connect().catch((err) => {
  console.error("Redis connection error:", err);
});

module.exports = client;
