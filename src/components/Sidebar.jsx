import React, { useState } from "react";
import { logoutUser } from "../utility/logoutApi";
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
import { useLocation, useNavigate } from "react-router-dom";
import { useRbac } from "../pages/context/RbacContext";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard", permission: "dashboard.view" },
  { label: "Projects", icon: FolderKanban, to: "/projects", permission: "project.view" },
  { label: "Calendar", icon: Calendar, to: "/calendar" },
  { label: "Chat", icon: MessageSquare, to: "/chat", permission: "chat.view" },
  { label: "Team", icon: Users, to: "/team", permission: "user.view" },
  { label: "Jobs", icon: Briefcase, to: "/jobs" },
];

const generalItems = [
  { label: "Settings", icon: Settings, to: "/settings", permission: "settings.view" },
  { label: "Help", icon: HelpCircle, to: "/contact" },
  
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, hasPermission } = useRbac();

  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const visibleGeneralItems = generalItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const handleNavigation = (to) => {
    navigate(to);
  };

  return (
    <aside
      className={`relative h-screen bg-[#f4f4f4] py-2 px-3 flex flex-col gap-8 transition-all duration-300 ease-in-out rounded-2xl ${collapsed ? "w-20" : "w-64"
        }`}
    >
      {/* Left: Logo */}
      <div className="text-2xl font-semibold text-black">
        {collapsed ? 'TF' : 'TaskFleet'}
      </div>
      {/* Top Section */}
      <div>
        <p
          className={`uppercase text-xs text-gray-400 mb-4 px-2 transition-all duration-300 ${collapsed ? "text-center opacity-0" : "opacity-100"
            }`}
        >
          {collapsed ? "" : "Menu"}
        </p>

        {/* Menu Items */}
        <nav className="space-y-2">
          {visibleMenuItems.map(({ label, icon: Icon, to }) => (
            <button
              key={label}
              onClick={() => handleNavigation(to)}
              className={`w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md hover:bg-gray-200 transition ${location.pathname === to
                  ? "text-blue-500 font-semibold"
                  : "text-gray-600"
                }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span
                className={`transition-all duration-300 ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
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
            className={`border-t border-gray-300 transition-all duration-300 ${collapsed ? "w-0 opacity-0" : "flex-1 opacity-100"
              }`}
          ></div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`text-gray-500 hover:text-black cursor-pointer transition-all duration-200 ${collapsed ? "mx-auto" : "ml-2"
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
          className={`uppercase text-xs text-gray-400 mt-4 mb-2 px-2 transition-all duration-300 ${collapsed ? "text-center opacity-0" : "opacity-100"
            }`}
        >
          {collapsed ? "" : "General"}
        </p>
        <nav className="space-y-2">
          {visibleGeneralItems.map(({ label, icon: Icon, to }) => (
            <button
              key={label}
              onClick={() => handleNavigation(to)}
              className={`w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md hover:bg-gray-200 transition ${location.pathname === to
                  ? "text-blue-500 font-semibold"
                  : "text-gray-600"
                }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span
                className={`transition-all duration-300 ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
                  }`}
              >
                {label}
              </span>
            </button>
          ))}
        </nav>
      </div>
      {loading && (
        <div className="absolute bottom-28 left-0 w-full px-4 text-xs text-center text-gray-400">
          Loading access...
        </div>
      )}
      {/* Bottom Buttons */}
      <div className="absolute bottom-6 left-0 w-full flex flex-col items-center space-y-3 px-4">
        {/* Upgrade Button */}
        <button
          onClick={() => handleNavigation('/plan')}
          className={`transition flex items-center justify-center font-semibold shadow-md cursor-pointer
            ${collapsed
              ? 'w-12 h-12 rounded-full bg-gradient-to-r from-orange-400 to-red-500 text-white text-xl p-0'
              : 'w-full py-2 rounded-full text-white bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600'}
          `}
        >
          {collapsed ? <span>⚡</span> : <>Upgrade <span className="ml-1">⚡</span></>}
        </button>
        {/* Logout Button */}
        <button
          onClick={async () => {
            const token = localStorage.getItem("token");
            await logoutUser(token);
            window.location.href = "/"; // Redirect to login/signup
          }}
          className={`transition flex items-center justify-center font-semibold cursor-pointer
            ${collapsed
              ? 'w-12 h-12 rounded-full border-2 border-blue-400 text-blue-500 p-0'
              : 'w-full py-2 rounded-full border-2 border-blue-400 text-blue-500 gap-2 hover:bg-blue-50'}
          `}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;



// import React, { useState } from 'react'
// import { useNavigate } from 'react-router-dom'
// import {
//   LayoutDashboard,
//   FolderKanban,
//   Calendar,
//   ChevronLeft,
//   ChevronRight
// } from "lucide-react"; // 👈 importing only needed icons


// const Sidebaar = () => {

//   const navigate = useNavigate()

//   const handlenaigation = (path) => {
//     navigate(path)
//   }

//   const [collapsed , setCollapsed] = useState(false)

//   const menuitems = [
//     {label : "Dashboard" , path:'/' , icon : LayoutDashboard},
//     { label: "Projects", path: "/projects", icon: FolderKanban },
//     { label: "Calendar", path: "/calendar", icon: Calendar },
//   ]


//   return (
     
//       <aside className={`bg-gray-100 p-6 h-screen w-20 ${collapsed ? "w-20" : "w-64"}`} >

         

//         <div className="flex items-center justify-between">

//           <h2>
//             {collapsed ? "tf" : "taskfleet"}
//           </h2>

//           <button
//           onClick={() => setCollapsed(!collapsed)}
//           >
//             {collapsed ? (
//               <ChevronRight className='w-5 h-5' />
//             ) : (
//               <ChevronLeft className='w-5 h-5'/>
//             )}
//           </button>


//         </div>



//          <nav className='flex flex-col gap-4 ' >

//         {menuitems.map(({label , path , icon: Icon}) => (
//           <button
//           key={path}
//           onClick={() => handlenaigation(path)}
//            className={`flex items-center gap-4 rounded-2xl  text-left mt-7 ${
//             location.pathname === path} ? " bg-blue-100 text-blue-500" 
//             : 
//             " hover:bg-gray-400 text-gray-600 "
//              `}
//           >
//             <Icon className='w-5 h-5' / > 
//               <span 
//               className={`   ${collapsed ? "opacity-0 w-0 overflow-hidden " : "opacity-100 w-auto"}`}
//               >
//                 {label}
//               </span>
//           </button>
//         ))}

//          </nav>



//       </aside>
     
//   )
// }

// export default Sidebaar