/***************************************************************
 * controllers/scheduleController.js
 * 
 * This file contains CRUD logic for "Flight Schedules" or any
 * scheduling you need in your app.
 ***************************************************************/
const { ObjectId } = require("mongodb");

/**
 * CREATE a Schedule
 */
exports.createSchedule = async (req, res) => {
  try {
    // Example fields, adjust as you like
    const {
      flightNumber,
      aircraftTail,
      missionType,
      date,        // e.g. "2023-12-25"
      startTime,   // e.g. "09:00"
      endTime,     // e.g. "12:00"
      crewMembers, // array of userIds or objects
      notes,
    } = req.body;

    // Basic validation
    if (!flightNumber || !date || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required scheduling info." });
    }

    // Connect to DB
    const db = req.app.locals.db;
    const schedulesColl = db.collection("schedules");

    // Build the schedule document
    const newSchedule = {
      flightNumber,
      aircraftTail: aircraftTail || null,
      missionType: missionType || "Training", // default
      date,
      startTime,
      endTime,
      crewMembers: crewMembers || [], // optional
      notes: notes || "",
      createdAt: new Date(),
      createdBy: req.user.userId, // from JWT
    };

    // Insert
    const result = await schedulesColl.insertOne(newSchedule);

    res.status(201).json({
      message: "Schedule created successfully.",
      scheduleId: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating schedule:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
};

/**
 * GET ALL Schedules
 */
exports.getAllSchedules = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const schedulesColl = db.collection("schedules");

    // Example: get only future schedules, or get them all
    // If you want everything:
    const schedules = await schedulesColl.find({}).sort({ date: 1 }).toArray();

    res.status(200).json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
};

/**
 * GET a single Schedule by ID
 */
exports.getScheduleById = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    if (!ObjectId.isValid(scheduleId)) {
      return res.status(400).json({ message: "Invalid schedule ID." });
    }

    const db = req.app.locals.db;
    const schedulesColl = db.collection("schedules");

    const schedule = await schedulesColl.findOne({ _id: new ObjectId(scheduleId) });
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found." });
    }

    res.status(200).json(schedule);
  } catch (error) {
    console.error("Error fetching schedule:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
};

/**
 * UPDATE a Schedule
 */
exports.updateSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    if (!ObjectId.isValid(scheduleId)) {
      return res.status(400).json({ message: "Invalid schedule ID." });
    }

    // Fields to update
    const {
      flightNumber,
      aircraftTail,
      missionType,
      date,
      startTime,
      endTime,
      crewMembers,
      notes,
    } = req.body;

    const db = req.app.locals.db;
    const schedulesColl = db.collection("schedules");

    // Build update doc (only set fields if provided)
    const updateDoc = {};
    if (flightNumber) updateDoc.flightNumber = flightNumber;
    if (aircraftTail) updateDoc.aircraftTail = aircraftTail;
    if (missionType) updateDoc.missionType = missionType;
    if (date) updateDoc.date = date;
    if (startTime) updateDoc.startTime = startTime;
    if (endTime) updateDoc.endTime = endTime;
    if (crewMembers) updateDoc.crewMembers = crewMembers;
    if (notes) updateDoc.notes = notes;

    const result = await schedulesColl.updateOne(
      { _id: new ObjectId(scheduleId) },
      { $set: updateDoc }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Schedule not found or nothing updated." });
    }

    res.status(200).json({ message: "Schedule updated successfully." });
  } catch (error) {
    console.error("Error updating schedule:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
};

/**
 * DELETE a Schedule
 */
exports.deleteSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    if (!ObjectId.isValid(scheduleId)) {
      return res.status(400).json({ message: "Invalid schedule ID." });
    }

    const db = req.app.locals.db;
    const schedulesColl = db.collection("schedules");

    const result = await schedulesColl.deleteOne({ _id: new ObjectId(scheduleId) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Schedule not found or already deleted." });
    }

    res.status(200).json({ message: "Schedule deleted successfully." });
  } catch (error) {
    console.error("Error deleting schedule:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
};
