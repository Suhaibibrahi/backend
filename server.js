/***************************************************************
 * server.js
 * Main Express server:
 *  - Loads environment variables
 *  - Sets up middleware (JSON body parsing, URL encoding, CORS, Helmet, rate limiting, cookie parsing)
 *  - Connects to MongoDB (using db.js)
 *  - Mounts authentication routes (from routes/authRoutes.js)
 *  - Mounts user management routes (from routes/userRoutes.js)
 *  - Handles 404 and other errors
 ***************************************************************/
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
// CSRF protection is removed since we're using token-based authentication
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const logger = require("./ligger"); // ligger.js is in the project root
const { connectToDatabase } = require("./db"); // db.js is in the project root

const app = express();
const PORT = process.env.PORT || 5000;

// -------------------------
// Global Middleware Setup
// -------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(helmet());

// Rate limiting middleware
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  })
);

// HTTP request logging with Morgan (logs are streamed to Winston via ligger.js)
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// -------------------------
// Database Connection
// -------------------------
connectToDatabase()
  .then((db) => {
    // Store the database connection in app.locals for access in routes
    app.locals.db = db;
    logger.info("Database connection established and stored in app.locals.db");
  })
  .catch((err) => {
    logger.error("Database connection failed:", err);
    process.exit(1);
  });

// -------------------------
// Route Mounting
// -------------------------
const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

const userRoutes = require("./routes/userRoutes"); // Updated to match file name
app.use("/users", userRoutes);

// -------------------------
// 404 Handler for Unmatched Routes
// -------------------------
app.use((req, res, next) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// -------------------------
// Error Handling Middleware
// -------------------------
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ message: "An internal server error occurred." });
});

// -------------------------
// Start the Server
// -------------------------
app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
