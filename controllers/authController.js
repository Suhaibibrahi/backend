// controllers/authcontroller.js
const argon2 = require("argon2");
const { getDb } = require("../db");
const { generateToken } = require("../utils/tokenService");
const logger = require("../ligger");

async function register(req, res) {
  try {
    const { email, password, name, role } = req.body;
    const db = getDb();
    const usersColl = db.collection("users");

    const existingUser = await usersColl.findOne({ personalEmail: email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await argon2.hash(password);
    const userCount = await usersColl.countDocuments();
    const assignedRole = userCount === 0 ? "owner" : role || "user";

    const newUser = {
      personalEmail: email,
      // Optionally, compute loginEmail if needed:
      loginEmail: `${email.split("@")[0]}@sq23rd.com`,
      password: hashedPassword,
      name: name || "New User",
      role: assignedRole,
      createdAt: new Date(),
    };

    await usersColl.insertOne(newUser);
    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    logger.error("Registration error: " + error.message);
    res.status(500).json({ message: "An error occurred." });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const db = getDb();
    const user = await db.collection("users").findOne({ personalEmail: email });

    if (!user || !(await argon2.verify(user.password, password))) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = generateToken(user);
    res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "Strict" });
    res.status(200).json({ message: "Login successful." });
  } catch (error) {
    logger.error("Login error: " + error.message);
    res.status(500).json({ message: "An error occurred." });
  }
}

module.exports = { register, login };
