import React, { useState, useEffect, useRef } from "react";
import { Plus, X } from "lucide-react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { BASE_URL, CHAT_BASE_URL } from "../../utility/Config";
import { mapUserData } from "../../utility/dataMapper";
import { formatLastSeen, getPresenceBadgeClass, getPresenceBadgeLabel, getPresenceDotClass } from "../../utility/presence";
import { useRbac } from "../../pages/context/RbacContext";
import ViewProfile from "../Basic/viewprofile"; // ✅ IMPORT VIEW PROFILE POPUP

export default function Nember({ projectId: propProjectId, projectParticipants = [] }) {
  const navigate = useNavigate();
  const { role, isAllAccess, hasPermission } = useRbac();
  const { projectId: paramProjectId } = useParams();
  const projectId = propProjectId || paramProjectId; // Use prop if available, else from URL params
  
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [openViewProfile, setOpenViewProfile] = useState(false);
  const socketRef = useRef(null);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || socketRef.current) return;

    const socket = io(CHAT_BASE_URL, {
      auth: { token },
      transports: ["websocket"],
      autoConnect: false,
    });

    socketRef.current = socket;

    const updatePresence = (payload) => {
      if (!payload?.userId) return;
      const targetUserId = String(payload.userId);

      setMembers((prev) =>
        prev.map((member) => {
          const memberId = String(member._id || member.id || member.email || "");
          if (memberId !== targetUserId) return member;

          return {
            ...member,
            isOnline: Boolean(payload.isOnline),
            lastSeenAt: payload.lastSeenAt || member.lastSeenAt || null,
            lastSeenAgo: payload.isOnline
              ? "Online now"
              : formatLastSeen(payload.lastSeenAt || member.lastSeenAt, Date.now()),
          };
        })
      );
    };

    socket.on("connect", () => {
      socket.emit("connect_user");
    });

    // Heartbeat: send presence_ping every 60 seconds while connected
    let heartbeatTimer = null;
    socket.on('connect', () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        try {
          if (socket && socket.connected) socket.emit('presence_ping', { ts: Date.now() });
        } catch (e) {
          // ignore
        }
      }, 60000);
    });

    socket.on("presence_changed", updatePresence);
    socket.connect();

    return () => {
      if (socketRef.current === socket) {
        socket.disconnect();
        socketRef.current = null;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
      }
    };
  }, []);

  // Fetch project members or company users based on projectId
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        let usersData = [];
        
        // First, check if participants are passed directly (already populated)
        if (projectParticipants && Array.isArray(projectParticipants) && projectParticipants.length > 0) {
          console.log("Using projectParticipants prop:", projectParticipants);
          usersData = projectParticipants;
        } else if (projectId) {
          // Otherwise, fetch from API
          console.log("Fetching members for projectId:", projectId);
          const response = await axios.get(`${BASE_URL}/projects/${projectId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          console.log("API Response:", response.data);
          
          // IMPORTANT: Use participantDetails (full user objects) instead of participants (IDs)
          usersData = response.data.participantDetails || response.data.participants || [];
          console.log("usersData after extracting from response:", usersData);
        } else {
          // Fallback: fetch all company users
          const response = await axios.get(`${BASE_URL}/company/users?includeAllRoles=true`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          usersData = response.data.users || [];
        }
        
        if (!Array.isArray(usersData)) {
          console.log("usersData is not an array:", usersData);
          setMembers([]);
          return;
        }
        
        console.log("usersData before mapping:", usersData);
        
        // Map users using dataMapper and add UI-specific properties
        const mappedUsers = usersData.map((user, idx) => {
          console.log("Mapping user:", user);
          const mappedUser = mapUserData(user);
          console.log("Mapped user result:", mappedUser);
          
          return {
            ...mappedUser,
            img: (idx % 70) + 1, // Random avatar for UI
            phone: user.mobile || user.phone || 'N/A',
            joined: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : 'N/A',
            displayRole: mappedUser?.role ? mappedUser.role.replace(/_/g, ' ') : 'N/A',
            lastSeenAgo: mappedUser?.lastSeenAgo || user.lastSeenAgo || null,
          };
        });
        
        console.log("Final mappedUsers before setState:", mappedUsers);
        setMembers(mappedUsers);
        
      } catch (error) {
        console.error('Error fetching members:', error);
        setMembers(projectParticipants && Array.isArray(projectParticipants) ? projectParticipants : []);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [projectId]); // Removed projectParticipants from dependencies

  // close dropdown when click outside current menu/button
  useEffect(() => {
    const onDocClick = (e) => {
      if (openMenuIndex === null) return;

      const insideDropdown = e.target.closest(`[data-dropdown-index="${openMenuIndex}"]`);
      const insideButton = e.target.closest(`[data-menu-button-index="${openMenuIndex}"]`);

      if (insideDropdown || insideButton) {
        return;
      }
      setOpenMenuIndex(null);
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenuIndex]);

  const openEdit = (member) => {
    setSelectedMember(member);
    setOpenEditModal(true);
    setOpenMenuIndex(null);
  };

  const deleteMember = (email) => {
    setMembers((prev) => prev.filter((m) => m.email !== email));
    setOpenMenuIndex(null);
    if (selectedMember?.email === email) {
      setOpenEditModal(false);
      setSelectedMember(null);
    }
  };

  const currentRoleName = typeof role === "string" ? role : role?.name;
  const isAdmin = Boolean(isAllAccess || currentRoleName === "admin" || hasPermission("role.update"));

  if (loading) {
    return (
      <div className="bg-gray-100 flex flex-col rounded-2xl p-6">
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-100 flex flex-col rounded-2xl p-6">
        

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {members.map((member, index) => (
            <div
              key={member.email}
              className="bg-white rounded-2xl text-center py-11 pb-0 relative flex flex-col items-center justify-between gap-2 h-72"
            >
              <div className="relative inline-flex">
                <img
                  src={`https://i.pravatar.cc/150?img=${member.img}`}
                  alt={member.name}
                  className="w-20 h-20 rounded-full"
                />
                {member.isOnline ? (
                  <span className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-white ${getPresenceDotClass(true)}`} />
                ) : (
                  <span
                    className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-white text-[10px] font-semibold leading-none flex items-center justify-center ${getPresenceBadgeClass(false)}`}
                  >
                    {getPresenceBadgeLabel(member, nowTick)}
                  </span>
                )}
              </div>

              <h3 className="text-md font-bold text-gray-800">{member.name}</h3>
              <p className="text-xs text-gray-500">{member.displayRole}</p>
              <p className="text-xs text-gray-500 pb-12">{member.email}</p>

              {/* ⭐ UPDATED VIEW PROFILE BUTTON ⭐ */}
              <button
                className="bg-blue-500 text-white w-full text-xs py-3 px-3 rounded-b-2xl hover:bg-blue-600"
                onClick={() => {
                  navigate(`/viewprofile/${member._id || member.id || member.email}`);
                }}
              >
                View Profile
              </button>

              {isAdmin && (
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() =>
                      setOpenMenuIndex((cur) => (cur === index ? null : index))
                    }
                    data-menu-button-index={index}
                    className="text-gray-400 hover:text-gray-500"
                    aria-label="open menu"
                  >
                    •••
                  </button>

                  {openMenuIndex === index && (
                    <div
                      data-dropdown-index={index}
                      className="absolute right-0 mt-3 w-28 bg-white border border-[#DDD9D9] shadow-xl rounded-2xl z-50 overflow-hidden"
                    >
                      <button
                        onClick={() => openEdit(member)}
                        className="w-full text-center py-2 text-black hover:bg-gray-50"
                      >
                        Edit
                      </button>

                      <div className="border-t border-[#DDD9D9]" />

                      <button
                        onClick={() => deleteMember(member.email)}
                        className="w-full text-center py-2 text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="bg-[#f7fdff] rounded-xl text-center py-4 px-3 flex flex-col items-center justify-center h-56 cursor-pointer">
            <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center text-blue-500 border-2 border-dashed border-blue-300">
              <Plus className="w-5 h-5" />
            </div>
            <p className="text-sm text-blue-500 font-medium mt-2">Add Member</p>
          </div>
        </div>
      </div>

      {/* Existing EDIT MODAL (UNTOUCHED) */}
      {openEditModal && selectedMember && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-[90%] md:w-[550px] p-6 relative shadow-2xl">
            <button
              onClick={() => setOpenEditModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              <X size={22} />
            </button>

            <div className="flex items-center gap-4 pb-5">
              <div className="relative inline-flex">
                <img
                  src={`https://i.pravatar.cc/150?img=${selectedMember.img}`}
                  className="w-16 h-16 rounded-full"
                  alt="profile"
                />
                {selectedMember.isOnline ? (
                  <span className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-white ${getPresenceDotClass(true)}`} />
                ) : (
                  <span
                    className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-white text-[7px] font-semibold leading-none flex items-center justify-center ${getPresenceBadgeClass(false)}`}
                  >
                    {getPresenceBadgeLabel(selectedMember, nowTick)}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{selectedMember.name}</h2>
                <p className="text-sm text-gray-500">{selectedMember.displayRole}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
              <div>
                <p className="font-semibold">Email Address</p>
                <p className="text-gray-500">{selectedMember.email}</p>
              </div>

              <div>
                <p className="font-semibold">Phone Number</p>
                <p className="text-gray-500">{selectedMember.phone}</p>
              </div>

              <div>
                <p className="font-semibold">Roles</p>
                <div className="flex items-center gap-3 mt-1">
                  <label className="flex items-center gap-1">
                    <input type="radio" name={`role-${selectedMember.email}`} defaultChecked={selectedMember.displayRole === "Admin"} />
                    Admin
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name={`role-${selectedMember.email}`} defaultChecked={selectedMember.displayRole === "Employee"} />
                    Employee
                  </label>
                </div>
              </div>

              <div>
                <p className="font-semibold">Date Joined</p>
                <p className="text-gray-500">{selectedMember.joined}</p>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button className="px-6 py-2 rounded-full border border-red-400 text-red-500 hover:bg-red-50">
                Restrict
              </button>
              <button
                onClick={() => setOpenEditModal(false)}
                className="px-6 py-2 bg-red-500 rounded-full text-white hover:bg-red-600"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⭐ NEW VIEW PROFILE POPUP ⭐ */}
      {/* ViewProfile popup removed, now using route navigation */}
    </>
  );
}