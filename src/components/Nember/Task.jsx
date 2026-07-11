import React, { useState, useEffect } from "react";
import Submit from "../Basic/submit";
import Pagination from "../Basic/pagination";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { BASE_URL } from "../../utility/Config";
import { mapTaskData, formatDate } from "../../utility/dataMapper";

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
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // ⭐ PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // ⭐ GET CURRENT USER ID
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(payload.id || payload._id);
        setIsAdmin(payload.role === "admin" || payload.role === "sadmin");
      } catch (err) {
        console.error("Error parsing token:", err);
      }
    }
  }, []);

  // ⭐ FETCH TASKS FROM API
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        
        if (!token || !projectId) {
          setError("Missing authentication or project ID");
          setLoading(false);
          return;
        }

        const res = await axios.get(`${BASE_URL}/projects/${projectId}/tasks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Map API tasks to frontend format
        const mappedTasks = (res.data.tasks || res.data || []).map(mapTaskData);
        setTasks(mappedTasks);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        setError("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchTasks();
    }
  }, [projectId]);

  // ⭐ FILTER TASKS BASED ON taskFilter PROP
  useEffect(() => {
    let filtered = [...tasks];

    if (taskFilter === "me") {
      // Get user ID from JWT token
      const token = localStorage.getItem("token");
      let userId = null;
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          userId = payload.id || payload._id;
        } catch (err) {
          console.error("Error parsing token:", err);
        }
      }

      if (userId) {
        filtered = tasks.filter(
          (task) =>
            task.assignedTo &&
            (Array.isArray(task.assignedTo)
              ? task.assignedTo.some(user => {
                  // Handle both user objects and user IDs
                  if (typeof user === 'object') {
                    return (user.id || user._id) === userId;
                  }
                  return user === userId;
                })
              : (typeof task.assignedTo === 'object' 
                  ? (task.assignedTo.id || task.assignedTo._id) === userId
                  : task.assignedTo === userId))
        );
      }
    }

    setFilteredTasks(filtered);
    setCurrentPage(1); // Reset to first page when filter changes
  }, [taskFilter, tasks]);

  // ⭐ STATUS COLOR MAPPING (matches API status values)
  const statusColor = {
    Completed: "text-green-600 bg-green-100",
    "In Progress": "text-yellow-600 bg-yellow-100",
    "Not Started": "text-red-600 bg-red-100",
    Pending: "text-orange-600 bg-orange-100",
  };

  // ⭐ CALCULATE DYNAMIC STATUS BASED ON DATES
  const calculateStatus = (task) => {
    // If already marked as Completed by admin, keep it Completed
    if (task.status === "Completed") {
      return "Completed";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = task.startDate ? new Date(task.startDate) : null;
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;

    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
    }
    if (dueDate) {
      dueDate.setHours(0, 0, 0, 0);
    }

    // If start date is in the future → Not Started
    if (startDate && today < startDate) {
      return "Not Started";
    }

    // If due date has passed → Pending
    if (dueDate && today > dueDate) {
      return "Pending";
    }

    // If between start date and due date → In Progress
    if (startDate && dueDate && today >= startDate && today <= dueDate) {
      return "In Progress";
    }

    // Default to Not Started
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

  // ⭐ HANDLE TASK ACTIONS (updates vs final submit)
  const handleSubmitTask = async (taskId, description) => {
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.error("No authentication token");
        return;
      }

      const commonHeaders = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      if (popupMode === "Submit") {
        // Final submission: mark task as completed AND create an update entry
        const res = await axios.put(
          `${BASE_URL}/projects/${projectId}/tasks/${taskId}`,
          { 
            status: "Completed",
            submissionNotes: description,
          },
          commonHeaders
        );

        // Also create an update entry so it appears in the updates history
        await axios.post(
          `${BASE_URL}/projects/${projectId}/tasks/${taskId}/updates`,
          {
            status: "Completed",
            note: description,
            date: new Date(),
          },
          commonHeaders
        );

        // Update local task list to reflect completion
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === taskId ? { ...task, status: "Completed" } : task
          )
        );

        console.log("Task marked as completed:", res.data);
      } else {
        // Regular update: add an update entry without closing the task
        const currentStatus = selectedTask?.status || "In Progress";
        await axios.post(
          `${BASE_URL}/projects/${projectId}/tasks/${taskId}/updates`,
          {
            status: currentStatus,
            note: description,
            date: new Date(),
          },
          commonHeaders
        );
        console.log("Task update added");
      }
    } catch (err) {
      console.error("Error submitting task:", err);
    }
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
        ? task.assignedTo.some(user => {
            // Handle both user objects and user IDs
            if (typeof user === 'object') {
              return (user.id || user._id) === currentUserId;
            }
            return user === currentUserId;
          })
        : (typeof task.assignedTo === 'object' 
            ? (task.assignedTo.id || task.assignedTo._id) === currentUserId
            : task.assignedTo === currentUserId))
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
                className={`bg-white text-sm text-gray-800 rounded-lg shadow-sm`}
              >
                <td className="px-4 lg:px-6 py-5 rounded-l-lg">
                  <button
                    type="button"
                    disabled={!canAccessTask}
                    className={`text-left w-full ${
                      canAccessTask 
                        ? "hover:text-blue-600 cursor-pointer" 
                        : ""
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