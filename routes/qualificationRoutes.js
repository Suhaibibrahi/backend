/***************************************************************
 * routes/qualificationRoutes.js
 ***************************************************************/
const express = require("express");
const router = express.Router();

// import your controller
const qualificationController = require("../controllers/qualificationController");

// import your auth middleware
const { authMiddleware, requireRole } = require("../utils/authHelpers");
// Or if you export them directly from server.js, then import from "../server"

///////////////////////////////////////////////////////
// Qualification Routes
///////////////////////////////////////////////////////

// e.g. Only "owner" or "admin" can add or remove qualifications
// You decide how you want your roles

// 1) Add a qualification
router.post("/:userId", authMiddleware, requireRole("owner"), qualificationController.addQualification);

// 2) Remove a qualification
router.delete("/:userId/:qualificationId", authMiddleware, requireRole("owner"), qualificationController.removeQualification);

// 3) List a user's qualifications
// Perhaps the user themself or admin can see it (just an example)
router.get("/:userId", authMiddleware, /*requireRole("admin"),*/ qualificationController.getUserQualifications);

module.exports = router;
