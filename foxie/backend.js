import express from "express";
import axios from "axios";
import cors from "cors";
import { v4 as uuidv4 } from "uuid"; // To generate unique session IDs

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());

// Route to fetch all sessions
app.get("/api/sessions", (req, res) => {
  res.json(
    Object.values(sessions).sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt) // Sort by most recent update
    )
  );
});

// Route to create a new session
app.post("/api/sessions", (req, res) => {
  const newSessionId = uuidv4(); // Generate a unique ID
  const newSession = {
    id: newSessionId,
    name: `Session ${Object.keys(sessions).length + 1}`, // Default session name
    messages: [],
    updatedAt: new Date(),
  };

  sessions[newSessionId] = newSession;
  res.status(201).json(newSession);
});

// Route to fetch a specific session by ID
app.get("/api/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;

  if (!sessions[sessionId]) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json(sessions[sessionId]);
});

// Route to handle chat and update a session
app.post("/api/chat", async (req, res) => {
  const { sessionId, prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  // Validate session
  if (!sessionId || !sessions[sessionId]) {
    return res.status(404).json({ error: "Session not found" });
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a helpful assistant." }, // Define chatbot behavior
          ...sessions[sessionId].messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })), // Include previous conversation
          { role: "user", content: prompt }, // Add the user's latest message
        ],
        max_tokens: 150,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer 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`, // Replace with your OpenAI API key
          "Content-Type": "application/json",
        },
      }
    );

    const botReply = response.data.choices[0].message.content.trim();

    // Add user and bot messages to the session
    sessions[sessionId].messages.push(
      { role: "user", content: prompt },
      { role: "assistant", content: botReply }
    );
    sessions[sessionId].updatedAt = new Date();

    res.json({ botReply });
  } catch (error) {
    console.error(
      "OpenAI API error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: "Error communicating with OpenAI API." });
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
