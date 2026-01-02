// Page removed as per user request - membership functionality reverted
import { useState, useEffect } from 'react';
import type { MembershipRequestResponseDto } from '../../types/dto';
import { getAllMembershipRequests, approveMembershipRequest, rejectMembershipRequest } from '../../api/adminApi';
import BackButton from '../../components/BackButton';

const LibrarianMembershipRequests = () => {
  const [requests, setRequests] = useState<MembershipRequestResponseDto[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<MembershipRequestResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [showRejectModal, setShowRejectModal] = useState<{show: boolean, requestId?: number, reason?: string}>({
    show: false,
    reason: ''
  });

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await getAllMembershipRequests(undefined);  // Always fetch all requests for stats
      const reqs = response.data;
      setRequests(reqs);
    } catch (error: any) {
      console.error('Error loading membership requests:', error);
      showToast('error', 'Failed to load membership requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filter]);

  useEffect(() => {
    if (filter === 'ALL') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(req => req.status === filter));
    }
  }, [requests, filter]);

  const handleApprove = async (requestId: number) => {
    try {
      setProcessing(requestId);
      await approveMembershipRequest(requestId);
      showToast('success', 'Membership request approved successfully!');
      loadRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error approving membership request:', error);
      showToast('error', 'Failed to approve membership request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal.requestId || !showRejectModal.reason?.trim()) return;

    try {
      setProcessing(showRejectModal.requestId);
      await rejectMembershipRequest(showRejectModal.requestId, showRejectModal.reason);
      showToast('success', 'Membership request rejected');
      setShowRejectModal({ show: false });
      loadRequests(); // Refresh the list
    } catch (error: any) {
      console.error('Error rejecting membership request:', error);
      showToast('error', 'Failed to reject membership request');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: { bg: '#fff3cd', color: '#856404', text: '⏳ Pending' },
      APPROVED: { bg: '#d4edda', color: '#155724', text: '✅ Approved' },
      REJECTED: { bg: '#f8d7da', color: '#721c24', text: '❌ Rejected' }
    };

    const style = styles[status as keyof typeof styles] || { bg: '#e9ecef', color: '#6c757d', text: status };

    return {
      background: style.bg,
      color: style.color,
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '0.8rem',
      fontWeight: '600',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      text: style.text
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMembershipTypeIcon = (type: string) => {
    return type === 'PREMIUM' ? '👑' : '📖';
  };

  const getStats = () => {
    const stats = {
      pending: requests.filter(r => r.status === 'PENDING').length,
      approved: requests.filter(r => r.status === 'APPROVED').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length,
      total: requests.length
    };
    return stats;
  };

  const stats = getStats();

  if (loading) {
    return (
      <div style={{
        background: '#F9F6F0',
        minHeight: '100vh',
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
          <div style={{ fontSize: '1.2rem', color: '#666' }}>
            Loading membership requests...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#F9F6F0',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <BackButton />

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
      <div style={{
        background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
        borderRadius: '12px',
        padding: '30px',
        marginBottom: '30px',
        border: '1px solid #e9ecef',
        boxShadow: '0 4px 15px rgba(139,69,19,0.1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>👑</div>
          <h1 style={{
            color: '#2A1F16',
            fontSize: '2.2rem',
            fontWeight: '700',
            margin: '0 0 10px 0'
          }}>
            Membership Requests
          </h1>
          <p style={{
            color: '#666',
            fontSize: '1.1rem',
            margin: '0'
          }}>
            Review and manage student membership upgrade requests
          </p>
        </div>

        {/* Statistics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '20px',
          marginTop: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #fff 0%, #f8f9fa 100%)',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '2px solid #856404'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#856404', marginBottom: '8px' }}>
              {stats.pending}
            </div>
            <div style={{ color: '#856404', fontSize: '0.9rem' }}>⏳ Pending</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '2px solid #155724'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#155724', marginBottom: '8px' }}>
              {stats.approved}
            </div>
            <div style={{ color: '#155724', fontSize: '0.9rem' }}>✅ Approved</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '2px solid #721c24'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#721c24', marginBottom: '8px' }}>
              {stats.rejected}
            </div>
            <div style={{ color: '#721c24', fontSize: '0.9rem' }}>❌ Rejected</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '2px solid #6c757d'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#2A1F16', marginBottom: '8px' }}>
              {stats.total}
            </div>
            <div style={{ color: '#2A1F16', fontSize: '0.9rem' }}>📊 Total</div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '30px',
        border: '1px solid #e9ecef',
        boxShadow: '0 4px 15px rgba(139,69,19,0.08)',
      }}>
        <h3 style={{
          color: '#2A1F16',
          fontSize: '1.2rem',
          fontWeight: '600',
          margin: '0 0 15px 0'
        }}>
          📋 Filter Requests
        </h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          {[
            { value: 'ALL', label: 'All Requests', count: stats.total },
            { value: 'PENDING', label: 'Pending', count: stats.pending },
            { value: 'APPROVED', label: 'Approved', count: stats.approved },
            { value: 'REJECTED', label: 'Rejected', count: stats.rejected }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              style={{
                padding: '10px 20px',
                border: '2px solid',
                borderColor: filter === option.value ? '#8B4513' : '#dee2e6',
                background: filter === option.value ? '#8B4513' : 'white',
                color: filter === option.value ? 'white' : '#2A1F16',
                borderRadius: '25px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {option.label}
              <span style={{
                background: filter === option.value ? 'rgba(255,255,255,0.2)' : '#f8f9fa',
                color: filter === option.value ? 'white' : '#6c757d',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.8rem'
              }}>
                {option.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e9ecef',
        boxShadow: '0 4px 15px rgba(139,69,19,0.08)',
      }}>
        <h3 style={{
          color: '#2A1F16',
          fontSize: '1.4rem',
          fontWeight: '600',
          margin: '0 0 20px 0'
        }}>
          📋 Requests ({filteredRequests.length})
        </h3>

        {filteredRequests.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6c757d'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📝</div>
            <h3 style={{
              color: '#2A1F16',
              fontSize: '1.3rem',
              marginBottom: '10px'
            }}>
              No {filter === 'ALL' ? '' : filter.toLowerCase() + ' '}requests found
            </h3>
            <p style={{ fontSize: '1rem' }}>
              {filter === 'ALL'
                ? 'No membership requests have been submitted yet.'
                : `No ${filter.toLowerCase()} requests found.`
              }
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {filteredRequests.map((request) => (
              <div key={request.id} style={{
                background: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '15px',
                transition: 'all 0.3s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                  <div style={{ fontSize: '2rem' }}>
                    {getMembershipTypeIcon(request.requestedPackage)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: '#2A1F16',
                      fontWeight: '600',
                      fontSize: '1.1rem',
                      marginBottom: '4px'
                    }}>
                      Student ID: {request.studentId}
                    </div>
                    <div style={{
                      color: '#666',
                      fontSize: '0.9rem',
                      marginBottom: '4px'
                    }}>
                      Requested: {request.requestedPackage} Membership
                    </div>
                    <div style={{
                      color: '#666',
                      fontSize: '0.8rem'
                    }}>
                      Submitted: {formatDate(request.createdAt)}
                    </div>
                    {request.rejectionReason && (
                      <div style={{
                        color: '#721c24',
                        fontSize: '0.9rem',
                        marginTop: '8px',
                        padding: '8px',
                        background: '#f8d7da',
                        borderRadius: '6px'
                      }}>
                        <strong>Rejection Reason:</strong> {request.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={getStatusBadge(request.status)}>
                    {getStatusBadge(request.status).text}
                  </div>

                  {request.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={processing === request.id}
                        style={{
                          padding: '8px 16px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: processing === request.id ? 'not-allowed' : 'pointer',
                          opacity: processing === request.id ? '0.7' : '1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {processing === request.id ? '⏳' : '✅'} Approve
                      </button>
                      <button
                        onClick={() => setShowRejectModal({
                          show: true,
                          requestId: request.id,
                          reason: ''
                        })}
                        disabled={processing === request.id}
                        style={{
                          padding: '8px 16px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: processing === request.id ? 'not-allowed' : 'pointer',
                          opacity: processing === request.id ? '0.7' : '1',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {processing === request.id ? '⏳' : '❌'} Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal.show && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1001,
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
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>❌</div>
              <h2 style={{
                color: '#2A1F16',
                fontSize: '1.8rem',
                fontWeight: '700',
                margin: '0 0 15px 0'
              }}>
                Reject Membership Request
              </h2>
              <p style={{
                color: '#666',
                fontSize: '1rem',
                lineHeight: '1.6',
                margin: '0'
              }}>
                Please provide a reason for rejecting this membership upgrade request.
              </p>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <textarea
                value={showRejectModal.reason || ''}
                onChange={(e) => setShowRejectModal(prev => ({
                  ...prev,
                  reason: e.target.value
                }))}
                placeholder="Enter rejection reason..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={() => setShowRejectModal({ show: false })}
                disabled={processing === showRejectModal.requestId}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: processing === showRejectModal.requestId ? 'not-allowed' : 'pointer',
                  opacity: processing === showRejectModal.requestId ? '0.7' : '1'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing === showRejectModal.requestId || !showRejectModal.reason?.trim()}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: (!showRejectModal.reason?.trim() || processing === showRejectModal.requestId) ? 'not-allowed' : 'pointer',
                  opacity: (!showRejectModal.reason?.trim() || processing === showRejectModal.requestId) ? '0.7' : '1'
                }}
              >
                {processing === showRejectModal.requestId ? '⏳ Rejecting...' : '❌ Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibrarianMembershipRequests;
