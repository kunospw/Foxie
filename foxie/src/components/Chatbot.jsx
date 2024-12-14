import React, { useState } from "react";
import axios from "axios";

const Chatbot = ({ isSidebarExpanded }) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([
    { sender: "Bot", text: "Hi! How can I assist you today?" },
  ]);

  const handleSend = async () => {
    if (userInput.trim()) {
      const userMessage = { sender: "You", text: userInput };

      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await axios.post("http://localhost:5000/api/chat", {
          prompt: userInput, // Send user input to the backend
        });

        const botReply = response.data.choices[0].text.trim(); // Extract the response
        setMessages((prev) => [...prev, { sender: "Bot", text: botReply }]);
      } catch (error) {
        console.error("Error communicating with backend:", error.message);
        setMessages((prev) => [
          ...prev,
          { sender: "Bot", text: "Oops! Something went wrong." },
        ]);
      }

      setUserInput("");
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-white rounded-lg shadow p-6 transition-all duration-300 ${
        isSidebarExpanded ? "pl-64" : "pl-20"
      }`}
    >
      <div className="flex-grow overflow-y-auto mb-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.sender === "You" ? "justify-end" : "justify-start"
            } mb-2`}
          >
            <div
              className={`p-3 rounded-lg max-w-xs ${
                msg.sender === "You"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-black"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-3 border border-gray-300 rounded-l-lg"
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-4 rounded-r-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
