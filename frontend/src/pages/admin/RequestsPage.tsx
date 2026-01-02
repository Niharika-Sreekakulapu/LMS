import { useEffect, useState } from "react";
import { getAdminMetrics, getAllBookRequests, bulkApproveBookRequests, approveBookRequest, rejectBookRequest } from "../../api/adminApi";

interface BookRequest {
  id: number;
  studentId?: number;
  studentName?: string;
  bookId?: number;
  bookTitle?: string;
  bookAuthor?: string;
  bookPublisher?: string;
  bookGenre?: string;
  status?: string;
  requestedAt?: string;
  requestDate?: string;
  processedAt?: string;
  processedById?: number;
  processedByName?: string;
  reason?: string;
  issuedRecordId?: number;
}

export default function RequestsPage() {
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'pending' | 'all'>('overview');

  // Add pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Approval modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<BookRequest | null>(null);
  const [expectedDueDate, setExpectedDueDate] = useState<string>('');

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequestForRejection, setSelectedRequestForRejection] = useState<BookRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await getAdminMetrics();
        setMetrics({
          totalRequests: response.data.totalRequests || 0,
          pendingRequests: response.data.pendingRequests || 0,
          approvedRequests: response.data.approvedRequests || 0,
          rejectedRequests: response.data.rejectedRequests || 0
        });
      } catch (error) {
        console.error("Failed to fetch request metrics:", error);
        // Keep default values if API fails
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const fetchRequests = async (status?: string) => {
    setRequestsLoading(true);
    try {
      const response = await getAllBookRequests(status);
      setRequests(response.data || []);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleViewPending = () => {
    setViewMode('pending');
    setCurrentPage(1); // Reset pagination
    fetchRequests('PENDING');
  };

  const handleViewAll = () => {
    setViewMode('all');
    setCurrentPage(1); // Reset pagination
    fetchRequests();
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    setRequests([]);
    setCurrentPage(1); // Reset pagination when going back
  };

  const fetchMetrics = async () => {
    try {
      const response = await getAdminMetrics();
      setMetrics({
        totalRequests: response.data.totalRequests || 0,
        pendingRequests: response.data.pendingRequests || 0,
        approvedRequests: response.data.approvedRequests || 0,
        rejectedRequests: response.data.rejectedRequests || 0
      });
    } catch (error) {
      console.error("Failed to fetch request metrics:", error);
      // Keep default values if API fails
    }
  };

  const handleBulkApprove = async () => {
    if (approving) return;

    try {
      setApproving(true);
      console.log("Starting bulk approval process...");

      // First get all pending requests
      console.log("Fetching pending requests...");
      const pendingRequestsResponse = await getAllBookRequests("PENDING");
      console.log("Pending requests response:", pendingRequestsResponse.data);

      if (pendingRequestsResponse.data && pendingRequestsResponse.data.length > 0) {
        const requestIds = pendingRequestsResponse.data.map((req: BookRequest) => req.id);
        console.log("Request IDs to approve:", requestIds);

        // Bulk approve all pending requests
        console.log("Calling bulk approve API...");
        const result = await bulkApproveBookRequests(requestIds);
        console.log("Bulk approve result:", result);

        // Refresh metrics to show updated counts
        console.log("Refreshing metrics...");
        await fetchMetrics();

        alert(`Successfully approved ${requestIds.length} book requests!`);
      } else {
        console.log("No pending requests found");
        alert("No pending requests to approve.");
      }
    } catch (error) {
      console.error("Failed to bulk approve requests:", error);
      alert("Failed to approve requests. Please try again.");
    } finally {
      setApproving(false);
    }
  };

  const handleApproveAll = async () => {
    await handleBulkApprove();
  };

  const handleReservationQueue = () => {
    alert("Reservation Queue feature not implemented yet");
  };

  // Pagination helpers
  const totalPages = Math.ceil(requests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequests = requests.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  const handleApproveRequest = async (request: BookRequest) => {
    setSelectedRequestForApproval(request);
    // Set default due date to 14 days from now
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 14);
    setExpectedDueDate(defaultDueDate.toISOString().split('T')[0]); // YYYY-MM-DD format
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    if (!selectedRequestForApproval) return;

    try {
      await approveBookRequest(selectedRequestForApproval.id, expectedDueDate);
      alert("Request approved successfully!");
      setShowApproveModal(false);
      setSelectedRequestForApproval(null);
      // Refresh the table and metrics
      fetchRequests(viewMode === 'pending' ? 'PENDING' : undefined);
      fetchMetrics();
    } catch (error) {
      console.error("Failed to approve request:", error);
      alert("Failed to approve request");
    }
  };

  const handleRejectRequest = async (request: BookRequest) => {
    setSelectedRequestForRejection(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedRequestForRejection) return;

    try {
      await rejectBookRequest(selectedRequestForRejection.id, rejectionReason);
      alert("Request rejected successfully!");
      setShowRejectModal(false);
      setSelectedRequestForRejection(null);
      setRejectionReason('');
      // Refresh the table and metrics
      fetchRequests(viewMode === 'pending' ? 'PENDING' : undefined);
      fetchMetrics();
    } catch (error) {
      console.error("Failed to reject request:", error);
      alert("Failed to reject request");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', system-ui, Arial, sans-serif", background: "#f3f4f6" }}>


      {/* Main */}
      <main style={{ flex: 1, padding: 22, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" }}>Requests Management</h1>
            <div style={{ color: "#6b7280", marginTop: 6, fontSize: 13 }}>Handle student requests and queue management</div>
          </div>
        </div>

        {/* Request Stats - FIXED VALUES (not affected by table filters) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
          <div style={{ background: "white", padding: 20, borderRadius: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)", textAlign: "center", border: "1px solid #D97706" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#D97706" }}>
              {loading ? "..." : metrics.totalRequests.toLocaleString()}
            </div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>All Requests</div>
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
              (Fixed: {metrics.pendingRequests} pending, {metrics.approvedRequests} approved, {metrics.rejectedRequests} rejected)
            </div>
          </div>
          <div style={{ background: "white", padding: 20, borderRadius: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#059669" }}>
              {loading ? "..." : metrics.approvedRequests.toLocaleString()}
            </div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>Approved</div>
          </div>
          <div style={{ background: "white", padding: 20, borderRadius: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#DC2626" }}>
              {loading ? "..." : metrics.rejectedRequests.toLocaleString()}
            </div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>Rejected</div>
          </div>
        </div>

        {/* Request Actions */}
        <div style={{ background: "white", padding: 24, borderRadius: 12, marginBottom: 20, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Request Actions</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
            {/* Test button for development - remove in production */}
            <button onClick={() => {
              console.log("Current metrics:", metrics);
              alert(`Current metrics:\nPending: ${metrics.pendingRequests}\nApproved: ${metrics.approvedRequests}\nRejected: ${metrics.rejectedRequests}`);
            }} style={{
              padding: "16px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#FEF3C7",
              color: "#92400E",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 12
            }}>
              <span style={{ fontSize: 20 }}>📊</span>
              <div>
                <div>Debug Metrics</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Check current numbers</div>
              </div>
            </button>
            <button onClick={handleViewPending} style={{
              padding: "16px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "white",
              color: "#374151",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 12
            }}>
              <span style={{ fontSize: 20 }}>👀</span>
              <div>
                <div>View Pending</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Check all pending requests</div>
              </div>
            </button>
            <button onClick={handleApproveAll} style={{
              padding: "16px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "white",
              color: "#374151",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 12
            }}>
              <span style={{ fontSize: 20 }}>✔️</span>
              <div>
                <div>Approve All Available</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Auto-approve when books available</div>
              </div>
            </button>
            <button onClick={handleReservationQueue} style={{
              padding: "16px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "white",
              color: "#374151",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 12
            }}>
              <span style={{ fontSize: 20 }}>⏰</span>
              <div>
                <div>Reservation Queue</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Manage waitlist</div>
              </div>
            </button>

          </div>
        </div>

        {/* Requests List */}
        <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827" }}>
              {viewMode === 'overview' && 'Recent Requests'}
              {viewMode === 'pending' && 'Pending Requests'}
              {viewMode === 'all' && 'All Requests'}
            </h3>
            <div style={{ display: "flex", gap: 8 }}>
              {viewMode !== 'overview' && (
                <button onClick={handleBackToOverview} style={{ padding: "6px 12px", borderRadius: 6, background: "#6b7280", color: "white", border: "none", cursor: "pointer", fontSize: 12 }}>
                  ← Back to Overview
                </button>
              )}
              {viewMode === 'overview' && (
                <button onClick={handleViewAll} style={{ padding: "6px 12px", borderRadius: 6, background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", cursor: "pointer", fontSize: 12 }}>
                  View All Requests
                </button>
              )}
            </div>
          </div>

          {viewMode === 'overview' && (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📋</div>
              <p>Click "View All Requests" or "View Pending" to see requests</p>
            </div>
          )}

          {(viewMode === 'pending' || viewMode === 'all') && (
            <div>
              {requestsLoading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "16px" }}>⏳</div>
                  <p>Loading requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📭</div>
                  <p>No {viewMode === 'pending' ? 'pending' : ''} requests found</p>
                </div>
              ) : (
                <div>
                  {/* Results Summary */}
                  <div style={{ marginBottom: "16px", padding: "12px", background: "#f8f9fa", borderRadius: "8px", textAlign: "center" }}>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#2A1F16" }}>
                      📊 Showing {startIndex + 1}-{Math.min(endIndex, requests.length)} of {requests.length} {viewMode === 'pending' ? 'pending' : ''} requests
                    </span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                          <th style={{ padding: "12px", textAlign: "center", fontWeight: "700", color: "#374151", fontSize: "16px" }}>ID</th>
                          <th style={{ padding: "12px", textAlign: "left", fontWeight: "700", color: "#374151", fontSize: "16px" }}>👤 Student</th>
                          <th style={{ padding: "12px", textAlign: "left", fontWeight: "700", color: "#374151", fontSize: "16px" }}>📚 Book</th>
                          <th style={{ padding: "12px", textAlign: "center", fontWeight: "700", color: "#374151", fontSize: "16px" }}>� Actions</th>
                          <th style={{ padding: "12px", textAlign: "center", fontWeight: "700", color: "#374151", fontSize: "16px" }}>📅 Request Date</th>
                          <th style={{ padding: "12px", textAlign: "center", fontWeight: "700", color: "#374151", fontSize: "16px" }}>� Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentRequests.map((req: BookRequest) => (
                          <tr key={req.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "12px", textAlign: "center", fontSize: "16px", fontWeight: "500" }}>{req.id}</td>
                            <td style={{ padding: "12px", fontSize: "16px" }}>
                              <div style={{ fontWeight: "600", color: "#111827", marginBottom: "4px" }}>{req.studentName || 'N/A'}</div>
                            </td>
                            <td style={{ padding: "12px", fontSize: "16px" }}>
                              <div style={{ fontWeight: "600", color: "#111827", marginBottom: "4px" }}>{req.bookTitle || 'N/A'}</div>
                              {req.bookAuthor && (
                                <div style={{ fontSize: "14px", color: "#6b7280", fontStyle: "italic" }}>
                                  by {req.bookAuthor}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "12px", textAlign: "center" }}>
                              {req.status === 'PENDING' && (
                                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                                  <button
                                    onClick={() => handleApproveRequest(req)}
                                    style={{
                                      padding: "6px 12px",
                                      background: "#28a745",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      fontSize: "14px",
                                      fontWeight: "600",
                                    }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(req)}
                                    style={{
                                      padding: "6px 12px",
                                      background: "#dc3545",
                                      color: "white",
                                      border: "none",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      fontSize: "14px",
                                      fontWeight: "600",
                                    }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                              {req.status !== 'PENDING' && (
                                <span style={{ color: "#6b7280", fontSize: "14px", fontWeight: "500" }}>
                                  Processed
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "12px", textAlign: "center", fontSize: "16px", color: "#6b7280" }}>
                              {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString('en-IN') : 'N/A'}
                            </td>
                            <td style={{ padding: "12px", textAlign: "center" }}>
                              <span style={{
                                padding: "6px 12px",
                                borderRadius: "20px",
                                fontSize: "14px",
                                fontWeight: "700",
                                textTransform: "uppercase",
                                backgroundColor:
                                  req.status === 'APPROVED' ? '#dcfce7' :
                                  req.status === 'REJECTED' ? '#fef2f2' :
                                  req.status === 'PENDING' ? '#fef3c7' : '#f3f4f6',
                                color:
                                  req.status === 'APPROVED' ? '#166534' :
                                  req.status === 'REJECTED' ? '#dc2626' :
                                  req.status === 'PENDING' ? '#92400e' : '#374151',
                                whiteSpace: "nowrap"
                              }}>
                                {req.status || 'UNKNOWN'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 0 && (
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 20,
                      padding: "16px",
                      background: "#f8f9fa",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb"
                    }}>
                      <div style={{ color: "#6b7280", fontSize: "14px" }}>
                        Page {currentPage} of {totalPages}
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          style={{
                            padding: "8px 12px",
                            border: "1px solid #d1d5db",
                            background: currentPage === 1 ? "#f3f4f6" : "#ffffff",
                            color: currentPage === 1 ? "#9ca3af" : "#374151",
                            borderRadius: 6,
                            cursor: currentPage === 1 ? "not-allowed" : "pointer",
                            fontSize: "14px",
                            fontWeight: "500"
                          }}
                        >
                          Previous
                        </button>
                        <div style={{ display: "flex", gap: "4px" }}>
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
                                onClick={() => goToPage(pageNum)}
                                style={{
                                  padding: "8px 12px",
                                  border: "1px solid #d1d5db",
                                  background: currentPage === pageNum ? "#2A1F16" : "#ffffff",
                                  color: currentPage === pageNum ? "#ffffff" : "#374151",
                                  borderRadius: 6,
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  fontWeight: "500",
                                  minWidth: "40px"
                                }}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          style={{
                            padding: "8px 12px",
                            border: "1px solid #d1d5db",
                            background: currentPage === totalPages ? "#f3f4f6" : "#ffffff",
                            color: currentPage === totalPages ? "#9ca3af" : "#374151",
                            borderRadius: 6,
                            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                            fontSize: "14px",
                            fontWeight: "500"
                          }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Approve Modal */}
      {showApproveModal && selectedRequestForApproval && (
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
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <h2 style={{ color: '#28a745', margin: '0 0 10px 0' }}>Approve Request</h2>
                <h3 style={{ color: '#2A1F16', fontSize: '1.2rem', margin: '0 0 5px 0' }}>
                  {selectedRequestForApproval.bookTitle || 'N/A'}
                </h3>
                <p style={{ color: '#6c757d', margin: 0 }}>
                  by {selectedRequestForApproval.bookAuthor || 'N/A'}
                </p>
                <p style={{ color: '#6c757d', margin: '10px 0 0 0' }}>
                  Requested by: {selectedRequestForApproval.studentName || 'N/A'}
                </p>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#2A1F16', fontWeight: '600' }}>
                  Expected Due Date:
                </label>
                <input
                  type="date"
                  value={expectedDueDate}
                  onChange={(e) => setExpectedDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <small style={{ color: '#6c757d', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                  Leave blank to use default loan period based on student membership type.
                </small>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedRequestForApproval(null);
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
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApprove}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Approve Book Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequestForRejection && (
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
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <h2 style={{ color: '#dc3545', margin: '0 0 10px 0' }}>Reject Request</h2>
                <h3 style={{ color: '#2A1F16', fontSize: '1.2rem', margin: '0 0 5px 0' }}>
                  {selectedRequestForRejection.bookTitle || 'N/A'}
                </h3>
                <p style={{ color: '#6c757d', margin: 0 }}>
                  by {selectedRequestForRejection.bookAuthor || 'N/A'}
                </p>
                <p style={{ color: '#6c757d', margin: '10px 0 0 0' }}>
                  Requested by: {selectedRequestForRejection.studentName || 'N/A'}
                </p>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#2A1F16', fontWeight: '600' }}>
                  Reason for Rejection (optional):
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejecting this request..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedRequestForRejection(null);
                    setRejectionReason('');
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
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  Reject Book Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
