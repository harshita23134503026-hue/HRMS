import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X,
  Plus,
  Trash2,
  Clock,
  FileText,
  MapPin,
} from 'lucide-react';

import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase'; // Update path if needed

const hourOptions = Array.from({ length: 12 }, (_, index) =>
  String(index + 1)
);

const minuteOptions = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, '0')
);

// ─── Time Helpers ───

const formatTime = (hour, minute, period) => {
  if (!hour || minute === '' || !period) {
    return '';
  }

  return `${hour}:${minute} ${period}`;
};

const convertToMinutes = (hour, minute, period) => {
  if (!hour || minute === '' || !period) {
    return null;
  }

  let hourIn24Format = Number(hour);

  if (period === 'AM' && hourIn24Format === 12) {
    hourIn24Format = 0;
  }

  if (period === 'PM' && hourIn24Format !== 12) {
    hourIn24Format += 12;
  }

  return hourIn24Format * 60 + Number(minute);
};

const calculateDuration = (task) => {
  const startMinutes = convertToMinutes(
    task.startHour,
    task.startMinute,
    task.startPeriod
  );

  const endMinutes = convertToMinutes(
    task.endHour,
    task.endMinute,
    task.endPeriod
  );

  if (startMinutes === null || endMinutes === null) {
    return '';
  }

  let totalMinutes = endMinutes - startMinutes;

  // If the end time is before the start time,
  // treat it as an overnight task.
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
};

// ─── Time Selector Component ───

