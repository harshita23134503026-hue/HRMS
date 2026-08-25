import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  collectionGroup,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
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
  Save,
  Trash2,
  Plus,
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

// Map any leave type string to the corresponding balance key
const LEAVE_TYPE_TO_BALANCE_KEY = {
  'planned leave': 'plannedLeave',
  'planned_leave': 'plannedLeave',
  'plannedleave': 'plannedLeave',
  'sick leave': 'sickLeave',
  'sick_leave': 'sickLeave',
  'sickleave': 'sickLeave',
  'casual leave': 'casualLeave',
  'casual_leave': 'casualLeave',
  'casualleave': 'casualLeave',
  'special leave': 'specialLeave',
  'special_leave': 'specialLeave',
  'specialleave': 'specialLeave',
  'work from home': 'workFromHome',
  'work_from_home': 'workFromHome',
  'workfromhome': 'workFromHome',
  'wfh': 'workFromHome',
  'loss of pay': 'lossOfPay',
  'loss_of_pay': 'lossOfPay',
  'lossofpay': 'lossOfPay',
  'lop': 'lossOfPay',
  // Direct key mappings
  'plannedLeave': 'plannedLeave',
  'sickLeave': 'sickLeave',
  'casualLeave': 'casualLeave',
  'specialLeave': 'specialLeave',
  'workFromHome': 'workFromHome',
  'lossOfPay': 'lossOfPay',
};

