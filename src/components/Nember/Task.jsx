import React, { useState, useEffect } from "react";
import Submit from "../Basic/submit";
import Pagination from "../Basic/pagination";
import { useNavigate, useParams } from "react-router-dom";
import { db, getUserFromToken } from "../../firebase";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";

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

  const currentUser = getUserFromToken();
  const currentUserId = currentUser?.id || currentUser?.uid || "";
  const currentRole = currentUser?.role?.toLowerCase() || "member";
  const isAdmin = ["admin", "sadmin", "sr_project_manager", "hr_manager"].includes(currentRole);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    const q = query(collection(db, "tasks"), where("projectId", "==", projectId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = [];
      snapshot.forEach((doc) => {
        taskList.push({ id: doc.id, ...doc.data() });
      });
      setTasks(taskList);
      setError(null);
      setLoading(false);
    }, (err) => {
      console.error("Error listening to tasks:", err);
      setError("Failed to fetch tasks");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [projectId]);

  useEffect(() => {
    let filtered = [...tasks];
    const isCurrentUser = (user) => {
      if (!user) return false;
      const currentUserEmail = currentUser?.email?.toLowerCase() || "";
      const currentUserSanitizedEmail = currentUserEmail.replace(/\./g, "_");
      if (typeof user === "object") {
        const userId = (user.id || user._id || "").toLowerCase();
        const userUid = user.uid || "";
        const userEmail = (user.email || "").toLowerCase();
        return (
          (userUid && userUid === currentUserId) ||
          (userEmail && userEmail === currentUserEmail) ||
          (userId && (userId === currentUserSanitizedEmail || userId === currentUserEmail))
        );
      }
      const val = String(user).toLowerCase();
      return (
        val === currentUserId ||
        val === currentUserEmail ||
        val === currentUserSanitizedEmail
      );
    };

    if (taskFilter === "me") {
      filtered = tasks.filter((task) => {
        if (!task.assignedTo) return false;
        if (Array.isArray(task.assignedTo)) {
          return task.assignedTo.some(isCurrentUser);
        }
        return isCurrentUser(task.assignedTo);
      });
    }

    setFilteredTasks(filtered);
    setCurrentPage(1);
  }, [taskFilter, tasks, currentUserId]);

  const statusColor = {
    Completed: "text-green-600 bg-green-100",
    "In Progress": "text-yellow-600 bg-yellow-100",
    "Not Started": "text-red-600 bg-red-100",
    Pending: "text-orange-600 bg-orange-100",
  };

  const calculateStatus = (task) => {
    if (task.status === "Completed") return "Completed";
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

  const handleSubmitTask = async (taskId, description) => {
    try {
      const creatorName = currentUser?.name || "Unknown Member";
      const creatorEmail = currentUser?.email || "";
      const creatorUid = currentUser?.id || currentUser?.uid || "";
      if (popupMode === "Submit") {
        await updateDoc(doc(db, "tasks", taskId), { status: "Completed" });
        await addDoc(collection(db, "submissions"), {
          taskId,
          projectId,
          note: description,
          submittedBy: { name: creatorName, email: creatorEmail, uid: creatorUid },
          submittedAt: new Date().toISOString(),
          status: "Completed"
        });
      } else {
        await addDoc(collection(db, "updates"), {
          taskId,
          projectId,
          createdByUser: { name: creatorName, email: creatorEmail },
          createdAt: new Date().toISOString(),
          note: description,
          status: selectedTask?.status || "In Progress"
        });
      }
      console.log(`Task ${popupMode === "Submit" ? "submitted" : "updated"} successfully`);
    } catch (err) {
      console.error("Error submitting/updating task:", err);
      alert("Failed to submit update: " + err.message);
    }
    setPopupOpen(false);
  };

  const totalPages = Math.ceil(filteredTasks.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + rowsPerPage);

  const isTaskAssignedToUser = (task) => {
    if (!currentUser) return false;
    const currentEmail = currentUser.email || "";
    const currentUserId = currentUser.id || currentUser.uid || "";
    const currentSanitizedEmail = currentEmail.replace(/\./g, "_");
    return (
      task.assignedTo &&
      (Array.isArray(task.assignedTo)
        ? task.assignedTo.some((user) => {
            if (typeof user === "object") {
              const uEmail = user.email || (user.id && user.id.includes("@") ? user.id : "");
              const uSanitizedEmail = user.id || "";
              return (
                (user.uid && user.uid === currentUserId) ||
                (uEmail && uEmail.toLowerCase() === currentEmail.toLowerCase()) ||
                (uSanitizedEmail && uSanitizedEmail.toLowerCase() === currentSanitizedEmail.toLowerCase())
              );
            }
            return (
              user === currentUserId ||
              user === currentEmail ||
              user === currentSanitizedEmail
            );
          })
        : false)
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
      <div className="mt-4 flex justify-center">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
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
