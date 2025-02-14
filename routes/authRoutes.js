// routes/authRoutes.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const argon2 = require("argon2");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("JWT_SECRET not defined in environment variables");
  process.exit(1);
}

// Utility function for generating JWT
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

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "iCloud",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// -------------------------
// Registration Endpoint
// -------------------------
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Invalid email format."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long.")
      .matches(/\d/)
      .withMessage("Password must contain a number."),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, errors: errors.array() });
    }
    const { email, password, name } = req.body;
    try {
      const db = req.app.locals.db;
      const usersColl = db.collection("users");
      const existingUser = await usersColl.findOne({ personalEmail: email });
      if (existingUser) {
        return res
          .status(400)
          .json({ success: false, message: "User already exists." });
      }
      const username = email.split("@")[0];
      const loginEmail = `${username}@sq23rd.com`;
      const hashedPassword = await argon2.hash(password);
      const userCount = await usersColl.countDocuments();
      const isFirstUser = userCount === 0;
      const newUser = {
        personalEmail: email,
        loginEmail,
        password: hashedPassword,
        name: name || "New User",
        status: isFirstUser ? "approved" : "pending",
        role: isFirstUser ? "owner" : "user",
        createdAt: new Date(),
      };
      await usersColl.insertOne(newUser);
      const msg = `Registration successful! Your login email will be ${loginEmail}. ${
        isFirstUser
          ? "You have been assigned as the owner."
          : "Your account is pending admin approval."
      }`;
      return res.status(201).json({ success: true, message: msg });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------
// Login Endpoint
// -------------------------
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid email format."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, errors: errors.array() });
    }
    const { email, password } = req.body;
    try {
      const db = req.app.locals.db;
      const user = await db.collection("users").findOne({ loginEmail: email });
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password." });
      }
      if (user.status !== "approved") {
        return res
          .status(403)
          .json({ success: false, message: "Your account is pending admin approval." });
      }
      const isPasswordCorrect = await argon2.verify(user.password, password);
      if (!isPasswordCorrect) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password." });
      }
      const token = generateToken(user);
      return res.status(200).json({
        success: true,
        message: "Login successful.",
        data: {
          token,
          user: {
            email: user.loginEmail,
            role: user.role,
            name: user.name || "New User",
            id: user._id.toString(),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------
// Request Password Reset Endpoint
// -------------------------
router.post(
  "/request-password-reset",
  [body("email").isEmail().withMessage("Invalid email format.")],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, errors: errors.array() });
    }
    const { email } = req.body;
    try {
      const db = req.app.locals.db;
      const usersColl = db.collection("users");
      const user = await usersColl.findOne({
        personalEmail: { $regex: new RegExp(`^${email.trim()}$`, "i") },
      });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found." });
      }
      // Generate reset token
      const token = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      const tokenExpiry = Date.now() + 3600000; // 1 hour
      await usersColl.updateOne(
        { personalEmail: user.personalEmail },
        { $set: { resetToken: hashedToken, resetTokenExpiry: tokenExpiry } }
      );
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      const subject = "Password Reset Request";
      const text = `You requested a password reset. Click the link to reset your password: ${resetLink}\nThis link will expire in 1 hour.`;
      await transporter.sendMail({
        from: `"23rd Tactical Airlift Squadron" <${process.env.EMAIL_USER}>`,
        to: user.personalEmail,
        subject,
        text,
      });
      return res
        .status(200)
        .json({ success: true, message: "Password reset email sent!" });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------------
// Reset Password Endpoint
// -------------------------
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Token is required."),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long.")
      .matches(/\d/)
      .withMessage("Password must contain a number."),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ success: false, errors: errors.array() });
    }
    const { token, newPassword } = req.body;
    try {
      const db = req.app.locals.db;
      const usersColl = db.collection("users");
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      const user = await usersColl.findOne({
        resetToken: hashedToken,
        resetTokenExpiry: { $gt: Date.now() },
      });
      if (!user) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid or expired token." });
      }
      const hashedPassword = await argon2.hash(newPassword);
      await usersColl.updateOne(
        { resetToken: hashedToken },
        {
          $set: { password: hashedPassword },
          $unset: { resetToken: "", resetTokenExpiry: "" },
        }
      );
      return res
        .status(200)
        .json({ success: true, message: "Password reset successful!" });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
