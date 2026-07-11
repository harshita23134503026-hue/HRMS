import React, { useCallback, useEffect, useMemo, useState } from 'react';

// ─── Mock Regularization Pending Data (Frontend Only) ──────────
const MOCK_PENDING_REQUESTS = [
  {
    id: 'reg-pend-1',
    userId: 101,
    userName: 'John Doe',
    userEmail: 'john@taskfleet.com',
    message: 'Regularize Late Arrival due to Train Strike',
    type: 'regularization_request',
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
  },
  {
    id: 'reg-pend-2',
    userId: 102,
    userName: 'Sarah Connor',
    userEmail: 'sarah@taskfleet.com',
    message: 'Regularize Work From Home to Office Day',
    type: 'regularization_request',
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
  },
  {
    id: 'reg-pend-3',
    userId: 103,
    userName: 'Mike Ross',
    userEmail: 'mike@taskfleet.com',
    message: 'Regularize Missing Hours',
    type: 'regularization_request',
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000 * 0.5).toISOString(), // Half day ago
  },
];

// ─── Helper Functions ──────────────────────────────────────────
const buildAuthHeader = () => {
  // Mock implementation returns empty object
  return {};
};

const toAvatar = (notification) => {
  const seed = notification.userId || notification.id || 1;
  return `https://i.pravatar.cc/80?img=${(Number(seed) % 70) + 1}`;
};

function ReguPendingList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // ─── Mock User Role (Frontend Simulation) ──────────────────────
  // Hardcoded as 'admin' so users can see action buttons for testing
  const currentRole = useMemo(() => {
    return 'admin'; 
  }, []);

  const canManageRequests = ['admin', 'sadmin', 'hr', 'hr_manager'].includes(currentRole);

  // ─── Load Initial Data ─────────────────────────────────────────
  const fetchRequests = useCallback(() => {
    setLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      setRequests(MOCK_PENDING_REQUESTS);
      setLoading(false);
    }, 800);
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ⭐ REMOVED: useNotificationStream hook (No backend connection needed)

  // ─── Action Handler (Local Simulation) ─────────────────────────
  const handleDecision = (notificationId, action) => {
    try {
      setActionLoadingId(notificationId);

      // Optimistic UI Update: Remove item from list or mark as done locally
      setTimeout(() => {
        setRequests((prev) => prev.filter((req) => req.id !== notificationId));
        setActionLoadingId(null);
        
        alert(`${action === 'approve' ? 'Approved' : 'Rejected'} successfully!`);
      }, 1000); // Simulate processing time
      
    } catch (error) {
      console.error('Failed to update regularization request:', error);
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="h-1 bg-sky-500 w-full" />
        
        {/* Desktop Table View */}
        <div className="hidden sm:block">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full">
              <thead>
                <tr className="text-xs font-semibold text-gray-600 bg-white">
                  <th className="text-left px-5 py-4 uppercase tracking-wider">Description</th>
                  <th className="text-left px-5 py-4 uppercase tracking-wider">Applicant</th>
                  <th className="text-left px-5 py-4 uppercase tracking-wider">Requested On</th>
                  <th className="text-left px-5 py-4 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-4 uppercase tracking-wider">Type</th>
                  {canManageRequests && (
                    <th className="text-left px-5 py-4 uppercase tracking-wider">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td 
                      className="px-5 py-6 text-sm text-gray-500" 
                      colSpan={canManageRequests ? 6 : 5}
                    >
                      Loading...
                    </td>
                  </tr>
                ) : requests.length ? (
                  requests.map((r) => (
                    <tr key={r.id} className="bg-white hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="max-w-[320px] truncate text-sm text-gray-800">{r.message}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img src={toAvatar(r)} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <span className="text-sm text-gray-800">{r.userName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">
                        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 border border-yellow-200">
                          Pending
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{r.type}</td>
                      
                      {canManageRequests && (
                        <td className="px-5 py-4 text-sm text-gray-700">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDecision(r.id, 'approve')}
                              disabled={actionLoadingId === r.id}
                              className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDecision(r.id, 'reject')}
                              disabled={actionLoadingId === r.id}
                              className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td 
                      className="px-5 py-6 text-sm text-gray-500" 
                      colSpan={canManageRequests ? 6 : 5}
                    >
                      No regularization requests yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile List View */}
        <div className="sm:hidden divide-y divide-gray-200">
          {loading ? (
            <div className="p-4 text-sm text-gray-500 text-center">Loading...</div>
          ) : requests.length ? (
            requests.map((r) => (
              <div key={r.id} className="p-4">
                <div className="text-sm font-medium text-gray-900 truncate">{r.message}</div>
                <div className="mt-3 flex items-center gap-3">
                  <img src={toAvatar(r)} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <div className="text-sm text-gray-800">{r.userName}</div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-600">
                  <div>
                    <div className="text-gray-400">Requested On</div>
                    <div className="text-gray-700 text-sm">{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Status</div>
                    <div className="text-gray-700 text-sm">Pending</div>
                  </div>
                </div>
                {canManageRequests && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleDecision(r.id, 'approve')}
                      disabled={actionLoadingId === r.id}
                      className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecision(r.id, 'reject')}
                      disabled={actionLoadingId === r.id}
                      className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-gray-500 text-center">No regularization requests yet</div>
          )}
        </div>

      </div>
    </div>
  );
}

export default ReguPendingList;