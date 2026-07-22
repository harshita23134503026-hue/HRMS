import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Table as TableIcon,
  Plus,
  Search,
  Users,
} from 'lucide-react';

import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

// ─── Date Helpers ───


const getStartOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const isSameDate = (firstDate, secondDate) =>
  firstDate.getFullYear() === secondDate.getFullYear() &&
  firstDate.getMonth() === secondDate.getMonth() &&
  firstDate.getDate() === secondDate.getDate();

// ─── Duration Helpers ───

const durationToMinutes = (duration) => {
  if (!duration || typeof duration !== 'string') {
    return 0;
  }

  const hoursMatch = duration.match(/(\d+)\s*h/i);
  const minutesMatch = duration.match(/(\d+)\s*m/i);

  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;

  return hours * 60 + minutes;
};

const formatDuration = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
};

// ─── Role / Employee Helpers ───

const normalizeRole = (role = '') =>
  String(role)
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .trim();

const isAdminOrSrProjectManager = (role) => {
  const normalizedRole = normalizeRole(role);

  return (
    normalizedRole === 'admin' ||
    normalizedRole === 'sr project manager' ||
    normalizedRole === 'srprojectmanager'
  );
};

const getEmployeeName = (employeeData = {}, fallback = 'Employee') => {
  const fullName = [
    employeeData.firstName,
    employeeData.lastName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    employeeData.displayName ||
    employeeData.name ||
    fullName ||
    employeeData.email ||
    fallback
  );
};

// ─── Main Component ───

