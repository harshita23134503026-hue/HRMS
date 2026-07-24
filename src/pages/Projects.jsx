"use client"

import { Plus, Eye, MessageCircle } from "lucide-react"

import { useState, useEffect } from "react"

import { useNavigate } from "react-router-dom"

import { getUserFromToken, db } from "../firebase"

import { collection, onSnapshot, doc } from "firebase/firestore"

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

// ─── Role helper ────────────────────────────────────────────
const normalizeRole = (role = "") =>
  role.toLowerCase().trim().replace(/\s+/g, "_")

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isOverdue = (() => {
    if (project.status !== "progress") return false;
    if (!project.endDate) return false;
    const dueDate = new Date(project.endDate);
    dueDate.setHours(0, 0, 0, 0);
    return !isNaN(dueDate.getTime()) && dueDate < today;
  })();

  return (
    <div
      className="mb-1 rounded-3xl border p-4 transition-all hover:-translate-y-px hover:bg-white cursor-pointer"
      onClick={() => onViewClick(project.id)}
      style={{
        borderColor: isOverdue ? "#fecaca" : colors.borderCard,
        backgroundColor: isOverdue ? "#fff5f5" : colors.bgCard,
        boxShadow: colors.shadowSm,
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
          {(project.team || []).slice(0, 3).map((avatarUrl, index) => (
            <img
              key={index}
              src={avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(project.participants?.[index] || index)}`}
              alt="Team member"
              className="relative -ml-2 h-6 w-6 rounded-full border-2 border-white object-cover first:ml-0"
            />
          ))}
          {(project.team || []).length > 3 && (
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
            <span>{formatNumber(project.stats?.views || 0)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium" style={{ color: colors.textMedium }}>
            <MessageCircle size={14} />
            <span>{formatNumber(project.stats?.comments || 0)}</span>
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

  // ─── Get basic user info from token ─────────────────────────
  const currentUser = getUserFromToken();
  const currentRole = normalizeRole(currentUser?.role);
  const userEmail = currentUser?.email || "";
  const sanitizedEmail = userEmail ? userEmail.replace(/\./g, "_") : null;

  // ─── State ──────────────────────────────────────────────────
  const [projects, setProjects] = useState([]);
  const [userProjectIds, setUserProjectIds] = useState([]);
  const [childrenuid, setChildrenuid] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // ─── Derive canCreateProject from role + Firestore childrenuid ───
  const canCreateProject =
    ["admin", "sadmin", "sr_project_manager", "hr_manager"].includes(currentRole) ||
    childrenuid.length > 0;

  // ─── Subscribe to user doc (fetches projectIds AND childrenuid) ───
  useEffect(() => {
    if (!sanitizedEmail) {
      setLoadingUser(false);
      return;
    }

    const userDocRef = doc(db, "users", sanitizedEmail);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setUserProjectIds(userData?.projectIds || []);
          setChildrenuid(Array.isArray(userData?.childrenuid) ? userData.childrenuid : []);
        }
        setLoadingUser(false);
      },
      (err) => {
        console.error("Error listening to user doc:", err);
        setLoadingUser(false);
      }
    );

    return () => unsubscribe();
  }, [sanitizedEmail]);

  // ─── Subscribe to projects collection ───────────────────────
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "projects"),
      (snapshot) => {
        const projectsList = [];
        snapshot.forEach((doc) => {
          projectsList.push({ id: doc.id, ...doc.data() });
        });
        setProjects(projectsList);
        setLoadingProjects(false);
      },
      (err) => {
        console.error("Error listening to projects: ", err);
        setLoadingProjects(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ─── Filter projects based on role/assignment ───────────────
  const filteredProjects = projects
    .map((p) => {
      const currentStatus = (p.status || "").toLowerCase();
      if (currentStatus === "completed" || currentStatus === "ended") {
        return { ...p, status: "completed" };
      }

      if (p.startDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const projStartDate = new Date(p.startDate);
        projStartDate.setHours(0, 0, 0, 0);

        if (projStartDate > today) {
          return { ...p, status: "pending" };
        } else {
          return { ...p, status: "progress" };
        }
      }

      // Fallback
      if (currentStatus === "pending" || currentStatus === "upcoming") {
        return { ...p, status: "pending" };
      }
      return { ...p, status: "progress" };
    })
    .filter((p) => {
      if (["admin", "sadmin", "sr_project_manager", "hr_manager"].includes(currentRole)) {
        return true;
      }

      const isAssignedById = userProjectIds.includes(p.id);
      const isAssignedByParticipants =
        Array.isArray(p.participants) && p.participants.includes(sanitizedEmail);

      return isAssignedById || isAssignedByParticipants;
    });

  const pendingProjectsApi = filteredProjects.filter((p) => {
    const s = (p.status || "").toLowerCase();
    return s === "pending" || s === "upcoming";
  });

  const inProgressProjectsApi = filteredProjects.filter((p) => {
    const s = (p.status || "").toLowerCase();
    return s === "progress" || s === "in progress" || s === "running";
  });

  const completedProjectsApi = filteredProjects.filter((p) => {
    const s = (p.status || "").toLowerCase();
    return s === "completed" || s === "ended";
  });

  const loading = loadingProjects || (sanitizedEmail && loadingUser);

  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: colors.backgroundLight }}>
        <p className="text-gray-500 font-semibold text-lg animate-pulse">Loading projects...</p>
      </div>
    );
  }

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
              <ProjectColumn
                title="Upcoming"
                count={pendingProjectsApi.length}
                projects={pendingProjectsApi}
                type="pending"
                canCreateProject={canCreateProject}
                onCreateProject={() => navigate("/createproject")}
                onProjectClick={handleProjectClick}
              />
              <ProjectColumn
                title="In Progress"
                count={inProgressProjectsApi.length}
                projects={inProgressProjectsApi}
                type="progress"
                canCreateProject={canCreateProject}
                onCreateProject={() => navigate("/createproject")}
                onProjectClick={handleProjectClick}
              />
              <ProjectColumn
                title="Completed"
                count={completedProjectsApi.length}
                projects={completedProjectsApi}
                type="completed"
                canCreateProject={canCreateProject}
                onCreateProject={() => navigate("/createproject")}
                onProjectClick={handleProjectClick}
              />
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
