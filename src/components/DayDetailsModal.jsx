import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Copy, Pencil, Trash2, X } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; // Update path if required

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

// ─── Role Helpers ───

const normalizeRole = (role = '') =>
  String(role)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const isAdminOrProjectManager = (role) => {
  const normalizedRole = normalizeRole(role);

  return [
    'admin',
    'projectmanager',
    'srprojectmanager',
    'seniorprojectmanager',
  ].includes(normalizedRole);
};

// ─── Single Entry Card ───

const EntryCard = ({
  entry,
  onEdit,
  onCopy,
  onDelete,
  isSaving,
  canEdit,
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-5 space-y-3">
      {/* Row 1: Title + Duration badge + Action icons */}
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-sm font-bold text-gray-900">{entry.title}</h4>

        <div className="flex items-center gap-3 shrink-0">
          <span className="border border-green-400 text-green-600 text-xs font-semibold px-3 py-1 rounded-md">
            {entry.duration || '0h 0m'}
          </span>

          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => onEdit(entry.index)}
                disabled={isSaving}
                title="Edit entry"
                className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Pencil size={15} />
              </button>

              <button
                type="button"
                onClick={() => onCopy(entry.index)}
                disabled={isSaving}
                title="Copy entry"
                className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Copy size={15} />
              </button>

              <button
                type="button"
                onClick={() => onDelete(entry.index)}
                disabled={isSaving}
                title="Delete entry"
                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Description lines */}
      <p className="text-xs text-gray-600 leading-relaxed">
        {entry.description || 'No description added.'}
      </p>

      <p className="text-xs text-gray-600 leading-relaxed">
        {entry.description2 || 'No work summary added.'}
      </p>

      {/* Row 3: Tags + Time info */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="border border-blue-400 text-blue-600 text-xs font-medium px-3 py-1 rounded-md">
          {entry.category || 'No activity'}
        </span>

        <span className="border border-blue-400 text-blue-600 text-xs font-medium px-3 py-1 rounded-md">
          {entry.location || 'No location'}
        </span>

        <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-md">
          Source: {entry.source}
        </span>

        <span className="text-xs text-gray-500 ml-2">
          Start Time:{' '}
          <span className="text-gray-700 font-medium">
            {entry.startTime || '—'}
          </span>
        </span>

        <span className="text-xs text-gray-500">
          End Time:{' '}
          <span className="text-gray-700 font-medium">
            {entry.endTime || '—'}
          </span>
        </span>

        <span className="text-xs text-gray-500">
          Duration:{' '}
          <span className="text-gray-700 font-medium">
            {entry.duration || '—'}
          </span>
        </span>
      </div>

      {/* Row 4: Work Summary box */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-500 mb-1">Work Summary:</p>
        <p className="text-xs text-gray-700">
          {entry.workSummary || 'No work summary added.'}
        </p>
      </div>
    </div>
  );
};

// ─── Main Modal Component ───

