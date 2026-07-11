import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { BASE_URL } from "../utility/Config";
import { mapTaskData, formatDate, getStatusColor } from "../utility/dataMapper";

const formatDateTime = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch (err) {
    return value;
  }
};

const TaskUpdates = () => {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const taskFromState = location.state?.task || null;

  const [task, setTask] = useState(taskFromState ? mapTaskData(taskFromState) : null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const authConfig = useMemo(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : null;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || !taskId || !authConfig) {
        setLoading(false);
        setError("Missing project or task information");
        return;
      }

      try {
        setLoading(true);

        const taskRequest = task
          ? Promise.resolve({ data: task })
          : axios.get(`${BASE_URL}/projects/${projectId}/tasks/${taskId}`, authConfig);

        const updatesRequest = axios.get(
          `${BASE_URL}/projects/${projectId}/tasks/${taskId}/updates`,
          authConfig
        );

        const [taskRes, updatesRes] = await Promise.all([taskRequest, updatesRequest]);

        const normalizedTask = task
          ? task
          : mapTaskData(taskRes?.data?.task || taskRes?.data || null);

        setTask(normalizedTask);

        const list = updatesRes?.data?.updates || updatesRes?.data || [];
        setUpdates(Array.isArray(list) ? list : []);
        setError(null);
      } catch (err) {
        console.error("Error loading task updates", err);
        setError("Failed to load task updates");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, taskId, authConfig]);

  const statusBadge = task?.status
    ? getStatusColor(task.status)
    : "bg-gray-200 text-gray-800";

  return (
    <div className="min-h-[calc(100vh-100px)] bg-gray-100 p-4 sm:p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          {task && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className={`rounded-full px-3 py-1 font-medium ${statusBadge}`}>
                {task.status || "Status"}
              </span>
              <span className="rounded-full bg-gray-200 px-3 py-1 font-medium text-gray-700">
                Due {formatDate(task.dueDate)}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Task</p>
              <h1 className="text-xl font-semibold text-gray-900">
                {task?.description || "Task Updates"}
              </h1>
              {task?.assignedTo && (
                <p className="text-sm text-gray-500">
                  Assigned to:{task.assignedTo[0]?.name || "Unknown"}
                </p>
              )}
            </div>
            <div className="text-sm text-gray-600">
              <div>Start: {formatDate(task?.startDate)}</div>
              <div>Due: {formatDate(task?.dueDate)}</div>
              {/* <div className="mt-1 text-gray-500">Task ID: {task?._id}</div> */}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Updates</h2>
              <p className="text-xs text-gray-500">Latest progress and notes for this task</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {updates.length} entries
            </span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              Loading updates...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && updates.length === 0 && (
            <div className="rounded-lg bg-gray-50 px-4 py-6 text-sm text-gray-600">
              No updates submitted for this task yet.
            </div>
          )}

          {!loading && !error && updates.length > 0 && (
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {updates.map((item, index) => {
                try {
                  const creatorName = item?.createdByUser?.name || item?.createdBy?.name || "Unknown";
                  const firstLetter = creatorName.charAt(0).toUpperCase() || "U";
                  
                  return (
                    <div key={item.id || `update-${index}`} className="flex gap-3 rounded-xl bg-gray-50 p-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                        {firstLetter}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs text-gray-500">
                              {creatorName}
                            </p>
                          </div>
                          <p className="text-xs text-gray-400">{formatDateTime(item.date || item.createdAt)}</p>
                        </div>
                        {item.note && (
                          <p className="mt-2 text-sm text-gray-700">{item.note}</p>
                        )}
                      </div>
                    </div>
                  );
                } catch (err) {
                  console.error("Error rendering update item:", err, item);
                  return (
                    <div key={item.id || `update-${index}`} className="flex gap-3 rounded-xl bg-gray-50 p-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-gray-600 font-semibold">
                        U
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs text-gray-500">Unknown</p>
                          <p className="text-xs text-gray-400">{formatDateTime(item.date || item.createdAt)}</p>
                        </div>
                        {item.note && (
                          <p className="mt-2 text-sm text-gray-700">{item.note}</p>
                        )}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskUpdates;