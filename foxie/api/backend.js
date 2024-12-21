import express from "express";
import axios from "axios";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") });
console.log("Environment Variables Loaded:", process.env.OPENAI_API_KEY);
// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const app = express();
app.use(express.json());
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://your-vercel-project-domain.vercel.app"] // Replace with your actual domain
    : ["http://localhost:3000"];

app.use(cors({ origin: allowedOrigins }));

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

// Load Firebase service account key dynamically
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Route to handle chat and update a session
app.post("/api/chat", async (req, res) => {
  const { sessionId, prompt, messages, userId } = req.body;

  if (!prompt || !userId) {
    return res.status(400).json({ error: "Prompt and userId are required." });
  }

  try {
    const sessionRef = db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: "Session not found" });
    }

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          ...messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: "user", content: prompt },
        ],
        max_tokens: 150,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const botReply = response.data.choices[0].message.content.trim();

    // Prepare updated session data
    const updatedSessionData = {
      id: sessionId,
      name: messages.length === 0 ? prompt : sessionDoc.data().name || prompt,
      messages: [
        ...messages,
        { role: "user", content: prompt },
        { role: "assistant", content: botReply },
      ],
      updatedAt: admin.firestore.Timestamp.now(),
    };

    // Update the session in Firestore
    await sessionRef.update({
      messages: updatedSessionData.messages,
      name: updatedSessionData.name,
      updatedAt: updatedSessionData.updatedAt,
    });

    res.json({
      botReply,
      session: updatedSessionData,
    });
  } catch (error) {
    console.error("Error:", error.stack || error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

// Route to fetch user's sessions
app.get("/api/sessions", async (req, res) => {
  const { userId } = req.query;

  console.log("Received userId:", userId); // Debug log

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    const sessionsSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .orderBy("updatedAt", "desc")
      .limit(10)
      .get();

    const sessions = sessionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("Fetched sessions:", sessions); // Debug log

    res.json(sessions);
  } catch (error) {
    console.error("Detailed error fetching sessions:", error);
    res.status(500).json({
      error: "Failed to fetch sessions",
      details: error.message,
    });
  }
});
// Route to fetch a single session by ID
app.get("/api/sessions/:sessionId", async (req, res) => {
  const { userId } = req.query;
  const { sessionId } = req.params;

  if (!userId || !sessionId) {
    return res
      .status(400)
      .json({ error: "User ID and Session ID are required." });
  }

  try {
    const sessionRef = db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .doc(sessionId);

    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({ id: sessionDoc.id, ...sessionDoc.data() });
  } catch (error) {
    console.error("Error fetching single session:", error);
    res.status(500).json({
      error: "Failed to fetch session",
      details: error.message,
    });
  }
});
// Route to create a new session
app.post("/api/sessions", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    const newSession = {
      name: "New Chat Session",
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const sessionRef = await db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .add(newSession);

    res.status(201).json({ id: sessionRef.id, ...newSession });
  } catch (error) {
    console.error("Error creating session:", error.message);
    res.status(500).json({ error: "Failed to create a session." });
  }
});
app.delete("/api/sessions/:sessionId", async (req, res) => {
  const { userId } = req.query;
  const { sessionId } = req.params;

  if (!userId || !sessionId) {
    return res
      .status(400)
      .json({ error: "User ID and Session ID are required." });
  }

  try {
    const sessionRef = db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .doc(sessionId);

    // Check if session exists before deleting
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: "Session not found" });
    }

    await sessionRef.delete();

    res.status(200).json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("Error deleting session:", error.message);
    res
      .status(500)
      .json({ error: "Failed to delete session", details: error.message });
  }
});
// In your server code
app.post("/api/notes/sync", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    const notesRef = db.collection("users").doc(userId).collection("notes");
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

app.post("/api/deleteFile", async (req, res) => {
  try {
    const { publicId, resourceType = "auto" } = req.body;

    console.log("Attempting to delete:", { publicId, resourceType }); // Add logging

    // Verify the file exists before attempting deletion
    try {
      await cloudinary.api.resource(publicId, { resource_type: resourceType });
    } catch (error) {
      if (error.http_code === 404) {
        return res.json({ message: "File already deleted" });
      }
      console.error("Error checking resource:", error);
      throw error;
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result === "ok") {
      res.json({ message: "File deleted successfully" });
    } else {
      throw new Error("Failed to delete file from Cloudinary");
    }
  } catch (error) {
    console.error("Error in deleteFile:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
      details: error.toString(),
    });
  }
});

// Start the server
console.log("API server is ready for Vercel deployment!");