const TimeSelector = ({
  hour,
  minute,
  period,
  onHourChange,
  onMinuteChange,
  onPeriodChange,
}) => {
  return (
    <div className="flex items-center gap-1">
      {/* Hour: 1 to 12 */}
      <select
        value={hour}
        onChange={(e) => onHourChange(e.target.value)}
        className="w-14 border border-gray-200 rounded-md px-1 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        aria-label="Hour"
      >
        <option value="">HH</option>

        {hourOptions.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <span className="text-gray-500 font-medium">:</span>

      {/* Minutes: 00 to 59 */}
      <select
        value={minute}
        onChange={(e) => onMinuteChange(e.target.value)}
        className="w-14 border border-gray-200 rounded-md px-1 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        aria-label="Minute"
      >
        <option value="">MM</option>

        {minuteOptions.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      {/* AM / PM */}
      <select
        value={period}
        onChange={(e) => onPeriodChange(e.target.value)}
        className="w-16 border border-gray-200 rounded-md px-1 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        aria-label="AM or PM"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};

// ─── Single Task Entry Component ───

const TaskEntry = ({ index, task, onChange, onRemove, canRemove }) => {
  const update = (field, value) => {
    onChange(index, field, value);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-5 space-y-4">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold text-gray-900">
            TASK {index + 1}
          </h3>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Choose how you want to set task timing:</span>

            <button
              onClick={() => update('timingMode', 'range')}
              className={`px-3 py-1 rounded border text-xs font-medium transition ${
                task.timingMode === 'range'
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Time Range
            </button>

            <button
              onClick={() => update('timingMode', 'duration')}
              className={`px-3 py-1 rounded border text-xs font-medium transition ${
                task.timingMode === 'duration'
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Duration
            </button>
          </div>
        </div>

        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"
            title="Remove task"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {/* Row 1: Task Title + Work Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Task Title
          </label>

          <div className="relative">
            <FileText
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={task.taskTitle}
              onChange={(e) => update('taskTitle', e.target.value)}
              placeholder=""
              className="w-full border border-gray-200 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Work Summary
          </label>

          <div className="relative">
            <FileText
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={task.workSummary}
              onChange={(e) => update('workSummary', e.target.value)}
              placeholder=""
              className="w-full border border-gray-200 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Time Range Mode */}
      {task.timingMode === 'range' ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Start Time */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Start Time
            </label>

            <TimeSelector
              hour={task.startHour}
              minute={task.startMinute}
              period={task.startPeriod}
              onHourChange={(value) => update('startHour', value)}
              onMinuteChange={(value) => update('startMinute', value)}
              onPeriodChange={(value) => update('startPeriod', value)}
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              End Time
            </label>

            <TimeSelector
              hour={task.endHour}
              minute={task.endMinute}
              period={task.endPeriod}
              onHourChange={(value) => update('endHour', value)}
              onMinuteChange={(value) => update('endMinute', value)}
              onPeriodChange={(value) => update('endPeriod', value)}
            />
          </div>

          {/* Calculated Duration */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Duration
            </label>

            <div className="relative">
              <Clock
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={task.duration}
                readOnly
                placeholder="Auto calculated"
                className="w-full border border-gray-200 rounded-md pl-9 pr-3 py-2 text-sm text-gray-600 bg-gray-50 focus:outline-none"
              />
            </div>
          </div>

          {/* Activity */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Activity
            </label>

            <div className="relative">
              <FileText
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={task.activity}
                onChange={(e) => update('activity', e.target.value)}
                placeholder=""
                className="w-full border border-gray-200 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Location
            </label>

            <div className="relative">
              <MapPin
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={task.location}
                onChange={(e) => update('location', e.target.value)}
                placeholder="Office"
                className="w-full border border-gray-200 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Duration Mode */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Duration (hours)
            </label>

            <div className="relative">
              <Clock
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={task.duration}
                onChange={(e) => update('duration', e.target.value)}
                placeholder="e.g. 2h 30m"
                className="w-full border border-gray-200 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Activity
            </label>

            <div className="relative">
              <FileText
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={task.activity}
                onChange={(e) => update('activity', e.target.value)}
                placeholder=""
                className="w-full border border-gray-200 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Location
            </label>

            <div className="relative">
              <MapPin
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={task.location}
                onChange={(e) => update('location', e.target.value)}
                placeholder="Office"
                className="w-full border border-gray-200 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div />
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Description
        </label>

        <textarea
          rows={2}
          value={task.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder=""
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  );
};

// ─── Default Blank Task ───

const blankTask = () => ({
  timingMode: 'range',
  taskTitle: '',
  workSummary: '',

  // Saved to Firestore in 12-hour format, for example: 09:30 AM
  startTime: '',
  endTime: '',

  // Used only by the time selector UI
  startHour: '',
  startMinute: '',
  startPeriod: 'AM',
  endHour: '',
  endMinute: '',
  endPeriod: 'AM',

  // Automatically set in range mode
  duration: '',

  activity: '',
  location: '',
  description: '',
});

// ─── Main Add Task Page ───

const AddTaskPage = () => {
  const navigate = useNavigate();
  const { date } = useParams();

  const isValidDate = date && date !== 'new';

  const defaultDate = isValidDate
    ? date
    : new Date().toISOString().split('T')[0];

  const [workDate, setWorkDate] = useState(defaultDate);
  const [tasks, setTasks] = useState([blankTask()]);

  // Update a single task field and calculate duration when time changes
  const handleTaskChange = (index, field, value) => {
    const updatedTasks = [...tasks];

    const updatedTask = {
      ...updatedTasks[index],
      [field]: value,
    };

    const timeFields = [
      'startHour',
      'startMinute',
      'startPeriod',
      'endHour',
      'endMinute',
      'endPeriod',
    ];

    // Create the text values stored in Firestore:
    // Example: "9:05 AM"
    updatedTask.startTime = formatTime(
      updatedTask.startHour,
      updatedTask.startMinute,
      updatedTask.startPeriod
    );

    updatedTask.endTime = formatTime(
      updatedTask.endHour,
      updatedTask.endMinute,
      updatedTask.endPeriod
    );

    // Recalculate duration whenever a time selector is changed
    // or when Time Range mode is selected.
    if (
      timeFields.includes(field) ||
      (field === 'timingMode' && value === 'range')
    ) {
      updatedTask.duration = calculateDuration(updatedTask);
    }

    updatedTasks[index] = updatedTask;
    setTasks(updatedTasks);
  };

  // Add a new task entry
  const addEntry = () => {
    setTasks([...tasks, blankTask()]);
  };

  // Remove one task entry
  const removeEntry = (index) => {
    setTasks(tasks.filter((_, taskIndex) => taskIndex !== index));
  };

  // Save to Firestore
  const handleSave = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        alert('Please log in before saving your timesheet.');
        return;
      }

      // Remove selector-only values before saving to Firestore.
      // The saved task fields remain the same as your original schema.
      const tasksToSave = tasks.map((task) => ({
        timingMode: task.timingMode,
        taskTitle: task.taskTitle,
        workSummary: task.workSummary,
        startTime: formatTime(
          task.startHour,
          task.startMinute,
          task.startPeriod
        ),
        endTime: formatTime(
          task.endHour,
          task.endMinute,
          task.endPeriod
        ),
        duration:
          task.timingMode === 'range'
            ? calculateDuration(task)
            : task.duration,
        activity: task.activity,
        location: task.location,
        description: task.description,
      }));

      // One document only for every user:
      // timesheet/{user.uid}
      const timesheetRef = doc(db, 'timesheet', user.uid);

      await setDoc(
        timesheetRef,
        {
          userId: user.uid,

          // Each date is stored in the same user document.
          entries: {
            [workDate]: {
              workDate,
              tasks: tasksToSave,
              updatedAt: serverTimestamp(),
            },
          },

          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      console.log('Timesheet saved successfully');
      navigate('/timesheet');
    } catch (error) {
      console.error('Error saving timesheet:', error);
      alert('Unable to save the timesheet. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ═══════ TOP BAR ═══════ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
        <span className="inline-flex items-center gap-2 bg-blue-500 text-white text-xs font-semibold px-4 py-1.5 rounded-md">
          Add Timesheet Entry
        </span>

        <button
          onClick={() => navigate(-1)}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* ═══════ FORM BODY ═══════ */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Work Date */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Work Date
          </label>

          <div className="relative w-48">
            <input
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Task Entries */}
        {tasks.map((task, index) => (
          <TaskEntry
            key={index}
            index={index}
            task={task}
            onChange={handleTaskChange}
            onRemove={removeEntry}
            canRemove={tasks.length > 1}
          />
        ))}
      </div>

      {/* ═══════ BOTTOM BAR ═══════ */}
      <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200">
        <button
          onClick={addEntry}
          className="flex items-center gap-2 text-sm font-medium text-blue-500 hover:text-blue-700 transition"
        >
          <Plus size={18} />
          Add Entry
        </button>

        <button
          onClick={handleSave}
          className="px-8 py-2 rounded-md bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition shadow-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default AddTaskPage;