const DayDetailsModal = ({ standalone = false }) => {
  const navigate = useNavigate();
  const { date } = useParams();
  const location = useLocation();

  const workDate =
    date && date !== 'new' ? date : new Date().toISOString().split('T')[0];

  // Timesheet state
  const [tasks, setTasks] = useState([]);
  const [employeeName, setEmployeeName] = useState('Employee');
  const [employeeUid, setEmployeeUid] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Current user state
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('employee');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  // Ref for timesheet-listener cleanup
  const timesheetUnsubscribeRef = useRef(() => {});

  // ─── Get logged-in user and their role ───

  useEffect(() => {
    let unsubscribeProfile = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile();
      unsubscribeProfile = () => {};

      if (!user) {
        setCurrentUser(null);
        setCurrentUserRole('employee');
        setIsAuthLoading(false);
        setIsRoleLoading(false);
        return;
      }

      setCurrentUser(user);
      setIsAuthLoading(false);
      setIsRoleLoading(true);

      if (!user.email) {
        setCurrentUserRole('employee');
        setIsRoleLoading(false);
        return;
      }

      // User profile document ID is email with "." replaced by "_".
      const emailDocId = user.email.toLowerCase().replace(/\./g, '_');
      const profileRef = doc(db, 'users', emailDocId);

      unsubscribeProfile = onSnapshot(
        profileRef,
        (snapshot) => {
          const userProfile = snapshot.data() || {};
          setCurrentUserRole(userProfile.role || 'employee');
          setIsRoleLoading(false);
        },
        (profileError) => {
          console.error('Unable to load user role:', profileError);
          setCurrentUserRole('employee');
          setIsRoleLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

  // ─── Determine target employeeUid ───
  // Priority: 1. Route state (from TimeSheet), 2. Current user's own uid

  useEffect(() => {
    const stateEmployeeUid = location.state?.employeeUid;
    const targetUid = stateEmployeeUid || currentUser?.uid || '';

    setEmployeeUid(targetUid);
  }, [location.state?.employeeUid, currentUser?.uid]);

  // ─── Fetch employee name for display ───

  useEffect(() => {
    if (!employeeUid) {
      setEmployeeName('Employee');
      return;
    }

    // If viewing own timesheet, use current user's display name.
    if (currentUser && employeeUid === currentUser.uid) {
      setEmployeeName(
        currentUser.displayName ||
          currentUser.email?.split('@')[0] ||
          'My Timesheet'
      );
      return;
    }

    // For another employee, use the name passed through route state.
    const stateEmployeeName = location.state?.employeeName;
    setEmployeeName(stateEmployeeName || 'Selected Employee');
  }, [employeeUid, currentUser, location.state?.employeeName]);

  // ─── Load selected employee timesheet ───

  useEffect(() => {
    // Clean up the previous listener before creating another one.
    timesheetUnsubscribeRef.current();
    timesheetUnsubscribeRef.current = () => {};

    if (!employeeUid) {
      setTasks([]);
      setIsLoading(false);
      return undefined;
    }

    // Wait until Firebase Auth and the current user's role have loaded.
    if (isAuthLoading || isRoleLoading) {
      setTasks([]);
      setIsLoading(true);
      setError('');
      return undefined;
    }

    if (!currentUser) {
      setTasks([]);
      setError('Please log in to view this timesheet.');
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    setError('');

    // Admin, Project Manager, and Sr Project Manager can view any timesheet.
    // Employees can view only their own timesheet.
    const canView =
      employeeUid === currentUser.uid ||
      isAdminOrProjectManager(currentUserRole);

    if (!canView) {
      setTasks([]);
      setError('You do not have permission to view this timesheet.');
      setIsLoading(false);
      return undefined;
    }

    // Timesheet document ID is the employee's Firebase Auth UID.
    const timesheetRef = doc(db, 'timesheet', employeeUid);

    const unsubscribeTimesheet = onSnapshot(
      timesheetRef,
      (snapshot) => {
        const timesheetData = snapshot.data() || {};
        const savedTasks = timesheetData.entries?.[workDate]?.tasks;

        setTasks(Array.isArray(savedTasks) ? savedTasks : []);
        setIsLoading(false);
      },
      (snapshotError) => {
        console.error('Unable to load timesheet:', snapshotError);
        setError('Unable to load the timesheet details.');
        setIsLoading(false);
      }
    );

    timesheetUnsubscribeRef.current = unsubscribeTimesheet;

    return () => {
      unsubscribeTimesheet();
      if (timesheetUnsubscribeRef.current === unsubscribeTimesheet) {
        timesheetUnsubscribeRef.current = () => {};
      }
    };
  }, [
    employeeUid,
    workDate,
    currentUser,
    currentUserRole,
    isAuthLoading,
    isRoleLoading,
  ]);

  // ─── Permission to edit ───

  const canEdit = Boolean(
    currentUser &&
      !isRoleLoading &&
      (employeeUid === currentUser.uid ||
        isAdminOrProjectManager(currentUserRole))
  );

  // ─── Save updated task array to target employee's document ───

  const saveTasksToFirestore = async (updatedTasks) => {
    const user = auth.currentUser;

    if (!user) {
      window.alert('Please log in before updating the timesheet.');
      return;
    }

    // Admin, Project Manager, and Sr Project Manager can update any
    // employee's timesheet. Employees can update only their own.
    const hasPermission =
      employeeUid === user.uid ||
      isAdminOrProjectManager(currentUserRole);

    if (!hasPermission) {
      window.alert('You do not have permission to edit this timesheet.');
      return;
    }

    try {
      setIsSaving(true);

      const timesheetRef = doc(db, 'timesheet', employeeUid);

      await setDoc(
        timesheetRef,
        {
          userId: employeeUid,
          entries: {
            [workDate]: {
              workDate,
              tasks: updatedTasks,
              updatedAt: serverTimestamp(),
            },
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (saveError) {
      console.error('Unable to update timesheet:', saveError);
      window.alert('Unable to update the timesheet. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Copy a task ───

  const handleCopy = async (index) => {
    const selectedTask = tasks[index];

    if (!selectedTask) {
      return;
    }

    const copiedTask = {
      ...selectedTask,
      taskTitle: selectedTask.taskTitle
        ? `${selectedTask.taskTitle} (Copy)`
        : 'Untitled Task (Copy)',
    };

    await saveTasksToFirestore([...tasks, copiedTask]);
  };

  // ─── Delete a task ───

  const handleDelete = async (index) => {
    const selectedTask = tasks[index];

    if (!selectedTask) {
      return;
    }

    const shouldDelete = window.confirm(
      `Are you sure you want to delete "${
        selectedTask.taskTitle || 'this task'
      }"?`
    );

    if (!shouldDelete) {
      return;
    }

    const updatedTasks = tasks.filter(
      (_, taskIndex) => taskIndex !== index
    );

    await saveTasksToFirestore(updatedTasks);
  };

  // ─── Edit a task ───

  const handleEdit = (index) => {
    const selectedTask = tasks[index];

    if (!selectedTask) {
      return;
    }

    navigate(`/timesheet/add/${workDate}`, {
      state: {
        mode: 'edit',
        taskIndex: index,
        task: selectedTask,
        employeeUid,
        employeeName,
      },
    });
  };

  const handleClose = () => {
    if (standalone) {
      navigate('/timesheet');
    } else {
      navigate(-1);
    }
  };

  // Transform Firestore tasks to the fields used by the card UI.
  const displayEntries = useMemo(
    () =>
      tasks.map((task, index) => ({
        index,
        title: task.taskTitle || 'Untitled Task',
        description: task.description || '',
        description2: task.workSummary || '',
        duration: task.duration || '',
        category: task.activity || '',
        location: task.location || '',
        source: task.source || 'MANUAL',
        startTime: task.startTime || '',
        endTime: task.endTime || '',
        workSummary: task.workSummary || '',
      })),
    [tasks]
  );

  const totalMinutes = tasks.reduce(
    (total, task) => total + durationToMinutes(task.duration),
    0
  );

  const totalHours = formatDuration(totalMinutes);
  const totalEntries = tasks.length;

  const content = (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <span className="inline-flex items-center bg-blue-500 text-white text-xs font-semibold px-4 py-1.5 rounded-md">
          Timesheet Details
        </span>

        <button
          type="button"
          onClick={handleClose}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 border-b border-gray-100">
        <div className="border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-500">Employee:</span>
          <span className="text-sm font-semibold text-gray-800 ml-2">
            {employeeName}
            {employeeUid !== currentUser?.uid && canEdit && (
              <span className="ml-2 inline-flex items-center bg-purple-100 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                Management View
              </span>
            )}
          </span>
        </div>

        <div className="border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-500">Total Hours:</span>
          <span className="text-sm font-semibold text-gray-800 ml-2">
            {totalHours}
          </span>
        </div>

        <div className="border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-500">Total Entries:</span>
          <span className="text-sm font-semibold text-gray-800 ml-2">
            {totalEntries}
          </span>
        </div>

        <div className="border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-500">Work Date:</span>
          <span className="text-sm font-semibold text-gray-800 ml-2">
            {workDate}
          </span>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <h3 className="text-sm font-bold text-gray-900">Entry Details:</h3>

        {isLoading && (
          <div className="py-10 text-center text-sm text-gray-500">
            Loading timesheet details...
          </div>
        )}

        {!isLoading && error && (
          <div className="py-10 text-center text-sm text-red-500">
            {error}
          </div>
        )}

        {!isLoading && !error && displayEntries.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-500">
            No timesheet entries found for this date.
          </div>
        )}

        {!isLoading &&
          !error &&
          displayEntries.map((entry) => (
            <EntryCard
              key={entry.index}
              entry={entry}
              onEdit={handleEdit}
              onCopy={handleCopy}
              onDelete={handleDelete}
              isSaving={isSaving}
              canEdit={canEdit}
            />
          ))}
      </div>
    </div>
  );

  // Standalone full-page mode
  if (standalone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 pt-8">
        {content}
      </div>
    );
  }

  // Modal overlay mode
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={handleClose}
      role="presentation"
    >
      <div onClick={(event) => event.stopPropagation()}>{content}</div>
    </div>
  );
};

export default DayDetailsModal;
