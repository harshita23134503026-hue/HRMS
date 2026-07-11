import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Table as TableIcon,
  Plus,
} from 'lucide-react';

const TimeSheet = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1));
  const [activeView, setActiveView] = useState('Month');
  const [activeTopTab, setActiveTopTab] = useState('Calendar View');

  const today = new Date(2026, 6, 10);

  const taskData = {
    '2026-6-29': { tasks: 0, hours: '0h', calls: 3, duration: '45m', status: 'red' },
    '2026-6-30': { tasks: 0, hours: '0h', calls: 1, duration: '3m', status: 'red' },
    '2026-6-1':  { tasks: 3, hours: '6h 40m', calls: 0, duration: '0h', status: 'green' },
    '2026-6-2':  { tasks: 1, hours: '8h 20m', calls: 1, duration: '4m', status: 'green' },
    '2026-6-3':  { tasks: 2, hours: '5h 20m', calls: 1, duration: '1h 3m 51s', status: 'red' },
    '2026-6-6':  { tasks: 2, hours: '8h', calls: 10, duration: '58m', status: 'green' },
    '2026-6-7':  { tasks: 2, hours: '5h 20m', calls: 2, duration: '1h 19m 13s', status: 'green' },
    '2026-6-8':  { tasks: 3, hours: '6h 50m', calls: 2, duration: '0h', status: 'red' },
    '2026-6-9':  { tasks: 0, hours: '0h', calls: 1, duration: '41s', status: 'red' },
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const weeks = useMemo(() => {
    const cells = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      cells.push({ day, month: prevMonth, year: prevYear, type: 'prev' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, month, year, type: 'current' });
    }
    const remainder = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remainder; d++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      cells.push({ day: d, month: nextMonth, year: nextYear, type: 'next' });
    }
    const result = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }
    return result;
  }, [year, month, firstDayIndex, daysInMonth, daysInPrevMonth]);

  const getKey = (cell) => `${cell.year}-${cell.month}-${cell.day}`;
  const getDateStr = (cell) =>
    `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;

  const isToday = (cell) =>
    cell.year === today.getFullYear() &&
    cell.month === today.getMonth() &&
    cell.day === today.getDate();

  const goToday = () => setCurrentDate(new Date(today));
  const goBack = () => setCurrentDate(new Date(year, month - 1, 1));
  const goNext = () => setCurrentDate(new Date(year, month + 1, 1));

  const getCellStyles = (cell, data) => {
    if (isToday(cell)) return { border: 'border-blue-500', bg: 'bg-white' };
    if (!data) return { border: 'border-gray-200', bg: 'bg-white' };
    if (data.status === 'green') return { border: 'border-green-500', bg: 'bg-green-50' };
    if (data.status === 'red') return { border: 'border-red-400', bg: 'bg-red-50' };
    return { border: 'border-gray-200', bg: 'bg-white' };
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  /* -------- Navigation Handlers -------- */

  // Clicking cell -> open popup (modal route), preserving background location
  const handleCellClick = (cell) => {
    const dateStr = getDateStr(cell);
    navigate(`/day/${dateStr}`, {
      state: { backgroundLocation: location },
    });
  };

  // Clicking "+" -> navigate to full "Add Task" page for that date
  const handleAddClick = (e, cell) => {
    e.stopPropagation(); // Prevent triggering cell click
    const dateStr = getDateStr(cell);
    navigate(`/task/new/${dateStr}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-[1200px] mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* ===== TOP HEADER ===== */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:px-6 border-b border-gray-100">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTopTab('Calendar View')}
              className={`flex items-center gap-2 text-sm font-medium pb-1 border-b-2 transition ${
                activeTopTab === 'Calendar View'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <CalendarIcon size={16} />
              Calendar View
            </button>
            <button
              onClick={() => setActiveTopTab('Table View')}
              className={`flex items-center gap-2 text-sm font-medium pb-1 border-b-2 transition ${
                activeTopTab === 'Table View'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <TableIcon size={16} />
              Table View
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="border border-gray-200 rounded-xl px-4 py-2 text-center min-w-[130px]">
              <div className="text-xs font-medium text-gray-500">Total Task Hours</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">40h 30m</div>
            </div>
            <div className="border border-gray-200 rounded-xl px-4 py-2 text-center min-w-[140px]">
              <div className="text-xs font-medium text-gray-500">Total Teams Duration</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">3h 26m</div>
            </div>
          </div>

          <button
            onClick={() => navigate('/task/new/new')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition whitespace-nowrap"
          >
            <Plus size={16} />
            Add New Task
          </button>
        </div>

        {/* ===== SUB HEADER ===== */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:px-6">
          <div className="flex items-center gap-2">
            <button onClick={goToday} className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition">Today</button>
            <button onClick={goBack} className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition">Back</button>
            <button onClick={goNext} className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition">Next</button>
          </div>

          <h2 className="text-lg font-bold text-gray-900 order-first md:order-none">
            {monthName} {year}
          </h2>

          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {['Month', 'Week', 'Day', 'Agenda'].map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${
                  activeView === view ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {/* ===== CALENDAR GRID ===== */}
        <div className="px-2 pb-2 md:px-4 md:pb-4 overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 border-t border-l border-gray-200">
              {weekDays.map((d) => (
                <div key={d} className="text-center text-sm font-semibold text-gray-700 py-3 border-r border-b border-gray-200 bg-gray-50">
                  {d}
                </div>
              ))}
            </div>

            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-7 border-l border-gray-200">
                {week.map((cell, cIdx) => {
                  const key = getKey(cell);
                  const data = taskData[key];
                  const styles = getCellStyles(cell, data);
                  const isFaded = cell.type !== 'current';
                  const todayFlag = isToday(cell);

                  return (
                    <div
                      key={cIdx}
                      onClick={() => handleCellClick(cell)}
                      className={`relative h-[110px] p-2 border-r border-b ${styles.border} ${styles.bg} ${
                        isFaded ? 'opacity-50' : ''
                      } group cursor-pointer hover:shadow-inner transition`}
                    >
                      {/* Day Number */}
                      <div className={`text-sm font-medium ${isFaded ? 'text-gray-400' : 'text-gray-800'}`}>
                        {cell.day}
                      </div>

                      {/* Today Badge */}
                      {todayFlag && (
                        <span className="inline-block bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded mt-1">
                          Today
                        </span>
                      )}

                      {/* Task Info */}
                      {data && !todayFlag && (
                        <div className="absolute top-2 right-2 text-right space-y-0.5">
                          <div className="text-[11px] font-semibold text-blue-600">Task: {data.tasks}</div>
                          <div className="text-[10px] text-gray-500">{data.hours}</div>
                          <div className="text-[10px] text-gray-500">Calls: {data.calls}</div>
                          <div className="text-[10px] text-gray-500">Duration: {data.duration}</div>
                        </div>
                      )}

                      {/* Plus Button - appears on hover, bottom-right corner */}
                      <button
                        onClick={(e) => handleAddClick(e, cell)}
                        className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-blue-700 hover:scale-110 transition-all shadow-md"
                        title="Add task on this day"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeSheet;