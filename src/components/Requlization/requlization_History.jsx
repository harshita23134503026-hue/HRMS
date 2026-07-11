import React, { useEffect, useState } from 'react';

// ─── Mock Data ───────────────────────────────────────────────
const MOCK_REGULARIZATION_HISTORY = [
  {
    id: "rg1",
    type: "regularization_request",
    status: "approved",
    userId: "1",
    userName: "Olivia Martin",
    message: "Regularization for missed punch-out on Apr 02.",
    fromDate: "2026-04-02",
    toDate: "2026-04-02",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days ago
  },
  {
    id: "rg2",
    type: "regularization_request",
    status: "rejected",
    userId: "2",
    userName: "Jackson Lee",
    message: "Regularization for late punch-in on Apr 05.",
    fromDate: "2026-04-05",
    toDate: "2026-04-05",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(), // 12 days ago
  },
  {
    id: "rg3",
    type: "regularization_request",
    status: "pending",
    userId: "3",
    userName: "Sophia Brown",
    message: "Regularization for missed punch-in on Apr 14.",
    fromDate: "2026-04-14",
    toDate: "2026-04-14",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), // 4 days ago
  },
  {
    id: "rg4",
    type: "regularization_request",
    status: "approved",
    userId: "5",
    userName: "Ava Johnson",
    message: "Regularization for attendance correction (Apr 08 – Apr 09).",
    fromDate: "2026-04-08",
    toDate: "2026-04-09",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(), // 9 days ago
  },
  {
    id: "rg5",
    type: "regularization_request",
    status: "pending",
    userId: "4",
    userName: "Ethan Wilson",
    message: "Regularization for missed punch-out on Apr 17.",
    fromDate: "2026-04-17",
    toDate: "2026-04-17",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(), // 20 hrs ago
  },
];

const toAvatar = (notification) => {
  const seed = notification.userId || notification.id || 1;
  return `https://i.pravatar.cc/80?img=${(Number(seed) % 70) + 1}`;
};

function ReguHistoryList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load mock regularization history (simulates fetch delay)
  useEffect(() => {
    setLoading(true);

    const timer = setTimeout(() => {
      setRequests(MOCK_REGULARIZATION_HISTORY);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const statusStyles = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved') return 'bg-emerald-100 text-emerald-800';
    if (normalized === 'rejected') return 'bg-rose-100 text-rose-800';
    if (normalized === 'pending') return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-700';
  };

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
                  <th className="text-left px-5 py-4">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td className="px-5 py-6 text-sm text-gray-500" colSpan={5}>Loading...</td></tr>
                ) : requests.length ? (
                  requests.map((r) => (
                    <tr key={r.id} className="bg-white">
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
                      <td className="px-5 py-4 text-sm text-gray-700">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{r.type}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td className="px-5 py-6 text-sm text-gray-500" colSpan={5}>No regularization requests yet</td></tr>
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
                    <div className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusStyles(r.status)}`}>
                      {r.status}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-gray-500">No regularization requests yet</div>
          )}
        </div>

      </div>
    </div>
  );
}

export default ReguHistoryList;