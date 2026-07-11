import { Bell, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationDropdown from "./NotificationDropdown";
import { useRbac } from "../pages/context/RbacContext";


const Navbar = () => {
  const navigate = useNavigate();
  const [openNoti, setOpenNoti] = useState(false);
  const { role, hasPermission } = useRbac();
  const roleLabel = role && typeof role === "object" ? role.name || "User" : role || "User";
  const [userData, setUserData] = useState({
    name: "Loading...",
    role: "User",
    email: ""
  });

  useEffect(() => {
    const getUserInfo = () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Decode JWT token to get user information
          const payload = JSON.parse(atob(token.split('.')[1]));
          
          setUserData({
            name: payload.email?.split('@')[0] || "User",
            role: roleLabel || (payload.role === 'admin' ? 'Admin' : payload.type === 'company' ? 'Company' : 'User'),
            email: payload.email || ""
          });
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    };

    getUserInfo();
  }, [roleLabel]);

  return (
    <header className="w-full bg-[#f0f0f0] px-6 py-3 flex items-center justify-between rounded-xl relative">

      {/* Search */}
      <div className="w-[24rem] h-10 bg-white rounded-full flex items-center px-4">
        <Search className="w-4 h-4 text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search Task"
          className="flex-1 outline-none bg-transparent text-sm text-gray-600 placeholder-gray-400"
        />
      </div>

      {/* Right Icons */}
      <div className="flex items-center gap-6 relative">

        {/* Notification Bell */}
        {hasPermission('notification.view') && <div className="relative">
          <div
            onClick={() => setOpenNoti((prev) => !prev)}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center cursor-pointer"
          >
            <Bell className="w-5 h-5 text-black" />
            {/* Red dot */}
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </div>

          {/* DROPDOWN */}
          <div className="absolute right-0">
            <NotificationDropdown
              isOpen={openNoti}
              onClose={() => setOpenNoti(false)}
            />
          </div>
        </div>}

        {/* Divider */}
        <div className="h-6 border-l border-gray-300" />

        {/* Avatar
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/settings')}
        >
          <img
            src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${userData.name}`}
            alt="Avatar"
            className="w-10 h-10 rounded-full border-2 border-white"
          />
          <div>
            <p className="text-sm font-medium text-black leading-4">
              {userData.name}
            </p>
            <p className="text-xs text-gray-400">{userData.role}</p>
          </div>
        </div> */}
      </div>
    </header>
  );
};

export default Navbar;