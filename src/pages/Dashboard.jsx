"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getUserFromToken, db } from "../firebase"
import { TrendingUp, Video, Search, Plus, MonitorX } from "lucide-react"
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { collection, doc, getDoc, getDocs } from "firebase/firestore"

const STATIC_PROJECT_ANALYTICS = [
  { name: "Sun", value: 25 },
  { name: "Mon", value: 65 },
  { name: "Tue", value: 40 },
  { name: "Wed", value: 55 },
  { name: "Thu", value: 30 },
  { name: "Fri", value: 45 },
  { name: "Sat", value: 80 },
]

const PROJECT_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#a855f7"]

const encodeEmailForFirestore = (email = "") => {
  return email.toLowerCase().replace(/\./g, "_")
}

const decodeParticipantEmail = (email = "") => {
  return email.replace(/_/g, ".")
}

const normalizeStatus = (status = "") => {
  const value = String(status).toLowerCase().trim()

  if (value === "completed" || value === "complete") return "completed"

  if (
    value === "progress" ||
    value === "inprogress" ||
    value === "in_progress" ||
    value === "in progress" ||
    value === "ongoing" ||
    value === "running"
  ) {
    return "progress"
  }

  return "pending"
}

const getProjectStatus = (project) => {
  return normalizeStatus(project?.status)
}

const getStatusLabel = (status = "") => {
  const normalizedStatus = normalizeStatus(status)

  if (normalizedStatus === "completed") return "Completed"
  if (normalizedStatus === "progress") return "Ongoing"

  return "Pending"
}

const getStatusClassName = (status = "") => {
  const normalizedStatus = normalizeStatus(status)

  if (normalizedStatus === "completed") {
    return "bg-green-100 text-green-700"
  }

  if (normalizedStatus === "progress") {
    return "bg-yellow-100 text-yellow-700"
  }

  return "bg-red-100 text-red-700"
}

const getProjectTitle = (project) => {
  return (
    project?.title ||
    project?.projectTitle ||
    project?.projectName ||
    project?.name ||
    "Untitled Project"
  )
}

const getProjectEndDate = (project) => {
  return project?.endDate || project?.dueDate || project?.deadline || null
}

const formatFirestoreDate = (value) => {
  if (!value) return "No due date"

  if (value?.toDate) {
    return value.toDate().toLocaleDateString()
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "No due date"
  }

  return date.toLocaleDateString()
}

const getParticipantEmail = (participant) => {
  if (typeof participant === "string") {
    return participant.toLowerCase()
  }

  return participant?.email?.toLowerCase() || ""
}

const getUserDisplayName = (user, fallbackEmail = "") => {
  return (
    user?.name ||
    user?.displayName ||
    user?.fullName ||
    user?.username ||
    fallbackEmail ||
    "Unknown User"
  )
}

const getAvatarUrl = (name, email) => {
  const avatarName = encodeURIComponent(name || email || "User")
  return `https://ui-avatars.com/api/?name=${avatarName}&background=2563eb&color=fff`
}

const getMemberStatus = (member) => {
  const tasks = member?.projectTasks?.flatMap((projectTask) => {
    return projectTask?.tasks || []
  })

  if (!tasks?.length) {
    return {
      label: "No Tasks",
      className: "bg-gray-100 text-gray-700",
    }
  }

  const statuses = tasks.map((task) => normalizeStatus(task.rawStatus || task.status))

  if (statuses.every((status) => status === "completed")) {
    return {
      label: "Completed",
      className: "bg-green-100 text-green-700",
    }
  }

  if (statuses.some((status) => status === "progress")) {
    return {
      label: "Ongoing",
      className: "bg-yellow-100 text-yellow-700",
    }
  }

  return {
    label: "Pending",
    className: "bg-red-100 text-red-700",
  }
}

