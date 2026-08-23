import React, { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, ChevronDown, ChevronUp, Pencil, Settings2, Upload, UserRound } from 'lucide-react';
import { arrayUnion, collection, collectionGroup, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getUserFromToken, db } from '../firebase';
import LeaveBalanceEditorModal from './LeaveBalanceEditorModal';

const LeaveCard = ({ label, total, consumed, accent }) => (
  <div className={`rounded-xl border p-3 flex flex-col gap-0.5 ${accent ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
    <p className="text-[10px] font-medium leading-tight text-slate-400">{label}</p>
    <p className="text-2xl font-bold leading-tight text-slate-800">{total}</p>
    <p className="text-[10px] text-slate-300">Consumed: {consumed}</p>
  </div>
);

// ── Legend visual components ────────────────────────────────────────────

// Type "badge": colored square with letter(s) inside
const LegendBadge = ({ letter, bg, color, label }) => (
  <div className="flex items-center gap-1.5">
    <span
      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[8px] font-bold leading-none shadow-sm"
      style={{ background: bg, color: color || '#fff' }}
    >
      {letter}
    </span>
    <span className="text-[10px] font-medium text-slate-600">{label}</span>
  </div>
);

// Type "alert": pulsing dot with a glow ring
const LegendAlert = ({ bg, label }) => (
  <div className="flex items-center gap-1.5">
    <span className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center">
      <span className="absolute h-4 w-4 rounded-full opacity-30" style={{ background: bg }} />
      <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: bg }} />
    </span>
    <span className="text-[10px] font-medium text-slate-600">{label}</span>
  </div>
);

// Type "icon": a small SVG icon
const LegendIcon = ({ icon, bg, color, label }) => (
  <div className="flex items-center gap-1.5">
    <span
      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md"
      style={{ background: bg }}
    >
      {icon}
    </span>
    <span className="text-[10px] font-medium text-slate-600">{label}</span>
  </div>
);

// Type "triangle": a cell with a corner triangle in the bottom-left
const LegendTriangle = ({ bg, triangleColor, label }) => (
  <div className="flex items-center gap-1.5">
    <span className="relative flex h-5 w-5 flex-shrink-0 overflow-hidden rounded-md" style={{ background: bg }}>
      <svg className="absolute bottom-0 left-0" width="10" height="10" viewBox="0 0 10 10">
        <polygon points="0,10 10,10 0,0" fill={triangleColor} />
      </svg>
    </span>
    <span className="text-[10px] font-medium text-slate-600">{label}</span>
  </div>
);

// Unified renderer
const LegendItem = ({ type, ...props }) => {
  switch (type) {
    case 'badge': return <LegendBadge {...props} />;
    case 'alert': return <LegendAlert {...props} />;
    case 'icon': return <LegendIcon {...props} />;
    case 'triangle': return <LegendTriangle {...props} />;
    default: return <LegendBadge {...props} />;
  }
};

const LEAVE_CARDS = [
  { key: 'plannedLeave', label: 'Planned Leave', defaultTotal: 3, consumed: 0 },
  { key: 'sickLeave', label: 'Sick Leave', defaultTotal: 3, consumed: 0, accent: true },
  { key: 'casualLeave', label: 'Casual Leave', defaultTotal: 3, consumed: 0 },
  { key: 'specialLeave', label: 'Special Leave', defaultTotal: 0, consumed: 0 },
  { key: 'workFromHome', label: 'Work From Home', defaultTotal: 3, consumed: 0, accent: true },
  { key: 'lossOfPay', label: 'Loss of Pay', defaultTotal: 0, consumed: 0 },
];

const INITIAL_LEAVE_BALANCES = {
  plannedLeave: 3,
  sickLeave: 3,
  casualLeave: 3,
  specialLeave: 0,
  workFromHome: 3,
  lossOfPay: 0,
};

const LEGEND_ITEMS = [
  // Badge type: colored square with letter
  { type: 'badge', letter: 'P', bg: '#22c55e', color: '#fff', label: 'Present' },
  { type: 'badge', letter: 'A', bg: '#ef4444', color: '#fff', label: 'Absent' },
  { type: 'badge', letter: 'O', bg: '#94a3b8', color: '#fff', label: 'Off Day' },
  { type: 'badge', letter: 'R', bg: '#64748b', color: '#fff', label: 'Rest Day' },
  { type: 'badge', letter: 'L', bg: '#f472b6', color: '#fff', label: 'Leave' },
  { type: 'badge', letter: 'OD', bg: '#fef08a', color: '#854d0e', label: 'On Duty' },
  { type: 'badge', letter: 'H', bg: '#93c5fd', color: '#1e3a8a', label: 'Holiday' },
  { type: 'badge', letter: '?', bg: '#dc2626', color: '#fff', label: 'Status Unknown' },
  // Alert type: glowing dot
  { type: 'alert', bg: '#f97316', label: 'Alert / Deduction' },
  { type: 'alert', bg: '#ef4444', label: 'Deduction' },
  // Icon type: small SVG icon
  {
    type: 'icon',
    bg: '#dbeafe',
    label: 'Overtime',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
        <line x1="19" y1="5" x2="22" y2="2" />
        <line x1="22" y1="5" x2="19" y2="2" />
      </svg>
    ),
  },
  {
    type: 'icon',
    bg: '#dcfce7',
    label: 'Override',
    icon: (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <polyline points="21 3 21 8 16 8" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <polyline points="3 21 3 16 8 16" />
      </svg>
    ),
  },
  // Triangle type: corner triangle in bottom-left
  { type: 'triangle', bg: '#f0fdf4', triangleColor: '#22c55e', label: 'Permission' },
  { type: 'triangle', bg: '#f1f5f9', triangleColor: '#94a3b8', label: 'Ignored' },
  { type: 'triangle', bg: '#eff6ff', triangleColor: '#3b82f6', label: 'Grace' },
];

const DAY_TYPES = [
  { emoji: '🛌', label: 'Rest Day', bg: '#ede9fe', border: '#ddd6fe', text: '#6d28d9' },
  { emoji: '📅', label: 'Off Day', bg: '#f1f5f9', border: '#e2e8f0', text: '#475569' },
  { emoji: '🌴', label: 'Holiday', bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' },
  { emoji: '🌓', label: 'Half Day', bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
  { emoji: '🏭', label: 'Plant Shutdown', bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' },
];

const DayTypeChip = ({ emoji, label, bg, border, text }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold shadow-sm"
    style={{ background: bg, border: `1px solid ${border}`, color: text }}
  >
    <span className="text-[12px] leading-none">{emoji}</span>
    {label}
  </span>
);

const HOLIDAYS = [
  { id: '1', name: 'Republic Day', date: 'Mon, 26 January', dateLabel: 'Mon, 26 January', startDate: '2026-01-26', endDate: '', day: 'Monday' },
  { id: '2', name: 'Holi', date: 'Wed, 4 March', dateLabel: 'Wed, 4 March', startDate: '2026-03-04', endDate: '', day: 'Wednesday' },
  { id: '3', name: 'Good Friday', date: 'Fri, 18 April', dateLabel: 'Fri, 18 April', startDate: '2026-04-18', endDate: '', day: 'Friday' },
  { id: '4', name: 'Eid ul-Fitr', date: 'Mon, 31 March', dateLabel: 'Mon, 31 March', startDate: '2026-03-31', endDate: '', day: 'Monday' },
];

const MONTH_OPTIONS = [
  { value: 'all', label: 'All Months' },
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const encodeEmail = (email = '') => String(email).trim().toLowerCase().replace(/\./g, '_');
const decodeEmail = (encodedEmail = '') => String(encodedEmail).replace(/_/g, '.');
const getMemberName = (member = {}) => member.name || member.fullName || member.displayName || member.email || decodeEmail(member.id);
const getRequestStatus = (request = {}) => String(request.status ?? request.leave_status ?? request.requestStatus ?? request.approvalStatus ?? '').trim().toLowerCase();
const isPendingRequest = (request = {}) => getRequestStatus(request) === 'pending';

// "2026-08-20T22:57:43+05:30" -> "10:57:43 pm"
const formatSessionTime = (iso = '') => {
  if (!iso) return '—';
  const match = String(iso).match(/T(\d{2}:\d{2}:\d{2})/);
  if (!match) return String(iso);
  const [hours, minutes, seconds] = match[1].split(':').map(Number);
  const period = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${period}`;
};

// "2026-08-20" -> "20 Aug 2026"
const formatDisplayDate = (dateStr = '') => {
  if (!dateStr) return '';
  const [year, month, day] = String(dateStr).split('-');
  if (!year || !month || !day) return String(dateStr);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(day, 10)} ${MONTHS[parseInt(month, 10) - 1]} ${year}`;
};

const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Holiday list is read from Firestore: holiday_list/{year} -> array of holiday entries.
const HOLIDAY_LIST_COLLECTION = 'holiday_list';
const HOLIDAY_LIST_YEAR = '2026';
const HOLIDAY_ENTRY_FIELD = 'holidays'; // field name that holds the holiday entries

// "2026-01-26" -> { weekday: "Mon", monthNumber: "01", display: "Mon, 26 January" }
const formatHolidayDate = (dateStr = '') => {
  if (!dateStr) return '';
  const [year, month, day] = String(dateStr).split('-');
  if (!year || !month || !day) return String(dateStr);
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const weekday = parsed.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const monthName = parsed.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  return `${weekday}, ${Number(day)} ${monthName}`;
};

// Extract the weekday name from an ISO date string "2026-01-26" -> "Monday"
const getWeekdayFromIso = (dateStr = '') => {
  if (!dateStr) return '';
  const [year, month, day] = String(dateStr).split('-').map(Number);
  if (!year || !month || !day) return '';
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(parsed.getTime())) return '';
  return WEEKDAY_LONG[parsed.getUTCDay()];
};

// Extract the month number "01"–"12" from an ISO date or a display string like "Mon, 26 January"
const extractMonthNumber = (holiday = {}) => {
  // Prefer startDate if it's a valid ISO date
  if (holiday.startDate && /^\d{4}-\d{2}-\d{2}$/.test(holiday.startDate)) {
    return holiday.startDate.slice(5, 7);
  }
  // Try to parse the display date label: "Mon, 26 January" or "26 January"
  const label = String(holiday.dateLabel || holiday.date || '');
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (label.toLowerCase().includes(MONTH_NAMES[i].toLowerCase())) {
      return String(i + 1).padStart(2, '0');
    }
  }
  return '';
};

// Normalize a raw Firestore/CSV holiday entry into the shape the UI expects.
const normalizeHoliday = (raw = {}, index = 0) => {
  // Gather all possible date strings from the raw entry
  const rawDate = String(raw.date || '').trim();
  const rawStartDate = String(raw.startDate || raw.start_date || '').trim();
  const rawEndDate = String(raw.endDate || raw.end_date || '').trim();

  // Try to find or derive an ISO "YYYY-MM-DD" date
  let startDate = '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawStartDate)) {
    startDate = rawStartDate;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    startDate = rawDate;
  } else {
    // Attempt coercion from other formats
    startDate = toIsoDate(rawStartDate) || toIsoDate(rawDate) || '';
  }

  // Build the human-readable display label
  const isIso = /^\d{4}-\d{2}-\d{2}$/.test(rawDate);
  let display = '';
  if (raw.dateLabel) {
    display = String(raw.dateLabel);
  } else if (isIso) {
    display = formatHolidayDate(rawDate);
  } else if (startDate) {
    display = formatHolidayDate(startDate);
  } else {
    display = rawDate || rawStartDate || '';
  }

  // Resolve the weekday: prefer explicit field, then compute from ISO, then extract from display label
  let day = String(raw.day || '').trim();
  if (!day && startDate) day = getWeekdayFromIso(startDate);
  if (!day) {
    // Try to extract short weekday from display string "Mon, 26 January" -> "Monday"
    const shortDay = WEEKDAY_SHORT.find((d) => display.startsWith(d));
    if (shortDay) {
      const idx = WEEKDAY_SHORT.indexOf(shortDay);
      day = WEEKDAY_LONG[idx];
    }
  }

  return {
    id: raw.id || raw.uuid || `${startDate || rawDate || 'holiday'}-${index}`,
    name: String(raw.name || '').trim(),
    date: display,
    dateLabel: display,
    startDate,
    endDate: rawEndDate,
    day,
  };
};

// Strip surrounding quotes from a CSV cell: "hello" -> hello, 'hello' -> hello
const stripCsvQuotes = (value = '') => {
  const trimmed = String(value).trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

// Try to coerce various date formats into ISO "YYYY-MM-DD".
// Handles: YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, MM-DD-YYYY, and common variants.
const toIsoDate = (raw = '') => {
  const value = stripCsvQuotes(raw).trim();
  if (!value) return '';

  // Already ISO: "2026-01-26"
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const [, a, b, y] = dmyMatch;
    // If first number > 12 it must be a day (DD-MM-YYYY)
    if (Number(a) > 12) return `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    // If second number > 12 it must be a day (MM-DD-YYYY)
    if (Number(b) > 12) return `${y}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
    // Ambiguous — assume DD-MM-YYYY (Indian convention)
    return `${y}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
  }

  return '';
};

