import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import Nember from "../Nember/Nember";
import Task from "../Nember/Task";
import Submit from "../Basic/submit";
import AssignTask from "../../pages/AssignTask";

// ─── Mock Data ───────────────────────────────────────────────
const MOCK_PROJECT = {
  id: "1",
  projectName: "Website Redesign",
  description:
    "Complete overhaul of the company website including a new design system, improved performance, and accessibility upgrades.",
  startDate: "2026-04-01",
  endDate: "2026-06-15",
  team: ["Olivia Martin", "Jackson Lee", "Sophia Brown", "Ethan Wilson", "Ava Johnson"],
  participantDetails: [
    { id: "1", name: "Olivia Martin", role: "Frontend Developer" },
    { id: "2", name: "Jackson Lee", role: "Backend Developer" },
    { id: "3", name: "Sophia Brown", role: "UI/UX Designer" },
    { id: "4", name: "Ethan Wilson", role: "Project Manager" },
    { id: "5", name: "Ava Johnson", role: "QA Engineer" },
  ],
};

const ProjectPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("task");
  const [taskFilter, setTaskFilter] = useState("all"); // NEW FILTER
  const [project, setProject] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Frontend-only admin toggle (set false to hide Submit / + Add Task)
  const [isAdmin] = useState(true);
  const [openSubmitPopup, setOpenSubmitPopup] = useState(false);
  const [showAssignTask, setShowAssignTask] = useState(false);

  // LOAD MOCK PROJECT (simulates a fetch delay)
  useEffect(() => {
    setLoading(true);

    const timer = setTimeout(() => {
      setProject({ ...MOCK_PROJECT, id: projectId });
      setError(null);
      setLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [projectId]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  if (loading)
    return (
      <div className="w-full min-h-screen flex justify-center items-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );

  if (error)
    return (
      <div className="w-full min-h-screen flex justify-center items-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate("/projects")}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );

  if (!project) return null;

  return (
    <div className="w-full min-h-screen p-6 bg-gray-100 space-y-6">

      {/* ---------------- HEADER ---------------- */}
      <div className="flex flex-col md:flex-row justify-between bg-white p-4 rounded-xl shadow-sm">

        {/* LEFT PANEL */}
        <div>
          <h2 className="text-xl font-bold">{project.projectName}</h2>

          <p className="text-sm text-gray-600 mt-1">
            {project.description || "No description available"}
          </p>

          {/* TEAM AVATARS */}
          <div className="flex items-center mt-3">
            {project.team?.slice(0, 3).map((member, index) => (
              <img
                key={`${member}-${index}`}
                src={`https://i.pravatar.cc/150?img=${index + 1}`}
                className={`w-8 h-8 rounded-full border-2 border-white ${
                  index !== 0 ? "-ml-2" : ""
                }`}
                alt={`Team member ${index}`}
              />
            ))}

            {project.team?.length > 3 && (
              <span className="ml-2 text-sm text-gray-500">
                +{project.team.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="mt-4 md:mt-0 bg-gray-50 p-4 rounded-xl w-full md:w-64">
          <h3 className="text-lg font-semibold">{project.projectName}</h3>

          <p className="text-sm text-gray-600 mt-1">
            Start Date: {formatDate(project.startDate)}
          </p>
          <p className="text-sm text-gray-600">
            Due Date: {formatDate(project.endDate)}
          </p>

          {/* CHAT BUTTON */}
          <button
            onClick={() => navigate(`/chat/${projectId}`)}
            className="w-full mt-2 text-sm bg-sky-500 text-white border px-3 py-1 rounded-full"
          >
            Chat
          </button>

          {/* SUBMIT + ADD TASK BUTTONS (ADMIN ONLY) */}
          {isAdmin && (
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => setOpenSubmitPopup(true)}
                className="w-full mt-2 text-sm text-blue-500 border border-blue-500 px-3 py-1 rounded-full hover:bg-blue-50 transition"
              >
                Submit
              </button>

              <button
                onClick={() => setShowAssignTask(true)}
                className="w-full mt-2 text-sm text-blue-500 border border-blue-500 px-3 py-1 rounded-full hover:bg-blue-50 transition"
              >
                + Add Task
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- TABS + FILTER ---------------- */}
      {!showAssignTask && (
        <div className="flex items-center justify-between border-b border-gray-300 pb-2">

          {/* TABS */}
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("task")}
              className={`pb-1 text-sm font-medium ${
                activeTab === "task"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500"
              }`}
            >
              Tasks
            </button>

            <button
              onClick={() => setActiveTab("member")}
              className={`pb-1 text-sm font-medium ${
                activeTab === "member"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-500"
              }`}
            >
              Members
            </button>
          </div>

          {/* TASK FILTER (Only Visible in Tasks tab) */}
          {activeTab === "task" && (
            <select
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
              className="border border-blue-500 text-sm text-blue-600 px-3 py-1 rounded-lg"
            >
              <option value="all">All Tasks</option>
              <option value="me">Assigned to Me</option>
            </select>
          )}
        </div>
      )}

      {/* ---------------- CONTENT ---------------- */}
      <div>
        {showAssignTask ? (
          <AssignTask
            projectId={projectId}
            onSuccess={() => setShowAssignTask(false)}
            onCancel={() => setShowAssignTask(false)}
          />
        ) : activeTab === "task" ? (
          <Task projectId={projectId} taskFilter={taskFilter} />
        ) : (
          <Nember projectId={projectId} projectParticipants={project.participantDetails} />
        )}
      </div>

      {/* SUBMIT POPUP */}
      {openSubmitPopup && (
        <Submit
          onClose={() => setOpenSubmitPopup(false)}
          projectId={projectId}
        />
      )}
    </div>
  );
};

export default ProjectPage;