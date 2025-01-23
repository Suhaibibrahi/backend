/***************************************************************
 * controllers/qualificationController.js
 ***************************************************************/
const { ObjectId } = require("mongodb");

exports.addQualification = async (req, res) => {
  try {
    // Who we are adding a qualification to:
    const { userId } = req.params;

    // Validate userId
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    // The data in the request body
    const { type, subType } = req.body;
    // Example: type = "Pilot", subType = "InstructorPilot"

    if (!type) {
      return res.status(400).json({ message: "Qualification 'type' is required." });
    }

    // Grab your db instance from app.locals
    const db = req.app.locals.db;
    const usersColl = db.collection("users");

    // Build a sub-document to push
    const newQual = {
      _id: new ObjectId(),    // a unique ID for this qualification
      type,                   // e.g. "Pilot", "Loadmaster"
      subType: subType || "", // e.g. "MissionPilot", "InstructorPilot", or empty
      assignedOn: new Date(),
      assignedBy: req.user.userId, // from JWT
    };

    // Update the user's doc, pushing into qualifications array
    const result = await usersColl.updateOne(
      { _id: new ObjectId(userId) },
      { $push: { qualifications: newQual } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "User not found or nothing changed." });
    }

    return res.status(200).json({ message: "Qualification added successfully." });
  } catch (error) {
    console.error("Error adding qualification:", error.message);
    return res.status(500).json({ message: "An error occurred." });
  }
};

exports.removeQualification = async (req, res) => {
  try {
    const { userId, qualificationId } = req.params;

    if (!ObjectId.isValid(userId) || !ObjectId.isValid(qualificationId)) {
      return res.status(400).json({ message: "Invalid user or qualification ID." });
    }

    const db = req.app.locals.db;
    const usersColl = db.collection("users");

    // $pull by _id from the qualifications array
    const result = await usersColl.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { qualifications: { _id: new ObjectId(qualificationId) } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "User or qualification not found." });
    }

    return res.status(200).json({ message: "Qualification removed successfully." });
  } catch (error) {
    console.error("Error removing qualification:", error.message);
    return res.status(500).json({ message: "An error occurred." });
  }
};

exports.getUserQualifications = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const db = req.app.locals.db;
    const usersColl = db.collection("users");

    // If you only allow the user themselves or an admin to see qualifications, check here:
    // If you want to allow only the user or admin/owner:
    // if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.userId !== userId) {
    //   return res.status(403).json({ message: "Not allowed to view these qualifications." });
    // }

    const user = await usersColl.findOne(
      { _id: new ObjectId(userId) },
      { projection: { qualifications: 1, personalEmail: 1 } }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      userId,
      personalEmail: user.personalEmail,
      qualifications: user.qualifications || [],
    });
  } catch (error) {
    console.error("Error getting user qualifications:", error.message);
    return res.status(500).json({ message: "An error occurred." });
  }
};
