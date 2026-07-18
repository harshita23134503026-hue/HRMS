import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Pencil, Copy, Trash2 } from 'lucide-react';

import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

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

// ─── Single Entry Card ───

const EntryCard = ({
  entry,
  onEdit,
  onCopy,
  onDelete,
  isSaving,
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-5 space-y-3">
      {/* Row 1: Title + Duration badge + Action icons */}
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-sm font-bold text-gray-900">
          {entry.title}
        </h4>

        <div className="flex items-center gap-3 shrink-0">
          <span className="border border-green-400 text-green-600 text-xs font-semibold px-3 py-1 rounded-md">
            {entry.duration || '0h 0m'}
          </span>

          <button
            onClick={() => onEdit(entry.index)}
            disabled={isSaving}
            title="Edit entry"
            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Pencil size={15} />
          </button>

          <button
            onClick={() => onCopy(entry.index)}
            disabled={isSaving}
            title="Copy entry"
            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy size={15} />
          </button>

          <button
            onClick={() => onDelete(entry.index)}
            disabled={isSaving}
            title="Delete entry"
            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={15} />
          </button>
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
        {/* Activity tag */}
        <span className="border border-blue-400 text-blue-600 text-xs font-medium px-3 py-1 rounded-md">
          {entry.category || 'No activity'}
        </span>

        {/* Location tag */}
        <span className="border border-blue-400 text-blue-600 text-xs font-medium px-3 py-1 rounded-md">
          {entry.location || 'No location'}
        </span>

        {/* Source tag */}
        <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-md">
          Source: {entry.source}
        </span>

        {/* Time details */}
        <span className="text-xs text-gray-500 ml-2">
          Start Time :{' '}
          <span className="text-gray-700 font-medium">
            {entry.startTime || '—'}
          </span>
        </span>

        <span className="text-xs text-gray-500">
          End Time :{' '}
          <span className="text-gray-700 font-medium">
            {entry.endTime || '—'}
          </span>
        </span>

        <span className="text-xs text-gray-500">
          Duration :{' '}
          <span className="text-gray-700 font-medium">
            {entry.duration || '—'}
          </span>
        </span>
      </div>

      {/* Row 4: Work Summary box */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-500 mb-1">Work Summary :</p>

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

  const workDate =
    date && date !== 'new'
      ? date
      : new Date().toISOString().split('T')[0];

  const [tasks, setTasks] = useState([]);
  const [employeeName, setEmployeeName] = useState('Employee');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // ─── Read user's timesheet document in real time ───
  useEffect(() => {
    let unsubscribeTimesheet = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeTimesheet();

      if (!user) {
        setTasks([]);
        setEmployeeName('Employee');
        setError('Please log in to view timesheet details.');
        setIsLoading(false);
        return;
      }

      setEmployeeName(
        user.displayName || user.email?.split('@')[0] || 'Employee'
      );

      setIsLoading(true);
      setError('');

      const timesheetRef = doc(db, 'timesheet', user.uid);

      unsubscribeTimesheet = onSnapshot(
        timesheetRef,
        (snapshot) => {
          const data = snapshot.data();

          // Data is stored at:
          // timesheet/{uid}/entries/{workDate}/tasks
          const savedTasks = data?.entries?.[workDate]?.tasks;

          setTasks(Array.isArray(savedTasks) ? savedTasks : []);
          setIsLoading(false);
        },
        (snapshotError) => {
          console.error('Unable to load timesheet:', snapshotError);
          setError('Unable to load the timesheet details.');
          setIsLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeTimesheet();
    };
  }, [workDate]);

  // ─── Save updated task array to the same user document ───
  const saveTasksToFirestore = async (updatedTasks) => {
    const user = auth.currentUser;

    if (!user) {
      alert('Please log in before updating the timesheet.');
      return;
    }

    try {
      setIsSaving(true);

      const timesheetRef = doc(db, 'timesheet', user.uid);

      await setDoc(
        timesheetRef,
        {
          userId: user.uid,

          // The same user document is updated.
          // Only this work date's task array is replaced.
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
      alert('Unable to update the timesheet. Please try again.');
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
      `Are you sure you want to delete "${selectedTask.taskTitle || 'this task'}"?`
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

    /*
      This route must exist in your router:

      <Route path="/timesheet/add/:date" element={<AddTaskPage />} />

      The selected task is passed in route state.
      In AddTaskPage, use useLocation() to receive:
      location.state?.task
      location.state?.taskIndex
    */
    navigate(`/timesheet/add/${workDate}`, {
      state: {
        mode: 'edit',
        taskIndex: index,
        task: selectedTask,
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

  // Transform Firestore tasks to the fields used by the existing card UI.
  const displayEntries = tasks.map((task, index) => ({
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
  }));

  const totalMinutes = tasks.reduce(
    (total, task) => total + durationToMinutes(task.duration),
    0
  );

  const totalHours = formatDuration(totalMinutes);
  const totalEntries = tasks.length;

  const content = (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
      {/* ═══════ TOP BAR ═══════ */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
        <span className="inline-flex items-center bg-blue-500 text-white text-xs font-semibold px-4 py-1.5 rounded-md">
          Timesheet Details
        </span>

        <button
          onClick={handleClose}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* ═══════ SUMMARY ROW ═══════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 border-b border-gray-100">
        <div className="border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-500">Employee :</span>

          <span className="text-sm font-semibold text-gray-800 ml-2">
            {employeeName}
          </span>
        </div>

        <div className="border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-500">Total Hours :</span>

          <span className="text-sm font-semibold text-gray-800 ml-2">
            {totalHours}
          </span>
        </div>

        <div className="border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-500">Total Entries :</span>

          <span className="text-sm font-semibold text-gray-800 ml-2">
            {totalEntries}
          </span>
        </div>

        <div className="border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-500">Work Date :</span>

          <span className="text-sm font-semibold text-gray-800 ml-2">
            {workDate}
          </span>
        </div>
      </div>

      {/* ═══════ SCROLLABLE BODY ═══════ */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <h3 className="text-sm font-bold text-gray-900">
          Entry Details :
        </h3>

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
    >
      <div onClick={(event) => event.stopPropagation()}>
        {content}
      </div>
    </div>
  );
};

export default DayDetailsModal;