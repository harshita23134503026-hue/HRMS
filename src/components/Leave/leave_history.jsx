import React, { useState, useEffect } from 'react';
import LeaveRequestDetailModal from './LeaveRequestDetailModal';

// ─── Mock Leave Request Data ──────────────────────────────────────
const MOCK_REQUESTS = [
  {
    id: 'req-1',
    userId: 101,
    userName: 'John Doe',
    message: 'Sick Leave - Flu Symptoms',
    type: 'leave_request',
    status: 'pending_manager',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
    start_date: '2025-08-20',
    end_date: '2025-08-22',
    notes: 'Expected to recover by Monday.',
  },
  {
    id: 'req-2',
    userId: 102,
    userName: 'Sarah Connor',
    message: 'Casual Leave - Family Event',
    type: 'leave_request',
    status: 'approved',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    start_date: '2025-08-15',
    end_date: '2025-08-15',
    notes: 'Attending sister\'s wedding.',
  },
  {
    id: 'req-3',
    userId: 103,
    userName: 'Mike Ross',
    message: 'Personal Leave - Medical Checkup',
    type: 'leave_request',
    status: 'rejected',
    reason: 'Insufficient balance remaining.',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
    start_date: '2025-08-10',
    end_date: '2025-08-10',
    notes: 'Routine checkup only.',
  },
  {
    id: 'req-4',
    userId: 104,
    userName: 'Rachel Green',
    message: 'Planned Vacation to Bali',
    type: 'leave_request',
    status: 'pending_hr',
    createdAt: new Date(Date.now() - 86400000 * 0.5).toISOString(), // Half day ago
    start_date: '2025-09-01',
    end_date: '2025-09-15',
    notes: 'Need team coverage for this period.',
  },
];

// Helper to generate avatar URL based on ID
const toAvatar = (request) => {
  const seed = request.userId || request.id || 1;
  return `https://i.pravatar.cc/80?img=${(Number(seed) % 70) + 1}`;
};

// Status color mapping
const statusStyles = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'approved') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (normalized === 'rejected') return 'bg-rose-100 text-rose-800 border border-rose-200';
  if (normalized === 'pending_hr') return 'bg-blue-100 text-blue-800 border border-blue-200';
  if (normalized === 'pending_manager') return 'bg-amber-100 text-amber-800 border border-amber-200';
  if (normalized === 'pending') return 'bg-amber-100 text-amber-800 border border-amber-200';
  return 'bg-gray-100 text-gray-700 border border-gray-200';
};

function HistoryList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // ─── Simulate Initial Load ─────────────────────────────────────
  useEffect(() => {
    setTimeout(() => {
      setRequests(MOCK_REQUESTS);
      setLoading(false);
    }, 800); // Fake network delay
  }, []);

  // No realtime stream needed in frontend mode
  
  const openRequest = (r) => {
    setSelectedRequest(r);
  };

  const closeRequest = () => {
    setSelectedRequest(null);
  };

  const formatDate = (dateString) => {
    try {
        return new Date(dateString).toLocaleDateString(undefined, {
          year: 'numeric', month: 'long', day: 'numeric'
        });
    } catch {
        return '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="h-1 bg-sky-500 w-full" />
        
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-[900px] w-full">
            <thead>
              <tr className="text-xs font-semibold text-gray-600 bg-gray-50">
                <th className="text-left px-5 py-4 uppercase tracking-wider">Description</th>
                <th className="text-left px-5 py-4 uppercase tracking-wider">Applicant</th>
                <th className="text-left px-5 py-4 uppercase tracking-wider">Requested On</th>
                <th className="text-left px-5 py-4 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-4 uppercase tracking-wider">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td className="px-5 py-6 text-sm text-gray-500" colSpan={5}>Loading history...</td></tr>
              ) : requests.length ? (
                requests.map((r) => (
                  <tr 
                    key={r.id} 
                    className="bg-white hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => openRequest(r)}
                  >
                    <td className="px-5 py-4">
                      <div className="max-w-[320px] truncate text-sm text-gray-800 font-medium">{r.message}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <img src={toAvatar(r)} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                        <span className="text-sm text-gray-800">{r.userName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{formatDate(r.createdAt)}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles(r.status)}`}>
                        {r.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{r.type}</td>
                  </tr>
                ))
              ) : (
                <tr><td className="px-5 py-6 text-sm text-gray-500" colSpan={5}>No leave requests found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="sm:hidden divide-y divide-gray-100">
          {loading ? (
            <div className="p-4 text-sm text-gray-500 text-center">Loading...</div>
          ) : requests.length ? (
            requests.map((r) => (
              <div key={r.id} className="p-4 active:bg-gray-50 cursor-pointer" onClick={() => openRequest(r)}>
                <div className="text-base font-semibold text-gray-900">{r.message}</div>
                <div className="mt-3 flex items-center gap-3">
                  <img src={toAvatar(r)} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <div className="text-sm font-medium text-gray-800">{r.userName}</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
                  <div>
                    <div className="text-gray-400 mb-1">Requested On</div>
                    <div className="text-gray-700 font-medium">{formatDate(r.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Status</div>
                    <div className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusStyles(r.status)}`}>
                       {r.status.replace(/_/g, ' ').toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-gray-500 text-center">No leave requests found</div>
          )}
        </div>

      </div>

      {/* Details Modal (Frontend Only Simulation) */}
      <LeaveRequestDetailModal
        isOpen={Boolean(selectedRequest)}
        request={selectedRequest}
        onClose={closeRequest}
        canDecide={false} // Hardcoded false until RBAC logic is integrated differently
        actionLoading={false}
        onApprove={() => console.log('Approved')}
        onReject={() => console.log('Rejected')}
        title="Leave request details"
      />
    </div>
  );
}

export default HistoryList;