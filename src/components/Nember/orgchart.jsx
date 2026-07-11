import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { BASE_URL } from "../../utility/Config";

const COLORS = [
  "#2196F3","#4CAF50","#FF9800","#9C27B0","#E91E63",
  "#3F51B5","#009688","#FFC107","#795548","#00BCD4",
  "#FF5722","#673AB7","#8BC34A","#607D8B","#F44336"
];

const EMPLOYEES = [
  { name: "John Doe", role: "Manager", empId: "101" },
  { name: "Jane Smith", role: "Lead", empId: "102" },
  { name: "Alex Brown", role: "Engineer", empId: "103" },
];

const CARD_W = 220;
const CARD_H = 80;
const H_GAP = 80;
const V_GAP = 20;

const buildAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const normalizeRoleNode = (node) => ({
  id: node.id,
   name: node.personName || node.displayName || node.name,
   role: node.designation || node.name,
   empId: String(node.employeeId ?? node.membersCount ?? node.userCount ?? 0),
  collapsed: false,
  children: Array.isArray(node.children) ? node.children.map(normalizeRoleNode) : [],
});

const normalizeRoleTree = (nodes = []) => {
  const roots = nodes.map(normalizeRoleNode);

  if (roots.length === 1) {
    return roots[0];
  }

  return {
    id: "virtual-root",
    name: "Team Hierarchy",
    role: `${roots.length} root roles`,
    empId: `Roles: ${roots.length}`,
    collapsed: false,
    children: roots,
  };
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

function NodeTree({ node, level, onEdit, onAdd, onRemove, onToggle, rootId }) {
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

          {/* Add child button */}
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const containerRef = useRef(null);

  const [tree, setTree] = useState(null);
  const zoomRef = useRef(1);

  useEffect(() => {
    let active = true;

    const fetchTree = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await axios.get(`${BASE_URL}/rbac/roles/tree`, buildAuthHeader());
        const nextTree = normalizeRoleTree(response.data?.tree || []);
        if (active) {
          setTree(nextTree);
        }
      } catch (requestError) {
        console.error("Failed to load role hierarchy:", requestError);
        if (active) {
          setError(requestError.response?.data?.msg || "Failed to load role hierarchy");
          setTree(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchTree();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

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

  const addNode = (id) => updateTree((root) => {
    const add = (n) => {
      if (n.id === id) {
        n.children.push({ id: Date.now(), name: "New Member", role: "Role", empId: Math.floor(Math.random() * 1000).toString(), collapsed: false, children: [] });
      } else n.children.forEach(add);
    };
    add(root);
  });

  const removeNode = (id) => {
    if (id === tree.id) return;
    updateTree((root) => {
      const rem = (n) => { n.children = n.children.filter((c) => c.id !== id); n.children.forEach(rem); };
      rem(root);
    });
  };

  const toggleCollapse = (id) => updateTree((root) => {
    const tog = (n) => { if (n.id === id) n.collapsed = !n.collapsed; else n.children.forEach(tog); };
    tog(root);
  });

  const applyEdit = (emp) => {
    updateTree((root) => {
      const ed = (n) => {
        if (n.id === editingNode.id) { n.name = emp.name; n.role = emp.role; n.empId = emp.empId; }
        else n.children.forEach(ed);
      };
      ed(root);
    });
    setEditingNode(null);
  };

  return (
    <div style={{ width: "100vw", height: "70vh", overflow: "hidden", position: "relative", background: "#f0f4f8" }}>
      {/* Canvas */}
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", overflowX: "auto", overflowY: "hidden", cursor: "default", WebkitOverflowScrolling: "touch" }}
      >
        {loading ? (
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 14 }}>
            Loading hierarchy...
          </div>
        ) : error ? (
          <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", color: "#dc2626", fontSize: 14 }}>
            {error}
          </div>
        ) : !tree ? null : (
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
          />
        </div>
        )}
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, minWidth: 280, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <h3 style={{ marginBottom: 16, fontSize: 16 }}>Select Employee</h3>
            {EMPLOYEES.map((emp) => (
              <div
                key={emp.empId}
                onClick={() => applyEdit(emp)}
                style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer", border: "1px solid #eee" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{emp.name}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{emp.role} · {emp.empId}</div>
              </div>
            ))}
            <button
              onClick={() => setEditingNode(null)}
              style={{ marginTop: 8, width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", background: "#f9f9f9" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}