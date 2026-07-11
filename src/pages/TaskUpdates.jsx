import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

// ─── Local Helper Functions (Replaces dataMapper utils) ─────────────
const getStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  switch (true) {
    case s.includes('completed'): return "bg-green-100 text-green-800";
    case s.includes('progress') || s.includes('in progress'): return "bg-yellow-100 text-yellow-800";
    case s.includes('pending') || s.includes('draft'): return "bg-blue-100 text-blue-800";
    case s.includes('failed'): return "bg-red-100 text-red-800";
    default: return "bg-gray-200 text-gray-800";
  }
};

const formatDate = (value) => {
  if (!value) return "";
  try {
    // Handle ISO strings or timestamps
    const d = new Date(value);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (err) {
    return value;
  }
};

const formatDateTime = (value) => {
  if (!value) return "";
  try {
    const d = new Date(value);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (err) {
    return value;
  }
};

// ─── Mock Data Generator ───────────────────────────────────────────
const getMockTask = (id) => {
  // Generate deterministic mock data based on ID length to vary appearance slightly
  const isBigProject = id.length > 5;
  
  return {
    id: id,
    description: `${isBigProject ? "Website Redesign Phase 2" : "Fix Login Bug"} - ${new Date().getFullYear()}`,
    status: ["Completed", "In Progress", "Pending"][Math.floor(Math.random() * 3)],
    startDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    dueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    assignedTo: [
      {
        id: "user-1",
        name: ["Alice Johnson", "Bob Smith", "Charlie Davis"][Math.floor(Math.random() * 3)]
      }
    ],
    priority: Math.random() > 0.5 ? "High" : "Medium",
    notes: "Client feedback pending for final approval."
  };
};

const getMockUpdates = (taskId, count = 5) => {
  const updates = [];
  const users = [
    { name: "Alice Johnson", color: "blue" },
    { name: "Bob Smith", color: "purple" },
    { name: "Charlie Davis", color: "green" },
    { name: "Diana Prince", color: "orange" }
  ];

  for (let i = 0; i < count; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const daysAgo = i * 2;
    const updateDate = new Date(Date.now() - daysAgo * 86400000);
    
    updates.push({
      id: `upd-${taskId}-${i}`,
      createdByUser: { name: user.name },
      createdAt: updateDate.toISOString(),
      note: `This is mock update number ${count - i}. Work has been completed on the assigned section.`,
    });
  }
  return updates;
};

const TaskUpdates = () => {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Attempt to retrieve task from navigation state (common in single-page apps)
  const taskFromState = location.state?.task || null;

  const [task, setTask] = useState(taskFromState ? taskFromState : null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Simulate data fetching
  const fetchData = async () => {
    if (!taskId) {
      setError("Task ID is missing");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Determine data source: State (passed via navigation) > Local Mock
      const sourceTask = taskFromState || getMockTask(taskId);
      
      setTask(sourceTask);
      setUpdates(getMockUpdates(taskId));
    } catch (err) {
      console.error("Error loading task data", err);
      setError("Failed to load task details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId, taskId]);

  // Render Helpers
  const statusBadgeClass = useMemo(() => getStatusColor(task?.status), [task?.status]);

  return (
    <div className="min-h-[calc(100vh-100px)] bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          
          {task && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className={`rounded-full px-3 py-1 font-medium ${statusBadgeClass}`}>
                {task.status || "Status"}
              </span>
              <span className="rounded-full bg-white shadow-sm border border-gray-200 px-3 py-1 font-medium text-gray-700">
                Due {formatDate(task.dueDate)}
              </span>
            </div>
          )}
        </div>

        {/* Task Detail Card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Task</p>
              <h1 className="text-xl font-semibold text-gray-900 mt-1">
                {task?.description || "Task Updates"}
              </h1>
              
              {task?.assignedTo && task.assignedTo.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Assigned to: {task.assignedTo[0]?.name || "Unknown Member"}
                </p>
              )}
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <div>Start: {formatDate(task?.startDate)}</div>
              <div>Due: {formatDate(task?.dueDate)}</div>
            </div>
          </div>
        </div>

        {/* Updates Section */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Updates</h2>
              <p className="text-xs text-gray-500">Latest progress and notes for this task</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {updates.length} entries
            </span>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-500">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <span>Loading updates...</span>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-4 text-sm text-red-600 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
              {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && updates.length === 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-6 py-12 text-center">
              <p className="text-sm text-gray-500">No updates submitted for this task yet.</p>
            </div>
          )}

          {/* Update List */}
          {!loading && !error && updates.length > 0 && (
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
              {updates.map((item, index) => {
                // Fallbacks for robustness
                const creatorName = item?.createdByUser?.name || item?.createdBy?.name || "Anonymous";
                const firstLetter = creatorName.charAt(0).toUpperCase();

                return (
                  <div key={item.id || `update-${index}`} className="group flex gap-3 rounded-xl bg-gray-50 border border-gray-100 p-4 transition-all hover:shadow-md hover:bg-white">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-lg shadow-inner">
                      {firstLetter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                        <div>
                          <p className="text-xs font-semibold text-gray-900">
                            {creatorName}
                          </p>
                          <p className="text-[10px] text-gray-400">updated this task</p>
                        </div>
                        <p className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(item.createdAt)}</p>
                      </div>
                      
                      {item.note && (
                        <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }
      `}</style>
    </div>
  );
};

export default TaskUpdates;