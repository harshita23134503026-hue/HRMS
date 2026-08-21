import React, { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Link } from 'react-router-dom';
import { ChevronDown, Pencil, Settings2, UserRound } from 'lucide-react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { getUserFromToken, db } from '../firebase';
import LeaveBalanceEditorModal from './LeaveBalanceEditorModal';

const LeaveCard = ({ label, total, consumed, accent }) => (
  <div className={`rounded-xl border p-3 flex flex-col gap-0.5 ${accent ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
    <p className="text-[10px] font-medium leading-tight text-slate-400">{label}</p>
    <p className="text-2xl font-bold leading-tight text-slate-800">{total}</p>
    <p className="text-[10px] text-slate-300">Consumed: {consumed}</p>
  </div>
);

const LegendDot = ({ bg, label }) => (
  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
    <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-[3px]" style={{ background: bg }} />
    {label}
  </div>
);

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
  { bg: '#4ade80', label: 'Present' }, { bg: '#f87171', label: 'Absent' },
  { bg: '#94a3b8', label: 'Off Day' }, { bg: '#60a5fa', label: 'Rest Day' },
  { bg: '#fb923c', label: 'Leave' }, { bg: '#facc15', label: 'On Duty' },
  { bg: '#f472b6', label: 'Holiday' }, { bg: '#fde047', label: 'Alert/Deduction' },
  { bg: '#ef4444', label: 'Deduction' }, { bg: '#a78bfa', label: 'Status Unknown' },
  { bg: '#2563eb', label: 'Overtime' }, { bg: '#16a34a', label: 'Override' },
  { bg: '#86efac', label: 'Permission' }, { bg: '#cbd5e1', label: 'Ignored' },
  { bg: '#2dd4bf', label: 'Grace' },
];

const DAY_TYPES = ['🛌 Rest Day', '📅 Off Day', '🌴 Holiday', '🌓 Half Day', '🏭 Plant Shutdown'];

const HOLIDAYS = [
  { id: '1', name: 'Republic Day', date: 'Mon, 26 January', dateLabel: 'Mon, 26 January', startDate: '', endDate: '' },
  { id: '2', name: 'Holi', date: 'Wed, 4 March', dateLabel: 'Wed, 4 March', startDate: '', endDate: '' },
  { id: '3', name: 'Good Friday', date: 'Fri, 18 April', dateLabel: 'Fri, 18 April', startDate: '', endDate: '' },
  { id: '4', name: 'Eid ul-Fitr', date: 'Mon, 31 March', dateLabel: 'Mon, 31 March', startDate: '', endDate: '' },
];

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

export default function Calender() {
  const calRef = useRef(null);
  const currentUser = getUserFromToken();
  const currentUserEmail = currentUser?.email?.toLowerCase() || '';
  const currentUserEncodedEmail = encodeEmail(currentUserEmail);

  const [legendOpen, setLegendOpen] = useState(true);
  const [swipesOpen, setSwipesOpen] = useState(true);
  const [sideOpen, setSideOpen] = useState(false);
  const [holidays, setHolidays] = useState(HOLIDAYS);
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

  const normalizedRole = String(currentUserRole || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const canManageHolidays = true;
  const canManageLeaveBalances = ['admin', 'hr manager'].includes(normalizedRole);
  const selectedMemberId = selectedMember?.id || currentUserEncodedEmail;
  const selectedMemberName = selectedMember ? getMemberName(selectedMember) : (currentUser?.name || currentUserEmail);
  const selectedSwipe = selectedDate ? attendanceByDate[selectedDate] : null;

  useEffect(() => {
    const api = calRef.current?.getApi();
    const timer = setTimeout(() => {
      api?.updateSize();
      if (api) api.select(selectedDate);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Read the selected employee's document: leave/{email_with_dots_replaced_by_underscores}.
  useEffect(() => {
    if (!selectedMemberId) {
      setLeaveBalances(INITIAL_LEAVE_BALANCES);
      return undefined;
    }

    return onSnapshot(
      doc(db, 'leave', selectedMemberId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setLeaveBalances(INITIAL_LEAVE_BALANCES);
          return;
        }
        const data = snapshot.data();
        setLeaveBalances({
          plannedLeave: data.plannedLeave ?? INITIAL_LEAVE_BALANCES.plannedLeave,
          sickLeave: data.sickLeave ?? INITIAL_LEAVE_BALANCES.sickLeave,
          casualLeave: data.casualLeave ?? INITIAL_LEAVE_BALANCES.casualLeave,
          specialLeave: data.specialLeave ?? INITIAL_LEAVE_BALANCES.specialLeave,
          workFromHome: data.workFromHome ?? INITIAL_LEAVE_BALANCES.workFromHome,
          lossOfPay: data.lossOfPay ?? INITIAL_LEAVE_BALANCES.lossOfPay,
        });
      },
      (error) => {
        console.error('Unable to load leave balance:', error);
        setLeaveBalances(INITIAL_LEAVE_BALANCES);
      }
    );
  }, [selectedMemberId]);

  // Admin and HR Manager see all pending requests from leave_applied and regulization_applied arrays.
  useEffect(() => {
    if (!canManageLeaveBalances) {
      setPendingRequests([]);
      return undefined;
    }

    return onSnapshot(
      collection(db, 'leave'),
      (snapshot) => {
        const allRequests = [];
        snapshot.docs.forEach((leaveDoc) => {
          const leaveData = leaveDoc.data();
          const employeeEmail = leaveData.email || leaveData.userEmail || decodeEmail(leaveDoc.id);
          const employeeName = leaveData.name || leaveData.fullName || leaveData.employeeName || employeeEmail;
          const leaveApplied = Array.isArray(leaveData.leave_applied) ? leaveData.leave_applied : [];
          const regularizationApplied = Array.isArray(leaveData.regulization_applied) ? leaveData.regulization_applied : [];

          leaveApplied.filter(isPendingRequest).forEach((request, index) => {
            allRequests.push({ id: `${leaveDoc.id}-leave-${index}`, category: 'Leave', employeeEmail, employeeName, request });
          });
          regularizationApplied.filter(isPendingRequest).forEach((request, index) => {
            allRequests.push({ id: `${leaveDoc.id}-regularization-${index}`, category: 'Regularization', employeeEmail, employeeName, request });
          });
        });
        setPendingRequests(allRequests);
      },
      (error) => {
        console.error('Unable to load pending requests:', error);
        setPendingRequests([]);
      }
    );
  }, [canManageLeaveBalances]);

  // Swipes: users/{email} -> attendanceIds -> attendance/{id}.dates -> { date: { first_join_time, last_leave_time } }.
  useEffect(() => {
    if (!currentUserEncodedEmail) {
      setAttendanceByDate({});
      return undefined;
    }

    const attendanceData = new Map(); // attendanceId -> { dateKey: { first_join_time, last_leave_time } }
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

    // 1) Watch the user's document to get attendanceIds.
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
          // attendanceIds stored as a map (e.g. { "851708656902471691": true })
          attendanceIds = Object.keys(rawIds);
        } else if (rawIds) {
          // single id
          attendanceIds = [rawIds];
        }
        // Firestore may return these as numbers (int64) — always coerce to string,
        // since these snowflake-style ids exceed JS safe integer precision.
        attendanceIds = attendanceIds.map((id) => String(id).trim()).filter(Boolean);

        if (attendanceIds.length === 0) {
          console.warn('No attendanceIds found on user document:', userSnapshot.data());
          setAttendanceByDate({});
          return;
        }

        // 2) Watch each attendance document and map dates -> { first_join_time, last_leave_time }.
        attendanceUnsubs = attendanceIds.map((attendanceId) =>
          onSnapshot(
            doc(db, 'attendance', attendanceId),
            (attendanceSnapshot) => {
              if (disposed) return;
              if (!attendanceSnapshot.exists()) {
                attendanceData.delete(attendanceId);
              } else {
                const dates = attendanceSnapshot.data().dates || {};
                console.log(`[Swipes] attendance/${attendanceId} dates:`, dates);
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

  const handleDateSelect = (info) => {
    setSelectedDate(info.startStr);
  };

  const openHolidayEditor = (holiday = null, index = null) => {
    setEditingHolidayIndex(index);
    setHolidayDraft(holiday ? {
      name: holiday.name || '', startDate: holiday.startDate || '', endDate: holiday.endDate || '', dateLabel: holiday.dateLabel || holiday.date || '',
    } : { name: '', startDate: '', endDate: '', dateLabel: '' });
    setHolidayModalOpen(true);
  };

  const closeHolidayEditor = () => {
    setHolidayModalOpen(false);
    setEditingHolidayIndex(null);
    setHolidayDraft({ name: '', startDate: '', endDate: '', dateLabel: '' });
  };

  const saveHoliday = () => {
    const name = holidayDraft.name.trim();
    const startDate = holidayDraft.startDate.trim();
    const endDate = holidayDraft.endDate.trim();
    const hasRange = Boolean(startDate || endDate);
    if (!name || (hasRange && (!startDate || !endDate))) return;

    const dateLabel = holidayDraft.dateLabel.trim() || (hasRange ? `${startDate} to ${endDate}` : '');
    if (!dateLabel) return;

    const newHoliday = {
      id: editingHolidayIndex === null ? String(Date.now()) : holidays[editingHolidayIndex]?.id,
      name, date: dateLabel, dateLabel, startDate, endDate,
    };
    setHolidays((previous) => editingHolidayIndex === null
      ? [...previous, newHoliday]
      : previous.map((holiday, index) => (index === editingHolidayIndex ? newHoliday : holiday)));
    closeHolidayEditor();
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
      `}</style>

      <div className="min-h-screen w-full bg-slate-100 p-3 sm:p-4 lg:p-5">
        <div className="mb-3 flex justify-end lg:hidden">
          <button onClick={() => setSideOpen((open) => !open)} className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600">
            {sideOpen ? 'Hide Panel' : 'Leave & Holidays'}
          </button>
        </div>

        <div className="flex w-full flex-col gap-4 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Schedule</span>
                <button onClick={() => calRef.current?.getApi().today()} className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-100">Today</button>
              </div>
              <FullCalendar ref={calRef} plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" selectable select={handleDateSelect} unselectAuto={false} height="auto" handleWindowResize headerToolbar={{ left: 'prev', center: 'title', right: 'next' }} />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <button className="flex w-full items-center justify-between" onClick={() => setLegendOpen((open) => !open)}>
                <span className="text-sm font-semibold text-slate-800">Legends</span>
                <span className={`text-slate-400 transition-transform ${legendOpen ? 'rotate-180' : ''}`}>⌄</span>
              </button>
              {legendOpen && <div className="mt-3"><div className="mb-3 grid grid-cols-3 gap-x-3 gap-y-2 sm:grid-cols-5">{LEGEND_ITEMS.map((item) => <LegendDot key={item.label} {...item} />)}</div><div className="border-t border-slate-100 pt-3"><span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">Day Type</span><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">{DAY_TYPES.map((type) => <span key={type} className="text-[11px] text-slate-500">{type}</span>)}</div></div></div>}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <button className="flex w-full items-center justify-between" onClick={() => setSwipesOpen((open) => !open)}><span className="text-sm font-semibold text-slate-800">Swipes</span><span className={`text-slate-400 transition-transform ${swipesOpen ? 'rotate-180' : ''}`}>⌄</span></button>
              {swipesOpen && (
                <div className="mt-3">
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
                </div>
              )}
            </div>
          </div>

          <aside className={`w-full flex-shrink-0 flex-col gap-4 lg:flex lg:w-64 xl:w-72 ${sideOpen ? 'flex' : 'hidden'}`}>
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

            {canManageLeaveBalances && <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="text-[15px] font-bold tracking-tight text-slate-800">Pending Requests</h2><p className="mt-0.5 text-[10px] text-slate-400">Leave & regularization requests</p></div><span className="rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-600">{pendingRequests.length} Pending</span></div>
              <div className="max-h-72 overflow-y-auto pr-1">{pendingRequests.length === 0 ? <div className="rounded-xl bg-slate-50 px-3 py-5 text-center"><p className="text-[11px] font-medium text-slate-500">No pending requests</p></div> : <div className="flex flex-col gap-2">{pendingRequests.map((item) => { const request = item.request; const requestType = request.leaveType || request.leave_type || request.type || request.permissionType || item.category; const fromDate = request.fromDate || request.from_date || request.startDate || request.date || ''; const toDate = request.toDate || request.to_date || request.endDate || ''; return <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-slate-700">{item.employeeName}</p><p className="truncate text-[10px] text-slate-400">{item.employeeEmail}</p></div><span className="flex-shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">{item.category}</span></div><div className="mt-2 flex items-center justify-between gap-2 text-[10px]"><span className="truncate font-medium text-slate-500">{requestType}</span>{(fromDate || toDate) && <span className="flex-shrink-0 text-slate-400">{fromDate}{toDate && toDate !== fromDate ? ` → ${toDate}` : ''}</span>}</div></div>; })}</div>}</div>
            </div>}

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="text-sm font-semibold text-slate-800">Holiday list</span><span className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-600">2025–26</span></div>{canManageHolidays && <button type="button" onClick={() => openHolidayEditor()} className="rounded-lg border border-blue-100 bg-blue-50 p-1.5 text-blue-600 transition-colors hover:bg-blue-100" title="Add holiday"><Pencil className="h-3.5 w-3.5" /></button>}</div><div className="flex flex-col gap-2.5">{holidays.map((holiday, index) => <div key={`${holiday.id}-${index}`} className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-300" /><span className="truncate text-[12px] font-medium text-slate-600">{holiday.name}</span></div><div className="flex flex-shrink-0 items-center gap-2"><span className="text-[11px] text-slate-400">{holiday.date}</span>{canManageHolidays && <button type="button" onClick={() => openHolidayEditor(holiday, index)} className="text-slate-400 hover:text-blue-600" title="Edit holiday"><Pencil className="h-3.5 w-3.5" /></button>}</div></div>)}</div></div>
            <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-4 text-white shadow-sm"><p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-blue-200">This Month</p><div className="grid grid-cols-2 gap-3">{[{ label: 'Working Days', value: '22' }, { label: 'Present Days', value: '18' }, { label: 'Absent Days', value: '2' }, { label: 'Late Arrivals', value: '3' }].map((stat) => <div key={stat.label} className="rounded-xl bg-white/10 p-2.5"><p className="text-xl font-bold leading-tight">{stat.value}</p><p className="mt-0.5 text-[10px] text-blue-200">{stat.label}</p></div>)}</div></div>
          </aside>
        </div>
      </div>

      {holidayModalOpen && canManageHolidays && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={(event) => event.target === event.currentTarget && closeHolidayEditor()}><div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-xl"><div className="mb-1 flex items-start justify-between"><h3 className="text-[15px] font-bold text-slate-800">{editingHolidayIndex === null ? 'Add Holiday' : 'Edit Holiday'}</h3><button onClick={closeHolidayEditor} className="text-slate-400 hover:text-slate-600">✕</button></div><p className="mb-4 text-[11px] text-slate-400">Use a single date or a date range for the holiday entry.</p><div className="space-y-3"><input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-blue-400" placeholder="Holiday name" value={holidayDraft.name} onChange={(event) => setHolidayDraft((old) => ({ ...old, name: event.target.value }))} autoFocus /><input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-blue-400" placeholder="Start date (YYYY-MM-DD)" value={holidayDraft.startDate} onChange={(event) => setHolidayDraft((old) => ({ ...old, startDate: event.target.value }))} /><input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-blue-400" placeholder="End date (YYYY-MM-DD)" value={holidayDraft.endDate} onChange={(event) => setHolidayDraft((old) => ({ ...old, endDate: event.target.value }))} /><input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] outline-none focus:border-blue-400" placeholder="Display label (optional)" value={holidayDraft.dateLabel} onChange={(event) => setHolidayDraft((old) => ({ ...old, dateLabel: event.target.value }))} onKeyDown={(event) => event.key === 'Enter' && saveHoliday()} /></div><div className="mt-4 flex justify-end gap-2"><button onClick={closeHolidayEditor} className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-500">Cancel</button><button onClick={saveHoliday} className="rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white">Save Holiday</button></div></div></div>}

      <LeaveBalanceEditorModal isOpen={leaveEditorOpen} onClose={() => setLeaveEditorOpen(false)} currentUserEmail={selectedMember?.email || decodeEmail(selectedMemberId)} />
    </>
  );
}