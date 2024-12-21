import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  collection, 
  doc, 
  getDoc, 
  query, 
  getDocs,
  deleteDoc,
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { firestore } from "../firebase";
import { SendIcon, TrashIcon, PlusIcon, EditIcon, LoaderIcon } from "lucide-react";
import axios from "axios";

const LoadingScreen = ({ text }) => (
  <div className="flex justify-center items-center h-screen bg-gray-900">
    <div className="flex flex-col items-center">
      <LoaderIcon className="w-16 h-16 animate-spin text-[#f06937] mb-4" />
      <p className="text-white">{text}</p>
    </div>
  </div>
);

const Chatbot = ({ isSidebarExpanded, sidebarRef }) => {
  const { user } = useAuth();
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // State variables
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [sessionName, setSessionName] = useState("New Session");
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [error, setError] = useState(null);
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState(null);
  const [isFirstEverSession, setIsFirstEverSession] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;


  // Error handler
  const handleError = useCallback((error) => {
    console.error("Detailed Error:", error);
    setError(error.message || "An unexpected error occurred");
    setIsLoading(false);
  }, []);

  // Check if it's the user's first ever session
  const checkFirstEverSession = useCallback(async () => {
    if (!user) return false;
    try {
      const sessionsRef = collection(firestore, "users", user.uid, "chatSessions");
      const q = query(sessionsRef);
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error("Error checking first session:", error);
      return false;
    }
  }, [user]);

  // Create a new session
  const createNewSession = useCallback(async () => {
    if (!user) return navigate("/login");
    try {
      setIsCreatingSession(true);
      const response = await axios.post("${API_URL}/api/sessions", {
        userId: user.uid,
      });

      // Add the new session to the sidebar
      if (sidebarRef && sidebarRef.current && sidebarRef.current.addSessionToList) {
        sidebarRef.current.addSessionToList(response.data);
      }

      setCurrentSessionId(response.data.id);
      setSessionName("New Session");
      setMessages([]);
      navigate(`/dashboard/chatbot/${response.data.id}`);
    } catch (error) {
      console.error("Error creating new session:", error);
      setError("Failed to create a new session");
    } finally {
      setIsCreatingSession(false);
    }
  }, [user, navigate, sidebarRef]);

  // Delete the current session
  const handleDeleteSession = async () => {
    if (!currentSessionId || !user) return;
    
    try {
      setIsDeletingSession(true);
      
      // Delete session from backend
      await axios.delete(`${API_URL}/api0/sessions/${currentSessionId}`, {
        params: { userId: user.uid }
      });
  
      // Remove the session from the sidebar list if sidebarRef is available
      if (sidebarRef && sidebarRef.current && sidebarRef.current.removeSessionFromList) {
        sidebarRef.current.removeSessionFromList(currentSessionId);
      }
  
      // Delete from Firestore as well
      const sessionRef = doc(firestore, "users", user.uid, "chatSessions", currentSessionId);
      await deleteDoc(sessionRef);
  
      // Redirect to dashboard after deletion
      navigate("/dashboard");
    } catch (error) {
      console.error("Error deleting session:", error.message);
      setError("Failed to delete session. Please try again.");
    } finally {
      setIsDeletingSession(false);
    }
  };

 // Fetch an existing session
const fetchSession = useCallback(async (sessionId) => {
  if (!user) return navigate("/login");
  
  // Reset all relevant state before fetching
  setMessages([]);
  setSessionName("New Session");
  setIsLoading(true);

  try {
    const isFirstSession = await checkFirstEverSession();
    setIsFirstEverSession(isFirstSession);

    const sessionRef = doc(firestore, "users", user.uid, "chatSessions", sessionId);
    const sessionDoc = await getDoc(sessionRef);

    if (sessionDoc.exists()) {
      const sessionData = sessionDoc.data();
      setSessionName(sessionData.name || "New Session");
      setMessages(
        (sessionData.messages || []).map((msg) => ({
          sender: msg.role === "user" ? "You" : "Bot",
          text: msg.content,
          id: msg.id || crypto.randomUUID(), 
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
}, [user, createNewSession, navigate, handleError, checkFirstEverSession]);

// Modify useEffect to have sessionId as a direct dependency
useEffect(() => {
  // Force a full reload when sessionId changes
  if (user) {
    fetchSession(sessionId);
  }
}, [user, sessionId, fetchSession]);

  // Delete a specific message
  const handleDeleteMessage = async (index) => {
    const updatedMessages = [...messages];
    updatedMessages.splice(index, 1);
    setMessages(updatedMessages);

    try {
      const firestoreMessages = updatedMessages.map((msg) => ({
        role: msg.sender === "You" ? "user" : "assistant",
        content: msg.text,
        id: msg.id,
      }));

      const sessionRef = doc(firestore, "users", user.uid, "chatSessions", currentSessionId);
      await updateDoc(sessionRef, {
        messages: firestoreMessages,
        updatedAt: serverTimestamp(),
      });

      // Regenerate conversation from remaining messages
      if (index % 2 === 0 && index > 0) { // If user message is deleted
        await regenerateConversation(updatedMessages.slice(0, index));
      }
    } catch (error) {
      handleError(error);
    }
  };

  // Regenerate conversation based on remaining messages
  const regenerateConversation = async (remainingMessages) => {
    try {
      const lastUserMessage = remainingMessages.findLast(msg => msg.sender === "You");
      if (!lastUserMessage) return;
  
      const firestoreMessages = remainingMessages.map((msg) => ({
        role: msg.sender === "You" ? "user" : "assistant",
        content: msg.text,
      }));
  
      const response = await axios.post("${API_URL}/api/chat", {
        sessionId: currentSessionId,
        prompt: lastUserMessage.text,
        messages: firestoreMessages,
        userId: user.uid,
      });
  
      const botMessage = { 
        sender: "Bot", 
        text: response.data.botReply,
        id: crypto.randomUUID(),
      };
  
      const updatedMessages = [...remainingMessages, botMessage];
      setMessages(updatedMessages);
  
      const sessionRef = doc(firestore, "users", user.uid, "chatSessions", currentSessionId);
      await updateDoc(sessionRef, {
        messages: updatedMessages.map((msg) => ({
          role: msg.sender === "You" ? "user" : "assistant",
          content: msg.text,
          id: msg.id,
        })),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleError(error);
    }
  };

  // Edit a message
  const handleEditMessage = async (index, newText) => {
    const updatedMessages = [...messages];
    updatedMessages[index].text = newText;
    setMessages(updatedMessages);
    setEditingMessageIndex(null);
  
    try {
      const firestoreMessages = updatedMessages.map((msg) => ({
        role: msg.sender === "You" ? "user" : "assistant",
        content: msg.text,
        id: msg.id,
      }));
  
      const sessionRef = doc(firestore, "users", user.uid, "chatSessions", currentSessionId);
      await updateDoc(sessionRef, {
        messages: firestoreMessages,
        updatedAt: serverTimestamp(),
      });
  
      // Regenerate conversation if user message is edited
      if (index % 2 === 0) {
        await regenerateConversation(updatedMessages.slice(0, index + 1));
      }
    } catch (error) {
      handleError(error);
    }
  };

  // Handle sending a message
  const handleSend = async () => {
    if (!userInput.trim() || !user || !currentSessionId) return;
  
    const userMessage = { 
      sender: "You", 
      text: userInput,
      id: crypto.randomUUID(),
    };
  
    try {
      // Optimistic update
      setMessages((prev) => [...prev, userMessage]);
  
      const firestoreMessages = [
        ...messages.map((msg) => ({
          role: msg.sender === "You" ? "user" : "assistant",
          content: msg.text,
          id: msg.id,
        })),
        { role: "user", content: userInput },
      ];
  
      // Call AI API
      const response = await axios.post(`${API_URL}/api/chat`, {
        sessionId: currentSessionId,
        prompt: userInput,
        messages: firestoreMessages,
        userId: user.uid,
      });
  
      const botMessage = { 
        sender: "Bot", 
        text: response.data.botReply,
        id: crypto.randomUUID(),
      };
  
      // Update Firestore
      const sessionRef = doc(firestore, "users", user.uid, "chatSessions", currentSessionId);
      
      // Update data object
      const updateData = {
        messages: [
          ...firestoreMessages,
          { role: "assistant", content: response.data.botReply, id: botMessage.id },
        ],
        updatedAt: serverTimestamp(),
      };
  
      // Only update name if it's the first message 
      // For the very first session ever, we want to add to sidebar
      // For subsequent sessions, just update the name
      if (messages.length === 0) {
        // If it's the first ever session, keep "New Session"
        // Otherwise, update name to first message
        updateData.name = isFirstEverSession ? "New Session" : userInput;
        setSessionName(isFirstEverSession ? "New Session" : userInput);

        // Only add to sidebar if it's the first ever session
        if (isFirstEverSession && sidebarRef?.current?.addSessionToList) {
          const updatedSession = await axios.get(`${API_URL}/api/sessions/${currentSessionId}`, {
            params: { userId: user.uid }
          });
          sidebarRef.current.addSessionToList(updatedSession.data);
        }
      }
  
      await updateDoc(sessionRef, updateData);
  
      setMessages((prev) => [...prev, botMessage]);
      setUserInput("");
    } catch (error) {
      console.error("Detailed Error sending message:", error);
      
      // More informative error handling
      if (error.response) {
        alert(`Error: ${error.response.data.error || 'Failed to send message'}`);
      } else if (error.request) {
        alert('No response received from server. Check your connection.');
      } else {
        alert('Error setting up the message request');
      }
    }
  };

  if (isCreatingSession) return <LoadingScreen text="Creating new session..." />;
  if (isLoading) return <LoadingScreen text="Loading..." />;
  if (isDeletingSession) return <LoadingScreen text="Deleting session..." />;

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
            disabled={isDeletingSession}
            className="p-2 bg-red-600 text-white rounded hover:opacity-90 flex items-center gap-1 disabled:opacity-50"
          >
            <TrashIcon className="w-5 h-5" />
            Delete Session
          </button>
        </div>
      </nav>

      {/* Chat Messages */}
      <div className="flex-grow p-4 space-y-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex relative group ${msg.sender === "You" ? "justify-end" : "justify-start"}`}
            onMouseEnter={() => setHoveredMessageIndex(index)}
            onMouseLeave={() => setHoveredMessageIndex(null)}
          >
            {/* Message Options Menu */}
            {hoveredMessageIndex === index && (
              <div className="absolute top-0 right-0 flex space-x-2 bg-gray-700 p-1 rounded-full">
                <button 
                  onClick={() => setEditingMessageIndex(index)}
                  className="text-white hover:text-[#f06937]"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteMessage(index)}
                  className="text-white hover:text-red-500"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Message Content or Edit Input */}
            {editingMessageIndex === index ? (
              <div className="flex items-center w-full">
                <input
                  type="text"
                  defaultValue={msg.text}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleEditMessage(index, e.target.value);
                    }
                  }}
                  onBlur={(e) => handleEditMessage(index, e.target.value)}
                  className="flex-1 p-2 bg-gray-700 text-white rounded"
                />
              </div>
            ) : (
              <div
                className={`p-3 rounded-lg max-w-xs ${
                  msg.sender === "You"
                    ? "bg-[#f06937] text-black"
                    : "bg-gray-800 text-white"
                }`}
              >
                {msg.text}
              </div>
            )}
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