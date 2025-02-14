// utils/tokenService.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("JWT_SECRET not defined in environment variables");
  process.exit(1);
}

function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

module.exports = { generateToken };
