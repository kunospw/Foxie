import React, { useRef, useState } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./Sidebar";
import DashboardContent from "./DashboardContent";
import Chatbot from "./Chatbot";

const Dashboard = () => {
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const sidebarRef = useRef(null);

  const toggleSidebar = () => setSidebarExpanded(!isSidebarExpanded);

  return (
    <div className="flex min-h-screen bg-gray-800">
      {/* Sidebar */}
      <Sidebar
        ref={sidebarRef}
        isSidebarExpanded={isSidebarExpanded}
        toggleSidebar={toggleSidebar}
      />

      {/* Main Content */}
      <div
        className={`transition-all duration-300 flex-1 ${
          isSidebarExpanded ? "ml-64" : "ml-20"
        }`}
      >
        <Routes>
          {/* Default dashboard route */}
          <Route index element={<DashboardContent />} />
          
          {/* Nested Chatbot routes */}
          <Route path="chatbot">
            <Route 
              index 
              element={<Chatbot 
                isSidebarExpanded={isSidebarExpanded} 
                sidebarRef={sidebarRef} 
              />} 
            />
            <Route 
              path=":sessionId" 
              element={<Chatbot 
                isSidebarExpanded={isSidebarExpanded} 
                sidebarRef={sidebarRef} 
              />} 
            />
          </Route>
        </Routes>
      </div>
    </div>
  );
};

export default Dashboard;