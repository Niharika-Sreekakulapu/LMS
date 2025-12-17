// src/pages/AdminDashboard.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { approveUser, listUsers, rejectUser } from "../api/adminApi";
import type { UserSummary } from "../types/dto";
import axios from "axios";
import client from "../api/axiosClient";
import { useAuth } from "../hooks/useAuth";
import Toast, { type ToastType } from "../components/Toast";


type UnknownRecord = Record<string, unknown>;

function extractMessageFromUnknown(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const obj = data as UnknownRecord;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.message === "string") return obj.message;
    try {
      return JSON.stringify(obj);
    } catch {
      return null;
    }
  }
  return null;
}

function monthLabel(i: number) {
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i];
}

function getCreatedAtRaw(u: Partial<UserSummary>): string | null {
  const rec = u as unknown as UnknownRecord;
  if (rec.createdAt && typeof rec.createdAt === "string") return rec.createdAt;
  if (rec.created_at && typeof rec.created_at === "string") return rec.created_at;
  if (rec.created && typeof rec.created === "string") return rec.created;
  return null;
}
function getPhone(u: Partial<UserSummary>): string | null {
  const rec = u as unknown as UnknownRecord;
  const phone = rec.phone ?? rec.mobile ?? rec.contact ?? null;
  return phone ? String(phone) : null;
}
function getStatus(u: Partial<UserSummary>): string {
  const rec = u as unknown as UnknownRecord;
  const status = rec.status ?? rec.userStatus ?? rec.accountStatus ?? "";
  return String(status).toUpperCase();
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType }>>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { auth } = useAuth();

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Pagination state for pending requests table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [requestsPerPage] = useState<number>(5);

  const loadUsers = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const resp = await listUsers();
      setUsers(Array.isArray(resp.data) ? (resp.data as UserSummary[]) : []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = extractMessageFromUnknown(err.response?.data) ?? err.message ?? "Could not load users";
        setError(msg);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not load users");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth || !auth.token) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        try {
          (client.defaults.headers.common as Record<string,string>)["Authorization"] = `Bearer ${auth.token}`;
        } catch {
          /* ignore */
        }

        const resp = await listUsers();
        const userData = Array.isArray(resp.data) ? (resp.data as UserSummary[]) : [];
        if (!cancelled) setUsers(userData);
      } catch (err: unknown) {
        if (!cancelled) {
          if (axios.isAxiosError(err)) {
            const msg = extractMessageFromUnknown(err.response?.data) ?? err.message ?? "Could not load users";
            setError(msg);
          } else if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Could not load users");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const id = setInterval(() => {
      if (auth && auth.token) void loadUsers();
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [auth?.token, loadUsers]);

  const onApprove = async (id: number) => {
    setError(null);
    setActionLoading(id);
    try {
      await approveUser(id);
      await loadUsers();
      addToast("User approved successfully", "success");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = extractMessageFromUnknown(err.response?.data) ?? err.message ?? "Approve failed";
        setError(msg);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Approve failed");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const onReject = async (id: number) => {
    const ok = window.confirm("Are you sure you want to reject this user?");
    if (!ok) return;

    setError(null);
    setActionLoading(id);
    try {
      await rejectUser(id, "Rejected from admin UI");
      await loadUsers();
      addToast("User rejected successfully", "success");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = extractMessageFromUnknown(err.response?.data) ?? err.message ?? "Reject failed";
        setError(msg);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Reject failed");
      }
    } finally {
      setActionLoading(null);
    }
  };

  const { total, pending, approved, rejected, monthlyCounts, studentCount, librarianCount } = useMemo(() => {
    const totals = { total: 0, pending: 0, approved: 0, rejected: 0 };
    let students = 0, librarians = 0;
    const months = new Array<number>(12).fill(0);

    users.forEach((u) => {
      totals.total++;
      const status = getStatus(u).toLowerCase();
      if (status.includes("pending")) totals.pending++;
      else if (status.includes("approve")) totals.approved++;
      else if (status.includes("reject")) totals.rejected++;

      // Count roles
      if (u.role === "STUDENT" || u.role === "student") students++;
      if (u.role === "LIBRARIAN" || u.role === "librarian") librarians++;

      const created = getCreatedAtRaw(u);
      if (created) {
        const d = new Date(created);
        if (!Number.isNaN(d.getTime())) months[d.getMonth()]++;
      }
    });

    return { total: totals.total, pending: totals.pending, approved: totals.approved, rejected: totals.rejected, monthlyCounts: months, studentCount: students, librarianCount: librarians };
  }, [users]);

  const pieSegments = useMemo(() => [
    { label: "Pending", value: pending, color: "#D97706" },
    { label: "Approved", value: approved, color: "#10B981" },
    { label: "Rejected", value: rejected, color: "#EF4444" },
  ], [pending, approved, rejected]);

  const lineData = useMemo(() => {
    const w = 600, h = 300, pad = 40;
    const data = monthlyCounts.slice();
    const max = Math.max(1, ...data);
    const stepX = (w - pad * 2) / Math.max(1, data.length - 1);
    const points = data.map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (h - pad * 2) * (1 - v / max);
      return `${x},${y}`;
    }).join(" ");
    return { w, h, pad, poly: points, max, data, stepX };
  }, [monthlyCounts]);

  const totalRequestsList = useMemo(() => users
    .filter((u) => {
      const status = getStatus(u).toLowerCase();
      const isNotAdmin = u.role !== "ADMIN" && u.role !== "admin";
      const isNotCurrentUser = u.id !== auth?.user?.id;
      return isNotAdmin && isNotCurrentUser && status.includes("pending");
    })
    .slice()
    .sort((a, b) => {
      const da = new Date(getCreatedAtRaw(a) ?? 0).getTime();
      const db = new Date(getCreatedAtRaw(b) ?? 0).getTime();
      return da - db;
    })
  , [users, auth?.user?.id]);

  // Pagination calculations
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentTotalRequests = totalRequestsList.slice(indexOfFirstRequest, indexOfLastRequest);
  const totalPages = Math.ceil(totalRequestsList.length / requestsPerPage);

  // Reset pagination when total requests list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [totalRequestsList.length]);

  const isExactAdminPath = location.pathname === "/admin" || location.pathname === "/admin/";

  // --- UPDATED STYLING TO MATCH IMAGE (Pill Shape) ---
  const tabStyles = (isActive: boolean): React.CSSProperties => ({
    background: isActive ? '#FFF8E1' : 'transparent', // Solid cream active, transparent inactive
    color: isActive ? '#643c29ff' : '#FFF8E1', // Dark brown text active, Cream text inactive
    border: 'none',
    width: 'calc(100% - 24px)', // Width calculation for margin
    textAlign: 'left', // Align text left like in the image
    padding: '12px 20px',
    margin: '0 12px', // Side margins to create the floating effect
    cursor: 'pointer',
    borderRadius: '30px', // High border radius for pill shape
    fontSize: '1rem',
    fontWeight: isActive ? '700' : '500',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: isActive
      ? '0 4px 10px rgba(0,0,0,0.15)'
      : 'none',
    transition: 'all 0.3s ease',
  });

  // Sidebar menu helper (used to render)
  const menu = [
    { label: "Dashboard", path: "/admin", icon: "🏠" },
    { label: "Users", path: "/admin/users", icon: "👥" },
    { label: "Books", path: "/admin/books", icon: "📚" },
    { label: "Penalties", path: "/admin/penalties", icon: "💰" },
    { label: "Issues", path: "/admin/requests", icon: "⚠️" },
    { label: "Requests", path: "/admin/acquisition-requests", icon: "📚" },

    { label: "Returns", path: "/admin/returns", icon: "🔄" },
    { label: "Reports", path: "/admin/reports", icon: "📊" },
    { label: "Settings", path: "/admin/settings", icon: "⚙️" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', system-ui, Arial, sans-serif", background: "#f3f4f6", fontSize: "15px" }}>

      {/* --------- SIDEBAR: Modern Academia Style --------- */}
      <div
        style={{
          width: '270px',
          minWidth: '270px',
          maxWidth: '270px',
          flex: 'none',
          background: '#472a16', // Solid Deep Brown (matches your image)
          color: '#FFF8E1',
          padding: '24px 0', // Vertical padding only, horiz padding handled by items
          boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
          position: 'relative',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ marginBottom: 30, paddingLeft: 24, paddingRight: 24 }}>
          <h3
            style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              fontFamily: '"Playfair Display", serif', // Added serif font
              color: '#FFF8E1',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
           <span>🎓</span> Admin Portal
          </h3>
        </div>

        <ul style={{ listStyle: "none", padding: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menu.map((it) => {
            const isActive = it.path === "/admin" ? location.pathname === "/admin" || location.pathname === "/admin/" : location.pathname.startsWith(it.path);
            return (
              <li key={it.path}>
                <button
                  onClick={() => navigate(it.path)}
                  style={tabStyles(isActive)}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 248, 225, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span style={{ fontSize: '1.1rem', width: '24px', textAlign: 'center' }}>{it.icon}</span>
                  {it.label}
                </button>
              </li>
            );
          })}
        </ul>

         {/* Logout button - Pushed to bottom */}
         <div style={{ padding: '0 12px', marginTop: 'auto', marginBottom: '20px' }}>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/login";
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 20px",
                width: "100%",
                borderRadius: "30px",
                background: "transparent",
                color: "#ffcccb",
                border: "none",
                textAlign: "left",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ff5252";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#ffcccb";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: "1.1rem", width: '24px', textAlign: 'center' }}>🚪</span>
              <span>Logout</span>
            </button>
         </div>

        {/* User Info Footer */}
        <div style={{ padding: '20px 24px', borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 13, color: "rgba(255,248,225, 0.7)" }}>Signed in as</div>
          <div style={{ color: "#FFF8E1", fontWeight: 'bold', fontSize: 14 }}>{auth?.user?.name ?? "—"}</div>
        </div>
      </div>

      {/* --------- MAIN --------- */}
      <main style={{ flex: 1, padding: 22, boxSizing: "border-box" }}>

        {isExactAdminPath ? (
          <>
            {/* Dashboard overview (unchanged) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#111827" }}>Dashboard</h1>
                <div style={{ color: "#6b7280", marginTop: 6, fontSize: 16 }}>Overview</div>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button onClick={() => void loadUsers()} style={{ padding: "8px 14px", borderRadius: 8, background: "#111827", color: "white", border: "none", cursor: "pointer", fontWeight: 700 }}>Refresh</button>
              </div>
            </div>

            {/* stat cards, charts, pending table etc. (unchanged) */}
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 12 }}>
              <div style={{ background: "linear-gradient(135deg, #8B4513 0%, #654321 100%)", color: "#F4E4BC", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 4px 15px rgba(139, 69, 19, 0.3)", border: "1px solid #E8D1A7" }}>
                <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{total}</div>
                <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>👥 Total Users</div>
              </div>

              <div style={{ background: "linear-gradient(135deg, #E8D1A7 0%, #CDA776 100%)", color: "#2A1F16", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 4px 15px rgba(232, 209, 167, 0.3)" }}>
                <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{pending}</div>
                <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>⏳ Pending Requests</div>
              </div>

              <div style={{ background: "linear-gradient(135deg, #D2691E 0%, #A0522D 100%)", color: "#F4E4BC", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 4px 15px rgba(210, 105, 30, 0.3)" }}>
                <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{rejected}</div>
                <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>❌ Rejected Requests</div>
              </div>

              <div style={{ background: "linear-gradient(135deg, #9A5B34 0%, #6B4423 100%)", color: "#F4E4BC", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 4px 15px rgba(154, 91, 52, 0.3)" }}>
                <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{studentCount}</div>
                <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>🎓 Student Requests</div>
              </div>

              <div style={{ background: "linear-gradient(135deg, #654321 0%, #442D1C 100%)", color: "#F4E4BC", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 4px 15px rgba(101, 67, 33, 0.3)" }}>
                <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>{librarianCount}</div>
                <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>📚 Librarian Requests</div>
              </div>
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "white", padding: 28, borderRadius: 12, minHeight: 420 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>Request Status</div>
                  <div style={{ color: "#6b7280", fontSize: 16 }}>Distribution</div>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 16, alignItems: "center" }}>
                  <svg width={340} height={250} viewBox="0 0 300 250" aria-hidden>
                    <g transform="translate(150,125)">
                      {(() => {
                        const radius = 95;
                        const circumference = 2 * Math.PI * radius;
                        let offset = 0;
                        const segs = pieSegments;
                        const sum = Math.max(1, segs.reduce((s, x) => s + x.value, 0));
                        return segs.map((s) => {
                          const stroke = (s.value / sum) * circumference;
                          const dashArray = `${stroke} ${circumference - stroke}`;
                          const el = (
                            <circle
                              key={s.label}
                              r={radius}
                              fill="transparent"
                              stroke={s.color}
                              strokeWidth={45}
                              strokeDasharray={dashArray}
                              strokeDashoffset={-offset}
                              transform="rotate(-90)"
                            />
                          );
                          offset += stroke;
                          return el;
                        });
                      })()}
                    </g>
                  </svg>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {pieSegments.map((p) => (
                      <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 16, height: 16, background: p.color, borderRadius: 6 }} />
                        <div style={{ fontWeight: 700, minWidth: 80, fontSize: 16 }}>{p.label}</div>
                        <div style={{ color: "#6b7280", fontSize: 16 }}>{p.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ background: "white", padding: 28, borderRadius: 12, minHeight: 420 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>Monthly Registrations</div>
                  <div style={{ color: "#6b7280", fontSize: 16 }}>Last 12 months</div>
                </div>

                <svg width={600} height={300} viewBox="0 0 600 300" style={{ marginTop: 16 }}>
                  {/* Grid lines - shifted right */}
                  {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => (
                    <line key={String(idx)} x1={50} x2={580} y1={40 + 220 * t} y2={40 + 220 * t} stroke="#eef2ff" strokeWidth={1} />
                  ))}

                  {/* Calculate points for the line */}
                  {(() => {
                    const dataPoints = lineData.data.map((v, i) => {
                      const x = 50 + i * (530 / 11); // For 12 months (0-11), shifted right
                      const max = Math.max(1, ...lineData.data);
                      const y = 40 + 220 * (1 - v / max);
                      return { x, y };
                    });

                    const linePoints = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

                    // Create polygon points: line points + bottom right + bottom left
                    const polygonPoints = linePoints + ` 580,260 50,260`;

                    return (
                      <>
                        {/* Background fill */}
                        <polygon fill="rgba(96,165,250,0.12)" points={polygonPoints} />

                        {/* Line */}
                        <polyline fill="none" stroke="#60a5fa" strokeWidth={3} points={linePoints} />
                      </>
                    );
                  })()}

                  {/* Month labels - shifted right */}
                  {Array.from({ length: 12 }, (_, i) => {
                    const x = 50 + i * (530 / 11);
                    return (
                      <text key={i} x={x} y={285} textAnchor="middle" fontSize={12} fill="#6b7280">
                        {monthLabel(i)}
                      </text>
                    );
                  })}

                  {/* Max value label */}
                  <text x={585} y={55} textAnchor="end" fontSize={14} fill="#6b7280">
                    {Math.max(1, ...lineData.data)}
                  </text>
                </svg>
              </div>
            </div>

            <div style={{ marginTop: 16, background: "white", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px" }}>
                <div style={{ fontWeight: 800, fontSize: 20 }}>Total Requests</div>
                <div style={{ color: "#6b7280", fontSize: 16 }}>{totalRequestsList.length} total requests</div>
              </div>

              <div style={{ overflowX: "auto", marginTop: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000, fontSize: "16px", tableLayout: "fixed", borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: "#fafafa" }}>
                      <th style={{ padding: "10px 2px", textAlign: "center", fontWeight: 700, fontSize: "16px", width: "6%" }}>ID</th>
                      <th style={{ padding: "10px 4px", textAlign: "left", fontWeight: 700, fontSize: "16px", width: "11%" }}>Name</th>
                      <th style={{ padding: "10px 4px", textAlign: "left", fontWeight: 700, fontSize: "16px", width: "25%" }}>Email</th>
                      <th style={{ padding: "10px 2px", textAlign: "center", fontWeight: 700, fontSize: "16px", width: "10%" }}>Role</th>
                      <th style={{ padding: "10px 2px", textAlign: "left", fontWeight: 700, fontSize: "16px", width: "10%" }}>Phone</th>
                      <th style={{ padding: "10px 4px", textAlign: "left", fontWeight: 700, fontSize: "16px", width: "10%" }}>Requested</th>
                      <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: 700, fontSize: "16px", width: "24%" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", fontSize: "16px" }}>Loading...</td></tr>
                    )}

                    {!loading && currentTotalRequests.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", fontSize: "16px" }}>No requests found</td></tr>
                    )}

                    {!loading && currentTotalRequests.map((u) => (
                      <tr key={u.id} style={{ borderTop: "1px solid #eef2f7" }}>
                        <td style={{ padding: "10px 6px", textAlign: "center", fontSize: "16px" }}>{u.id}</td>
                        <td style={{ padding: "10px 6px", textAlign: "left", fontSize: "16px" }}>{u.name}</td>
                        <td style={{ padding: "10px 6px", textAlign: "left", fontSize: "16px", wordBreak: "break-all" }}>{u.email}</td>
                        <td style={{ padding: "10px 6px", textAlign: "center", fontSize: "16px" }}>
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: 600,
                            textTransform: "capitalize",
                            background: u.role === "STUDENT" || u.role === "student" ? "#d1fae5" : "#fef3c7",
                            color: u.role === "STUDENT" || u.role === "student" ? "#065f46" : "#92400e"
                          }}>
                            {(u.role || "Unknown").toLowerCase()}
                          </span>
                        </td>
                        <td style={{ padding: "10px 6px", textAlign: "left", fontSize: "16px" }}>{getPhone(u) ?? "-"}</td>
                        <td style={{ padding: "10px 6px", textAlign: "left", fontSize: "14px" }}>{new Date(getCreatedAtRaw(u) ?? Date.now()).toLocaleDateString()}</td>
                        <td style={{ padding: "10px 2px", textAlign: "center", fontSize: "16px", whiteSpace: "nowrap", height: "56px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                          {getStatus(u).toLowerCase().includes("pending") ? (
                            <>
                              <button onClick={() => void onApprove(u.id)} disabled={actionLoading === u.id} style={{ marginRight: 8, padding: "10px 12px", borderRadius: 8, border: "none", background: "#2563EB", color: "white", fontWeight: 700, cursor: actionLoading === u.id ? "wait" : "pointer", fontSize: "14px", minHeight: "40px", minWidth: "90px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                                {actionLoading === u.id ? "…" : <><span>✓</span>Approve</>}
                              </button>
                              <button onClick={() => void onReject(u.id)} disabled={actionLoading === u.id} style={{ padding: "10px 12px", borderRadius: 8, border: "none", background: "#DC2626", color: "white", fontWeight: 700, cursor: actionLoading === u.id ? "wait" : "pointer", fontSize: "14px", minHeight: "40px", minWidth: "90px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                                {actionLoading === u.id ? "…" : <><span>✕</span>Reject</>}
                              </button>
                            </>
                          ) : (
                            <div style={{
                              padding: "4px 12px",
                              borderRadius: "6px",
                              fontWeight: 600,
                              fontSize: "14px",
                              background: getStatus(u).toLowerCase().includes("approve") ? "#d4edda" : "#f8d7da",
                              color: getStatus(u).toLowerCase().includes("approve") ? "#155724" : "#721c24"
                            }}>
                              {getStatus(u) === "APPROVED" ? "✅ APPROVED" : getStatus(u) === "REJECTED" ? "❌ REJECTED" : "—"}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 16,
                  padding: "12px",
                  background: "#f9fafb",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}>
                  <div style={{ color: "#6b7280", fontSize: 14 }}>
                    Showing {indexOfFirstRequest + 1} to {Math.min(indexOfLastRequest, totalRequestsList.length)} of {totalRequestsList.length} requests
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: "6px 12px",
                        border: "1px solid #d1d5db",
                        background: currentPage === 1 ? "#f3f4f6" : "#ffffff",
                        color: currentPage === 1 ? "#9ca3af" : "#374151",
                        borderRadius: 6,
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      Previous
                    </button>
                    <div style={{ display: "flex", gap: 4 }}>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            style={{
                              padding: "6px 10px",
                              border: "1px solid #d1d5db",
                              background: currentPage === pageNum ? "#111827" : "#ffffff",
                              color: currentPage === pageNum ? "#ffffff" : "#374151",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontSize: 14,
                              fontWeight: 500,
                              minWidth: "32px",
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: "6px 12px",
                        border: "1px solid #d1d5db",
                        background: currentPage === totalPages ? "#f3f4f6" : "#ffffff",
                        color: currentPage === totalPages ? "#9ca3af" : "#374151",
                        borderRadius: 6,
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && <div style={{ marginTop: 12, color: "#b91c1c", fontWeight: 700 }}>{error}</div>}
          </>
        ) : (
          // render nested admin routes (books, users, settings, etc.)
          <Outlet />
        )}
      </main>

      {/* Toasts */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
