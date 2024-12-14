import React, { useState } from "react";
import Foxie from "../assets/x.png";
import { Link, useNavigate } from "react-router-dom";
import { 
  HomeIcon, 
  ClipboardListIcon, 
  CalendarIcon, 
  ChevronsLeftIcon, 
  ChevronsRightIcon, 
  DogIcon 
} from "lucide-react";

const SidebarItem = ({ icon, label, active = false, isSidebarExpanded, to }) => (
  <Link to={to} className="no-underline">
    <li
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 cursor-pointer group
          ${active 
            ? "bg-[#f06937] text-black" 
            : "text-gray-400 hover:bg-gray-800 hover:text-white"
          }`}
    >
      {icon}
      {isSidebarExpanded && <span className="text-sm">{label}</span>}
    </li>
  </Link>
);

const Sidebar = ({ isSidebarExpanded, toggleSidebar }) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const handleMouseEnter = () => {
    if (!isSidebarExpanded) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      className={`bg-gray-900 shadow-2xl transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-30
        ${isSidebarExpanded 
          ? "w-64" 
          : (isHovered ? "w-64" : "w-20")
        } overflow-hidden`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <img src={Foxie} alt="Logo" className="w-10 h-auto" />
            {(isSidebarExpanded || isHovered) && (
              <h1 className="text-white text-xl font-bold tracking-tight">Study Helper</h1>
            )}
          </div>
          {isSidebarExpanded && (
            <button
              onClick={toggleSidebar}
              className="text-gray-400 hover:text-[#f06937] transition-colors"
            >
              <ChevronsLeftIcon className="w-6 h-6" />
            </button>
          )}
          {!isSidebarExpanded && isHovered && (
            <button
              onClick={toggleSidebar}
              className="text-gray-400 hover:text-[#f06937] transition-colors"
            >
              <ChevronsRightIcon className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 py-4">
          <ul className="space-y-2 px-2">
            <SidebarItem
              active
              icon={<HomeIcon className="w-6 h-6" />}
              label="Dashboard"
              to="/"
              isSidebarExpanded={isSidebarExpanded || isHovered}
            />
            <SidebarItem
              icon={<ClipboardListIcon className="w-6 h-6" />}
              label="Tasks"
              to="/tasks"
              isSidebarExpanded={isSidebarExpanded || isHovered}
            />
            <SidebarItem
              icon={<CalendarIcon className="w-6 h-6" />}
              label="Schedule"
              to="/schedule"
              isSidebarExpanded={isSidebarExpanded || isHovered}
            />
            <SidebarItem
              icon={<DogIcon className="w-6 h-6" />}
              label="Foxie"
              to="/chatbot"
              isSidebarExpanded={isSidebarExpanded || isHovered}
            />
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
                <p className="text-gray-400 text-xs truncate">alex.johnson@gmail.com</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
