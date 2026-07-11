import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LeaveRequestDetailModal from "../components/Leave/LeaveRequestDetailModal";

// ─── Mock Notification Data Generator ──────────────────────────
const generateMockNotifications = () => [
  {
    id: "n1",
    type: "user_approval",
    userName: "John Doe",
    userEmail: "john@taskfleet.com",
    status: "pending",
    message: "Requested membership access for Project Alpha",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    isRead: false,
    userId: "u2",
    targetUserId: "u1"
  },
  {
    id: "n2",
    type: "leave_request",
    userName: "Sarah Connor",
    userEmail: "sarah@taskfleet.com",
    status: "pending_manager",
    message: "Requested Sick Leave for 2 days",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    isRead: false,
    userId: "u3",
    targetUserId: "u1"
  },
  {
    id: "n3",
    type: "project_update",
    userName: "Mike Ross",
    userEmail: "mike@taskfleet.com",
    status: "approved",
    message: "Project deadline extended by 3 days",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    isRead: true,
    userId: "u4"
  },
  {
    id: "n4",
    type: "user_approval",
    userName: "Rachel Green",
    userEmail: "rachel@taskfleet.com",
    status: "rejected",
    message: "Invitation to join company declined",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    isRead: true,
    userId: "u5"
  },
];

export default function NotificationDropdown({ isOpen, onClose }) {
  const dropdownRef = useRef(null);
  const [tab, setTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState(null);

  // ⭐ LOCAL STATE INITIALIZATION (No API Call)
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      // Simulate loading delay
      setLoading(true);
      setTimeout(() => {
        setNotifications(generateMockNotifications());
        setLoading(false);
      }, 600);
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Filter Notifications
  const notificationsRequests = notifications.filter((n) => n.type === "user_approval" && n.status === "pending");
  const listToShow = tab === "all" ? notifications : notificationsRequests;

  // Helper: Format time ago
  const getTimeAgo = (date) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  // Local Approval Logic (Simulated - No Backend)
  const handleApproval = (notificationId) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId 
        ? { ...n, status: "approved", isRead: true } 
        : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // Check if user can decide leave request (Simulated Admin Check)
  const canDecideLeave = (notification) => {
    return Boolean(notification?.status === "pending_manager" || notification?.status === "pending_hr");
  };

  const handleLeaveDecision = (action) => {
    if (!selectedLeaveRequest) return;

    setNotifications(prev => prev.map(n => {
      if (n.id !== selectedLeaveRequest.id) return n;
      
      return {
        ...n,
        status: action === 'approve' ? 'approved' : 'rejected',
        isRead: true
      };
    }));

    setSelectedLeaveRequest(null);
  };

  return (
    <>
      {/* Inject CSS */}
      <style>{`
        /* WebKit (Chrome, Edge, Safari) */
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.12);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.18);
        }
        /* Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(0,0,0,0.12) transparent;
        }
      `}</style>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-[360px] bg-white shadow-lg rounded-2xl border border-gray-200 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                className={`w-1/2 py-3 text-sm font-medium transition-colors ${
                  tab === "all" 
                    ? "text-blue-600 border-b-2 border-blue-500" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setTab("all")}
              >
                All
              </button>
              <button
                className={`w-1/2 py-3 text-sm font-medium transition-colors ${
                  tab === "requests" 
                    ? "text-blue-600 border-b-2 border-blue-500" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setTab("requests")}
              >
                Requests
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-16 text-gray-400 text-sm">
                  Loading notifications...
                </div>
              ) : listToShow.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {listToShow.map((n) => (
                    <div key={n.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {n.userName?.charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-2">
                              <p className="text-gray-800 font-medium text-sm truncate">{n.userName}</p>
                              {!n.isRead && <span className="h-2 w-2 bg-red-500 rounded-full"></span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{getTimeAgo(n.createdAt)}</p>
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        {n.status === "approved" && (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full shrink-0">✓ Approved</span>
                        )}
                        {n.status === "rejected" && (
                          <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full shrink-0">✗ Rejected</span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={n.type !== 'leave_request'}
                        onClick={() => n.type === 'leave_request' && setSelectedLeaveRequest(n)}
                        className={`mt-2 w-full text-left text-sm ${
                          n.type === 'leave_request' 
                            ? "text-gray-600 hover:text-blue-600 cursor-pointer" 
                            : "text-gray-400 cursor-default"
                        }`}
                      >
                        {n.message}
                        {n.userEmail && <p className="text-xs text-gray-400 mt-1">{n.userEmail}</p>}
                        {n.type === 'leave_request' && (
                          <span className="mt-1 inline-flex rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">
                            Open leave card
                          </span>
                        )}
                      </button>

                      {/* Action Buttons for Pending Approvals */}
                      {n.type === "user_approval" && n.status === "pending" && (
                        <div className="flex gap-2 mt-3">
                          <button 
                            onClick={() => handleApproval(n.id)}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50 active:bg-gray-100 transition"
                          >
                            Approve
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <p className="text-sm mb-2">No notifications</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button 
                onClick={markAllAsRead}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Mark all as read
              </button>
              <button className="text-sm bg-blue-600 px-3 py-1.5 rounded-lg text-white font-medium hover:bg-blue-700 transition-colors shadow-sm">
                View all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Request Modal */}
      <LeaveRequestDetailModal
        isOpen={Boolean(selectedLeaveRequest)}
        request={selectedLeaveRequest}
        onClose={() => setSelectedLeaveRequest(null)}
        canDecide={Boolean(selectedLeaveRequest && canDecideLeave(selectedLeaveRequest))}
        actionLoading={false}
        onApprove={() => selectedLeaveRequest && handleLeaveDecision('approve')}
        onReject={() => selectedLeaveRequest && handleLeaveDecision('reject')}
        title="Leave Request"
      />
    </>
  );
}