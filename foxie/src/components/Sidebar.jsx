import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import Foxie from "../assets/x.png";
import {
  HomeIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  DogIcon,
  PlusIcon,
  LogOutIcon,
  CalendarIcon,
  NotebookIcon,
  CheckSquareIcon,
  BookIcon,
} from "lucide-react";

// Constants
const DEFAULT_SESSION_NAME = "Unnamed Session";
const API_TIMEOUT = 10000; // 10 seconds

const Sidebar = forwardRef(({ isSidebarExpanded, toggleSidebar }, ref) => {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isSessionsDropdownOpen, setIsSessionsDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    removeSessionFromList: (sessionId) => {
      setSessions((currentSessions) =>
        currentSessions.filter((session) => session.id !== sessionId)
      );
    },
    addSessionToList: (newSession) => {
      setSessions((currentSessions) => [newSession, ...currentSessions]);
    },
    getSessions: () => sessions,
  }));

  // Fetch user sessions with error boundary and timeout
  const fetchSessions = React.useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const response = await axios.get('/api/sessions', {
        params: { userId: user.uid },
        timeout: API_TIMEOUT,
      });
      
      setSessions(
        response.data.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
      setError(null);
    } catch (error) {
      const errorMessage = error.code === 'ECONNABORTED' 
        ? 'Request timed out. Please try again.'
        : `Failed to load sessions: ${error.response?.data?.error || error.message}`;
      setError(errorMessage);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Create a new chat session with error handling
  const createNewSession = async (e) => {
    e.stopPropagation();
    if (!user) return;
    
    try {
      setIsLoading(true);
      const response = await axios.post(
        '/api/sessions', 
        { userId: user.uid },
        { timeout: API_TIMEOUT }
      );
      
      await fetchSessions();
      navigate(`/dashboard/chatbot/${response.data.id}`);
    } catch (error) {
      const errorMessage = error.code === 'ECONNABORTED'
        ? 'Request timed out. Please try again.'
        : 'Failed to create a new session. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout with error boundary
  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out?")) {
      try {
        await logout();
        window.location.href = "/";
      } catch (error) {
        console.error("Logout failed:", error.message);
        setError("Logout failed. Please try again.");
      }
    }
  };

  // Toggle dropdown visibility
  const toggleSessionsDropdown = () => {
    setIsSessionsDropdownOpen(!isSessionsDropdownOpen);
  };

  // Render session list with improved error handling
  const renderSessionList = () => {
    if (isLoading)
      return <div className="text-gray-400 px-4 py-2">Loading sessions...</div>;
    if (error)
      return (
        <div className="text-red-500 px-4 py-2">
          {error}
          <button 
            onClick={() => fetchSessions()}
            className="ml-2 text-sm underline hover:text-red-400"
          >
            Retry
          </button>
        </div>
      );
    if (sessions.length === 0)
      return <div className="text-gray-400 px-4 py-2">No sessions found</div>;

    return sessions.map((session) => (
      <li key={session.id}>
        <Link
          to={`/dashboard/chatbot/${session.id}`}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white ${
            location.pathname === `/dashboard/chatbot/${session.id}`
              ? "bg-[#f06937] text-black"
              : ""
          }`}
        >
          {session.name || DEFAULT_SESSION_NAME}
          {session.isFirstEverSession && (
            <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">New</span>
          )}
        </Link>
      </li>
    ));
  };

  return (
    <div
      className={`bg-gray-900 shadow-2xl transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-30 ${
        isSidebarExpanded ? "w-64" : isHovered ? "w-64" : "w-20"
      } flex flex-col`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sidebar Header - Fixed at top */}
      <div className="flex-none border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <img src={Foxie} alt="Logo" className="w-10 h-auto" />
            {(isSidebarExpanded || isHovered) && (
              <h1 className="text-white text-xl font-bold tracking-tight">Foxie</h1>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="text-gray-400 hover:text-[#f06937]"
          >
            {isSidebarExpanded ? (
              <ChevronsLeftIcon className="w-6 h-6" />
            ) : (
              isHovered && <ChevronsRightIcon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Main Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="py-4">
          <ul className="space-y-2 px-2">
            <li>
              <Link
                to="/dashboard"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white ${
                  location.pathname === "/dashboard" ? "bg-[#f06937] text-black" : ""
                }`}
              >
                <HomeIcon className="w-6 h-6" />
                {(isSidebarExpanded || isHovered) && <span>Dashboard</span>}
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/calendar"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white ${
                  location.pathname === "/dashboard/calendar" ? "bg-[#f06937] text-black" : ""
                }`}
              >
                <CalendarIcon className="w-6 h-6" />
                {(isSidebarExpanded || isHovered) && <span>Calendar</span>}
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/notes"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white ${
                  location.pathname === "/dashboard/notes" ? "bg-[#f06937] text-black" : ""
                }`}
              >
                <NotebookIcon className="w-6 h-6" />
                {(isSidebarExpanded || isHovered) && <span>Notes</span>}
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/assignments"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white ${
                  location.pathname === "/dashboard/assignments" ? "bg-[#f06937] text-black" : ""
                }`}
              >
                <CheckSquareIcon className="w-6 h-6" />
                {(isSidebarExpanded || isHovered) && <span>Assignments</span>}
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard/courses"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white ${
                  location.pathname === "/dashboard/courses" ? "bg-[#f06937] text-black" : ""
                }`}
              >
                <BookIcon className="w-6 h-6" />
                {(isSidebarExpanded || isHovered) && <span>Courses</span>}
              </Link>
            </li>
            <li>
              <div
                className="flex items-center justify-between px-4 py-3 text-gray-400 hover:bg-gray-800 hover:text-white cursor-pointer"
                onClick={toggleSessionsDropdown}
              >
                <div className="flex items-center gap-3">
                  <DogIcon className="w-6 h-6" />
                  {(isSidebarExpanded || isHovered) && <span>Foxie</span>}
                </div>
                <button
                  onClick={createNewSession}
                  className="text-gray-400 hover:text-[#f06937]"
                  aria-label="New Session"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </div>
              {isSessionsDropdownOpen && (isSidebarExpanded || isHovered) && (
                <ul className="ml-6 mt-2 space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                  {renderSessionList()}
                </ul>
              )}
            </li>
          </ul>
        </div>
      </nav>

      {/* Sidebar Footer - Fixed at bottom */}
      <div className="flex-none border-t border-gray-800">
        <div className="p-4">
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#f06937] text-black flex items-center justify-center">
                {user?.displayName?.[0] || "A"}
              </div>
              {(isSidebarExpanded || isHovered) && (
                <div>
                  <p className="text-white font-medium">{user?.displayName || "Anonymous"}</p>
                  <p className="text-gray-400 text-sm">{user?.email || "No email"}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500"
              aria-label="Logout"
            >
              <LogOutIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Sidebar;