import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Foxie from "../assets/x.png";
import {
  HomeIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  DogIcon,
  ChevronDownIcon,
  PlusIcon,
  LogOutIcon,
} from "lucide-react";

const Sidebar = ({ isSidebarExpanded, toggleSidebar }) => {
  const { user, logout } = useAuth(); // Added logout function
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isSessionsDropdownOpen, setIsSessionsDropdownOpen] = useState(false);
  const location = useLocation();

  // Fetch sessions from the backend
  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await axios.get("http://localhost:5000/api/sessions", {
          params: { userId: user.uid },
        });
        setSessions(
          response.data.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          )
        );
        setError(null);
      } catch (error) {
        console.error("Error fetching sessions:", error.message);
        setError("Failed to load sessions. Please try again.");
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [user]);

  const toggleSessionsDropdown = () => {
    setIsSessionsDropdownOpen(!isSessionsDropdownOpen);
  };

  const createNewSession = async () => {
    if (!user) return;
    try {
      const response = await axios.post("http://localhost:5000/api/sessions", {
        userId: user.uid,
      });
      window.location.href = `/dashboard/chatbot/${response.data.id}`;
    } catch (error) {
      console.error("Error creating new session:", error.message);
      setError("Failed to create a new session. Please try again.");
    }
  };
  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out?")) {
      try {
        await logout(); // Call the logout function
        window.location.href = "/"; // Redirect to login
      } catch (error) {
        console.error("Logout failed:", error.message);
      }
    }
  };
  const renderSessionList = () => {
    if (isLoading) return <div className="text-gray-400 px-4 py-2">Loading sessions...</div>;
    if (error) return <div className="text-red-500 px-4 py-2">{error}</div>;
    if (sessions.length === 0) return <div className="text-gray-400 px-4 py-2">No sessions found</div>;

    return sessions.map((session) => (
      <li key={session.id}>
        <Link
          to={`/dashboard/chatbot/${session.id}`}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white ${
            location.pathname === `/dashboard/chatbot/${session.id}` ? "bg-[#f06937] text-black" : ""
          }`}
        >
          {session.name || "Unnamed Session"}
        </Link>
      </li>
    ));
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
              <h1 className="text-white text-xl font-bold tracking-tight">Foxie</h1>
            )}
          </div>
          {isSidebarExpanded ? (
            <button onClick={toggleSidebar} className="text-gray-400 hover:text-[#f06937]">
              <ChevronsLeftIcon className="w-6 h-6" />
            </button>
          ) : (
            isHovered && (
              <button onClick={toggleSidebar} className="text-gray-400 hover:text-[#f06937]">
                <ChevronsRightIcon className="w-6 h-6" />
              </button>
            )
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

            {/* Foxie Sessions */}
            <li>
              <div
                className="flex items-center justify-between px-4 py-3 text-gray-400 hover:bg-gray-800 hover:text-white cursor-pointer"
                onClick={toggleSessionsDropdown}
              >
                <div className="flex items-center gap-3">
                  <DogIcon className="w-6 h-6" />
                  {(isSidebarExpanded || isHovered) && <span>Foxie</span>}
                </div>
                <PlusIcon
                  onClick={createNewSession}
                  className="w-4 h-4 hover:text-[#f06937]"
                  aria-label="New Session"
                />
              </div>
              {isSessionsDropdownOpen && (isSidebarExpanded || isHovered) && (
                <ul className="ml-6 mt-2 space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                  {renderSessionList()}
                </ul>
              )}
            </li>
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f06937] flex items-center justify-center text-black font-bold">
                {user?.displayName?.[0] || "A"}
              </div>
              {(isSidebarExpanded || isHovered) && user && (
                <div className="flex-1">
                  <p className="text-white font-medium truncate">{user.displayName || "Anonymous"}</p>
                  <p className="text-gray-400 text-xs truncate">{user.email || "No email"}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors"
              aria-label="Logout"
            >
              <LogOutIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
