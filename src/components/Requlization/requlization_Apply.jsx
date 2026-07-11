import React, { useState, useRef } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../utility/Config';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  X,
  Upload,
  Plus,
  User,
} from 'lucide-react';
import ReguPendingList from './requlization_Pending';
import ReguHistoryList from './requlization_History';

const RegularizationWindow = () => {
  // --- State ---
  const [currentDate, setCurrentDate] = useState(new Date(2025, 6, 1)); // July 2025
  const [activeTab, setActiveTab] = useState('Apply');
  const [selectedDay, setSelectedDay] = useState(15);
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Mock data for the new cards
  const regularizationBalances = [
    { title: 'Regularization', total: 3, consumed: 0 },
    { title: 'Special', total: 0, consumed: 0 },
    { title: 'Loss of Pay', total: 0, consumed: 0 },
  ];

  // --- Calendar Logic ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
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
        requestType: 'regularization_request',
        title: 'Regularization Request',
        fromDate: dateRange.from,
        toDate: dateRange.to,
        description,
        attachmentUrl: attachment?.url || null,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDescription('');
      setAttachment(null);
      setDateRange({ from: '', to: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert('Regularization request submitted');
    } catch (error) {
      console.error('Regularization submit error:', error);
      alert(error.response?.data?.msg || 'Failed to submit regularization request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
      {/* Main Container with Blue Border */}
      <div className="w-full max-w-7xl bg-white rounded-3xl border-4 border-sky-500 shadow-2xl overflow-hidden">
        <div className="p-6 md:p-10 space-y-8">
          
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
                <h2 className="text-xl font-bold text-gray-800">
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
                        ? 'bg-gray-900 text-white font-semibold shadow-md' // Black dot style
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

            {/* --- Regularization Balance Cards --- */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4 content-start">
              {regularizationBalances.map((item) => (
                <div
                  key={item.title}
                  className="bg-sky-100 rounded-2xl p-5 flex flex-col items-center justify-center text-center h-36 sm:h-40 transition hover:shadow-md"
                >
                  <span className="text-sm font-medium text-gray-700 mb-2">
                    {item.title}
                  </span>
                  <span className="text-3xl font-bold text-gray-900">
                    {item.total}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-1">
                    Consumed: {item.consumed}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ================= TABS ================= */}
          <div className="flex justify-center">
            <div className="inline-flex bg-sky-100/50 rounded-full p-1 border border-sky-200">
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
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* Duration Inputs */}
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
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
                    placeholder="Enter description..."
                  />
                  <Info
                    size={16}
                    className="absolute right-3 bottom-3 text-gray-400"
                  />
                </div>
              </div>

              {/* Apply To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Apply to
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                      <User size={18} className="text-gray-400" />
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-5 h-5 bg-sky-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-sky-600 transition">
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="text-sm text-gray-500">Add recipient</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-6">
                <button className="px-8 py-2.5 rounded-full border border-sky-500 text-sky-500 text-sm font-medium hover:bg-sky-50 transition">
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
              <ReguPendingList/>
            </div>
          )}
          {activeTab === 'History' && (
            <div className="text-center py-20 text-gray-400 text-sm">
              <ReguHistoryList/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegularizationWindow;