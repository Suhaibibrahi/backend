// routes/scheduleRoutes.js
const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/scheduleController");
const { authMiddleware, requireRole } = require("../utils/authHelpers");

// Schedule Routes (Manager-only for modifications)
router.post("/", authMiddleware, requireRole("manager"), scheduleController.createSchedule);
router.get("/", authMiddleware, scheduleController.getAllSchedules);
router.get("/:scheduleId", authMiddleware, scheduleController.getScheduleById);
router.put("/:scheduleId", authMiddleware, requireRole("manager"), scheduleController.updateSchedule);
router.delete("/:scheduleId", authMiddleware, requireRole("manager"), scheduleController.deleteSchedule);

module.exports = router;
