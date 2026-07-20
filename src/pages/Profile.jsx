import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

/**
 * Converts an email to a Firestore-safe document ID:
 * "tanmay@taskfleet.com" -> "tanmay_taskfleet.com"
 */
const emailToDocId = (email) => email.replace(/\./g, "_");

const ProfileSettings = () => {
  const [user, setUser] = useState(null);           // Firebase auth user
  const [profile, setProfile] = useState(null);     // Firestore document data
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editField, setEditField] = useState(null); // which field is being edited
  const [formValues, setFormValues] = useState({}); // temporary edit values

  // ── Fetch current auth user ──────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
    });
    return unsub;
  }, []);

  // ── Fetch Firestore profile when auth user is available ──────────────
  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const docId = emailToDocId(user.email);

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "users", docId);
        const snap = await getDoc(docRef);

        if (snap.exists()) {
          setProfile({ id: docId, ...snap.data() });
        } else {
          // Document doesn't exist yet — set defaults
          setProfile({
            id: docId,
            name: user.displayName || "",
            email: user.email,
            mobile: "",
            designation: "",
            role: "user",          // default role
          });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // ── Determine if the current user has admin privileges ───────────────
  const isAdmin = profile?.role === "Admin";

  // ── Start editing a field ────────────────────────────────────────────
  const handleEdit = (field) => {
    if (!isAdmin) return;
    setFormValues((prev) => ({ ...prev, [field]: profile[field] || "" }));
    setEditField(field);
  };

  // ── Cancel editing ───────────────────────────────────────────────────
  const handleCancel = () => {
    setEditField(null);
    setFormValues({});
  };

  // ── Save a single field to Firestore ─────────────────────────────────
  const handleSave = async (field) => {
    if (!isAdmin || !profile?.id) return;

    setSaving(true);
    try {
      const docRef = doc(db, "users", profile.id);
      await updateDoc(docRef, { [field]: formValues[field] });

      setProfile((prev) => ({ ...prev, [field]: formValues[field] }));
      setEditField(null);
      setFormValues({});
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render an editable field row ─────────────────────────────────────
  const renderField = (label, field, value, type = "text") => {
    const isEditing = editField === field;

    return (
      <div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type={type}
              value={formValues[field] || ""}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, [field]: e.target.value }))
              }
              className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
              disabled={saving}
            />
            <button
              onClick={() => handleSave(field)}
              disabled={saving}
              className="text-green-600 text-xs font-medium hover:underline disabled:opacity-50"
            >
              {saving ? "Saving…" : "✓"}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="text-red-500 text-xs hover:underline disabled:opacity-50"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-gray-800">{value || "—"}</span>
            {isAdmin && (
              <button
                onClick={() => handleEdit(field)}
                className="text-blue-500 text-xs hover:underline ml-1"
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

  // ── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-2 w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading profile…</p>
      </div>
    );
  }

  // ── Not signed in ────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="p-2 w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Please sign in to view your profile.</p>
      </div>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────
  return (
    <div className="p-2 w-full min-h-screen bg-gray-50">
      <div className="max-w-4xl bg-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 mb-1">
              Profile Settings
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              Manage your personal information and preferences
            </p>
          </div>
          {/* Role badge */}
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ${
              isAdmin
                ? "bg-purple-100 text-purple-700 border border-purple-300"
                : "bg-gray-100 text-gray-600 border border-gray-300"
            }`}
          >
            {profile?.role === "admin" ? "🛡️ Admin" : "👤 User"}
          </span>
        </div>

        {/* ── Main Profile Card ──────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6 mb-6">
          {/* Avatar and Name */}
          <div className="flex items-center gap-4">
            <img
              src={`https://api.dicebear.com/6.x/thumbs/svg?seed=${
                profile?.name || "user"
              }`}
              alt="Avatar"
              className="w-20 h-20 rounded-full"
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {profile?.name || "User"}
              </h2>
              <p className="text-sm text-gray-500">
                {profile?.designation || "No designation set"}
              </p>
              {isAdmin && (
                <span className="text-xs text-purple-600 font-medium">
                  Admin — you can edit all fields
                </span>
              )}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            {renderField("Full Name", "name", profile?.name)}
            {renderField("Email Address", "email", profile?.email, "email")}
            {renderField("Mobile Number", "mobile", profile?.mobile, "tel")}
            {renderField("Designation", "designation", profile?.designation)}
          </div>
        </div>

        {/* ── Password Card ──────────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-sm font-medium text-gray-800">Password</h2>
          <p className="text-sm text-gray-600 mb-3">
            Ensure your account is using a strong password for security.
          </p>
          <button className="px-4 py-2 text-sm text-black bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition">
            🔐 Change Password
          </button>
        </div>

        {/* ── Firestore sync indicator ───────────────────────────────── */}
        <p className="text-xs text-gray-400 mt-4 text-right">
          Data synced with Firestore (users / {profile?.id})
        </p>
      </div>
    </div>
  );
};

export default ProfileSettings;
