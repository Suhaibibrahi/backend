// authMiddleware.js
const jwt = require("jsonwebtoken");
const logger = require("../ligger");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error("JWT_SECRET not set in environment variables");
  process.exit(1);
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    logger.error("Authorization header not provided");
    return res.status(401).json({ message: "No token provided" });
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2) {
    logger.error("Invalid authorization header format");
    return res.status(401).json({ message: "Invalid token format" });
  }

  const scheme = parts[0];
  const token = parts[1];

  if (!/^Bearer$/i.test(scheme)) {
    logger.error("Authorization header does not start with Bearer");
    return res.status(401).json({ message: "Token malformed" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach decoded payload (e.g., userId, role) to the request
    next();
  } catch (err) {
    logger.error("Token verification failed: " + err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
}

module.exports = authMiddleware;
