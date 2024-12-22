import express from "express";
import admin from "firebase-admin";

const router = express.Router();

// Route to fetch user's sessions
router.get("/", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    const sessionsSnapshot = await admin
      .firestore()
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

    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({
      error: "Failed to fetch sessions",
      details: error.message,
    });
  }
});

// Route to fetch a single session by ID
router.get("/:sessionId", async (req, res) => {
  const { userId } = req.query;
  const { sessionId } = req.params;

  if (!userId || !sessionId) {
    return res
      .status(400)
      .json({ error: "User ID and Session ID are required." });
  }

  try {
    const sessionRef = admin
      .firestore()
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
router.post("/", async (req, res) => {
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

    const sessionRef = await admin
      .firestore()
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

// Route to delete a session
router.delete("/:sessionId", async (req, res) => {
  const { userId } = req.query;
  const { sessionId } = req.params;

  if (!userId || !sessionId) {
    return res
      .status(400)
      .json({ error: "User ID and Session ID are required." });
  }

  try {
    const sessionRef = admin
      .firestore()
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

export default router;
