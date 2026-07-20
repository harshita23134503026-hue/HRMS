import { Routes, Route, useLocation } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Projects from "./pages/Projects";
import TimeSheet from "./pages/TimeSheet";
import CreateProjects from "./pages/CreateProject";
import ProjectPage from "./components/Project/ProjectPage";
import Layout from "./Layout";
import LeaveManagement from "./components/Leave/leave_apply";
import RegularizationWindow from "./components/Requlization/requlization_Apply";
import TaskUpdates from "./pages/TaskUpdates";
import AssignTask from "./pages/AssignTask";
import AddTaskPage from "./components/AddTaskPage";
import DayDetailsModal from "./components/DayDetailsModal";
import OrgChart from "./components/Nember/orgchart";
import ProfileSettings from "./pages/Profile";
import Team from "./pages/Team";

function App() {
  const location = useLocation();
  // Check if we navigated here to show a modal on top of a background page
  const state = location.state;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <>
      {/* Main routes - render background location if modal is open */}
      <Routes location={backgroundLocation || location}>
        {/* Login without Navbar & Sidebar */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* All pages with Navbar & Sidebar */}
        <Route element={<Layout />}>
          <Route path="/orgchart" element={<OrgChart />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/timesheet" element={<TimeSheet />} />
          <Route path="/assigntask" element={<AssignTask />} />
          <Route path="/createproject" element={<CreateProjects />} />
          <Route path="/projects/:projectId" element={<ProjectPage />} />
          <Route path="/projects/:projectId/tasks/:taskId/updates"element={<TaskUpdates />}/>
          <Route path="/leaveApply" element={<LeaveManagement />} />
          <Route path="/RegularizationApply" element={<RegularizationWindow />}/>
          <Route path="/taskupdates" element={<TaskUpdates />} />
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/team" element={<Team />} />
          {/* Task creation - full page */}
          <Route path="/task/new/:date" element={<AddTaskPage />} />
          {/* Day details - standalone (direct URL visit / refresh) */}
          <Route path="/day/:date" element={<DayDetailsModal standalone />}/>
        </Route>
      </Routes>

      {/* Modal route rendered on top when backgroundLocation exists */}
      {backgroundLocation && (
        <Routes>
          <Route path="/day/:date" element={<DayDetailsModal />} />
        </Routes>
      )}
    </>
  );
}

export default App;