import express from "express";
import axios from "axios";
import cors from "cors";
import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());

// Load Firebase service account key dynamically
const serviceAccount = JSON.parse(
    fs.readFileSync("./serviceAccountKey.json", "utf-8")
);

// Initialize Firebase Admin with Service Account
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Route to handle chat and update a session
app.post("/api/chat", async(req, res) => {
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
            "https://api.openai.com/v1/chat/completions", {
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
            }, {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const botReply = response.data.choices[0].message.content.trim();

        res.json({ botReply });
    } catch (error) {
        console.error("OpenAI API error:", error.message);
        res.status(500).json({ error: "Error communicating with OpenAI API." });
    }
});

// Route to fetch user's sessions
app.get("/api/sessions", async(req, res) => {
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
            .limit(10)
            .get();

        const sessions = sessionsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.json(sessions);
    } catch (error) {
        console.error("Error fetching sessions:", error.message);
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
});

// Route to create a new session
app.post("/api/sessions", async(req, res) => {
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(
        `OpenAI API Key Loaded: ${process.env.OPENAI_API_KEY ? "Yes" : "No"}`
    );
});