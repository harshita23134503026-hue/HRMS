import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  collectionGroup,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getUserFromToken, db } from '../firebase';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Filter,
  MessageSquare,
  Paperclip,
  Search,
  Settings2,
  Users,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  UserCircle,
  ClipboardList,
  RefreshCw,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────
const encodeEmail = (email = '') => String(email).trim().toLowerCase().replace(/\./g, '_');
const decodeEmail = (enc = '') => String(enc).replace(/_/g, '.');
const getMemberName = (m = {}) => m.name || m.fullName || m.displayName || m.email || decodeEmail(m.id);

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];

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
  if (typeof value === 'string') { const ms = new Date(value).getTime(); return isNaN(ms) ? 0 : ms; }
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

const truncateWords = (text = '', max = 10) => {
  const words = String(text).trim().split(/\s+/);
  return words.length <= max ? text : words.slice(0, max).join(' ') + '…';
};

const countDays = (from = '', to = '') => {
  if (!from || !to) return 0;
  const a = new Date(from), b = new Date(to);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round((b - a) / 86400000) + 1;
};

const getQuarter = (monthIndex) => Math.floor(monthIndex / 3) + 1;

// Filter a request by time period
const matchesPeriod = (request, period) => {
  if (period.type === 'all') return true;
  const dateStr = request.fromDate || request.from_date || request.startDate || request.appliedOn || '';
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  const m = d.getMonth();

  if (period.type === 'month') return y === period.year && m === period.month;
  if (period.type === 'quarter') return y === period.year && getQuarter(m) === period.quarter;
  if (period.type === 'year') return y === period.year;
  return true;
};

// ── Leave Balance Defaults ──────────────────────────────────────────────
const BALANCE_KEYS = [
  { key: 'plannedLeave', label: 'Planned Leave' },
  { key: 'sickLeave', label: 'Sick Leave' },
  { key: 'casualLeave', label: 'Casual Leave' },
  { key: 'specialLeave', label: 'Special Leave' },
  { key: 'workFromHome', label: 'Work From Home' },
  { key: 'lossOfPay', label: 'Loss of Pay' },
];

// ── Period Options Builder ──────────────────────────────────────────────
const buildPeriodOptions = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const opts = [{ value: 'all', label: 'All Time' }];

  // Current year months
  for (let y = currentYear; y >= currentYear - 1; y--) {
    opts.push({ value: `year-${y}`, label: `${y}`, type: 'year', year: y });
    for (let q = 4; q >= 1; q--) {
      opts.push({ value: `q-${y}-${q}`, label: `Q${q} ${y}`, type: 'quarter', year: y, quarter: q });
    }
    for (let m = 11; m >= 0; m--) {
      opts.push({ value: `m-${y}-${m}`, label: `${MONTHS_LONG[m]} ${y}`, type: 'month', year: y, month: m });
    }
  }
  return opts;
};

