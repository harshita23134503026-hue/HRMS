import { Routes, Route } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Projects from "./pages/Projects";
import TimeSheet from "./pages/TimeSheet";
import CreateProjects from "./pages/CreateProject"
import ProjectPage from "./components/Project/ProjectPage"
import Layout from "./Layout";
import LeaveManagement from "./components/Leave/leave_apply";
import RegularizationWindow from "./components/Requlization/requlization_Apply";
import TaskUpdates from "./pages/TaskUpdates";
import AssignTask from "./pages/AssignTask";

function App() {

  return (
    <Routes>
      {/* Login without Navbar & Sidebar */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />

      {/* All pages with Navbar & Sidebar */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/timesheet" element={<TimeSheet />} />
        <Route path="/assigntask" element={<AssignTask />} />
        <Route path="/createproject" element={<CreateProjects />} />
        <Route path="/timesheet" element={<TimeSheet />} />
        <Route path="/projects/:projectId" element={<ProjectPage />} />
        <Route path="/projects/:projectId/tasks/:taskId/updates" element={<TaskUpdates />} />
        <Route path="/leaveApply" element={<LeaveManagement />} />
        <Route path="/RegularizationApply" element={<RegularizationWindow />} />
      </Route>
    </Routes>
  );
}

export default App;