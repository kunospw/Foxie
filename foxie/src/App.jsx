import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import AuthForm from "./components/AuthForm";
import Dashboard from "./components/Dashboard";
import Chatbot from "./components/Chatbot";

const App = () => {
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);

  const toggleSidebar = () => {
    setSidebarExpanded(!isSidebarExpanded);
  };

  return (
    <Router>
      <div className="flex min-h-screen bg-gray-100">
        {/* Sidebar */}
        <Sidebar isSidebarExpanded={isSidebarExpanded} toggleSidebar={toggleSidebar} />
        
        {/* Main Content */}
        <div
          className={`transition-all duration-300 flex-1 p-6 ${
            isSidebarExpanded ? "ml-64" : "ml-20"
          }`}
        >
          <Routes>
            <Route path="/" element={<AuthForm />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/chatbot" element={<Chatbot isSidebarExpanded={isSidebarExpanded} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
