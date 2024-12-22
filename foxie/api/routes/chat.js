import express from "express";
import admin from "firebase-admin";
import axios from "axios";

const router = express.Router();

// Route to handle chat and update a session
router.post("/", async (req, res) => {
  const { sessionId, prompt, messages, userId } = req.body;

  if (!prompt || !userId) {
    return res.status(400).json({ error: "Prompt and userId are required." });
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

export default router;
