import React, { useRef, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';

const LeaveCard = ({ label, total, consumed, accent }) => (
  <div className={`rounded-xl p-3 border ${accent ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'} flex flex-col gap-0.5`}>
    <p className="text-[10px] text-slate-400 font-medium leading-tight">{label}</p>
    <p className="text-2xl font-bold text-slate-800 leading-tight">{total}</p>
    <p className="text-[10px] text-slate-300">Consumed: {consumed}</p>
  </div>
);

const LegendDot = ({ bg, label }) => (
  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
    <span className="w-2.5 h-2.5 rounded-[3px] flex-shrink-0 inline-block" style={{ background: bg }} />
    {label}
  </div>
);

const PALETTE = [
  { backgroundColor: '#dbeafe', borderColor: '#93c5fd', textColor: '#1e40af' },
  { backgroundColor: '#dcfce7', borderColor: '#86efac', textColor: '#14532d' },
  { backgroundColor: '#fef9c3', borderColor: '#fde047', textColor: '#713f12' },
  { backgroundColor: '#fee2e2', borderColor: '#fca5a5', textColor: '#7f1d1d' },
  { backgroundColor: '#ede9fe', borderColor: '#c4b5fd', textColor: '#4c1d95' },
];

const LEAVE_CARDS = [
  { label: 'Planned Leave',  total: 3, consumed: 0 },
  { label: 'Sick Leave',     total: 3, consumed: 0, accent: true },
  { label: 'Casual Leave',   total: 3, consumed: 0 },
  { label: 'Special Leave',  total: 0, consumed: 0 },
  { label: 'Work From Home', total: 3, consumed: 0, accent: true },
  { label: 'Loss of Pay',    total: 0, consumed: 0 },
];

const LEGEND_ITEMS = [
  { bg: '#4ade80', label: 'Present' },        { bg: '#f87171', label: 'Absent' },
  { bg: '#94a3b8', label: 'Off Day' },        { bg: '#60a5fa', label: 'Rest Day' },
  { bg: '#fb923c', label: 'Leave' },          { bg: '#facc15', label: 'On Duty' },
  { bg: '#f472b6', label: 'Holiday' },        { bg: '#fde047', label: 'Alert/Deduction' },
  { bg: '#ef4444', label: 'Deduction' },      { bg: '#a78bfa', label: 'Status Unknown' },
  { bg: '#2563eb', label: 'Overtime' },       { bg: '#16a34a', label: 'Override' },
  { bg: '#86efac', label: 'Permission' },     { bg: '#cbd5e1', label: 'Ignored' },
  { bg: '#2dd4bf', label: 'Grace' },
];

const DAY_TYPES = ['🛌 Rest Day', '📅 Off Day', '🌴 Holiday', '🌓 Half Day', '🏭 Plant Shutdown'];

const HOLIDAYS = [
  { id: '1', name: 'Republic Day', date: 'Mon, 26 January', dateLabel: 'Mon, 26 January', startDate: '', endDate: '' },
  { id: '2', name: 'Holi',         date: 'Wed, 4 March',    dateLabel: 'Wed, 4 March',    startDate: '', endDate: '' },
  { id: '3', name: 'Good Friday',  date: 'Fri, 18 April',   dateLabel: 'Fri, 18 April',   startDate: '', endDate: '' },
  { id: '4', name: 'Eid ul-Fitr',  date: 'Mon, 31 March',   dateLabel: 'Mon, 31 March',   startDate: '', endDate: '' },
];

const INITIAL_EVENTS = [
  { id: '1',  title: "Groomer's appt.",       date: '2025-07-01', backgroundColor: '#dbeafe', borderColor: '#93c5fd', textColor: '#1e40af' },
  { id: '2',  title: 'Meeting w/ Chris',       date: '2025-07-03', backgroundColor: '#fef9c3', borderColor: '#fde047', textColor: '#713f12' },
  { id: '3',  title: 'Lunch w/ Mom',           date: '2025-07-05', backgroundColor: '#dcfce7', borderColor: '#86efac', textColor: '#14532d' },
  { id: '4',  title: 'Financial Advisor Meet', date: '2025-07-07', backgroundColor: '#fee2e2', borderColor: '#fca5a5', textColor: '#7f1d1d' },
  { id: '5',  title: 'Interview w/ Figma',     date: '2025-07-08', backgroundColor: '#ede9fe', borderColor: '#c4b5fd', textColor: '#4c1d95' },
  { id: '6',  title: 'Send follow-up email!',  date: '2025-07-08', backgroundColor: '#ffedd5', borderColor: '#fdba74', textColor: '#7c2d12' },
  { id: '7',  title: "Ashley's Choir Recital", date: '2025-07-12', backgroundColor: '#cffafe', borderColor: '#67e8f9', textColor: '#164e63' },
  { id: '8',  title: 'Budget for next month',  date: '2025-07-14', backgroundColor: '#fef9c3', borderColor: '#fde047', textColor: '#713f12' },
  { id: '9',  title: 'Vaccine appt.',          date: '2025-07-14', backgroundColor: '#dcfce7', borderColor: '#86efac', textColor: '#14532d' },
  { id: '10', title: "St. Patrick's Day",      date: '2025-07-17', backgroundColor: '#dcfce7', borderColor: '#4ade80', textColor: '#14532d' },
  { id: '11', title: 'DMV appointment',        date: '2025-07-17', backgroundColor: '#fef9c3', borderColor: '#fde047', textColor: '#713f12' },
  { id: '12', title: 'PTO day',                date: '2025-07-18', backgroundColor: '#fee2e2', borderColor: '#fca5a5', textColor: '#7f1d1d' },
  { id: '13', title: 'Dinner with Kate',       date: '2025-07-20', backgroundColor: '#ede9fe', borderColor: '#c4b5fd', textColor: '#4c1d95' },
  { id: '14', title: 'Important work meeting', date: '2025-07-22', backgroundColor: '#dbeafe', borderColor: '#93c5fd', textColor: '#1e40af' },
  { id: '15', title: 'Costco trip',            date: '2025-07-22', backgroundColor: '#ffedd5', borderColor: '#fdba74', textColor: '#7c2d12' },
  { id: '16', title: 'Fly to Japan',           date: '2025-07-25', backgroundColor: '#cffafe', borderColor: '#67e8f9', textColor: '#164e63' },
  { id: '17', title: 'Hot dog eating contest', date: '2025-07-26', backgroundColor: '#fef9c3', borderColor: '#fde047', textColor: '#713f12' },
  { id: '18', title: 'Meeting w/ architect',   date: '2025-07-26', backgroundColor: '#ede9fe', borderColor: '#c4b5fd', textColor: '#4c1d95' },
  { id: '19', title: 'Movie date night',       date: '2025-07-26', backgroundColor: '#fee2e2', borderColor: '#fca5a5', textColor: '#7f1d1d' },
  { id: '20', title: 'Meeting w/ Mac',         date: '2025-07-27', backgroundColor: '#dcfce7', borderColor: '#86efac', textColor: '#14532d' },
  { id: '21', title: 'Radiohead concert',      date: '2025-07-29', backgroundColor: '#ede9fe', borderColor: '#c4b5fd', textColor: '#4c1d95' },
  { id: '22', title: 'Learn something new',    date: '2025-07-31', backgroundColor: '#cffafe', borderColor: '#67e8f9', textColor: '#164e63' },
];

export default function Calender() {
  const calRef = useRef();
  const [events, setEvents]         = useState(INITIAL_EVENTS);
  const [showModal, setShowModal]   = useState(false);
  const [newDate, setNewDate]       = useState('');
  const [newTitle, setNewTitle]     = useState('');
  const [legendOpen, setLegendOpen] = useState(true);
  const [swipesOpen, setSwipesOpen] = useState(true);
  const [sideOpen, setSideOpen]     = useState(false); // mobile sidebar toggle
  const [holidays, setHolidays]     = useState(HOLIDAYS);
  const [holidayModalOpen, setHolidayModalOpen] = useState(false);
  const [holidayDraft, setHolidayDraft] = useState({ name: '', startDate: '', endDate: '', dateLabel: '' });
  const [editingHolidayIndex, setEditingHolidayIndex] = useState(null);

  // Frontend-only: everyone can manage holidays (no RBAC)
  const canManageHolidays = true;

  useEffect(() => {
    const t = setTimeout(() => calRef.current?.getApi().updateSize(), 250);
    return () => clearTimeout(t);
  }, []);

  const handleDateClick = (arg) => { setNewDate(arg.dateStr); setNewTitle(''); setShowModal(true); };
  const handleEventDrop = (info) =>
    setEvents(prev => prev.map(e => e.id === info.event.id ? { ...e, date: info.event.startStr } : e));
  const handleAdd = () => {
    if (!newTitle.trim()) return;
    const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    setEvents(prev => [...prev, { id: String(Date.now()), title: newTitle, date: newDate, ...c }]);
    setShowModal(false);
  };

  const openHolidayEditor = (holiday = null, index = null) => {
    setEditingHolidayIndex(index);
    setHolidayDraft(holiday ? {
      name: holiday.name || '',
      startDate: holiday.startDate || '',
      endDate: holiday.endDate || '',
      dateLabel: holiday.dateLabel || holiday.date || '',
    } : { name: '', startDate: '', endDate: '', dateLabel: '' });
    setHolidayModalOpen(true);
  };

  const saveHoliday = () => {
    if (!holidayDraft.name.trim()) return;

    const hasRange = Boolean(holidayDraft.startDate.trim() || holidayDraft.endDate.trim());
    if (hasRange && (!holidayDraft.startDate.trim() || !holidayDraft.endDate.trim())) return;

    const dateLabel = holidayDraft.dateLabel.trim() || (hasRange
      ? `${holidayDraft.startDate.trim()} to ${holidayDraft.endDate.trim()}`
      : '');

    if (!dateLabel) return;

    const newHoliday = {
      id: editingHolidayIndex === null ? String(Date.now()) : holidays[editingHolidayIndex]?.id,
      name: holidayDraft.name.trim(),
      date: dateLabel,
      dateLabel,
      startDate: holidayDraft.startDate.trim(),
      endDate: holidayDraft.endDate.trim(),
    };

    setHolidays((prev) => {
      if (editingHolidayIndex === null) {
        return [...prev, newHoliday];
      }

      return prev.map((holiday, index) => (
        index === editingHolidayIndex ? newHoliday : holiday
      ));
    });

    setHolidayModalOpen(false);
    setHolidayDraft({ name: '', startDate: '', endDate: '', dateLabel: '' });
    setEditingHolidayIndex(null);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .fc { font-family: 'DM Sans', sans-serif !important; font-size: 12px; }
        .fc-toolbar-title { font-size: 15px !important; font-weight: 700 !important; color: #1e293b !important; }
        .fc-button { font-family: 'DM Sans', sans-serif !important; font-size: 11px !important; font-weight: 600 !important; padding: 5px 10px !important; border-radius: 8px !important; background: #ffffff !important; border: 1px solid #e2e8f0 !important; color: #64748b !important; box-shadow: none !important; text-transform: capitalize !important; }
        .fc-button:hover { background: #f8fafc !important; }
        .fc-button:focus { box-shadow: none !important; }
        .fc-today-button { background: #eff6ff !important; border-color: #bfdbfe !important; color: #2563eb !important; }
        .fc-col-header-cell-cushion { font-size: 10px !important; font-weight: 600 !important; color: #94a3b8 !important; text-transform: uppercase !important; letter-spacing: 0.6px !important; text-decoration: none !important; }
        .fc-daygrid-day-number { font-size: 11px !important; color: #94a3b8 !important; padding: 4px 6px !important; text-decoration: none !important; }
        .fc-daygrid-day.fc-day-today { background: #f0f9ff !important; }
        .fc-daygrid-day.fc-day-today .fc-daygrid-day-number { background: #2563eb !important; color: #fff !important; border-radius: 50% !important; width: 22px !important; height: 22px !important; display: flex !important; align-items: center !important; justify-content: center !important; font-size: 10px !important; font-weight: 700 !important; }
        .fc-event { border-radius: 5px !important; padding: 1px 5px !important; font-size: 10px !important; font-weight: 500 !important; cursor: grab !important; }
        .fc-event:active { cursor: grabbing !important; }
        .fc-event-title { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
        .fc-scrollgrid { border: none !important; }
        .fc-scrollgrid td, .fc-scrollgrid th { border-color: #f1f5f9 !important; }
        .fc-daygrid-day-frame { min-height: 72px !important; }
        .fc-toolbar.fc-header-toolbar { margin-bottom: 12px !important; }
        .fc-more-link { font-size: 10px !important; color: #2563eb !important; font-weight: 600 !important; text-decoration: none !important; }
        .fc-popover { border-radius: 12px !important; border: 1px solid #e2e8f0 !important; box-shadow: 0 8px 30px rgba(0,0,0,0.10) !important; }
        .fc-popover-header { background: #f8fafc !important; border-radius: 12px 12px 0 0 !important; font-size: 11px !important; font-weight: 600 !important; color: #475569 !important; padding: 8px 12px !important; }
        .fc-h-event .fc-event-main { padding: 0 !important; }
      `}</style>

      <div className="min-h-screen w-full bg-slate-100 p-3 sm:p-4 lg:p-5">

        {/* Mobile: sidebar toggle */}
        <div className="flex lg:hidden justify-end mb-3">
          <button
            onClick={() => setSideOpen(p => !p)}
            className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            {sideOpen ? 'Hide Panel' : 'Leave & Holidays'}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 w-full">

          {/* ─── LEFT: Calendar + Legends + Swipes ─── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Calendar Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Schedule</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-100 transition-colors">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Notes
                  </button>
                  <button
                    onClick={() => calRef.current?.getApi().today()}
                    className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 hover:bg-blue-100 transition-colors"
                  >
                    Today
                  </button>
                </div>
              </div>
              <FullCalendar
                ref={calRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                editable={true}
                dateClick={handleDateClick}
                eventDrop={handleEventDrop}
                events={events}
                height="auto"
                handleWindowResize={true}
                dayMaxEvents={3}
                headerToolbar={{ left: 'prev', center: 'title', right: 'next' }}
              />
            </div>

            {/* Legends Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <button
                className="w-full flex items-center justify-between mb-0"
                onClick={() => setLegendOpen(p => !p)}
              >
                <span className="text-sm font-semibold text-slate-800">Legends</span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${legendOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {legendOpen && (
                <div className="mt-3">
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-x-3 gap-y-2 mb-3">
                    {LEGEND_ITEMS.map(d => <LegendDot key={d.label} bg={d.bg} label={d.label} />)}
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">Day Type</span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                      {DAY_TYPES.map(d => (
                        <span key={d} className="text-[11px] text-slate-500">{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Swipes Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <button
                className="w-full flex items-center justify-between"
                onClick={() => setSwipesOpen(p => !p)}
              >
                <span className="text-sm font-semibold text-slate-800">Swipes</span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${swipesOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {swipesOpen && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs min-w-[320px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Swipe Time', 'Location', 'Info'].map(h => (
                          <th key={h} className="text-left pb-2 text-[11px] font-medium text-slate-400 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-slate-800 text-xs">10:00:41 am</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">16 Apr 2026</p>
                        </td>
                        <td className="py-3 pr-4 text-slate-500 text-xs">JJA1240500316</td>
                        <td className="py-3">
                          <button className="flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                            Info
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* ─── RIGHT: Leave Balance + Holidays ─── */}
          <div className={`
            w-full lg:w-64 xl:w-72 flex-shrink-0 flex flex-col gap-4
            ${sideOpen ? 'flex' : 'hidden lg:flex'}
          `}>

            {/* Leave Balance */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h2 className="text-[15px] font-bold text-slate-800 text-center mb-4 tracking-tight">Leave Balance</h2>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {LEAVE_CARDS.map(c => <LeaveCard key={c.label} {...c} />)}
              </div>

              <div className="flex flex-col gap-2">
                <Link to="/leaveApply">
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold rounded-xl py-2.5 transition-colors">
                    Apply Leave
                  </button>
                </Link>
                <Link to="/RegularizationApply">
                  <button className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 text-[11px] font-semibold rounded-xl py-2.5 transition-colors leading-tight text-center">
                    Regularization &amp; Permission
                  </button>
                </Link>
              </div>
            </div>

            {/* Holiday List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">Holiday list</span>
                  <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 rounded-lg px-2 py-1">
                    2025–26
                  </span>
                </div>
                {canManageHolidays && (
                  <button
                    type="button"
                    onClick={() => openHolidayEditor()}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 hover:bg-blue-100 transition-colors"
                    title="Add holiday"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                {holidays.map((h, index) => (
                  <div key={`${h.id}-${index}`} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-300 flex-shrink-0" />
                      <span className="text-[12px] text-slate-600 font-medium">{h.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-slate-400">{h.date}</span>
                      {canManageHolidays && (
                        <button
                          type="button"
                          onClick={() => openHolidayEditor(h, index)}
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                          title="Edit holiday"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200 mb-3">This Month</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Working Days', value: '22' },
                  { label: 'Present Days', value: '18' },
                  { label: 'Absent Days',  value: '2'  },
                  { label: 'Late Arrivals', value: '3' },
                ].map(s => (
                  <div key={s.label} className="bg-white/10 rounded-xl p-2.5">
                    <p className="text-xl font-bold leading-tight">{s.value}</p>
                    <p className="text-[10px] text-blue-200 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ─── Add Event Modal ─── */}
      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-[15px] font-bold text-slate-800">Add Event</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">📅 {newDate}</p>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-slate-300"
              placeholder="Event title…"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="text-[12px] font-semibold text-slate-500 border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="text-[12px] font-semibold text-white bg-blue-600 rounded-xl px-4 py-2 hover:bg-blue-700 transition-colors"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Holiday Modal ─── */}
      {holidayModalOpen && canManageHolidays && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setHolidayModalOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-[15px] font-bold text-slate-800">
                {editingHolidayIndex === null ? 'Add Holiday' : 'Edit Holiday'}
              </h3>
              <button
                onClick={() => setHolidayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">Use a single date or a date range for the holiday entry.</p>
            <div className="space-y-3">
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-slate-300"
                placeholder="Holiday name"
                value={holidayDraft.name}
                onChange={(e) => setHolidayDraft((prev) => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-slate-300"
                placeholder="Start date (YYYY-MM-DD)"
                value={holidayDraft.startDate}
                onChange={(e) => setHolidayDraft((prev) => ({ ...prev, startDate: e.target.value }))}
              />
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-slate-300"
                placeholder="End date (YYYY-MM-DD, leave blank for single day)"
                value={holidayDraft.endDate}
                onChange={(e) => setHolidayDraft((prev) => ({ ...prev, endDate: e.target.value }))}
              />
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-slate-300"
                placeholder="Display label (optional)"
                value={holidayDraft.dateLabel}
                onChange={(e) => setHolidayDraft((prev) => ({ ...prev, dateLabel: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && saveHoliday()}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setHolidayModalOpen(false)}
                className="text-[12px] font-semibold text-slate-500 border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveHoliday}
                className="text-[12px] font-semibold text-white bg-blue-600 rounded-xl px-4 py-2 hover:bg-blue-700 transition-colors"
              >
                Save Holiday
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}