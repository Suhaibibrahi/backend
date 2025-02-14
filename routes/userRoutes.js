// routes/userRoute.js
const express = require("express");
const { getAllUsers, getUsersWithPagination, getUserById } = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Routes for user management (all require authentication)
router.get("/", authMiddleware, getAllUsers);                // Get all users (with caching)
router.get("/paginated", authMiddleware, getUsersWithPagination); // Get paginated users
router.get("/:id", authMiddleware, getUserById);               // Get single user by ID

module.exports = router;
