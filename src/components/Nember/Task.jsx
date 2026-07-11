import React, { useState, useEffect } from "react";
import Submit from "../Basic/submit";
import Pagination from "../Basic/pagination";
import { useNavigate, useParams } from "react-router-dom";

// ─── Mock Data ───────────────────────────────────────────────
const CURRENT_USER_ID = "1"; // mock logged-in user

const MOCK_TASKS = [
  {
    id: "t1",
    description: "Design homepage hero section",
    assignedTo: [{ id: "1", name: "Olivia Martin" }],
    startDate: "2026-04-10",
    dueDate: "2026-06-25",
    status: "In Progress",
  },
  {
    id: "t2",
    description: "Implement user authentication flow",
    assignedTo: [{ id: "2", name: "Jackson Lee" }],
    startDate: "2026-04-05",
    dueDate: "2026-06-30",
    status: "In Progress",
  },
  {
    id: "t3",
    description: "Create color palette & typography guide",
    assignedTo: [{ id: "3", name: "Sophia Brown" }],
    startDate: "2026-03-01",
    dueDate: "2026-03-20",
    status: "Completed",
  },
  {
    id: "t4",
    description: "Set up CI/CD pipeline",
    assignedTo: [{ id: "2", name: "Jackson Lee" }],
    startDate: "2026-07-01",
    dueDate: "2026-07-10",
    status: "Not Started",
  },
  {
    id: "t5",
    description: "Fix navigation responsiveness on mobile",
    assignedTo: [{ id: "1", name: "Olivia Martin" }],
    startDate: "2026-03-15",
    dueDate: "2026-04-01",
    status: "In Progress",
  },
  {
    id: "t6",
    description: "Write API documentation",
    assignedTo: [{ id: "4", name: "Ethan Wilson" }],
    startDate: "2026-04-01",
    dueDate: "2026-04-05",
    status: "In Progress",
  },
  {
    id: "t7",
    description: "Conduct usability testing sessions",
    assignedTo: [{ id: "5", name: "Ava Johnson" }],
    startDate: "2026-07-05",
    dueDate: "2026-07-20",
    status: "Not Started",
  },
  {
    id: "t8",
    description: "Optimize image assets for web",
    assignedTo: [{ id: "3", name: "Sophia Brown" }],
    startDate: "2026-02-10",
    dueDate: "2026-02-28",
    status: "Completed",
  },
];

// ─── Local date formatter ────────────────────────────────────
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
};

