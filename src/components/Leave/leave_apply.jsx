import React, { useState, useRef } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../utility/Config';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ChevronDown,
  Info,
  X,
  Upload
} from 'lucide-react';
import PendingList from './leave_pending';
import HistoryList from './leave_history';

const LeaveManagement = () => {
  // --- State ---
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(2025, 6, 1)); // July 2025
  const [activeTab, setActiveTab] = useState('Apply');
  const [selectedDay, setSelectedDay] = useState(15); // Matches image highlight
  const [leaveType, setLeaveType] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const leaveBalances = [
    { title: 'Planned Leave', total: 3, consumed: 0 },
    { title: 'Sick Leave', total: 3, consumed: 0 },
    { title: 'Casual Leave', total: 3, consumed: 0 },
    { title: 'Special Leave', total: 0, consumed: 0 },
    { title: 'Work From Home', total: 3, consumed: 0 },
    { title: 'Loss of Pay', total: 0, consumed: 0 },
  ];

  const leaveTypes = [
    'Planned Leave',
    'Sick Leave',
    'Casual Leave',
    'Special Leave',
    'Work From Home',
    'Loss of Pay',
  ];

  // --- Calendar Logic ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarCells = [];

  // Previous month filler
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarCells.push({ day: daysInPrevMonth - i, type: 'prev' });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({ day: i, type: 'current' });
  }
  // Next month filler
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

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.post(`${BASE_URL}/notifications/requests`, {
        requestType: 'leave_request',
        title: leaveType || 'Leave Request',
        leaveType,
        fromDate: dateRange.from,
        toDate: dateRange.to,
        description,
        attachmentUrl: attachment?.url || null,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setLeaveType('');
      setDescription('');
      setAttachment(null);
      setDateRange({ from: '', to: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert('Leave request submitted');
    } catch (error) {
      console.error('Leave submit error:', error);
      alert(error.response?.data?.msg || 'Failed to submit leave request');
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
                key={item.title}
                className="bg-sky-50 rounded-[1.5rem] p-5 flex flex-col items-center justify-center text-center aspect-[4/3] sm:aspect-auto sm:h-36 transition hover:shadow-sm"
              >
                <span className="text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  {item.title}
                </span>
                <span className="text-3xl font-bold text-gray-900">
                  {item.total}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  Consumed:{item.consumed}
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
                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Duration
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="dd/mm/yyyy"
                        value={dateRange.from}
                        onChange={(e) =>
                          setDateRange({ ...dateRange, from: e.target.value })
                        }
                        className="w-full border border-gray-200 rounded-xl pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                      <CalendarIcon
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="dd/mm/yyyy"
                        value={dateRange.to}
                        onChange={(e) =>
                          setDateRange({ ...dateRange, to: e.target.value })
                        }
                        className="w-full border border-gray-200 rounded-xl pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                      <CalendarIcon
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                    </div>
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
                    <Info
                      size={16}
                      className="absolute right-3 bottom-3 text-gray-400"
                    />
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
                          <img
                            src={attachment.url}
                            alt="attachment"
                            className="w-full h-full object-cover"
                          />
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
                {/* Invisible spacer to align with date inputs on large screens */}
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
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowDropdown(false)}
                      />
                      <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl py-1 max-h-60 overflow-auto">
                        {leaveTypes.map((type) => (
                          <div
                            key={type}
                            onClick={() => {
                              setLeaveType(type);
                              setShowDropdown(false);
                            }}
                            className="px-4 py-2.5 text-sm text-gray-700 hover:bg-sky-50 cursor-pointer transition"
                          >
                            {type}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button className="px-8 py-2.5 rounded-full border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
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

        {/* Placeholder for other tabs */}
        {activeTab === 'Pending' && (
          <div className="text-center py-20 text-gray-400 text-sm">
           <PendingList/>
          </div>
        )}
        {activeTab === 'History' && (
          <div className="text-center py-20 text-gray-400 text-sm">
            <HistoryList/>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveManagement;