/***************************************************************
 * routes/fcifRoutes.js
 ***************************************************************/
const express = require("express");
const router = express.Router();
const fcifController = require("../controllers/fcifController");

// If you store them in utils/authHelpers.js:
const { authMiddleware, requireRole } = require("../utils/authHelpers");

// Create FCIF (admin or owner only)
router.post("/", authMiddleware, requireRole("admin"), fcifController.createFCIF);

// Get all FCIFs (any logged-in user)
router.get("/", authMiddleware, fcifController.getAllFCIFs);

// Acknowledge a specific FCIF
router.post("/:fcifId/acknowledge", authMiddleware, fcifController.acknowledgeFCIF);

// Delete FCIF (admin or owner)
router.delete("/:fcifId", authMiddleware, requireRole("admin"), fcifController.deleteFCIF);

module.exports = router;
