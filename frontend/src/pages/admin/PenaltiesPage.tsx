import React, { useState, useEffect } from 'react';
import { getAllPendingPenalties, payPenalty, computePenalty, reconcilePenalties } from '../../api/libraryApi';
import type { PenaltyDTO } from '../../types/dto';

function PenaltiesPage() {
  const [penalties, setPenalties] = useState<PenaltyDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({});

  // Reconcile modal state
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [reconcileLoading, setReconcileLoading] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState<PenaltyDTO | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    loadPenalties();
  }, []);

  const loadPenalties = async () => {
    try {
      setLoading(true);
      const response = await getAllPendingPenalties();
      setPenalties(response.data);
    } catch (error) {
      console.error('Error loading penalties:', error);
      showToast('error', 'Failed to load penalties');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleManualCompute = async (borrowRecordId: number) => {
    try {
      setActionLoading(prev => ({ ...prev, [borrowRecordId]: true }));
      await computePenalty(borrowRecordId);
      showToast('success', 'Penalty computed successfully');
      loadPenalties(); // Refresh data
    } catch (error) {
      console.error('Error computing penalty:', error);
      showToast('error', 'Failed to compute penalty');
    } finally {
      setActionLoading(prev => ({ ...prev, [borrowRecordId]: false }));
    }
  };

  const handlePayment = async () => {
    if (!selectedPenalty || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedPenalty.penaltyAmount) {
      showToast('error', 'Invalid payment amount');
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [selectedPenalty.borrowRecordId]: true }));
      await payPenalty(selectedPenalty.borrowRecordId, amount);
      showToast('success', `Payment of ₹${amount} processed successfully`);
      setShowPaymentModal(false);
      setSelectedPenalty(null);
      setPaymentAmount('');
      loadPenalties(); // Refresh data
    } catch (error) {
      console.error('Error processing payment:', error);
      showToast('error', 'Failed to process payment');
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedPenalty.borrowRecordId]: false }));
    }
  };

  const handleReconcile = async () => {
    try {
      setReconcileLoading(true);
      await reconcilePenalties();
      showToast('success', 'Penalty reconciliation completed');
      setShowReconcileModal(false);
      loadPenalties(); // Refresh data
    } catch (error) {
      console.error('Error reconciling penalties:', error);
      showToast('error', 'Failed to reconcile penalties');
    } finally {
      setReconcileLoading(false);
    }
  };

  const openPaymentModal = (penalty: PenaltyDTO) => {
    setSelectedPenalty(penalty);
    setPaymentAmount(penalty.penaltyAmount.toString());
    setShowPaymentModal(true);
  };

  // Calculate statistics
  const totalPendingPenalties = penalties.filter(p => p.penaltyStatus === 'PENDING').length;
  const totalPaidPenalties = penalties.filter(p => p.penaltyStatus === 'PAID').length;
  const totalPenalties = penalties.length;
  const pendingAmount = penalties.filter(p => p.penaltyStatus === 'PENDING').reduce((sum, p) => sum + p.penaltyAmount, 0);

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
            Loading penalties data...
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
          💰 Penalty Management
        </h1>
        <p
          style={{
            color: '#666',
            fontSize: '0.95rem',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          Comprehensive penalty tracking, payment processing, and reconciliation for the entire library system
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={loadPenalties}
          disabled={loading}
          style={{
            background: '#9A5B34',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.9rem',
            fontWeight: '600',
          }}
        >
          🔄 Refresh Data
        </button>
        <button
          onClick={() => setShowReconcileModal(true)}
          disabled={reconcileLoading}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.9rem',
            fontWeight: '600',
          }}
        >
          🔧 Reconcile Penalties
        </button>
      </div>

      {/* Statistics Dashboard */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #8B4513 0%, #654321 100%)',
            color: '#F4E4BC',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(139, 69, 19, 0.3)',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: '900',
              marginBottom: '8px',
            }}
          >
            {totalPenalties}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            📊 Total Penalties
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #E8D1A7 0%, #CDA776 100%)',
            color: '#2A1F16',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(232, 209, 167, 0.3)',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: '900',
              marginBottom: '8px',
            }}
          >
            {totalPendingPenalties}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>⏳ Pending</div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #D2691E 0%, #A0522D 100%)',
            color: '#F4E4BC',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(210, 105, 30, 0.3)',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: '900',
              marginBottom: '8px',
            }}
          >
            {totalPaidPenalties}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>✅ Paid</div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #9A5B34 0%, #6B4423 100%)',
            color: '#F4E4BC',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(154, 91, 52, 0.3)',
          }}
        >
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: '900',
              marginBottom: '8px',
            }}
          >
            ₹{pendingAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>💰 Pending Amount</div>
        </div>
      </div>

      {/* Penalties Table */}
      {penalties.length === 0 ? (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '60px 40px',
            textAlign: 'center',
            border: '1px solid #E8D1A7',
            boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: '0.6' }}>
            💰
          </div>
          <h3 style={{ color: '#2A1F16', marginBottom: '15px', fontSize: '1.5rem', fontWeight: '600' }}>
            No Penalties Found
          </h3>
          <p style={{ color: '#666', fontSize: '1rem', maxWidth: '400px', margin: '0 auto' }}>
            All student penalties have been resolved. Great job!
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #E8D1A7',
            overflow: 'hidden',
            boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
          }}
        >
          <div style={{ padding: '20px', background: '#f8f9fa', borderBottom: '1px solid #E8D1A7' }}>
            <h3 style={{ margin: 0, color: '#2A1F16', fontSize: '1.3rem', fontWeight: '700' }}>
              ⚖️ All Penalties ({penalties.length})
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    📚 Penalty Details
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    👤 Student
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    📅 Dates
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    ❌ Amount
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    📊 Status
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    ⚙️ Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {penalties.map((penalty) => (
                  <tr
                    key={penalty.borrowRecordId}
                    style={{
                      borderBottom: '1px solid #E8D1A7',
                      backgroundColor: penalty.penaltyStatus === 'PENDING'
                        ? (Math.floor(penalty.borrowRecordId % 2) === 0 ? '#fff9f9' : '#fefafa')
                        : '#f8fffa' // Light green for paid
                    }}
                  >
                    <td style={{ padding: '16px 12px', fontSize: '0.95rem' }}>
                      <div style={{ fontWeight: '600', color: '#2A1F16', marginBottom: '4px' }}>
                        #{penalty.borrowRecordId}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        {penalty.bookTitle.length > 40 ? penalty.bookTitle.substring(0, 40) + '...' : penalty.bookTitle}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '2px' }}>
                        {getPenaltyReason(penalty.penaltyType)}
                      </div>
                    </td>
                    <td style={{ padding: '16px 12px', fontSize: '0.95rem' }}>
                      <div style={{ fontWeight: '600', color: '#2A1F16' }}>
                        {penalty.studentName}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                        ID: {penalty.studentId}
                      </div>
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '0.95rem' }}>
                      <div style={{ color: '#2A1F16' }}>
                        <div>Issued: {formatDate(penalty.borrowedAt)}</div>
                        <div style={{ color: '#dc3545', marginTop: '2px' }}>
                          Due: {formatDate(penalty.dueDate)}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '0.95rem' }}>
                      <span style={{ fontWeight: '700', color: '#dc3545' }}>
                        ₹{penalty.penaltyAmount.toFixed(2)}
                      </span>
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      {getStatusBadge(penalty.penaltyStatus)}
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {penalty.penaltyStatus === 'PENDING' && (
                          <button
                            onClick={() => openPaymentModal(penalty)}
                            style={{
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              fontWeight: '600',
                            }}
                            disabled={actionLoading[penalty.borrowRecordId]}
                          >
                            💳 Pay
                          </button>
                        )}
                        <button
                          onClick={() => handleManualCompute(penalty.borrowRecordId)}
                          style={{
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            fontWeight: '600',
                          }}
                          disabled={actionLoading[penalty.borrowRecordId]}
                        >
                          {actionLoading[penalty.borrowRecordId] ? '⏳' : '🔄'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ padding: '30px' }}>
              <h2 style={{ color: '#2A1F16', marginBottom: '20px', textAlign: 'center' }}>
                💳 Accept Penalty Payment
              </h2>

              <div style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
                marginBottom: '20px',
                border: '1px solid #E8D1A7'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>
                  Outstanding Fine
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#dc3545' }}>
                  ₹{selectedPenalty.penaltyAmount.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '8px' }}>
                  Student: {selectedPenalty.studentName}
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
                  placeholder="Enter payment amount"
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
                  Maximum: ₹{selectedPenalty.penaltyAmount.toFixed(2)}
                </div>
              </div>

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
                    fontSize: '1rem',
                    fontWeight: '600',
                  }}
                  disabled={actionLoading[selectedPenalty.borrowRecordId]}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={actionLoading[selectedPenalty.borrowRecordId] || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: parseFloat(paymentAmount || '0') > 0 ? '#28a745' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: parseFloat(paymentAmount || '0') > 0 && !actionLoading[selectedPenalty.borrowRecordId] ? 'pointer' : 'not-allowed',
                    fontSize: '1rem',
                    fontWeight: '600',
                  }}
                >
                  {actionLoading[selectedPenalty.borrowRecordId] ? '⏳ Processing...' : `💳 Accept ₹${parseFloat(paymentAmount || '0').toFixed(2)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Modal */}
      {showReconcileModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
          }}>
            <div style={{ padding: '30px' }}>
              <h2 style={{ color: '#2A1F16', marginBottom: '20px', textAlign: 'center' }}>
                🔧 Reconcile Penalties
              </h2>

              <div style={{
                background: '#fff3cd',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
                marginBottom: '20px',
                border: '1px solid #ffeaa7'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#856404', marginBottom: '8px' }}>
                  This action will:
                </div>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#856404' }}>
                  • Calculate penalties for all overdue books
                  • Update penalty amounts based on days overdue
                  • Refresh the penalties system
                </div>
                <div style={{ fontSize: '0.9rem', color: '#856404', marginTop: '8px' }}>
                  This runs automatically every day at 2 AM, but you can trigger it manually now.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowReconcileModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                  }}
                  disabled={reconcileLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReconcile}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: reconcileLoading ? '#ccc' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: reconcileLoading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600',
                  }}
                >
                  {reconcileLoading ? '🔄 Reconciling...' : '🔧 Reconcile Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PenaltiesPage;
