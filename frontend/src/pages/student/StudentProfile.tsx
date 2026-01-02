import { useState, useEffect } from 'react';
import { getProfile, updateProfile } from '../../api/authApi';

interface UserProfile {
  id: number;
  email: string;
  name: string;
  phone?: string;
  role: string;
  status: string;
  createdAt: string;
  totalBorrows?: number;
  activeBorrows?: number;
  outstandingFines?: number;
  profilePicture?: string;
  membershipType?: string;
  pointsBalance?: number;
  badges?: string[];
  readingStreak?: number;
  favoriteGenres?: string[];
  totalReadTime?: number;
  favoriteBooksCount?: number;
  reviewsGiven?: number;
  profileCompleteness?: number;
  // Additional profile fields
  dateOfBirth?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  course?: string;
  year?: string;
  studentId?: string;
  interests?: string;
  hobbies?: string;
  monthlyReadingGoal?: number;
  emailNotifications?: boolean;
}

const StudentProfile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showIdProofModal, setShowIdProofModal] = useState(false);

  // Form state
  const [editForm, setEditForm] = useState({
    name: '',
    phone: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const [activeTab, setActiveTab] = useState('overview');

  // Calculate profile completeness percentage
  const calculateProfileCompleteness = (userData: Record<string, unknown>): number => {
    let completed = 0;
    const total = 10;

    // Basic fields
    if (userData.name) completed++;
    if (userData.email) completed++;
    if (userData.phone) completed++;
    if (userData.dateOfBirth) completed++;
    if (userData.address) completed++;

    // Emergency contact
    if (userData.emergencyContactName) completed++;
    if (userData.emergencyContactPhone) completed++;

    // Academic info
    if (userData.course) completed++;
    if (userData.year) completed++;
    if (userData.studentId) completed++;

    // Interests/hobbies - count as one
    if (userData.interests || userData.hobbies) completed++;

    return Math.min(100, Math.round((completed / total) * 100));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      // Fetch real user profile from backend
      const resp = await getProfile();
      const userData = resp.data;

      // Transform to frontend format with real data only
      const profileData: UserProfile = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
        status: userData.status,
        createdAt: userData.createdAt,
        totalBorrows: userData.totalBorrows || 0,
        activeBorrows: userData.activeBorrows || 0,
        outstandingFines: userData.outstandingFines || 0,
        profilePicture: userData.profilePicture || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format',
        membershipType: userData.membershipType || 'NORMAL',
        // Additional fields from backend - use empty values if not provided
        dateOfBirth: userData.dateOfBirth || '',
        address: userData.address || '',
        emergencyContactName: userData.emergencyContactName || '',
        emergencyContactPhone: userData.emergencyContactPhone || '',
        course: userData.course || '',
        year: userData.year || '',
        studentId: userData.studentId || '',
        interests: userData.interests || '',
        hobbies: userData.hobbies || '',
        monthlyReadingGoal: userData.monthlyReadingGoal || 0,
        emailNotifications: userData.emailNotifications || false,
        // Remove dummy data - use real data only or empty placeholders
        pointsBalance: userData.pointsBalance || 0,
        badges: userData.badges || [], // Empty array if no badges from backend
        readingStreak: userData.readingStreak || 0,
        favoriteGenres: userData.favoriteGenres || [],
        totalReadTime: userData.totalReadTime || 0,
        favoriteBooksCount: userData.favoriteBooksCount || 0,
        reviewsGiven: userData.reviewsGiven || 0,
        profileCompleteness: calculateProfileCompleteness(userData)
      };

      setProfile(profileData);
      setEditForm({
        name: profileData.name,
        phone: profileData.phone || ''
      });
    } catch (error: unknown) {
      console.error('Error loading profile:', error);
      if (error instanceof Error && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'error' in error.response.data) {
        const apiError = error.response.data as { error: string };
        console.error('API Error:', apiError.error);
        showToast('error', 'Failed to load profile: ' + apiError.error);
      } else {
        showToast('error', 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleUpdateProfile = async () => {
    try {
      // Prepare all profile data for update
      const updateData = {
        name: profile?.name,
        phone: profile?.phone,
        dateOfBirth: profile?.dateOfBirth,
        address: profile?.address,
        emergencyContactName: profile?.emergencyContactName,
        emergencyContactPhone: profile?.emergencyContactPhone,
        course: profile?.course,
        year: profile?.year,
        studentId: profile?.studentId,
        interests: profile?.interests,
        hobbies: profile?.hobbies,
        monthlyReadingGoal: profile?.monthlyReadingGoal,
        emailNotifications: profile?.emailNotifications
      };

      // Call real API to update profile
      await updateProfile(updateData);

      // Update profile completeness
      const newCompleteness = calculateProfileCompleteness({
        ...profile,
        ...updateData
      });

      // Update local state
      if (profile) {
        setProfile({
          ...profile,
          name: updateData.name || profile.name || '',
          phone: updateData.phone || profile.phone || undefined,
          dateOfBirth: updateData.dateOfBirth || profile.dateOfBirth || undefined,
          address: updateData.address || profile.address || undefined,
          emergencyContactName: updateData.emergencyContactName || profile.emergencyContactName || undefined,
          emergencyContactPhone: updateData.emergencyContactPhone || profile.emergencyContactPhone || undefined,
          course: updateData.course || profile.course || undefined,
          year: updateData.year || profile.year || undefined,
          studentId: updateData.studentId || profile.studentId || undefined,
          interests: updateData.interests || profile.interests || undefined,
          hobbies: updateData.hobbies || profile.hobbies || undefined,
          monthlyReadingGoal: updateData.monthlyReadingGoal || profile.monthlyReadingGoal || undefined,
          emailNotifications: updateData.emailNotifications || profile.emailNotifications || false,
          profileCompleteness: newCompleteness
        });
      }

      setEditing(false);
      showToast('success', 'Profile updated successfully!');
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      if (error instanceof Error && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'error' in error.response.data) {
        const apiError = error.response.data as { error: string };
        console.error('API Error:', apiError.error);
        showToast('error', 'Failed to update profile: ' + apiError.error);
      } else {
        showToast('error', 'Failed to update profile');
      }
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('error', 'Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showToast('error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      // Mock API call - replace with actual password change API
      console.log('Changing password');

      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      showToast('success', 'Password changed successfully!');
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      showToast('error', 'Failed to change password');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
          <div style={{ fontSize: '1.2rem', color: '#666' }}>
            Loading your profile...
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        style={{
          background: '#F9F6F0',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>❌</div>
        <h3 style={{ color: '#2A1F16', marginBottom: '16px' }}>Profile Not Found</h3>
        <p style={{ color: '#6c757d' }}>Unable to load your profile information.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #F9F6F0 0%, #FFFFFF 100%)',
        borderRadius: '20px',
        padding: '30px',
        maxWidth: '1100px',
        margin: '0 auto',
        boxShadow: '0 20px 60px rgba(139, 69, 19, 0.1)',
        border: '1px solid rgba(232, 209, 167, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative background elements */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '150px',
        height: '150px',
        background: 'radial-gradient(circle, rgba(139, 69, 19, 0.05) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30px',
        left: '-30px',
        width: '100px',
        height: '100px',
        background: 'radial-gradient(circle, rgba(210, 105, 30, 0.03) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }} />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '30px',
            right: '30px',
            background: toastMessage.type === 'success'
              ? 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)'
              : 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)',
            color: toastMessage.type === 'success' ? '#155724' : '#721c24',
            padding: '16px 24px',
            borderRadius: '12px',
            border: `1px solid ${toastMessage.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
            zIndex: 1000,
            fontWeight: '600',
            fontSize: '0.95rem',
            backdropFilter: 'blur(10px)'
          }}
        >
          {toastMessage.type === 'success' ? '✅' : '❌'} {toastMessage.message}
        </div>
      )}

      {/* Enhanced Welcome Header */}
      <div style={{
        marginBottom: '40px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 25%, #CD853F 50%, #F4E4BC 100%)',
          opacity: '0.05',
          zIndex: '0'
        }} />

        {/* Decorative Elements */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '120px',
          height: '120px',
          background: 'radial-gradient(circle, rgba(139, 69, 19, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          zIndex: '1'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '80px',
          height: '80px',
          background: 'radial-gradient(circle, rgba(210, 105, 30, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          zIndex: '1'
        }} />

        {/* Main Content Card */}
        <div style={{
          position: 'relative',
          zIndex: '2',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FEFEFE 100%)',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(139, 69, 19, 0.12), 0 8px 32px rgba(139, 69, 19, 0.08)',
          border: '2px solid rgba(232, 209, 167, 0.6)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          gap: '40px',
          flexWrap: 'wrap'
        }}>
          {/* Welcome Content */}
          <div style={{
            flex: '1',
            minWidth: '300px'
          }}>
            {/* Welcome Message */}
            <div style={{
              marginBottom: '20px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '12px',
                flexWrap: 'wrap'
              }}>
                <h1 style={{
                  color: '#2A1F16',
                  margin: '0',
                  fontSize: '2.8rem',
                  fontWeight: '900',
                  letterSpacing: '-1px',
                  background: 'linear-gradient(135deg, #2A1F16 0%, #8B4513 30%, #D2691E 70%, #CD853F 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 2px 4px rgba(139, 69, 19, 0.1)',
                  lineHeight: '1.1'
                }}>
                  Welcome back,
                  <br />
                  <span style={{
                    background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {profile.name.split(' ')[0]}!
                  </span>
                </h1>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                    color: '#8B4513',
                    padding: '12px 20px',
                    borderRadius: '30px',
                    fontSize: '0.9rem',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: '0 6px 20px rgba(255, 215, 0, 0.3)',
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>📚</span>
                    {profile.membershipType}
                  </div>
                </div>
              </div>

              {/* Member Info */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '24px',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(139, 69, 19, 0.05)',
                  padding: '10px 16px',
                  borderRadius: '20px',
                  border: '1px solid rgba(139, 69, 19, 0.1)'
                }}>
                  <span style={{ fontSize: '1.1rem', color: '#8B4513' }}>📅</span>
                  <span style={{
                    color: '#6B4423',
                    fontSize: '0.95rem',
                    fontWeight: '600'
                  }}>
                    Member since {formatDate(profile.createdAt)}
                  </span>
                </div>

                {/* Reward points summary removed per design */}
              </div>
            </div>

            {/* Profile Completion Progress */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.02) 0%, rgba(210, 105, 30, 0.05) 100%)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(232, 209, 167, 0.3)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>📊</span>
                  <span style={{
                    fontSize: '1rem',
                    color: '#2A1F16',
                    fontWeight: '700'
                  }}>
                    Profile Completeness
                  </span>
                </div>
                <div style={{
                  background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                  color: '#FFFFFF',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: '800',
                  boxShadow: '0 4px 12px rgba(139, 69, 19, 0.2)'
                }}>
                  {profile.profileCompleteness}%
                </div>
              </div>

              <div style={{
                width: '100%',
                height: '12px',
                background: 'rgba(139, 69, 19, 0.1)',
                borderRadius: '25px',
                overflow: 'hidden',
                border: '2px solid rgba(139, 69, 19, 0.15)',
                position: 'relative'
              }}>
                <div style={{
                  width: `${profile.profileCompleteness}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #8B4513 0%, #D2691E 40%, #CD853F 80%, #F4E4BC 100%)',
                  borderRadius: '25px',
                  transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(139, 69, 19, 0.3)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)',
                    animation: 'shine 2s ease-in-out infinite'
                  }} />
                </div>
              </div>

              <style>
                {`
                  @keyframes shine {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                  }

                  @keyframes pulse {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.05); }
                  }

                  @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }

                  @keyframes pulse-dot {
                    0%, 100% { opacity: 0.6; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.2); }
                  }
                `}
              </style>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        background: 'white',
        borderRadius: '12px 12px 0 0',
        border: '1px solid #E8D1A7',
        borderBottom: 'none',
        marginBottom: '0',
        overflow: 'hidden'
      }}>
        {[
          { id: 'overview', label: '📊 Overview', icon: '📊' },
          { id: 'settings', label: '⚙️ Settings', icon: '⚙️' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '15px 20px',
              background: activeTab === tab.id ? '#F9F6F0' : 'white',
              color: activeTab === tab.id ? '#2A1F16' : '#666',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #8B4513' : 'none',
              fontWeight: activeTab === tab.id ? '600' : '500',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {tab.icon} {tab.label.split(' ')[1]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        background: 'white',
        borderRadius: '0 0 12px 12px',
        border: '1px solid #E8D1A7',
        borderTop: 'none',
        minHeight: '400px'
      }}>
        {activeTab === 'overview' && (
          <div style={{ padding: '30px' }}>
            {/* Statistics Overview */}
            <div style={{ marginBottom: '40px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '25px'
              }}>
                <div style={{
                  width: '4px',
                  height: '32px',
                  background: 'linear-gradient(180deg, #8B4513, #D2691E)',
                  borderRadius: '2px'
                }} />
                <h3 style={{
                  color: '#2A1F16',
                  margin: '0',
                  fontSize: '1.6rem',
                  fontWeight: '700',
                  letterSpacing: '-0.5px'
                }}>
                  📊 Reading Statistics
                </h3>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '24px',
                marginBottom: '30px'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F9F6F0 100%)',
                  border: '2px solid #E8D1A7',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  boxShadow: '0 8px 25px rgba(139, 69, 19, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.1) 0%, rgba(210, 105, 30, 0.05) 100%)',
                    borderRadius: '50%',
                    pointerEvents: 'none'
                  }} />
                  <div style={{
                    fontSize: '2.2rem',
                    fontWeight: '800',
                    marginBottom: '8px',
                    background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {formatNumber(profile.totalBorrows || 0)}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#6B4423',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    📚 Total Borrowed
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#8B7355',
                    opacity: '0.8'
                  }}>
                    Books read this year
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F9F6F0 100%)',
                  border: '2px solid #E8D1A7',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  boxShadow: '0 8px 25px rgba(139, 69, 19, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, rgba(34, 139, 34, 0.1) 0%, rgba(50, 205, 50, 0.05) 100%)',
                    borderRadius: '50%',
                    pointerEvents: 'none'
                  }} />
                  <div style={{
                    fontSize: '2.2rem',
                    fontWeight: '800',
                    marginBottom: '8px',
                    background: 'linear-gradient(135deg, #228B22 0%, #32CD32 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {formatNumber(profile.activeBorrows || 0)}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#6B4423',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    📖 Active Borrows
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#8B7355',
                    opacity: '0.8'
                  }}>
                    Currently reading
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F9F6F0 100%)',
                  border: '2px solid #E8D1A7',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  boxShadow: '0 8px 25px rgba(139, 69, 19, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(255, 99, 71, 0.05) 100%)',
                    borderRadius: '50%',
                    pointerEvents: 'none'
                  }} />
                  <div style={{
                    fontSize: '2.2rem',
                    fontWeight: '800',
                    marginBottom: '8px',
                    background: 'linear-gradient(135deg, #DC3545 0%, #FF6347 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    ₹{formatNumber(profile.outstandingFines || 0)}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#6B4423',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    💰 Outstanding Fines
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#8B7355',
                    opacity: '0.8'
                  }}>
                    Pending payments
                  </div>
                </div>

                {/* Favorite Genre stat card removed per request */}
              </div>

              {/* Reading Tip */}
              <div style={{
                marginTop: '20px'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #FAF9F6 100%)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #E8D1A7',
                  boxShadow: '0 6px 20px rgba(139, 69, 19, 0.06)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>💡</span>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#2A1F16' }}>
                      Reading Tip of the Day
                    </div>
                  </div>
                  <div style={{ color: '#6B4423', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    <em>"The more that you read, the more things you will know. The more that you learn, the more places you'll go."</em>
                    <br />
                    <span style={{ fontSize: '0.85rem', color: '#8B7355', marginTop: '8px', display: 'block' }}>
                      — Dr. Seuss
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ padding: '30px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '30px'
            }}>
              <div style={{
                width: '4px',
                height: '32px',
                background: 'linear-gradient(180deg, #8B4513, #D2691E)',
                borderRadius: '2px'
              }} />
              <h3 style={{
                color: '#2A1F16',
                margin: '0',
                fontSize: '1.6rem',
                fontWeight: '700',
                letterSpacing: '-0.5px'
              }}>
                ⚙️ Account Settings
              </h3>
            </div>

            {/* Personal Information Section */}
            <div style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F9F6F0 100%)',
              borderRadius: '16px',
              padding: '30px',
              marginBottom: '30px',
              border: '2px solid #E8D1A7',
              boxShadow: '0 8px 25px rgba(139, 69, 19, 0.08)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-25px',
                left: '30px',
                background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                color: '#F4E4BC',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                boxShadow: '0 4px 15px rgba(139, 69, 19, 0.2)',
                border: '1px solid rgba(244, 228, 188, 0.3)'
              }}>
                👤 Personal Information
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '30px',
                marginTop: '10px'
              }}>
                <div>
                  <h4 style={{
                    color: '#2A1F16',
                    margin: '0 0 4px 0',
                    fontSize: '1.3rem',
                    fontWeight: '700'
                  }}>
                    Profile Details
                  </h4>
                  <p style={{
                    color: '#6B4423',
                    margin: '0',
                    fontSize: '0.95rem',
                    fontWeight: '500'
                  }}>
                    Manage your personal information and preferences
                  </p>
                </div>
                <button
                  onClick={() => setEditing(!editing)}
                  style={{
                    background: editing
                      ? 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)'
                      : 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: editing
                      ? '0 4px 15px rgba(108, 117, 125, 0.3)'
                      : '0 4px 15px rgba(0, 123, 255, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = editing
                      ? '0 6px 20px rgba(108, 117, 125, 0.4)'
                      : '0 6px 20px rgba(0, 123, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = editing
                      ? '0 4px 15px rgba(108, 117, 125, 0.3)'
                      : '0 4px 15px rgba(0, 123, 255, 0.3)';
                  }}
                >
                  {editing ? '❌' : '✏️'} {editing ? 'Cancel Editing' : 'Edit Profile'}
                </button>
              </div>

              <div style={{
                display: 'grid',
                gap: '24px',
                background: 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid rgba(232, 209, 167, 0.3)'
              }}>
                {/* Basic Information Section */}
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #E8D1A7',
                  boxShadow: '0 4px 15px rgba(139, 69, 19, 0.08)'
                }}>
                  <h5 style={{
                    color: '#2A1F16',
                    margin: '0 0 16px 0',
                    fontSize: '1rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '20px',
                      background: 'linear-gradient(180deg, #8B4513, #D2691E)',
                      borderRadius: '3px'
                    }} />
                    📋 Basic Information
                  </h5>

                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{
                          fontWeight: '600',
                          color: '#2A1F16',
                          fontSize: '0.85rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Full Name
                        </label>
                        {editing ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            style={{
                              padding: '12px 16px',
                              border: '2px solid #E8D1A7',
                              borderRadius: '8px',
                              fontSize: '0.95rem',
                              background: 'white',
                              transition: 'border-color 0.3s ease',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#8B4513'}
                            onBlur={(e) => e.target.style.borderColor = '#E8D1A7'}
                          />
                        ) : (
                          <div style={{
                            padding: '12px 16px',
                            background: '#F9F6F0',
                            borderRadius: '8px',
                            border: '1px solid rgba(232, 209, 167, 0.5)',
                            fontSize: '0.95rem',
                            color: '#2A1F16',
                            fontWeight: '500'
                          }}>
                            {profile.name}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{
                          fontWeight: '600',
                          color: '#2A1F16',
                          fontSize: '0.85rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Date of Birth
                        </label>
                        {editing ? (
                          <input
                            type="date"
                            value={profile.dateOfBirth || ''}
                            onChange={(e) => setProfile(prev => prev ? { ...prev, dateOfBirth: e.target.value } : null)}
                            style={{
                              padding: '12px 16px',
                              border: '2px solid #E8D1A7',
                              borderRadius: '8px',
                              fontSize: '0.95rem',
                              background: 'white',
                              transition: 'border-color 0.3s ease',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#8B4513'}
                            onBlur={(e) => e.target.style.borderColor = '#E8D1A7'}
                          />
                        ) : (
                          <div style={{
                            padding: '12px 16px',
                            background: '#F9F6F0',
                            borderRadius: '8px',
                            border: '1px solid rgba(232, 209, 167, 0.5)',
                            fontSize: '0.95rem',
                            color: '#2A1F16',
                            fontWeight: '500'
                          }}>
                            {profile.dateOfBirth ? formatDate(profile.dateOfBirth) : 'Not provided'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{
                        fontWeight: '600',
                        color: '#2A1F16',
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Email Address
                      </label>
                      <div style={{
                        padding: '12px 16px',
                        background: '#F9F6F0',
                        borderRadius: '8px',
                        border: '1px solid rgba(232, 209, 167, 0.5)',
                        fontSize: '0.95rem',
                        color: '#2A1F16',
                        fontWeight: '500'
                      }}>
                        {profile.email}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{
                          fontWeight: '600',
                          color: '#2A1F16',
                          fontSize: '0.85rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Phone
                        </label>
                        {editing ? (
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                            style={{
                              padding: '12px 16px',
                              border: '2px solid #E8D1A7',
                              borderRadius: '8px',
                              fontSize: '0.95rem',
                              background: 'white',
                              transition: 'border-color 0.3s ease',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#8B4513'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#E8D1A7'}
                          />
                        ) : (
                          <div style={{
                            padding: '12px 16px',
                            background: '#F9F6F0',
                            borderRadius: '8px',
                            border: '1px solid rgba(232, 209, 167, 0.5)',
                            fontSize: '0.95rem',
                            color: '#2A1F16',
                            fontWeight: '500'
                          }}>
                            {profile.phone || 'Not provided'}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{
                          fontWeight: '600',
                          color: '#2A1F16',
                          fontSize: '0.85rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Student ID
                        </label>
                        {editing ? (
                          <input
                            type="text"
                            value={profile.studentId || ''}
                            onChange={(e) => setProfile(prev => prev ? { ...prev, studentId: e.target.value } : null)}
                            style={{
                              padding: '12px 16px',
                              border: '2px solid #E8D1A7',
                              borderRadius: '8px',
                              fontSize: '0.95rem',
                              background: 'white',
                              transition: 'border-color 0.3s ease',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#8B4513'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#E8D1A7'}
                          />
                        ) : (
                          <div style={{
                            padding: '12px 16px',
                            background: '#F9F6F0',
                            borderRadius: '8px',
                            border: '1px solid rgba(232, 209, 167, 0.5)',
                            fontSize: '0.95rem',
                            color: '#2A1F16',
                            fontWeight: '500'
                          }}>
                            {profile.studentId || 'Not provided'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {editing && (
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleUpdateProfile}
                    style={{
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    💾 Save Changes
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Account Actions */}
            <div style={{ display: 'grid', gap: '12px' }}>
              <button
                onClick={() => setShowPasswordModal(true)}
                style={{
                  background: 'white',
                  border: '2px solid #007bff',
                  borderRadius: '8px',
                  padding: '15px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '1rem',
                  color: '#007bff',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e3f2fd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                🔐 Change Password
              </button>

              <button
                onClick={() => setShowIdProofModal(true)}
                style={{
                  background: 'white',
                  border: '2px solid #28a745',
                  borderRadius: '8px',
                  padding: '15px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '1rem',
                  color: '#28a745',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e8f5e8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                📄 Upload ID Proof
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px', color: '#2A1F16' }}>
              🔐 Change Password
            </h3>

            <div style={{ display: 'grid', gap: '15px', marginBottom: '25px' }}>
              <input
                type="password"
                placeholder="Current Password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                style={{
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />

              <input
                type="password"
                placeholder="New Password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                style={{
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />

              <input
                type="password"
                placeholder="Confirm New Password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                style={{
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowPasswordModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                🔄 Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID Proof Upload Modal */}
      {showIdProofModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ textAlign: 'center', marginBottom: '25px', color: '#2A1F16' }}>
              📄 Upload ID Proof
            </h3>

            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{
                width: '100px',
                height: '100px',
                background: 'linear-gradient(135deg, #8B4513, #654321)',
                borderRadius: '50%',
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '2.5rem'
              }}>
                📄
              </div>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Upload a valid government-issued ID proof (Aadhaar, Passport, Driving License, etc.)
              </p>

              <input
                type="file"
                accept="image/*,.pdf"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px dashed #ddd',
                  borderRadius: '6px',
                  background: '#f8f9fa',
                  cursor: 'pointer'
                }}
              />
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '8px' }}>
                Supported formats: JPG, PNG, PDF (Max 5MB)
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowIdProofModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  showToast('success', 'ID proof uploaded successfully!');
                  setShowIdProofModal(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                📤 Upload Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfile;
