// src/pages/LibraryDashboard.tsx
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useMemo } from 'react';

// Updated Tab Styles to match the "Pill" design
const tabStyles = (isActive: boolean): React.CSSProperties => ({
  background: isActive ? '#FFF8E1' : 'transparent', // Solid cream active, transparent inactive
  color: isActive ? '#4A3328' : '#FFF8E1', // Dark brown text active, Cream text inactive
  border: 'none',
  width: 'calc(100% - 24px)', // Width calculation for margin
  textAlign: 'left',
  padding: '12px 20px',
  margin: '0 12px', // Side margins to create the floating effect
  cursor: 'pointer',
  borderRadius: '30px', // High border radius for pill shape
  fontSize: '1rem',
  fontWeight: isActive ? '700' : '500',
  display: 'flex',
  alignItems: 'center',
  gap: '12px', // Space between icon (if added later) and text
  boxShadow: isActive
    ? '0 4px 10px rgba(0,0,0,0.15)'
    : 'none',
  transition: 'all 0.3s ease',
});

export default function LibraryDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab using memoized logic (Unchanged)
  const activeTab = useMemo(() => {
    const path = location.pathname;

    if (path.includes("ai-analytics")) return "ai-analytics";
    if (path.includes("requests") && !path.includes("acquisition")) return "requests";
    if (path.includes("acquisition-requests")) return "acquisition-requests";
    if (path.includes("returns")) return "returns";
    if (path.includes("waitlist")) return "waitlist";
    if (path.includes("manage-book") || path.includes("add-book")) return "inventory";
    if (path.includes("penalty")) return "penalties";
    if (path.includes("reports")) return "reports";
    if (path.includes("settings")) return "settings";

    return "inventory"; // Default to inventory instead of requests
  }, [location.pathname]);

  const navigateTab = (tab: string) => {
    switch (tab) {
      case "returns":
        navigate("/library-dashboard/returns");
        break;
      case "inventory":
        navigate("/library-dashboard/manage-book");
        break;
      case "penalties":
        navigate("/library-dashboard/penalty");
        break;
      case "acquisition-requests":
        navigate("/library-dashboard/acquisition-requests");
        break;
      case "requests":
        navigate("/library-dashboard/requests");
        break;
      case "logout":
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.assign('/login');
        break;
      default:
        navigate(`/library-dashboard/${tab}`);
        break;
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F9F6F0', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Sidebar: Updated to Solid Deep Brown style */}
      <div
        style={{
          width: '270px',
          minWidth: '270px',
          maxWidth: '270px',
          flex: 'none',
          background: '#613613', // Solid Deep Brown
          color: '#FFF8E1',
          padding: '24px 0', // Vertical padding only
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
              fontFamily: '"Playfair Display", serif', // Serif font for header
              color: '#FFF8E1',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <span>📚</span> Librarian Portal
          </h3>
        </div>

        {/* Sidebar Nav */}
        <ul style={{ listStyle: "none", padding: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { key: "inventory", label: "Books", icon: "📖" },
            { key: "requests", label: "Issues", icon: "⚠️" },
            { key: "acquisition-requests", label: "Acquisitions", icon: "📚" },
            { key: "returns", label: "Returns", icon: "🔄" },
            { key: "waitlist", label: "Waitlist", icon: "📋" },
            { key: "penalties", label: "Penalties", icon: "💰" },
            { key: "ai-analytics", label: "AI Analytics", icon: "🤖" },
            { key: "reports", label: "Reports", icon: "📊" },
            { key: "settings", label: "Settings", icon: "⚙️" },
            { key: "logout", label: "Logout", icon: "🚪" }
          ].map(item => {
             const isActive = activeTab === item.key;
             const isLogout = item.key === "logout";
             return (
              <li key={item.key}>
                <button
                  onClick={() => navigateTab(item.key)}
                  style={{
                    ...tabStyles(isActive),
                    color: isLogout ? '#ffcccb' : tabStyles(isActive).color,
                    fontWeight: isLogout ? 600 : tabStyles(isActive).fontWeight,
                  }}
                  onMouseEnter={(e) => {
                    if (isLogout) {
                      e.currentTarget.style.color = "#ff5252";
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    } else if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 248, 225, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isLogout) {
                      e.currentTarget.style.color = "#ffcccb";
                      e.currentTarget.style.background = "transparent";
                    } else if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span style={{ fontSize: '1.1rem', width: '24px', textAlign: 'center' }}>{item.icon}</span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, padding: "20px" }}>
        <Outlet />
      </div>
    </div>
  );
}
