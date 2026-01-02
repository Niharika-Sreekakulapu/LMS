import React, { useState, useEffect } from 'react';
import { getMyWaitlist, leaveWaitlist } from '../../api/libraryApi';
import type { BookWaitlist } from '../../types/dto';

const StudentWaitlist: React.FC = () => {
  const [waitlist, setWaitlist] = useState<BookWaitlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [leavingId, setLeavingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    loadWaitlist();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadWaitlist, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadWaitlist = async () => {
    try {
      setLoading(true);
      const response = await getMyWaitlist();
      setWaitlist(response.data || []);
    } catch (error) {
      console.error('Error loading waitlist:', error);
      showToast('error', 'Failed to load waitlist');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleLeaveWaitlist = async (bookId: number, bookTitle: string) => {
    if (!window.confirm(`Are you sure you want to leave the waitlist for "${bookTitle}"?`)) {
      return;
    }

    setLeavingId(bookId);
    try {
      await leaveWaitlist(bookId);
      // Update local state
      setWaitlist(prev => prev.filter(item => item.bookId !== bookId));
      showToast('success', `Successfully left the waitlist for "${bookTitle}"`);
    } catch (error) {
      console.error('Error leaving waitlist:', error);
      showToast('error', 'Failed to leave waitlist');
    } finally {
      setLeavingId(null);
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 50) return '#4CAF50'; // High priority - green
    if (score >= 25) return '#FF9800'; // Medium priority - orange
    return '#F44336'; // Low priority - red
  };

  const getPriorityBadge = (position: number) => {
    if (position === 1) return { text: '🎯 NEXT UP', color: '#FFD700', textColor: '#000' };
    if (position <= 3) return { text: '⭐ HIGH PRIORITY', color: '#4CAF50', textColor: '#FFF' };
    if (position <= 10) return { text: '📋 IN QUEUE', color: '#FF9800', textColor: '#FFF' };
    return { text: '⏳ WAITING', color: '#9E9E9E', textColor: '#FFF' };
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
          <div style={{ fontSize: '1.2rem', color: '#666' }}>
            Loading your waitlist...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#F9F6F0',
      borderRadius: '12px',
      padding: '20px',
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toastMessage.type === 'success' ? '#d4edda' : '#f8d7da',
          color: toastMessage.type === 'success' ? '#155724' : '#721c24',
          padding: '12px 20px',
          borderRadius: '8px',
          border: `1px solid ${toastMessage.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontWeight: '500'
        }}>
          {toastMessage.message}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{
          color: '#2A1F16',
          margin: '0 0 8px 0',
          fontSize: '2rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          📋 Waitlist
        </h1>
        <p style={{
          color: '#666',
          fontSize: '0.95rem',
          margin: '0',
          lineHeight: '1.5',
        }}>
          Books you're waiting for. Higher priority gets books first when they become available.
        </p>
      </div>

      {/* Waitlist Items */}
      {waitlist.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, #f8f9f8 0%, #ffffff 100%)',
          borderRadius: '16px',
          padding: '80px 40px',
          textAlign: 'center',
          border: '1px solid rgba(76,175,80,0.2)',
        }}>
          <div style={{ fontSize: '6rem', marginBottom: '24px', opacity: '0.7' }}>
            📚
          </div>
          <h3 style={{ color: '#2A1F16', marginBottom: '16px', fontSize: '1.8rem', fontWeight: '600' }}>
            No Books in Waitlist
          </h3>
          <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
            You haven't joined any waitlists yet. When a book you want is unavailable, you'll be added to the waitlist automatically.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {waitlist.map((item) => {
            const priorityBadge = getPriorityBadge(item.queuePosition);
            return (
              <div
                key={item.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #E8D1A7',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  position: 'relative',
                  opacity: leavingId === item.bookId ? 0.7 : 1,
                }}
              >
                {/* Priority Badge */}
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '20px',
                  background: priorityBadge.color,
                  color: priorityBadge.textColor,
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  zIndex: 10,
                }}>
                  {priorityBadge.text}
                </div>

                {/* Main Content */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    {/* Book Info */}
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{
                        color: '#2A1F16',
                        margin: '0 0 4px 0',
                        fontSize: '1.2rem',
                        fontWeight: '600'
                      }}>
                        📖 {item.bookTitle}
                      </h3>
                      <p style={{
                        color: '#666',
                        margin: 0,
                        fontSize: '0.9rem',
                        fontStyle: 'italic'
                      }}>
                        by {item.bookAuthor}
                      </p>
                    </div>

                    {/* Waitlist Details */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '16px',
                      marginBottom: '16px'
                    }}>
                      <div>
                        <div style={{
                          fontWeight: '600',
                          color: '#2A1F16',
                          marginBottom: '4px',
                          fontSize: '0.85rem'
                        }}>
                          Queue Position
                        </div>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          color: getPriorityColor(item.priorityScore)
                        }}>
                          #{item.queuePosition}
                        </div>
                      </div>

                      <div>
                        <div style={{
                          fontWeight: '600',
                          color: '#2A1F16',
                          marginBottom: '4px',
                          fontSize: '0.85rem'
                        }}>
                          Days Waiting
                        </div>
                        <div style={{
                          fontSize: '1.2rem',
                          fontWeight: '600',
                          color: '#495057'
                        }}>
                          {item.waitingDays} days
                        </div>
                      </div>

                      <div>
                        <div style={{
                          fontWeight: '600',
                          color: '#2A1F16',
                          marginBottom: '4px',
                          fontSize: '0.85rem'
                        }}>
                          Estimated Wait
                        </div>
                        <div style={{
                          fontSize: '1.2rem',
                          fontWeight: '600',
                          color: '#495057'
                        }}>
                          {item.estimatedWaitDays} days
                        </div>
                      </div>

                      <div>
                        <div style={{
                          fontWeight: '600',
                          color: '#2A1F16',
                          marginBottom: '4px',
                          fontSize: '0.85rem'
                        }}>
                          Priority Score
                        </div>
                        <div style={{
                          fontSize: '1.2rem',
                          fontWeight: '700',
                          color: getPriorityColor(item.priorityScore)
                        }}>
                          {item.priorityScore.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    {/* Priority Breakdown */}
                    {item.priorityReason && (
                      <div style={{
                        background: '#f8f9fa',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '16px'
                      }}>
                        <div style={{
                          fontWeight: '600',
                          color: '#2A1F16',
                          marginBottom: '4px',
                          fontSize: '0.85rem'
                        }}>
                          Priority Factors
                        </div>
                        <div style={{
                          color: '#495057',
                          fontSize: '0.85rem',
                          lineHeight: '1.4'
                        }}>
                          {item.priorityReason}
                        </div>
                      </div>
                    )}

                    {/* Join Date & Estimated Date */}
                    <div style={{
                      display: 'flex',
                      gap: '20px',
                      fontSize: '0.85rem',
                      color: '#666'
                    }}>
                      <div>
                        <strong>Joined:</strong> {new Date(item.joinedAt).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      {item.estimatedAvailableDate && (
                        <div>
                          <strong>Estimated:</strong> {item.estimatedAvailableDate}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      onClick={() => handleLeaveWaitlist(item.bookId, item.bookTitle)}
                      disabled={leavingId === item.bookId}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '12px 20px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        cursor: leavingId === item.bookId ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(220,53,69,0.3)',
                        transition: 'all 0.3s ease',
                        minWidth: '120px',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        if (leavingId !== item.bookId) {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(220,53,69,0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(220,53,69,0.3)';
                      }}
                    >
                      {leavingId === item.bookId ? (
                        <>
                          <div style={{ animation: 'spin 1s linear infinite' }}>⏳</div>
                          Leaving...
                        </>
                      ) : (
                        <>
                          🚪 Leave Waitlist
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default StudentWaitlist;