// ══════════════════════════════════════════════════════════════════════════
// ADMIN PAGE
// ══════════════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const currentUser = getUserFromToken();
  const encodedEmail = encodeEmail(currentUser?.email || '');

  // ── Tabs ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('dashboard');

  // ── Global Filters ────────────────────────────────────────────────────
  const [members, setMembers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [periodValue, setPeriodValue] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);

  const periodOptions = useMemo(() => buildPeriodOptions(), []);

  const selectedPeriod = useMemo(() => {
    if (periodValue === 'all') return { type: 'all' };
    const opt = periodOptions.find((o) => o.value === periodValue);
    return opt || { type: 'all' };
  }, [periodValue, periodOptions]);

  // ── Data ──────────────────────────────────────────────────────────────
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [regRequests, setRegRequests] = useState([]);
  const [balances, setBalances] = useState({}); // { encodedEmail: { ...balances } }
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [balanceEditorUser, setBalanceEditorUser] = useState(null);
  const [balanceDraft, setBalanceDraft] = useState({});
  const [savingBalance, setSavingBalance] = useState(false);

  // ── Fetch all users ───────────────────────────────────────────────────
  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => getMemberName(a).localeCompare(getMemberName(b)));
      setMembers(list);
    });
  }, []);

  // ── Fetch all leave_apply (collection group) ──────────────────────────
  useEffect(() => {
    return onSnapshot(collectionGroup(db, 'leave_apply'), (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        const enc = d.ref.parent.parent?.path?.split('/').pop() || '';
        return { id: d.id, _ref: d.ref, _encodedEmail: enc, _category: 'Leave', ...data };
      });
      list.sort((a, b) => (resolveMs(b.createdAt) || resolveMs(b.appliedOn)) - (resolveMs(a.createdAt) || resolveMs(a.appliedOn)));
      setLeaveRequests(list);
    }, (err) => console.error('leave_apply error:', err));
  }, []);

  // ── Fetch all reg_apply (collection group) ────────────────────────────
  useEffect(() => {
    return onSnapshot(collectionGroup(db, 'reg_apply'), (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        const enc = d.ref.parent.parent?.path?.split('/').pop() || '';
        return { id: d.id, _ref: d.ref, _encodedEmail: enc, _category: 'Regularization', ...data };
      });
      list.sort((a, b) => (resolveMs(b.createdAt) || resolveMs(b.appliedOn)) - (resolveMs(a.createdAt) || resolveMs(a.appliedOn)));
      setRegRequests(list);
    }, (err) => console.error('reg_apply error:', err));
  }, []);

  // ── Fetch all balances (collection group on balance subcollection) ────
  useEffect(() => {
    return onSnapshot(collectionGroup(db, 'balance'), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const enc = d.ref.parent.parent?.path?.split('/').pop() || '';
        const data = d.data();
        // Keep the latest per user (by doc ID, chronological)
        if (!map[enc] || d.id > (map[enc]._docId || '')) {
          map[enc] = { ...data, _docId: d.id };
        }
      });
      setBalances(map);
    }, (err) => console.error('balance error:', err));
  }, []);

  // ── Derived: filtered requests ────────────────────────────────────────
  const filterRequests = (list) => {
    return list.filter((r) => {
      // User filter
      if (selectedUserId !== 'all' && r._encodedEmail !== selectedUserId) return false;
      // Period filter
      if (!matchesPeriod(r, selectedPeriod)) return false;
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = [r.name, r.email, r.leaveType, r.leaveTypeKey, r.description, r.reason, r.fromDate, r.toDate]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  };

  const filteredLeave = useMemo(() => filterRequests(leaveRequests), [leaveRequests, selectedUserId, selectedPeriod, searchQuery]);
  const filteredReg = useMemo(() => filterRequests(regRequests), [regRequests, selectedUserId, selectedPeriod, searchQuery]);

  const pendingLeave = filteredLeave.filter((r) => String(r.status || '').toLowerCase() === 'pending');
  const approvedLeave = filteredLeave.filter((r) => String(r.status || '').toLowerCase() === 'approved');
  const rejectedLeave = filteredLeave.filter((r) => String(r.status || '').toLowerCase() === 'rejected');
  const pendingReg = filteredReg.filter((r) => String(r.status || '').toLowerCase() === 'pending');
  const approvedReg = filteredReg.filter((r) => String(r.status || '').toLowerCase() === 'approved');
  const rejectedReg = filteredReg.filter((r) => String(r.status || '').toLowerCase() === 'rejected');

  // ── Actions ───────────────────────────────────────────────────────────
  const handleDecision = async (request, action) => {
    if (!request?._ref) return;
    try {
      await updateDoc(request._ref, {
        status: action,
        decidedBy: currentUserEmail,
        decidedAt: new Date().toISOString(),
      });
      setSelectedRequest(null);
    } catch (err) {
      console.error(`Unable to ${action}:`, err);
    }
  };

  const currentUserEmail = currentUser?.email?.toLowerCase() || '';

  const openBalanceEditor = (member) => {
    const enc = member.id;
    const existing = balances[enc] || {};
    setBalanceDraft({
      plannedLeave: existing.plannedLeave ?? 3,
      sickLeave: existing.sickLeave ?? 3,
      casualLeave: existing.casualLeave ?? 3,
      specialLeave: existing.specialLeave ?? 0,
      workFromHome: existing.workFromHome ?? 3,
      lossOfPay: existing.lossOfPay ?? 0,
    });
    setBalanceEditorUser(member);
  };

  const saveBalance = async () => {
    if (!balanceEditorUser) return;
    setSavingBalance(true);
    try {
      await addDoc(collection(db, 'leave', balanceEditorUser.id, 'balance'), {
        ...balanceDraft,
        createdAt: serverTimestamp(),
        updatedBy: currentUserEmail,
      });
      setBalanceEditorUser(null);
    } catch (err) {
      console.error('Unable to save balance:', err);
    } finally {
      setSavingBalance(false);
    }
  };

  // ── Tab config ────────────────────────────────────────────────────────
  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={15} /> },
    { id: 'leave', label: 'Leave Requests', icon: <ClipboardList size={15} /> },
    { id: 'regularization', label: 'Regularization', icon: <RefreshCw size={15} /> },
    { id: 'balances', label: 'Leave Balances', icon: <Settings2 size={15} /> },
  ];

  // ── Status badge ──────────────────────────────────────────────────────
  const StatusBadge = ({ status }) => {
    const s = String(status || '').toLowerCase();
    if (s === 'approved') return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-600"><CheckCircle2 size={10} />Approved</span>;
    if (s === 'rejected') return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-[10px] font-bold uppercase text-red-600"><XCircle size={10} />Rejected</span>;
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-600"><Clock size={10} />Pending</span>;
  };

  // ── Request row ───────────────────────────────────────────────────────
  const RequestRow = ({ r }) => {
    const desc = r.description || r.reason || '';
    const from = r.fromDate || r.from_date || r.startDate || '';
    const to = r.toDate || r.to_date || r.endDate || '';
    const member = members.find((m) => m.id === r._encodedEmail);
    const name = r.name || (member ? getMemberName(member) : decodeEmail(r._encodedEmail));

    return (
      <tr className="bg-white cursor-pointer hover:bg-sky-50/40 transition-colors" onClick={() => setSelectedRequest(r)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-600">
              {name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-slate-800">{name}</p>
              <p className="truncate text-[10px] text-slate-400">{r.email || decodeEmail(r._encodedEmail)}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="inline-flex rounded-lg bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700">
            {r.leaveType || r.leaveTypeKey || r._category}
          </span>
        </td>
        <td className="px-4 py-3 text-[12px] text-slate-600">{formatDate(from)}</td>
        <td className="px-4 py-3 text-[12px] text-slate-600">{formatDate(to)}</td>
        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
        <td className="px-4 py-3 text-[11px] text-slate-400">{timeAgo(r.appliedOn || r.createdAt)}</td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md">
              <Settings2 size={18} />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-slate-800">Admin Panel</h1>
              <p className="text-[10px] text-slate-400">Leave & Regularization Management</p>
            </div>
          </div>

          {/* Global Filters */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-[12px] outline-none focus:border-sky-400 focus:bg-white transition"
              />
            </div>

            {/* User Filter */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setMemberDropdownOpen((v) => !v); setPeriodDropdownOpen(false); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 hover:border-sky-300 transition"
              >
                <UserCircle size={14} className="text-slate-400" />
                <span className="max-w-[100px] truncate">{selectedUserId === 'all' ? 'All Users' : getMemberName(members.find((m) => m.id === selectedUserId) || {})}</span>
                <ChevronDown size={12} className={`transition-transform ${memberDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {memberDropdownOpen && (
                <div className="absolute right-0 z-50 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                  <div className="max-h-64 overflow-y-auto p-1.5">
                    <button onClick={() => { setSelectedUserId('all'); setMemberDropdownOpen(false); }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] transition ${selectedUserId === 'all' ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                      <Users size={14} /> All Users
                    </button>
                    {members.map((m) => (
                      <button key={m.id} onClick={() => { setSelectedUserId(m.id); setMemberDropdownOpen(false); }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] transition ${selectedUserId === m.id ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-[9px] font-bold text-sky-600">{getMemberName(m).charAt(0).toUpperCase()}</span>
                        <span className="truncate">{getMemberName(m)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Period Filter */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setPeriodDropdownOpen((v) => !v); setMemberDropdownOpen(false); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 hover:border-sky-300 transition"
              >
                <CalendarDays size={14} className="text-slate-400" />
                <span className="max-w-[120px] truncate">{periodOptions.find((o) => o.value === periodValue)?.label || 'All Time'}</span>
                <ChevronDown size={12} className={`transition-transform ${periodDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {periodDropdownOpen && (
                <div className="absolute right-0 z-50 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                  <div className="max-h-64 overflow-y-auto p-1.5">
                    {periodOptions.map((opt) => (
                      <button key={opt.value} onClick={() => { setPeriodValue(opt.value); setPeriodDropdownOpen(false); }}
                        className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-[11px] transition ${periodValue === opt.value ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 -mb-px">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6" onClick={() => { setMemberDropdownOpen(false); setPeriodDropdownOpen(false); }}>

        {/* ─── DASHBOARD ──────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Leave', value: filteredLeave.length, color: 'sky' },
                { label: 'Pending Leave', value: pendingLeave.length, color: 'amber' },
                { label: 'Approved Leave', value: approvedLeave.length, color: 'emerald' },
                { label: 'Rejected Leave', value: rejectedLeave.length, color: 'red' },
                { label: 'Total Reg.', value: filteredReg.length, color: 'violet' },
                { label: 'Pending Reg.', value: pendingReg.length, color: 'amber' },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-2xl border bg-white p-4 shadow-sm`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{stat.label}</p>
                  <p className={`mt-1 text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Recent Pending */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                  <h3 className="text-[13px] font-bold text-slate-800">Pending Leave Requests</h3>
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-600">{pendingLeave.length}</span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {pendingLeave.length === 0 ? (
                    <p className="px-5 py-8 text-center text-[12px] text-slate-400">No pending leave requests</p>
                  ) : pendingLeave.slice(0, 10).map((r) => {
                    const member = members.find((m) => m.id === r._encodedEmail);
                    const name = r.name || (member ? getMemberName(member) : decodeEmail(r._encodedEmail));
                    return (
                      <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer transition" onClick={() => setSelectedRequest(r)}>
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-600">{name.charAt(0).toUpperCase()}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-slate-700">{name}</p>
                          <p className="truncate text-[10px] text-slate-400">{r.leaveType || r.leaveTypeKey || 'Leave'} · {formatDate(r.fromDate || r.from_date || '')}</p>
                        </div>
                        <span className="text-[10px] text-slate-400">{timeAgo(r.appliedOn || r.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                  <h3 className="text-[13px] font-bold text-slate-800">Pending Regularizations</h3>
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-600">{pendingReg.length}</span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {pendingReg.length === 0 ? (
                    <p className="px-5 py-8 text-center text-[12px] text-slate-400">No pending regularizations</p>
                  ) : pendingReg.slice(0, 10).map((r) => {
                    const member = members.find((m) => m.id === r._encodedEmail);
                    const name = r.name || (member ? getMemberName(member) : decodeEmail(r._encodedEmail));
                    return (
                      <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer transition" onClick={() => setSelectedRequest(r)}>
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-600">{name.charAt(0).toUpperCase()}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-slate-700">{name}</p>
                          <p className="truncate text-[10px] text-slate-400">{formatDate(r.fromDate || r.from_date || '')} → {formatDate(r.toDate || r.to_date || '')}</p>
                        </div>
                        <span className="text-[10px] text-slate-400">{timeAgo(r.appliedOn || r.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── LEAVE REQUESTS ─────────────────────────────────────── */}
        {activeTab === 'leave' && (
          <RequestTable title="Leave Requests" requests={filteredLeave} RequestRow={RequestRow} />
        )}

        {/* ─── REGULARIZATION ─────────────────────────────────────── */}
        {activeTab === 'regularization' && (
          <RequestTable title="Regularization Requests" requests={filteredReg} RequestRow={RequestRow} />
        )}

        {/* ─── LEAVE BALANCES ─────────────────────────────────────── */}
        {activeTab === 'balances' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-slate-800">Leave Balances</h3>
              <span className="text-[10px] text-slate-400">{members.length} employees</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                    <th className="text-left px-4 py-3">Employee</th>
                    {BALANCE_KEYS.map((b) => <th key={b.key} className="text-center px-3 py-3">{b.label}</th>)}
                    <th className="text-center px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => {
                    const bal = balances[m.id] || {};
                    return (
                      <tr key={m.id} className="bg-white hover:bg-slate-50/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-600">{getMemberName(m).charAt(0).toUpperCase()}</span>
                            <div>
                              <p className="text-[12px] font-semibold text-slate-800">{getMemberName(m)}</p>
                              <p className="text-[10px] text-slate-400">{m.email || decodeEmail(m.id)}</p>
                            </div>
                          </div>
                        </td>
                        {BALANCE_KEYS.map((b) => (
                          <td key={b.key} className="text-center px-3 py-3">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-[13px] font-bold text-slate-700">
                              {bal[b.key] ?? '—'}
                            </span>
                          </td>
                        ))}
                        <td className="text-center px-4 py-3">
                          <button onClick={() => openBalanceEditor(m)}
                            className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-3 py-1.5 text-[10px] font-semibold text-sky-600 hover:bg-sky-100 transition">
                            <Settings2 size={12} /> Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Request Detail Modal ──────────────────────────────────── */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          members={members}
          onClose={() => setSelectedRequest(null)}
          onApprove={() => handleDecision(selectedRequest, 'approved')}
          onReject={() => handleDecision(selectedRequest, 'rejected')}
        />
      )}

      {/* ── Balance Editor Modal ──────────────────────────────────── */}
      {balanceEditorUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && setBalanceEditorUser(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-200">Edit Balance</p>
                <h3 className="text-[15px] font-bold text-white">{getMemberName(balanceEditorUser)}</h3>
              </div>
              <button onClick={() => setBalanceEditorUser(null)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"><X size={14} /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {BALANCE_KEYS.map((b) => (
                <div key={b.key} className="flex items-center justify-between">
                  <label className="text-[12px] font-medium text-slate-600">{b.label}</label>
                  <input
                    type="number"
                    min="0"
                    value={balanceDraft[b.key] ?? 0}
                    onChange={(e) => setBalanceDraft((d) => ({ ...d, [b.key]: Number(e.target.value) || 0 }))}
                    className="w-20 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] text-center font-semibold outline-none focus:border-sky-400"
                  />
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 px-6 py-3 flex justify-end gap-2">
              <button onClick={() => setBalanceEditorUser(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-500">Cancel</button>
              <button onClick={saveBalance} disabled={savingBalance} className="rounded-xl bg-sky-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-sky-600 disabled:opacity-50 transition">
                {savingBalance ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// REQUEST TABLE (reusable for Leave & Regularization tabs)
// ══════════════════════════════════════════════════════════════════════════
function RequestTable({ title, requests, RequestRow }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const filtered = statusFilter === 'all' ? requests : requests.filter((r) => String(r.status || '').toLowerCase() === statusFilter);

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => String(r.status || '').toLowerCase() === 'pending').length,
    approved: requests.filter((r) => String(r.status || '').toLowerCase() === 'approved').length,
    rejected: requests.filter((r) => String(r.status || '').toLowerCase() === 'rejected').length,
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-[13px] font-bold text-slate-800">{title}</h3>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-0.5">
          {['all', 'pending', 'approved', 'rejected'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition ${statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/60">
              <th className="text-left px-4 py-3">Employee</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">From</th>
              <th className="text-left px-4 py-3">To</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Applied</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td className="px-4 py-10 text-center text-[12px] text-slate-400" colSpan={6}>No requests found</td></tr>
            ) : filtered.map((r) => <RequestRow key={r.id} r={r} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// REQUEST DETAIL MODAL (with approve/reject for admin)
// ══════════════════════════════════════════════════════════════════════════
function RequestDetailModal({ request, members, onClose, onApprove, onReject }) {
  const r = request;
  const from = r.fromDate || r.from_date || r.startDate || '';
  const to = r.toDate || r.to_date || r.endDate || '';
  const leaveType = r.leaveType || r.leaveTypeKey || r._category || 'Request';
  const status = String(r.status || '').toLowerCase();
  const isPending = status === 'pending';
  const isApproved = status === 'approved';
  const days = countDays(from, to);
  const member = members.find((m) => m.id === r._encodedEmail);
  const name = r.name || (member ? getMemberName(member) : decodeEmail(r._encodedEmail));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`relative px-6 py-5 ${isApproved ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : status === 'rejected' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-sky-500 to-blue-600'}`}>
          <button onClick={onClose} className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"><X size={14} /></button>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">{r._category || 'Request'}</p>
          <h3 className="mt-1 text-lg font-bold text-white">{leaveType}</h3>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Employee + Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-base font-bold text-sky-600">{name.charAt(0).toUpperCase()}</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{name}</p>
                <p className="text-[11px] text-slate-400">{r.email || decodeEmail(r._encodedEmail)}</p>
              </div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
              isApproved ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}>{status}</span>
          </div>

          {/* Duration */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={14} className="text-sky-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div className="text-center">
                <p className="text-[10px] font-medium uppercase text-slate-400">From</p>
                <p className="mt-0.5 text-sm font-bold text-slate-800">{formatDate(from)}</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-slate-300">→</span>
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-700">{days} day{days !== 1 ? 's' : ''}</span>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-medium uppercase text-slate-400">To</p>
                <p className="mt-0.5 text-sm font-bold text-slate-800">{formatDate(to)}</p>
              </div>
            </div>
          </div>

          {/* Reason */}
          {(r.description || r.reason) && (
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><MessageSquare size={13} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reason</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{r.description || r.reason}</p>
              </div>
            </div>
          )}

          {/* Applied On */}
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Clock size={13} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Applied On</p>
              <p className="mt-1 text-sm text-slate-700">{r.appliedOn ? new Date(r.appliedOn).toLocaleString() : timeAgo(r.createdAt) || '—'}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3 flex justify-end gap-2">
          {isPending ? (
            <>
              <button onClick={onReject} className="rounded-xl border border-red-200 px-4 py-2 text-[12px] font-semibold text-red-500 hover:bg-red-50 transition">Reject</button>
              <button onClick={onApprove} className="rounded-xl bg-emerald-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-emerald-600 transition">Approve</button>
            </>
          ) : (
            <button onClick={onClose} className="rounded-xl bg-slate-100 px-5 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-200 transition">Close</button>
          )}
        </div>
      </div>
    </div>
  );
}
