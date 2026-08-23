import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ChevronDown,
  Info,
  X,
  Upload,
} from 'lucide-react';
import { collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getUserFromToken, db } from '../../firebase';
import PendingList from './leave_pending';
import HistoryList from './leave_history';

// ── Helpers ──────────────────────────────────────────────────────────────
const encodeEmail = (email = '') =>
  String(email).trim().toLowerCase().replace(/\./g, '_');

const LEAVE_TYPE_KEYS = {
  'Planned Leave': 'plannedLeave',
  'Sick Leave': 'sickLeave',
  'Casual Leave': 'casualLeave',
  'Special Leave': 'specialLeave',
  'Work From Home': 'workFromHome',
  'Loss of Pay': 'lossOfPay',
};

const INITIAL_LEAVE_BALANCES = {
  plannedLeave: 0,
  sickLeave: 0,
  casualLeave: 0,
  specialLeave: 0,
  workFromHome: 0,
  lossOfPay: 0,
};

const LEAVE_TYPE_LIST = [
  { label: 'Planned Leave', key: 'plannedLeave' },
  { label: 'Sick Leave', key: 'sickLeave' },
  { label: 'Casual Leave', key: 'casualLeave' },
  { label: 'Special Leave', key: 'specialLeave' },
  { label: 'Work From Home', key: 'workFromHome' },
  { label: 'Loss of Pay', key: 'lossOfPay' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ISO "2026-08-25" → "25 Aug 2026"
const formatIsoDisplay = (iso = '') => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${parseInt(d, 10)} ${MONTH_NAMES_SHORT[parseInt(m, 10) - 1]} ${y}`;
};

const toIso = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// ── Beautiful Date Picker ────────────────────────────────────────────────
const DatePicker = ({ value, onChange, placeholder = 'Select date', minDate = '', maxDate = '' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse the current value to initialize the popup calendar
  const parsed = value ? value.split('-').map(Number) : null;
  const [viewYear, setViewYear] = useState(parsed ? parsed[0] : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed[1] - 1 : new Date().getMonth());

  // Close on outside click
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Build calendar cells for the popup
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayIso = toIso(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  const rem = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= rem; i++) cells.push({ day: null });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const handleSelect = (day) => {
    const iso = toIso(viewYear, viewMonth, day);
    // Respect min/max constraints
    if (minDate && iso < minDate) return;
    if (maxDate && iso > maxDate) return;
    onChange(iso);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      {/* Input trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm text-left transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${
          open ? 'border-sky-400 bg-sky-50/40' : 'border-gray-200 hover:border-sky-300'
        }`}
      >
        <CalendarIcon size={15} className="flex-shrink-0 text-sky-400" />
        <span className={value ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {value ? formatIsoDisplay(value) : placeholder}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 transition"
          >
            <X size={8} />
          </span>
        )}
      </button>

      {/* Calendar popup */}
      {open && (
        <div className="absolute z-50 mt-2 w-[280px] rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-gray-200/60 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100 transition"
            >
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-gray-100 transition"
            >
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 pb-1">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold uppercase text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {cells.map((cell, idx) => {
              if (!cell.day) {
                return <div key={idx} />;
              }

              const iso = toIso(viewYear, viewMonth, cell.day);
              const isSelected = iso === value;
              const isToday = iso === todayIso;
              const isDisabled = (minDate && iso < minDate) || (maxDate && iso > maxDate);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(cell.day)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-medium transition
                    ${isSelected
                      ? 'bg-sky-500 text-white shadow-sm'
                      : isToday
                        ? 'bg-sky-50 text-sky-600 ring-1 ring-sky-200'
                        : isDisabled
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Today shortcut */}
          <div className="border-t border-gray-100 px-4 py-2">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
                handleSelect(now.getDate());
              }}
              className="w-full text-center text-[11px] font-semibold text-sky-500 hover:text-sky-700 transition"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────
