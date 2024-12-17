import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { firestore } from "../firebase";
import { SendIcon, TrashIcon, PlusIcon } from "lucide-react";
import axios from "axios";

const Chatbot = () => {
  const { user } = useAuth();
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // State variables
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [sessionName, setSessionName] = useState("New Session");
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Error handler
  const handleError = useCallback((error) => {
    console.error("Detailed Error:", error);
    setError(error.message || "An unexpected error occurred");
    setIsLoading(false);
  }, []);

  // Create a new session
  const createNewSession = useCallback(async () => {
    if (!user) return navigate("/login");
    try {
      const sessionsRef = collection(firestore, "users", user.uid, "chatSessions");
      const newSessionRef = await addDoc(sessionsRef, {
        name: "New Session",
        messages: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCurrentSessionId(newSessionRef.id);
      setSessionName("New Session");
      setMessages([]);
      navigate(`/dashboard/chatbot/${newSessionRef.id}`);
    } catch (error) {
      handleError(error);
    }
  }, [user, navigate, handleError]);

  // Fetch an existing session
  const fetchSession = useCallback(async (sessionId) => {
    if (!user) return navigate("/login");
    try {
      const sessionRef = doc(firestore, "users", user.uid, "chatSessions", sessionId);
      const sessionDoc = await getDoc(sessionRef);

      if (sessionDoc.exists()) {
        const sessionData = sessionDoc.data();
        setSessionName(sessionData.name || "New Session");
        setMessages(
          sessionData.messages.map((msg) => ({
            sender: msg.role === "user" ? "You" : "Bot",
            text: msg.content,
          }))
        );
      } else {
        createNewSession();
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [user, createNewSession, navigate, handleError]);

  // Initialize session
  useEffect(() => {
    if (currentSessionId && user) {
      fetchSession(currentSessionId);
    } else if (user) {
      createNewSession();
    }
  }, [user, currentSessionId, fetchSession, createNewSession]);

  // Delete the current session
  const handleDeleteSession = async () => {
    if (!currentSessionId) return;
    try {
      const sessionRef = doc(firestore, "users", user.uid, "chatSessions", currentSessionId);
      await deleteDoc(sessionRef);
      createNewSession(); // Start a new session after deletion
    } catch (error) {
      handleError(error);
    }
  };

  // Send a message
  const handleSend = async () => {
    if (!userInput.trim() || !user || !currentSessionId) return;

    const userMessage = { sender: "You", text: userInput };

    try {
      // Optimistic update
      setMessages((prev) => [...prev, userMessage]);

      const firestoreMessages = [
        ...messages.map((msg) => ({
          role: msg.sender === "You" ? "user" : "assistant",
          content: msg.text,
        })),
        { role: "user", content: userInput },
      ];

      // Call AI API
      const response = await axios.post("http://localhost:5000/api/chat", {
        sessionId: currentSessionId,
        prompt: userInput,
        messages: firestoreMessages,
        userId: user.uid,
      });

      const botMessage = { sender: "Bot", text: response.data.botReply };

      // Update Firestore
      const sessionRef = doc(firestore, "users", user.uid, "chatSessions", currentSessionId);
      await updateDoc(sessionRef, {
        messages: [
          ...firestoreMessages,
          { role: "assistant", content: response.data.botReply },
        ],
        updatedAt: serverTimestamp(),
      });

      // Set session name from the first message
      if (sessionName === "New Session") {
        setSessionName(userInput);
        await updateDoc(sessionRef, { name: userInput });
      }

      setMessages((prev) => [...prev, botMessage]);
      setUserInput("");
    } catch (error) {
      handleError(error);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-4 bg-gray-800">
        <h1 className="text-xl font-bold text-[#f06937]">{sessionName}</h1>
        <div className="flex gap-4">
          <button
            onClick={createNewSession}
            className="p-2 bg-[#f06937] text-black rounded hover:opacity-90 flex items-center gap-1"
          >
            <PlusIcon className="w-5 h-5" />
            New Chat
          </button>
          <button
            onClick={handleDeleteSession}
            className="p-2 bg-red-600 text-white rounded hover:opacity-90 flex items-center gap-1"
          >
            <TrashIcon className="w-5 h-5" />
            Delete
          </button>
        </div>
      </nav>

      {/* Chat Messages */}
      <div className="flex-grow p-4 space-y-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.sender === "You" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`p-3 rounded-lg max-w-xs ${
                msg.sender === "You"
                  ? "bg-[#f06937] text-black"
                  : "bg-gray-800 text-white"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input */}
      <div className="p-4 bg-gray-800 border-t border-gray-700 flex">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your message..."
          className="flex-1 p-3 bg-gray-700 rounded-l focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="bg-[#f06937] text-black px-4 rounded-r hover:opacity-90"
        >
          <SendIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
