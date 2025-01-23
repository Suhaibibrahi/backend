/***************************************************************
 * utils/authHelpers.js
 * 
 * Contains JWT logic (generateToken, authMiddleware, requireRole)
 ***************************************************************/
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "SomeFallbackSecretKey";

/**
 * Generate a JWT token for a user object.
 * @param {Object} user - The user document from the DB (with `_id`, `role`, etc.)
 * @returns {string} - The signed JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "8h" } // or whatever expiry you like
  );
}

/**
 * Middleware to authenticate a token from `Authorization: Bearer <token>`.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "No Authorization header provided." });
  }

  const token = authHeader.split(" ")[1]; // "Bearer <token>"
  if (!token) {
    return res.status(401).json({ message: "Token not found in header." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, role, iat, exp }
    next();
  } catch (err) {
    console.error("Invalid or expired token:", err.message);
    return res.status(403).json({ message: "Invalid or expired token." });
  }
}

/**
 * Middleware to enforce a required user role (e.g., "admin", "manager", etc.).
 */
function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({
        message: `Access denied. Requires ${requiredRole} role.`,
      });
    }
    next();
  };
}

module.exports = {
  generateToken,
  authMiddleware,
  requireRole,
};
