// Define the IssueRequest type matching backend BookRequestResponseDTO
interface IssueRequest {
  id: number;
  studentId: number;
  studentName?: string;
  bookId: number;
  bookTitle: string;
  bookAuthor?: string;
  bookPublisher?: string;
  genre?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  requestDate?: string; // For compatibility
  processedAt?: string;
  processedBy?: string;
  processedByName?: string;
  reason?: string;
  issuedRecordId?: number;
}

import React, { useState, useEffect } from 'react';
import { getMyIssueRequests, getMyAcquisitionRequests, createAcquisitionRequest } from '../../api/libraryApi';

// Define Acquisition Request types
interface AcquisitionRequest {
  id: number;
  studentId: number;
  bookName: string;
  author?: string;
  publisher?: string;
  edition?: string;
  justification?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: number;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface AcquisitionFormData {
  bookName: string;
  author: string;
  publisher: string;
  version: string;  // Changed from edition to version
  genre: string;
  justification: string;
}

const StudentRequests: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'issue' | 'acquisition'>('issue');
  const [issueRequests, setIssueRequests] = useState<IssueRequest[]>([]);
  const [acquisitionRequests, setAcquisitionRequests] = useState<AcquisitionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showForm, setShowForm] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Acquisition form state
  const [formData, setFormData] = useState<AcquisitionFormData>({
    bookName: '',
    author: '',
    publisher: '',
    version: '',
    genre: '',
    justification: ''
  });

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    loadAllRequests();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAllRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllRequests = async () => {
    try {
      setLoading(true);
      const [issueResponse, acquisitionResponse] = await Promise.all([
        getMyIssueRequests(),
        getMyAcquisitionRequests()
      ]);
      setIssueRequests(issueResponse.data);
      setAcquisitionRequests(acquisitionResponse.data);
    } catch (error) {
      console.error('Error loading requests:', error);
      showToast('error', 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAcquisition = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.bookName.trim()) {
      showToast('error', 'Book name is required');
      return;
    }
    if (!formData.author.trim()) {
      showToast('error', 'Author is required');
      return;
    }
    if (!formData.publisher.trim()) {
      showToast('error', 'Publisher is required');
      return;
    }
    if (!formData.version.trim()) {
      showToast('error', 'Version is required');
      return;
    }
    if (!formData.genre.trim()) {
      showToast('error', 'Genre is required');
      return;
    }

    try {
      await createAcquisitionRequest(formData);
      showToast('success', 'Acquisition request submitted successfully!');
      setFormData({
        bookName: '',
        author: '',
        publisher: '',
        version: '',
        genre: '',
        justification: ''
      });
      setShowForm(false);
      loadAllRequests(); // Refresh the list
    } catch (error: unknown) {
      console.error('Error submitting acquisition request:', error);
      // Check if it's the "book already exists" error
      const err = error as any; // Type assertion for error handling
      const errorMessage = err?.response?.data?.message || err?.message || '';
      if (errorMessage.includes('already exists')) {
        showToast('error', 'Book already exists in the library collection. You cannot request an acquisition for a book that is already available.');
      } else {
        showToast('error', err?.response?.data?.message || 'Failed to submit acquisition request');
      }
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
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
      case 'EXPIRED':
        return (
          <span
            style={{
              color: '#666',
              fontWeight: '600',
              backgroundColor: '#f5f5f5',
              border: '1px solid #999',
              padding: '6px 14px',
              borderRadius: '25px',
              fontSize: '0.8em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            🕒 EXPIRED
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

  // Get current requests based on active tab
  const currentRequests = activeTab === 'issue' ? issueRequests : acquisitionRequests;
  const filteredRequests = currentRequests.filter(request => {
    if (statusFilter === 'ALL') return true;
    return request.status === statusFilter;
  });

  // Pagination calculations
  const totalItems = filteredRequests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, activeTab]);

  // Stats calculation for current tab
  const totalRequests = currentRequests.length;
  const pendingCount = currentRequests.filter(r => r.status === 'PENDING').length;
  const approvedCount = currentRequests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = currentRequests.filter(r => r.status === 'REJECTED').length;

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
            Loading your requests...
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
          📋 My Requests
        </h1>
        <p
          style={{
            color: '#666',
            fontSize: '0.95rem',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          Track your book request status and manage pending requests
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        marginBottom: '20px',
        background: 'white',
        borderRadius: '12px',
        padding: '4px',
        border: '1px solid #E8D1A7',
        boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
      }}>
        <button
          onClick={() => setActiveTab('issue')}
          style={{
            flex: 1,
            padding: '12px 20px',
            background: activeTab === 'issue' ? 'linear-gradient(135deg,#8B4513,#654321)' : 'transparent',
            color: activeTab === 'issue' ? '#F4E4BC' : '#2A1F16',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          📖 Book Issues
        </button>
        <button
          onClick={() => setActiveTab('acquisition')}
          style={{
            flex: 1,
            padding: '12px 20px',
            background: activeTab === 'acquisition' ? 'linear-gradient(135deg,#8B4513,#654321)' : 'transparent',
            color: activeTab === 'acquisition' ? '#F4E4BC' : '#2A1F16',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          ➕ Acquisition Requests
        </button>
      </div>

      {/* Acquisition Request Form */}
      {activeTab === 'acquisition' && !showForm && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          border: '1px solid #E8D1A7',
          boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
          textAlign: 'center'
        }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: 'linear-gradient(135deg,#8B4513,#654321)',
              color: '#F4E4BC',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            ➕ Request New Book Acquisition
          </button>
        </div>
      )}

      {activeTab === 'acquisition' && showForm && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          border: '1px solid #E8D1A7',
          boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#2A1F16', margin: 0 }}>Request Book Acquisition</h3>
            <button
              onClick={() => setShowForm(false)}
              style={{
                background: '#f8f9fa',
                color: '#6c757d',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              ✕ Cancel
            </button>
          </div>
          <form onSubmit={handleSubmitAcquisition}>
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Row 1: Book Name and Author side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#2A1F16' }}>
                    Book Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bookName}
                    onChange={(e) => setFormData({ ...formData, bookName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                    }}
                    placeholder="Enter book name"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#2A1F16' }}>
                    Author
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                    }}
                    placeholder="Enter author name"
                  />
                </div>
              </div>

              {/* Row 2: Publisher and Genre (dropdown) side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#2A1F16' }}>
                    Publisher
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.publisher}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                    }}
                    placeholder="Enter publisher name"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#2A1F16' }}>
                    Genre *
                  </label>
                  <select
                    required
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="">Select a genre</option>
                    <option value="Fiction">Fiction</option>
                    <option value="Non-Fiction">Non-Fiction</option>
                    <option value="Science Fiction">Science Fiction</option>
                    <option value="Fantasy">Fantasy</option>
                    <option value="Mystery">Mystery</option>
                    <option value="Romance">Romance</option>
                    <option value="Thriller">Thriller</option>
                    <option value="Horror">Horror</option>
                    <option value="Biography">Biography</option>
                    <option value="History">History</option>
                    <option value="Science">Science</option>
                    <option value="Technology">Technology</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Philosophy">Philosophy</option>
                    <option value="Psychology">Psychology</option>
                    <option value="Art">Art</option>
                    <option value="Music">Music</option>
                    <option value="Sports">Sports</option>
                    <option value="Business">Business</option>
                    <option value="Health">Health</option>
                    <option value="Travel">Travel</option>
                    <option value="Cooking">Cooking</option>
                    <option value="Self-Help">Self-Help</option>
                    <option value="Religion">Religion</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Version and Justification side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#2A1F16' }}>
                    Version *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                    }}
                    placeholder="e.g., 1st Edition, 2nd Edition"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#2A1F16' }}>
                    Justification
                  </label>
                  <textarea
                    value={formData.justification}
                    onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      minHeight: '80px',
                      resize: 'vertical',
                    }}
                    placeholder="Why do you want this book added to the library?"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    background: '#f8f9fa',
                    color: '#6c757d',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg,#8B4513,#654321)',
                    color: '#F4E4BC',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Submit Request
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Stats Summary */}
      {totalRequests > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            background: 'linear-gradient(135deg,#8B4513 0%,#654321 100%)',
            color: '#F4E4BC', padding: '16px', borderRadius: '8px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{totalRequests}</div>
            <div>Total {activeTab === 'issue' ? 'Issue' : 'Acquisition'} Requests</div>
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
      )}

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
          gridTemplateColumns: 'auto 1fr',
          gap: '20px',
          alignItems: 'center'
        }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              <option value="ALL">All Requests</option>
              <option value="PENDING">⏳ Pending</option>
              <option value="APPROVED">✅ Approved</option>
              <option value="REJECTED">❌ Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      {filteredRequests.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '80px 40px',
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '6rem', marginBottom: '24px', opacity: '0.7' }}>
            {activeTab === 'issue' ? '📖' : '📚'}
          </div>
          <h3 style={{ color: '#2A1F16', marginBottom: '16px', fontSize: '1.8rem', fontWeight: '600' }}>
            No Requests Found
          </h3>
          <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
            {statusFilter === 'ALL'
              ? `You haven't made any ${activeTab === 'issue' ? 'book issue' : 'acquisition'} requests yet.`
              : `No ${statusFilter.toLowerCase()} ${activeTab === 'issue' ? 'issue' : 'acquisition'} requests found.`
            }
          </p>
        </div>
      ) : activeTab === 'issue' ? (
        <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
          {/* Pagination Info */}
          <div style={{
            background: '#f8f9fa',
            padding: '12px 16px',
            fontSize: '0.9rem',
            color: '#6c757d',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #dee2e6'
          }}>
            <div>
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} requests
            </div>
            <div style={{ fontSize: '0.8rem' }}>
              Page {currentPage} of {totalPages}
            </div>
          </div>

          {/* Table Header */}
          <div style={{
            background: '#f8f9fa',
            padding: '15px',
            borderBottom: '1px solid #eee',
            fontWeight: 'bold',
            color: '#2A1F16',
            display: 'grid',
            gridTemplateColumns: '100px 1.5fr 1fr 1fr 100px 120px 100px',
            gap: '15px',
            alignItems: 'center'
          }}>
            <div>Request ID</div>
            <div>Book Name</div>
            <div>Author</div>
            <div>Publisher</div>
            <div>Genre</div>
            <div>Requested</div>
            <div>Status</div>
          </div>

          {/* Table Body */}
          <div style={{ padding: '8px' }}>

            <div style={{ display: 'grid', gap: '8px' }}>
              {(paginatedRequests as IssueRequest[]).map((request) => (
                  <div
                    key={request.id}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                      border: '1px solid #e9ecef',
                      display: 'grid',
                      gridTemplateColumns: '100px 1.5fr 1fr 1fr 100px 120px 100px',
                      gap: '15px',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#2A1F16', textAlign: 'left' }}>
                      {request.id}
                    </div>

                    <div style={{ color: '#2A1F16', fontWeight: '600' }}>
                      {request.bookTitle || 'N/A'}
                    </div>

                    <div style={{ color: '#6c757d' }}>
                      {request.bookAuthor || 'N/A'}
                    </div>

                    <div style={{ color: '#495057' }}>
                      {request.bookPublisher || 'N/A'}
                    </div>

                    <div style={{ color: '#495057' }}>
                      {request.genre || 'N/A'}
                    </div>

                    <div style={{ color: '#495057', fontSize: '0.9rem', textAlign: 'center' }}>
                      {formatDate(request.requestDate)}
                    </div>

                    <div>
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                ))}
              </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                background: 'white',
                padding: '20px',
                borderTop: '1px solid #dee2e6',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px'
              }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    background: currentPage === 1 ? '#f8f9fa' : 'white',
                    color: currentPage === 1 ? '#6c757d' : '#2A1F16',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                  }}
                >
                  Previous
                </button>

                {/* Page Numbers */}
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (page > totalPages) return null;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        background: page === currentPage ? '#E8D1A7' : 'white',
                        color: page === currentPage ? '#2A1F16' : '#2A1F16',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: page === currentPage ? '600' : '500',
                        minWidth: '40px',
                      }}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    background: currentPage === totalPages ? '#f8f9fa' : 'white',
                    color: currentPage === totalPages ? '#6c757d' : '#2A1F16',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
          {/* Pagination Info */}
          <div style={{
            background: '#f8f9fa',
            padding: '12px 16px',
            fontSize: '0.9rem',
            color: '#6c757d',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #dee2e6'
          }}>
            <div>
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} requests
            </div>
            <div style={{ fontSize: '0.8rem' }}>
              Page {currentPage} of {totalPages}
            </div>
          </div>

          {/* Table Header */}
          <div style={{
            background: '#f8f9fa',
            padding: '15px',
            borderBottom: '1px solid #eee',
            fontWeight: 'bold',
            color: '#2A1F16',
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 0.6fr 1fr 1fr 120px',
            gap: '15px',
            alignItems: 'center'
          }}>
            <div>Book Name</div>
            <div>Author</div>
            <div>Publisher</div>
            <div>Edition</div>
            <div>Justification</div>
            <div>Requested</div>
            <div>Status</div>
          </div>

          {/* Table Body */}
          <div style={{ padding: '8px' }}>
            <div style={{ display: 'grid', gap: '8px' }}>
              {(paginatedRequests as AcquisitionRequest[]).map((request) => (
                <div
                  key={request.id}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    border: '1px solid #e9ecef',
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 1fr 1fr 0.6fr 1fr 1fr 120px',
                    gap: '15px',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ color: '#2A1F16', fontWeight: '600' }}>
                    {request.bookName}
                  </div>

                  <div style={{ color: '#6c757d' }}>
                    {request.author || 'N/A'}
                  </div>

                  <div style={{ color: '#495057' }}>
                    {request.publisher || 'N/A'}
                  </div>

                  <div style={{ color: '#495057', textAlign: 'center' }}>
                    {request.edition || 'N/A'}
                  </div>

                  <div style={{ color: '#495057', fontSize: '0.9rem' }}>
                    {request.justification ? (
                      <div style={{
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {request.justification.length > 30 ? `${request.justification.substring(0, 30)}...` : request.justification}
                      </div>
                    ) : 'N/A'}
                  </div>

                  <div style={{ color: '#495057', fontSize: '0.9rem', textAlign: 'center' }}>
                    {formatDate(request.createdAt)}
                  </div>

                  <div>
                    {getStatusBadge(request.status)}
                    {request.status === 'REJECTED' && request.rejectionReason && (
                      <div style={{
                        color: '#c62828',
                        fontSize: '0.8rem',
                        marginTop: '4px',
                        fontStyle: 'italic'
                      }}>
                        Reason: {request.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                background: 'white',
                padding: '20px',
                borderTop: '1px solid #dee2e6',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px'
              }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    background: currentPage === 1 ? '#f8f9fa' : 'white',
                    color: currentPage === 1 ? '#6c757d' : '#2A1F16',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                  }}
                >
                  Previous
                </button>

                {/* Page Numbers */}
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  if (page > totalPages) return null;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        background: page === currentPage ? '#E8D1A7' : 'white',
                        color: page === currentPage ? '#2A1F16' : '#2A1F16',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: page === currentPage ? '600' : '500',
                        minWidth: '40px',
                      }}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    background: currentPage === totalPages ? '#f8f9fa' : 'white',
                    color: currentPage === totalPages ? '#6c757d' : '#2A1F16',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRequests;
