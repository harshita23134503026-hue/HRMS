import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

function PendingList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const currentUser = useMemo(() => {
    const token = localStorage.getItem('token');
    if (!token) return { id: null, role: '' };
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { id: payload.id || null, role: payload.role || '' };
    } catch {
      return { id: null, role: '' };
    }
  }, []);

  const currentRole = String(currentUser.role || '').toLowerCase();

  const isActionableRequest = useCallback((request) => {
    const status = String(request.status || '').toLowerCase();
    if (!['pending_manager', 'pending_hr'].includes(status)) return false;
    if (String(request.userId) === String(currentUser.id)) return false;

    const targetUserId = request.targetUserId ? String(request.targetUserId) : null;
    const targetRole = String(request.targetRole || '').toLowerCase();

    return Boolean(
      targetUserId === String(currentUser.id) ||
      (targetRole && targetRole === currentRole) ||
      ['admin', 'sadmin'].includes(currentRole)
    );
  }, [currentRole, currentUser.id]);

  const actionableRequests = useMemo(() => requests.filter(isActionableRequest), [requests, isActionableRequest]);

  const canManageRequests = actionableRequests.length > 0;

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/notifications?type=leave_request`, buildAuthHeader());
      const list = Array.isArray(res.data?.notifications) ? res.data.notifications : [];
      setRequests(list);
    } catch (error) {
      console.error('Failed to load leave pending requests:', error);
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

  const handleDecision = async (notificationId, action, reason) => {
    try {
      setActionLoadingId(notificationId);
      const payload = action === 'reject' ? { action, reason } : { action };
      await axios.patch(
        `${BASE_URL}/notifications/${notificationId}/decision`,
        payload,
        buildAuthHeader()
      );
      await fetchRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Failed to update leave request:', error);
      alert(error.response?.data?.msg || 'Failed to update request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const statusLabel = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'pending_manager') return 'Pending manager review';
    if (normalized === 'pending_hr') return 'Pending HR review';
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'rejected') return 'Rejected';
    return 'Pending';
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
                  {canManageRequests && <th className="text-left px-5 py-4">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td className="px-5 py-6 text-sm text-gray-500" colSpan={canManageRequests ? 5 : 4}>Loading...</td></tr>
                ) : actionableRequests.length ? (
                  actionableRequests.map((r) => (
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
          ) : actionableRequests.length ? (
            actionableRequests.map((r) => (
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
        canDecide={Boolean(selectedRequest && isActionableRequest(selectedRequest))}
        actionLoading={Boolean(actionLoadingId)}
        onApprove={() => selectedRequest && handleDecision(selectedRequest.id, 'approve')}
        onReject={(reason) => selectedRequest && handleDecision(selectedRequest.id, 'reject', reason)}
        title="Leave approval"
      />
    </div>
  );
}

export default PendingList;