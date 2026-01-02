import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import client from '../../api/axiosClient';
import type { BorrowHistory } from '../../types/dto';
import Toast from '../../components/Toast';

const StudentBorrows: React.FC = () => {
  const [borrows, setBorrows] = useState<BorrowHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [returningId, setReturningId] = useState<number | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedBorrow, setSelectedBorrow] = useState<BorrowHistory | null>(null);
  const [returnCondition, setReturnCondition] = useState<'GOOD' | 'DAMAGED' | 'LOST'>('GOOD');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { auth } = useAuth();
  const studentId = auth.user?.id;

  useEffect(() => {
    if (studentId) {
      loadBorrows();
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadBorrows, 30000);
      return () => clearInterval(interval);
    }
  }, [studentId]);

  const loadBorrows = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const response = await client.get(`/api/borrow?studentId=${studentId}`);
      setBorrows(response.data);
    } catch (error) {
      console.error('Error loading borrows:', error);
      showToast('error', 'Failed to load borrow history');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleToastClose = () => {
    setToastMessage(null);
  };



  const formatExactDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    // Use start of current day for consistency with backend
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const due = new Date(dueDate);
    const diffTime = due.getTime() - startOfToday.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysOverdue = (dueDate: string, returnDate?: string) => {
    if (returnDate) return 0; // Already returned

    // Use start of current day for consistency with backend
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const due = new Date(dueDate);
    const diffTime = startOfToday.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getStatusBadge = (borrow: BorrowHistory) => {
    const daysUntilDue = getDaysUntilDue(borrow.dueDate);
    const daysOverdue = getDaysOverdue(borrow.dueDate, borrow.returnedAt);

    // Priority: LOST > DAMAGED > LATE_RETURNED > RETURNED > OVERDUE > DUE SOON
    const baseStyle = {
      fontWeight: '600' as const,
      padding: '12px 20px',
      borderRadius: '25px',
      fontSize: '0.9em',
      display: 'inline-flex' as const,
      alignItems: 'center' as const,
      gap: '5px',
      whiteSpace: 'nowrap' as const,
      minWidth: '140px',
      justifyContent: 'center' as const,
    };

    if (borrow.status === 'LOST') {
      return (
        <span
          style={{
            ...baseStyle,
            color: '#7c2d12',
            backgroundColor: '#feefee',
            border: '1px solid #f44336',
          }}
        >
          ❌ LOST BOOK
        </span>
      );
    } else if (borrow.status === 'DAMAGED') {
      return (
        <span
          style={{
            ...baseStyle,
            color: '#e65100',
            backgroundColor: '#fff3e0',
            border: '1px solid #ff9800',
          }}
        >
          🔧 DAMAGED
        </span>
      );
    } else if (borrow.status === 'LATE_RETURNED') {
      return (
        <span
          style={{
            ...baseStyle,
            color: '#f57c00',
            backgroundColor: '#fff3e0',
            border: '1px solid #ff9800',
          }}
        >
          ⏰ LATE RETURN
        </span>
      );
    } else if (borrow.status === 'RETURNED') {
      return (
        <span
          style={{
            ...baseStyle,
            color: '#2e7d32',
            backgroundColor: '#e8f5e8',
            border: '1px solid #4caf50',
          }}
        >
          ✅ RETURNED
        </span>
      );
    } else if (daysOverdue > 0) {
      return (
        <span
          style={{
            ...baseStyle,
            color: '#c62828',
            backgroundColor: '#ffebee',
            border: '1px solid #f44336',
          }}
        >
          ⚠️ {daysOverdue} DAYS OVERDUE
        </span>
      );
    } else {
      return (
        <span
          style={{
            ...baseStyle,
            color: '#ff9800',
            backgroundColor: '#fff3e0',
            border: '1px solid #ff5722',
          }}
        >
          📅 {daysUntilDue > 0 ? `Due in ${daysUntilDue} days` : 'Due Today'}
        </span>
      );
    }
  };

  const handleReturnBook = async () => {
    if (!selectedBorrow) return;

    setReturningId(selectedBorrow.id);
    try {
      // Convert condition to backend flags
      const isDamaged = returnCondition === 'DAMAGED';
      const isLost = returnCondition === 'LOST';

      const returnPayload = {
        borrowRecordId: selectedBorrow.id,
        damaged: isDamaged,
        lost: isLost
      };

      console.log('📤 Return request payload:', returnPayload);
      const response = await client.post('/api/return', returnPayload);
      console.log('📥 Return response received:', response.data);

      showToast('success', 'Book returned successfully!');
      setShowReturnModal(false);
      setSelectedBorrow(null);
      setReturnCondition('GOOD');
      loadBorrows(); // Reload to get updated status
    } catch (error: unknown) {
      console.error('Error returning book:', error);
      showToast('error', 'Failed to return book');
    } finally {
      setReturningId(null);
    }
  };

  const openReturnModal = (borrow: BorrowHistory) => {
    setSelectedBorrow(borrow);
    setReturnCondition('GOOD');
    setShowReturnModal(true);
  };

  const filteredBorrows = borrows.filter(borrow => {
    if (activeTab === 'active') {
      return borrow.status === 'BORROWED';
    } else {
      return borrow.status !== 'BORROWED';
    }
  });

  // Stats calculation
  const activeBorrows = borrows.filter(b => b.status === 'BORROWED').length;
  const returnedBorrows = borrows.filter(b => b.status === 'RETURNED').length;
  const overdueBorrows = borrows.filter(b =>
    b.status === 'BORROWED' && getDaysOverdue(b.dueDate, b.returnedAt) > 0
  ).length;

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
            Loading your borrows...
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
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={handleToastClose}
        />
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
          📚 My Borrows
        </h1>
        <p
          style={{
            color: '#666',
            fontSize: '0.95rem',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          Track your borrowed books and return them on time
        </p>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{
          background: 'linear-gradient(135deg,#8B4513 0%,#654321 100%)',
          color: '#F4E4BC', padding: '16px', borderRadius: '8px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{activeBorrows}</div>
          <div>Active Borrows</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg,#9A5B34, #6B4423)',
          color: '#F4E4BC', padding: '16px', borderRadius: '8px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{returnedBorrows}</div>
          <div>Returned</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg,#D2691E, #A0522D)',
          color: '#F4E4BC', padding: '16px', borderRadius: '8px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{overdueBorrows}</div>
          <div>Overdue</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '0',
        marginBottom: '20px',
        border: '1px solid #E8D1A7',
        boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
        display: 'flex',
        overflow: 'hidden'
      }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            flex: 1,
            padding: '16px 20px',
            background: activeTab === 'active' ? '#E8D1A7' : 'transparent',
            color: activeTab === 'active' ? '#2A1F16' : '#666',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'active' ? '600' : '500',
            position: 'relative',
            transition: 'all 0.3s ease'
          }}
        >
          📖 Active Borrows
          {activeBorrows > 0 && (
            <span style={{
              background: '#dc3545',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              marginLeft: '8px'
            }}>
              {activeBorrows}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            flex: 1,
            padding: '16px 20px',
            background: activeTab === 'history' ? '#E8D1A7' : 'transparent',
            color: activeTab === 'history' ? '#2A1F16' : '#666',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: activeTab === 'history' ? '600' : '500',
            position: 'relative',
            transition: 'all 0.3s ease'
          }}
        >
          📚 History
        </button>
      </div>

      {/* Borrows Table */}
      {filteredBorrows.length === 0 ? (
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
            {activeTab === 'active' ? 'No Active Borrows' : 'No Borrow History'}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
            {activeTab === 'active'
              ? 'You currently have no books borrowed from the library.'
              : 'Your borrow history will appear here once you start borrowing books.'
            }
          </p>
        </div>
      ) : (
        <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
          {activeTab === 'active' ? (
            <>
              {/* Pagination Info for Active Borrows */}
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
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredBorrows.length)} to {Math.min(currentPage * itemsPerPage, filteredBorrows.length)} of {filteredBorrows.length} borrows
                </div>
                <div style={{ fontSize: '0.8rem' }}>
                  Page {currentPage} of {Math.ceil(filteredBorrows.length / itemsPerPage)}
                </div>
              </div>

              {/* Table Header for Active Borrows */}
              <div style={{
                background: '#f8f9fa',
                padding: '15px',
                borderBottom: '1px solid #eee',
                fontWeight: 'bold',
                color: '#2A1F16',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1.4fr 1.8fr',
                gap: '8px',
                alignItems: 'center'
              }}>
                <div>Book Name</div>
                <div>Author</div>
                <div>Genre</div>
                <div>MRP</div>
                <div>Borrowed</div>
                <div>Due Date</div>
                <div>Status</div>
                <div>Actions</div>
              </div>

              {/* Table Body for Active Borrows */}
              <div style={{ padding: '8px' }}>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {filteredBorrows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((borrow) => (
                    <div
                      key={borrow.id}
                      style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                        border: '1px solid #e9ecef',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1.4fr 1.8fr',
                        gap: '10px',
                        alignItems: 'center',
                        opacity: returningId === borrow.id ? 0.7 : 1,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: '600',
                          color: '#2A1F16',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer'
                        }}
                        title={borrow.bookTitle || 'N/A'}
                      >
                        {borrow.bookTitle || 'N/A'}
                      </div>

                      <div style={{ color: '#6c757d', fontSize: '0.9rem', wordWrap: 'break-word', maxHeight: '3em', overflowY: 'auto' }}>
                        {borrow.bookAuthor || 'N/A'}
                      </div>

                      <div style={{ color: '#6c757d', fontSize: '0.8rem', wordWrap: 'break-word', maxHeight: '3em', overflowY: 'auto' }}>
                        {borrow.bookGenre || 'N/A'}
                      </div>

                      <div style={{ fontWeight: '600', color: '#2A1F16', fontSize: '0.9rem' }}>
                        ₹{(borrow.bookMrp || 0).toFixed(2)}
                      </div>

                      <div style={{ color: '#495057', fontSize: '0.9rem' }}>
                        {formatExactDate(borrow.borrowedAt)}
                      </div>

                      <div style={{ color: '#495057', fontSize: '0.9rem' }}>
                        {formatExactDate(borrow.dueDate)}
                      </div>

                      <div style={{ height: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        {getStatusBadge(borrow)}
                        {getDaysOverdue(borrow.dueDate, borrow.returnedAt) > 30 && (
                          <div style={{ fontSize: '0.65rem', color: '#c62828', marginTop: '2px', textAlign: 'center' }}>
                            Contact librarian
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => openReturnModal(borrow)}
                          disabled={getDaysOverdue(borrow.dueDate, borrow.returnedAt) > 30}
                          style={{
                            background: '#965425ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 16px',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            cursor: getDaysOverdue(borrow.dueDate, borrow.returnedAt) > 30 ? 'not-allowed' : 'pointer',
                            opacity: getDaysOverdue(borrow.dueDate, borrow.returnedAt) > 30 ? 0.5 : 1,
                            minWidth: '80px',
                          }}
                        >
                          🔄 Return
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls for Active Borrows */}
                {filteredBorrows.length > 0 && (
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
                    {Array.from({ length: Math.min(Math.ceil(filteredBorrows.length / itemsPerPage), 5) }, (_, i) => {
                      const page = Math.max(1, Math.min(Math.ceil(filteredBorrows.length / itemsPerPage) - 4, currentPage - 2)) + i;
                      if (page > Math.ceil(filteredBorrows.length / itemsPerPage)) return null;
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
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredBorrows.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(filteredBorrows.length / itemsPerPage)}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        background: currentPage === Math.ceil(filteredBorrows.length / itemsPerPage) ? '#f8f9fa' : 'white',
                        color: currentPage === Math.ceil(filteredBorrows.length / itemsPerPage) ? '#6c757d' : '#2A1F16',
                        cursor: currentPage === Math.ceil(filteredBorrows.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Pagination Info for History */}
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
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredBorrows.length)} to {Math.min(currentPage * itemsPerPage, filteredBorrows.length)} of {filteredBorrows.length} borrows
                </div>
                <div style={{ fontSize: '0.8rem' }}>
                  Page {currentPage} of {Math.ceil(filteredBorrows.length / itemsPerPage)}
                </div>
              </div>

              {/* Table Header for History */}
              <div style={{
                background: '#f8f9fa',
                padding: '15px',
                borderBottom: '1px solid #eee',
                fontWeight: 'bold',
                color: '#2A1F16',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr',
                gap: '8px',
                alignItems: 'center'
              }}>
                <div>Book Name</div>
                <div>Author</div>
                <div>Genre</div>
                <div>MRP</div>
                <div>Borrowed</div>
                <div>Returned</div>
                <div>Fine</div>
                <div>Status</div>
              </div>

              {/* Table Body for History */}
              <div style={{ padding: '8px' }}>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {filteredBorrows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((borrow) => (
                    <div
                      key={borrow.id}
                      style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                        border: '1px solid #e9ecef',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr',
                        gap: '10px',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ fontWeight: '600', color: '#2A1F16', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {borrow.bookTitle || 'N/A'}
                      </div>

                      <div style={{ color: '#6c757d', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {borrow.bookAuthor || 'N/A'}
                      </div>

                      <div style={{ color: '#6c757d', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {borrow.bookGenre || 'N/A'}
                      </div>

                      <div style={{ fontWeight: '600', color: '#2A1F16', fontSize: '0.9rem' }}>
                        ₹{(borrow.bookMrp || 0).toFixed(2)}
                      </div>

                      <div style={{ color: '#495057', fontSize: '0.9rem' }}>
                        {formatExactDate(borrow.borrowedAt)}
                      </div>

                      <div style={{ color: '#495057', fontSize: '0.9rem' }}>
                        {borrow.returnedAt ? formatExactDate(borrow.returnedAt) : 'Not returned'}
                      </div>

                      <div style={{ fontWeight: '600', color: '#2A1F16', fontSize: '0.9rem' }}>
                        {borrow.penaltyAmount && borrow.penaltyAmount > 0 ? `₹${borrow.penaltyAmount.toFixed(2)}` : '₹0.00'}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        {getStatusBadge(borrow)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls for History */}
                {filteredBorrows.length > 0 && (
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
                    {Array.from({ length: Math.min(Math.ceil(filteredBorrows.length / itemsPerPage), 5) }, (_, i) => {
                      const page = Math.max(1, Math.min(Math.ceil(filteredBorrows.length / itemsPerPage) - 4, currentPage - 2)) + i;
                      if (page > Math.ceil(filteredBorrows.length / itemsPerPage)) return null;
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
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredBorrows.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(filteredBorrows.length / itemsPerPage)}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        background: currentPage === Math.ceil(filteredBorrows.length / itemsPerPage) ? '#f8f9fa' : 'white',
                        color: currentPage === Math.ceil(filteredBorrows.length / itemsPerPage) ? '#6c757d' : '#2A1F16',
                        cursor: currentPage === Math.ceil(filteredBorrows.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedBorrow && (
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
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📖</div>
                <h2 style={{ color: '#2A1F16', margin: '0 0 10px 0' }}>Return Book</h2>
                <h3 style={{ color: '#2A1F16', fontSize: '1.2rem', margin: '0 0 5px 0' }}>
                  {selectedBorrow.bookTitle || 'N/A'}
                </h3>
                <p style={{ color: '#6c757d', margin: 0 }}>
                  by {selectedBorrow.bookAuthor || 'N/A'}
                </p>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ color: '#2A1F16', marginBottom: '15px' }}>Book Condition:</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {[
                    { value: 'GOOD', label: 'Good condition', desc: 'Book is in excellent condition' },
                    { value: 'DAMAGED', label: 'Damaged', desc: 'Book has minor damage (scratches, stains, etc.)' },
                    { value: 'LOST', label: 'Lost/Destroyed', desc: 'Book is lost or severely damaged' }
                  ].map(option => (
                    <label
                      key={option.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        border: `2px solid ${returnCondition === option.value ? '#007bff' : '#ddd'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: returnCondition === option.value ? '#e3f2fd' : 'white'
                      }}
                    >
                      <input
                        type="radio"
                        value={option.value}
                        checked={returnCondition === option.value}
                        onChange={(e) => setReturnCondition(e.target.value as 'GOOD' | 'DAMAGED' | 'LOST')}
                        style={{ marginRight: '12px' }}
                      />
                      <div>
                        <div style={{ fontWeight: '600', color: '#2A1F16' }}>{option.label}</div>
                        <div style={{ fontSize: '0.9rem', color: '#666' }}>{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setShowReturnModal(false);
                    setSelectedBorrow(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    opacity: returningId === selectedBorrow.id ? 0.6 : 1,
                  }}
                  disabled={returningId === selectedBorrow.id}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReturnBook}
                  disabled={returningId === selectedBorrow.id}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: returningId === selectedBorrow.id ? 'not-allowed' : 'pointer',
                    opacity: returningId === selectedBorrow.id ? 0.6 : 1,
                  }}
                >
                  {returningId === selectedBorrow.id ? '⏳ Returning...' : '✅ Confirm Return'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentBorrows;
