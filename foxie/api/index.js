// api/index.js
import dotenv from "dotenv";
import express from "express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import admin from "firebase-admin";
const app = express();
app.use(express.json());
let db;

const DEFAULT_SESSION_NAME = "New Session";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const CHAT_MODEL = "gpt-4";
const MAX_TOKENS = 150;
const TEMPERATURE = 0.7;

const getResourceType = (fileType) => {
  if (fileType === "application/pdf" || fileType.includes("application/")) {
    return "raw";
  }
  return "image";
};
dotenv.config();

const validateFileSize = (fileSize) => {
  return fileSize <= MAX_FILE_SIZE;
};
// Initialize Firebase Admin

if (!admin.apps.length) {
  try {
    const safeParseEnvJSON = (envVar, varName) => {
      try {
        const parsed = JSON.parse(envVar);
        console.log(`${varName} parsed successfully.`);
        return parsed;
      } catch (error) {
        console.error(`Failed to parse ${varName}:`, error.message);
        throw error;
      }
    };

    const serviceAccount = safeParseEnvJSON(
      process.env.FIREBASE_SERVICE_ACCOUNT,
      "FIREBASE_SERVICE_ACCOUNT"
    );

    // Ensure the private key is formatted correctly
    serviceAccount.private_key = serviceAccount.private_key.replace(
      /\\n/g,
      "\n"
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    // Initialize Firestore database
    db = admin.firestore();
    console.info("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Firebase Admin SDK Initialization Error:", error.message);
    process.exit(1);
  }
}

// Configure Cloudinary
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.error("Missing Cloudinary environment variables.");
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log("Cloudinary Config:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Helper function for checking file existence
async function checkFileExists(publicId, resourceType = "auto") {
  try {
    await cloudinary.api.resource(publicId, {
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

// Chat endpoint
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
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          ...messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: "user", content: prompt },
        ],
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const botReply = response.data.choices[0].message.content.trim();
    const userMessageId = crypto.randomUUID();
    const botMessageId = crypto.randomUUID();

    const updatedSessionData = {
      id: sessionId,
      name:
        messages.length === 0 && !sessionDoc.data().isFirstEverSession
          ? prompt
          : sessionDoc.data().name || DEFAULT_SESSION_NAME,
      messages: [
        ...messages,
        { role: "user", content: prompt, id: userMessageId },
        { role: "assistant", content: botReply, id: botMessageId },
      ],
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await sessionRef.update(updatedSessionData);

    res.json({
      botReply,
      session: updatedSessionData,
    });
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

// Sessions endpoints
app.post("/api/sessions", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    console.warn("Missing userId in request body");
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    const userRef = db.collection("users").doc(userId);
    const sessionsSnapshot = await userRef
      .collection("chatSessions")
      .limit(1)
      .get();

    const isFirstEverSession = sessionsSnapshot.empty;

    const newSession = {
      name: DEFAULT_SESSION_NAME,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      isFirstEverSession,
      messages: [],
    };

    const sessionRef = await userRef.collection("chatSessions").add(newSession);

    console.info(
      `Session created successfully for userId: ${userId}, sessionId: ${sessionRef.id}`
    );
    res.status(201).json({ id: sessionRef.id, ...newSession });
  } catch (error) {
    console.error("Failed to create session for userId:", userId, error);
    res.status(500).json({
      error: "Failed to create a session.",
      details: error.message,
    });
  }
});

app.get("/api/sessions", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    const sessionsSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .orderBy("updatedAt", "desc")
      .get();

    const sessions = [];
    sessionsSnapshot.forEach((doc) => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({
      error: "Failed to fetch sessions",
      details: error.message,
    });
  }
});

app.get("/api/sessions/:sessionId", async (req, res) => {
  const { userId } = req.query;
  const { sessionId } = req.params;

  if (!userId || !sessionId) {
    return res
      .status(400)
      .json({ error: "User ID and Session ID are required." });
  }

  try {
    const sessionDoc = await db
      .collection("users")
      .doc(userId)
      .collection("chatSessions")
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({ id: sessionDoc.id, ...sessionDoc.data() });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch session",
      details: error.message,
    });
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

    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: "Session not found" });
    }

    await sessionRef.delete();
    res.status(200).json({ message: "Session deleted successfully" });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete session",
      details: error.message,
    });
  }
});

// Notes endpoints
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
    res.status(500).json({ error: "Failed to sync notes" });
  }
});

app.post("/api/deleteFile", async (req, res) => {
  const { publicId, fileType, fileSize } = req.body;

  try {
    // Validate file size if provided
    if (fileSize && !validateFileSize(fileSize)) {
      return res.status(400).json({
        error: "File size exceeds limit",
        details: "Maximum file size is 10MB",
      });
    }

    const resourceType = getResourceType(fileType);

    try {
      await cloudinary.api.resource(publicId, { resource_type: resourceType });
    } catch (error) {
      if (error.http_code === 404) {
        return res.json({
          status: "success",
          message: "File not found, no action taken",
        });
      }
      throw error;
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result === "ok") {
      return res.json({
        status: "success",
        message: "File deleted successfully",
      });
    }

    throw new Error("Failed to delete file from Cloudinary");
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete file",
      details: error.message,
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", {
    message: err.message,
    stack: err.stack,
    route: req.originalUrl,
  });
  res.status(500).json({
    error: "Internal Server Error",
    details: err.message || "An unexpected error occurred.",
  });
});

export default app;