// Parse a CSV with columns: name, date, day.
const parseHolidayCsv = (text = '') => {
  const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const entries = [];
  lines.forEach((line) => {
    const cells = line.split(',').map((cell) => stripCsvQuotes(cell));
    // Skip a header row (e.g. "name, date, day").
    if (cells.join(' ').toLowerCase().includes('name') && cells.join(' ').toLowerCase().includes('date')) return;
    if (cells.length < 2) return;
    const name = cells[0];
    const rawDate = cells[1];
    const day = cells[2] || '';
    if (!name || !rawDate) return;

    // Normalize the date to ISO format; fall back to the raw value if we can't parse it.
    const isoDate = toIsoDate(rawDate);
    const date = isoDate || rawDate;

    entries.push({ name, date, day });
  });
  return entries;
};

// ── Collapsible Section Wrapper ────────────────────────────────────────
const CollapsibleSection = ({ title, icon, isOpen, onToggle, children, badge }) => (
  <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
    <button
      type="button"
      className="flex w-full items-center justify-between px-4 py-3.5 transition-colors hover:bg-slate-50/60"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2.5">
        {icon && <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</span>}
        <span className="text-[13px] font-semibold text-slate-800">{title}</span>
        {badge}
      </div>
      <span className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 ${isOpen ? 'bg-blue-100 text-blue-600 rotate-0' : 'bg-slate-100 text-slate-400 rotate-0'}`}>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </span>
    </button>
    <div className={`transition-all duration-200 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
      <div className="border-t border-slate-50 px-4 py-3.5">{children}</div>
    </div>
  </div>
);

