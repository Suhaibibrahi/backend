/***************************************************************
 * controllers/fcifController.js
 * 
 * This file contains the logic (CRUD) for FCIF documents
 * “FCIF” stands for “Flight Crew Information File” (or similar).
 ***************************************************************/

const { ObjectId } = require("mongodb"); // if needed

/**
 * CREATE FCIF
 */
exports.createFCIF = async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required." });
    }

    // Access the DB via req.app.locals.db if you set it that way,
    // or directly from your server if you exported it. 
    // For simplicity, let’s do a quick approach:
    const db = req.app.locals.db; 
    const fcifsColl = db.collection("fcifs");

    const newFCIF = {
      title,
      content,
      createdAt: new Date(),
    };

    const result = await fcifsColl.insertOne(newFCIF);

    return res.status(201).json({
      message: "FCIF created successfully.",
      fcifId: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating FCIF:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
};

/**
 * GET ALL FCIFs
 */
exports.getAllFCIFs = async (req, res) => {
  try {
    const db = req.app.locals.db;
    const fcifsColl = db.collection("fcifs");

    const fcifs = await fcifsColl.find({}).sort({ createdAt: -1 }).toArray();

    res.status(200).json(fcifs);
  } catch (error) {
    console.error("Error fetching FCIFs:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
};

/**
 * ACKNOWLEDGE FCIF
 * e.g., user “signs” or acknowledges they’ve read it
 */
exports.acknowledgeFCIF = async (req, res) => {
  try {
    const { fcifId } = req.params;
    const userId = req.user.userId; // from JWT

    if (!fcifId) {
      return res.status(400).json({ message: "FCIF ID is required." });
    }

    const db = req.app.locals.db;
    const fcifsColl = db.collection("fcifs");

    // Suppose we store acknowledgments as an array of userIds
    const fcif = await fcifsColl.findOne({ _id: new ObjectId(fcifId) });
    if (!fcif) {
      return res.status(404).json({ message: "FCIF not found." });
    }

    // If we want to store "acknowledgedBy" array
    await fcifsColl.updateOne(
      { _id: fcif._id },
      { 
        $addToSet: { acknowledgedBy: userId } 
        // addToSet means: push userId if it doesn't exist
      }
    );

    res.status(200).json({ message: "FCIF acknowledged successfully." });
  } catch (error) {
    console.error("Error acknowledging FCIF:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
};

/**
 * DELETE FCIF
 * Admin/Owner usage only
 */
exports.deleteFCIF = async (req, res) => {
  try {
    const { fcifId } = req.params;

    if (!fcifId) {
      return res.status(400).json({ message: "FCIF ID is required." });
    }

    const db = req.app.locals.db;
    const fcifsColl = db.collection("fcifs");

    const result = await fcifsColl.deleteOne({ _id: new ObjectId(fcifId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "FCIF not found or already deleted." });
    }

    res.status(200).json({ message: "FCIF deleted successfully." });
  } catch (error) {
    console.error("Error deleting FCIF:", error.message);
    res.status(500).json({ message: "An error occurred." });
  }
};
