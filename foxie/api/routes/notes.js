import express from "express";
import { v2 as cloudinary } from "cloudinary";
import admin from "firebase-admin";

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function checkFileExists(publicId, resourceType = "auto") {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
    });
    return true;
  } catch (error) {
    if (error.http_code === 404) {
      return false;
    }
    throw error;
  }
}

// Route to sync notes
router.post("/sync", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    const notesRef = admin
      .firestore()
      .collection("users")
      .doc(userId)
      .collection("notes");
    const notesSnapshot = await notesRef.get();

    const syncResults = {
      synced: 0,
      removed: 0,
      errors: [],
    };

    for (const doc of notesSnapshot.docs) {
      const note = doc.data();
      try {
        const fileExists = await checkFileExists(
          note.publicId,
          note.resourceType || "image"
        );

        if (!fileExists) {
          await notesRef.doc(doc.id).delete();
          syncResults.removed++;
        } else {
          syncResults.synced++;
        }
      } catch (error) {
        syncResults.errors.push({
          noteId: doc.id,
          error: error.message,
        });
      }
    }

    res.json(syncResults);
  } catch (error) {
    console.error("Error syncing notes:", error);
    res.status(500).json({ error: "Failed to sync notes" });
  }
});

// Route to delete file
router.post("/deleteFile", async (req, res) => {
  const { publicId, resourceType = "auto" } = req.body;

  try {
    console.log("Attempting to delete:", { publicId, resourceType });

    try {
      await cloudinary.api.resource(publicId, { resource_type: resourceType });
    } catch (error) {
      if (error.http_code === 404) {
        console.warn("File not found, skipping deletion.");
        return res.json({ message: "File not found, no action taken." });
      }
      throw error;
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result === "ok") {
      return res.json({ message: "File deleted successfully" });
    }

    throw new Error("Failed to delete file from Cloudinary");
  } catch (error) {
    console.error("Error in deleteFile:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

export default router;
