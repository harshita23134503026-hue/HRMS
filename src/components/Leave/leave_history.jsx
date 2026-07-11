import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../utility/Config';
import useNotificationStream from '../utility/useNotificationStream';
import LeaveRequestDetailModal from './LeaveRequestDetailModal';

const buildAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const toAvatar = (notification) => {
  const seed = notification.userId || notification.id || 1;
  return `https://i.pravatar.cc/80?img=${(Number(seed) % 70) + 1}`;
};

function HistoryList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/notifications?type=leave_request`, buildAuthHeader());
      setRequests(Array.isArray(res.data?.notifications) ? res.data.notifications : []);
    } catch (error) {
      console.error('Failed to load leave history:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useNotificationStream((payload, eventType) => {
    const notification = payload?.notification;
    if (!notification) return;
    if (notification.type !== 'leave_request') return;
    if (eventType === 'notification.created' || eventType === 'notification.updated') {
      fetchRequests();
    }
  });

  const statusStyles = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved') return 'bg-emerald-100 text-emerald-800';
    if (normalized === 'rejected') return 'bg-rose-100 text-rose-800';
    if (normalized === 'pending_hr') return 'bg-blue-100 text-blue-800';
    if (normalized === 'pending_manager') return 'bg-amber-100 text-amber-800';
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
                      <td className="px-5 py-4 text-sm text-gray-700">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{r.type}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td className="px-5 py-6 text-sm text-gray-500" colSpan={5}>No leave requests yet</td></tr>
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
            <div className="p-4 text-sm text-gray-500">No leave requests yet</div>
          )}
        </div>

      </div>

      <LeaveRequestDetailModal
        isOpen={Boolean(selectedRequest)}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        canDecide={false}
        actionLoading={false}
        onApprove={() => {}}
        onReject={() => {}}
        title="Leave request details"
      />
    </div>
  );
}

export default HistoryList;