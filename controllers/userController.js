// controllers/userController.js
const { ObjectId } = require("mongodb");
const { getDb } = require("../db"); // db.js in the project root
const logger = require("../ligger"); // ligger.js in the project root

// Get All Users without caching (Redis caching disabled)
async function getAllUsers(req, res) {
  try {
    // Temporarily disable caching by not using redisClient
    const db = getDb();
    const users = await db.collection("users")
      .find({}, { projection: { password: 0, resetToken: 0, resetTokenExpiry: 0 } })
      .toArray();

    res.status(200).json(users);
  } catch (error) {
    logger.error("Error fetching users:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
}

// Get Users with Pagination (unchanged)
async function getUsersWithPagination(req, res) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const db = getDb();

    const users = await db.collection("users")
      .find({}, { projection: { password: 0, resetToken: 0, resetTokenExpiry: 0 } })
      .skip((page - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .toArray();

    res.status(200).json(users);
  } catch (error) {
    logger.error("Error fetching users:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
}

// Get a Single User by ID (unchanged)
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0, resetToken: 0, resetTokenExpiry: 0 } }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    logger.error("Error fetching user:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
}

module.exports = { getAllUsers, getUsersWithPagination, getUserById };
