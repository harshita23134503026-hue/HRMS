/**
 * Data Mapper Utility
 * Maps API response field names to frontend display names
 * This ensures we use the actual API nomenclature without changing UI/UX
 */

/**
 * Maps Project API data to frontend display format
 * API Fields -> Frontend Display Names
 * - title -> projectName (for display)
 * - participants -> team (for display)
 * - startDate -> startDate
 * - endDate -> endDate
 * - description -> description
 */
export const mapProjectData = (apiProject) => {
  if (!apiProject) return null;

  return {
    // API field names (keep original for reference)
    id: apiProject.id,
    title: apiProject.title,
    participants: apiProject.participants,
    participantDetails: apiProject.participantDetails, // Include full user objects
    description: apiProject.description,
    startDate: apiProject.startDate,
    endDate: apiProject.endDate,
    createdBy: apiProject.createdBy,
    updatedBy: apiProject.updatedBy,
    companyId: apiProject.companyId,
    
    // Display aliases (for UI without changing current code)
    projectName: apiProject.title, // Alias for title
    team: apiProject.participants, // Alias for participants
  };
};

/**
 * Maps Task API data to frontend display format
 * API Fields -> Frontend Display Names
 * - title -> description (task title)
 * - assignedTo -> assignedTo (array of user IDs)
 * - status -> status
 * - startingDate -> startDate
 * - deadline -> dueDate
 */
export const mapTaskData = (apiTask) => {
  if (!apiTask) return null;

  return {
    // API field names (keep original for reference)
    id: apiTask.id,
    title: apiTask.title,
    assignedTo: apiTask.assignedTo,
    status: apiTask.status,
    startingDate: apiTask.startingDate,
    deadline: apiTask.deadline,
    projectId: apiTask.projectId,
    createdBy: apiTask.createdBy,
    updatedBy: apiTask.updatedBy,
    assignedDate: apiTask.assignedDate,
    
    // Display aliases (for UI without changing current code)
    description: apiTask.title, // Alias for title
    startDate: apiTask.startingDate, // Alias for startingDate
    dueDate: apiTask.deadline, // Alias for deadline
  };
};

/**
 * Maps User API data to frontend display format
 * Handles both full user objects and user references
 */
export const mapUserData = (apiUser) => {
  if (!apiUser) return null;

  const primaryRole =
    apiUser.primaryRole ||
    apiUser.userRole ||
    apiUser.role ||
    apiUser.rbacRoles?.[0]?.name ||
    null;

  return {
    // API field names (Sequelize uses 'id', MongoDB uses '_id')
    id: apiUser.id || apiUser._id,
    _id: apiUser._id || apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    role: primaryRole,
    primaryRole,
    rbacRoles: Array.isArray(apiUser.rbacRoles) ? apiUser.rbacRoles : [],
    
    // Additional fields if available
    avatar: apiUser.avatar || null,
    department: apiUser.department || null,
    isOnline: Boolean(apiUser.isOnline),
    lastSeenAt: apiUser.lastSeenAt || null,
    lastSeenAgo: apiUser.lastSeenAgo || null,
  };
};

/**
 * Format date to readable format (dd/mm/yy)
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} - Formatted date string (dd/mm/yy)
 */
export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
};

/**
 * Get status color based on task status
 */
export const getStatusColor = (status) => {
  const colors = {
    "Not Started": "bg-gray-200 text-gray-800",
    "In Progress": "bg-blue-200 text-blue-800",
    "Completed": "bg-green-200 text-green-800",
  };
  return colors[status] || "bg-gray-200 text-gray-800";
};

export default {
  mapProjectData,
  mapTaskData,
  mapUserData,
  formatDate,
  getStatusColor,
};
