import React, { useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  MessageSquare,
  Users,
  Briefcase,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Projects", icon: FolderKanban, to: "/projects" },
  { label: "Calendar", icon: Calendar, to: "/calendar" },
  { label: "Time Sheet", icon: MessageSquare, to: "/timesheet" },
  { label: "Org Chart", icon: Users, to: "/orgchart" }

];

const generalItems = [
  { label: "Settings", icon: Settings, to: "/settings" },
  { label: "Help", icon: HelpCircle, to: "/contact" },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  // Direct logout without API check
  const handleLogout = () => {
    localStorage.removeItem("token"); // Clear local auth token
    window.location.href = "/"; // Redirect to root (Login Page)
  };

  return (
    <aside
      className={`relative flex-shrink-0 h-screen bg-[#f4f4f4] py-2 px-3 flex flex-col gap-8 transition-all duration-300 ease-in-out rounded-2xl ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Left: Logo */}
      <div className="text-2xl font-semibold text-black">
        {collapsed ? "TF" : "TaskFleet"}
      </div>

      {/* Top Section */}
      <div>
        <p
          className={`uppercase text-xs text-gray-400 mb-4 px-2 transition-all duration-300 ${
            collapsed ? "text-center opacity-0" : "opacity-100"
          }`}
        >
          Menu
        </p>

        {/* Menu Items */}
        <nav className="space-y-2">
          {menuItems.map(({ label, icon: Icon, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className={`w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md hover:bg-gray-200 transition ${
                useLocation().pathname === to
                  ? "text-blue-500 font-semibold"
                  : "text-gray-600"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span
                className={`transition-all duration-300 ${
                  collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </nav>

        {/* Divider + Toggle Button */}
        <div className="flex items-center justify-between mt-4 px-2">
          <div
            className={`border-t border-gray-300 transition-all duration-300 ${
              collapsed ? "w-0 opacity-0" : "flex-1 opacity-100"
            }`}
          ></div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`text-gray-500 hover:text-black cursor-pointer transition-all duration-200 ${
              collapsed ? "mx-auto" : "ml-2"
            }`}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* General Section */}
        <p
          className={`uppercase text-xs text-gray-400 mt-4 mb-2 px-2 transition-all duration-300 ${
            collapsed ? "text-center opacity-0" : "opacity-100"
          }`}
        >
          General
        </p>
        <nav className="space-y-2">
          {generalItems.map(({ label, icon: Icon, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className={`w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md hover:bg-gray-200 transition ${
                useLocation().pathname === to
                  ? "text-blue-500 font-semibold"
                  : "text-gray-600"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span
                className={`transition-all duration-300 ${
                  collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom Buttons */}
      <div className="absolute bottom-6 left-0 w-full flex flex-col items-center space-y-3 px-4">
        {/* Upgrade Button */}
        <button
          onClick={() => navigate("/plan")}
          className={`transition flex items-center justify-center font-semibold shadow-md cursor-pointer ${
            collapsed
              ? "w-12 h-12 rounded-full bg-gradient-to-r from-orange-400 to-red-500 text-white text-xl p-0"
              : "w-full py-2 rounded-full text-white bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600"
          }`}
        >
          {collapsed ? <span>⚡</span> : <>Upgrade <span className="ml-1">⚡</span></>}
        </button>

        {/* Logout Button - Simplified */}
        <button
          onClick={handleLogout}
          className={`transition flex items-center justify-center font-semibold cursor-pointer ${
            collapsed
              ? "w-12 h-12 rounded-full border-2 border-blue-400 text-blue-500 p-0"
              : "w-full py-2 rounded-full border-2 border-blue-400 text-blue-500 gap-2 hover:bg-blue-50"
          }`}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && "Logout"}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
