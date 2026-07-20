import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

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

const TaskUpdates = () => {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Attempt to retrieve task from navigation state (common in single-page apps)
  const taskFromState = location.state?.task || null;

  const [task, setTask] = useState(taskFromState ? taskFromState : null);
  const [project, setProject] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real task, project, and update log data from Firestore
  const fetchData = async () => {
    if (!taskId) {
      setError("Task ID is missing");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch parent project details
      if (projectId) {
        const projectDoc = await getDoc(doc(db, "projects", projectId));
        if (projectDoc.exists()) {
          setProject({ id: projectDoc.id, ...projectDoc.data() });
        }
      }

      // 2. Fetch task details from database
      const taskDoc = await getDoc(doc(db, "tasks", taskId));
      if (taskDoc.exists()) {
        setTask({ id: taskDoc.id, ...taskDoc.data() });
      } else if (taskFromState) {
        setTask(taskFromState);
      } else {
        setError("Task details not found");
        setLoading(false);
        return;
      }

      // 3. Fetch updates associated with this task
      const q = query(
        collection(db, "updates"),
        where("taskId", "==", taskId)
      );
      const querySnapshot = await getDocs(q);
      const updatesList = [];
      querySnapshot.forEach((doc) => {
        updatesList.push({ id: doc.id, ...doc.data() });
      });

      // Sort client-side by date descending
      updatesList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setUpdates(updatesList);
    } catch (err) {
      console.error("Error loading task data:", err);
      setError("Failed to load task details and updates");
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

        {/* Breadcrumb Hierarchy */}
        {project && (
          <nav className="text-xs text-gray-500 flex items-center gap-2 px-1">
            <span className="hover:underline cursor-pointer" onClick={() => navigate('/projects')}>Projects</span>
            <span>/</span>
            <span className="hover:underline cursor-pointer" onClick={() => navigate(`/projects/${projectId}`)}>{project.title}</span>
            <span>/</span>
            <span className="font-semibold text-gray-700">Tasks</span>
            <span>/</span>
            <span className="font-semibold text-gray-700 truncate max-w-[200px]">{task?.description || "Task"}</span>
            <span>/</span>
            <span className="text-gray-400">Updates</span>
          </nav>
        )}

        {/* Task Detail Card */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {project && (
                <div className="mb-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
                  Project: {project.title}
                </div>
              )}
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