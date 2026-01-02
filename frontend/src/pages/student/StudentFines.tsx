import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import client from '../../api/axiosClient';

// Match the backend PenaltyDTO structure
interface Penalty {
  borrowRecordId: number;
  studentId: number;
  studentName: string;
  bookId: number;
  bookTitle: string;
  borrowedAt: string; // Instant from backend (will be converted)
  dueDate: string; // Instant from backend (will be converted)
  penaltyAmount: number;
  penaltyType: string; // PenaltyType enum (LATE, DAMAGE, LOST)
  penaltyStatus: string; // PenaltyStatus enum (NONE, PENDING, PAID, WAIVED)
  paidAt?: string; // Optional payment date
}

const StudentFines: React.FC = () => {
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState<Penalty | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const { auth } = useAuth();
  const studentId = auth.user?.id;

  useEffect(() => {
    if (studentId) {
      loadPenalties();
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadPenalties, 30000);
      return () => clearInterval(interval);
    }
  }, [studentId]);

  const loadPenalties = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const response = await client.get(`/api/members/${studentId}/penalties`);
      setPenalties(response.data);
    } catch (error) {
      console.error('Error loading penalties:', error);
      showToast('error', 'Failed to load fines');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };





  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span
            style={{
              color: '#c62828',
              fontWeight: '600',
              backgroundColor: '#ffebee',
              border: '1px solid #f44336',
              padding: '6px 14px',
              borderRadius: '25px',
              fontSize: '0.8em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            💰 UNPAID
          </span>
        );
      case 'PAID':
        return (
          <span
            style={{
              color: '#2e7d32',
              fontWeight: '600',
              backgroundColor: '#e8f5e8',
              border: '1px solid #4caf50',
              padding: '6px 14px',
              borderRadius: '25px',
              fontSize: '0.8em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            ✅ PAID
          </span>
        );
      case 'WAIVED':
        return (
          <span
            style={{
              color: '#ff9800',
              fontWeight: '600',
              backgroundColor: '#fff3e0',
              border: '1px solid #ff5722',
              padding: '6px 14px',
              borderRadius: '25px',
              fontSize: '0.8em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            🆓 WAIVED
          </span>
        );
      default:
        return (
          <span
            style={{
              color: '#5d6d7e',
              fontWeight: '600',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              padding: '6px 14px',
              borderRadius: '25px',
              fontSize: '0.8em',
            }}
          >
            {status}
          </span>
        );
    }
  };

  const handlePayPenalty = async () => {
    if (!selectedPenalty || !paymentAmount || !studentId) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedPenalty.penaltyAmount) {
      showToast('error', 'Invalid payment amount');
      return;
    }

    setPayingId(selectedPenalty.borrowRecordId);
    try {
      await client.post(`/api/borrow/${selectedPenalty.borrowRecordId}/pay`, {
        amount: amount
      });

      // Update the penalty locally before loading fresh data
      setPenalties(prevPenalties =>
        prevPenalties.map(p =>
          p.borrowRecordId === selectedPenalty.borrowRecordId
            ? { ...p, penaltyStatus: 'PAID' } // Keep original amount
            : p
        )
      );

      showToast('success', `Payment of ₹${amount} processed successfully!`);
      setShowPaymentModal(false);
      setSelectedPenalty(null);
      setPaymentAmount('');

      // Reload to get updated status from server
      await loadPenalties(); // Wait for fresh data
    } catch (error: unknown) {
      console.error('Error paying penalty:', error);
      showToast('error', 'Failed to process payment');

      // If payment failed, reload data to revert local changes
      await loadPenalties();
    } finally {
      setPayingId(null);
    }
  };

  const openPaymentModal = (penalty: Penalty) => {
    setSelectedPenalty(penalty);
    setPaymentAmount(penalty.penaltyAmount.toString());
    setShowPaymentModal(true);
  };

  // Helper function to get penalty reason text
  const getPenaltyReason = (type: string): string => {
    switch (type) {
      case 'LATE':
        return 'Late return penalty';
      case 'DAMAGE':
        return 'Book damage penalty';
      case 'LOST':
        return 'Book lost penalty';
      default:
        return 'Library penalty';
    }
  };

  const pendingPenalties = penalties.filter(p => p.penaltyStatus === 'PENDING');
  const paidPenalties = penalties.filter(p => p.penaltyStatus === 'PAID');
  const waivedPenalties = penalties.filter(p => p.penaltyStatus === 'WAIVED');
  const historyPenalties = [...paidPenalties, ...waivedPenalties]; // For payment history tab

  // Stats calculation
  const totalPendingAmount = pendingPenalties.reduce((sum, p) => sum + p.penaltyAmount, 0);
  const totalPaidAmount = paidPenalties.reduce((sum, p) => sum + p.penaltyAmount, 0);

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
            Loading your fines...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#F9F6F0',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
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
          }}
        >
          {toastMessage.message}
        </div>
      )}

      {/* Header Section */}
      <div style={{ marginBottom: '20px' }}>
        <h1
          style={{
            color: '#2A1F16',
            margin: '0 0 8px 0',
            fontSize: '2rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          💰 Fines & Penalties
        </h1>
        <p
          style={{
            color: '#666',
            fontSize: '0.95rem',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          Manage your library fines and make payments
        </p>
      </div>

      {/* Stats Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #D2691E, #A0522D)',
          color: '#F4E4BC',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(210,105,30,0.3)',
          border: '2px solid rgba(244,228,188,0.3)'
        }}>
          <div style={{
            fontSize: '2.2rem',
            fontWeight: '800',
            marginBottom: '4px'
          }}>
            ₹{totalPendingAmount.toLocaleString('en-IN')}
          </div>
          <div style={{
            fontSize: '0.9rem',
            opacity: '0.9',
            fontWeight: '600'
          }}>
            Pending Amount
          </div>
          <div style={{
            fontSize: '0.75rem',
            marginTop: '6px',
            opacity: '0.8'
          }}>
            💰 To be paid
          </div>
        </div>

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
            {pendingPenalties.length}
          </div>
          <div style={{
            fontSize: '0.9rem',
            opacity: '0.9',
            fontWeight: '600'
          }}>
            Pending Fines
          </div>
          <div style={{
            fontSize: '0.75rem',
            marginTop: '6px',
            opacity: '0.8'
          }}>
            🚨 Requires action
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #9A5B34, #6B4423)',
          color: '#F4E4BC',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(154,91,52,0.3)',
          border: '2px solid rgba(244,228,188,0.3)'
        }}>
          <div style={{
            fontSize: '2.2rem',
            fontWeight: '800',
            marginBottom: '4px'
          }}>
            ₹{totalPaidAmount.toLocaleString('en-IN')}
          </div>
          <div style={{
            fontSize: '0.9rem',
            opacity: '0.9',
            fontWeight: '600'
          }}>
            Paid Amount
          </div>
          <div style={{
            fontSize: '0.75rem',
            marginTop: '6px',
            opacity: '0.8'
          }}>
            ✅ Already cleared
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
            {historyPenalties.length}
          </div>
          <div style={{
            fontSize: '0.9rem',
            opacity: '0.9',
            fontWeight: '600'
          }}>
            Total Transactions
          </div>
          <div style={{
            fontSize: '0.75rem',
            marginTop: '6px',
            opacity: '0.8'
          }}>
            📊 Payment history
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '0',
        marginBottom: '20px',
        border: '1px solid #E8D1A7',
        boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e9ecef'
        }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              flex: 1,
              padding: '16px 20px',
              background: activeTab === 'pending' ? 'linear-gradient(135deg, #dc3545, #c82333)' : 'transparent',
              color: activeTab === 'pending' ? 'white' : '#2A1F16',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              borderRadius: activeTab === 'pending' ? '0' : '0'
            }}
          >
            🚨 Pending Fines {pendingPenalties.length > 0 && (
              <span style={{
                background: activeTab === 'pending' ? 'rgba(255,255,255,0.3)' : '#dc3545',
                color: activeTab === 'pending' ? 'white' : 'white',
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: '700'
              }}>
                {pendingPenalties.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '16px 20px',
              background: activeTab === 'history' ? 'linear-gradient(135deg, #28a745, #20c997)' : 'transparent',
              color: activeTab === 'history' ? 'white' : '#2A1F16',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
          >
            📜 Payment History {historyPenalties.length > 0 && (
              <span style={{
                background: activeTab === 'history' ? 'rgba(255,255,255,0.3)' : '#28a745',
                color: 'white',
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '0.75rem',
                fontWeight: '700'
              }}>
                {historyPenalties.length}
              </span>
            )}
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {activeTab === 'pending' ? (
            <>
              {pendingPenalties.length === 0 ? (
                <div style={{
                  background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)',
                  borderRadius: '16px',
                  padding: '80px 40px',
                  textAlign: 'center',
                  border: '1px solid rgba(220,53,69,0.2)',
                }}>
                  <div style={{ fontSize: '6rem', marginBottom: '24px', opacity: '0.7' }}>
                    ✅
                  </div>
                  <h3 style={{ color: '#2A1F16', marginBottom: '16px', fontSize: '1.8rem', fontWeight: '600' }}>
                    No Pending Fines
                  </h3>
                  <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                    Great! You have no outstanding fines. All your library obligations are cleared.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {pendingPenalties.map((penalty) => (
                    <div
                      key={penalty.borrowRecordId}
                      style={{
                        background: '#fff8f8',
                        border: '1px solid #f5c6cb',
                        borderRadius: '12px',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        opacity: payingId === penalty.borrowRecordId ? 0.7 : 1,
                      }}
                    >
                      {/* Header Row */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{
                            fontWeight: '700',
                            color: '#2A1F16',
                            fontSize: '1.1rem'
                          }}>
                            Fine #{penalty.borrowRecordId}
                          </div>
                          <span style={{
                            color: '#c62828',
                            fontWeight: '700',
                            backgroundColor: '#ffebee',
                            border: '1px solid #f44336',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                          }}>
                            💰 UNPAID
                          </span>
                        </div>
                        <div style={{
                          fontSize: '1.4rem',
                          fontWeight: '800',
                          color: '#c62828'
                        }}>
                          ₹{penalty.penaltyAmount.toFixed(2)}
                        </div>
                      </div>

                      {/* Book Details */}
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          color: '#2A1F16',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          📖 {penalty.bookTitle}
                        </div>
                        <div style={{
                          color: '#666',
                          fontStyle: 'italic',
                          fontSize: '0.9rem'
                        }}>
                          {getPenaltyReason(penalty.penaltyType)}
                        </div>
                      </div>

                      {/* Details Row */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: '16px',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{
                            fontWeight: '600',
                            color: '#2A1F16',
                            marginBottom: '4px',
                            fontSize: '0.85rem'
                          }}>
                            Due Date
                          </div>
                          <div style={{
                            color: '#495057',
                            fontSize: '0.9rem',
                            fontWeight: '500'
                          }}>
                            {new Date(penalty.dueDate).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>

                        <div style={{ marginLeft: 'auto' }}>
                          <button
                            onClick={() => openPaymentModal(penalty)}
                            disabled={payingId === penalty.borrowRecordId}
                            style={{
                              background: 'linear-gradient(135deg, #dc3545, #c82333)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '10px 20px',
                              fontSize: '0.95rem',
                              fontWeight: '600',
                              cursor: payingId === penalty.borrowRecordId ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 8px rgba(220,53,69,0.3)',
                              transition: 'all 0.3s ease',
                              minWidth: '110px',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (payingId !== penalty.borrowRecordId) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(220,53,69,0.4)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(220,53,69,0.3)';
                            }}
                          >
                            {payingId === penalty.borrowRecordId ? (
                              <>
                                <div style={{ animation: 'spin 1s linear infinite' }}>⏳</div>
                                Paying...
                              </>
                            ) : (
                              <>
                                💳 Pay Now
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {historyPenalties.length === 0 ? (
                <div style={{
                  background: 'linear-gradient(135deg, #f8fff8 0%, #ffffff 100%)',
                  borderRadius: '16px',
                  padding: '80px 40px',
                  textAlign: 'center',
                  border: '1px solid rgba(40,167,69,0.2)',
                }}>
                  <div style={{ fontSize: '6rem', marginBottom: '24px', opacity: '0.7' }}>
                    📜
                  </div>
                  <h3 style={{ color: '#2A1F16', marginBottom: '16px', fontSize: '1.8rem', fontWeight: '600' }}>
                    No Payment History
                  </h3>
                  <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                    Your payment history will appear here once you make fine payments or when penalties are waived.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {historyPenalties.map((penalty) => (
                    <div
                      key={penalty.borrowRecordId}
                      style={{
                        background: penalty.penaltyStatus === 'PAID'
                          ? 'linear-gradient(135deg, #f0f9f0 0%, #ffffff 100%)'
                          : 'linear-gradient(135deg, #fff8e1 0%, #ffffff 100%)',
                        borderRadius: '12px',
                        padding: '20px',
                        border: penalty.penaltyStatus === 'PAID'
                          ? '1px solid #4caf50'
                          : '1px solid #ff9800',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      }}
                    >
                      {/* Header Row */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{
                            fontSize: '1.2rem',
                            fontWeight: '700',
                            color: '#2A1F16'
                          }}>
                            Fine #{penalty.borrowRecordId}
                          </div>
                          {getStatusBadge(penalty.penaltyStatus)}
                        </div>

                        <div style={{
                          fontSize: '1.3rem',
                          fontWeight: '800',
                          color: penalty.penaltyStatus === 'PAID' ? '#2e7d32' : '#ff9800'
                        }}>
                          ₹{penalty.penaltyAmount.toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Book Details */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          color: '#2A1F16',
                          marginBottom: '4px'
                        }}>
                          📖 {penalty.bookTitle}
                        </div>
                        <div style={{
                          color: '#666',
                          fontStyle: 'italic',
                          fontSize: '0.9rem'
                        }}>
                          {getPenaltyReason(penalty.penaltyType)}
                        </div>
                      </div>

                      {/* Payment Details */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '16px',
                        padding: '16px',
                        background: '#f8f9fa',
                        borderRadius: '8px',
                        fontSize: '0.9rem'
                      }}>
                        <div>
                          <div style={{
                            fontWeight: '600',
                            color: '#2A1F16',
                            marginBottom: '4px'
                          }}>
                            Borrowed Date
                          </div>
                          <div style={{ color: '#495057' }}>
                            {new Date(penalty.borrowedAt).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>

                        <div>
                          <div style={{
                            fontWeight: '600',
                            color: '#2A1F16',
                            marginBottom: '4px'
                          }}>
                            Due Date
                          </div>
                          <div style={{ color: '#495057' }}>
                            {new Date(penalty.dueDate).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>

                        <div>
                          <div style={{
                            fontWeight: '600',
                            color: '#2A1F16',
                            marginBottom: '4px'
                          }}>
                            Payment Status
                          </div>
                          <div style={{
                            color: penalty.penaltyStatus === 'PAID' ? '#2e7d32' : '#ff9800',
                            fontWeight: '600'
                          }}>
                            {penalty.penaltyStatus === 'PAID' && penalty.paidAt
                              ? new Date(penalty.paidAt).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : penalty.penaltyStatus === 'PAID'
                              ? 'Payment recorded'
                              : penalty.penaltyStatus === 'WAIVED'
                              ? 'Waived - No payment required'
                              : 'Processed'
                            }
                          </div>
                        </div>

                        <div>
                          <div style={{
                            fontWeight: '600',
                            color: '#2A1F16',
                            marginBottom: '4px'
                          }}>
                            Transaction Info
                          </div>
                          <div style={{
                            color: '#495057',
                            fontSize: '0.8rem'
                          }}>
                            Ref: #{penalty.borrowRecordId}-{penalty.studentId}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Payment Modal */}
      {showPaymentModal && selectedPenalty && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          overflow: 'auto',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ padding: '30px' }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>💳</div>
                <h2 style={{ color: '#2A1F16', margin: '0 0 10px 0' }}>Pay Fine</h2>
                <h3 style={{ color: '#2A1F16', fontSize: '1.2rem', margin: '0 0 5px 0' }}>
                  #{selectedPenalty.borrowRecordId}
                </h3>
                <p style={{ color: '#6c757d', margin: 0 }}>
                  {selectedPenalty.bookTitle}
                </p>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <div style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  marginBottom: '20px',
                  border: '1px solid #E8D1A7'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
                    Fine Amount
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: '#c62828' }}>
                    ₹{selectedPenalty.penaltyAmount.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '8px' }}>
                    {getPenaltyReason(selectedPenalty.penaltyType)}
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: '#2A1F16'
                  }}>
                    Payment Amount (₹):
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount to pay"
                    min="0.01"
                    max={selectedPenalty.penaltyAmount}
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      background: 'white'
                    }}
                  />
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                    Full payment required for late return penalties.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPenalty(null);
                    setPaymentAmount('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                  disabled={payingId === selectedPenalty.borrowRecordId}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayPenalty}
                  disabled={payingId === selectedPenalty.borrowRecordId || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: parseFloat(paymentAmount || '0') > 0 ? '#28a745' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: parseFloat(paymentAmount || '0') > 0 && payingId !== selectedPenalty.borrowRecordId ? 'pointer' : 'not-allowed',
                    opacity: payingId === selectedPenalty.borrowRecordId ? 0.6 : 1,
                  }}
                >
                  {payingId === selectedPenalty.borrowRecordId ? '⏳ Processing...' : `💳 Pay ₹${parseFloat(paymentAmount || '0').toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFines;
