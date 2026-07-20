import React, { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { db, getUserFromToken } from "../../firebase";
import { doc, updateDoc, arrayRemove, collection, getDocs, arrayUnion, onSnapshot } from "firebase/firestore";

// ─── Presence helpers (frontend-only) ────────────────────────
const formatLastSeen = (lastSeenAt, now) => {
  if (!lastSeenAt) return "Offline";
  const diffMs = now - new Date(lastSeenAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

const getPresenceDotClass = (isOnline) =>
  isOnline ? "bg-green-500" : "bg-gray-300";

const getPresenceBadgeClass = () => "bg-gray-200 text-gray-600";

const getPresenceBadgeLabel = (member, nowTick) =>
  formatLastSeen(member.lastSeenAt, nowTick);

export default function Nember({ projectId: propProjectId, projectParticipants = [] }) {
  const navigate = useNavigate();
  const { projectId: paramProjectId } = useParams();
  const projectId = propProjectId || paramProjectId;

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  // Dynamic admin check matching role-based permissions
  const currentUser = getUserFromToken();
  const currentRole = currentUser?.role?.toLowerCase() || "member";
  const isAdmin = ["admin", "sadmin", "hr", "hr_manager"].includes(currentRole);

  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Subscribe to logged in user doc to get dynamic childrenuid updates
  useEffect(() => {
    if (!currentUser?.email) return;
    const sanitizedEmail = currentUser.email.replace(/\./g, "_");
    const unsubscribe = onSnapshot(doc(db, "users", sanitizedEmail), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserProfile(docSnap.data());
      }
    });
    return () => unsubscribe();
  }, [currentUser?.email]);

  const hasChildren = Array.isArray(currentUserProfile?.childrenuid) && currentUserProfile.childrenuid.length > 0;
  const canAddMember = isAdmin || hasChildren;

  // Fetch users not already in the project when Add Modal opens
  useEffect(() => {
    if (!openAddModal) return;
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const allUsers = [];
        querySnapshot.forEach((docSnap) => {
          allUsers.push({ id: docSnap.id, ...docSnap.data() });
        });
        const existingEmails = new Set(projectParticipants.map(p => p.id));
        const filtered = allUsers.filter(u => !existingEmails.has(u.id));
        setAvailableUsers(filtered);
        if (filtered.length > 0) {
          setSelectedUserToAdd(filtered[0].id);
        } else {
          setSelectedUserToAdd("");
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, [openAddModal, projectParticipants]);

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserToAdd) return;
    setAddingMember(true);
    try {
      const selectedUser = availableUsers.find(u => u.id === selectedUserToAdd);
      if (!selectedUser) throw new Error("Selected user not found");
      const newParticipant = {
        id: selectedUser.id,
        uid: selectedUser.uid || "",
        email: selectedUser.email || selectedUser.id.replace(/_/g, "."),
        name: selectedUser.name || "Unknown",
        role: selectedUser.role || "Member"
      };
      const updatedDetails = [...projectParticipants, newParticipant];
      const updatedTeam = updatedDetails.map(p => p.name);
      const updatedParticipants = updatedDetails.map(p => p.id);
      
      // 1. Update the project document
      await updateDoc(doc(db, "projects", projectId), {
        participants: updatedParticipants,
        team: updatedTeam,
        participantDetails: updatedDetails
      });
      
      // 2. Add project ID to the user document
      await updateDoc(doc(db, "users", selectedUser.id), {
        projectIds: arrayUnion(projectId)
      });
      
      setOpenAddModal(false);
    } catch (err) {
      console.error("Error adding member:", err);
      alert("Failed to add member: " + err.message);
    } finally {
      setAddingMember(false);
    }
  };

  // Tick every minute so "last seen" labels stay fresh
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Load members from projectParticipants prop
  useEffect(() => {
    setLoading(true);

    if (projectParticipants && Array.isArray(projectParticipants)) {
      const mapped = projectParticipants.map((user, idx) => ({
        _id: user.id || user._id || String(idx),
        name: user.name || "Unknown",
        email: user.email || user.id || `${(user.name || "user").toLowerCase().replace(/\s+/g, ".")}@taskfleet.com`,
        role: user.role || "member",
        displayRole: user.role ? user.role.replace(/_/g, " ") : "Member",
        phone: user.mobile || user.phone || "N/A",
        joined: user.createdAt
          ? new Date(user.createdAt).toLocaleDateString("en-GB")
          : "01/03/2026",
        img: (idx % 70) + 1,
        isOnline: idx < 2, // first two members "online" for demo
        lastSeenAt: idx < 2 ? null : new Date(Date.now() - 1000 * 60 * 30 * (idx + 1)).toISOString(),
      }));
      setMembers(mapped);
    } else {
      setMembers([]);
    }

    setLoading(false);
  }, [projectParticipants]);

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

  const deleteMember = async (email) => {
    try {
      const updatedDetails = projectParticipants.filter(p => p.id !== email && p.email !== email);
      const updatedTeam = updatedDetails.map(p => p.name);
      const updatedParticipants = updatedDetails.map(p => p.id);

      await updateDoc(doc(db, "projects", projectId), {
        participants: updatedParticipants,
        team: updatedTeam,
        participantDetails: updatedDetails
      });

      // Also remove the project ID from the user's projectIds array in Firestore
      const userDocId = email.replace(/\./g, "_");
      await updateDoc(doc(db, "users", userDocId), {
        projectIds: arrayRemove(projectId)
      });

      setMembers((prev) => prev.filter((m) => m.email !== email));
      setOpenMenuIndex(null);
      if (selectedMember?.email === email) {
        setOpenEditModal(false);
        setSelectedMember(null);
      }
    } catch (err) {
      console.error("Error removing member from project:", err);
      alert("Failed to remove member: " + err.message);
    }
  };

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

              {/* VIEW PROFILE BUTTON */}
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

          {canAddMember && (
            <div
              onClick={() => setOpenAddModal(true)}
              className="bg-[#f7fdff] rounded-xl text-center py-4 px-3 flex flex-col items-center justify-center h-56 cursor-pointer hover:bg-[#edf9fc] transition-all"
            >
              <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center text-blue-500 border-2 border-dashed border-blue-300">
                <Plus className="w-5 h-5" />
              </div>
              <p className="text-sm text-blue-500 font-medium mt-2">Add Member</p>
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
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

      {openAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-[90%] md:w-[450px] p-6 relative shadow-2xl">
            <button
              onClick={() => setOpenAddModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              <X size={22} />
            </button>
            <h2 className="text-xl font-semibold mb-4">Add Project Member</h2>
            <form onSubmit={handleAddMemberSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
                {availableUsers.length > 0 ? (
                  <select
                    value={selectedUserToAdd}
                    onChange={(e) => setSelectedUserToAdd(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-500">No other employees available to add.</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setOpenAddModal(false)}
                  className="px-5 py-2 rounded-full border border-gray-300 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember || !selectedUserToAdd}
                  className="px-5 py-2 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {addingMember ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}