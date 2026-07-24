import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();

  // Request change states
  const [requestEmail, setRequestEmail] = useState("");
  const [requestPhone, setRequestPhone] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState({ email: false, phone: false });

  // Change password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmNewPass, setShowConfirmNewPass] = useState(false);
  const [passMsg, setPassMsg] = useState("");
  const [showPassForm, setShowPassForm] = useState(false);

  const handleRequestEmail = (e) => {
    e.preventDefault();
    if (!requestEmail.trim()) return;
    setRequestSubmitted((prev) => ({ ...prev, email: true }));
    setRequestEmail("");
    setTimeout(() => setRequestSubmitted((prev) => ({ ...prev, email: false })), 4000);
  };

  const handleRequestPhone = (e) => {
    e.preventDefault();
    if (!requestPhone.trim()) return;
    setRequestSubmitted((prev) => ({ ...prev, phone: true }));
    setRequestPhone("");
    setTimeout(() => setRequestSubmitted((prev) => ({ ...prev, phone: false })), 4000);
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    setPassMsg("");
    if (!currentPassword.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      setPassMsg("Please fill all password fields.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPassMsg("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPassMsg("New password must be at least 6 characters.");
      return;
    }
    setPassMsg("Password changed successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setTimeout(() => { setPassMsg(""); setShowPassForm(false); }, 4000);
  };

  const EyeIcon = ({ open }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#26203B]">
      {open ? (
        <>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  );

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#f0f4ff] to-[#e2e8ff]">
      {/* Top header */}
      <header className="w-full bg-white/70 backdrop-blur-md border-b border-[#e2e8ff] px-8 py-5 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-extrabold text-[#26203B] tracking-tight">Settings</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage your account preferences</p>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-xs text-[#20A4F3] hover:underline font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition"
        >
          Back to Home
        </button>
      </header>

      <main className="w-full max-w-6xl mx-auto px-6 md:px-10 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column - Requests */}
        <div className="lg:col-span-2 space-y-8">
          {/* Request Email Change */}
          <section className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-lg font-bold text-[#26203B] mb-1">Request Email Change</h2>
            <p className="text-xs text-gray-500 mb-5">Submit a request to update the email on your account.</p>
            <form onSubmit={handleRequestEmail} className="flex gap-3 items-end">
              <div className="flex-1">
                <label htmlFor="req-email" className="block text-xs font-medium text-[#26203B] mb-1">New Email</label>
                <input
                  id="req-email"
                  type="email"
                  placeholder="name@email.com"
                  className="w-full h-[44px] px-4 border border-[#a192dd] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  value={requestEmail}
                  onChange={(e) => setRequestEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="h-[44px] px-5 bg-[#20A4F3] text-white rounded-xl hover:bg-blue-600 transition text-xs font-bold shadow-sm"
              >
                Submit
              </button>
            </form>
            {requestSubmitted.email && (
              <p className="text-xs text-green-600 mt-3 font-medium">✓ Email change request sent.</p>
            )}
          </section>

          {/* Request Phone Change */}
          <section className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-lg font-bold text-[#26203B] mb-1">Request Phone Number Change</h2>
            <p className="text-xs text-gray-500 mb-5">Submit a request to update your mobile number.</p>
            <form onSubmit={handleRequestPhone} className="flex gap-3 items-end">
              <div className="flex-1">
                <label htmlFor="req-phone" className="block text-xs font-medium text-[#26203B] mb-1">New Phone Number</label>
                <input
                  id="req-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="w-full h-[44px] px-4 border border-[#a192dd] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  value={requestPhone}
                  onChange={(e) => setRequestPhone(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="h-[44px] px-5 bg-[#20A4F3] text-white rounded-xl hover:bg-blue-600 transition text-xs font-bold shadow-sm"
              >
                Submit
              </button>
            </form>
            {requestSubmitted.phone && (
              <p className="text-xs text-green-600 mt-3 font-medium">✓ Phone change request sent.</p>
            )}
          </section>
        </div>

        {/* Right sidebar - Password section */}
        <aside className="lg:col-span-1 space-y-8">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-sm font-medium text-gray-800">Password</h2>
            <p className="text-sm text-gray-600 mb-3">
              Ensure your account is using a strong password for security.
            </p>
            <button
              onClick={() => setShowPassForm((p) => !p)}
              className="px-4 py-2 text-sm text-black bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition"
            >
              🔐 Change Password
            </button>
          </div>

          {/* Expandable password form */}
          {showPassForm && (
            <div className="bg-white rounded-2xl shadow-md p-6 animate-in slide-in-from-top-2 duration-300">
              <h3 className="text-base font-bold text-[#26203B] mb-1">Update Password</h3>
              <p className="text-xs text-gray-500 mb-5">Create a strong, unique password.</p>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    placeholder="Current password"
                    className="w-full h-[44px] px-4 py-2 pr-10 border border-[#a192dd] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowCurrentPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#26203B] hover:text-blue-600 focus:outline-none"
                    aria-label={showCurrentPass ? "Hide current password" : "Show current password"}
                  >
                    <EyeIcon open={showCurrentPass} />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    placeholder="New password"
                    className="w-full h-[44px] px-4 py-2 pr-10 border border-[#a192dd] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#26203B] hover:text-blue-600 focus:outline-none"
                    aria-label={showNewPass ? "Hide new password" : "Show new password"}
                  >
                    <EyeIcon open={showNewPass} />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showConfirmNewPass ? "text" : "password"}
                    placeholder="Confirm new password"
                    className="w-full h-[44px] px-4 py-2 pr-10 border border-[#a192dd] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmNewPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#26203B] hover:text-blue-600 focus:outline-none"
                    aria-label={showConfirmNewPass ? "Hide confirm password" : "Show confirm password"}
                  >
                    <EyeIcon open={showConfirmNewPass} />
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#20A4F3] text-white py-2.5 rounded-xl hover:bg-blue-600 transition text-xs font-bold shadow-sm"
                >
                  Save Changes
                </button>
                {passMsg && (
                  <p className={`text-xs text-center font-medium ${passMsg.includes("successfully") ? "text-green-600" : "text-red-600"}`}>
                    {passMsg}
                  </p>
                )}
              </form>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
};

export default Settings;
