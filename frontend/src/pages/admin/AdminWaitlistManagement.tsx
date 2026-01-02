import React, { useState, useEffect } from 'react';
import { getAllWaitlists } from '../../api/libraryApi';
import type { BookWaitlist } from '../../types/dto';

const AdminWaitlistManagement: React.FC = () => {
  const [waitlists, setWaitlists] = useState<{[bookId: number]: BookWaitlist[]}>({});
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    loadAllWaitlists();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAllWaitlists, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllWaitlists = async () => {
    try {
      setLoading(true);
      const response = await getAllWaitlists();
      setWaitlists(response.data || {});
    } catch (error) {
      console.error('Error loading waitlists:', error);
      showToast('error', 'Failed to load waitlists');
      // Show empty state on error
      setWaitlists({});
    } finally {
      setLoading(false);
    }
  };



  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const getPriorityColor = (score: number) => {
    if (score >= 50) return '#4CAF50'; // High priority - green
    if (score >= 25) return '#FF9800'; // Medium priority - orange
    return '#F44336'; // Low priority - red
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
            Loading waitlist data...
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
          📋 Waitlist Management
        </h1>
        <p style={{
          color: '#666',
          fontSize: '0.95rem',
          margin: '0',
          lineHeight: '1.5',
        }}>
          Manage student waitlists for unavailable books and monitor priority queues.
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #8B4513, #654321)',
          color: '#F4E4BC',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(139,69,19,0.3)',
          border: '2px solid rgba(244,228,188,0.3)'
        }}>
          <div style={{
            fontSize: '2.2rem',
            fontWeight: '800',
            marginBottom: '4px'
          }}>
            {Object.keys(waitlists).length}
          </div>
          <div style={{
            fontSize: '0.9rem',
            opacity: '0.9',
            fontWeight: '600'
          }}>
            Books with Waitlists
          </div>
          <div style={{
            fontSize: '0.75rem',
            marginTop: '6px',
            opacity: '0.8'
          }}>
            📚 Active queues
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #4CAF50, #388E3C)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(76,175,80,0.3)',
          border: '2px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{
            fontSize: '2.2rem',
            fontWeight: '800',
            marginBottom: '4px'
          }}>
            {Object.values(waitlists).reduce((sum, list) => sum + list.length, 0)}
          </div>
          <div style={{
            fontSize: '0.9rem',
            opacity: '0.9',
            fontWeight: '600'
          }}>
            Total Waitlist Entries
          </div>
          <div style={{
            fontSize: '0.75rem',
            marginTop: '6px',
            opacity: '0.8'
          }}>
            👥 Students waiting
          </div>
        </div>
      </div>

      {/* Main Content */}
      {Object.keys(waitlists).length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, #f8f9f8 0%, #ffffff 100%)',
          borderRadius: '16px',
          padding: '80px 40px',
          textAlign: 'center',
          border: '1px solid rgba(76,175,80,0.2)',
        }}>
          <div style={{ fontSize: '6rem', marginBottom: '24px', opacity: '0.7' }}>
            📋
          </div>
          <h3 style={{ color: '#2A1F16', marginBottom: '16px', fontSize: '1.8rem', fontWeight: '600' }}>
            No Active Waitlists
          </h3>
          <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
            All books are currently available or there are no students in waitlists.
            Waitlists are automatically managed when books become unavailable.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {Object.entries(waitlists).map(([bookId, bookWaitlist]) => (
            <div
              key={bookId}
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #E8D1A7',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              {/* Book Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e9ecef'
              }}>
                <div>
                  <h3 style={{
                    color: '#2A1F16',
                    margin: '0 0 4px 0',
                    fontSize: '1.3rem',
                    fontWeight: '600'
                  }}>
                    📖 {bookWaitlist[0]?.bookTitle || 'Unknown Book'}
                  </h3>
                  <p style={{
                    color: '#666',
                    margin: 0,
                    fontSize: '0.9rem'
                  }}>
                    by {bookWaitlist[0]?.bookAuthor || 'Unknown Author'} • {bookWaitlist.length} student{bookWaitlist.length !== 1 ? 's' : ''} waiting
                  </p>
                </div>
              </div>

              {/* Waitlist Table */}
              <div style={{
                overflowX: 'auto',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem'
                }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2A1F16' }}>Position</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2A1F16' }}>Student</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2A1F16' }}>Priority Score</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2A1F16' }}>Waiting Days</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#2A1F16' }}>Joined Date</th>
                      <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#2A1F16' }}>Priority Factors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookWaitlist
                      .sort((a, b) => b.priorityScore - a.priorityScore) // Sort by priority score descending (highest first)
                      .map((entry, index) => (
                      <tr key={entry.id} style={{
                        borderTop: '1px solid #e9ecef',
                        background: index === 0 ? '#f0f9f0' : 'transparent'
                      }}>
                        <td style={{
                          padding: '12px',
                          textAlign: 'center',
                          fontWeight: '700',
                          color: getPriorityColor(entry.priorityScore)
                        }}>
                          {index === 0 && '🎯'} #{entry.queuePosition}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '600', color: '#2A1F16' }}>
                            {entry.studentName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>
                            {entry.studentEmail}
                          </div>
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'center',
                          fontWeight: '700',
                          color: getPriorityColor(entry.priorityScore)
                        }}>
                          {entry.priorityScore.toFixed(1)}
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'center',
                          color: '#495057'
                        }}>
                          {entry.waitingDays}
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'center',
                          color: '#495057',
                          fontSize: '0.8rem'
                        }}>
                          {new Date(entry.joinedAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td style={{
                          padding: '12px',
                          maxWidth: '200px',
                          fontSize: '0.8rem',
                          color: '#666'
                        }}>
                          {entry.priorityReason || 'Standard priority'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
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

export default AdminWaitlistManagement;
