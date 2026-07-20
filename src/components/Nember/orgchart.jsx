import React, { useState, useRef, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, writeBatch, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, getUserFromToken } from "../../firebase";

const buildTreeFromUsers = (users) => {
  if (!users || users.length === 0) return null;

  // Create lookup map of nodes
  const nodeMap = {};
  users.forEach((u) => {
    nodeMap[u.uid] = {
      id: u.uid,
      name: u.name || u.email || "Unknown",
      role: u.designation || u.role || "Member",
      empId: u.email || "",
      collapsed: false,
      children: [],
    };
  });

  // Keep track of nodes with parents
  const hasParent = new Set();

  users.forEach((u) => {
    const parentUids = u.parentuid || [];
    parentUids.forEach((pUid) => {
      if (nodeMap[pUid] && nodeMap[u.uid]) {
        // Prevent duplicate child nodes
        if (!nodeMap[pUid].children.some((c) => c.id === u.uid)) {
          nodeMap[pUid].children.push(nodeMap[u.uid]);
        }
        hasParent.add(u.uid);
      }
    });
  });

  // Find root candidates (users who are not children of anyone)
  const rootCandidates = users.filter((u) => !hasParent.has(u.uid));

  if (rootCandidates.length === 0) {
    return nodeMap[users[0].uid];
  }

  // Prioritize explicitly marked root node
  const explicitRoot = rootCandidates.find((r) => r.isRoot === true || r.isRoot === "true");
  if (explicitRoot && nodeMap[explicitRoot.uid]) {
    return nodeMap[explicitRoot.uid];
  }

  // Choose the best root candidate
  const rootWithChildren = rootCandidates.find(
    (r) => r.childrenuid && r.childrenuid.length > 0
  );
  if (rootWithChildren) {
    return nodeMap[rootWithChildren.uid];
  }

  const adminRoot = rootCandidates.find((r) =>
    ["admin", "sadmin"].includes(r.role?.toLowerCase())
  );
  if (adminRoot) {
    return nodeMap[adminRoot.uid];
  }

  return nodeMap[rootCandidates[0].uid];
};


const COLORS = [
  "#2196F3", "#4CAF50", "#FF9800", "#9C27B0", "#E91E63",
  "#3F51B5", "#009688", "#FFC107", "#795548", "#00BCD4",
  "#FF5722", "#673AB7", "#8BC34A", "#607D8B", "#F44336"
];



const CARD_W = 220;
const CARD_H = 80;
const H_GAP = 80;
const V_GAP = 20;

// ─── Static tree data (replaces API call) ───
const STATIC_TREE = {
  id: 1,
  name: "CEO",
  role: "Chief Executive Officer",
  empId: "001",
  collapsed: false,
  children: [
    {
      id: 2,
      name: "John Doe",
      role: "Manager",
      empId: "101",
      collapsed: false,
      children: [
        {
          id: 5,
          name: "Alex Brown",
          role: "Engineer",
          empId: "103",
          collapsed: false,
          children: [],
        },
        {
          id: 6,
          name: "Emily Davis",
          role: "Engineer",
          empId: "104",
          collapsed: false,
          children: [],
        },
      ],
    },
    {
      id: 3,
      name: "Jane Smith",
      role: "Lead",
      empId: "102",
      collapsed: false,
      children: [
        {
          id: 7,
          name: "Michael Lee",
          role: "Designer",
          empId: "105",
          collapsed: false,
          children: [],
        },
      ],
    },
    {
      id: 4,
      name: "Sarah Wilson",
      role: "HR Manager",
      empId: "106",
      collapsed: false,
      children: [],
    },
  ],
};

function countAll(node) {
  return node.children.reduce((a, c) => a + 1 + countAll(c), 0);
}

function subtreeHeight(node) {
  if (node.collapsed || node.children.length === 0) return CARD_H;
  const childrenH =
    node.children.reduce((a, c) => a + subtreeHeight(c), 0) +
    (node.children.length - 1) * V_GAP;
  return Math.max(CARD_H, childrenH);
}