const resolveBalanceKey = (leaveType = '') => {
  const normalized = String(leaveType).trim().toLowerCase().replace(/\s+/g, ' ');
  return LEAVE_TYPE_TO_BALANCE_KEY[normalized]
    || LEAVE_TYPE_TO_BALANCE_KEY[normalized.replace(/\s/g, '')]
    || LEAVE_TYPE_TO_BALANCE_KEY[normalized.replace(/\s/g, '_')]
    || '';
};

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
  const navigate = useNavigate();
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
  const [allCalendarData, setAllCalendarData] = useState({}); // { encodedEmail: { 'dd-mm-yyyy': { status, ... } } }
  const [syncingCalendar, setSyncingCalendar] = useState(false);

  // ── Settings state ────────────────────────────────────────────────────
  const [settingsTarget, setSettingsTarget] = useState('all'); // 'all' or encodedEmail
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');
  const [punchGraceStart, setPunchGraceStart] = useState('09:00');
  const [punchGraceEnd, setPunchGraceEnd] = useState('09:30');
  const [offDays, setOffDays] = useState([0, 6]); // 0=Sun, 6=Sat
  const [shutdowns, setShutdowns] = useState([]); // [{ name, from, to }]
  const [newShutdown, setNewShutdown] = useState({ name: '', from: '', to: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

  // ── Fetch all calendar data (collection group on calendar docs) ───────
  // Each user has calendar/{encodedEmail} with a dates map or subcollection.
  // We read the top-level documents from the `calendar` collection.
  useEffect(() => {
    return onSnapshot(collection(db, 'calendar'), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        const enc = d.id;
        const data = d.data() || {};
        const dateMap = {};

        // dates as map { "dd-mm-yyyy": { ... } }
        if (data.dates && typeof data.dates === 'object' && !Array.isArray(data.dates)) {
          Object.entries(data.dates).forEach(([dateKey, entry]) => {
            dateMap[dateKey] = entry;
          });
        }
        // dates as array
        if (Array.isArray(data.dates)) {
          data.dates.forEach((entry) => {
            const key = String(entry.date || '').trim();
            if (key) dateMap[key] = entry;
          });
        }

        map[enc] = dateMap;
      });
      setAllCalendarData(map);
    }, (err) => console.error('calendar error:', err));
  }, []);

  // ── Sync attendance → calendar for a specific user ────────────────────
  // Reads attendance/{id}.dates and writes computed data to calendar/{encodedEmail}
  const syncUserCalendar = async (member) => {
    if (!member) return;
    setSyncingCalendar(true);
    try {
      const rawIds = member.attendanceIds;
      let attendanceIds = [];
      if (Array.isArray(rawIds)) attendanceIds = rawIds;
      else if (rawIds && typeof rawIds === 'object') attendanceIds = Object.keys(rawIds);
      else if (rawIds) attendanceIds = [rawIds];
      attendanceIds = attendanceIds.map((id) => String(id).trim()).filter(Boolean);

      const allDates = {};

      for (const attId of attendanceIds) {
        const attSnap = await import('firebase/firestore').then((fw) =>
          fw.getDoc(doc(db, 'attendance', attId))
        );
        if (!attSnap.exists()) continue;
        const dates = attSnap.data().dates || {};
        Object.entries(dates).forEach(([dateKey, day]) => {
          if (day && (day.first_join_time || day.last_leave_time)) {
            allDates[dateKey] = { ...(allDates[dateKey] || {}), ...day };
          }
        });
      }

      // Compute calendar entries from attendance data
      const calendarDates = {};
      Object.entries(allDates).forEach(([dateKey, day]) => {
        const firstJoin = day.first_join_time || '';
        const lastLeave = day.last_leave_time || '';

        // Compute total shift hours (HH:MM:SS)
        let totalHhmmss = '00:00:00';
        if (firstJoin && lastLeave) {
          const fMatch = String(firstJoin).match(/T(\d{2}):(\d{2}):(\d{2})/);
          const lMatch = String(lastLeave).match(/T(\d{2}):(\d{2}):(\d{2})/);
          if (fMatch && lMatch) {
            const fSec = Number(fMatch[1]) * 3600 + Number(fMatch[2]) * 60 + Number(fMatch[3]);
            const lSec = Number(lMatch[1]) * 3600 + Number(lMatch[2]) * 60 + Number(lMatch[3]);
            const diff = Math.max(0, lSec - fSec);
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            totalHhmmss = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
          }
        }

        // Punch-in timing: difference from expected 09:00:00
        let punchInTiming = '';
        if (firstJoin) {
          const fMatch = String(firstJoin).match(/T(\d{2}):(\d{2}):(\d{2})/);
          if (fMatch) {
            const fSec = Number(fMatch[1]) * 3600 + Number(fMatch[2]) * 60 + Number(fMatch[3]);
            const expectedSec = 9 * 3600; // 09:00:00
            const diffSec = fSec - expectedSec;
            if (diffSec > 0) {
              const h = Math.floor(diffSec / 3600);
              const m = Math.floor((diffSec % 3600) / 60);
              const s = diffSec % 60;
              punchInTiming = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} late`;
            } else {
              punchInTiming = 'on_time';
            }
          }
        }

        // Determine status
        let status = 'present';
        const isLate = punchInTiming && punchInTiming !== 'on_time';
        if (isLate && totalHhmmss === '00:00:00') {
          status = 'absent';
        } else if (isLate) {
          status = 'present'; // present but with alert
        }

        // Convert YYYY-MM-DD key to dd-mm-yyyy for calendar storage
        let calDateKey = dateKey;
        const isoMatch = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoMatch) {
          calDateKey = `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
        }

        calendarDates[calDateKey] = {
          status,
          first_in_time: firstJoin,
          last_leave_time: lastLeave,
          total_hhmmss: totalHhmmss,
          total_time: totalHhmmss,
          punch_in_timing: punchInTiming,
          shift_hours: totalHhmmss,
          is_late: isLate,
          ...(isLate ? { alert: 'late_arrival' } : {}),
        };
      });

      // Write to calendar/{encodedEmail}
      await setDoc(
        doc(db, 'calendar', member.id),
        { dates: calendarDates, email: member.email || decodeEmail(member.id), syncedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      console.error('Unable to sync calendar for', member.id, err);
    } finally {
      setSyncingCalendar(false);
    }
  };

  // ── Fetch settings from calendar/_config or calendar/{encodedEmail} ──
  useEffect(() => {
    const docId = settingsTarget === 'all' ? '_config' : settingsTarget;
    return onSnapshot(
      doc(db, 'calendar', docId),
      (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        if (data.shift_start) setShiftStart(data.shift_start);
        if (data.shift_end) setShiftEnd(data.shift_end);
        if (data.punch_grace_start) setPunchGraceStart(data.punch_grace_start);
        if (data.punch_grace_end) setPunchGraceEnd(data.punch_grace_end);
        if (Array.isArray(data.off_days)) setOffDays(data.off_days);
        if (Array.isArray(data.shutdowns)) setShutdowns(data.shutdowns);
      },
      () => {}
    );
  }, [settingsTarget]);

  // ── Save settings ─────────────────────────────────────────────────────
  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsMessage('');
    try {
      const docId = settingsTarget === 'all' ? '_config' : settingsTarget;
      const payload = {
        shift_start: shiftStart,
        shift_end: shiftEnd,
        punch_grace_start: punchGraceStart,
        punch_grace_end: punchGraceEnd,
        off_days: offDays,
        shutdowns,
        updatedBy: currentUserEmail,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'calendar', docId), payload, { merge: true });

      // If saving for "all", also push to every user's calendar doc
      if (settingsTarget === 'all') {
        const promises = members.map((m) =>
          setDoc(doc(db, 'calendar', m.id), payload, { merge: true })
        );
        await Promise.all(promises);
      }

      setSettingsMessage(settingsTarget === 'all'
        ? `Settings saved for all ${members.length} employees.`
        : 'Settings saved.');
    } catch (err) {
      console.error('Unable to save settings:', err);
      setSettingsMessage('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // ── Apply shutdown/off-day dates to calendar for all or specific user ─
  const applyOffDaysAndShutdowns = async () => {
    setSavingSettings(true);
    setSettingsMessage('');
    try {
      const targetUsers = settingsTarget === 'all'
        ? members
        : members.filter((m) => m.id === settingsTarget);

      for (const member of targetUsers) {
        const dateEntries = {};

        // Apply weekly off days for the current year
        const year = new Date().getFullYear();
        for (let month = 0; month < 12; month++) {
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(year, month, day);
            const dow = d.getDay();
            if (offDays.includes(dow)) {
              const dd = String(day).padStart(2, '0');
              const mm = String(month + 1).padStart(2, '0');
              const key = `${dd}-${mm}-${year}`;
              dateEntries[key] = {
                status: dow === 0 ? 'rest_day' : 'off_day',
                day_type: dow === 0 ? 'Rest Day' : 'Off Day',
              };
            }
          }
        }

        // Apply plant shutdowns
        shutdowns.forEach((sd) => {
          if (!sd.from || !sd.to) return;
          const start = new Date(sd.from);
          const end = new Date(sd.to);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            const key = `${dd}-${mm}-${yyyy}`;
            dateEntries[key] = {
              status: 'holiday',
              day_type: 'Plant Shutdown',
              shutdown_name: sd.name || 'Plant Shutdown',
            };
          }
        });

        await setDoc(
          doc(db, 'calendar', member.id),
          { dates: dateEntries, email: member.email || decodeEmail(member.id) },
          { merge: true }
        );
      }

      setSettingsMessage(`Off days & shutdowns applied to ${targetUsers.length} employee(s).`);
    } catch (err) {
      console.error('Unable to apply off days/shutdowns:', err);
      setSettingsMessage('Failed to apply.');
    } finally {
      setSavingSettings(false);
    }
  };

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
      // Update the request status
      await updateDoc(request._ref, {
        status: action,
        decidedBy: currentUserEmail,
        decidedAt: new Date().toISOString(),
      });

      // If approving a LEAVE request, deduct from the user's balance
      if (action === 'approved' && request._category === 'Leave') {
        const leaveType = request.leaveType || request.leaveTypeKey || '';
        const balanceKey = resolveBalanceKey(leaveType);
        const userEnc = request._encodedEmail;

        if (balanceKey && userEnc) {
          // Calculate number of leave days
          const fromDate = request.fromDate || request.from_date || request.startDate || '';
          const toDate = request.toDate || request.to_date || request.endDate || '';
          const days = countDays(fromDate, toDate) || 1;

          // Read the latest balance document
          const balSnap = await getDocs(
            query(collection(db, 'leave', userEnc, 'balance'), orderBy('__name__', 'desc'), limit(1))
          );

          let currentBalances = {
            plannedLeave: 3,
            sickLeave: 3,
            casualLeave: 3,
            specialLeave: 0,
            workFromHome: 3,
            lossOfPay: 0,
          };

          if (!balSnap.empty) {
            const latest = balSnap.docs[0].data();
            currentBalances = {
              plannedLeave: latest.plannedLeave ?? 3,
              sickLeave: latest.sickLeave ?? 3,
              casualLeave: latest.casualLeave ?? 3,
              specialLeave: latest.specialLeave ?? 0,
              workFromHome: latest.workFromHome ?? 3,
              lossOfPay: latest.lossOfPay ?? 0,
            };
          }

          // Deduct
          const currentValue = currentBalances[balanceKey] ?? 0;
          const newValue = Math.max(0, currentValue - days);

          // Save a new balance document (preserves history)
          await addDoc(collection(db, 'leave', userEnc, 'balance'), {
            ...currentBalances,
            [balanceKey]: newValue,
            [`${balanceKey}Consumed`]: (currentBalances[`${balanceKey}Consumed`] ?? 0) + days,
            createdAt: serverTimestamp(),
            updatedBy: currentUserEmail,
            reason: `Approved ${leaveType} (${days} day${days !== 1 ? 's' : ''}) — deducted from balance`,
          });
        }
      }

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
    { id: 'attendance', label: 'Attendance', icon: <Users size={15} /> },
    { id: 'balances', label: 'Leave Balances', icon: <Settings2 size={15} /> },
    { id: 'settings', label: 'Shift & Config', icon: <Clock size={15} /> },
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

        {/* ─── ATTENDANCE OVERVIEW ────────────────────────────────── */}
        {activeTab === 'attendance' && (
          <AttendanceOverview
            members={members}
            allCalendarData={allCalendarData}
            selectedUserId={selectedUserId}
            searchQuery={searchQuery}
            syncingCalendar={syncingCalendar}
            onSyncUser={syncUserCalendar}
          />
        )}

        {/* ─── SHIFT & CONFIG ──────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Target selector */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-[13px] font-bold text-slate-800 mb-3">Apply Settings To</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSettingsTarget('all')}
                  className={`px-4 py-2 rounded-xl text-[12px] font-semibold transition ${settingsTarget === 'all' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  All Employees ({members.length})
                </button>
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSettingsTarget(m.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition ${settingsTarget === m.id ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[9px] font-bold">{getMemberName(m).charAt(0).toUpperCase()}</span>
                    {getMemberName(m)}
                  </button>
                ))}
              </div>
            </div>

            {/* Shift Timing */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-[13px] font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock size={16} className="text-sky-500" />
                Shift Timing
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Shift Start</label>
                  <input
                    type="time"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Shift End</label>
                  <input
                    type="time"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] outline-none focus:border-sky-400"
                  />
                </div>
              </div>
            </div>

            {/* Punching Time (Grace Period) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-[13px] font-bold text-slate-800 mb-4 flex items-center gap-2">
                <AlertCircle size={16} className="text-orange-500" />
                Punching Time (Grace Period)
              </h3>
              <p className="text-[11px] text-slate-400 mb-3">If an employee punches in after the grace end time, it will be marked as a late arrival (Alert/Deduction).</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Grace Start</label>
                  <input
                    type="time"
                    value={punchGraceStart}
                    onChange={(e) => setPunchGraceStart(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Grace End (Late after this)</label>
                  <input
                    type="time"
                    value={punchGraceEnd}
                    onChange={(e) => setPunchGraceEnd(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] outline-none focus:border-sky-400"
                  />
                </div>
              </div>
            </div>

            {/* Off Days */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-[13px] font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CalendarDays size={16} className="text-slate-500" />
                Weekly Off Days
              </h3>
              <div className="flex flex-wrap gap-2">
                {DAY_NAMES.map((name, idx) => {
                  const isActive = offDays.includes(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setOffDays((prev) =>
                          isActive ? prev.filter((d) => d !== idx) : [...prev, idx]
                        );
                      }}
                      className={`px-4 py-2 rounded-xl text-[12px] font-semibold transition ${
                        isActive
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Plant Shutdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-[13px] font-bold text-slate-800 mb-4 flex items-center gap-2">
                <XCircle size={16} className="text-red-500" />
                Plant Shutdown Periods
              </h3>

              {/* Existing shutdowns */}
              {shutdowns.length > 0 && (
                <div className="mb-4 space-y-2">
                  {shutdowns.map((sd, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-xl bg-red-50 border border-red-100 px-4 py-2.5">
                      <div>
                        <p className="text-[12px] font-semibold text-red-700">{sd.name || 'Shutdown'}</p>
                        <p className="text-[10px] text-red-500">{formatDate(sd.from)} → {formatDate(sd.to)}</p>
                      </div>
                      <button
                        onClick={() => setShutdowns((prev) => prev.filter((_, i) => i !== idx))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new shutdown */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Shutdown name"
                  value={newShutdown.name}
                  onChange={(e) => setNewShutdown((prev) => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] outline-none focus:border-sky-400"
                />
                <input
                  type="date"
                  value={newShutdown.from}
                  onChange={(e) => setNewShutdown((prev) => ({ ...prev, from: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] outline-none focus:border-sky-400"
                />
                <input
                  type="date"
                  value={newShutdown.to}
                  onChange={(e) => setNewShutdown((prev) => ({ ...prev, to: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] outline-none focus:border-sky-400"
                />
                <button
                  onClick={() => {
                    if (newShutdown.name && newShutdown.from && newShutdown.to) {
                      setShutdowns((prev) => [...prev, { ...newShutdown }]);
                      setNewShutdown({ name: '', from: '', to: '' });
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-red-600 transition"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            {/* Actions */}
            {settingsMessage && (
              <div className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                settingsMessage.includes('Failed')
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {settingsMessage}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-2.5 text-[12px] font-semibold text-white hover:bg-sky-600 disabled:opacity-50 transition shadow-lg shadow-sky-200"
              >
                <Save size={14} />
                {savingSettings ? 'Saving…' : 'Save Settings'}
              </button>
              <button
                onClick={applyOffDaysAndShutdowns}
                disabled={savingSettings}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-6 py-2.5 text-[12px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
              >
                <CalendarDays size={14} />
                {savingSettings ? 'Applying…' : 'Apply Off Days & Shutdowns to Calendar'}
              </button>
            </div>
          </div>
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
// ATTENDANCE OVERVIEW
// ══════════════════════════════════════════════════════════════════════════
const ATTENDANCE_STATUSES = [
  { key: 'present', label: 'Present', bg: '#22c55e', letter: 'P' },
  { key: 'absent', label: 'Absent', bg: '#ef4444', letter: 'A' },
  { key: 'leave', label: 'Leave', bg: '#f472b6', letter: 'L' },
  { key: 'holiday', label: 'Holiday', bg: '#93c5fd', letter: 'H' },
  { key: 'off_day', label: 'Off Day', bg: '#94a3b8', letter: 'O' },
  { key: 'rest_day', label: 'Rest Day', bg: '#64748b', letter: 'R' },
  { key: 'on_duty', label: 'On Duty', bg: '#fef08a', letter: 'OD' },
  { key: 'permission', label: 'Permission', bg: '#86efac', letter: 'PM' },
  { key: 'grace', label: 'Grace', bg: '#2dd4bf', letter: 'GR' },
  { key: 'alert', label: 'Alert', bg: '#f97316', letter: '!' },
  { key: 'deduction', label: 'Deduction', bg: '#ef4444', letter: 'D' },
  { key: 'overtime', label: 'Overtime', bg: '#2563eb', letter: 'OT' },
  { key: 'override', label: 'Override', bg: '#16a34a', letter: 'OV' },
];

// Normalize a status string to a key for counting
const normalizeStatusKey = (status = '') => {
  const s = String(status).trim().toLowerCase().replace(/\s+/g, '_');
  // Map common variants
  if (s === 'offday') return 'off_day';
  if (s === 'restday') return 'rest_day';
  if (s === 'onduty') return 'on_duty';
  if (s === 'alert_deduction') return 'alert';
  if (s === 'late_arrival') return 'alert';
  if (s === 'time_mismatch') return 'deduction';
  // Check if it's a known key
  if (ATTENDANCE_STATUSES.find((st) => st.key === s)) return s;
  return s; // return as-is for unknown
};

// Count statuses for a user's calendar data
const countUserStatuses = (dateMap = {}, periodFilter) => {
  const counts = {};
  ATTENDANCE_STATUSES.forEach((s) => { counts[s.key] = 0; });
  counts._total = 0;
  counts._lateCount = 0;

  Object.entries(dateMap).forEach(([dateKey, entry]) => {
    const status = normalizeStatusKey(entry.status || '');
    if (counts[status] !== undefined) {
      counts[status]++;
    }
    counts._total++;

    // Count late arrivals separately
    if (entry.is_late || entry.alert === 'late_arrival' || (entry.punch_in_timing && entry.punch_in_timing !== 'on_time')) {
      counts._lateCount++;
    }
  });

  return counts;
};

function AttendanceOverview({ members, allCalendarData, selectedUserId, searchQuery, syncingCalendar, onSyncUser }) {
  const [expandedUser, setExpandedUser] = useState(null);

  // Filter members
  const filteredMembers = members.filter((m) => {
    if (selectedUserId !== 'all' && m.id !== selectedUserId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const haystack = getMemberName(m).toLowerCase() + ' ' + (m.email || '').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Compute stats for each member
  const memberStats = filteredMembers.map((m) => {
    const dateMap = allCalendarData[m.id] || {};
    const counts = countUserStatuses(dateMap);
    return { member: m, counts, dateCount: Object.keys(dateMap).length };
  });

  // Compute totals across all visible members
  const totals = {};
  ATTENDANCE_STATUSES.forEach((s) => { totals[s.key] = 0; });
  totals._total = 0;
  totals._lateCount = 0;
  memberStats.forEach(({ counts }) => {
    ATTENDANCE_STATUSES.forEach((s) => { totals[s.key] += counts[s.key]; });
    totals._total += counts._total;
    totals._lateCount += counts._lateCount;
  });

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Entries', value: totals._total, bg: 'bg-slate-50', text: 'text-slate-700' },
          { label: 'Present', value: totals.present, bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { label: 'Absent', value: totals.absent, bg: 'bg-red-50', text: 'text-red-600' },
          { label: 'On Leave', value: totals.leave, bg: 'bg-pink-50', text: 'bg-pink-600' },
          { label: 'Late Arrivals', value: totals._lateCount, bg: 'bg-orange-50', text: 'text-orange-600' },
          { label: 'Holidays', value: totals.holiday, bg: 'bg-blue-50', text: 'text-blue-600' },
          { label: 'Permissions', value: totals.permission, bg: 'bg-teal-50', text: 'text-teal-600' },
        ].map((card) => (
          <div key={card.label} className={`rounded-2xl border border-slate-200 ${card.bg} p-4 shadow-sm`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold ${card.text}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Per-User Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-slate-800">Attendance by Employee</h3>
          <span className="text-[10px] text-slate-400">{filteredMembers.length} employee{filteredMembers.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/60">
                <th className="text-left px-4 py-3 sticky left-0 bg-slate-50 z-10 min-w-[180px]">Employee</th>
                {ATTENDANCE_STATUSES.map((s) => (
                  <th key={s.key} className="text-center px-2 py-3 min-w-[55px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded text-[7px] font-bold text-white" style={{ background: s.bg }}>{s.letter}</span>
                      <span>{s.label}</span>
                    </div>
                  </th>
                ))}
                <th className="text-center px-2 py-3 min-w-[50px]">Late</th>
                <th className="text-center px-2 py-3 min-w-[50px]">Total</th>
                <th className="text-center px-3 py-3 min-w-[80px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberStats.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-[12px] text-slate-400" colSpan={ATTENDANCE_STATUSES.length + 4}>
                    No employees found
                  </td>
                </tr>
              ) : (
                <>
                  {memberStats.map(({ member, counts, dateCount }) => (
                    <tr key={member.id} className="bg-white hover:bg-sky-50/30 transition-colors">
                      <td className="px-4 py-3 sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-[11px] font-bold text-sky-600">
                            {getMemberName(member).charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold text-slate-800">{getMemberName(member)}</p>
                            <p className="truncate text-[10px] text-slate-400">{member.email || decodeEmail(member.id)}</p>
                          </div>
                        </div>
                      </td>
                      {ATTENDANCE_STATUSES.map((s) => (
                        <td key={s.key} className="text-center px-2 py-3">
                          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-bold ${
                            counts[s.key] > 0 ? 'bg-slate-100 text-slate-700' : 'text-slate-300'
                          }`}>
                            {counts[s.key] || '—'}
                          </span>
                        </td>
                      ))}
                      <td className="text-center px-2 py-3">
                        <span className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-lg px-1 text-[11px] font-bold ${
                          counts._lateCount > 0 ? 'bg-orange-50 text-orange-600' : 'text-slate-300'
                        }`}>
                          {counts._lateCount || '—'}
                        </span>
                      </td>
                      <td className="text-center px-2 py-3">
                        <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-lg bg-slate-50 px-1 text-[12px] font-bold text-slate-700">
                          {counts._total || '—'}
                        </span>
                      </td>
                      <td className="text-center px-3 py-3">
                        <button
                          onClick={() => onSyncUser(member)}
                          disabled={syncingCalendar}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-3 py-1.5 text-[10px] font-semibold text-sky-600 hover:bg-sky-100 disabled:opacity-50 transition"
                        >
                          <RefreshCw size={10} className={syncingCalendar ? 'animate-spin' : ''} />
                          Sync
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Totals row */}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="px-4 py-3 sticky left-0 bg-slate-50 z-10">
                      <span className="text-[12px] font-bold text-slate-700">TOTALS</span>
                    </td>
                    {ATTENDANCE_STATUSES.map((s) => (
                      <td key={s.key} className="text-center px-2 py-3">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[12px] font-bold text-slate-800 shadow-sm">
                          {totals[s.key] || '—'}
                        </span>
                      </td>
                    ))}
                    <td className="text-center px-2 py-3">
                      <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-lg bg-orange-50 px-1 text-[11px] font-bold text-orange-600">
                        {totals._lateCount || '—'}
                      </span>
                    </td>
                    <td className="text-center px-2 py-3">
                      <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-lg bg-white px-1 text-[12px] font-bold text-slate-800 shadow-sm">
                        {totals._total || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3"></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend for status colors */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Status Legend</p>
        <div className="flex flex-wrap gap-2">
          {ATTENDANCE_STATUSES.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded text-[7px] font-bold text-white" style={{ background: s.bg }}>
                {s.letter}
              </span>
              <span className="text-[10px] text-slate-500">{s.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
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