const TimeSheet = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [activeView, setActiveView] = useState('Month');
  const [activeTopTab, setActiveTopTab] = useState('Calendar View');

  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('employee');

  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isEmployeePickerOpen, setIsEmployeePickerOpen] = useState(false);
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(false);

  const [timesheetEntries, setTimesheetEntries] = useState({});
  const [isTimesheetLoading, setIsTimesheetLoading] = useState(true);
  const [timesheetError, setTimesheetError] = useState('');

  const today = useMemo(() => getStartOfDay(new Date()), []);

  const yesterday = useMemo(() => {
    const previousDay = new Date(today);
    previousDay.setDate(previousDay.getDate() - 1);

    return previousDay;
  }, [today]);

  // ─── Get the logged-in user and their role ───
  useEffect(() => {
    let unsubscribeProfile = () => { };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile();

      if (!user) {
        setCurrentUser(null);
        setCurrentUserRole('employee');
        setSelectedEmployeeId('');
        setTimesheetEntries({});
        setIsTimesheetLoading(false);
        return;
      }

      setCurrentUser(user);
      setSelectedEmployeeId(user.uid);

      if (!user.email) {
        setCurrentUserRole('employee');
        return;
      }

      /*
        User profile document ID is the email with '.' replaced by '_':
        users/user_example_com
      */
      const emailDocId = user.email.toLowerCase().replace(/\./g, '_');
      const profileRef = doc(db, 'users', emailDocId);

      unsubscribeProfile = onSnapshot(
        profileRef,
        (snapshot) => {
          const userProfile = snapshot.data() || {};
          setCurrentUserRole(userProfile.role || 'employee');
        },
        (error) => {
          console.error('Unable to load user role:', error);
          setCurrentUserRole('employee');
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

  const canSelectEmployees = isAdminOrSrProjectManager(currentUserRole);

  // ─── Load employee list for Admin / Project Manager ───
  useEffect(() => {
    if (!currentUser || !canSelectEmployees) {
      setEmployees([]);
      setIsEmployeeLoading(false);
      return undefined;
    }

    setIsEmployeeLoading(true);

    const unsubscribeEmployees = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const employeeList = snapshot.docs
          .map((userDocument) => {
            const userData = userDocument.data();

            /*
              Every user document must contain uid.
              This UID maps to timesheet/{uid}.
              Document ID is email with '.' replaced by '_'.
            */
            const userUid = userData.uid;

            return {
              uid: userUid,
              userEmailDocumentId: userDocument.id, // This is email with . replaced by _
              name: getEmployeeName(userData, userDocument.id),
              email: userData.email || userDocument.id.replace(/_/g, '.'),
              role: userData.role || 'employee',
            };
          })
          .filter((employee) => employee.uid); // Only include employees with valid uid

        // Keep current user in the list if needed.
        const currentUserExists = employeeList.some(
          (employee) => employee.uid === currentUser.uid
        );

        if (!currentUserExists && currentUser.email) {
          const currentUserEmailDocId = currentUser.email.toLowerCase().replace(/\./g, '_');
          employeeList.unshift({
            uid: currentUser.uid,
            userEmailDocumentId: currentUserEmailDocId,
            name:
              currentUser.displayName ||
              currentUser.email.split('@')[0] ||
              'My Timesheet',
            email: currentUser.email,
            role: currentUserRole,
          });
        }

        employeeList.sort((firstEmployee, secondEmployee) =>
          firstEmployee.name.localeCompare(secondEmployee.name)
        );

        setEmployees(employeeList);
        setIsEmployeeLoading(false);
      },
      (error) => {
        console.error('Unable to load employees:', error);
        setEmployees([]);
        setIsEmployeeLoading(false);
      }
    );

    return () => unsubscribeEmployees();
  }, [currentUser, currentUserRole, canSelectEmployees]);

  // ─── Load selected employee timesheet ───
  useEffect(() => {
    if (!selectedEmployeeId) {
      setTimesheetEntries({});
      setIsTimesheetLoading(false);
      return undefined;
    }

    setIsTimesheetLoading(true);
    setTimesheetError('');

    /*
      Timesheet document ID is Firebase Auth UID:
      timesheet/{selectedEmployeeId}
    */
    const timesheetRef = doc(db, 'timesheet', selectedEmployeeId);

    const unsubscribeTimesheet = onSnapshot(
      timesheetRef,
      (snapshot) => {
        const timesheetData = snapshot.data() || {};
        setTimesheetEntries(timesheetData.entries || {});
        setIsTimesheetLoading(false);
      },
      (error) => {
        console.error('Unable to load timesheet:', error);
        setTimesheetEntries({});
        setTimesheetError('Unable to load timesheet data.');
        setIsTimesheetLoading(false);
      }
    );

    return () => unsubscribeTimesheet();
  }, [selectedEmployeeId]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString('default', {
    month: 'long',
  });

  const firstDayIndex =
    (new Date(year, month, 1).getDay() + 6) % 7;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // ─── Calendar Weeks ───
  const weeks = useMemo(() => {
    const cells = [];

    for (let index = firstDayIndex - 1; index >= 0; index -= 1) {
      const day = daysInPrevMonth - index;
      const previousMonth = month === 0 ? 11 : month - 1;
      const previousYear = month === 0 ? year - 1 : year;

      cells.push({
        day,
        month: previousMonth,
        year: previousYear,
        type: 'prev',
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({
        day,
        month,
        year,
        type: 'current',
      });
    }

    const remainder = (7 - (cells.length % 7)) % 7;

    for (let day = 1; day <= remainder; day += 1) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;

      cells.push({
        day,
        month: nextMonth,
        year: nextYear,
        type: 'next',
      });
    }

    const calendarWeeks = [];

    for (let index = 0; index < cells.length; index += 7) {
      calendarWeeks.push(cells.slice(index, index + 7));
    }

    return calendarWeeks;
  }, [year, month, firstDayIndex, daysInMonth, daysInPrevMonth]);

  const getDateStr = (cell) =>
    `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(
      cell.day
    ).padStart(2, '0')}`;

  const isToday = (cell) => {
    const cellDate = new Date(cell.year, cell.month, cell.day);
    return isSameDate(cellDate, today);
  };

  const isYesterday = (cell) => {
    const cellDate = new Date(cell.year, cell.month, cell.day);
    return isSameDate(cellDate, yesterday);
  };

  // ─── Calculate Task Data for Calendar ───
  const calendarTaskData = useMemo(() => {
    const calendarData = {};

    Object.entries(timesheetEntries).forEach(([dateKey, entry]) => {
      const tasks = Array.isArray(entry?.tasks) ? entry.tasks : [];

      if (tasks.length === 0) {
        return;
      }

      const totalMinutes = tasks.reduce(
        (total, task) => total + durationToMinutes(task.duration),
        0
      );

      calendarData[dateKey] = {
        tasks: tasks.length,
        totalMinutes,
        hours: formatDuration(totalMinutes),

        // 6 hours or more = green.
        // Less than 6 hours = red.
        status: totalMinutes >= 6 * 60 ? 'green' : 'red',
      };
    });

    return calendarData;
  }, [timesheetEntries]);

  // ─── Calculate Monthly Summary ───
  const monthlySummary = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    return Object.entries(calendarTaskData).reduce(
      (summary, [dateKey, dayData]) => {
        if (!dateKey.startsWith(monthPrefix)) {
          return summary;
        }

        return {
          totalMinutes: summary.totalMinutes + dayData.totalMinutes,
          totalEntries: summary.totalEntries + dayData.tasks,
        };
      },
      {
        totalMinutes: 0,
        totalEntries: 0,
      }
    );
  }, [calendarTaskData, year, month]);

  const getCellStyles = (cell, data) => {
    if (data?.status === 'green') {
      return {
        border: 'border-green-500',
        bg: 'bg-green-50',
      };
    }

    if (data?.status === 'red') {
      return {
        border: 'border-red-400',
        bg: 'bg-red-50',
      };
    }

    if (isToday(cell)) {
      return {
        border: 'border-blue-500',
        bg: 'bg-white',
      };
    }

    return {
      border: 'border-gray-200',
      bg: 'bg-white',
    };
  };

  const selectedEmployee = useMemo(() => {
    const selectedFromList = employees.find(
      (employee) => employee.uid === selectedEmployeeId
    );

    if (selectedFromList) {
      return selectedFromList;
    }

    if (currentUser && selectedEmployeeId === currentUser.uid) {
      return {
        uid: currentUser.uid,
        name:
          currentUser.displayName ||
          currentUser.email?.split('@')[0] ||
          'My Timesheet',
        email: currentUser.email || '',
        role: currentUserRole,
      };
    }

    return {
      uid: selectedEmployeeId,
      name: 'Selected Employee',
      email: '',
      role: 'employee',
    };
  }, [
    employees,
    selectedEmployeeId,
    currentUser,
    currentUserRole,
  ]);

  const filteredEmployees = useMemo(() => {
    const searchText = employeeSearch.toLowerCase().trim();

    if (!searchText) {
      return employees;
    }

    return employees.filter((employee) => {
      return (
        employee.name.toLowerCase().includes(searchText) ||
        employee.email.toLowerCase().includes(searchText) ||
        employee.role.toLowerCase().includes(searchText)
      );
    });
  }, [employees, employeeSearch]);

  // Only the logged-in employee may create their own tasks.
  const viewingOwnTimesheet =
    !!currentUser && currentUser.uid === selectedEmployeeId;

  /*
    IMPORTANT:
    Plus button is visible only on Today and Yesterday.
    All remaining dates are frozen for task creation.
  */
  const canAddTaskOnCell = (cell) => {
    if (!viewingOwnTimesheet) {
      return false;
    }

    return isToday(cell) || isYesterday(cell);
  };

  // ─── Navigation ───

  const goToday = () => {
    setCurrentDate(new Date(today));
  };

  const goBack = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goNext = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Open detail popup.
  const handleCellClick = (cell) => {
    const dateStr = getDateStr(cell);

    navigate(`/day/${dateStr}`, {
      state: {
        backgroundLocation: location,

        // Used by DayDetailsModal for Admin / Project Manager.
        employeeUid: selectedEmployeeId,
        employeeName: selectedEmployee.name,
      },
    });
  };

  // Add tasks only to Today / Yesterday.
  const handleAddClick = (event, cell) => {
    event.stopPropagation();

    if (!canAddTaskOnCell(cell)) {
      return;
    }

    const dateStr = getDateStr(cell);

    navigate(`/task/new/${dateStr}`);
  };

  const handleSelectEmployee = (employee) => {
    setSelectedEmployeeId(employee.uid);
    setEmployeeSearch('');
    setIsEmployeePickerOpen(false);
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-[1200px] mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* ===== TOP HEADER ===== */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 p-4 md:px-6 border-b border-gray-100">
          {/* View Tabs */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTopTab('Calendar View')}
              className={`flex items-center gap-2 text-sm font-medium pb-1 border-b-2 transition ${activeTopTab === 'Calendar View'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
            >
              <CalendarIcon size={16} />
              Calendar View
            </button>

            <button
              onClick={() => setActiveTopTab('Table View')}
              className={`flex items-center gap-2 text-sm font-medium pb-1 border-b-2 transition ${activeTopTab === 'Table View'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
            >
              <TableIcon size={16} />
              Table View
            </button>
          </div>

          {/* Employee Search: Admin / Project Manager only */}
          {canSelectEmployees && (
            <div className="relative w-full xl:w-72">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="text"
                  value={employeeSearch}
                  onFocus={() => setIsEmployeePickerOpen(true)}
                  onChange={(event) => {
                    setEmployeeSearch(event.target.value);
                    setIsEmployeePickerOpen(true);
                  }}
                  placeholder="Search employee..."
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <Users size={13} />
                Viewing: {selectedEmployee.name}
              </div>

              {isEmployeePickerOpen && (
                <div className="absolute z-50 top-full mt-2 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
                  {isEmployeeLoading && (
                    <div className="px-4 py-3 text-sm text-gray-500">
                      Loading employees...
                    </div>
                  )}

                  {!isEmployeeLoading &&
                    filteredEmployees.map((employee) => (
                      <button
                        key={employee.uid}
                        onClick={() => handleSelectEmployee(employee)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-blue-50 transition ${selectedEmployeeId === employee.uid
                            ? 'bg-blue-50'
                            : ''
                          }`}
                      >
                        <div className="text-sm font-medium text-gray-800">
                          {employee.name}
                        </div>

                        <div className="text-xs text-gray-500 mt-0.5">
                          {employee.email || employee.role}
                        </div>
                      </button>
                    ))}

                  {!isEmployeeLoading &&
                    filteredEmployees.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        No employee found.
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Current Month Summary */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="border border-gray-200 rounded-xl px-4 py-2 text-center min-w-[130px]">
              <div className="text-xs font-medium text-gray-500">
                Total Task Hours
              </div>

              <div className="text-sm font-bold text-gray-900 mt-0.5">
                {formatDuration(monthlySummary.totalMinutes)}
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl px-4 py-2 text-center min-w-[140px]">
              <div className="text-xs font-medium text-gray-500">
                Total Entries
              </div>

              <div className="text-sm font-bold text-gray-900 mt-0.5">
                {monthlySummary.totalEntries}
              </div>
            </div>
          </div>
        </div>

        {/* ===== SUB HEADER ===== */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Today
            </button>

            <button
              onClick={goBack}
              className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Back
            </button>

            <button
              onClick={goNext}
              className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Next
            </button>
          </div>

          <h2 className="text-lg font-bold text-gray-900 order-first md:order-none">
            {monthName} {year}
          </h2>

          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {['Month', 'Week', 'Day', 'Agenda'].map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${activeView === view
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {timesheetError && (
          <div className="mx-4 md:mx-6 mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {timesheetError}
          </div>
        )}

        {/* ===== CALENDAR GRID ===== */}
        <div className="px-2 pb-2 md:px-4 md:pb-4 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Week Names */}
            <div className="grid grid-cols-7 border-t border-l border-gray-200">
              {weekDays.map((dayName) => (
                <div
                  key={dayName}
                  className="text-center text-sm font-semibold text-gray-700 py-3 border-r border-b border-gray-200 bg-gray-50"
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar Dates */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 border-l border-gray-200">
                {week.map((cell, cellIndex) => {
                  const dateKey = getDateStr(cell);
                  const data = calendarTaskData[dateKey];
                  const styles = getCellStyles(cell, data);

                  const isFaded = cell.type !== 'current';
                  const todayFlag = isToday(cell);
                  const yesterdayFlag = isYesterday(cell);

                  // Plus only appears for current user's Today / Yesterday.
                  const canAddTask = canAddTaskOnCell(cell);

                  return (
                    <div
                      key={cellIndex}
                      onClick={() => handleCellClick(cell)}
                      className={`relative h-[110px] p-2 border-r border-b ${styles.border
                        } ${styles.bg} ${isFaded ? 'opacity-50' : ''
                        } group cursor-pointer hover:shadow-inner transition`}
                    >
                      {/* Day Number */}
                      <div
                        className={`text-sm font-medium ${isFaded ? 'text-gray-400' : 'text-gray-800'
                          }`}
                      >
                        {cell.day}
                      </div>

                      {/* Today Label */}
                      {todayFlag && (
                        <span className="inline-block bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded mt-1">
                          Today
                        </span>
                      )}

                      {/* Yesterday Label */}
                      {yesterdayFlag && !todayFlag && (
                        <span className="inline-block bg-gray-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded mt-1">
                          Yesterday
                        </span>
                      )}

                      {/* Firestore Task Information */}
                      {data && (
                        <div className="absolute top-2 right-2 text-right space-y-0.5">
                          <div className="text-[11px] font-semibold text-blue-600">
                            Task: {data.tasks}
                          </div>

                          <div
                            className={`text-[10px] font-medium ${data.status === 'green'
                                ? 'text-green-600'
                                : 'text-red-500'
                              }`}
                          >
                            Total: {data.hours}
                          </div>

                          <div
                            className={`text-[10px] font-semibold ${data.status === 'green'
                                ? 'text-green-600'
                                : 'text-red-500'
                              }`}
                          >
                            {data.status === 'green'
                              ? '6h+ Completed'
                              : 'Below 6h'}
                          </div>
                        </div>
                      )}

                      {/* Plus is restricted to Today and Yesterday */}
                      {canAddTask && (
                        <button
                          onClick={(event) => handleAddClick(event, cell)}
                          className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-blue-700 hover:scale-110 transition-all shadow-md"
                          title="Add task on this day"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {isTimesheetLoading && (
          <div className="border-t border-gray-100 px-6 py-3 text-center text-xs text-gray-500">
            Loading timesheet data...
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeSheet;