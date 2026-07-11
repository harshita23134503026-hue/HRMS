import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Pencil, Copy, Trash2 } from 'lucide-react';

// ─── Mock entry data ───
const mockEntries = [
  {
    id: 1,
    title: 'Project Scope Documentation',
    description:
      'Prepared the project presentation deck, documented the proposed scope, and discussed the project deliverables, milestones, and implementation plan with the team.',
    description2:
      'Prepared project presentation deck and finalized project scope discussion.',
    duration: '1h 20m',
    category: 'Documentation',
    location: 'Office',
    source: 'MANUAL',
    startTime: '16:20',
    endTime: '17:40',
    workSummary:
      'Prepared project presentation deck and finalized project scope discussion.',
  },
  {
    id: 2,
    title: 'New Project Discussion',
    description:
      'Participated in a meeting regarding the new project, discussing objectives, requirements, implementation approach, timelines, and deliverables.',
    description2:
      'Attended project planning meeting and discussed project requirements.',
    duration: '2h 40m',
    category: 'Meeting',
    location: 'Office',
    source: 'MANUAL',
    startTime: '13:10',
    endTime: '15:50',
    workSummary:
      'Attended project planning meeting and discussed project requirements.',
  },
];

// ─── Single Entry Card ───
const EntryCard = ({ entry }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-5 space-y-3">
      {/* Row 1: Title + Duration badge + Action icons */}
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-bold text-gray-900">{entry.title}</h4>
        <div className="flex items-center gap-3">
          <span className="border border-green-400 text-green-600 text-xs font-semibold px-3 py-1 rounded-md">
            {entry.duration}
          </span>
          <button className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition">
            <Pencil size={15} />
          </button>
          <button className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition">
            <Copy size={15} />
          </button>
          <button className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Row 2: Description lines */}
      <p className="text-xs text-gray-600 leading-relaxed">{entry.description}</p>
      <p className="text-xs text-gray-600 leading-relaxed">{entry.description2}</p>

      {/* Row 3: Tags + Time info */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category tag */}
        <span className="border border-blue-400 text-blue-600 text-xs font-medium px-3 py-1 rounded-md">
          {entry.category}
        </span>
        {/* Location tag */}
        <span className="border border-blue-400 text-blue-600 text-xs font-medium px-3 py-1 rounded-md">
          {entry.location}
        </span>
        {/* Source tag (filled) */}
        <span className="bg-blue-500 text-white text-xs font-medium px-3 py-1 rounded-md">
          Source: {entry.source}
        </span>
        {/* Time details */}
        <span className="text-xs text-gray-500 ml-2">
          Start Time : <span className="text-gray-700 font-medium">{entry.startTime}</span>
        </span>
        <span className="text-xs text-gray-500">
          End Time : <span className="text-gray-700 font-medium">{entry.endTime}</span>
        </span>
        <span className="text-xs text-gray-500">
          Duration : <span className="text-gray-700 font-medium">{entry.duration}</span>
        </span>
      </div>

      {/* Row 4: Work Summary box */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-500 mb-1">Work Summary :</p>
        <p className="text-xs text-gray-700">{entry.workSummary}</p>
      </div>
    </div>
  );
};

// ─── Main Modal Component ───
const DayDetailsModal = ({ standalone = false }) => {
  const navigate = useNavigate();
  const { date } = useParams();

  const handleClose = () => {
    if (standalone) {
      navigate('/timesheet');
    } else {
      navigate(-1);
    }
  };

  // Summary data
  const employeeName = 'Mahindra Nilesh';
  const totalHours = '6h 40m';
  const totalEntries = mockEntries.length;
  const workDate = date || '2026-07-01';

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
          <span className="text-sm font-semibold text-gray-800 ml-2">{employeeName}</span>
        </div>
        <div className="border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-500">Total Hours :</span>
          <span className="text-sm font-semibold text-gray-800 ml-2">{totalHours}</span>
        </div>
        <div className="border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-500">Total Entries :</span>
          <span className="text-sm font-semibold text-gray-800 ml-2">{totalEntries}</span>
        </div>
        <div className="border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-xs text-gray-500">Work Date :</span>
          <span className="text-sm font-semibold text-gray-800 ml-2">{workDate}</span>
        </div>
      </div>

      {/* ═══════ SCROLLABLE BODY ═══════ */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <h3 className="text-sm font-bold text-gray-900">Entry Details :</h3>

        {mockEntries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
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
      <div onClick={(e) => e.stopPropagation()}>{content}</div>
    </div>
  );
};

export default DayDetailsModal;