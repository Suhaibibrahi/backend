/***************************************************************
 * routes/scheduleRoutes.js
 ***************************************************************/
const express = require("express");
const router = express.Router();

// We'll need a scheduleController (to be created next)
const scheduleController = require("../controllers/scheduleController");

// Auth middlewares
const { authMiddleware, requireRole } = require("../utils/authHelpers");
// or wherever your auth middleware is exported from

///////////////////////////////////////////////////////
// SCHEDULE Routes
///////////////////////////////////////////////////////

// 1) Create a Schedule (admin or manager? owner? your call)
router.post("/", authMiddleware, requireRole("manager"), scheduleController.createSchedule);

// 2) Get all schedules (any logged-in user can see)
router.get("/", authMiddleware, scheduleController.getAllSchedules);

// 3) Get a single schedule by ID
router.get("/:scheduleId", authMiddleware, scheduleController.getScheduleById);

// 4) Update a schedule (manager or admin)
router.put("/:scheduleId", authMiddleware, requireRole("manager"), scheduleController.updateSchedule);

// 5) Delete a schedule (manager or admin)
router.delete("/:scheduleId", authMiddleware, requireRole("manager"), scheduleController.deleteSchedule);

module.exports = router;
