// routes/qualificationRoutes.js
const express = require("express");
const router = express.Router();
const qualificationController = require("../controllers/qualificationController");
const { authMiddleware, requireRole } = require("../utils/authHelpers");

// Qualification Routes (Owner-only for modifications)
router.post("/:userId", authMiddleware, requireRole("owner"), qualificationController.addQualification);
router.delete("/:userId/:qualificationId", authMiddleware, requireRole("owner"), qualificationController.removeQualification);
router.get("/:userId", authMiddleware, qualificationController.getUserQualifications);

module.exports = router;
