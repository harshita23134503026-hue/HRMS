import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../utility/Config';
import useNotificationStream from '../utility/useNotificationStream';

const buildAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const toAvatar = (notification) => {
  const seed = notification.userId || notification.id || 1;
  return `https://i.pravatar.cc/80?img=${(Number(seed) % 70) + 1}`;
};

function ReguPendingList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const currentRole = useMemo(() => {
    const token = localStorage.getItem('token');
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || '';
    } catch {
      return '';
    }
  }, []);

  const canManageRequests = ['admin', 'sadmin', 'hr', 'hr_manager'].includes(currentRole);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/notifications?type=regularization_request`, buildAuthHeader());
      const list = Array.isArray(res.data?.notifications) ? res.data.notifications : [];
      setRequests(list.filter((item) => item.status === 'pending'));
    } catch (error) {
      console.error('Failed to load regularization pending requests:', error);
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
    if (notification.type !== 'regularization_request') return;
    if (eventType === 'notification.created' || eventType === 'notification.updated') {
      fetchRequests();
    }
  });

  const handleDecision = async (notificationId, action) => {
    try {
      setActionLoadingId(notificationId);
      await axios.patch(
        `${BASE_URL}/notifications/${notificationId}/decision`,
        { action },
        buildAuthHeader()
      );
      await fetchRequests();
    } catch (error) {
      console.error('Failed to update regularization request:', error);
      alert(error.response?.data?.msg || 'Failed to update request');
    } finally {
      setActionLoadingId(null);
    }
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
                  {canManageRequests && <th className="text-left px-5 py-4">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td className="px-5 py-6 text-sm text-gray-500" colSpan={canManageRequests ? 6 : 5}>Loading...</td></tr>
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
                      <td className="px-5 py-4 text-sm text-gray-700"><span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">Pending</span></td>
                      <td className="px-5 py-4 text-sm text-gray-700">{r.type}</td>
                      {canManageRequests && (
                        <td className="px-5 py-4 text-sm text-gray-700">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDecision(r.id, 'approve')}
                              disabled={actionLoadingId === r.id}
                              className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleDecision(r.id, 'reject')}
                              disabled={actionLoadingId === r.id}
                              className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr><td className="px-5 py-6 text-sm text-gray-500" colSpan={canManageRequests ? 6 : 5}>No regularization requests yet</td></tr>
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
                    <div className="text-gray-700 text-sm">Pending</div>
                  </div>
                </div>
                {canManageRequests && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleDecision(r.id, 'approve')}
                      disabled={actionLoadingId === r.id}
                      className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecision(r.id, 'reject')}
                      disabled={actionLoadingId === r.id}
                      className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                )}
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

export default ReguPendingList;