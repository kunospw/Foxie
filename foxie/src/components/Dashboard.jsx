import React, { useState } from "react";
import Sidebar from "./Sidebar";
import DashboardContent from "./DashboardContent";

const Dashboard = () => {
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const toggleSidebar = () => setSidebarExpanded(!isSidebarExpanded);

  return (
    <div className="flex min-h-screen">
      <Sidebar isSidebarExpanded={isSidebarExpanded} toggleSidebar={toggleSidebar} />
      <DashboardContent />
    </div>
  );
};

export default Dashboard;
