"use client"

import { Plus, Eye, MessageCircle } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

// Define colors directly in the component file
const colors = {
  backgroundLight: "#f8fafc",
  backgroundDark: "#3c4045",
  textDark: "#111827",
  textMedium: "#6b7280",
  textMuted: "#9ca3af",
  bgLightAlt: "#f1f5f9",
  bgHover: "#f3f4f6",
  textHeading: "#1f2937",
  borderDefault: "#e5e7eb",
  borderSubtle: "#f3f4f6",
  borderCard: "#f0f1f3",
  borderHover: "#d1d5db",
  bgCard: "#fafbfc",
  bgColumn: "rgba(255, 255, 255, 0.8)",
  shadowSm: "0 1px 3px rgba(0, 0, 0, 0.1)",

  priorityImportantBg: "#dbeafe",
  priorityImportantText: "#1d4ed8",
  priorityHighBg: "#fee2e2",
  priorityHighText: "#dc2626",
  priorityMehBg: "#f3f4f6",
  priorityMehText: "#6b7280",
  priorityOkBg: "#fef3c7",
  priorityOkText: "#d97706",

  progressPending: "#3b82f6",
  progressActive: "#f59e0b",
  progressCompleted: "#10b981",

  avatarCountBg: "#dbeafe",
  avatarCountText: "#1d4ed8",
}

