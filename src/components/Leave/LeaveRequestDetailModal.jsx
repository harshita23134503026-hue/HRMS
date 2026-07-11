import React, { useEffect, useState } from 'react';

const statusLabels = {
  pending_manager: 'Pending manager review',
  pending_hr: 'Pending HR review',
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
};

const statusTone = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'approved') return 'bg-emerald-100 text-emerald-800';
  if (normalized === 'rejected') return 'bg-rose-100 text-rose-800';
  if (normalized === 'pending_hr') return 'bg-blue-100 text-blue-800';
  if (normalized === 'pending_manager') return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-700';
};

const formatDate = (value) => {
  if (!value) return 'Not provided';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

export default function LeaveRequestDetailModal({
  request,
  isOpen,
  onClose,
  onApprove,
  onReject,
  actionLoading,
  canDecide,
  title = 'Leave Request',
}) {
  const [decisionMode, setDecisionMode] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setDecisionMode(null);
      setRejectionReason('');
    }
  }, [isOpen]);

  if (!isOpen || !request) {
    return null;
  }

  const details = request.payload || {};
  const windowLabel = details.fromDate && details.toDate
    ? `${details.fromDate} to ${details.toDate}`
    : details.fromDate || details.toDate || 'Not provided';

  const submitRejection = async () => {
    if (!rejectionReason.trim()) {
      return;
    }
    await onReject(rejectionReason.trim());
    setDecisionMode(null);
    setRejectionReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500">{title}</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">{details.leaveType || request.message || 'Leave request'}</h3>
            <p className="mt-1 text-sm text-slate-500">Requested by {request.userName || 'Employee'}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="grid gap-6 px-6 py-5 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Leave window</div>
              <div className="mt-1 text-sm font-medium text-slate-800">{windowLabel}</div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</div>
              <div className="mt-1 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {details.description || 'No description provided.'}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attachment</div>
                {details.attachmentUrl ? (
                  <a href={details.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-sky-600 hover:text-sky-700">
                    Open attachment
                  </a>
                ) : (
                  <div className="mt-2 text-sm text-slate-500">No attachment uploaded</div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Request meta</div>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <div>Requested: {formatDate(request.createdAt)}</div>
                  <div>Workflow: {request.workflowStage || 'manager_review'}</div>
                  <div>Current status: {statusLabels[request.status] || request.status || 'Unknown'}</div>
                </div>
              </div>
            </div>

            {request.decisionReason && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                <div className="text-xs font-semibold uppercase tracking-wide text-rose-500">Rejection reason</div>
                <div className="mt-1 leading-6">{request.decisionReason}</div>
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(request.status)}`}>
              {statusLabels[request.status] || request.status || 'Pending'}
            </div>

            <div className="space-y-3 text-sm text-slate-600">
              <div><span className="font-semibold text-slate-800">Requested by:</span> {request.userName || 'Employee'}</div>
              <div><span className="font-semibold text-slate-800">Email:</span> {request.userEmail || 'Not provided'}</div>
              <div><span className="font-semibold text-slate-800">Leave type:</span> {details.leaveType || 'Leave Request'}</div>
              <div><span className="font-semibold text-slate-800">From:</span> {details.fromDate || 'Not provided'}</div>
              <div><span className="font-semibold text-slate-800">To:</span> {details.toDate || 'Not provided'}</div>
            </div>

            {canDecide && request.status && ['pending_manager', 'pending_hr'].includes(String(request.status).toLowerCase()) && (
              <div className="pt-2">
                {decisionMode !== 'reject' ? (
                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={onApprove}
                      className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => setDecisionMode('reject')}
                      className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      rows={4}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Reason for rejection"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-50"
                    />
                    <div className="flex gap-2">
                      <button
                        disabled={actionLoading || !rejectionReason.trim()}
                        onClick={submitRejection}
                        className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                      >
                        Submit rejection
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() => setDecisionMode(null)}
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!canDecide && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                You can view the full request details here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}