const Dashboard = () => {
  const navigate = useNavigate()

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  )

  const [showAppsPopup, setShowAppsPopup] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [elapsedTime, setElapsedTime] = useState(2 * 3600 + 18 * 60 + 42)

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [currentUserProfile, setCurrentUserProfile] = useState(null)

  const appsBtnRef = useRef(null)
  const popupRef = useRef(null)

  const currentUser = getUserFromToken()
  const currentUserEmail = currentUser?.email?.toLowerCase() || ""
  const currentUserEncodedEmail = encodeEmailForFirestore(currentUserEmail)

  const currentRole =
    currentUserProfile?.role ||
    currentUser?.role ||
    currentUser?.userRole ||
    "member"

  const isAdmin = String(currentRole).toLowerCase() === "admin"

  const canCreateProject = isAdmin
  const canCreateUser = isAdmin
  const canViewUsers = isAdmin
  const isUserPanelOpen = true

  const onCreateProject = () => {
    navigate("/createproject")
  }

  const onAddMember = () => {
    if (!isAdmin) return
    navigate("/team")
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        let loggedInUserProfile = null

        if (currentUserEmail) {
          const userDocRef = doc(db, "users", currentUserEncodedEmail)
          const userDocSnap = await getDoc(userDocRef)

          if (userDocSnap.exists()) {
            loggedInUserProfile = {
              id: userDocSnap.id,
              email: userDocSnap.data()?.email || userDocSnap.id,
              ...userDocSnap.data(),
            }
          }
        }

        setCurrentUserProfile(loggedInUserProfile)

        const role =
          loggedInUserProfile?.role ||
          currentUser?.role ||
          currentUser?.userRole ||
          "member"

        const adminAccess = String(role).toLowerCase() === "admin"

        const projectsSnapshot = await getDocs(collection(db, "projects"))

        const allProjects = projectsSnapshot.docs.map((projectDoc) => ({
          id: projectDoc.id,
          ...projectDoc.data(),
        }))

        const userProjectIds = loggedInUserProfile?.projectIds || []
        const visibleProjects = adminAccess
          ? allProjects
          : allProjects.filter((project) => {
            const isAssignedById = userProjectIds.includes(project.id)
            const participants = Array.isArray(project.participants)
              ? project.participants
              : []

            const isAssignedByParticipants = participants.some((participant) => {
              const participantEmail = getParticipantEmail(participant)

              return (
                participantEmail === currentUserEncodedEmail ||
                participantEmail === currentUserEmail
              )
            })

            return isAssignedById || isAssignedByParticipants
          })

        const mappedProjects = visibleProjects.map((p) => {
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
        });

        setProjects(mappedProjects)

        if (adminAccess) {
          const usersSnapshot = await getDocs(collection(db, "users"))

          const allUsers = usersSnapshot.docs.map((userDoc) => ({
            id: userDoc.id,
            email: userDoc.data()?.email || userDoc.id,
            ...userDoc.data(),
          }))

          setUsers(allUsers)
        } else {
          if (loggedInUserProfile) {
            setUsers([loggedInUserProfile])
          } else if (currentUserEmail) {
            setUsers([
              {
                id: currentUserEmail,
                email: currentUserEmail,
                name: currentUser?.name || currentUser?.displayName || currentUserEmail,
                role: "member",
              },
            ])
          } else {
            setUsers([])
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [currentUserEmail, currentUserEncodedEmail])

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((previousTime) => previousTime + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener("resize", handleResize)

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        appsBtnRef.current &&
        !appsBtnRef.current.contains(event.target)
      ) {
        setShowAppsPopup(false)
      }
    }

    if (showAppsPopup) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showAppsPopup])

  const projectProgress = useMemo(() => {
    let completed = 0
    let progress = 0
    let pending = 0

    projects.forEach((project) => {
      const status = getProjectStatus(project)

      if (status === "completed") {
        completed += 1
      } else if (status === "progress") {
        progress += 1
      } else {
        pending += 1
      }
    })

    return {
      completed,
      inProgress: progress,
      pending,
    }
  }, [projects])

  const dashboardCounts = useMemo(() => {
    const totalProjects = projects.length

    const endedProjects = projects.filter(
      (project) => getProjectStatus(project) === "completed"
    ).length

    const runningProjects = projects.filter(
      (project) => getProjectStatus(project) === "progress"
    ).length

    const pendingProjects = projects.filter(
      (project) => getProjectStatus(project) === "pending"
    ).length

    return {
      totalProjects,
      endedProjects,
      runningProjects,
      pendingProjects,
    }
  }, [projects])

  const teamMembers = useMemo(() => {
    const membersMap = new Map()

    users.forEach((user) => {
      const email = user.email || user.id
      const encodedEmail = encodeEmailForFirestore(email)
      const name = getUserDisplayName(user, email)

      membersMap.set(encodedEmail, {
        id: user.id || email,
        name,
        email,
        avatar: user.avatar || user.photoURL || getAvatarUrl(name, email),
        projectTasks: [],
      })
    })

    projects.forEach((project) => {
      const participants = Array.isArray(project.participants)
        ? project.participants
        : []

      participants.forEach((participant) => {
        const participantEmail = getParticipantEmail(participant)

        if (!participantEmail) return

        const projectStatus = getProjectStatus(project)
        const decodedEmail = decodeParticipantEmail(participantEmail)

        const existingUser = membersMap.get(participantEmail)

        const userData =
          existingUser ||
          {
            id: participantEmail,
            name: decodedEmail,
            email: decodedEmail,
            avatar: getAvatarUrl(decodedEmail, decodedEmail),
            projectTasks: [],
          }

        userData.projectTasks.push({
          projectTitle: getProjectTitle(project),
          tasks: [
            {
              title: getProjectTitle(project),
              status: getStatusLabel(projectStatus),
              rawStatus: projectStatus,
            },
          ],
        })

        membersMap.set(participantEmail, userData)
      })
    })

    return Array.from(membersMap.values())
  }, [users, projects])

  const filteredTeamMembers = teamMembers.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const progressTotal =
    projectProgress.completed +
    projectProgress.inProgress +
    projectProgress.pending

  const completionPercentage =
    progressTotal > 0
      ? Math.round((projectProgress.completed / progressTotal) * 100)
      : 0

  const DESKTOP_MIN_WIDTH = 768

  if (windowWidth < DESKTOP_MIN_WIDTH) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-8 font-sans">
        <MonitorX className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Desktop Only Feature
        </h2>
        <p className="text-base text-gray-600 max-w-md">
          The dashboard is only available on medium and larger screens.
          <br />
          Please switch to a tablet or desktop device to continue.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-gray-700 text-lg font-medium">
          Loading dashboard...
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-slate-50 p-8 font-sans transparent-scrollbar"
      style={{ fontFamily: "Roboto, sans-serif" }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 md:gap-0">
        <div>
          <h1
            className="text-4xl font-bold text-gray-900 mb-1"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Dashboard
          </h1>
          <p className="text-sm text-gray-600">
            Plan, prioritize, and accomplish your tasks with ease
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-4">
          <div className="relative">
            {canViewUsers && (
              <>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search Employee"
                  className="w-48 md:w-72 px-4 py-3 pl-10 border border-gray-200 rounded-full text-sm bg-white text-gray-700 outline-none placeholder-gray-400"
                />
              </>
            )}
          </div>

          {canCreateProject && (
            <button
              onClick={onCreateProject}
              className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-full text-sm font-medium cursor-pointer flex items-center gap-2 transition-all duration-200 hover:bg-blue-600 hover:text-white"
            >
              <Plus size={16} />
              Add Projects
            </button>
          )}
        </div>

        {/* App Quick Access */}
        {isUserPanelOpen && (
          <div className="flex justify-center gap-4 my-6 relative">
            {showAppsPopup && (
              <div
                ref={popupRef}
                className="absolute right-16 top-1/2 -translate-y-1/2 flex gap-4 bg-white shadow-lg rounded-full px-4 py-2 z-50"
              >
                <button className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:ring-2 hover:ring-blue-200 hover:scale-110">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png"
                    alt="Notion"
                    className="w-8 h-8"
                  />
                </button>

                <button className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:ring-2 hover:ring-blue-200 hover:scale-110">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg"
                    alt="Figma"
                    className="w-8 h-8"
                  />
                </button>

                <button className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:ring-2 hover:ring-blue-200 hover:scale-110">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/8/87/Google_Chrome_icon_%282011%29.png"
                    alt="Chrome"
                    className="w-8 h-8"
                  />
                </button>

                <button className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:ring-2 hover:ring-blue-200 hover:scale-110">
                  <img
                    src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
                    alt="GitHub"
                    className="w-8 h-8"
                  />
                </button>

                <button className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:ring-2 hover:ring-blue-200 hover:scale-110">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg"
                    alt="VS Code"
                    className="w-8 h-8"
                  />
                </button>
              </div>
            )}

            <button
              ref={appsBtnRef}
              onClick={() => setShowAppsPopup((previous) => !previous)}
              className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center cursor-pointer transition-transform duration-150 hover:ring-2 hover:ring-blue-200 hover:scale-110 z-[60]"
            >
              <img
                src="https://cdn-icons-png.flaticon.com/512/1828/1828817.png"
                alt="Apps"
                className="w-8 h-8"
              />
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="rounded-3xl p-6 relative bg-gradient-to-br from-blue-400 to-blue-700 text-white shadow-md">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-sm text-white">Total Projects</h3>
            <div
              // onClick={() => navigate("/projects")}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-white/30 bg-white/10 cursor-pointer hover:bg-white/20 transition-all active:scale-95"
            // title={isAdmin ? "View All Projects" : "View Assigned Projects"}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="text-5xl font-bold mb-2 leading-none">
            {dashboardCounts.totalProjects}
          </div>

          <p className="text-xs text-white/80">All company projects</p>
        </div>

        <div className="rounded-3xl p-6 relative bg-white border border-gray-200 shadow-md">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-sm text-gray-800">
              Ended Projects
            </h3>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 bg-gray-50 hover:bg-white/20 transition-all active:scale-95 cursor-pointer"

            // onClick={() => navigate("/projects")}
            // title={isAdmin ? "View All Projects" : "View Assigned Projects"}

            >
              <TrendingUp className="w-4 h-4 text-gray-600" />
            </div>
          </div>

          <div className="text-5xl font-bold mb-2 leading-none text-gray-900">
            {dashboardCounts.endedProjects}
          </div>

          <p className="text-xs text-blue-600">Completed projects</p>
        </div>

        <div className="rounded-3xl p-6 relative bg-white border border-gray-200 shadow-md">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-sm text-gray-800">
              Running Projects
            </h3>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 bg-gray-50 hover:bg-white/20 transition-all active:scale-95 cursor-pointer"

            // onClick={() => navigate("/projects")}
            // title={isAdmin ? "View All Projects" : "View Assigned Projects"}

            >
              <TrendingUp className="w-4 h-4 text-gray-600" />
            </div>
          </div>

          <div className="text-5xl font-bold mb-2 leading-none text-gray-900">
            {dashboardCounts.runningProjects}
          </div>

          <p className="text-xs text-blue-600">Active projects</p>
        </div>

        <div className="rounded-3xl p-6 relative bg-white border border-gray-200 shadow-md">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-sm text-gray-800">
              Pending Projects
            </h3>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 bg-gray-50 hover:bg-white/20 transition-all active:scale-95 cursor-pointer"

            // onClick={() => navigate("/projects")}
            // title={isAdmin ? "View All Projects" : "View Assigned Projects"}

            >
              <TrendingUp className="w-4 h-4 text-gray-600" />
            </div>
          </div>

          <div className="text-5xl font-bold mb-2 leading-none text-gray-900">
            {dashboardCounts.pendingProjects}
          </div>

          <p className="text-xs text-blue-600">Not started</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-wrap gap-6 mt-6">
        {/* Project Analytics */}
        <div
          className="min-w-[580px] max-w-[650px] w-full flex-1 bg-white p-6 border border-gray-200 shadow-md flex flex-col justify-between"
          style={{ height: "216px", borderRadius: "30px" }}
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Project Analytics
          </h3>

          <div className="flex-1 flex items-end justify-between w-full h-full">
            {STATIC_PROJECT_ANALYTICS.map((item) => (
              <div
                key={item.name}
                className="flex flex-col items-center justify-end h-full"
              >
                <div
                  className="rounded-t-lg"
                  style={{
                    width: "50px",
                    height: `${item.value * 1.5}px`,
                    background:
                      "linear-gradient(180deg, #4FC3F7 0%, #1976D2 100%)",
                  }}
                />
                <span className="text-xs text-gray-500 mt-2">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reminders */}
        <div
          className="min-w-[250px] max-w-[310px] w-full flex-1 bg-white p-6 border border-gray-200 shadow-md flex flex-col justify-between"
          style={{ height: "217px", borderRadius: "30px" }}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Reminders
          </h3>

          <div>
            <div className="text-blue-600 font-semibold cursor-pointer mb-1">
              Weekly Team Meeting
            </div>
            <div className="text-gray-500 text-sm mb-4">Time: 10:30 AM</div>

            <a
              href="https://meet.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-medium text-sm hover:bg-blue-800 w-full justify-center"
            >
              <Video size={16} />
              Start Meeting
            </a>
          </div>
        </div>

        {/* Time Tracker */}
        <div
          className="min-w-[250px] max-w-[310px] w-full flex-1 p-6 shadow-md flex flex-col items-center justify-center"
          style={{
            height: "217px",
            borderRadius: "30px",
            border: "1px solid #e5e7eb",
            background: "linear-gradient(135deg, #1976D2 0%, #4FC3F7 100%)",
          }}
        >
          <h3 className="text-lg font-semibold text-white mb-4 self-start">
            Time Tracker
          </h3>

          <div className="text-4xl font-bold tracking-wider font-mono text-white">
            {formatTime(elapsedTime)}
          </div>
        </div>

        {/* Projects */}
        <div
          className="min-w-[250px] max-w-[350px] w-full flex-1 bg-white p-6 border border-gray-200 shadow-md flex flex-col"
          style={{ height: "355px", borderRadius: "30px" }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Projects</h3>

            {canCreateProject && (
              <button
                onClick={onCreateProject}
                className="border border-blue-500 text-blue-500 px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-50"
              >
                + New
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-3">
              {projects.length > 0 ? (
                projects.map((project, index) => (
                  <div key={project.id} className="flex items-center gap-3">
                    <span
                      className="w-4 h-4 rounded inline-block"
                      style={{
                        backgroundColor:
                          project.color || PROJECT_COLORS[index % PROJECT_COLORS.length],
                      }}
                    />

                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">
                        {getProjectTitle(project)}
                      </div>

                      <div className="text-xs text-gray-500">
                        Due date: {formatFirestoreDate(getProjectEndDate(project))}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${getStatusClassName(
                        project.status
                      )}`}
                    >
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-sm">No projects found</div>
              )}
            </div>
          </div>
        </div>

        {/* Project Progress */}
        <div
          className="min-w-[250px] max-w-[310px] w-full flex-1 bg-white p-6 border border-gray-200 shadow-md flex flex-col items-center justify-center"
          style={{ height: "352px", borderRadius: "30px" }}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-6 self-start">
            Project Progress
          </h3>

          <div className="flex flex-col items-center justify-center flex-1 w-full">
            <div className="relative w-72 h-52 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart style={{ marginTop: "-15%" }}>
                  <Pie
                    data={[
                      {
                        name: "Completed",
                        value: projectProgress.completed,
                      },
                      {
                        name: "InProgress",
                        value: projectProgress.inProgress,
                      },
                      {
                        name: "Pending",
                        value: projectProgress.pending,
                      },
                    ]}
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={70}
                    outerRadius={110}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    <Cell fill="#3182ce" />
                    <Cell fill="#4FC3F7" />
                    <Cell fill="#cbd5e0" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute left-1/2 top-[72%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-full">
                <div className="text-3xl font-extrabold text-gray-900 leading-none">
                  {completionPercentage}%
                </div>
                <div className="text-lg text-blue-500 font-semibold mt-1">
                  Tasks Done
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
                <span className="text-xs text-gray-600">Completed</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-400" />
                <span className="text-xs text-gray-600">In Progress</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-300" />
                <span className="text-xs text-gray-600">Pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Team Collaboration */}
        <div
          className="min-w-[580px] max-w-[650px] w-full flex-1 bg-white p-6 border border-gray-200 shadow-md flex flex-col"
          style={{ height: "355px", borderRadius: "30px" }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Team Collaboration
            </h3>

            {canCreateUser && (
              <button
                onClick={onAddMember}
                className="border border-blue-500 text-blue-500 px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-50"
              >
                + Add Member
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-4">
              {filteredTeamMembers.length > 0 ? (
                filteredTeamMembers.map((member) => {
                  const memberStatus = getMemberStatus(member)

                  return (
                    <div key={member.id} className="flex items-center gap-3">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />

                      <div className="flex-1">
                        <div className="font-semibold text-sm text-gray-900">
                          {member.name}
                        </div>

                        <div className="text-xs text-gray-500">
                          Working on{" "}
                          {member.projectTasks?.[0]?.projectTitle || "No Project"}
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${memberStatus.className}`}
                      >
                        {memberStatus.label}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div className="text-gray-500 text-sm">
                  No matching team members found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard