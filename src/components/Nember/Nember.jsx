import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useParams } from "react-router-dom";
import { db, getUserFromToken } from "../../firebase";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

// ─── Presence helpers (frontend-only) ────────────────────────
const formatLastSeen = (lastSeenAt, now) => {
  if (!lastSeenAt) return "Offline";

  const diffMs = now - new Date(lastSeenAt).getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;

  return `${Math.floor(hrs / 24)}d`;
};

const getPresenceDotClass = (isOnline) =>
  isOnline ? "bg-green-500" : "bg-gray-300";

const getPresenceBadgeClass = () => "bg-gray-200 text-gray-600";

const getPresenceBadgeLabel = (member, nowTick) =>
  formatLastSeen(member.lastSeenAt, nowTick);

const getAvatarColor = (name) => {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-indigo-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-rose-500",
    "bg-amber-500",
    "bg-teal-500",
  ];

  if (!name) return "bg-gray-500";

  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export default function Nember({
  projectId: propProjectId,
  projectParticipants = [],
}) {
  const { projectId: paramProjectId } = useParams();
  const projectId = propProjectId || paramProjectId;

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  // ─── Profile popup state ───────────────────────────────────
  const [openProfilePopup, setOpenProfilePopup] = useState(false);
  const [profileMember, setProfileMember] = useState(null);
  const [profileEditField, setProfileEditField] = useState(null);
  const [profileFormValues, setProfileFormValues] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);

  const currentUser = getUserFromToken();
  const currentRole = currentUser?.role?.toLowerCase() || "member";
  const isAdmin = [
    "admin",
    "sadmin",
    "sr_project_manager",
    "hr_manager",
  ].includes(currentRole);

  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Subscribe to the logged-in user's document.
  useEffect(() => {
    if (!currentUser?.email) return undefined;

    const sanitizedEmail = currentUser.email.replace(/\./g, "_");
    const unsubscribe = onSnapshot(
      doc(db, "users", sanitizedEmail),
      (docSnap) => {
        if (docSnap.exists()) {
          setCurrentUserProfile(docSnap.data());
        }
      }
    );

    return unsubscribe;
  }, [currentUser?.email]);

  // Retained because the profile subscription may be used by role rules later.
  const hasChildren =
    Array.isArray(currentUserProfile?.childrenuid) &&
    currentUserProfile.childrenuid.length > 0;
  void hasChildren;

  const canAddMember = isAdmin;

  // ─── Fetch all users from Firestore ────────────────────────
  useEffect(() => {
    const fetchAllUsers = async () => {
      setLoading(true);

      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const allUsers = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();

          allUsers.push({
            id: docSnap.id,
            uid: data.uid || "",
            name: data.name || "Unknown",
            email: data.email || docSnap.id.replace(/_/g, "."),
            role: data.role || "Member",
            displayRole: data.role ? data.role.replace(/_/g, " ") : "Member",
            mobile: data.mobile || data.phone || "N/A",
            phone: data.mobile || data.phone || "N/A",
            joined: data.createdAt
              ? new Date(data.createdAt).toLocaleDateString("en-GB")
              : "N/A",
            designation: data.designation || "",
            img: (docSnap.id.length % 70) + 1,
            isOnline: false,
            lastSeenAt: data.lastSeenAt || null,
          });
        });

        setMembers(allUsers);
      } catch (err) {
        console.error("Error fetching all users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsers();
  }, []);

  // Refresh available users when the add modal opens.
  useEffect(() => {
    if (!openAddModal) return;

    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const allUsers = [];

        querySnapshot.forEach((docSnap) => {
          allUsers.push({ id: docSnap.id, ...docSnap.data() });
        });

        const existingIds = new Set(projectParticipants.map((p) => p.id));
        const filtered = allUsers.filter((user) => !existingIds.has(user.id));

        setAvailableUsers(filtered);
        setSelectedUserToAdd(filtered[0]?.id || "");
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    fetchUsers();
  }, [openAddModal, projectParticipants]);

  const handleAddMemberSubmit = async (event) => {
    event.preventDefault();
    if (!selectedUserToAdd) return;

    setAddingMember(true);

    try {
      const selectedUser = availableUsers.find(
        (user) => user.id === selectedUserToAdd
      );

      if (!selectedUser) throw new Error("Selected user not found");

      const newParticipant = {
        id: selectedUser.id,
        uid: selectedUser.uid || "",
        email: selectedUser.email || selectedUser.id.replace(/_/g, "."),
        name: selectedUser.name || "Unknown",
        role: selectedUser.role || "Member",
      };

      const updatedDetails = [...projectParticipants, newParticipant];
      const updatedTeam = updatedDetails.map((participant) => participant.name);
      const updatedParticipants = updatedDetails.map(
        (participant) => participant.id
      );

      await updateDoc(doc(db, "projects", projectId), {
        participants: updatedParticipants,
        team: updatedTeam,
        participantDetails: updatedDetails,
      });

      await updateDoc(doc(db, "users", selectedUser.id), {
        projectIds: arrayUnion(projectId),
      });

      setOpenAddModal(false);
    } catch (err) {
      console.error("Error adding member:", err);
      alert(`Failed to add member: ${err.message}`);
    } finally {
      setAddingMember(false);
    }
  };

  // ─── Profile popup handlers ────────────────────────────────
  const openProfileView = (member) => {
    setProfileMember(member);
    setProfileEditField(null);
    setProfileFormValues({});
    setOpenProfilePopup(true);
  };

  const closeProfilePopup = () => {
    setOpenProfilePopup(false);
    setProfileMember(null);
    setProfileEditField(null);
    setProfileFormValues({});
  };

  const handleProfileEdit = (field) => {
    if (!isAdmin) return;

    setProfileFormValues((previous) => ({
      ...previous,
      [field]: profileMember[field] || "",
    }));
    setProfileEditField(field);
  };

  const handleProfileCancel = () => {
    setProfileEditField(null);
    setProfileFormValues({});
  };

  const handleProfileSave = async (field) => {
    if (!isAdmin || !profileMember?.id) return;

    setProfileSaving(true);

    try {
      const value = profileFormValues[field];
      await updateDoc(doc(db, "users", profileMember.id), { [field]: value });

      setProfileMember((previous) => ({ ...previous, [field]: value }));
      setMembers((previous) =>
        previous.map((member) =>
          member.id === profileMember.id ? { ...member, [field]: value } : member
        )
      );

      setProfileEditField(null);
      setProfileFormValues({});
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  const renderProfileField = (label, field, value, type = "text") => {
    const isEditing = profileEditField === field;

    return (
      <div>
        <p className="mb-1 text-sm font-semibold text-gray-700">{label}</p>

        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type={type}
              value={profileFormValues[field] || ""}
              onChange={(event) =>
                setProfileFormValues((previous) => ({
                  ...previous,
                  [field]: event.target.value,
                }))
              }
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
              disabled={profileSaving}
            />
            <button
              type="button"
              onClick={() => handleProfileSave(field)}
              disabled={profileSaving}
              className="text-sm font-medium text-green-600 hover:underline disabled:opacity-50"
            >
              {profileSaving ? "…" : "✓"}
            </button>
            <button
              type="button"
              onClick={handleProfileCancel}
              disabled={profileSaving}
              className="text-sm text-red-500 hover:underline disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500">{value || "—"}</span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleProfileEdit(field)}
                className="ml-1 text-xs text-blue-500 hover:underline"
                title="Edit"
              >
                ✎
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Keep last-seen labels fresh.
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Close the member menu when clicking outside it.
  useEffect(() => {
    const onDocumentClick = (event) => {
      if (openMenuIndex === null) return;

      const insideDropdown = event.target.closest(
        `[data-dropdown-index="${openMenuIndex}"]`
      );
      const insideButton = event.target.closest(
        `[data-menu-button-index="${openMenuIndex}"]`
      );

      if (!insideDropdown && !insideButton) setOpenMenuIndex(null);
    };

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [openMenuIndex]);

  const openEdit = (member) => {
    setSelectedMember(member);
    setOpenEditModal(true);
    setOpenMenuIndex(null);
  };

  const deleteMember = async (email) => {
    try {
      const updatedDetails = projectParticipants.filter(
        (participant) =>
          participant.id !== email && participant.email !== email
      );
      const updatedTeam = updatedDetails.map((participant) => participant.name);
      const updatedParticipants = updatedDetails.map(
        (participant) => participant.id
      );

      await updateDoc(doc(db, "projects", projectId), {
        participants: updatedParticipants,
        team: updatedTeam,
        participantDetails: updatedDetails,
      });

      const userDocId = email.replace(/\./g, "_");
      await updateDoc(doc(db, "users", userDocId), {
        projectIds: arrayRemove(projectId),
      });

      setMembers((previous) =>
        previous.filter((member) => member.email !== email)
      );
      setOpenMenuIndex(null);

      if (selectedMember?.email === email) {
        setOpenEditModal(false);
        setSelectedMember(null);
      }
    } catch (err) {
      console.error("Error removing member from project:", err);
      alert(`Failed to remove member: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col rounded-2xl bg-gray-100 p-6">
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-500">Loading all users...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col rounded-2xl bg-gray-100 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            All Users{" "}
            <span className="text-sm font-normal text-gray-500">
              ({members.length} total)
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {members.map((member, index) => (
            <div
              key={member.id || member.email}
              className="relative flex h-72 flex-col items-center justify-between gap-2 rounded-2xl bg-white py-11 pb-0 text-center"
            >
              <div className="relative inline-flex">
                <div
                  className={`flex h-20 w-20 select-none items-center justify-center rounded-full ${getAvatarColor(
                    member.name
                  )} text-3xl font-bold uppercase text-white shadow-sm`}
                  role="img"
                  aria-label={`${member.name || "Unknown"} profile`}
                >
                  {member.name?.trim().charAt(0) || "?"}
                </div>

                {member.isOnline ? (
                  <span
                    className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-white ${getPresenceDotClass(
                      true
                    )}`}
                  />
                ) : (
                  <span
                    className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold leading-none ring-2 ring-white ${getPresenceBadgeClass()}`}
                  >
                    {getPresenceBadgeLabel(member, nowTick)}
                  </span>
                )}
              </div>

              <h3 className="text-md font-bold text-gray-800">{member.name}</h3>
              <p className="text-xs text-gray-500">{member.displayRole}</p>
              <p className="pb-12 text-xs text-gray-500">
                {member.designation || member.email}
              </p>

              <button
                type="button"
                className="w-full rounded-b-2xl bg-blue-500 px-3 py-3 text-xs text-white hover:bg-blue-600"
                onClick={() => openProfileView(member)}
              >
                View Profile
              </button>

              {isAdmin && (
                <div className="absolute right-2 top-2">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuIndex((current) =>
                        current === index ? null : index
                      )
                    }
                    data-menu-button-index={index}
                    className="text-gray-400 hover:text-gray-500"
                    aria-label="Open member menu"
                  >
                    •••
                  </button>

                  {openMenuIndex === index && (
                    <div
                      data-dropdown-index={index}
                      className="absolute right-0 z-50 mt-3 w-28 overflow-hidden rounded-2xl border border-[#DDD9D9] bg-white shadow-xl"
                    >
                      <button
                        type="button"
                        onClick={() => openEdit(member)}
                        className="w-full py-2 text-center text-black hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <div className="border-t border-[#DDD9D9]" />
                      <button
                        type="button"
                        onClick={() => deleteMember(member.email)}
                        className="w-full py-2 text-center text-red-600 hover:bg-red-50"
                      >
                        Remove from Project
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
              className="flex h-56 cursor-pointer flex-col items-center justify-center rounded-xl bg-[#f7fdff] px-3 py-4 text-center transition-all hover:bg-[#edf9fc]"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  setOpenAddModal(true);
                }
              }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-blue-300 bg-white text-blue-500">
                <Plus className="h-5 w-5" />
              </div>
              <p className="mt-2 text-sm font-medium text-blue-500">
                Add to Project
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Profile popup modal ─────────────────────────────── */}
      {openProfilePopup && profileMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="relative w-[90%] rounded-3xl bg-white p-6 shadow-2xl md:w-[500px]">
            <button
              type="button"
              onClick={closeProfilePopup}
              className="absolute right-4 top-4 text-gray-500 hover:text-black"
              aria-label="Close profile"
            >
              <X size={22} />
            </button>

            <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
              <div className="relative inline-flex">
                {/* Updated profile avatar: initial instead of remote image. */}
                <div
                  className={`flex h-20 w-20 select-none items-center justify-center rounded-full ${getAvatarColor(
                    profileMember.name
                  )} text-3xl font-bold uppercase text-white shadow-sm`}
                  role="img"
                  aria-label={`${profileMember.name || "Unknown"} profile`}
                >
                  {profileMember.name?.trim().charAt(0) || "?"}
                </div>

                {profileMember.isOnline ? (
                  <span
                    className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-white ${getPresenceDotClass(
                      true
                    )}`}
                  />
                ) : (
                  <span
                    className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-semibold leading-none ring-2 ring-white ${getPresenceBadgeClass()}`}
                  >
                    {getPresenceBadgeLabel(profileMember, nowTick)}
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {profileMember.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {profileMember.displayRole}
                </p>
                {isAdmin && (
                  <span className="text-xs font-medium text-purple-600">
                    🛡️ Admin — click ✎ to edit
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 pt-5 text-sm">
              {renderProfileField("Full Name", "name", profileMember.name)}
              {renderProfileField(
                "Email Address",
                "email",
                profileMember.email,
                "email"
              )}
              {renderProfileField(
                "Mobile Number",
                "mobile",
                profileMember.mobile,
                "tel"
              )}
              {renderProfileField(
                "Phone",
                "phone",
                profileMember.phone,
                "tel"
              )}
              {renderProfileField(
                "Designation",
                "designation",
                profileMember.designation
              )}

              <div>
                <p className="mb-1 text-sm font-semibold text-gray-700">Role</p>
                <span className="text-sm text-gray-500">
                  {profileMember.displayRole}
                </span>
              </div>

              <div>
                <p className="mb-1 text-sm font-semibold text-gray-700">
                  Date Joined
                </p>
                <span className="text-sm text-gray-500">
                  {profileMember.joined}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={closeProfilePopup}
                className="rounded-full bg-gray-100 px-6 py-2 text-sm text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Old edit modal (kept for backward compatibility) ─ */}
      {openEditModal && selectedMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="relative w-[90%] rounded-3xl bg-white p-6 shadow-2xl md:w-[550px]">
            <button
              type="button"
              onClick={() => setOpenEditModal(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-black"
              aria-label="Close edit modal"
            >
              <X size={22} />
            </button>

            <div className="flex items-center gap-4 pb-5">
              <div className="relative inline-flex">
                <img
                  src={`https://i.pravatar.cc/150?img=${selectedMember.img}`}
                  className="h-16 w-16 rounded-full"
                  alt={`${selectedMember.name || "Member"} profile`}
                />

                {selectedMember.isOnline ? (
                  <span
                    className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-white ${getPresenceDotClass(
                      true
                    )}`}
                  />
                ) : (
                  <span
                    className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[7px] font-semibold leading-none ring-2 ring-white ${getPresenceBadgeClass()}`}
                  >
                    {getPresenceBadgeLabel(selectedMember, nowTick)}
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-xl font-semibold">{selectedMember.name}</h2>
                <p className="text-sm text-gray-500">
                  {selectedMember.displayRole}
                </p>
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
                <p className="font-semibold">Designation</p>
                <p className="text-gray-500">
                  {selectedMember.designation || "—"}
                </p>
              </div>

              <div>
                <p className="font-semibold">Date Joined</p>
                <p className="text-gray-500">{selectedMember.joined}</p>
              </div>

              <div className="col-span-2">
                <p className="font-semibold">Roles</p>
                <div className="mt-1 flex items-center gap-3">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`role-${selectedMember.email}`}
                      defaultChecked={selectedMember.displayRole === "Admin"}
                    />
                    Admin
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`role-${selectedMember.email}`}
                      defaultChecked={selectedMember.displayRole === "Employee"}
                    />
                    Employee
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                type="button"
                className="rounded-full border border-red-400 px-6 py-2 text-red-500 hover:bg-red-50"
              >
                Restrict
              </button>
              <button
                type="button"
                onClick={() => setOpenEditModal(false)}
                className="rounded-full bg-red-500 px-6 py-2 text-white hover:bg-red-600"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add member modal ────────────────────────────────── */}
      {openAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="relative w-[90%] rounded-3xl bg-white p-6 shadow-2xl md:w-[450px]">
            <button
              type="button"
              onClick={() => setOpenAddModal(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-black"
              aria-label="Close add member modal"
            >
              <X size={22} />
            </button>

            <h2 className="mb-4 text-xl font-semibold">Add Project Member</h2>

            <form onSubmit={handleAddMemberSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Select Employee
                </label>

                {availableUsers.length > 0 ? (
                  <select
                    value={selectedUserToAdd}
                    onChange={(event) =>
                      setSelectedUserToAdd(event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-500">
                    No other employees available to add.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setOpenAddModal(false)}
                  className="rounded-full border border-gray-300 px-5 py-2 text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember || !selectedUserToAdd}
                  className="rounded-full bg-blue-600 px-5 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
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
