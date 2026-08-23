import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { getUserFromToken, db } from '../../firebase';
import { X, CalendarDays, Clock, MessageSquare, Paperclip, CheckCircle2, XCircle } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────
const encodeEmail = (email = '') =>
  String(email).trim().toLowerCase().replace(/\./g, '_');

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDate = (iso = '') => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return String(iso);
  return `${parseInt(d, 10)} ${MONTHS_SHORT[parseInt(m, 10) - 1]} ${y}`;
};

const resolveMs = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value === 'object' && value.seconds) return Number(value.seconds) * 1000;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    return isNaN(ms) ? 0 : ms;
  }
  return 0;
};

const timeAgo = (value) => {
  const ms = resolveMs(value);
  if (!ms) return '';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

const truncateWords = (text = '', maxWords = 8) => {
  const words = String(text).trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '…';
};

const countDays = (from = '', to = '') => {
  if (!from || !to) return 0;
  const a = new Date(from);
  const b = new Date(to);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round((b - a) / 86400000) + 1;
};

const statusLabel = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'Approved';
  if (s === 'rejected') return 'Rejected';
  return status;
};

// ── Detail Modal (read-only) ─────────────────────────────────────────────
const DetailModal = ({ request, onClose }) => {
  if (!request) return null;

  const fromDate = request.fromDate || request.from_date || request.startDate || '';
  const toDate = request.toDate || request.to_date || request.endDate || '';
  const leaveType = request.leaveType || request.leaveTypeKey || 'Leave';
  const status = String(request.status || '').toLowerCase();
  const days = countDays(fromDate, toDate);
  const isApproved = status === 'approved';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className={`relative px-6 py-5 ${isApproved ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition"
          >
            <X size={14} />
          </button>
          <div className="flex items-center gap-2">
            {isApproved ? <CheckCircle2 size={18} className="text-white" /> : <XCircle size={18} className="text-white" />}
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Leave History</p>
          </div>
          <h3 className="mt-1 text-lg font-bold text-white">{leaveType}</h3>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Status row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {request.name || request.email || 'Leave Request'}
              </p>
              <p className="text-[11px] text-gray-400">{request.email || ''}</p>
            </div>
            <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
              isApproved
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-red-50 text-red-600 border-red-200'
            }`}>
              {isApproved ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {statusLabel(status)}
            </span>
          </div>

          {/* Duration card */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={14} className="text-sky-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Duration</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="text-center">
                <p className="text-[10px] font-medium uppercase text-gray-400">From</p>
                <p className="mt-0.5 text-sm font-bold text-gray-800">{formatDate(fromDate)}</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-gray-300">→</span>
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-700">
                  {days} day{days !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-medium uppercase text-gray-400">To</p>
                <p className="mt-0.5 text-sm font-bold text-gray-800">{formatDate(toDate)}</p>
              </div>
            </div>
          </div>

          {/* Reason */}
          {(request.description || request.reason) && (
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                <MessageSquare size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Reason</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                  {request.description || request.reason}
                </p>
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {request.rejectReason && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Rejection Reason</p>
              <p className="text-sm text-red-700">{request.rejectReason}</p>
            </div>
          )}

          {/* Attachment */}
          {request.attachmentName && (
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                <Paperclip size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Attachment</p>
                <p className="mt-1 text-sm text-sky-600">{request.attachmentName}</p>
              </div>
            </div>
          )}

          {/* Applied On */}
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
              <Clock size={13} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Applied On</p>
              <p className="mt-1 text-sm text-gray-700">
                {request.appliedOn
                  ? new Date(request.appliedOn).toLocaleString()
                  : timeAgo(request.createdAt) || '—'}
              </p>
            </div>
          </div>

          {/* Decided On */}
          {request.decidedAt && (
            <div className="flex items-start gap-3">
              <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${isApproved ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                {isApproved ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{isApproved ? 'Approved On' : 'Rejected On'}</p>
                <p className="mt-1 text-sm text-gray-700">{new Date(request.decidedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-gray-100 px-5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ── HistoryList Component ────────────────────────────────────────────────
function HistoryList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [error, setError] = useState('');

  const currentUser = getUserFromToken();
  const encodedEmail = encodeEmail(currentUser?.email || '');

  // ── Fetch user's decided leave requests (approved or rejected) ──
  useEffect(() => {
    if (!encodedEmail) {
      setLoading(false);
      setError('Please sign in to view your leave history.');
      return undefined;
    }

    setLoading(true);
    setError('');

    const unsub = onSnapshot(
      collection(db, 'leave', encodedEmail, 'leave_apply'),
      (snapshot) => {
        const allDocs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          _ref: docSnap.ref,
          ...docSnap.data(),
        }));

        // Only approved or rejected
        const list = allDocs.filter((r) => {
          const status = String(r.status || '').trim().toLowerCase();
          return status === 'approved' || status === 'rejected';
        });

        // Sort newest first
        list.sort((a, b) => {
          const aTime = resolveMs(a.decidedAt) || resolveMs(a.createdAt) || resolveMs(a.appliedOn);
          const bTime = resolveMs(b.decidedAt) || resolveMs(b.createdAt) || resolveMs(b.appliedOn);
          return bTime - aTime;
        });

        setRequests(list);
        setLoading(false);
      },
      (err) => {
        console.error('Unable to load leave history:', err);
        setError('Unable to load your history. Please try again.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [encodedEmail]);

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="h-1 bg-sky-500 w-full" />

        {error && (
          <div className="mx-5 mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-[700px] w-full">
            <thead>
              <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/60">
                <th className="text-left px-5 py-3">Description</th>
                <th className="text-left px-5 py-3">Leave Type</th>
                <th className="text-left px-5 py-3">From</th>
                <th className="text-left px-5 py-3">To</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td className="px-5 py-8 text-center" colSpan={6}>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-500" />
                      Loading history…
                    </div>
                  </td>
                </tr>
              ) : requests.length ? (
                requests.map((r) => {
                  const desc = r.description || r.reason || '';
                  const fromDate = r.fromDate || r.from_date || r.startDate || '';
                  const toDate = r.toDate || r.to_date || r.endDate || '';
                  const status = String(r.status || '').toLowerCase();
                  const isApproved = status === 'approved';

                  return (
                    <tr
                      key={r.id}
                      className="bg-white cursor-pointer hover:bg-sky-50/40 transition-colors"
                      onClick={() => setSelectedRequest(r)}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-gray-700 max-w-[250px]">
                          {desc ? truncateWords(desc, 8) : <span className="text-gray-400 italic">No description</span>}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                          {r.leaveType || r.leaveTypeKey || 'Leave'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{formatDate(fromDate)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{formatDate(toDate)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                        }`}>
                          {isApproved ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {statusLabel(status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">{timeAgo(r.appliedOn || r.createdAt)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-5 py-10 text-center" colSpan={6}>
                    <div className="flex flex-col items-center gap-1.5">
                      {/* <span className="text-2xl">📋</span> */}
                      <p className="text-sm font-medium text-gray-500">No leave history yet</p>
                      <p className="text-[11px] text-gray-400">Your approved and rejected requests will appear here</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden divide-y divide-gray-100">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-gray-400">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-sky-200 border-t-sky-500" />
              Loading…
            </div>
          ) : requests.length ? (
            requests.map((r) => {
              const desc = r.description || r.reason || '';
              const fromDate = r.fromDate || r.from_date || r.startDate || '';
              const toDate = r.toDate || r.to_date || r.endDate || '';
              const status = String(r.status || '').toLowerCase();
              const isApproved = status === 'approved';

              return (
                <div
                  key={r.id}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedRequest(r)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex rounded-lg bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                      {r.leaveType || r.leaveTypeKey || 'Leave'}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${
                      isApproved
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      {isApproved ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                      {statusLabel(status)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {desc ? truncateWords(desc, 10) : <span className="text-gray-400 italic">No description</span>}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {formatDate(fromDate)} → {formatDate(toDate)} · {timeAgo(r.appliedOn || r.createdAt)}
                  </p>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center gap-1.5 p-8">
              <span className="text-2xl">📋</span>
              <p className="text-sm font-medium text-gray-500">No leave history yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <DetailModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
}

export default HistoryList;
