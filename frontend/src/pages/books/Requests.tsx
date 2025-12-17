import { useState, useEffect } from 'react';
import { getIssueRequests, approveIssueRequest, rejectIssueRequest, bulkApproveRequests, getBookDetails } from '../../api/libraryApi';
import type { IssueRequest } from '../../types/dto';

const Requests: React.FC = () => {
  const [allRequests, setAllRequests] = useState<IssueRequest[]>([]);
  const [requests, setRequests] = useState<IssueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequests, setSelectedRequests] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<IssueRequest | null>(null);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [processingRequests, setProcessingRequests] = useState<Set<number>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Form states
  const [rejectReason, setRejectReason] = useState('');
  const [dueDateOverride, setDueDateOverride] = useState('');

  useEffect(() => {
    loadRequests();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await getIssueRequests(undefined);  // Always fetch all requests for stats
      const allReq = response.data;
      setAllRequests(allReq);

      // Then filter based on statusFilter
      if (statusFilter === 'ALL') {
        setRequests(allReq);
      } else {
        setRequests(allReq.filter(r => r.status === statusFilter));
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      showToast('error', 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const computeExpectedDueDate = (request: IssueRequest) => {
    // Default 14 days borrowing period, editable by librarian
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 14);
    return dueDate.toISOString().split('T')[0]; // YYYY-MM-DD format
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

  // Filtering and sorting
  const filteredAndSortedRequests = requests
    .filter((request) => {
      const lowerSearch = searchTerm.toLowerCase();
      const searchMatch =
        !searchTerm ||
        request.bookTitle?.toLowerCase().includes(lowerSearch) ||
        request.studentName?.toLowerCase().includes(lowerSearch) ||
        request.id.toString().includes(lowerSearch);

      return searchMatch;
    })
    .sort((a, b) => {
      let aValue: string | Date, bValue: string | Date;

      switch (sortBy) {
        case 'id':
          if (sortOrder === 'asc') {
            return a.id - b.id;
          } else {
            return b.id - a.id;
          }
        case 'requestDate':
          aValue = new Date(a.requestedAt);
          bValue = new Date(b.requestedAt);
          break;
        case 'student':
          aValue = a.studentName.toLowerCase();
          bValue = b.studentName.toLowerCase();
          break;
        case 'book':
          aValue = a.bookTitle.toLowerCase();
          bValue = b.bookTitle.toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });



  // Stats calculation - use all loaded requests for accurate counts regardless of current filter
  const totalRequests = allRequests.length;
  const approvedCount = allRequests.filter(r => r.status === 'APPROVED').length;
  const pendingCount = allRequests.filter(r => r.status === 'PENDING').length;
  const rejectedCount = allRequests.filter(r => r.status === 'REJECTED').length;

  // Selection handlers
  const handleSelectRequest = (requestId: number, checked: boolean) => {
    const newSelected = new Set(selectedRequests);
    if (checked) {
      newSelected.add(requestId);
    } else {
      newSelected.delete(requestId);
    }
    setSelectedRequests(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allSelectableIds = filteredAndSortedRequests
        .filter(r => r.status === 'PENDING')
        .map(r => r.id);
      setSelectedRequests(new Set(allSelectableIds));
    } else {
      setSelectedRequests(new Set());
    }
  };

  const hasSelectablePending = filteredAndSortedRequests.some(r => r.status === 'PENDING');
  const allSelected = hasSelectablePending && filteredAndSortedRequests
    .filter(r => r.status === 'PENDING')
    .every(r => selectedRequests.has(r.id));

  // Action handlers
  const handleApproveRequest = async (request: IssueRequest) => {
    setSelectedRequest(request);
    setDueDateOverride(computeExpectedDueDate(request));

    // Fetch book details to get available copies count
    try {
      const bookResponse = await getBookDetails(request.bookId);
      setSelectedBook(bookResponse.data);
    } catch (error) {
      console.error('Error fetching book details:', error);
      setSelectedBook(null); // Fallback to null
    }

    setShowApproveModal(true);
  };

  const handleRejectRequest = (request: IssueRequest) => {
    setSelectedRequest(request);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const processApprove = async () => {
    if (!selectedRequest) return;

    setProcessingRequests(prev => new Set(prev).add(selectedRequest.id));

    try {
      await approveIssueRequest(selectedRequest.id, {
        expectedDueDate: dueDateOverride || computeExpectedDueDate(selectedRequest)
      });

      showToast('success', `Request #${selectedRequest.id} approved successfully!`);
      setShowApproveModal(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error: any) {
      if (error.response?.data?.message?.includes('OutOfStock')) {
        showToast('error', 'Cannot approve: Book out of stock');
      } else {
        showToast('error', 'Failed to approve request');
      }
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedRequest.id);
        return newSet;
      });
    }
  };

  const processReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) return;

    setProcessingRequests(prev => new Set(prev).add(selectedRequest.id));

    try {
      await rejectIssueRequest(selectedRequest.id, rejectReason);

      showToast('success', `Request #${selectedRequest.id} rejected`);
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason('');
      loadRequests();
    } catch (error) {
      showToast('error', 'Failed to reject request');
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedRequest.id);
        return newSet;
      });
    }
  };

  const processBulkApprove = async () => {
    if (selectedRequests.size === 0) return;

    try {
      const response = await bulkApproveRequests(Array.from(selectedRequests));
      const { approvedCount, failedRequests } = response.data;

      if (failedRequests.length > 0) {
        showToast('success', `${approvedCount} requests approved. ${failedRequests.length} failed due to conflicts.`);
        setSelectedRequests(new Set(failedRequests.map((r: any) => r.id)));
      } else {
        showToast('success', `${approvedCount} requests approved successfully!`);
        setSelectedRequests(new Set());
      }

      setShowBulkModal(false);
      loadRequests();
    } catch (error) {
      showToast('error', 'Failed to bulk approve requests');
    }
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
            Loading requests...
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
          📋 Issue Requests Queue
        </h1>
        <p
          style={{
            color: '#666',
            fontSize: '0.95rem',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          Approve or reject book issue requests quickly and efficiently
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
            background: 'linear-gradient(135deg,#9A5B34, #6B4423)',
            color: '#F4E4BC', padding: '16px', borderRadius: '8px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{approvedCount}</div>
            <div>Approved</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg,#E8D1A7, #CDA776)',
            color: '#2A1F16', padding: '16px', borderRadius: '8px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{pendingCount}</div>
            <div>Pending</div>
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
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: '20px',
          alignItems: 'center'
        }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#2A1F16' }}>
              Status:
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
              <option value="ALL">📊 All Requests</option>
            </select>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search requests, students, books..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '12px 16px',
                paddingLeft: '40px',
                border: '2px solid #ddd',
                borderRadius: '25px',
                width: '100%',
                fontSize: '0.9rem',
                background: 'white',
              }}
            />
            <span style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#999',
              fontSize: '1rem'
            }}>
              🔍
            </span>
          </div>

          {/* Bulk Actions */}
          {selectedRequests.size > 0 && (
            <button
              onClick={() => setShowBulkModal(true)}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.9rem',
                boxShadow: '0 2px 8px rgba(0,123,255,0.3)',
              }}
            >
              ⚡ Bulk Approve ({selectedRequests.size})
            </button>
          )}
        </div>
      </div>

      {/* Requests Table */}
      {filteredAndSortedRequests.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '80px 40px',
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '6rem', marginBottom: '24px', opacity: '0.7' }}>
            📋
          </div>
          <h3 style={{ color: '#2A1F16', marginBottom: '16px', fontSize: '1.8rem', fontWeight: '600' }}>
            No Requests Found
          </h3>
          <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
            {searchTerm ? 'Try adjusting your search criteria.' : 'All requests have been processed.'}
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e5e7eb' }}>
                  {statusFilter === 'PENDING' && (
                    <th style={{
                      padding: '12px 6px',
                      textAlign: 'center',
                      fontWeight: '700',
                      color: '#2A1F16',
                      fontSize: '0.85rem',
                      width: '45px'
                    }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        disabled={!hasSelectablePending}
                      />
                    </th>
                  )}
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontWeight: '700',
                    color: '#2A1F16',
                    fontSize: '0.85rem',
                    width: '90px'
                  }}>
                    ID
                  </th>
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontWeight: '700',
                    color: '#2A1F16',
                    fontSize: '0.85rem',
                    width: '120px'
                  }}>
                    Student
                  </th>
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontWeight: '700',
                    color: '#2A1F16',
                    fontSize: '0.85rem',
                    width: '180px'
                  }}>
                    Book
                  </th>
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontWeight: '700',
                    color: '#2A1F16',
                    fontSize: '0.85rem',
                    width: '110px'
                  }}>
                    Author
                  </th>

                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    fontWeight: '700',
                    color: '#2A1F16',
                    fontSize: '0.85rem',
                    width: '140px'
                  }}>
                    Genre
                  </th>
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'left',
                    fontWeight: '700',
                    color: '#2A1F16',
                    fontSize: '0.85rem',
                    width: '110px'
                  }}>
                    Requested
                  </th>
                  {statusFilter === 'PENDING' && (
                    <th style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      fontWeight: '700',
                      color: '#2A1F16',
                      fontSize: '0.85rem',
                      width: '200px'
                    }}>
                      Actions
                    </th>
                  )}
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    fontWeight: '700',
                    color: '#2A1F16',
                    fontSize: '0.85rem',
                    width: '100px'
                  }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((request, index) => {
                  const isProcessing = processingRequests.has(request.id);
                  const isSelected = selectedRequests.has(request.id);

                  return (
                    <tr
                      key={request.id}
                      style={{
                        backgroundColor: isSelected ? '#e3f2fd' : index % 2 === 0 ? '#ffffff' : '#fafafa',
                        borderBottom: '1px solid #e9ecef',
                        transition: 'background-color 0.2s',
                        opacity: isProcessing ? 0.7 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = '#f8f9fa';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#fafafa';
                        }
                      }}
                    >
                      {statusFilter === 'PENDING' && (
                        <td style={{ padding: '12px 8px', textAlign: 'center', minWidth: '40px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectRequest(request.id, e.target.checked)}
                            disabled={request.status !== 'PENDING' || isProcessing}
                          />
                        </td>
                      )}
                      <td style={{ padding: '12px 8px', minWidth: '80px' }}>
                        <div style={{ fontWeight: '700', color: '#2A1F16', fontSize: '0.9rem' }}>
                          {request.id}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', minWidth: '120px' }}>
                        <div style={{ fontWeight: '600', color: '#2A1F16', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {request.studentName || 'Unknown Student'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', minWidth: '180px' }}>
                        <div style={{ fontWeight: '600', color: '#2A1F16', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {request.bookTitle || 'Unknown Book'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', minWidth: '120px' }}>
                        <div style={{ color: '#6c757d', fontSize: '0.9rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {request.bookAuthor || 'Unknown Author'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 8px', textAlign: 'center', minWidth: '80px' }}>
                        <div style={{ color: '#495057', fontSize: '0.9rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {request.genre || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', minWidth: '120px' }}>
                        <div style={{ color: '#495057', fontSize: '0.85rem', fontWeight: '500' }}>
                          {new Date(request.requestedAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center', minWidth: '100px' }}>
                        {getStatusBadge(request.status)}
                      </td>
                      {statusFilter === 'PENDING' && (
                        <td style={{ padding: '12px 8px', textAlign: 'center', minWidth: '200px' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', flexWrap: 'nowrap' }}>
                            <button
                              onClick={() => handleApproveRequest(request)}
                              disabled={isProcessing}
                              style={{
                                background: 'linear-gradient(145deg, #8B4513, #654321)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 14px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                opacity: isProcessing ? 0.6 : 1,
                                boxShadow: '0 1px 3px rgba(139,69,19,0.3)',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                minWidth: '70px'
                              }}
                              onMouseEnter={(e) => {
                                if (!isProcessing) {
                                  (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                                  (e.target as HTMLElement).style.boxShadow = '0 3px 6px rgba(139,69,19,0.4)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isProcessing) {
                                  (e.target as HTMLElement).style.transform = 'translateY(0)';
                                  (e.target as HTMLElement).style.boxShadow = '0 1px 3px rgba(139,69,19,0.3)';
                                }
                              }}
                            >
                              {isProcessing ? '⏳' : '✓'} Approve
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request)}
                              disabled={isProcessing}
                              style={{
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 14px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                opacity: isProcessing ? 0.6 : 1,
                                boxShadow: '0 1px 3px rgba(220,53,69,0.3)',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                minWidth: '70px'
                              }}
                              onMouseEnter={(e) => {
                                if (!isProcessing) {
                                  (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                                  (e.target as HTMLElement).style.boxShadow = '0 3px 6px rgba(220,53,69,0.4)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isProcessing) {
                                  (e.target as HTMLElement).style.transform = 'translateY(0)';
                                  (e.target as HTMLElement).style.boxShadow = '0 1px 3px rgba(220,53,69,0.3)';
                                }
                              }}
                            >
                              {isProcessing ? '⏳' : '✗'} Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bulk Actions for Pending Requests */}
          {statusFilter === 'PENDING' && selectedRequests.size > 0 && (
            <div style={{
              background: '#f8f9fa',
              borderTop: '1px solid #e5e7eb',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ color: '#2A1F16', fontWeight: '600', fontSize: '0.95rem' }}>
                {selectedRequests.size} request{selectedRequests.size !== 1 ? 's' : ''} selected
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setSelectedRequests(new Set())}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Clear Selection
                </button>
                <button
                  onClick={() => setShowBulkModal(true)}
                  style={{
                    background: 'linear-gradient(145deg, #8B4513, #654321)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(139,69,19,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  ⚡ Bulk Approve Selected
                </button>
              </div>
            </div>
          )}

          {/* Pagination */}
          {filteredAndSortedRequests.length > itemsPerPage && (
            <div
              style={{
                background: '#f8f9fa',
                borderTop: '1px solid #e5e7eb',
                padding: '20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #dee2e6',
                  backgroundColor: currentPage === 1 ? '#f8f9fa' : '#ffffff',
                  color: currentPage === 1 ? '#6c757d' : '#495057',
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                ⬅️ Previous
              </button>

              <div style={{ display: 'flex', gap: '5px' }}>
                {(() => {
                  const totalPages = Math.ceil(filteredAndSortedRequests.length / itemsPerPage);
                  const maxVisiblePages = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }

                  const pages = [];
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #dee2e6',
                          backgroundColor: currentPage === i ? '#007bff' : '#ffffff',
                          color: currentPage === i ? 'white' : '#495057',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          minWidth: '40px',
                          transition: 'all 0.2s',
                        }}
                      >
                        {i}
                      </button>
                    );
                  }
                  return pages;
                })()}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredAndSortedRequests.length / itemsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(filteredAndSortedRequests.length / itemsPerPage)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #dee2e6',
                  backgroundColor: currentPage === Math.ceil(filteredAndSortedRequests.length / itemsPerPage) ? '#f8f9fa' : '#ffffff',
                  color: currentPage === Math.ceil(filteredAndSortedRequests.length / itemsPerPage) ? '#6c757d' : '#495057',
                  borderRadius: '6px',
                  cursor: currentPage === Math.ceil(filteredAndSortedRequests.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                }}
              >
                Next ➡️
              </button>

              <div style={{ marginLeft: '15px', fontSize: '0.9rem', color: '#6c757d' }}>
                Page {currentPage} of {Math.ceil(filteredAndSortedRequests.length / itemsPerPage)} • {filteredAndSortedRequests.length} total records
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>✅ Approve Issue Request</h3>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📖</div>
                <h4 style={{ color: '#2A1F16' }}>{selectedRequest.bookTitle}</h4>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                  Requested by {selectedRequest.studentName}
                </p>
              </div>

              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#2A1F16' }}>📋 Issue Details Preview:</h5>
                <div style={{ display: 'grid', gap: '8px', fontSize: '0.9rem' }}>
                  <div><strong>Until:</strong> {formatDateShort(dueDateOverride || computeExpectedDueDate(selectedRequest))}</div>
                  <div><strong>Available Copies:</strong> {selectedBook?.availableCopies ?? 'Loading...'}</div>
                  <div><strong>Borrower:</strong> {selectedRequest.studentName}</div>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  🔄 Override Due Date (Optional):
                </label>
                <input
                  type="date"
                  value={dueDateOverride}
                  onChange={(e) => setDueDateOverride(e.target.value)}
                  style={{ padding: '8px', width: '100%', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowApproveModal(false)}
                style={{ flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={processApprove}
                disabled={processingRequests.has(selectedRequest.id)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: processingRequests.has(selectedRequest.id) ? 'not-allowed' : 'pointer',
                  opacity: processingRequests.has(selectedRequest.id) ? 0.6 : 1,
                }}
              >
                {processingRequests.has(selectedRequest.id) ? '🔄 Processing...' : '✅ Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>❌ Reject Issue Request</h3>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📖</div>
                <h4 style={{ color: '#2A1F16' }}>{selectedRequest.bookTitle}</h4>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                  Requested by {selectedRequest.studentName}
                </p>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Reason for Rejection: *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this request..."
                  style={{ padding: '10px', width: '100%', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px', resize: 'vertical' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{ flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={processReject}
                disabled={!rejectReason.trim() || processingRequests.has(selectedRequest.id)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: rejectReason.trim() ? '#dc3545' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                  opacity: processingRequests.has(selectedRequest.id) ? 0.6 : 1,
                }}
              >
                {processingRequests.has(selectedRequest.id) ? '🔄 Processing...' : '❌ Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Approve Modal */}
      {showBulkModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>⚡ Bulk Approve Issue Requests</h3>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📚</div>
                <h4 style={{ color: '#2A1F16' }}>Confirm Bulk Approval</h4>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                  You have selected <strong>{selectedRequests.size}</strong> request{selectedRequests.size !== 1 ? 's' : ''} for bulk approval
                </p>
              </div>

              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#2A1F16' }}>⚠️ Important Notes:</h5>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#495057', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  <li>Requests will be processed in the order they were made</li>
                  <li>If a book is out of stock, that request will be skipped with a failure reason</li>
                  <li>Already processed requests will be skipped</li>
                  <li>Email notifications will be sent to successful borrowers</li>
                  <li>You can proceed with successful approvals while reviewing failed ones</li>
                </ul>
              </div>

              <div style={{ background: '#e3f2fd', border: '1px solid #2196f3', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#0d47a1' }}>📊 Preview of Selected Requests:</h5>
                <div style={{ maxHeight: '200px', overflowY: 'auto', fontSize: '0.9rem' }}>
                  {[...selectedRequests].map((requestId, index) => {
                    const request = filteredAndSortedRequests.find(r => r.id === requestId);
                    if (!request) return null;
                    return (
                      <div key={requestId} style={{
                        padding: '8px 0',
                        borderBottom: index < selectedRequests.size - 1 ? '1px solid #e9ecef' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <strong>#{request.id}</strong> - {request.bookTitle}
                          <span style={{ color: '#666', fontSize: '0.8rem' }}>
                            {' '}(by {request.studentName})
                          </span>
                        </div>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: '#4caf50',
                          color: 'white',
                          fontSize: '0.7rem',
                          fontWeight: '600'
                        }}>
                          Ready
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowBulkModal(false)}
                style={{ flex: 1, padding: '12px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={processBulkApprove}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'linear-gradient(145deg, #8B4513, #654321)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ⚡ Confirm Bulk Approval
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default Requests;
