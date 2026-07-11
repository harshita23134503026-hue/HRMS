import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X,
  Plus,
  Trash2,
  Clock,
  FileText,
  MapPin,
  Calendar,
} from 'lucide-react';

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
          <h3 className="text-sm font-bold text-gray-900">TASK {index + 1}</h3>
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

      {/* Row 2: Start Time + End Time + Activity + Location */}
      {task.timingMode === 'range' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Start Time
            </label>
            <div className="relative">
              <input
                type="text"
                value={task.startTime}
                onChange={(e) => update('startTime', e.target.value)}
                placeholder="hh:mm aa"
                className="w-full border border-gray-200 rounded-md pl-3 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Clock
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              End Time
            </label>
            <div className="relative">
              <input
                type="text"
                value={task.endTime}
                onChange={(e) => update('endTime', e.target.value)}
                placeholder="hh:mm aa"
                className="w-full border border-gray-200 rounded-md pl-3 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Clock
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
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
        </div>
      ) : (
        /* Duration mode */
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

      {/* Row 3: Description (full width) */}
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

// ─── Default blank task ───
const blankTask = () => ({
  timingMode: 'range',
  taskTitle: '',
  workSummary: '',
  startTime: '',
  endTime: '',
  duration: '',
  activity: '',
  location: '',
  description: '',
});

// ─── Main AddTaskPage ───
const AddTaskPage = () => {
  const navigate = useNavigate();
  const { date } = useParams();

  const isValidDate = date && date !== 'new';
  const defaultDate = isValidDate ? date : new Date().toISOString().split('T')[0];

  const [workDate, setWorkDate] = useState(defaultDate);
  const [tasks, setTasks] = useState([blankTask()]);

  // Update a single field in a task
  const handleTaskChange = (index, field, value) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    setTasks(updated);
  };

  // Add a new task entry
  const addEntry = () => {
    setTasks([...tasks, blankTask()]);
  };

  // Remove a task entry
  const removeEntry = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  // Save
  const handleSave = () => {
    const payload = { workDate, tasks };
    console.log('Saving timesheet:', payload);
    // TODO: API call
    navigate('/timesheet');
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
        {tasks.map((task, idx) => (
          <TaskEntry
            key={idx}
            index={idx}
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