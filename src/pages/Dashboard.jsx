"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { TrendingUp, Video, Pause, Square, Search, Plus, MonitorX, X } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import axios from "axios"
import { BASE_URL } from "../utility/Config"
import { useRbac } from "./context/RbacContext"

const Dashboard = () => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280)
  const { role, hasPermission } = useRbac();
  const navigate = useNavigate();
  const onCreateProject = () => {navigate("/create-project");};
  const onAddMember = () => {navigate("/team");};
  const canCreateProject = hasPermission("project.create");
  const canCreateUser = hasPermission("user.create");
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(true);
  const [showAppsPopup, setShowAppsPopup] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    participants: []
  });
  const [companyUsers, setCompanyUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalProjects: 0,
    endedProjects: 0,
    runningProjects: 0,
    pendingProjects: 0,
    projectProgress: { completed: 0, inProgress: 0, pending: 0 },
    teamMembers: [],
    reminders: [],
    totalDailyHours: 0,
    isAdmin: false
  });

  // Static Project Analytics Data
  const staticProjectAnalytics = [
    { name: "Sun", value: 25 },
    { name: "Mon", value: 65 },
    { name: "Tue", value: 40 },
    { name: "Wed", value: 55 },
    { name: "Thu", value: 30 },
    { name: "Fri", value: 45 },
    { name: "Sat", value: 80 },
  ];
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0); // Time in seconds
  const appsBtnRef = useRef(null);
  const popupRef = useRef(null);
  const timerRef = useRef(null);

  // Check user role and fetch dashboard data
  useEffect(() => {
  const token = localStorage.getItem("token");

  setIsAdminPanelOpen(canCreateProject);
  setIsUserPanelOpen(!canCreateProject);

  if (token) {
    fetchDashboardData(token);
  } else {
    setLoadingDashboard(false);
  }
}, [canCreateProject]);

  const fetchDashboardData = async (token) => {
    try {
      setLoadingDashboard(true);
      const response = await axios.get(`${BASE_URL}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setDashboardData(response.data.data);
        // Convert hours to seconds for timer
        const hours = response.data.data.totalDailyHours;
        const totalSeconds = Math.round(hours * 3600);
        setElapsedTime(totalSeconds);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Time Tracker - Format seconds to HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Fetch company users when modal opens
  useEffect(() => {
    if (showProjectModal && isAdminPanelOpen) {
      fetchCompanyUsers();
    }
  }, [showProjectModal]);

  const fetchCompanyUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BASE_URL}/company/users?includeAllRoles=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompanyUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${BASE_URL}/projects`,
        projectForm,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setShowProjectModal(false);
      setProjectForm({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        participants: []
      });
      // Optionally refresh projects list here
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProjectForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleParticipantToggle = (userId) => {
    setProjectForm(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter(id => id !== userId)
        : [...prev.participants, userId]
    }));
  };

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target) &&
        appsBtnRef.current &&
        !appsBtnRef.current.contains(event.target)
      ) {
        setShowAppsPopup(false);
      }
    }
    if (showAppsPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAppsPopup]);

  // Chart data
  const barData = [
    { name: "S", value: 25 },
    { name: "M", value: 65 },
    { name: "T", value: 40 },
    { name: "W", value: 55 },
    { name: "T", value: 30 },
    { name: "F", value: 45 },
    { name: "S", value: 80 },
  ]
  const pieData = [
    { name: "Completed", value: 41 },
    { name: "InProgress", value: 35 },
    { name: "Pending", value: 24 },
  ]

  // Threshold for displaying the desktop-only message
  const DESKTOP_MIN_WIDTH = 768 // Corresponds to 'md' breakpoint in Tailwind CSS

  if (windowWidth < DESKTOP_MIN_WIDTH) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-8 font-sans">
        <MonitorX className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Desktop Only Feature</h2>
        <p className="text-base text-gray-600 max-w-md">
          The dashboard is only available on medium and larger screens.
          <br />
          Please switch to a tablet or desktop device to continue.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans transparent-scrollbar" style={{ fontFamily: 'Roboto, sans-serif' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 md:gap-0">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>Dashboard</h1>
          <p className="text-sm text-gray-600">Plan, prioritize, and accomplish your tasks with ease</p>
        </div>
        <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-4">
          <div className="relative">
            {hasPermission("user.view") && (
              <>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
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

         {/* App Quick Access Row */}
        {isUserPanelOpen && (
  <div className="flex justify-center gap-4 my-6 relative">
    {/* Popup for app buttons */}
    {showAppsPopup && (
      <div ref={popupRef} className="absolute right-16 top-1/2 -translate-y-1/2 flex gap-4 bg-white shadow-lg rounded-full px-4 py-2 z-50">
         <button key="notion" className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-200 hover:scale-110">
           <img src="https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png" alt="Notion" className="w-8 h-8" />
         </button>
         <button key="figma" className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-200 hover:scale-110">
           <img src="https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg" alt="Figma" className="w-8 h-8" />
         </button>
         <button key="chrome" className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-200 hover:scale-110">
           <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/Google_Chrome_icon_%282011%29.png" alt="Chrome" className="w-8 h-8" />
         </button>
         <button key="github" className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-200 hover:scale-110">
           <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub" className="w-8 h-8" />
         </button>
         <button key="vscode" className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-200 hover:scale-110">
           <img src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg" alt="VSCode" className="w-8 h-8" />
         </button>
        </div>
      )}
    {/* Apps Button */}
    <button
      ref={appsBtnRef}
      className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center cursor-pointer transition-transform duration-150 hover:ring-2 hover:ring-blue-200 hover:scale-110 z-60"
      onClick={() => setShowAppsPopup((prev) => !prev)}
    >
      <img src="https://cdn-icons-png.flaticon.com/512/1828/1828817.png" alt="Plus" className="w-8 h-8" />
    </button>
  </div>
)}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Projects - Blue gradient */}
        <div className="rounded-3xl p-6 relative bg-gradient-to-br from-blue-400 to-blue-700 text-white shadow-md">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-sm text-white" style={{ fontFamily: 'Inter, sans-serif' }}>Total Projects</h3>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border border-white/30 bg-white/10">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-5xl font-bold mb-2 leading-none">{dashboardData.totalProjects}</div>
          <p className="text-xs text-white/80">All company projects</p>
        </div>

        {/* Ended Projects */}
        <div className="rounded-3xl p-6 relative bg-white border border-gray-200 shadow-md">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-sm text-gray-800" style={{ fontFamily: 'Inter, sans-serif' }}>Ended Projects</h3>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 bg-gray-50">
              <TrendingUp className="w-4 h-4 text-gray-600" />
            </div>
          </div>
          <div className="text-5xl font-bold mb-2 leading-none text-gray-900">{dashboardData.endedProjects}</div>
          <p className="text-xs text-blue-600">Completed projects</p>
        </div>

        {/* Running Projects */}
        <div className="rounded-3xl p-6 relative bg-white border border-gray-200 shadow-md">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-sm text-gray-800" style={{ fontFamily: 'Inter, sans-serif' }}>Running Projects</h3>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 bg-gray-50">
              <TrendingUp className="w-4 h-4 text-gray-600" />
            </div>
          </div>
          <div className="text-5xl font-bold mb-2 leading-none text-gray-900">{dashboardData.runningProjects}</div>
          <p className="text-xs text-blue-600">Active projects</p>
        </div>

        {/* Pending Projects */}
        <div className="rounded-3xl p-6 relative bg-white border border-gray-200 shadow-md">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold text-sm text-gray-800" style={{ fontFamily: 'Inter, sans-serif' }}>Pending Projects</h3>
            <div className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 bg-gray-50">
              <TrendingUp className="w-4 h-4 text-gray-600" />
            </div>
          </div>
          <div className="text-5xl font-bold mb-2 leading-none text-gray-900">{dashboardData.pendingProjects}</div>
          <p className="text-xs text-blue-600">Not started</p>
        </div>
      </div>

      {/* Main Content Grid - Custom Layout */}
      <div className="flex flex-wrap gap-6 mt-6">
        {/* Project Analytics */}
        <div className="min-w-[580px] max-w-[650px] w-full flex-1 bg-white p-6 border border-gray-200 shadow-md flex flex-col justify-between" style={{ height: '216px', borderRadius: '30px', opacity: 1 }}>
          <h3 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Project Analytics</h3>
          <div className="flex-1 flex items-end justify-between w-full h-full">
            {/* Bar Chart - Static Data */}
            {staticProjectAnalytics.map((item) => (
              <div key={item.name} className="flex flex-col items-center justify-end h-full">
                <div className="w-8 rounded-t-lg" style={{width: `${50}px` , height: `${item.value * 1.5}px`, background: 'linear-gradient(180deg, #4FC3F7 0%, #1976D2 100%)' }}></div>
                <span className="text-xs text-gray-500 mt-2">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Reminders */}
        <div className="min-w-[250px] max-w-[310px] w-full flex-1 bg-white p-6 border border-gray-200 shadow-md flex flex-col justify-between" style={{ height: '217px', borderRadius: '30px', opacity: 1 }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Reminders</h3>
          <div>
            {dashboardData.reminders.length > 0 ? (
              <>
                <div className="text-blue-600 font-semibold cursor-pointer mb-1">{dashboardData.reminders[0].title}</div>
                <div className="text-gray-500 text-sm mb-4">Time: {dashboardData.reminders[0].time}</div>
                <a 
                  href="https://meet.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-medium border-none cursor-pointer text-sm transition-colors duration-200 hover:bg-blue-800 w-full justify-center inline-flex"
                >
                  <Video size={16} /> Start Meeting
                </a>
              </>
            ) : (
              <div className="text-gray-500 text-sm">No reminders</div>
            )}
          </div>
        </div>
        {/* Time Tracker */}
        <div className="min-w-[250px] max-w-[310px] w-full flex-1 p-6 shadow-md flex flex-col items-center justify-center" style={{ height: '217px', borderRadius: '30px', opacity: 1, borderWidth: '1px', borderStyle: 'solid', borderColor: '#e5e7eb', background: 'linear-gradient(135deg, #1976D2 0%, #4FC3F7 100%)' }}>
          <h3 className="text-lg font-semibold text-white mb-4 self-start" style={{ fontFamily: 'Inter, sans-serif' }}>Time Tracker</h3>
          <div className="text-4xl font-bold mb-6 tracking-wider font-mono text-white">{formatTime(elapsedTime)}</div>
          {/* Removed Pause and Stop buttons */}
        </div>
        {/* Projects */}
        <div className="min-w-[250px] max-w-[350px] w-full flex-1 bg-white p-6 border border-gray-200 shadow-md flex flex-col" style={{ height: '355px', borderRadius: '30px', opacity: 1 }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>Projects</h3>
            {canCreateProject && (
              <button onClick={onCreateProject} className="border border-blue-500 text-blue-500 px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-50">+ New</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-3">
              {Array.isArray(dashboardData.projects) && dashboardData.projects.length > 0 ? (
                dashboardData.projects.map((proj, projIdx) => (
                  <div key={proj._id || proj.id || proj.title || projIdx} className="flex items-center gap-3">
                    <span className={`w-4 h-4 rounded inline-block`} style={{ backgroundColor: proj.color || '#60a5fa' }}></span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900" style={{ fontFamily: 'Roboto, sans-serif' }}>{proj.title}</div>
                      <div className="text-xs text-gray-500" style={{ fontFamily: 'Roboto, sans-serif' }}>
                        Due date: {proj.endDate ? new Date(proj.endDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-sm">No projects found</div>
              )}
            </div>
          </div>
        </div>
        {/* Project Progress */}
        <div className="min-w-[250px] max-w-[310px] w-full flex-1 bg-white p-6 border border-gray-200 shadow-md flex flex-col items-center justify-center" style={{ height: '352px', borderRadius: '30px', opacity: 1 }}>
          <h3 className="text-lg font-semibold text-gray-900 mb-6 self-start" style={{ fontFamily: 'Inter, sans-serif' }}>Project Progress</h3>
          <div className="flex flex-col items-center justify-center flex-1 w-full">
            <div className="relative w-72 h-52 flex items-center justify-center" >
              {dashboardData.projectProgress.completed + dashboardData.projectProgress.inProgress + dashboardData.projectProgress.pending > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart style={{ marginTop: '-15%' }}>
                    <Pie
                      data={[
                        { name: "Completed", value: dashboardData.projectProgress.completed },
                        { name: "InProgress", value: dashboardData.projectProgress.inProgress },
                        { name: "Pending", value: dashboardData.projectProgress.pending },
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
                        <Cell key="completed" fill="#3182ce" />
                        <Cell key="inprogress" fill="#4FC3F7" />
                        <Cell key="pending" fill="#cbd5e0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500">No tasks yet</div>
              )}
              {dashboardData.projectProgress.completed + dashboardData.projectProgress.inProgress + dashboardData.projectProgress.pending > 0 && (
                <div className="absolute left-1/2 top-[72%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-full">
                  <div className="text-3xl font-extrabold text-gray-900 leading-none">
                    {Math.round((dashboardData.projectProgress.completed / (dashboardData.projectProgress.completed + dashboardData.projectProgress.inProgress + dashboardData.projectProgress.pending)) * 100)}%
                  </div>
                  <div className="text-lg text-blue-500 font-semibold mt-1">Tasks Done</div>
                </div>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-600">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-400"></div>
                <span className="text-xs text-gray-600">In Progress</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                <span className="text-xs text-gray-600">Pending</span>
              </div>
            </div>
          </div>
        </div>
        {/* Team Collaboration */}
        <div className="min-w-[580px] max-w-[650px] w-full flex-1 bg-white p-6 border border-gray-200 shadow-md flex flex-col" style={{ height: '355px', borderRadius: '30px', opacity: 1 }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>Team Collaboration</h3>
            {canCreateUser && (
              <button onClick={onAddMember} className="border border-blue-500 text-blue-500 px-3 py-1 rounded-full text-xs font-medium hover:bg-blue-50">+ Add Member</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-4">
              {dashboardData.teamMembers.length > 0 ? (
                dashboardData.teamMembers.map((member, idx) => (
                  <div key={member._id || member.email || idx} className="flex items-center gap-3">
                    <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">{member.name}</div>
                      <div className="text-xs text-gray-500">
                        Working on{' '}
                        {member.projectTasks.length > 0 
                          ? member.projectTasks[0].projectTitle 
                          : 'No Project'}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      member.projectTasks.length > 0 && member.projectTasks[0].tasks.length > 0
                        ? member.projectTasks[0].tasks.some(t => t.status === 'Completed')
                          ? member.projectTasks[0].tasks.every(t => t.status === 'Completed')
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {member.projectTasks.length > 0 && member.projectTasks[0].tasks.length > 0
                        ? member.projectTasks[0].tasks.every(t => t.status === 'Completed')
                          ? 'Completed'
                          : member.projectTasks[0].tasks.some(t => t.status === 'Completed')
                          ? 'Ongoing'
                          : 'Pending'
                        : 'No Tasks'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-sm">No team members assigned to projects yet</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Project handled via dedicated page */}
    </div>
  )
}

export default Dashboard