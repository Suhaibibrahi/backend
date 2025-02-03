/***************************************************************
 * server.js
 *  - Node/Express server with:
 *    - MongoDB (via official driver)
 *    - JWT auth
 *    - Basic user registration, login, password reset
 *    - Helmet, rate limiting
 *    - Example route mounting (FCIF, Schedules, etc.)
 ***************************************************************/

require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");

// 1) Express setup
const app = express();
const PORT = process.env.PORT || 5000;

// 2) Environment Config
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("Error: MONGO_URI is not set in .env!");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET; // Removed fallback
if (!JWT_SECRET) {
  console.error("Error: JWT_SECRET is not set in .env!");
  process.exit(1);
}
// 3) Connect to MongoDB
let client;
let db;
async function connectToDatabase() {
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db("SQ23rdApp");
    console.log("Connected to MongoDB!");

    // Create indexes
    await db.collection("users").createIndex({ loginEmail: 1 }, { unique: true });
    await db.collection("users").createIndex({ personalEmail: 1 }, { unique: true });
    
    app.locals.db = db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
}
connectToDatabase();

// Graceful shutdown on Ctrl+C
process.on("SIGINT", async () => {
  try {
    if (client) {
      await client.close();
      console.log("MongoDB connection closed.");
    }
  } catch (error) {
    console.error("Error closing MongoDB connection:", error.message);
  } finally {
    process.exit(0);
  }
});

// 4) Middleware
app.use(express.json()); // parse JSON bodies
app.use(cors());
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
app.use(limiter);

// Simple request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// 5) Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: "iCloud", 
  auth: {
    user: process.env.EMAIL_USER,  // e.g. "suhaib.c130j@icloud.com"
    pass: process.env.EMAIL_PASS,  // e.g. "hesk-qpim-bpru-wlsx"
  },
});

/** Helper to send email */
async function sendEmail(to, subject, text) {
  try {
    console.log(`Attempting to send email to: ${to}`);
    const info = await transporter.sendMail({
      from: `"23rd Tactical Airlift Squadron" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`Email successfully sent to ${to}: ${info.response}`);
    return true;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error.message);
    return false;
  }
}

// 6) Validation Helpers
function isValidEmailFormat(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === "string" && emailRegex.test(email);
}
function isValidPasswordFormat(password) {
  // at least 8 chars, 1 letter, 1 digit
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  return typeof password === "string" && passwordRegex.test(password);
}

// 7) JWT Auth Helpers
function generateToken(user) {
  // sign with user._id and user.role
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "No Authorization header provided." });
  }
  const token = authHeader.split(" ")[1]; // Bearer <token>
  if (!token) {
    return res.status(401).json({ message: "Token not found in header." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // e.g. { userId, role, iat, exp }
    next();
  } catch (err) {
    console.error("Invalid or expired token:", err.message);
    return res.status(403).json({ message: "Invalid or expired token." });
  }
}

function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res
        .status(403)
        .json({ message: `Access denied. Requires ${requiredRole} role.` });
    }
    next();
  };
}

/// 8) UPDATED Registration Endpoint
app.post("/register", async (req, res) => {
  const { email, password, name } = req.body; // Added name

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }
  if (!isValidEmailFormat(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }
  if (!isValidPasswordFormat(password)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters and include a letter and a number.",
    });
  }

  try {
    const usersColl = db.collection("users");
    const existingUser = await usersColl.findOne({ personalEmail: email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const username = email.split("@")[0];
    const loginEmail = `${username}@sq23rd.com`;
    const hashedPassword = await bcrypt.hash(password, 12); // Increased cost factor

    const userCount = await usersColl.countDocuments();
    const isFirstUser = userCount === 0;

    const newUser = {
      personalEmail: email,
      loginEmail,
      password: hashedPassword,
      name: name || "New User", // Added name field
      status: isFirstUser ? "approved" : "pending",
      role: isFirstUser ? "owner" : "user",
      createdAt: new Date()
    };

    await usersColl.insertOne(newUser);

    const msg = `Registration successful! Your login email will be ${loginEmail}. ${
      isFirstUser
        ? "You have been assigned as the owner of this system."
        : "Your account is pending admin approval."
    }`;

    res.status(201).json({ message: msg });
  } catch (error) {
    console.error("Error during registration:", error.message);
    res.status(500).json({ message: "An error occurred. Please try again." });
  }
});

// 9) UPDATED Login Endpoint (Critical Fix)
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const user = await db.collection("users").findOne({ loginEmail: email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    if (user.status !== "approved") {
      return res.status(403).json({ message: "Your account is pending admin approval." });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Generate JWT
    const token = generateToken(user);
    
    // Updated response format
    res.status(200).json({
      token,
      user: {
        email: user.loginEmail,
        role: user.role,
        name: user.name || "New User",
        id: user._id.toString()
      }
    });
    
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ message: "An error occurred. Please try again." });
  }
});

// 10) Password Reset
app.post("/request-password-reset", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const usersColl = db.collection("users");
    const user = await usersColl.findOne({
      personalEmail: { $regex: new RegExp(`^${email.trim()}$`, "i") },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const tokenExpiry = Date.now() + 3600000; // 1 hour

    await usersColl.updateOne(
      { personalEmail: user.personalEmail },
      { $set: { resetToken: hashedToken, resetTokenExpiry: tokenExpiry } }
    );

    // Create the reset link
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const subject = "Password Reset Request";
    const text = `
You requested a password reset. Click the link below to reset your password:
${resetLink}

This link will expire in 1 hour.

If you did not request this, please ignore this email.
`;

    const emailSent = await sendEmail(user.personalEmail, subject, text);
    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send password reset email." });
    }

    res.status(200).json({ message: "Password reset email sent!" });
  } catch (error) {
    console.error("Error requesting password reset:", error.message);
    res.status(500).json({ message: "An error occurred. Please try again." });
  }
});

app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token and new password are required." });
  }
  if (!isValidPasswordFormat(newPassword)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters long and include at least one letter and one number.",
    });
  }

  try {
    const usersColl = db.collection("users");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await usersColl.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await usersColl.updateOne(
      { resetToken: hashedToken },
      {
        $set: { password: hashedPassword },
        $unset: { resetToken: "", resetTokenExpiry: "" },
      }
    );

    res.status(200).json({ message: "Password reset successful!" });
  } catch (error) {
    console.error("Error resetting password:", error.message);
    res.status(500).json({ message: "An error occurred. Please try again." });
  }
});

// 11) Protected Admin/Owner Endpoints
app.get("/users", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const users = await db
      .collection("users")
      .find({}, { projection: { password: 0, resetToken: 0, resetTokenExpiry: 0 } })
      .toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
});

app.put("/approve/:email", authMiddleware, requireRole("admin"), async (req, res) => {
  const { email } = req.params;
  try {
    const user = await db.collection("users").findOne({ personalEmail: email });
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.status === "approved") {
      return res.status(400).json({ message: "User is already approved." });
    }

    await db
      .collection("users")
      .updateOne({ personalEmail: email }, { $set: { status: "approved" } });

    res.status(200).json({ message: "User approved successfully." });
  } catch (error) {
    console.error("Error approving user:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
});

app.put("/deny/:email", authMiddleware, requireRole("admin"), async (req, res) => {
  const { email } = req.params;
  try {
    const user = await db.collection("users").findOne({ personalEmail: email });
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.status === "denied") {
      return res.status(400).json({ message: "User is already denied." });
    }

    await db
      .collection("users")
      .updateOne({ personalEmail: email }, { $set: { status: "denied" } });

    res.status(200).json({ message: "User denied successfully." });
  } catch (error) {
    console.error("Error denying user:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
});

app.put("/assign-admin/:email", authMiddleware, requireRole("admin"), async (req, res) => {
  const { email } = req.params;
  try {
    const user = await db.collection("users").findOne({ loginEmail: email });
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === "admin") {
      return res.status(400).json({ message: "User is already an admin." });
    }

    await db
      .collection("users")
      .updateOne({ loginEmail: email }, { $set: { role: "admin" } });
    res.status(200).json({ message: `Admin role assigned to ${email} successfully.` });
  } catch (error) {
    console.error("Error assigning admin role:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
});

// Example manager route
app.get("/manager/dashboard", authMiddleware, requireRole("manager"), (req, res) => {
  res.status(200).json({ message: "Welcome to the manager dashboard!" });
});

// Example pilot route
app.get("/pilot/dashboard", authMiddleware, requireRole("pilot"), (req, res) => {
  res.status(200).json({ message: "Welcome to the pilot dashboard!" });
});

// Example loadmaster route
app.get("/loadmaster/dashboard", authMiddleware, requireRole("loadmaster"), (req, res) => {
  res.status(200).json({ message: "Welcome to the loadmaster dashboard!" });
});

// 12) Example route mounting for schedules & qualifications
// (Remove or comment out if you haven't created them yet)
const scheduleRoutes = require("./routes/scheduleRoutes"); // create this file
app.use("/schedules", scheduleRoutes);

const qualificationRoutes = require("./routes/qualificationRoutes"); // create this file
app.use("/qualifications", qualificationRoutes);

// 13 FCIF Routes
// Create "routes/fcifRoutes.js" and "controllers/fcifController.js"
const fcifRoutes = require("./routes/fcifRoutes");
app.use("/fcifs", fcifRoutes);

// 14 Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
