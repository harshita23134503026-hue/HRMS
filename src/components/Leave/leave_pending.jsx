import React, { useEffect, useState } from 'react';
import LeaveRequestDetailModal from './LeaveRequestDetailModal';

// ─── Mock Data ───────────────────────────────────────────────
const MOCK_PENDING_REQUESTS = [
  {
    id: "lr1",
    type: "leave_request",
    status: "pending_manager",
    userId: "2",
    userName: "Jackson Lee",
    message: "Applied for 3 days of Sick Leave (Apr 21 – Apr 23).",
    leaveType: "Sick Leave",
    startDate: "2026-04-21",
    endDate: "2026-04-23",
    reason: "Viral fever, doctor advised rest.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "lr3",
    type: "leave_request",
    status: "pending_hr",
    userId: "5",
    userName: "Ava Johnson",
    message: "Applied for 5 days of Planned Leave (May 05 – May 09).",
    leaveType: "Planned Leave",
    startDate: "2026-05-05",
    endDate: "2026-05-09",
    reason: "Vacation with family.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
  },
  {
    id: "lr6",
    type: "leave_request",
    status: "pending_manager",
    userId: "3",
    userName: "Sophia Brown",
    message: "Applied for 1 day of Work From Home (Apr 24).",
    leaveType: "Work From Home",
    startDate: "2026-04-24",
    endDate: "2026-04-24",
    reason: "Plumber visit at home.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
  },
];

const toAvatar = (notification) => {
  const seed = notification.userId || notification.id || 1;
  return `https://i.pravatar.cc/80?img=${(Number(seed) % 70) + 1}`;
};

function PendingList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Load mock pending requests (simulates fetch delay)
  useEffect(() => {
    setLoading(true);

    const timer = setTimeout(() => {
      setRequests(MOCK_PENDING_REQUESTS);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Handle approve/reject in local state
  const handleDecision = (notificationId, action, reason) => {
    setActionLoadingId(notificationId);

    // Simulate API delay
    setTimeout(() => {
      setRequests((prev) => prev.filter((r) => r.id !== notificationId));
      setSelectedRequest(null);
      setActionLoadingId(null);

      console.log(`Leave request ${action}d (mock):`, { notificationId, reason });
    }, 600);
  };

  const statusLabel = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'pending_manager') return 'Pending manager review';
    if (normalized === 'pending_hr') return 'Pending HR review';
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'rejected') return 'Rejected';
    return 'Pending';
  };

  // Frontend-only: all requests are actionable
  const canManageRequests = requests.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="h-1 bg-sky-500" />
        <div className="hidden sm:block">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full">
              <thead>
                <tr className="text-xs font-semibold text-gray-600 bg-white">
                  <th className="text-left px-5 py-4">Description</th>
                  <th className="text-left px-5 py-4">Applied to</th>
                  <th className="text-left px-5 py-4">Requested On</th>
                  <th className="text-left px-5 py-4">Status</th>
                  {canManageRequests && <th className="text-left px-5 py-4">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td className="px-5 py-6 text-sm text-gray-500" colSpan={canManageRequests ? 5 : 4}>Loading...</td></tr>
                ) : requests.length ? (
                  requests.map((r) => (
                    <tr key={r.id} className="bg-white cursor-pointer hover:bg-slate-50" onClick={() => setSelectedRequest(r)}>
                      <td className="px-5 py-4">
                        <div className="max-w-[320px] truncate text-sm text-gray-800">{r.message}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img src={toAvatar(r)} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <span className="text-sm text-gray-800">{r.userName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-sm text-gray-700"><span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">{statusLabel(r.status)}</span></td>
                      {canManageRequests && (
                        <td className="px-5 py-4 text-sm text-gray-700">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedRequest(r); }}
                            className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white"
                          >
                            View
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr><td className="px-5 py-6 text-sm text-gray-500" colSpan={canManageRequests ? 5 : 4}>No pending leave requests</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sm:hidden divide-y divide-gray-200">
          {loading ? (
            <div className="p-4 text-sm text-gray-500">Loading...</div>
          ) : requests.length ? (
            requests.map((r) => (
              <div key={r.id} className="p-4 cursor-pointer" onClick={() => setSelectedRequest(r)}>
                <div className="text-sm font-medium text-gray-900 truncate">{r.message}</div>
                <div className="mt-3 flex items-center gap-3">
                  <img src={toAvatar(r)} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <div className="text-sm text-gray-800">{r.userName}</div>
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  <div className="text-gray-400">Requested On</div>
                  <div className="text-gray-700 text-sm">{new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
                {canManageRequests && (
                  <div className="mt-3 inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                    {statusLabel(r.status)}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-gray-500">No pending leave requests</div>
          )}
        </div>

      </div>

      <LeaveRequestDetailModal
        isOpen={Boolean(selectedRequest)}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        canDecide={Boolean(selectedRequest)}
        actionLoading={Boolean(actionLoadingId)}
        onApprove={() => selectedRequest && handleDecision(selectedRequest.id, 'approve')}
        onReject={(reason) => selectedRequest && handleDecision(selectedRequest.id, 'reject', reason)}
        title="Leave approval"
      />
    </div>
  );
}

export default PendingList;