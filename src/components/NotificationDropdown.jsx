import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { BASE_URL } from "../utility/Config";
import LeaveRequestDetailModal from "../components/Leave/LeaveRequestDetailModal";

export default function NotificationDropdown({ isOpen, onClose }) {
  const dropdownRef = useRef(null);
  const [tab, setTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState(null);

  const upsertNotification = (incoming) => {
    setNotifications((prev) => {
      const index = prev.findIndex((item) => item.id === incoming.id);
      if (index === -1) {
        return [incoming, ...prev].slice(0, 50);
      }

      const next = [...prev];
      next[index] = { ...next[index], ...incoming };
      return next;
    });
  };

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    const streamUrl = `${BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    const handleNotificationEvent = (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        if (!payload.notification) {
          return;
        }
        upsertNotification(payload.notification);
      } catch (error) {
        console.error("Error parsing notification stream event:", error);
      }
    };

    eventSource.addEventListener("notification.created", handleNotificationEvent);
    eventSource.addEventListener("notification.updated", handleNotificationEvent);

    eventSource.onerror = (error) => {
      console.error("Notification stream disconnected:", error);
    };

    return () => {
      eventSource.removeEventListener("notification.created", handleNotificationEvent);
      eventSource.removeEventListener("notification.updated", handleNotificationEvent);
      eventSource.close();
    };
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(BASE_URL + "/notifications", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true
      });
      setNotifications(res.data.notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (notification, action) => {
    try {
      const token = localStorage.getItem('token');
      // Use existing company approve endpoint
      await axios.post(
        `${BASE_URL}/company/approve`,
        { 
          userId: notification.userId, 
          action 
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );
      
      // Mark notification as read after approval
      await axios.patch(
        `${BASE_URL}/notifications/${notification.id}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true
        }
      );
      
      // Refresh notifications after approval
      fetchNotifications();
    } catch (error) {
      console.error("Error handling approval:", error);
    }
  };

  const handleLeaveDecision = async (notification, action, reason) => {
    try {
      const token = localStorage.getItem('token');
      const payload = action === 'reject' ? { action, reason } : { action };

      await axios.patch(
        `${BASE_URL}/notifications/${notification.id}/decision`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      setSelectedLeaveRequest(null);
      fetchNotifications();
    } catch (error) {
      console.error('Error handling leave decision:', error);
      alert(error.response?.data?.msg || 'Failed to update leave request');
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      await Promise.all(
        unreadNotifications.map(n => 
          axios.patch(
            `${BASE_URL}/notifications/${n.id}/read`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true
            }
          )
        )
      );
      
      fetchNotifications();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

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

  const notificationsRequests = notifications.filter((n) => n.type === "user_approval" && n.status === "pending");
  const listToShow = tab === "all" ? notifications : notificationsRequests;

  const normalizeRole = (role) => String(role || '').toLowerCase();
  const currentToken = localStorage.getItem('token');
  const currentUser = (() => {
    try {
      if (!currentToken) return { id: null, role: '' };
      return JSON.parse(atob(currentToken.split('.')[1]));
    } catch {
      return { id: null, role: '' };
    }
  })();

  const canDecideLeave = (notification) => {
    const status = String(notification?.status || '').toLowerCase();
    if (!['pending_manager', 'pending_hr'].includes(status)) return false;
    if (String(notification?.userId) === String(currentUser.id)) return false;

    const targetUserId = notification?.targetUserId ? String(notification.targetUserId) : null;
    const targetRole = normalizeRole(notification?.targetRole);
    const currentRole = normalizeRole(currentUser.role);

    return Boolean(
      targetUserId === String(currentUser.id) ||
      (targetRole && targetRole === currentRole) ||
      ['admin', 'sadmin'].includes(currentRole)
    );
  };

  return (
    <>
      {/* Inject small CSS for transparent scrollbar + firefox support */}
      <style>{`
        /* WebKit (Chrome, Edge, Safari) */
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.12);
          border-radius: 10px;
          border: 2px solid transparent; /* keep thumb separated */
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
            className="absolute right-0 mt-3 w-[360px] bg-white shadow-lg rounded-2xl border border-[#DDD9D9] z-50"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b" style={{ borderColor: "#DDD9D9" }}>
              <h3 className="text-lg font-semibold">Notifications</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b text-sm font-medium" style={{ borderColor: "#DDD9D9" }}>
              <button
                className={`w-1/2 py-3 ${tab === "all" ? "text-blue-600 border-b-2 border-blue-500" : "text-gray-500"}`}
                onClick={() => setTab("all")}
              >
                All
              </button>
              <button
                className={`w-1/2 py-3 ${tab === "requests" ? "text-blue-600 border-b-2 border-blue-500" : "text-gray-500"}`}
                onClick={() => setTab("requests")}
              >
                Requests
              </button>
            </div>

            {/* Notifications List (uses custom scrollbar and divide color #DDD9D9) */}
            <div className="max-h-[360px] overflow-y-auto px-4 py-0 custom-scrollbar">
              {loading ? (
                <div className="text-center py-6 text-gray-400">Loading...</div>
              ) : (
                <div className="divide-y divide-[#DDD9D9]">
                  {listToShow.length > 0 ? (
                    listToShow.map((n) => (
                      <div key={n.id} className="py-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                              {n.userName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-gray-700 font-medium">{n.userName}</p>
                              <p className="text-xs text-gray-400">{getTimeAgo(n.createdAt)}</p>
                            </div>
                          </div>
                          {!n.isRead && <div className="h-2 w-2 bg-red-500 rounded-full" />}
                        </div>

                        <button
                          type="button"
                          onClick={() => n.type === 'leave_request' && setSelectedLeaveRequest(n)}
                          className="mt-2 w-full text-left"
                        >
                          <p className="text-sm text-gray-600">{n.message}</p>
                          {n.type === 'leave_request' && (
                            <span className="mt-2 inline-flex rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">
                              Open leave card
                            </span>
                          )}
                        </button>
                        {n.userEmail && <p className="text-xs text-gray-400 mt-1">{n.userEmail}</p>}

                        {n.type === "user_approval" && n.status === "pending" && (
                          <div className="flex gap-3 mt-3">
                            <button 
                              onClick={() => handleApproval(n, "reject")}
                              className="px-3 py-1 rounded-lg border text-gray-600 text-sm hover:bg-gray-50" 
                              style={{ borderColor: "#DDD9D9" }}
                            >
                              Reject
                            </button>
                            <button 
                              onClick={() => handleApproval(n, "approve")}
                              className="px-3 py-1 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600"
                            >
                              Approve
                            </button>
                          </div>
                        )}

                        {n.status === "approved" && (
                          <div className="mt-2 text-xs text-green-600 font-medium">✓ Approved</div>
                        )}
                        {n.status === "rejected" && (
                          <div className="mt-2 text-xs text-red-600 font-medium">✗ Rejected</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-400 py-6">No notifications</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-4 py-3 border-t" style={{ borderColor: "#DDD9D9" }}>
              <button 
                onClick={markAllAsRead}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Mark all as read
              </button>
              <button className="text-sm bg-blue-500 px-3 py-1 rounded-lg text-white hover:bg-blue-600">
                View all Notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LeaveRequestDetailModal
        isOpen={Boolean(selectedLeaveRequest)}
        request={selectedLeaveRequest}
        onClose={() => setSelectedLeaveRequest(null)}
        canDecide={Boolean(selectedLeaveRequest && canDecideLeave(selectedLeaveRequest))}
        actionLoading={false}
        onApprove={() => selectedLeaveRequest && handleLeaveDecision(selectedLeaveRequest, 'approve')}
        onReject={(reason) => selectedLeaveRequest && handleLeaveDecision(selectedLeaveRequest, 'reject', reason)}
        title="Leave request"
      />
    </>
  );
}