const LeaveManagement = () => {
  const navigate = useNavigate();
  const currentUser = getUserFromToken();
  const currentUserEmail = currentUser?.email?.toLowerCase() || '';
  const encodedEmail = encodeEmail(currentUserEmail);

  const todayNow = new Date();

  // --- State ---
  const [currentDate, setCurrentDate] = useState(
    new Date(todayNow.getFullYear(), todayNow.getMonth(), 1)
  );
  const [activeTab, setActiveTab] = useState('Apply');
  const [selectedDay, setSelectedDay] = useState(todayNow.getDate());
  const [leaveType, setLeaveType] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const fileInputRef = useRef(null);

  const [leaveBalances, setLeaveBalances] = useState(
    LEAVE_TYPE_LIST.map((t) => ({
      title: t.label,
      key: t.key,
      total: INITIAL_LEAVE_BALANCES[t.key] ?? 0,
      consumed: 0,
    }))
  );

  // --- Fetch leave balances: leave/{encodedEmail}/balance/{autoId} ---
  useEffect(() => {
    if (!encodedEmail) return undefined;

    return onSnapshot(
      collection(db, 'leave', encodedEmail, 'balance'),
      (snapshot) => {
        if (snapshot.empty) {
          setLeaveBalances(
            LEAVE_TYPE_LIST.map((t) => ({
              title: t.label,
              key: t.key,
              total: INITIAL_LEAVE_BALANCES[t.key] ?? 0,
              consumed: 0,
            }))
          );
          return;
        }

        const docs = [...snapshot.docs].sort((a, b) => {
          const aData = a.data();
          const bData = b.data();
          const aTime =
            aData.createdAt?.toMillis?.() ?? aData.createdAt?.seconds ??
            aData.timestamp?.toMillis?.() ?? aData.timestamp?.seconds ?? 0;
          const bTime =
            bData.createdAt?.toMillis?.() ?? bData.createdAt?.seconds ??
            bData.timestamp?.toMillis?.() ?? bData.timestamp?.seconds ?? 0;
          if (aTime !== bTime) return bTime - aTime;
          return b.id.localeCompare(a.id);
        });

        const latest = docs[0].data();

        setLeaveBalances(
          LEAVE_TYPE_LIST.map((t) => ({
            title: t.label,
            key: t.key,
            total: latest[t.key] ?? INITIAL_LEAVE_BALANCES[t.key] ?? 0,
            consumed: latest[`${t.key}Consumed`] ?? latest[`${t.key}_consumed`] ?? 0,
          }))
        );
      },
      (error) => {
        console.error('Unable to load leave balances:', error);
      }
    );
  }, [encodedEmail]);

  // --- Calendar Logic ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = MONTH_NAMES[month];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarCells = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarCells.push({ day: daysInPrevMonth - i, type: 'prev' });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({ day: i, type: 'current' });
  }
  const remainder = (7 - (calendarCells.length % 7)) % 7;
  for (let i = 1; i <= remainder; i++) {
    calendarCells.push({ day: i, type: 'next' });
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // --- Handlers ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setAttachment({ file, url });
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleSubmit = async () => {
    if (!leaveType) {
      setSubmitMessage('Please select a leave type.');
      return;
    }
    if (!dateRange.from || !dateRange.to) {
      setSubmitMessage('Please select both From and To dates.');
      return;
    }
    if (dateRange.from > dateRange.to) {
      setSubmitMessage('From date cannot be after To date.');
      return;
    }
    if (!encodedEmail) {
      setSubmitMessage('You must be signed in to apply for leave.');
      return;
    }

    setSubmitting(true);
    setSubmitMessage('');

    try {
      const leavePayload = {
        email: currentUserEmail,
        name: currentUser?.name || currentUser?.displayName || currentUserEmail,
        userId: encodedEmail,
        requestType: 'leave_request',
        leaveType,
        leaveTypeKey: LEAVE_TYPE_KEYS[leaveType] || leaveType,
        fromDate: dateRange.from,
        toDate: dateRange.to,
        description: description.trim(),
        attachmentName: attachment?.file?.name || '',
        status: 'pending',
        createdAt: serverTimestamp(),
        appliedOn: new Date().toISOString(),
      };

      await addDoc(
        collection(db, 'leave', encodedEmail, 'leave_apply'),
        leavePayload
      );

      setSubmitMessage('Leave request submitted successfully!');

      setLeaveType('');
      setDescription('');
      setAttachment(null);
      setDateRange({ from: '', to: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';

      setTimeout(() => navigate(-1), 1500);
    } catch (error) {
      console.error('Unable to submit leave request:', error);
      setSubmitMessage('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ================= TOP SECTION: Calendar + Stats ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* --- Calendar --- */}
          <div className="lg:col-span-5">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={prevMonth}
                className="p-2 rounded-full hover:bg-gray-100 transition"
                aria-label="Previous month"
              >
                <ChevronLeft size={20} className="text-gray-600" />
              </button>
              <h2 className="text-xl font-bold">
                {monthName} {year}
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 rounded-full hover:bg-gray-100 transition"
                aria-label="Next month"
              >
                <ChevronRight size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-y-1">
              {calendarCells.map((cell, idx) => {
                const isSelected =
                  cell.type === 'current' && cell.day === selectedDay;
                const baseClasses =
                  'h-10 w-10 mx-auto flex items-center justify-center text-sm rounded-full transition';
                const colorClasses =
                  cell.type === 'current'
                    ? isSelected
                      ? 'bg-gray-900 text-white font-semibold shadow-md'
                      : 'text-gray-900 hover:bg-gray-100 cursor-pointer'
                    : 'text-gray-300';

                return (
                  <div key={idx} className="flex items-center justify-center">
                    <button
                      className={`${baseClasses} ${colorClasses}`}
                      onClick={() =>
                        cell.type === 'current' && setSelectedDay(cell.day)
                      }
                    >
                      {cell.day}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- Leave Balance Cards --- */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4 content-start">
            {leaveBalances.map((item) => (
              <div
                key={item.key}
                className="bg-sky-50 rounded-[1.5rem] p-5 flex flex-col items-center justify-center text-center aspect-[4/3] sm:aspect-auto sm:h-36 transition hover:shadow-sm"
              >
                <span className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  {item.title}
                </span>
                <span className="text-3xl font-bold text-gray-900">
                  {item.total}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  Consumed: {item.consumed}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ================= TABS ================= */}
        <div className="flex justify-center">
          <div className="inline-flex bg-sky-100 rounded-full p-1">
            {['Apply', 'Pending', 'History'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 sm:px-8 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ================= APPLY FORM ================= */}
        {activeTab === 'Apply' && (
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* Left Column: Duration, Description, Attachment */}
              <div className="space-y-5">
                {/* Duration with custom date pickers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Duration
                  </label>
                  <div className="flex gap-3">
                    <DatePicker
                      value={dateRange.from}
                      onChange={(v) => setDateRange((prev) => ({ ...prev, from: v }))}
                      placeholder="From date"
                      maxDate={dateRange.to || ''}
                    />
                    <DatePicker
                      value={dateRange.to}
                      onChange={(v) => setDateRange((prev) => ({ ...prev, to: v }))}
                      placeholder="To date"
                      minDate={dateRange.from || ''}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <div className="relative">
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                    />
                    <Info size={16} className="absolute right-3 bottom-3 text-gray-400" />
                  </div>
                </div>

                {/* Attachment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attachment
                  </label>
                  <div className="flex items-center gap-3">
                    {attachment ? (
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200">
                          <img src={attachment.url} alt="attachment" className="w-full h-full object-cover" />
                        </div>
                        <button
                          onClick={removeAttachment}
                          className="absolute -top-1 -right-1 bg-white border border-gray-200 rounded-full p-0.5 shadow-sm hover:bg-gray-50"
                        >
                          <X size={10} className="text-gray-600" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-10 h-10 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-sky-400 hover:text-sky-500 transition"
                      >
                        <Upload size={16} />
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Leave Type */}
              <div className="lg:pt-0">
                <div className="hidden lg:block h-7 mb-2" />
                <div className="relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white"
                  >
                    <span className={leaveType ? 'text-gray-900' : 'text-gray-400'}>
                      {leaveType || 'Select Leave Type'}
                    </span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>

                  {showDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                      <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl py-1 max-h-60 overflow-auto">
                        {LEAVE_TYPE_LIST.map((type) => (
                          <div
                            key={type.key}
                            onClick={() => {
                              setLeaveType(type.label);
                              setShowDropdown(false);
                            }}
                            className="px-4 py-2.5 text-sm text-gray-700 hover:bg-sky-50 cursor-pointer transition"
                          >
                            {type.label}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Submit / validation message */}
            {submitMessage && (
              <div
                className={`mb-4 rounded-xl px-4 py-2.5 text-sm font-medium ${
                  submitMessage.includes('success')
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}
              >
                {submitMessage}
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                onClick={handleCancel}
                className="px-8 py-2.5 rounded-full border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-2.5 rounded-full bg-sky-500 text-sm font-medium text-white hover:bg-sky-600 transition shadow-lg shadow-sky-200 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Apply'}
              </button>
            </div>
          </div>
        )}

        {/* Pending & History tabs */}
        {activeTab === 'Pending' && (
          <div className="text-center py-20 text-gray-400 text-sm">
            <PendingList />
          </div>
        )}
        {activeTab === 'History' && (
          <div className="text-center py-20 text-gray-400 text-sm">
            <HistoryList />
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveManagement;
