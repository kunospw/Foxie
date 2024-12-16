import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from "firebase/firestore";
import { firestore } from "../firebase";
import { SendIcon } from "lucide-react";

const Chatbot = ({ isSidebarExpanded }) => {
  const { user } = useAuth();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [sessionName, setSessionName] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);

  // Fetch messages for the session when sessionId changes
  useEffect(() => {
    const fetchOrCreateSession = async () => {
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        let sessionDoc;
        
        // If no sessionId provided, try to find or create a new session
        if (!currentSessionId) {
          // Find the most recent session for the user
          const sessionsRef = collection(firestore, "sessions");
          const q = query(
            sessionsRef, 
            where("userId", "==", user.uid), 
            where("isActive", "==", true)
          );
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Use the most recent session
            sessionDoc = querySnapshot.docs[0];
            setCurrentSessionId(sessionDoc.id);
          } else {
            // Create a new session if no active sessions exist
            const newSessionRef = await addDoc(collection(firestore, "sessions"), {
              userId: user.uid,
              name: `New Session ${new Date().toLocaleDateString()}`,
              messages: [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              isActive: true
            });
            
            setCurrentSessionId(newSessionRef.id);
            navigate(`/dashboard/chatbot/${newSessionRef.id}`);
          }
        } else {
          // Fetch existing session
          const sessionRef = doc(firestore, "sessions", currentSessionId);
          sessionDoc = await getDoc(sessionRef);
          
          // Validate session belongs to current user
          if (!sessionDoc.exists() || sessionDoc.data().userId !== user.uid) {
            throw new Error("Unauthorized access");
          }
        }

        // Set session messages and name
        if (sessionDoc.exists()) {
          const sessionData = sessionDoc.data();
          setSessionName(sessionData.name);
          setMessages(
            sessionData.messages.map((msg) => ({
              sender: msg.role === "user" ? "You" : "Bot",
              text: msg.content,
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching/creating session:", error);
        navigate("/dashboard");
      }
    };

    fetchOrCreateSession();
  }, [currentSessionId, user, navigate]);

const handleSend = async () => {
    if (!userInput.trim() || !user) return;

    try {
      const userMessage = { sender: "You", text: userInput };
      const sessionRef = doc(firestore, "sessions", currentSessionId);

      // Add user message to local state
      setMessages((prev) => [...prev, userMessage]);

      // Call your AI service (replace with actual AI service call)
      const botReply = await callAIService(userInput);

      // Update Firestore session with new messages
      await updateDoc(sessionRef, {
        messages: [
          ...messages.map(msg => ({
            role: msg.sender === "You" ? "user" : "assistant", 
            content: msg.text
          })),
          { role: "user", content: userInput },
          { role: "assistant", content: botReply }
        ],
        updatedAt: serverTimestamp()
      });

      // Add bot reply to local state
      setMessages((prev) => [...prev, { sender: "Bot", text: botReply }]);
      setUserInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "Bot", text: "Oops! Something went wrong." },
      ]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-gray-900 text-white rounded-lg shadow transition-all duration-300 ${
        isSidebarExpanded ? "pl-64" : "pl-20"
      }`}
    >
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="text-xl font-bold text-[#f06937]">
          {sessionName || "New Session"}
        </h2>
      </div>

      {/* Chat Messages */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.sender === "You" ? "justify-end" : "justify-start"
            }`}
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
      <div className="flex p-4 border-t border-gray-800">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1 p-3 bg-gray-800 text-white border border-gray-700 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-[#f06937]"
        />
        <button
          onClick={handleSend}
          className="bg-[#f06937] text-black px-4 rounded-r-lg hover:opacity-90 transition-opacity"
        >
          <SendIcon className="w-6 h-6" />
          </button>
      </div>
    </div>
  );
};

export default Chatbot;