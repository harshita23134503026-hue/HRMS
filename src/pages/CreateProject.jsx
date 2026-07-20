import React, { useEffect, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import TableCal from "../components/Basic/tableCal";  // <-- IMPORT POPUP CALENDAR
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, getUserFromToken } from "../firebase";

const CreateProject = () => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');

  // Calendar states
  const [openCalendar, setOpenCalendar] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [showMoreAvatars, setShowMoreAvatars] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load real employees from Firestore
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingUsers(true);
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const employeeList = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          employeeList.push({
            id: doc.id,
            uid: data.uid || "", // Store member UID
            name: data.name || "Unnamed User",
            role: data.role || "Member",
            img: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name || "User")}`,
            email: data.email
          });
        });
        setEmployees(employeeList);
      } catch (error) {
        console.error("Error fetching employees from db: ", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchEmployees();
  }, []);

  // -------- Calendar Handling --------
  const openCalFor = (field) => {
    setActiveField(field);
    setOpenCalendar(true);
  };

  const handleDateSelect = (date) => {
    const formatted = date.toDateString();

    if (activeField === "start") setStartDate(formatted);
    if (activeField === "due") setDueDate(formatted);
  };

  // -------- Form Submit --------
  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      const currentUser = getUserFromToken();
      const creatorUid = currentUser?.id || currentUser?.uid || "";
      const creatorName = currentUser?.name || "";
      const creatorEmail = currentUser?.email || "";

      const selectedEmployees = employees.filter(emp => selectedEmployeeIds.includes(emp.id));
      const team = selectedEmployees.map(emp => emp.name);
      const participantDetails = selectedEmployees.map(emp => ({
        id: emp.id,
        uid: emp.uid || "", // Store member UID
        name: emp.name,
        role: emp.role
      }));
      const participantUids = selectedEmployees.map(emp => emp.uid || "").filter(Boolean);

      // Generate a new document reference to obtain a unique projectId beforehand
      const projectRef = doc(collection(db, "projects"));
      const newProjectId = projectRef.id;

      const payload = {
        projectId: newProjectId, // Explicit projectId field
        title: projectName,
        description,
        startDate,
        endDate: dueDate,
        participants: selectedEmployeeIds,
        participantUids, // Store members' UIDs
        creatorUid,     // Store creator's UID
        creatorName,
        creatorEmail,
        team,
        participantDetails,
        status: "pending",
        progress: 0,
        priority: "ok",
        stats: { views: 0, comments: 0 },
        createdAt: new Date().toISOString()
      };

      await setDoc(projectRef, payload);

      // Update each selected employee's user document to add the new project ID
      const creatorDocId = creatorEmail ? creatorEmail.replace(/\./g, "_") : "";
      const usersToUpdate = Array.from(
        new Set([...selectedEmployeeIds, creatorDocId])
      ).filter(Boolean);

      const updatePromises = usersToUpdate.map((empId) => {
        const userRef = doc(db, "users", empId);
        return updateDoc(userRef, {
          projectIds: arrayUnion(newProjectId)
        });
      });
      await Promise.all(updatePromises);

      setProjectName("");
      setDescription("");
      setStartDate("");
      setDueDate("");
      setSelectedEmployeeIds([]);

      navigate('/dashboard');
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-auto p-4">
      <div className="w-full">
        <h1 className="text-3xl font-normal mb-6">Create New Project</h1>

        <div className="bg-gray-100 p-4 rounded-3xl mb-6 border border-gray-200 h-auto w-full">

          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8 bg-white shadow rounded-xl p-6 w-full border border-gray-200 mt-4">

            {/* LEFT SIDE FORM */}
            <div className="flex-1 min-w-[350px]">

              {/* Project Name */}
              <label className="block text-gray-700 font-medium mb-2">Project Name</label>
              <input
                type="text"
                placeholder="Enter Project Name"
                className="w-full h-[48px] px-4 border rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-400"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />

              {/* Description */}
              <label className="block text-gray-700 font-medium mb-2 mt-6">Description</label>
              <textarea
                className="w-full h-[120px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {/* Date Selection with Custom Popup Calendar */}
              <label className="block text-gray-700 font-medium mb-2 mt-6">Select Duration</label>
              <div className="flex items-end gap-8">

                {/* Start Date Button */}
                <div className="flex flex-col">
                  <label className="text-gray-700 font-medium">Start Date</label>
                  <button
                    type="button"
                    onClick={() => openCalFor("start")}
                    className="w-[180px] h-[48px] border border-gray-300 rounded-lg px-4 bg-white text-left"
                  >
                    {startDate || "Select date"}
                  </button>
                </div>

                {/* Due Date Button */}
                <div className="flex flex-col">
                  <label className="text-gray-700 font-medium">Due Date</label>
                  <button
                    type="button"
                    onClick={() => openCalFor("due")}
                    className="w-[180px] h-[48px] border border-gray-300 rounded-lg px-4 bg-white text-left"
                  >
                    {dueDate || "Select date"}
                  </button>
                </div>

              </div>

              {/* Selected Employees - Avatars (Dynamic) */}
              <div className="mt-6">
                <label className="block text-gray-700 font-medium mb-2">Selected Employees</label>

                <div className="flex items-center min-h-[32px]">
                  {selectedEmployeeIds.length === 0 ? (
                    <span className="text-xs text-gray-500">No employees selected</span>
                  ) : (
                    employees
                      .filter(emp => selectedEmployeeIds.includes(emp.id))
                      .map((emp, idx) => (
                        <img
                          key={emp.id}
                          src={emp.img}
                          alt={emp.name}
                          title={emp.name}
                          className={`w-8 h-8 rounded-full border-2 border-white object-cover ${idx > 0 ? '-ml-2' : ''}`}
                        />
                      ))
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-between gap-12 mt-6">
                <button type="button" className="border border-blue-400 text-blue-500 rounded-xl px-10 py-3" onClick={() => navigate(-1)}>
                  Cancel
                </button>

                <button
                  type="submit"
                  className={`rounded-xl px-10 py-3 text-white ${
                    selectedEmployeeIds.length === 0 || submitting
                      ? 'bg-blue-500/60 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  disabled={selectedEmployeeIds.length === 0 || submitting}
                >
                  {submitting
                    ? 'Creating...'
                    : selectedEmployeeIds.length === 0
                      ? 'Select members to create'
                      : 'Create'}
                </button>
              </div>
            </div>

            {/* RIGHT SIDE EMPLOYEE DROPDOWN */}
            <div className="w-[438px]">
              <div className={`bg-white border border-blue-500 shadow ${showEmployeeList ? 'rounded-t-xl' : 'rounded-xl'}`}>

                <button
                  type="button"
                  className="w-full flex items-center justify-between px-6 py-4 border-b-2 border-blue-600 bg-white"
                  onClick={() => setShowEmployeeList(!showEmployeeList)}
                >
                  <span className="font-medium text-gray-700">Select Employee</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      {selectedEmployeeIds.length} selected
                    </span>
                    <FaChevronDown
                      className={`text-blue-500 transition-transform ${showEmployeeList ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {showEmployeeList && (
                  <div>
                    {loadingUsers ? (
                      <div className="px-6 py-3 text-sm text-gray-500">Loading...</div>
                    ) : employees.length === 0 ? (
                      <div className="px-6 py-3 text-sm text-gray-500">No team members available</div>
                    ) : employees.map((emp, idx) => (
                      <div
                        key={emp.id}
                        className={`flex items-center px-6 py-3 cursor-pointer hover:bg-gray-100
                          ${idx !== employees.length - 1 ? 'border-b border-gray-200' : ''}
                        `}
                        onClick={() => {
                          setSelectedEmployeeIds(prev => (
                            prev.includes(emp.id)
                              ? prev.filter(id => id !== emp.id)
                              : [...prev, emp.id]
                          ))
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployeeIds.includes(emp.id)}
                          onChange={() => {
                            setSelectedEmployeeIds(prev => (
                              prev.includes(emp.id)
                                ? prev.filter(id => id !== emp.id)
                                : [...prev, emp.id]
                            ))
                          }}
                          className="mr-4 w-4 h-4 accent-blue-600"
                        />
                        <img src={emp.img} alt={emp.name} className="w-10 h-10 rounded-full mr-4 border-2" />
                        <div>
                          <div className="text-gray-800 font-semibold">
                            {emp.name}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {emp.role}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          </form>

        </div>
      </div>

      {/* POPUP CALENDAR */}
      <TableCal
        isOpen={openCalendar}
        onClose={() => setOpenCalendar(false)}
        onSelect={handleDateSelect}
      />

    </div>
  );
};

export default CreateProject;