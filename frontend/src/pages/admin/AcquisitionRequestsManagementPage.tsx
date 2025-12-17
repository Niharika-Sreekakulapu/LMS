import React, { useState, useEffect } from 'react';
import { getAllAcquisitionRequests, approveAcquisitionRequest, rejectAcquisitionRequest } from '../../api/libraryApi';

// Define Acquisition Request types
interface AcquisitionRequest {
  id: number;
  studentId: number;
  bookName: string;
  author?: string;
  publisher?: string;
  edition?: string;
  genre?: string;
  justification?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: number;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

const AcquisitionRequestsManagementPage: React.FC = () => {
  const [allRequests, setAllRequests] = useState<AcquisitionRequest[]>([]);
  const [requests, setRequests] = useState<AcquisitionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectId, setRejectId] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [requestsPerPage] = useState<number>(10);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Stats calculation - always from all requests (not affected by filters)
  const totalRequests = allRequests.length;
  const pendingCount = allRequests.filter(r => r.status === 'PENDING').length;
  const approvedCount = allRequests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = allRequests.filter(r => r.status === 'REJECTED').length;

  useEffect(() => {
    loadRequests();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter requests whenever statusFilter changes
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filter changes
    if (statusFilter === 'ALL') {
      setRequests(allRequests);
    } else {
      // Filter client-side from allRequests
      const filtered = allRequests.filter(request => request.status === statusFilter);
      setRequests(filtered);
    }
  }, [statusFilter, allRequests]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setCurrentPage(1); // Reset to first page when loading new data

      // Always fetch all requests for stats calculation (unfiltered)
      const allResponse = await getAllAcquisitionRequests();
      setAllRequests(allResponse.data || []);

      // Note: Filtering is handled by the useEffect that watches statusFilter and allRequests
    } catch (error) {
      console.error('Error loading acquisition requests:', error);
      showToast('error', 'Failed to load acquisition requests');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await approveAcquisitionRequest(id);
      showToast('success', 'Acquisition request approved successfully!');
      loadRequests(); // Refresh the list
    } catch (error) {
      console.error('Error approving acquisition request:', error);
      showToast('error', 'Failed to approve acquisition request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = (id: number) => {
    setRejectId(id);
    setRejectReason('');
  };

  const submitReject = async () => {
    if (!rejectId) return;

    setActionLoading(rejectId);
    try {
      await rejectAcquisitionRequest(rejectId, rejectReason || undefined);
      showToast('success', 'Acquisition request rejected successfully!');
      setRejectId(null);
      setRejectReason('');
      loadRequests(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting acquisition request:', error);
      showToast('error', 'Failed to reject acquisition request');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span
            style={{
              color: '#007bff',
              fontWeight: '600',
              backgroundColor: '#e3f2fd',
              border: '1px solid #2196f3',
              padding: '6px 14px',
              borderRadius: '25px',
              fontSize: '0.8em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            PENDING
          </span>
        );
      case 'APPROVED':
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
             APPROVED
          </span>
        );
      case 'REJECTED':
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
             REJECTED
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

  // Pagination calculations
  const indexOfLastRequest = currentPage * requestsPerPage;
  const indexOfFirstRequest = indexOfLastRequest - requestsPerPage;
  const currentRequests = requests.slice(indexOfFirstRequest, indexOfLastRequest);
  const totalPages = Math.ceil(requests.length / requestsPerPage);

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
            Loading acquisition requests...
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
          📚 Acquisition Requests
        </h1>
        <p
          style={{
            color: '#666',
            fontSize: '0.95rem',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          Manage student requests to add new books to the library collection
        </p>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{
          background: 'linear-gradient(135deg,#8B4513 0%,#654321 100%)',
          color: '#F4E4BC', padding: '16px', borderRadius: '8px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{totalRequests}</div>
          <div>Total Requests</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg,#E8D1A7, #CDA776)',
          color: '#2A1F16', padding: '16px', borderRadius: '8px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{pendingCount}</div>
          <div>Pending</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg,#9A5B34, #6B4423)',
          color: '#F4E4BC', padding: '16px', borderRadius: '8px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{approvedCount}</div>
          <div>Approved</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg,#D2691E, #A0522D)',
          color: '#F4E4BC', padding: '16px', borderRadius: '8px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{rejectedCount}</div>
          <div>Rejected</div>
        </div>
      </div>

      {/* Controls Section */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid #E8D1A7',
        boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#2A1F16' }}>
              Status Filter:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                background: 'white',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#2A1F16',
                cursor: 'pointer',
                minWidth: '140px',
              }}
            >
              <option value="PENDING">⏳ Pending</option>
              <option value="APPROVED">✅ Approved</option>
              <option value="REJECTED">❌ Rejected</option>
              <option value="ALL">All Requests</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={loadRequests}
              style={{
                background: 'linear-gradient(135deg,#8B4513,#654321)',
                color: '#F4E4BC',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#2A1F16' }}>Reject Acquisition Request</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#2A1F16' }}>
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRejectId(null)}
                style={{
                  background: '#f8f9fa',
                  color: '#6c757d',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={actionLoading === rejectId}
                style={{
                  background: 'linear-gradient(135deg,#8B4513,#654321)',
                  color: '#F4E4BC',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: actionLoading === rejectId ? 'not-allowed' : 'pointer',
                }}
              >
                {actionLoading === rejectId ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requests Table */}
      {requests.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '80px 40px',
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '6rem', marginBottom: '24px', opacity: '0.7' }}>
            📚
          </div>
          <h3 style={{ color: '#2A1F16', marginBottom: '16px', fontSize: '1.8rem', fontWeight: '600' }}>
            No Requests Found
          </h3>
          <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
            {statusFilter === 'ALL' ? 'There are no acquisition requests yet.' : `No ${statusFilter.toLowerCase()} acquisition requests found.`}
          </p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #E8D1A7',
          overflow: 'hidden',
          boxShadow: '0 4px 15px rgba(154,91,52,0.1)'
        }}>
          {/* Table Header */}
          <div style={{
            background: '#f8f9fa',
            padding: '12px 16px',
            borderBottom: '2px solid #e5e7eb',
            fontWeight: '700',
            color: '#2A1F16',
            fontSize: '0.85rem',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr 0.8fr 0.7fr 1.2fr 200px',
            gap: '8px',
            alignItems: 'center'
          }}>
            <div>Book Name</div>
            <div>Author</div>
            <div>Publisher</div>
            <div>Version</div>
            <div>Genre</div>
            <div>Requested</div>
            <div>Justification</div>
            <div>Actions</div>
          </div>

          {/* Table Body */}
          <div style={{ fontSize: '0.85rem' }}>
            <div style={{ display: 'grid', gap: '2px' }}>
              {currentRequests.map((request, index) => (
                <div
                  key={request.id}
                  style={{
                    background: index % 2 === 0 ? '#ffffff' : '#fafafa',
                    padding: '10px 16px',
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr 0.8fr 0.7fr 1.2fr 200px',
                    gap: '8px',
                    alignItems: 'center',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f8ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#fafafa';
                  }}
                >
                  <div style={{
                    fontWeight: '600',
                    color: '#2A1F16',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={request.bookName}
                  >
                    {request.bookName}
                  </div>

                  <div style={{
                    color: '#6c757d',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={request.author || 'N/A'}
                  >
                    {request.author || 'N/A'}
                  </div>

                  <div style={{
                    color: '#495057',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={request.publisher || 'N/A'}
                  >
                    {request.publisher || 'N/A'}
                  </div>

                  <div style={{
                    color: '#495057',
                    textAlign: 'center'
                  }}>
                    {request.edition || 'N/A'}
                  </div>

                  <div style={{
                    color: '#495057',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={request.genre || 'N/A'}
                  >
                    {request.genre || 'N/A'}
                  </div>

                  <div style={{
                    color: '#495057',
                    fontSize: '0.8rem'
                  }}>
                    {formatDate(request.createdAt)}
                  </div>

                  <div style={{
                    color: '#495057',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={request.justification || 'N/A'}
                  >
                    {request.justification || 'N/A'}
                  </div>

                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap' }}>
                    {request.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={actionLoading === request.id}
                          style={{
                            background: 'linear-gradient(145deg, #8B4513, #654321)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            cursor: actionLoading === request.id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            opacity: actionLoading === request.id ? 0.6 : 1,
                            boxShadow: '0 1px 3px rgba(139,69,19,0.3)',
                            whiteSpace: 'nowrap',
                            minWidth: '55px'
                          }}
                          title="Approve this acquisition request"
                        >
                          {actionLoading === request.id ? '⏳' : '✓'} Approve
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={actionLoading === request.id}
                          style={{
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            cursor: actionLoading === request.id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            opacity: actionLoading === request.id ? 0.6 : 1,
                            boxShadow: '0 1px 3px rgba(220,53,69,0.3)',
                            whiteSpace: 'nowrap',
                            minWidth: '55px'
                          }}
                          title="Reject this acquisition request"
                        >
                          {actionLoading === request.id ? '⏳' : '✗'} Reject
                        </button>
                      </>
                    ) : (
                      <div style={{ width: '100%', textAlign: 'center' }}>
                        {getStatusBadge(request.status)}
                        {request.status === 'REJECTED' && request.rejectionReason && (
                          <div style={{
                            color: '#c62828',
                            fontSize: '0.7rem',
                            marginTop: '2px',
                            textAlign: 'center',
                            fontStyle: 'italic',
                            lineHeight: '1.2'
                          }}>
                            {request.rejectionReason.length > 15 ? `${request.rejectionReason.substring(0, 15)}...` : request.rejectionReason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
            Showing {indexOfFirstRequest + 1} to {Math.min(indexOfLastRequest, requests.length)} of {requests.length} requests
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
                      background: currentPage === pageNum ? "#8B4513" : "#ffffff",
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
  );
};

export default AcquisitionRequestsManagementPage;