export default function Calender() {
  const navigate = useNavigate();
  const calRef = useRef(null);
  const currentUser = getUserFromToken();
  const currentUserEmail = currentUser?.email?.toLowerCase() || '';
  const currentUserEncodedEmail = encodeEmail(currentUserEmail);

  const [legendOpen, setLegendOpen] = useState(true);
  const [swipesOpen, setSwipesOpen] = useState(true);
  const [sideOpen, setSideOpen] = useState(false);
  const [holidays, setHolidays] = useState(HOLIDAYS);
  const [holidayMonth, setHolidayMonth] = useState('all');
  const [holidayMonthMenuOpen, setHolidayMonthMenuOpen] = useState(false);
  const [holidayCsvYear, setHolidayCsvYear] = useState(String(new Date().getFullYear()));
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvMessage, setCsvMessage] = useState('');
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayDraft, setHolidayDraft] = useState({ name: '', startDate: '', endDate: '', dateLabel: '' });
  const [editingHolidayIndex, setEditingHolidayIndex] = useState(null);
  const [leaveEditorOpen, setLeaveEditorOpen] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState(INITIAL_LEAVE_BALANCES);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [members, setMembers] = useState([]);
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [attendanceByDate, setAttendanceByDate] = useState({});
  const [showAllHolidays, setShowAllHolidays] = useState(false);
  const [showAllPending, setShowAllPending] = useState(false);

  // ── Deferred CSV state ──────────────────────────────────────────────
  const [pendingCsvFile, setPendingCsvFile] = useState(null);
  const [pendingCsvEntries, setPendingCsvEntries] = useState([]);
  const csvInputRef = useRef(null);

  const normalizedRole = String(currentUserRole || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const canManageLeaveBalances = ['admin', 'hr manager'].includes(normalizedRole);
  const canManageHolidays = canManageLeaveBalances;
  const selectedMemberId = selectedMember?.id || currentUserEncodedEmail;
  const selectedMemberName = selectedMember ? getMemberName(selectedMember) : (currentUser?.name || currentUserEmail);
  const selectedSwipe = selectedDate ? attendanceByDate[selectedDate] : null;

  // ── Holiday filtering by month ──────────────────────────────────────
  const filteredHolidays = holidayMonth === 'all'
    ? holidays
    : holidays.filter((holiday) => extractMonthNumber(holiday) === holidayMonth);

  // Show only 5 holidays by default; expand with "Show more"
  const HOLIDAY_PREVIEW_COUNT = 5;
  const visibleHolidays = showAllHolidays ? filteredHolidays : filteredHolidays.slice(0, HOLIDAY_PREVIEW_COUNT);
  const hasMoreHolidays = filteredHolidays.length > HOLIDAY_PREVIEW_COUNT;

  // Show only 3 pending requests by default; expand with "Show more"
  const PENDING_PREVIEW_COUNT = 3;
  const visiblePending = showAllPending ? pendingRequests : pendingRequests.slice(0, PENDING_PREVIEW_COUNT);
  const hasMorePending = pendingRequests.length > PENDING_PREVIEW_COUNT;

  useEffect(() => {
    const api = calRef.current?.getApi();
    const timer = setTimeout(() => {
      api?.updateSize();
      if (api) api.select(selectedDate);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close month dropdown when clicking outside
  useEffect(() => {
    if (!holidayMonthMenuOpen) return undefined;
    const handleClick = () => setHolidayMonthMenuOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [holidayMonthMenuOpen]);

  // Read the signed-in user's role from users/{email_with_dots_replaced_by_underscores}.
  useEffect(() => {
    if (!currentUserEncodedEmail) {
      setCurrentUserRole('');
      return undefined;
    }

    return onSnapshot(
      doc(db, 'users', currentUserEncodedEmail),
      (snapshot) => {
        if (!snapshot.exists()) {
          setCurrentUserRole('');
          return;
        }
        const profile = snapshot.data();
        setCurrentUserRole(profile.role ?? profile.Role ?? profile.userRole ?? '');
      },
      (error) => {
        console.error('Unable to load current user role:', error);
        setCurrentUserRole('');
      }
    );
  }, [currentUserEncodedEmail]);

  // Admin and HR Manager can select any member. The scroll area supports any number of users.
  useEffect(() => {
    if (!canManageLeaveBalances) {
      setMembers([]);
      setMemberMenuOpen(false);
      setSelectedMember(null);
      return undefined;
    }

    return onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const allMembers = snapshot.docs
          .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }))
          .sort((a, b) => getMemberName(a).localeCompare(getMemberName(b)));

        setMembers(allMembers);
        setSelectedMember((oldMember) => {
          if (oldMember) return oldMember;
          return allMembers.find((member) => member.id === currentUserEncodedEmail) || {
            id: currentUserEncodedEmail,
            email: currentUserEmail,
            name: currentUser?.name || currentUserEmail,
          };
        });
      },
      (error) => {
        console.error('Unable to load members:', error);
        setMembers([]);
      }
    );
  }, [canManageLeaveBalances, currentUserEncodedEmail, currentUserEmail, currentUser?.name]);

  // Read the selected employee's leave balances from the subcollection:
  // leave/{encodedEmail}/balance/{autoId}
  // Multiple balance docs may exist; we use the latest one (by createdAt
  // timestamp if available, otherwise by document ID which is chronological
  // for Firestore auto-IDs).
  useEffect(() => {
    if (!selectedMemberId) {
      setLeaveBalances(INITIAL_LEAVE_BALANCES);
      return undefined;
    }

    return onSnapshot(
      collection(db, 'leave', selectedMemberId, 'balance'),
      (snapshot) => {
        if (snapshot.empty) {
          setLeaveBalances(INITIAL_LEAVE_BALANCES);
          return;
        }

        // Sort documents to find the latest one.
        // Prefer a createdAt / timestamp field; fall back to doc ID ordering.
        const docs = [...snapshot.docs].sort((a, b) => {
          const aData = a.data();
          const bData = b.data();
          const aTime = aData.createdAt?.toMillis?.()
            ?? aData.createdAt?.seconds
            ?? aData.timestamp?.toMillis?.()
            ?? aData.timestamp?.seconds
            ?? 0;
          const bTime = bData.createdAt?.toMillis?.()
            ?? bData.createdAt?.seconds
            ?? bData.timestamp?.toMillis?.()
            ?? bData.timestamp?.seconds
            ?? 0;
          if (aTime !== bTime) return bTime - aTime; // descending (latest first)
          // Fall back to doc ID comparison (auto-IDs are chronological)
          return b.id.localeCompare(a.id);
        });

        const latestData = docs[0].data();

        setLeaveBalances({
          plannedLeave: latestData.plannedLeave ?? INITIAL_LEAVE_BALANCES.plannedLeave,
          sickLeave: latestData.sickLeave ?? INITIAL_LEAVE_BALANCES.sickLeave,
          casualLeave: latestData.casualLeave ?? INITIAL_LEAVE_BALANCES.casualLeave,
          specialLeave: latestData.specialLeave ?? INITIAL_LEAVE_BALANCES.specialLeave,
          workFromHome: latestData.workFromHome ?? INITIAL_LEAVE_BALANCES.workFromHome,
          lossOfPay: latestData.lossOfPay ?? INITIAL_LEAVE_BALANCES.lossOfPay,
        });
      },
      (error) => {
        console.error('Unable to load leave balance:', error);
        setLeaveBalances(INITIAL_LEAVE_BALANCES);
      }
    );
  }, [selectedMemberId]);

  // Admin and HR Manager see all pending requests from both subcollections:
  //   leave/{encodedEmail}/leave_apply/{autoId}
  //   leave/{encodedEmail}/reg_apply/{autoId}
  // Uses collection group queries (no composite index needed — filtered client-side).
  useEffect(() => {
    if (!canManageLeaveBalances) {
      setPendingRequests([]);
      return undefined;
    }

    // Store results from both listeners separately, then merge
    const leaveResults = new Map();
    const regResults = new Map();

    const mergeAndSet = () => {
      const merged = [
        ...Array.from(leaveResults.values()),
        ...Array.from(regResults.values()),
      ];
      // Sort newest first
      merged.sort((a, b) => {
        const aMs = a._ms || 0;
        const bMs = b._ms || 0;
        return bMs - aMs;
      });
      setPendingRequests(merged);
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

    const mapDoc = (docSnap, category) => {
      const data = docSnap.data();
      const status = String(data.status || '').trim().toLowerCase();
      if (status !== 'pending') return null;

      const parentPath = docSnap.ref.parent.parent?.path || '';
      const encodedEmail = parentPath.split('/').pop() || '';
      const employeeEmail = data.email || decodeEmail(encodedEmail);
      const employeeName = data.name || data.fullName || employeeEmail;

      return {
        id: `${category}-${docSnap.id}`,
        category,
        employeeEmail,
        employeeName,
        request: data,
        _ms: resolveMs(data.createdAt) || resolveMs(data.appliedOn),
      };
    };

    // Listener 1: leave_apply (leave requests)
    const unsubLeave = onSnapshot(
      collectionGroup(db, 'leave_apply'),
      (snapshot) => {
        leaveResults.clear();
        snapshot.docs.forEach((docSnap) => {
          const mapped = mapDoc(docSnap, 'Leave');
          if (mapped) leaveResults.set(docSnap.id, mapped);
        });
        mergeAndSet();
      },
      (error) => {
        console.error('Unable to load pending leave requests:', error);
      }
    );

    // Listener 2: reg_apply (regularization requests)
    const unsubReg = onSnapshot(
      collectionGroup(db, 'reg_apply'),
      (snapshot) => {
        regResults.clear();
        snapshot.docs.forEach((docSnap) => {
          const mapped = mapDoc(docSnap, 'Regularization');
          if (mapped) regResults.set(docSnap.id, mapped);
        });
        mergeAndSet();
      },
      (error) => {
        console.error('Unable to load pending regularization requests:', error);
      }
    );

    return () => {
      unsubLeave();
      unsubReg();
    };
  }, [canManageLeaveBalances]);

  // Swipes: users/{email} -> attendanceIds -> attendance/{id}.dates -> { date: { first_join_time, last_leave_time } }.
  useEffect(() => {
    if (!currentUserEncodedEmail) {
      setAttendanceByDate({});
      return undefined;
    }

    const attendanceData = new Map();
    let attendanceUnsubs = [];
    let disposed = false;

    const recompute = () => {
      const merged = {};
      attendanceData.forEach((byDate) => {
        Object.entries(byDate).forEach(([dateKey, dayData]) => {
          merged[dateKey] = dayData;
        });
      });
      setAttendanceByDate(merged);
    };

    const userUnsub = onSnapshot(
      doc(db, 'users', currentUserEncodedEmail),
      (userSnapshot) => {
        attendanceUnsubs.forEach((unsub) => unsub());
        attendanceUnsubs = [];
        attendanceData.clear();

        if (!userSnapshot.exists()) {
          setAttendanceByDate({});
          return;
        }

        const rawIds = userSnapshot.data().attendanceIds;
        let attendanceIds = [];
        if (Array.isArray(rawIds)) {
          attendanceIds = rawIds;
        } else if (rawIds && typeof rawIds === 'object') {
          attendanceIds = Object.keys(rawIds);
        } else if (rawIds) {
          attendanceIds = [rawIds];
        }
        attendanceIds = attendanceIds.map((id) => String(id).trim()).filter(Boolean);

        if (attendanceIds.length === 0) {
          console.warn('No attendanceIds found on user document:', userSnapshot.data());
          setAttendanceByDate({});
          return;
        }

        attendanceUnsubs = attendanceIds.map((attendanceId) =>
          onSnapshot(
            doc(db, 'attendance', attendanceId),
            (attendanceSnapshot) => {
              if (disposed) return;
              if (!attendanceSnapshot.exists()) {
                attendanceData.delete(attendanceId);
              } else {
                const dates = attendanceSnapshot.data().dates || {};
                const byDate = {};
                Object.entries(dates).forEach(([dateKey, day]) => {
                  if (day && (day.first_join_time || day.last_leave_time)) {
                    byDate[dateKey] = {
                      first_join_time: day.first_join_time || '',
                      last_leave_time: day.last_leave_time || '',
                    };
                  }
                });
                attendanceData.set(attendanceId, byDate);
              }
              recompute();
            },
            (error) => {
              console.error('Unable to load attendance document:', error);
              attendanceData.delete(attendanceId);
              recompute();
            }
          )
        );
      },
      (error) => {
        console.error('Unable to load user attendance ids:', error);
        setAttendanceByDate({});
      }
    );

    return () => {
      disposed = true;
      userUnsub();
      attendanceUnsubs.forEach((unsub) => unsub());
    };
  }, [currentUserEncodedEmail]);

  // Holiday list: read from Firestore holiday_list/{year} (fallback to the static list).
  useEffect(() => {
    return onSnapshot(
      doc(db, HOLIDAY_LIST_COLLECTION, HOLIDAY_LIST_YEAR),
      (snapshot) => {
        if (!snapshot.exists()) {
          setHolidays(HOLIDAYS);
          return;
        }
        const data = snapshot.data() || {};
        let rawEntries = data[HOLIDAY_ENTRY_FIELD];
        if (rawEntries == null) {
          const candidates = ['entries', 'entry', 'holiday_list', 'list', 'holidays_list'];
          for (const key of candidates) {
            if (data[key] != null) { rawEntries = data[key]; break; }
          }
        }

        let list = [];
        if (Array.isArray(rawEntries)) {
          list = rawEntries;
        } else if (rawEntries && typeof rawEntries === 'object') {
          list = Object.values(rawEntries);
        }

        const mapped = list.map(normalizeHoliday);
        setHolidays(mapped.length > 0 ? mapped : HOLIDAYS);
      },
      (error) => {
        console.error('Unable to load holidays:', error);
        setHolidays(HOLIDAYS);
      }
    );
  }, []);

  const handleDateSelect = (info) => {
    setSelectedDate(info.startStr);
  };

  const openHolidayEditor = (holiday = null, index = null) => {
    setEditingHolidayIndex(index);
    setHolidayDraft(holiday ? {
      name: holiday.name || '', startDate: holiday.startDate || '', endDate: holiday.endDate || '', dateLabel: holiday.dateLabel || holiday.date || '',
    } : { name: '', startDate: '', endDate: '', dateLabel: '' });
    setPendingCsvFile(null);
    setPendingCsvEntries([]);
    setCsvMessage('');
    setHolidayModalOpen(true);
  };

  const closeHolidayEditor = () => {
    setHolidayModalOpen(false);
    setEditingHolidayIndex(null);
    setHolidayDraft({ name: '', startDate: '', endDate: '', dateLabel: '' });
    setPendingCsvFile(null);
    setPendingCsvEntries([]);
    setCsvMessage('');
  };

  // ── CSV file selection (no upload yet) ──────────────────────────────
  const handleCsvFileSelect = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const entries = parseHolidayCsv(text);
      if (entries.length === 0) {
        setCsvMessage('No valid rows found. Expected columns: name, date (YYYY-MM-DD).');
        setPendingCsvFile(null);
        setPendingCsvEntries([]);
        return;
      }
      setPendingCsvFile(file);
      setPendingCsvEntries(entries);
      setCsvMessage(`${entries.length} holiday row(s) ready. Click "Save Holiday" to upload.`);
    } catch (error) {
      console.error('Unable to read CSV file:', error);
      setCsvMessage('Could not read the file. Please try again.');
      setPendingCsvFile(null);
      setPendingCsvEntries([]);
    }
  };

  const clearPendingCsv = () => {
    setPendingCsvFile(null);
    setPendingCsvEntries([]);
    setCsvMessage('');
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  // ── Save: writes the individual holiday AND/OR the CSV batch ───────
  const saveHoliday = async () => {
    const hasIndividualHoliday = Boolean(holidayDraft.name.trim() && holidayDraft.startDate.trim());
    const hasCsvBatch = pendingCsvEntries.length > 0;

    if (!hasIndividualHoliday && !hasCsvBatch) return;

    if (holidayDraft.name.trim() || holidayDraft.startDate.trim() || holidayDraft.endDate.trim()) {
      const name = holidayDraft.name.trim();
      const startDate = holidayDraft.startDate.trim();
      const endDate = holidayDraft.endDate.trim();
      const hasRange = Boolean(startDate || endDate);
      if (!name || (hasRange && (!startDate || !endDate))) return;
      const dateLabel = holidayDraft.dateLabel.trim() || (hasRange ? `${startDate} to ${endDate}` : '');
      if (!dateLabel) return;
    }

    try {
      setCsvUploading(true);
      setCsvMessage('');

      if (hasIndividualHoliday) {
        const name = holidayDraft.name.trim();
        const startDate = holidayDraft.startDate.trim();
        const endDate = holidayDraft.endDate.trim();
        const dateLabel = holidayDraft.dateLabel.trim() || `${startDate} to ${endDate}`;

        const newHoliday = {
          id: editingHolidayIndex === null ? String(Date.now()) : holidays[editingHolidayIndex]?.id,
          name, date: dateLabel, dateLabel, startDate, endDate,
        };

        setHolidays((previous) => editingHolidayIndex === null
          ? [...previous, newHoliday]
          : previous.map((holiday, index) => (index === editingHolidayIndex ? newHoliday : holiday)));

        const payload = { name, date: dateLabel };
        if (endDate) payload.endDate = endDate;
        await setDoc(
          doc(db, HOLIDAY_LIST_COLLECTION, HOLIDAY_LIST_YEAR),
          { [HOLIDAY_ENTRY_FIELD]: arrayUnion(payload) },
          { merge: true }
        );
      }

      if (hasCsvBatch) {
        const year = String(holidayCsvYear).trim();
        if (!/^\d{4}$/.test(year)) {
          setCsvMessage('Please enter a valid 4-digit year for CSV upload.');
          setCsvUploading(false);
          return;
        }

        const csvPayload = pendingCsvEntries.map((entry) => {
          const item = { name: entry.name, date: entry.date };
          // Always store startDate in ISO format so the date badge can parse it
          const iso = toIsoDate(entry.date) || (
            /^\d{4}-\d{2}-\d{2}$/.test(entry.date) ? entry.date : ''
          );
          if (iso) item.startDate = iso;
          if (entry.day) item.day = entry.day;
          return item;
        });

        await setDoc(
          doc(db, HOLIDAY_LIST_COLLECTION, year),
          { [HOLIDAY_ENTRY_FIELD]: arrayUnion(...csvPayload) },
          { merge: true }
        );

        setCsvMessage(
          hasIndividualHoliday
            ? `Holiday saved + ${csvPayload.length} CSV row(s) uploaded to ${year}.`
            : `Uploaded ${csvPayload.length} holiday(s) to ${year}.`
        );
      } else {
        setCsvMessage('Holiday saved.');
      }

      setPendingCsvFile(null);
      setPendingCsvEntries([]);

      setTimeout(() => {
        closeHolidayEditor();
      }, 1200);
    } catch (error) {
      console.error('Unable to save holiday / upload CSV:', error);
      setCsvMessage('Save failed. See console for details.');
    } finally {
      setCsvUploading(false);
    }
  };

  // ── Format the holiday date into a structured display ──────────────
  // Returns { dayNum: "26", month: "Jan", weekday: "Mon" }
  const parseHolidayDisplayParts = (holiday = {}) => {
    const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;

    // Collect every candidate date string and try each one
    const candidates = [
      holiday.startDate,
      holiday.date,
      holiday.dateLabel,
      holiday.start_date,
    ].map((v) => String(v || '').trim());

    // 1) Try ISO "YYYY-MM-DD" from any candidate
    for (const candidate of candidates) {
      if (isoRegex.test(candidate)) {
        const [year, month, dayNum] = candidate.split('-');
        const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(dayNum)));
        const weekday = isNaN(parsed.getTime()) ? '' : WEEKDAY_SHORT[parsed.getUTCDay()];
        return { dayNum: String(Number(dayNum)), month: MONTHS_SHORT[Number(month) - 1], weekday };
      }
    }

    // 2) Try to coerce non-ISO dates via toIsoDate
    for (const candidate of candidates) {
      const iso = toIsoDate(candidate);
      if (iso && isoRegex.test(iso)) {
        const [year, month, dayNum] = iso.split('-');
        const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(dayNum)));
        const weekday = isNaN(parsed.getTime()) ? '' : WEEKDAY_SHORT[parsed.getUTCDay()];
        return { dayNum: String(Number(dayNum)), month: MONTHS_SHORT[Number(month) - 1], weekday };
      }
    }

    // 3) Fallback: parse display label like "Mon, 26 January" or "26 January"
    for (const candidate of candidates) {
      const match = candidate.match(/(\w{3}),?\s+(\d{1,2})\s+(\w+)/);
      if (match) return { weekday: match[1], dayNum: match[2], month: match[3].slice(0, 3) };
    }

    return { weekday: '', dayNum: '', month: '' };
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .fc { font-family: 'DM Sans', sans-serif !important; font-size: 12px; }
        .fc-toolbar-title { font-size: 15px !important; font-weight: 700 !important; color: #1e293b !important; }
        .fc-button { font-family: 'DM Sans', sans-serif !important; font-size: 11px !important; font-weight: 600 !important; padding: 5px 10px !important; border-radius: 8px !important; background: #fff !important; border: 1px solid #e2e8f0 !important; color: #64748b !important; box-shadow: none !important; text-transform: capitalize !important; }
        .fc-button:hover { background: #f8fafc !important; }
        .fc-button:focus { box-shadow: none !important; }
        .fc-col-header-cell-cushion { font-size: 10px !important; font-weight: 600 !important; color: #94a3b8 !important; text-transform: uppercase !important; letter-spacing: .6px !important; text-decoration: none !important; }
        .fc-daygrid-day-number { font-size: 11px !important; color: #94a3b8 !important; padding: 4px 6px !important; text-decoration: none !important; }
        .fc-daygrid-day.fc-day-today { background: #f0f9ff !important; }
        .fc-daygrid-day.fc-day-today .fc-daygrid-day-number { background: #2563eb !important; color: #fff !important; border-radius: 50% !important; width: 22px !important; height: 22px !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 10px !important; font-weight: 700 !important; }
        .fc-highlight { background: #dbeafe !important; }
        .fc-scrollgrid { border: none !important; }
        .fc-scrollgrid td, .fc-scrollgrid th { border-color: #f1f5f9 !important; }
        .fc-daygrid-day-frame { min-height: 72px !important; }
        .fc-toolbar.fc-header-toolbar { margin-bottom: 12px !important; }
        .holiday-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
        .holiday-scroll::-webkit-scrollbar { width: 6px; }
        .holiday-scroll::-webkit-scrollbar-track { background: transparent; }
        .holiday-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 9999px; }
        .holiday-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <div className="min-h-screen w-full bg-slate-100 p-3 sm:p-4 lg:p-5">
        {/* ── Admin Panel Button (Admin & HR Manager only) ──────────── */}
        {canManageLeaveBalances && (
          <button
            type="button"
            onClick={() => navigate('/ACalendar')}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-[12px] font-semibold text-white shadow-md shadow-sky-200/50 transition-all hover:shadow-lg hover:shadow-sky-300/50 hover:from-sky-600 hover:to-blue-700 active:scale-[0.99]"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Admin Panel
          </button>
        )}

        <div className="mb-3 flex justify-end lg:hidden">
          <button onClick={() => setSideOpen((open) => !open)} className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600">
            {sideOpen ? 'Hide Panel' : 'Leave & Holidays'}
          </button>
        </div>

        <div className="flex w-full flex-col gap-4 lg:flex-row">
          {/* ── Left Column: Calendar, Legends, Swipes ─────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {/* Calendar */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Schedule</span>
                <button onClick={() => calRef.current?.getApi().today()} className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-100">Today</button>
              </div>
              <FullCalendar ref={calRef} plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" selectable select={handleDateSelect} unselectAuto={false} height="auto" handleWindowResize headerToolbar={{ left: 'prev', center: 'title', right: 'next' }} />
            </div>

            {/* Legends (collapsible) */}
            <CollapsibleSection
              title="Legends"
              icon={<Calendar className="h-3.5 w-3.5" />}
              isOpen={legendOpen}
              onToggle={() => setLegendOpen((v) => !v)}
              badge={<span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">{LEGEND_ITEMS.length}</span>}
            >
              <div className="grid grid-cols-3 gap-x-3 gap-y-2.5 sm:grid-cols-5">
                {LEGEND_ITEMS.map((item) => <LegendItem key={item.label} {...item} />)}
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">Day Type</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAY_TYPES.map((type) => <DayTypeChip key={type.label} {...type} />)}
                </div>
              </div>
            </CollapsibleSection>

            {/* Swipes (collapsible) */}
            <CollapsibleSection
              title="Swipes"
              icon={
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              }
              isOpen={swipesOpen}
              onToggle={() => setSwipesOpen((v) => !v)}
              badge={selectedSwipe ? <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">Active</span> : null}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-500">{selectedDate ? formatDisplayDate(selectedDate) : 'Select a date'}</span>
                <span className="text-[10px] text-slate-400">Click a date on the calendar</span>
              </div>
              {!selectedSwipe ? (
                <div className="rounded-xl bg-slate-50 px-3 py-5 text-center">
                  <p className="text-[11px] font-medium text-slate-400">No swipes recorded for this date</p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400">First Join</span>
                      <span className="text-[13px] font-bold text-emerald-600">{formatSessionTime(selectedSwipe.first_join_time)}</span>
                    </div>
                    <span className="text-slate-300">→</span>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[10px] text-slate-400">Last Leave</span>
                      <span className="text-[13px] font-bold text-red-500">{formatSessionTime(selectedSwipe.last_leave_time)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CollapsibleSection>
          </div>

          {/* ── Right Sidebar ──────────────────────────────────────────── */}
          <aside className={`w-full flex-shrink-0 flex-col gap-4 lg:flex lg:w-64 xl:w-72 ${sideOpen ? 'flex' : 'hidden'}`}>
            {/* Leave Balance */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="min-w-0"><h2 className="text-[15px] font-bold tracking-tight text-slate-800">Leave Balance</h2>{canManageLeaveBalances && <p className="mt-0.5 truncate text-[10px] text-slate-400">Viewing: {selectedMemberName}</p>}</div>
                {canManageLeaveBalances && <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <button type="button" onClick={() => setMemberMenuOpen((open) => !open)} className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-100" title="Select employee"><UserRound className="h-3.5 w-3.5" /><ChevronDown className="h-3 w-3" /></button>
                    {memberMenuOpen && <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"><div className="border-b border-slate-100 px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Select Member</p></div><div className="max-h-64 overflow-y-auto p-1.5">{members.length === 0 ? <p className="px-2 py-3 text-center text-[11px] text-slate-400">No members found</p> : members.map((member) => { const active = member.id === selectedMemberId; return <button key={member.id} type="button" onClick={() => { setSelectedMember(member); setMemberMenuOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}><span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">{getMemberName(member).charAt(0).toUpperCase()}</span><span className="min-w-0"><span className="block truncate text-[11px] font-semibold">{getMemberName(member)}</span><span className="block truncate text-[10px] text-slate-400">{member.email || decodeEmail(member.id)}</span></span></button>; })}</div></div>}
                  </div>
                  <button type="button" onClick={() => setLeaveEditorOpen(true)} className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-100" title="Edit leave balances"><Settings2 className="h-3.5 w-3.5" />Edit</button>
                </div>}
              </div>
              <div className="mb-4 grid grid-cols-3 gap-2">{LEAVE_CARDS.map((card) => <LeaveCard key={card.key} label={card.label} total={leaveBalances[card.key] ?? card.defaultTotal} consumed={card.consumed} accent={card.accent} />)}</div>
              <div className="flex flex-col gap-2"><Link to="/leaveApply"><button className="w-full rounded-xl bg-blue-600 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-blue-700">Apply Leave</button></Link><Link to="/RegularizationApply"><button className="w-full rounded-xl border border-blue-100 bg-blue-50 py-2.5 text-center text-[11px] font-semibold leading-tight text-blue-600 transition-colors hover:bg-blue-100">Regularization &amp; Permission</button></Link></div>
            </div>

            {/* Pending Requests */}
            {canManageLeaveBalances && <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="text-[15px] font-bold tracking-tight text-slate-800">Pending Requests</h2><p className="mt-0.5 text-[10px] text-slate-400">Leave & regularization requests</p></div><span className="rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-600">{pendingRequests.length} Pending</span></div>
              <div className="pr-1">{pendingRequests.length === 0 ? <div className="rounded-xl bg-slate-50 px-3 py-5 text-center"><p className="text-[11px] font-medium text-slate-500">No pending requests</p></div> : <div className="flex flex-col gap-2">{visiblePending.map((item) => { const request = item.request; const requestType = request.leaveType || request.leave_type || request.type || request.permissionType || item.category; const fromDate = request.fromDate || request.from_date || request.startDate || request.date || ''; const toDate = request.toDate || request.to_date || request.endDate || ''; return <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-slate-700">{item.employeeName}</p><p className="truncate text-[10px] text-slate-400">{item.employeeEmail}</p></div><span className="flex-shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">{item.category}</span></div><div className="mt-2 flex items-center justify-between gap-2 text-[10px]"><span className="truncate font-medium text-slate-500">{requestType}</span>{(fromDate || toDate) && <span className="flex-shrink-0 text-slate-400">{fromDate}{toDate && toDate !== fromDate ? ` → ${toDate}` : ''}</span>}</div></div>; })}</div>}
              {/* Show more / Show less toggle */}
              {hasMorePending && (
                <button
                  type="button"
                  onClick={() => setShowAllPending((v) => !v)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 py-2 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  {showAllPending ? (
                    <>Show less <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>Show {pendingRequests.length - PENDING_PREVIEW_COUNT} more <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>
              )}
              </div>
            </div>}

            {/* ── Holiday List ─────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              {/* Header with title + filters */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-slate-800">Holiday List</span>
                  <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">{filteredHolidays.length}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Month filter dropdown */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setHolidayMonthMenuOpen((open) => !open)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Calendar className="h-3 w-3" />
                      <span>{holidayMonth === 'all' ? 'All' : MONTH_OPTIONS.find((m) => m.value === holidayMonth)?.label}</span>
                      <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${holidayMonthMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {holidayMonthMenuOpen && (
                      <div className="absolute right-0 z-40 mt-1.5 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="max-h-52 overflow-y-auto p-1">
                          {MONTH_OPTIONS.map((month) => (
                            <button
                              key={month.value}
                              type="button"
                              onClick={() => {
                                setHolidayMonth(month.value);
                                setHolidayMonthMenuOpen(false);
                                setShowAllHolidays(false);
                              }}
                              className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[11px] transition-colors ${holidayMonth === month.value ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                              {month.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Add holiday button */}
                  {canManageHolidays && (
                    <button
                      type="button"
                      onClick={() => openHolidayEditor()}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
                      title="Add holiday"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Holiday list */}
              <div className="flex flex-col gap-0">
                {filteredHolidays.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 px-3 py-5 text-center">
                    <p className="text-[11px] font-medium text-slate-400">No holidays{holidayMonth !== 'all' ? ' in this month' : ''}</p>
                  </div>
                ) : (
                  visibleHolidays.map((holiday, index) => {
                    const parts = parseHolidayDisplayParts(holiday);
                    const dayName = holiday.day || (parts.weekday ? WEEKDAY_LONG[WEEKDAY_SHORT.indexOf(parts.weekday)] || '' : '');

                    return (
                      <div
                        key={`${holiday.id}-${index}`}
                        className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-slate-50"
                      >
                        {/* Date badge */}
                        <div className="flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/60">
                          <span className="text-[9px] font-semibold uppercase leading-none text-blue-400">{parts.weekday || '—'}</span>
                          <span className="text-[15px] font-bold leading-tight text-slate-800">{parts.dayNum || '—'}</span>
                          <span className="text-[8px] font-medium uppercase leading-none text-slate-400">{parts.month || ''}</span>
                        </div>
                        {/* Name + day */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-slate-700">{holiday.name}</p>
                          {dayName && <p className="truncate text-[10px] text-slate-400">{dayName}</p>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Show more / Show less toggle */}
              {hasMoreHolidays && (
                <button
                  type="button"
                  onClick={() => setShowAllHolidays((v) => !v)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 py-2 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  {showAllHolidays ? (
                    <>Show less <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>Show {filteredHolidays.length - HOLIDAY_PREVIEW_COUNT} more <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>
              )}
            </div>

            {/* This Month Stats */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white shadow-sm">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-blue-200">This Month</p>
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Working Days', value: '22' }, { label: 'Present Days', value: '18' }, { label: 'Absent Days', value: '2' }, { label: 'Late Arrivals', value: '3' }].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-white/10 p-2.5">
                    <p className="text-xl font-bold leading-tight">{stat.value}</p>
                    <p className="mt-0.5 text-[10px] text-blue-200">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Holiday Editor Modal ──────────────────────────────────────── */}
      {holidayModalOpen && canManageHolidays && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={(event) => event.target === event.currentTarget && closeHolidayEditor()}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
            <div className="mb-1 flex items-start justify-between">
              <h3 className="text-[15px] font-bold text-slate-800">{editingHolidayIndex === null ? 'Add Holiday' : 'Edit Holiday'}</h3>
              <button onClick={closeHolidayEditor} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="mb-4 text-[11px] text-slate-400">Add a single holiday or import a batch from CSV. Everything is saved when you click "Save Holiday".</p>

            <div className="space-y-3">
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-blue-400" placeholder="Holiday name" value={holidayDraft.name} onChange={(event) => setHolidayDraft((old) => ({ ...old, name: event.target.value }))} autoFocus />
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-blue-400" placeholder="Start date (YYYY-MM-DD)" value={holidayDraft.startDate} onChange={(event) => setHolidayDraft((old) => ({ ...old, startDate: event.target.value }))} />
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-blue-400" placeholder="End date (YYYY-MM-DD)" value={holidayDraft.endDate} onChange={(event) => setHolidayDraft((old) => ({ ...old, endDate: event.target.value }))} />
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-blue-400" placeholder="Display label (optional)" value={holidayDraft.dateLabel} onChange={(event) => setHolidayDraft((old) => ({ ...old, dateLabel: event.target.value }))} />
            </div>

            {canManageLeaveBalances && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><Upload className="h-3.5 w-3.5" /> Import from CSV (Admin/HR)</p>
                <div className="flex items-center gap-2">
                  <input className="w-24 rounded-lg border border-slate-200 px-2.5 py-2 text-[12px] outline-none focus:border-blue-400" placeholder="Year" value={holidayCsvYear} onChange={(event) => setHolidayCsvYear(event.target.value)} />
                  <label className={`flex-1 cursor-pointer rounded-lg border border-dashed border-slate-200 px-3 py-2 text-center text-[11px] font-medium ${csvUploading ? 'text-slate-300' : pendingCsvFile ? 'border-green-300 bg-green-50 text-green-700' : 'text-slate-500 hover:border-blue-300 hover:text-blue-600'}`}>
                    {csvUploading ? 'Saving…' : pendingCsvFile ? `✓ ${pendingCsvFile.name}` : 'Choose CSV file'}
                    <input ref={csvInputRef} type="file" accept=".csv" className="hidden" disabled={csvUploading} onChange={handleCsvFileSelect} />
                  </label>
                </div>

                {pendingCsvFile && pendingCsvEntries.length > 0 && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                    <span className="text-[10px] text-slate-500">{pendingCsvEntries.length} row(s) from <span className="font-medium">{pendingCsvFile.name}</span> → year <span className="font-medium">{holidayCsvYear}</span></span>
                    <button type="button" onClick={clearPendingCsv} className="text-[10px] font-semibold text-red-500 hover:text-red-700">Remove</button>
                  </div>
                )}

                {csvMessage && <p className="mt-1.5 text-[10px] text-slate-500">{csvMessage}</p>}
                <p className="mt-1.5 text-[10px] text-slate-400">CSV format: name, date, day — uploaded when you click "Save Holiday"</p>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={closeHolidayEditor} className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-500">Cancel</button>
              <button onClick={saveHoliday} disabled={csvUploading} className={`rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white transition-colors ${csvUploading ? 'cursor-not-allowed opacity-60' : 'hover:bg-blue-700'}`}>
                {csvUploading ? 'Saving…' : 'Save Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LeaveBalanceEditorModal isOpen={leaveEditorOpen} onClose={() => setLeaveEditorOpen(false)} currentUserEmail={selectedMember?.email || decodeEmail(selectedMemberId)} />
    </>
  );
}
