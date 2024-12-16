import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import Foxie from "../assets/x.png";
import {
  HomeIcon,
  ClipboardListIcon,
  CalendarIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  DogIcon,
  ChevronDownIcon,
  PlusIcon,
} from "lucide-react";

const Sidebar = ({ isSidebarExpanded, toggleSidebar }) => {
  const [sessions, setSessions] = useState([]);
  const [isHovered, setIsHovered] = useState(false); // Manage hover state
  const [isSessionsDropdownOpen, setIsSessionsDropdownOpen] = useState(false);
  const location = useLocation();

  // Fetch sessions from the backend
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/sessions");
        setSessions(
          response.data.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          )
        );
      } catch (error) {
        console.error("Error fetching sessions:", error.message);
      }
    };

    fetchSessions();
  }, []);

  const toggleSessionsDropdown = () => {
    setIsSessionsDropdownOpen(!isSessionsDropdownOpen);
  };

  const createNewSession = async () => {
    try {
      const response = await axios.post("http://localhost:5000/api/sessions");
      window.location.href = `/dashboard/chatbot/${response.data.id}`;
    } catch (error) {
      console.error("Error creating new session:", error.message);
    }
  };

  return (
    <div
      className={`bg-gray-900 shadow-2xl transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-30 ${
        isSidebarExpanded ? "w-64" : isHovered ? "w-64" : "w-20"
      } overflow-hidden`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <img src={Foxie} alt="Logo" className="w-10 h-auto" />
            {(isSidebarExpanded || isHovered) && (
              <h1 className="text-white text-xl font-bold tracking-tight">
                Foxie
              </h1>
            )}
          </div>
          {isSidebarExpanded && (
            <button
              onClick={toggleSidebar}
              className="text-gray-400 hover:text-[#f06937] transition-colors"
              aria-label="Collapse Sidebar"
            >
              <ChevronsLeftIcon className="w-6 h-6" />
            </button>
          )}
          {!isSidebarExpanded && isHovered && (
            <button
              onClick={toggleSidebar}
              className="text-gray-400 hover:text-[#f06937] transition-colors"
              aria-label="Expand Sidebar"
            >
              <ChevronsRightIcon className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 py-4" aria-label="Sidebar">
          <ul className="space-y-2 px-2">
            {/* Dashboard Link */}
            <li>
              <Link
                to="/dashboard"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white ${
                  location.pathname === "/dashboard" ? "bg-[#f06937] text-black" : ""
                }`}
              >
                <HomeIcon className="w-6 h-6" />
                {isSidebarExpanded && <span>Dashboard</span>}
              </Link>
            </li>

           {/* Foxie (Chatbot) Link */}
          <li>
            <div 
              className="flex items-center justify-between px-4 py-3 text-gray-400 hover:bg-gray-800 hover:text-white cursor-pointer"
              onClick={toggleSessionsDropdown}
            >
              <div className="flex items-center gap-3">
                <DogIcon className="w-6 h-6" />
                {(isSidebarExpanded || isHovered) && <span>Foxie</span>}
              </div>
              {(isSidebarExpanded || isHovered) && (
                <div className="flex items-center">
                  <button 
                    onClick={createNewSession}
                    className="mr-2 hover:text-[#f06937]"
                    aria-label="New Session"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                  <ChevronDownIcon 
                    className={`w-4 h-4 transition-transform ${
                      isSessionsDropdownOpen ? 'rotate-180' : ''
                    }`} 
                  />
                </div>
              )}
            </div>
            
            {isSessionsDropdownOpen && (isSidebarExpanded || isHovered) && (
              <ul className="ml-6 mt-2 space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      to={`/dashboard/chatbot/${session.id}`}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white ${
                        location.pathname === `/dashboard/chatbot/${session.id}`
                          ? "bg-[#f06937] text-black"
                          : ""
                      }`}
                    >
                      {session.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        </ul>
      </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
            <div className="w-10 h-10 rounded-full bg-[#f06937] flex items-center justify-center text-black font-bold">
              A
            </div>
            {(isSidebarExpanded || isHovered) && (
              <div className="flex-1 overflow-hidden">
                <p className="text-white font-medium truncate">Alex Johnson</p>
                <p className="text-gray-400 text-xs truncate">
                  alex.johnson@gmail.com
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