const Task = ({ projectId: propProjectId, taskFilter = "all" }) => {
  const { projectId: paramProjectId } = useParams();
  const projectId = propProjectId || paramProjectId;
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMode, setPopupMode] = useState("Update");
  const [selectedTask, setSelectedTask] = useState(null);

  // Frontend-only: mock current user & admin flag
  const currentUserId = CURRENT_USER_ID;
  const isAdmin = true;

  // ⭐ PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // ⭐ LOAD MOCK TASKS (simulates fetch delay)
  useEffect(() => {
    setLoading(true);

    const timer = setTimeout(() => {
      setTasks(MOCK_TASKS);
      setError(null);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [projectId]);

  // ⭐ FILTER TASKS BASED ON taskFilter PROP
  useEffect(() => {
    let filtered = [...tasks];

    if (taskFilter === "me") {
      filtered = tasks.filter(
        (task) =>
          task.assignedTo &&
          (Array.isArray(task.assignedTo)
            ? task.assignedTo.some((user) => {
                if (typeof user === "object") {
                  return (user.id || user._id) === currentUserId;
                }
                return user === currentUserId;
              })
            : typeof task.assignedTo === "object"
              ? (task.assignedTo.id || task.assignedTo._id) === currentUserId
              : task.assignedTo === currentUserId)
      );
    }

    setFilteredTasks(filtered);
    setCurrentPage(1); // Reset to first page when filter changes
  }, [taskFilter, tasks, currentUserId]);

  // ⭐ STATUS COLOR MAPPING
  const statusColor = {
    Completed: "text-green-600 bg-green-100",
    "In Progress": "text-yellow-600 bg-yellow-100",
    "Not Started": "text-red-600 bg-red-100",
    Pending: "text-orange-600 bg-orange-100",
  };

  // ⭐ CALCULATE DYNAMIC STATUS BASED ON DATES
  const calculateStatus = (task) => {
    if (task.status === "Completed") {
      return "Completed";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = task.startDate ? new Date(task.startDate) : null;
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;

    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (dueDate) dueDate.setHours(0, 0, 0, 0);

    if (startDate && today < startDate) return "Not Started";
    if (dueDate && today > dueDate) return "Pending";
    if (startDate && dueDate && today >= startDate && today <= dueDate)
      return "In Progress";

    return "Not Started";
  };

  const openPopup = (task, type) => {
    setSelectedTask(task);
    setPopupTitle(`${type} - ${task.description}`);
    setPopupMode(type);
    setPopupOpen(true);
  };

  const goToUpdatesPage = (task) => {
    if (!projectId || !task?.id) return;
    navigate(`/projects/${projectId}/tasks/${task.id}/updates`, { state: { task } });
  };

  // ⭐ HANDLE TASK ACTIONS (frontend-only, updates local state)
  const handleSubmitTask = (taskId, description) => {
    if (popupMode === "Submit") {
      // Final submission: mark task as completed locally
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, status: "Completed" } : task
        )
      );
      console.log("Task marked as completed (mock):", { taskId, description });
    } else {
      // Regular update: just log it (updates page uses its own mock data)
      console.log("Task update added (mock):", {
        taskId,
        status: selectedTask?.status || "In Progress",
        note: description,
        date: new Date(),
      });
    }

    setPopupOpen(false);
  };

  // ⭐ PAGINATION LOGIC
  const totalPages = Math.ceil(filteredTasks.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + rowsPerPage);

  // ⭐ CHECK IF TASK IS ASSIGNED TO CURRENT USER
  const isTaskAssignedToUser = (task) => {
    if (!currentUserId) return false;

    return (
      task.assignedTo &&
      (Array.isArray(task.assignedTo)
        ? task.assignedTo.some((user) => {
            if (typeof user === "object") {
              return (user.id || user._id) === currentUserId;
            }
            return user === currentUserId;
          })
        : typeof task.assignedTo === "object"
          ? (task.assignedTo.id || task.assignedTo._id) === currentUserId
          : task.assignedTo === currentUserId)
    );
  };

  if (loading) {
    return (
      <div className="w-full p-6 flex justify-center items-center">
        <p className="text-gray-600">Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 flex justify-center items-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (filteredTasks.length === 0) {
    return (
      <div className="w-full p-6 flex justify-center items-center">
        <p className="text-gray-600">No tasks found</p>
      </div>
    );
  }

  return (
    <div className="w-full p-3 sm:p-4 lg:py-6">

      {/* TABLE */}
      <div className="overflow-x-auto w-full">
        <table className="w-full table-auto border-separate border-spacing-y-3 min-w-[900px]">
          <thead>
            <tr className="text-left text-sm font-semibold text-gray-600 bg-white">
              <th className="px-4 lg:px-6 py-4 rounded-l-lg">Title</th>
              <th className="px-4 lg:px-6 py-4">Assigned to</th>
              <th className="px-4 lg:px-6 py-4">Start Date</th>
              <th className="px-4 lg:px-6 py-4">Due Date</th>
              <th className="px-4 lg:px-6 py-4">Status</th>
              <th className="px-4 lg:px-6 py-4">Updates</th>
              <th className="px-4 lg:px-6 py-4 rounded-r-lg">Submit</th>
            </tr>
          </thead>

          <tbody>
            {paginatedTasks.map((task) => {
              const assignedToUser = isTaskAssignedToUser(task);
              const canAccessTask = isAdmin || assignedToUser;
              return (
                <tr
                  key={task.id}
                  className="bg-white text-sm text-gray-800 rounded-lg shadow-sm"
                >
                  <td className="px-4 lg:px-6 py-5 rounded-l-lg">
                    <button
                      type="button"
                      disabled={!canAccessTask}
                      className={`text-left w-full ${
                        canAccessTask ? "hover:text-blue-600 cursor-pointer" : ""
                      }`}
                      onClick={() => canAccessTask && goToUpdatesPage(task)}
                    >
                      {task.description}
                    </button>
                  </td>

                  <td className="px-4 lg:px-6 py-5">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://i.pravatar.cc/150?img=${Math.abs(
                          (task.id || "1").toString().charCodeAt(0)
                        ) % 100}`}
                        alt="Assignee"
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="truncate">
                        {Array.isArray(task.assignedTo) && task.assignedTo.length > 0
                          ? typeof task.assignedTo[0] === "object"
                            ? task.assignedTo[0]?.name || "Unassigned"
                            : task.assignedTo[0]
                          : "Unassigned"}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 lg:px-6 py-5 text-gray-600">
                    {formatDate(task.startDate)}
                  </td>

                  <td className="px-4 lg:px-6 py-5 text-gray-600">
                    {formatDate(task.dueDate)}
                  </td>

                  <td className="px-4 lg:px-6 py-5">
                    <span
                      className={`text-xs font-medium px-2 py-1 border rounded-full ${
                        statusColor[calculateStatus(task)] || "text-gray-600 bg-gray-100"
                      }`}
                    >
                      {calculateStatus(task)}
                    </span>
                  </td>

                  {/* UPDATE BUTTON */}
                  <td className="px-4 lg:px-6 py-5">
                    <button
                      disabled={!canAccessTask}
                      onClick={() => canAccessTask && openPopup(task, "Update")}
                      className={`text-sm px-3 py-1 rounded-full transition ${
                        canAccessTask
                          ? "text-blue-500 border border-blue-500 hover:bg-blue-50 cursor-pointer"
                          : ""
                      }`}
                    >
                      Updates
                    </button>
                  </td>

                  {/* SUBMIT BUTTON */}
                  <td className="px-4 lg:px-6 py-5">
                    <button
                      disabled={!canAccessTask}
                      onClick={() => canAccessTask && openPopup(task, "Submit")}
                      className={`text-sm px-3 py-1 rounded-full transition ${
                        canAccessTask
                          ? "text-blue-500 border border-blue-500 hover:bg-blue-50 cursor-pointer"
                          : ""
                      }`}
                    >
                      Submit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="mt-4 flex justify-center">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* POPUP */}
      <Submit
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        title={popupTitle}
        taskId={selectedTask?.id}
        onSubmitTask={handleSubmitTask}
      />
    </div>
  );
};

export default Task;