// ─── Mock Data ───────────────────────────────────────────────
const avatar = (seed) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`

const MOCK_PENDING_PROJECTS = [
  {
    id: "p1",
    title: "Marketing Campaign Q3",
    priority: "important",
    progress: 0,
    status: "pending",
    team: [avatar("Olivia Martin"), avatar("Jackson Lee")],
    stats: { views: 120, comments: 4 },
  },
  {
    id: "p2",
    title: "Mobile App v2.0 Planning",
    priority: "high priority",
    progress: 5,
    status: "pending",
    team: [avatar("Sophia Brown"), avatar("Ethan Wilson"), avatar("Ava Johnson"), avatar("Liam Davis")],
    stats: { views: 340, comments: 12 },
  },
  {
    id: "p3",
    title: "Customer Feedback Survey",
    priority: "meh",
    progress: 0,
    status: "pending",
    team: [avatar("Ava Johnson")],
    stats: { views: 45, comments: 1 },
  },
]

const MOCK_PROGRESS_PROJECTS = [
  {
    id: "pr1",
    title: "Website Redesign",
    priority: "important",
    progress: 68,
    status: "progress",
    team: [avatar("Olivia Martin"), avatar("Sophia Brown"), avatar("Ethan Wilson")],
    stats: { views: 1250, comments: 34 },
  },
  {
    id: "pr2",
    title: "API Integration Module",
    priority: "ok",
    progress: 42,
    status: "progress",
    team: [avatar("Jackson Lee"), avatar("Liam Davis")],
    stats: { views: 560, comments: 18 },
  },
  {
    id: "pr3",
    title: "Dashboard UI Update",
    priority: "high priority",
    progress: 81,
    status: "progress",
    team: [avatar("Sophia Brown"), avatar("Ava Johnson"), avatar("Olivia Martin"), avatar("Jackson Lee"), avatar("Ethan Wilson")],
    stats: { views: 2100, comments: 47 },
  },
]

const MOCK_COMPLETED_PROJECTS = [
  {
    id: "c1",
    title: "Brand Identity Refresh",
    priority: "important",
    progress: 100,
    status: "completed",
    team: [avatar("Sophia Brown"), avatar("Olivia Martin")],
    stats: { views: 3400, comments: 89 },
  },
  {
    id: "c2",
    title: "Q1 Sales Report Automation",
    priority: "ok",
    progress: 100,
    status: "completed",
    team: [avatar("Ethan Wilson"), avatar("Ava Johnson"), avatar("Liam Davis")],
    stats: { views: 890, comments: 23 },
  },
  {
    id: "c3",
    title: "Legacy System Migration",
    priority: "high priority",
    progress: 100,
    status: "completed",
    team: [avatar("Jackson Lee"), avatar("Liam Davis")],
    stats: { views: 1750, comments: 56 },
  },
  {
    id: "c4",
    title: "Employee Onboarding Portal",
    priority: "meh",
    progress: 100,
    status: "completed",
    team: [avatar("Ava Johnson")],
    stats: { views: 430, comments: 9 },
  },
]

// ProjectCard Component
function ProjectCard({ project, onViewClick }) {
  const getPriorityStyles = (priority) => {
    switch (priority.toLowerCase()) {
      case "important":
        return { backgroundColor: colors.priorityImportantBg, color: colors.priorityImportantText }
      case "high priority":
        return { backgroundColor: colors.priorityHighBg, color: colors.priorityHighText }
      case "meh":
        return { backgroundColor: colors.priorityMehBg, color: colors.priorityMehText }
      case "ok":
        return { backgroundColor: colors.priorityOkBg, color: colors.priorityOkText }
      case "not that important":
        return { backgroundColor: colors.priorityHighBg, color: colors.priorityHighText }
      default:
        return { backgroundColor: colors.priorityMehBg, color: colors.priorityMehText }
    }
  }

  const getProgressColor = (status) => {
    switch (status) {
      case "pending":
        return colors.progressPending
      case "progress":
        return colors.progressActive
      case "completed":
        return colors.progressCompleted
      default:
        return colors.progressPending
    }
  }

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  const priorityStyles = getPriorityStyles(project.priority)
  const progressColor = getProgressColor(project.status)

  return (
    <div
      className="mb-1 rounded-3xl border p-4 transition-all hover:-translate-y-px hover:bg-white cursor-pointer"
      onClick={() => onViewClick(project.id)}
      style={{
        borderColor: colors.borderCard,
        backgroundColor: colors.bgCard,
        boxShadow: colors.shadowSm,
        "--tw-border-opacity": "1",
        "--tw-shadow-color": "rgba(0, 0, 0, 0.1)",
      }}
    >
      {project.priority && (
        <div className="mb-3 inline-block rounded px-2 py-1 text-xs font-medium capitalize" style={priorityStyles}>
          {project.priority}
        </div>
      )}
      <h3 className="m-0 mb-4 text-sm font-medium leading-tight" style={{ color: colors.textDark }}>
        {project.title}
      </h3>
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: colors.textMedium }}>
            Progress
          </span>
          <span className="text-xs font-semibold" style={{ color: colors.textDark }}>
            {project.status === "completed" ? "Done" : `${project.progress}%`}
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-sm" style={{ backgroundColor: colors.bgHover }}>
          <div
            className="h-full rounded-sm transition-all duration-300 ease-in-out"
            style={{ width: `${project.progress}%`, backgroundColor: progressColor }}
          ></div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {project.team.slice(0, 3).map((avatar, index) => (
            <img
              key={index}
              src={avatar || "/placeholder.svg?height=24&width=24"}
              alt="Team member"
              className="relative -ml-2 h-6 w-6 rounded-full border-2 border-white object-cover first:ml-0"
            />
          ))}
          {project.team.length > 3 && (
            <div
              className="relative -ml-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold"
              style={{ backgroundColor: colors.avatarCountBg, color: colors.avatarCountText }}
            >
              {`+${project.team.length - 3}`}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-1 text-xs font-medium" style={{ color: colors.textMedium }}>
            <Eye size={14} />
            <span>{formatNumber(project.stats.views)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium" style={{ color: colors.textMedium }}>
            <MessageCircle size={14} />
            <span>{formatNumber(project.stats.comments)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ProjectColumn Component
function ProjectColumn({ title, count, projects, type, onCreateProject, canCreateProject, onProjectClick }) {
  const statusIndicatorColor =
    type === "pending" ? colors.progressPending : type === "progress" ? colors.progressActive : colors.progressCompleted

  return (
    <div
      className="flex h-fit max-h-[80vh] flex-col rounded-3xl border p-5 shadow-sm"
      style={{
        borderColor: colors.borderDefault,
        backgroundColor: colors.bgColumn,
        boxShadow: colors.shadowSm,
      }}
    >
      <div
        className="mb-5 flex flex-shrink-0 items-center justify-between border-b pb-3"
        style={{ borderColor: colors.borderSubtle }}
      >
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: statusIndicatorColor }}></div>
          <span className="text-base font-semibold" style={{ color: colors.textDark }}>
            {title}
          </span>
          <span className="text-sm font-medium" style={{ color: colors.textMedium }}>
            ({count})
          </span>
        </div>
        {canCreateProject && (
          <button
            onClick={() => { onCreateProject(); }}
            className="flex h-7 w-7 items-center justify-center rounded-full border bg-white text-text-medium transition-all hover:bg-bg-hover cursor-pointer"
            style={{
              borderColor: colors.borderDefault,
              color: colors.textMedium,
              "--tw-border-opacity": "1",
              "--tw-shadow-color": "rgba(0, 0, 0, 0.1)",
            }}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
      <div className="column-content flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} onViewClick={onProjectClick} />
        ))}
      </div>
    </div>
  )
}

// Main ProjectsView Component
export default function ProjectsView() {
  const navigate = useNavigate();

  // Frontend-only permission toggle (set false to hide "+"/create buttons)
  const canCreateProject = true;

  const [pendingProjectsApi] = useState(MOCK_PENDING_PROJECTS);
  const [inProgressProjectsApi] = useState(MOCK_PROGRESS_PROJECTS);
  const [completedProjectsApi] = useState(MOCK_COMPLETED_PROJECTS);

  // Handle project click to navigate to project details
  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <div
      className="flex min-h-screen flex-col transparent-scrollbar"
      style={{ backgroundColor: colors.backgroundLight, color: colors.textDark }}
    >
      <div className="flex flex-1">
        <main className="flex flex-1 flex-col overflow-hidden" style={{ backgroundColor: colors.backgroundLight }}>
          <div className="flex flex-col overflow-hidden p-8" style={{ backgroundColor: colors.backgroundLight }}>
            <div className="mb-8 flex-shrink-0">
              <h1 className="m-0 text-3xl font-semibold" style={{ color: colors.textDark }}>
                Projects
              </h1>
            </div>
            <div className="grid h-full items-start gap-8 lg:grid-cols-3 md:grid-cols-2 grid-cols-1">
              <ProjectColumn title="Upcoming" count={pendingProjectsApi.length} projects={pendingProjectsApi} type="Upcoming" canCreateProject={canCreateProject} onCreateProject={() => navigate("/create-project")} onProjectClick={handleProjectClick} />
              <ProjectColumn title="In Progress" count={inProgressProjectsApi.length} projects={inProgressProjectsApi} type="progress" canCreateProject={canCreateProject} onCreateProject={() => navigate("/create-project")} onProjectClick={handleProjectClick} />
              <ProjectColumn title="Completed" count={completedProjectsApi.length} projects={completedProjectsApi} type="completed" canCreateProject={canCreateProject} onCreateProject={() => navigate("/create-project")} onProjectClick={handleProjectClick} />
            </div>
          </div>
        </main>
      </div>
      <style>{`
        .column-content::-webkit-scrollbar {
          width: 6px;
          background-color: transparent;
        }
        .column-content::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        .column-content::-webkit-scrollbar-thumb:hover {
          background-color: rgba(0, 0, 0, 0.2);
        }
        .column-content {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
        }
        .transparent-scrollbar::-webkit-scrollbar {
          width: 8px;
          background: transparent;
        }
        .transparent-scrollbar::-webkit-scrollbar-thumb {
          background: transparent;
        }
        .transparent-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
      `}</style>
    </div>
  )
}