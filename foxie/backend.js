const express = require("express");
const axios = require("axios");
const cors = require("cors"); // Add CORS for frontend-backend communication
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors()); // Allow frontend requests

app.post("/api/chat", async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      {
        model: "text-davinci-003",
        prompt: req.body.prompt,
        max_tokens: 100,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer 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`, // Replace with your actual API key
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error(
      "OpenAI API error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).send("Error communicating with OpenAI API.");
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
