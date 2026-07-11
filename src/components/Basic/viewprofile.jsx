import React, { useState } from "react";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export default function TableCal({ isOpen, onClose, onSelect }) {
  const today = new Date();

  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);

  if (!isOpen) return null;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  let calendar = [];
  for (let i = 0; i < firstDay; i++) calendar.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendar.push(d);

  const handleDone = () => {
    if (selectedDate) {
      onSelect(new Date(year, month, selectedDate));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-50">
      <div className="bg-white p-4 rounded-2xl shadow-lg w-[320px]">

        {/* Month / Year Row */}
        <div className="flex justify-between mb-3">
          <select
            className="border rounded-lg px-2 py-1"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {months.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

          <select
            className="border rounded-lg px-2 py-1"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <option key={i} value={year - 5 + i}>{year - 5 + i}</option>
            ))}
          </select>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 text-center text-gray-500 mb-1">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendar.map((day, idx) => (
            <div
              key={idx}
              onClick={() => day && setSelectedDate(day)}
              className={`
                h-9 flex justify-center items-center rounded-lg cursor-pointer
                ${selectedDate === day ? "bg-blue-500 text-white" : "hover:bg-blue-100"}
              `}
            >
              {day || ""}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded-lg text-gray-600"
          >
            Cancel
          </button>

          <button
            onClick={handleDone}
            className="px-3 py-1 rounded-lg bg-blue-600 text-white"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}