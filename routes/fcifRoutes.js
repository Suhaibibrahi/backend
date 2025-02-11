// routes/fcifRoutes.js
const express = require("express");
const router = express.Router();
const fcifController = require("../controllers/fcifController");
const { authMiddleware, requireRole } = require("../utils/authHelpers");

// FCIF Routes
router.post("/", authMiddleware, requireRole("admin"), fcifController.createFCIF);
router.get("/", authMiddleware, fcifController.getAllFCIFs);
router.post("/:fcifId/acknowledge", authMiddleware, fcifController.acknowledgeFCIF);
router.delete("/:fcifId", authMiddleware, requireRole("admin"), fcifController.deleteFCIF);

module.exports = router;
