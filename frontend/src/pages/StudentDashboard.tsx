import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Set activeTab based on current path (Logic Unchanged)
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('requests')) return 'requests';
    if (path.includes('membership')) return 'membership';
    if (path.includes('borrows') || path.includes('history')) return 'borrows';
    if (path.includes('waitlist')) return 'waitlist';
    if (path.includes('fines') || path.includes('penalty')) return 'fines';
    if (path.includes('profile')) return 'profile';
    return 'home'; // default - home/search first priority
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tab: string) => {
    if (tab === 'home') {
      navigate('/student-dashboard');
    } else if (tab === 'requests') {
      navigate('/student-dashboard/requests');
    } else if (tab === 'membership') {
      navigate('/student-dashboard/membership');
    } else if (tab === 'borrows') {
      navigate('/student-dashboard/borrows');
    } else if (tab === 'waitlist') {
      navigate('/student-dashboard/waitlist');
    } else if (tab === 'fines') {
      navigate('/student-dashboard/fines');
    } else if (tab === 'profile') {
      navigate('/student-dashboard/profile');
    }
  };

  // Shared Tab Styles for the "Pill" design
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
    gap: '12px',
    boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.15)' : 'none',
    transition: 'all 0.3s ease',
    position: 'relative',
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', height: '100vh', backgroundColor: '#F9F6F0', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Sidebar */}
      <div style={{
        width: '270px',
        minWidth: '270px',
        maxWidth: '270px',
        background: '#613613', // Solid Deep Brown
        color: '#FFF8E1',
        padding: '24px 0',
        boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        flex: 'none'
      }}>
        
        {/* Header */}
        <div style={{ marginBottom: 30, paddingLeft: 24, paddingRight: 24 }}>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            fontFamily: '"Playfair Display", serif',
            color: '#FFF8E1',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span>🎓</span> Student Portal
          </h3>
        </div>

        {/* Navigation List */}
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <li>
            <button
              onClick={() => handleTabClick('home')}
              style={tabStyles(activeTab === 'home')}
              onMouseEnter={(e) => {
                if (activeTab !== 'home') e.currentTarget.style.backgroundColor = 'rgba(255, 248, 225, 0.1)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'home') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '1.1rem', width: '24px', textAlign: 'center' }}>📚</span>
              Books
            </button>
          </li>

          <li>
            <button
              onClick={() => handleTabClick('requests')}
              style={tabStyles(activeTab === 'requests')}
              onMouseEnter={(e) => {
                if (activeTab !== 'requests') e.currentTarget.style.backgroundColor = 'rgba(255, 248, 225, 0.1)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'requests') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '1.1rem', width: '24px', textAlign: 'center' }}>📋</span>
              My Requests
            </button>
          </li>

          <li>
            <button
              onClick={() => handleTabClick('membership')}
              style={tabStyles(activeTab === 'membership')}
              onMouseEnter={(e) => {
                if (activeTab !== 'membership') e.currentTarget.style.backgroundColor = 'rgba(255, 248, 225, 0.1)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'membership') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '1.1rem', width: '24px', textAlign: 'center' }}>🏷️</span>
              Membership
            </button>
          </li>

          <li>
            <button
              onClick={() => handleTabClick('borrows')}
              style={tabStyles(activeTab === 'borrows')}
              onMouseEnter={(e) => {
                if (activeTab !== 'borrows') e.currentTarget.style.backgroundColor = 'rgba(255, 248, 225, 0.1)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'borrows') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '1.1rem', width: '24px', textAlign: 'center' }}>🕰️</span>
              My Borrows
            </button>
          </li>

          <li>
            <button
              onClick={() => handleTabClick('waitlist')}
              style={tabStyles(activeTab === 'waitlist')}
              onMouseEnter={(e) => {
                if (activeTab !== 'waitlist') e.currentTarget.style.backgroundColor = 'rgba(255, 248, 225, 0.1)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'waitlist') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '1.1rem', width: '24px', textAlign: 'center' }}>📋</span>
              Waitlist
            </button>
          </li>

          <li>
            <button
              onClick={() => handleTabClick('fines')}
              style={tabStyles(activeTab === 'fines')}
              onMouseEnter={(e) => {
                if (activeTab !== 'fines') e.currentTarget.style.backgroundColor = 'rgba(255, 248, 225, 0.1)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'fines') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '1.1rem', width: '24px', textAlign: 'center' }}>💰</span>
              Fines
            </button>
          </li>

          <li>
            <button
              onClick={() => handleTabClick('profile')}
              style={tabStyles(activeTab === 'profile')}
              onMouseEnter={(e) => {
                if (activeTab !== 'profile') e.currentTarget.style.backgroundColor = 'rgba(255, 248, 225, 0.1)';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'profile') e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ fontSize: '1.1rem', width: '24px', textAlign: 'center' }}>👤</span>
              Profile
            </button>
          </li>

          <li>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
              }}
              style={{
                ...tabStyles(false),
                color: '#ffcccb',
                fontWeight: 600,
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
              <span style={{ fontSize: '1.1rem', width: '24px', textAlign: 'center' }}>🚪</span>
              Logout
            </button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        minHeight: '100vh',
        position: 'relative',
        zIndex: 1
      }}>
        <Outlet />
      </div>
    </div>
  );
};

export default StudentDashboard;