function NodeTree({ node, level, onEdit, onAdd, onRemove, onToggle, rootId, isAdmin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const sh = subtreeHeight(node);
  const childrenVisible = !node.collapsed && node.children.length > 0;

  let childOffsets = [];
  if (childrenVisible) {
    let y = 0;
    for (const child of node.children) {
      const h = subtreeHeight(child);
      childOffsets.push({ child, y, h });
      y += h + V_GAP;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", position: "relative" }}>
      {/* Card */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: sh, position: "relative", minWidth: CARD_W }}>
        <div style={{
          width: CARD_W, height: CARD_H,
          display: "flex", alignItems: "center",
          background: "#fff",
          border: "1px solid #e8edf2",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          borderRadius: 12,
          position: "relative",
          userSelect: "none",
        }}>
          {/* Color band */}
          <div style={{ width: 14, height: "100%", background: COLORS[level % COLORS.length], borderRadius: "12px 0 0 12px", flexShrink: 0 }} />

          {/* Avatar */}
          <div style={{
            width: 38, height: 38, borderRadius: "50%",
            background: `${COLORS[level % COLORS.length]}33`,
            margin: "0 8px", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: "bold", color: COLORS[level % COLORS.length],
          }}>
            {node.name.charAt(0)}
          </div>

          {/* Info */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.name}</div>
            <div style={{ fontSize: 11, color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{node.role}</div>
            <div style={{ fontSize: 10, color: "#999" }}>Emp ID: {node.empId}</div>
          </div>

          {/* 3-dot menu */}
          {!(node.id === rootId && !isAdmin) && (
            <div style={{ position: "absolute", right: 6, top: 6 }}>
              <button
                onClick={() => setMenuOpen((m) => !m)}
                style={{ border: "none", background: "transparent", fontSize: 16, cursor: "pointer", color: "#888", padding: "2px 4px" }}
              >
                ⋮
              </button>
              {menuOpen && (
                <div style={{ position: "absolute", right: 0, top: 22, background: "#fff", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", zIndex: 200, minWidth: 90, overflow: "hidden" }}>
                  <div
                    onClick={() => { onEdit(node); setMenuOpen(false); }}
                    style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13 }}
                  >
                    ✏️ Edit
                  </div>
                  {node.id !== rootId && (
                    <div
                      onClick={() => { onRemove(node.id); setMenuOpen(false); }}
                      style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13, color: "#e53935" }}
                    >
                      🗑 Remove
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Add child button */}
          {isAdmin && (
            <button
              onClick={() => onAdd(node.id)}
              style={{
                position: "absolute", right: -14, top: "50%", transform: "translateY(-50%)",
                width: 26, height: 26, borderRadius: "50%", border: "none",
                background: COLORS[level % COLORS.length], color: "#fff",
                cursor: "pointer", fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)", zIndex: 10,
              }}
            >
              +
            </button>
          )}

          {/* Collapse toggle */}
          {node.children.length > 0 && (
            <button
              onClick={() => onToggle(node.id)}
              style={{
                position: "absolute", right: -14, bottom: -10,
                width: 22, height: 22, borderRadius: "50%",
                border: "2px solid #bbb", background: "#fff",
                cursor: "pointer", fontSize: 10, fontWeight: "bold", color: "#555",
                display: "flex", alignItems: "center", justifyContent: "center", zIndex: 11,
              }}
            >
              {node.collapsed ? `+${countAll(node)}` : "−"}
            </button>
          )}
        </div>
      </div>

      {/* Connectors + children */}
      {childrenVisible && childOffsets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "row", position: "relative" }}>
          {/* SVG curved connectors */}
          <svg
            style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}
            width={H_GAP}
            height={sh}
          >
            {childOffsets.map(({ child, y, h }) => {
              const childMidY = y + h / 2;
              const parentMidY = sh / 2;
              return (
                <path
                  key={child.id}
                  d={`M0,${parentMidY} C${H_GAP / 2},${parentMidY} ${H_GAP / 2},${childMidY} ${H_GAP},${childMidY}`}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth={1.5}
                />
              );
            })}
          </svg>

          {/* Children */}
          <div style={{ marginLeft: H_GAP, display: "flex", flexDirection: "column", gap: V_GAP }}>
            {childOffsets.map(({ child }) => (
              <NodeTree
                key={child.id}
                node={child}
                level={level + 1}
                onEdit={onEdit}
                onAdd={onAdd}
                onRemove={onRemove}
                onToggle={onToggle}
                rootId={rootId}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgChart() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [editingNode, setEditingNode] = useState(null);
  const containerRef = useRef(null);

  const [tree, setTree] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Adding Unassigned Users
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const currentUser = getUserFromToken();
  const currentRole = currentUser?.role?.toLowerCase() || "member";
  const isAdmin = ["admin", "sadmin", "hr", "hr_manager"].includes(currentRole);

  const zoomRef = useRef(1);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const fetchUsersAndBuildTree = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const users = [];
      querySnapshot.forEach((docSnap) => {
        users.push({ ...docSnap.data() });
      });
      setUsersList(users);

      const builtTree = buildTreeFromUsers(users);
      if (builtTree) {
        setTree(builtTree);
      } else {
        // Fallback to static tree if db has no users or no tree built
        setTree(STATIC_TREE);
      }
    } catch (error) {
      console.error("Error fetching users for org chart:", error);
      setTree(STATIC_TREE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndBuildTree();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      const currentZoom = zoomRef.current;
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      const nextZoom = Math.min(Math.max(currentZoom + delta, 0.3), 2.5);

      const contentX = (pointerX - pan.x) / currentZoom;
      const contentY = (pointerY - pan.y) / currentZoom;

      setZoom(nextZoom);
      setPan({
        x: pointerX - contentX * nextZoom,
        y: pointerY - contentY * nextZoom,
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [pan.x, pan.y]);

  const updateTree = (callback) => {
    setTree((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      callback(copy);
      return copy;
    });
  };

  const addNode = (id) => {
    setSelectedParentId(id);
    setShowAddModal(true);
  };

  const handleAddMember = async (parentUid, childUid) => {
    try {
      const parentUser = usersList.find((u) => u.uid === parentUid);
      const childUser = usersList.find((u) => u.uid === childUid);

      if (!parentUser || !childUser) {
        alert("Parent or child user not found.");
        return;
      }

      const parentEmailKey = parentUser.email.replace(/\./g, "_");
      const childEmailKey = childUser.email.replace(/\./g, "_");

      const batch = writeBatch(db);

      // Update parent: append child's uid to childrenuid
      const parentRef = doc(db, "users", parentEmailKey);
      batch.update(parentRef, {
        childrenuid: arrayUnion(childUid),
      });

      // Update child: set parent's uid in parentuid
      const childRef = doc(db, "users", childEmailKey);
      batch.update(childRef, {
        parentuid: arrayUnion(parentUid),
      });

      await batch.commit();

      setShowAddModal(false);
      setSearchTerm("");
      // Re-fetch users and rebuild tree
      await fetchUsersAndBuildTree();
    } catch (error) {
      console.error("Error adding child member:", error);
      alert("Failed to add user to the tree.");
    }
  };

  const handleRemoveNode = async (nodeId) => {
    if (!tree || nodeId === tree.id) {
      alert("Cannot remove the root node.");
      return;
    }

    if (!window.confirm("Are you sure you want to remove this user from the organizational hierarchy?")) {
      return;
    }

    try {
      // Find the parent user of this node
      const parentUser = usersList.find(
        (u) => u.childrenuid && u.childrenuid.includes(nodeId)
      );
      const childUser = usersList.find((u) => u.uid === nodeId);

      const batch = writeBatch(db);

      if (parentUser) {
        const parentEmailKey = parentUser.email.replace(/\./g, "_");
        const parentRef = doc(db, "users", parentEmailKey);
        batch.update(parentRef, {
          childrenuid: arrayRemove(nodeId),
        });
      }

      if (childUser && parentUser) {
        const childEmailKey = childUser.email.replace(/\./g, "_");
        const childRef = doc(db, "users", childEmailKey);
        batch.update(childRef, {
          parentuid: arrayRemove(parentUser.uid),
        });
      }

      await batch.commit();

      // Re-fetch and build tree
      await fetchUsersAndBuildTree();
    } catch (error) {
      console.error("Error removing user from hierarchy:", error);
      alert("Failed to remove user.");
    }
  };

  const removeNode = (id) => {
    handleRemoveNode(id);
  };

  const toggleCollapse = (id) => updateTree((root) => {
    const tog = (n) => { if (n.id === id) n.collapsed = !n.collapsed; else n.children.forEach(tog); };
    tog(root);
  });

  const handleEditNode = async (oldUid, newUid) => {
    if (oldUid === newUid) {
      setEditingNode(null);
      return;
    }

    try {
      const oldUser = usersList.find((u) => u.uid === oldUid);
      const newUser = usersList.find((u) => u.uid === newUid);

      if (!oldUser || !newUser) {
        alert("Employee not found.");
        return;
      }

      const oldEmailKey = (oldUser.email || "").replace(/\./g, "_");
      const newEmailKey = (newUser.email || "").replace(/\./g, "_");
      if (!oldEmailKey || !newEmailKey) {
        alert("Employee email is missing.");
        return;
      }

      // 1. Find the parent of oldUser
      const parentUser = usersList.find(
        (u) => u.childrenuid && u.childrenuid.includes(oldUid)
      );

      const isEditingRoot = !parentUser;


      if (parentUser) {
        const parentEmailKey = parentUser.email.replace(/\./g, "_");
        const updatedChildren = parentUser.childrenuid.map((uid) =>
          uid === oldUid ? newUid : uid
        );
        await updateDoc(doc(db, "users", parentEmailKey), {
          childrenuid: updatedChildren,
        });
      }

      // 2. Update new user parent and children
      const oldChildren = oldUser.childrenuid || [];
      const newUserUpdate = {
        parentuid: parentUser ? [parentUser.uid] : [],
        childrenuid: oldChildren,
      };
      if (isEditingRoot) {
        newUserUpdate.isRoot = true;
      }
      await updateDoc(doc(db, "users", newEmailKey), newUserUpdate);

      // 3. Update old children's parent to new user
      for (const childUid of oldChildren) {
        const childUser = usersList.find((u) => u.uid === childUid);
        if (childUser) {
          const childEmailKey = childUser.email.replace(/\./g, "_");
          await updateDoc(doc(db, "users", childEmailKey), {
            parentuid: [newUid],
          });
        }
      }

      // 4. Clear old user hierarchy
      const oldUserUpdate = {
        parentuid: [],
        childrenuid: [],
      };
      if (isEditingRoot) {
        oldUserUpdate.isRoot = false;
      }
      await updateDoc(doc(db, "users", oldEmailKey), oldUserUpdate);

      // 5. Clean up any other users that might have isRoot set to true to ensure single root consistency
      if (isEditingRoot) {
        const otherRoots = usersList.filter(
          (u) => (u.isRoot === true || u.isRoot === "true") && u.uid !== newUid && u.uid !== oldUid
        );
        for (const otherRoot of otherRoots) {
          if (otherRoot.email) {
            const otherEmailKey = otherRoot.email.replace(/\./g, "_");
            await updateDoc(doc(db, "users", otherEmailKey), { isRoot: false });
          }
        }
      }

      setEditingNode(null);
      await fetchUsersAndBuildTree();
    } catch (error) {
      console.error("Error editing node:", error);
      alert("Failed to update employee mapping: " + error.message);
    }
  };

  // Helper to filter unassigned users: parentuid is empty AND childrenuid is empty
  const getUnassignedUsers = (users, currentRootId) => {
    return users.filter((u) => {
      // Exclude the root of the tree
      if (u.uid === currentRootId) return false;

      const hasNoParent = !u.parentuid || u.parentuid.length === 0;
      const hasNoChildren = !u.childrenuid || u.childrenuid.length === 0;

      return hasNoParent && hasNoChildren;
    });
  };

  const filteredUnassignedUsers = getUnassignedUsers(usersList, tree?.id).filter(
    (user) =>
      (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.role || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.designation || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || !tree) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-gray-500 animate-pulse">Loading Org Chart...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans" style={{ fontFamily: "Roboto, sans-serif" }}>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-1" style={{ fontFamily: "Inter, sans-serif" }}>
          Org Chart
        </h1>
      </div>

      <div style={{ width: "100%", height: "70vh", overflow: "hidden", position: "relative", background: "#f0f4f8" }}>
        {/* Canvas */}
        <div
          ref={containerRef}
          style={{ width: "100%", height: "100%", overflowX: "auto", overflowY: "hidden", cursor: "default", WebkitOverflowScrolling: "touch" }}
        >
          <div style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            display: "inline-block",
            width: "max-content",
            minWidth: "100%",
            padding: "20px",
          }}>
            <NodeTree
              node={tree}
              level={0}
              onEdit={setEditingNode}
              onAdd={addNode}
              onRemove={removeNode}
              onToggle={toggleCollapse}
              rootId={tree.id}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        {/* Zoom + Reset controls */}
        <div style={{ position: "fixed", right: 20, bottom: 20, display: "flex", flexDirection: "column", gap: 8, zIndex: 300 }}>
          {[["＋", 0.1], ["−", -0.1]].map(([label, delta]) => (
            <button
              key={label}
              onClick={() => setZoom((z) => Math.min(Math.max(z + delta, 0.3), 2.5))}
              style={{ width: 42, height: 42, borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontSize: 20, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => { setZoom(1); setPan({ x: 40, y: 40 }); }}
            style={{ width: 42, height: 42, borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontSize: 16, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
          >
            ↺
          </button>
        </div>

        {/* Edit modal */}
        {editingNode && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justify: "center", zIndex: 500 }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, minWidth: 280, maxWeight: "80vw", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
              <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: "bold" }}>Select Employee</h3>
              <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: 12 }} className="custom-scrollbar">
                {usersList.map((emp) => (
                  <div
                    key={emp.uid}
                    onClick={() => handleEditNode(editingNode.id, emp.uid)}
                    style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer", border: "1px solid #eee" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.name || emp.email}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{emp.designation || emp.role || "Member"} · {emp.email}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setEditingNode(null)}
                style={{ marginTop: 8, width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", background: "#f9f9f9" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 transition-all duration-300">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transform transition-all duration-300">

              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">Add Team Member</h3>
                  <p className="text-xs text-gray-500 mt-1">Select an unassigned employee to place under this node</p>
                </div>
                <button
                  onClick={() => { setShowAddModal(false); setSearchTerm(""); }}
                  className="text-gray-400 hover:text-gray-700 transition cursor-pointer p-1.5 hover:bg-gray-100 rounded-full"
                >
                  ✕
                </button>
              </div>

              {/* Search Input */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name, email, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                  />
                  <span className="absolute left-3.5 top-3.5 text-gray-400">
                    🔍
                  </span>
                </div>
              </div>

              {/* Modal Body / User List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar min-h-[300px]">
                {filteredUnassignedUsers.length > 0 ? (
                  filteredUnassignedUsers.map((user) => (
                    <div
                      key={user.uid}
                      onClick={() => handleAddMember(selectedParentId, user.uid)}
                      className="group flex items-center gap-4 p-3.5 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {/* Avatar initials */}
                      <div className="w-11 h-11 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform duration-200">
                        {(user.name || user.email || "U").charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.name || "No Name"}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        <p className="inline-block mt-1 text-[10px] font-medium text-blue-600 bg-blue-50/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {user.designation || user.role || "Member"}
                        </p>
                      </div>

                      {/* Add symbol */}
                      <div className="w-8 h-8 rounded-full border border-gray-200 group-hover:border-blue-500 group-hover:bg-blue-500 flex items-center justify-center text-gray-400 group-hover:text-white transition-all duration-200 shadow-sm">
                        ＋
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="text-4xl mb-3">👥</span>
                    <p className="text-sm font-semibold text-gray-900">No unassigned users found</p>
                    <p className="text-xs text-gray-400 max-w-[240px] mt-1">All registered users are already part of the organizational hierarchy.</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button
                  onClick={() => { setShowAddModal(false); setSearchTerm(""); }}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}