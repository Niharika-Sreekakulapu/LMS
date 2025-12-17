import React, { useState, useEffect } from 'react';
import { getAllBorrowRecords, processReturn } from '../../api/libraryApi';
import type { BorrowHistory } from '../../types/dto';

function ReturnsPage() {
  const [borrows, setBorrows] = useState<BorrowHistory[]>([]);
  const [returnedBooks, setReturnedBooks] = useState<BorrowHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingReturn, setProcessingReturn] = useState<number | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedBorrow, setSelectedBorrow] = useState<BorrowHistory | null>(null);
  const [returnCondition, setReturnCondition] = useState<'GOOD' | 'DAMAGED' | 'LOST'>('GOOD');
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'ACTIVE'>('ALL');

  useEffect(() => {
    loadBorrows();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadBorrows, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadBorrows = async () => {
    try {
      setLoading(true);
      // Get all borrow records (admin view) - we'll filter for BORROWED status
      const response = await getAllBorrowRecords({
        status: 'BORROWED', // Only active (not yet returned) books
        page: 0, // We'll do client-side pagination for now
        size: 1000 // Get a large set, could be paginated from backend later
      });
      setBorrows(response.data);
    } catch (error) {
      console.error('Error loading borrow records:', error);
      showToast('error', 'Failed to load borrow records');
    } finally {
      setLoading(false);
    }
  };

  const loadReturnHistory = async () => {
    try {
      // Get all borrow records and filter for returned ones
      const response = await getAllBorrowRecords({
        page: 0,
        size: 1000 // Get a large set for history view
      });

      // Filter for returned books (those with a returnedAt date)
      const returnedBooks = response.data.filter((borrow: BorrowHistory) =>
        borrow.returnedAt && borrow.returnedAt.trim() !== ''
      );

      setReturnedBooks(returnedBooks);
    } catch (error) {
      console.error('Error loading return history:', error);
      showToast('error', 'Failed to load return history');
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const formatExactDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getStatusBadge = (borrow: BorrowHistory) => {
    const daysOverdue = getDaysOverdue(borrow.dueDate);

    if (daysOverdue > 0) {
      return (
        <span
          style={{
            color: '#c62828',
            fontWeight: '600',
            backgroundColor: '#ffebee',
            border: '1px solid #f44336',
            padding: '8px 16px',
            borderRadius: '25px',
            fontSize: '0.85em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
          }}
        >
          {daysOverdue} DAYS OVERDUE
        </span>
      );
    } else {
      const daysUntilDue = getDaysUntilDue(borrow.dueDate);
      return (
        <span
          style={{
            color: '#ff9800',
            fontWeight: '600',
            backgroundColor: '#fff3e0',
            border: '1px solid #ff5722',
            padding: '8px 16px',
            borderRadius: '25px',
            fontSize: '0.85em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
          }}
        >
          {daysUntilDue > 0 ? `Due in ${daysUntilDue} days` : 'Due Today'}
        </span>
      );
    }
  };

  const handleReturnBook = async () => {
    if (!selectedBorrow) return;

    setProcessingReturn(selectedBorrow.id);
    try {
      // Convert condition to backend flags
      const isDamaged = returnCondition === 'DAMAGED';
      const isLost = returnCondition === 'LOST';

      await processReturn(selectedBorrow.id, {
        damaged: isDamaged,
        lost: isLost
      });

      showToast('success', 'Book return processed successfully!');
      setShowReturnModal(false);
      setSelectedBorrow(null);
      setReturnCondition('GOOD');
      loadBorrows(); // Reload to update the list
    } catch (error: unknown) {
      console.error('Error processing return:', error);
      showToast('error', 'Failed to process return');
    } finally {
      setProcessingReturn(null);
    }
  };

  const openReturnModal = (borrow: BorrowHistory) => {
    setSelectedBorrow(borrow);
    setReturnCondition('GOOD');
    setShowReturnModal(true);
  };

  // Filter borrows based on search and status
  const filteredBorrows = borrows.filter(borrow => {
    // Search filter
    const lowerSearch = searchTerm.toLowerCase();
    const searchMatch = !searchTerm ||
      borrow.bookTitle?.toLowerCase().includes(lowerSearch) ||
      borrow.studentName?.toLowerCase().includes(lowerSearch) ||
      borrow.bookAuthor?.toLowerCase().includes(lowerSearch);

    // Status filter
    let statusMatch = true;
    if (statusFilter === 'OVERDUE') {
      statusMatch = getDaysOverdue(borrow.dueDate) > 0;
    } else if (statusFilter === 'ACTIVE') {
      statusMatch = getDaysOverdue(borrow.dueDate) === 0;
    }

    return searchMatch && statusMatch;
  });

  // Statistics calculation
  const totalBorrows = filteredBorrows.length;
  const overdueBorrows = filteredBorrows.filter(b => getDaysOverdue(b.dueDate) > 0).length;
  const dueTodayBorrows = filteredBorrows.filter(b => getDaysUntilDue(b.dueDate) === 0).length;
  const dueSoonBorrows = filteredBorrows.filter(b => {
    const daysUntilDue = getDaysUntilDue(b.dueDate);
    return daysUntilDue > 0 && daysUntilDue <= 3;
  }).length;

  // Filter returned books for history tab
  const filteredReturnedBooks = returnedBooks.filter(book => {
    // Search filter
    const lowerSearch = searchTerm.toLowerCase();
    const searchMatch = !searchTerm ||
      book.bookTitle?.toLowerCase().includes(lowerSearch) ||
      book.studentName?.toLowerCase().includes(lowerSearch) ||
      book.bookAuthor?.toLowerCase().includes(lowerSearch);

    return searchMatch;
  });

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          background: '#F9F6F0',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
          <div style={{ fontSize: '1.2rem', color: '#2A1F16' }}>
            Loading borrow records...
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
          📚 Returns Management
        </h1>
        <p
          style={{
            color: '#666',
            fontSize: '0.95rem',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          Process book returns and manage overdue items
        </p>
      </div>

      {/* Stats Summary with Brown Theme - shows different stats based on active tab */}
      {(activeTab === 'active' || activeTab === 'history') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {activeTab === 'active' ? (
            <>
              <div style={{
                background: 'linear-gradient(135deg,#8B4513 0%,#654321 100%)',
                color: '#F4E4BC', padding: '16px', borderRadius: '8px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{totalBorrows}</div>
                <div>Total Active</div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg,#9A5B34, #6B4423)',
                color: '#F4E4BC', padding: '16px', borderRadius: '8px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{overdueBorrows}</div>
                <div>Overdue</div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg,#D2691E, #A0522D)',
                color: '#F4E4BC', padding: '16px', borderRadius: '8px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{dueTodayBorrows}</div>
                <div>Due Today</div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg,#E8D1A7, #CDA776)',
                color: '#2A1F16', padding: '16px', borderRadius: '8px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{dueSoonBorrows}</div>
                <div>Due Soon</div>
              </div>
            </>
          ) : (
            <>
              <div style={{
                background: 'linear-gradient(135deg,#28a745 0%,#20c997 100%)',
                color: 'white', padding: '16px', borderRadius: '8px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>
                  {(() => {
                    const goodReturns = returnedBooks.filter(b => b.status !== 'LOST' && b.status !== 'DAMAGED').length;
                    return goodReturns;
                  })()}
                </div>
                <div>Good Returns</div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)',
                color: 'white', padding: '16px', borderRadius: '8px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>
                  {returnedBooks.filter(b => b.status === 'LATE_RETURNED').length}
                </div>
                <div>Late Returns</div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg,#dc2626 0%,#b91c1c 100%)',
                color: 'white', padding: '16px', borderRadius: '8px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>
                  {returnedBooks.filter(b => b.status === 'DAMAGED').length}
                </div>
                <div>Damaged Books</div>
              </div>
              <div style={{
                background: 'linear-gradient(135deg,#7c2d12 0%,#991b1b 100%)',
                color: 'white', padding: '16px', borderRadius: '8px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>
                  {returnedBooks.filter(b => b.status === 'LOST').length}
                </div>
                <div>Lost Books</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab Navigation - moved below stats */}
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
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          📋 Active Returns
          {filteredBorrows.length > 0 && (
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
              fontWeight: '600'
            }}>
              {filteredBorrows.length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('history');
            if (returnedBooks.length === 0) {
              loadReturnHistory();
            }
          }}
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
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          📚 Return History
        </button>
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
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'OVERDUE' | 'ACTIVE')}
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
              <option value="ALL">📊 All Active</option>
              <option value="OVERDUE">⚠️ Overdue</option>
              <option value="ACTIVE">📖 Active</option>
            </select>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by book, student, author..."
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

          {/* Clear Filters Button */}
          {searchTerm || statusFilter !== 'ALL' ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
              }}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'history' ? (
        // Return History Table
        <>
          {/* History Table */}
          {filteredReturnedBooks.length === 0 ? (
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
                {searchTerm ? `No results found for "${searchTerm}"` : 'No Return History'}
              </h3>
              <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                {searchTerm ? 'Try adjusting your search criteria.' : 'No books have been returned yet. Return history will appear here.'}
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
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredReturnedBooks.length)} to {Math.min(currentPage * itemsPerPage, filteredReturnedBooks.length)} of {filteredReturnedBooks.length} returned books
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    Page {currentPage} of {Math.ceil(filteredReturnedBooks.length / itemsPerPage)}
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        📖 Book Title
                      </th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        👤 Student
                      </th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        ✍️ Author
                      </th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        📅 Borrowed
                      </th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        📅 Returned
                      </th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        ⌛ Days Borrowed
                      </th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        📊 Return Status
                      </th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        💰 Penalty
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReturnedBooks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((book) => {
                      // Calculate days borrowed
                      const borrowedDate = new Date(book.borrowedAt);
                      const returnedDate = book.returnedAt ? new Date(book.returnedAt) : new Date();
                      const daysBorrowed = Math.ceil((returnedDate.getTime() - borrowedDate.getTime()) / (1000 * 60 * 60 * 24));

                      // Penalty value
                      const penaltyValue = book.penaltyAmount && typeof book.penaltyAmount === 'number' ? book.penaltyAmount : 0;

                      return (
                        <tr key={book.id} style={{ borderBottom: '1px solid #e9ecef', background: 'white' }}>
                          <td style={{ padding: '12px 8px', minWidth: '180px' }}>
                            <div style={{ fontWeight: '600', color: '#2A1F16' }}>
                              {book.bookTitle || 'N/A'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', minWidth: '150px' }}>
                            <div style={{ fontWeight: '600', color: '#2A1F16' }}>
                              {book.studentName || 'N/A'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', minWidth: '150px' }}>
                            <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                              {book.bookAuthor || 'N/A'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center', minWidth: '120px' }}>
                            <div style={{ color: '#495057', fontSize: '0.9rem' }}>
                              {formatExactDate(book.borrowedAt)}
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center', minWidth: '120px' }}>
                            <div style={{ color: '#495057', fontSize: '0.9rem' }}>
                              {book.returnedAt ? formatExactDate(book.returnedAt) : 'N/A'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center', minWidth: '100px' }}>
                            <div style={{ color: '#495057', fontSize: '0.9rem', fontWeight: '600' }}>
                              {daysBorrowed} days
                            </div>
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center', minWidth: '150px' }}>
                            {(() => {
                              switch (book.status) {
                                case 'LOST':
                                  return (
                                    <span style={{
                                      color: '#7c2d12',
                                      fontWeight: '600',
                                      backgroundColor: '#feefee',
                                      border: '1px solid #f44336',
                                      padding: '6px 12px',
                                      borderRadius: '25px',
                                      fontSize: '0.8rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                    }}>
                                      ❌ LOST BOOK
                                    </span>
                                  );
                                case 'DAMAGED':
                                  return (
                                    <span style={{
                                      color: '#e65100',
                                      fontWeight: '600',
                                      backgroundColor: '#fff3e0',
                                      border: '1px solid #ff9800',
                                      padding: '6px 12px',
                                      borderRadius: '25px',
                                      fontSize: '0.8rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                    }}>
                                      ⚠️ DAMAGED
                                    </span>
                                  );
                                case 'LATE_RETURNED':
                                  return (
                                    <span style={{
                                      color: '#f57c00',
                                      fontWeight: '600',
                                      backgroundColor: '#fff3e0',
                                      border: '1px solid #ff9800',
                                      padding: '6px 12px',
                                      borderRadius: '25px',
                                      fontSize: '0.8rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                    }}>
                                      ⏰ LATE RETURN
                                    </span>
                                  );
                                default:
                                  return (
                                    <span style={{
                                      color: '#2e7d32',
                                      fontWeight: '600',
                                      backgroundColor: '#e8f5e8',
                                      border: '1px solid #4caf50',
                                      padding: '6px 12px',
                                      borderRadius: '25px',
                                      fontSize: '0.8rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                    }}>
                                      GOOD RETURN
                                    </span>
                                  );
                              }
                            })()}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center', minWidth: '100px' }}>
                            {penaltyValue > 0 ? (
                              <span style={{ color: '#e65100', fontWeight: '600' }}>
                                ₹{penaltyValue}
                              </span>
                            ) : (
                              <span style={{ color: '#28a745' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination Controls for History */}
                {filteredReturnedBooks.length > itemsPerPage && (
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
                    {Array.from({ length: Math.min(Math.ceil(filteredReturnedBooks.length / itemsPerPage), 5) }, (_, i) => {
                      const page = Math.max(1, Math.min(Math.ceil(filteredReturnedBooks.length / itemsPerPage) - 4, currentPage - 2)) + i;
                      if (page > Math.ceil(filteredReturnedBooks.length / itemsPerPage)) return null;
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
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredReturnedBooks.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(filteredReturnedBooks.length / itemsPerPage)}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        background: currentPage === Math.ceil(filteredReturnedBooks.length / itemsPerPage) ? '#f8f9fa' : 'white',
                        color: currentPage === Math.ceil(filteredReturnedBooks.length / itemsPerPage) ? '#6c757d' : '#2A1F16',
                        cursor: currentPage === Math.ceil(filteredReturnedBooks.length / itemsPerPage) ? 'not-allowed' : 'pointer',
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
        </>
      ) : (
        // Active Returns Table (existing)
        <>
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
                {searchTerm ? `No results found for "${searchTerm}"` : 'No Outstanding Returns'}
              </h3>
              <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                {searchTerm ? 'Try adjusting your search criteria.' : 'All books have been returned to the library.'}
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
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredBorrows.length)} to {Math.min(currentPage * itemsPerPage, filteredBorrows.length)} of {filteredBorrows.length} outstanding returns
                  </div>
                  <div style={{ fontSize: '0.8rem' }}>
                    Page {currentPage} of {Math.ceil(filteredBorrows.length / itemsPerPage)}
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        Book Title
                      </th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        Student
                      </th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        Author
                      </th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        Borrowed Date
                      </th>
                      <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        Due Date
                      </th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        Status
                      </th>
                      <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: '#2A1F16', fontSize: '0.85rem' }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBorrows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((borrow) => (
                      <tr
                        key={borrow.id}
                        style={{
                          borderBottom: '1px solid #e9ecef',
                          background: processingReturn === borrow.id ? '#fff3cd' : 'white',
                        }}
                      >
                        <td style={{ padding: '12px 8px', minWidth: '180px' }}>
                          <div style={{ fontWeight: '600', color: '#2A1F16' }}>
                            {borrow.bookTitle || 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', minWidth: '150px' }}>
                          <div style={{ fontWeight: '600', color: '#2A1F16' }}>
                            {borrow.studentName || 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', minWidth: '150px' }}>
                          <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
                            {borrow.bookAuthor || 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', minWidth: '120px' }}>
                          <div style={{ color: '#495057', fontSize: '0.9rem' }}>
                            {formatExactDate(borrow.borrowedAt)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', minWidth: '120px' }}>
                          <div style={{ color: '#495057', fontSize: '0.9rem' }}>
                            {formatExactDate(borrow.dueDate)}
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', minWidth: '150px' }}>
                          {getStatusBadge(borrow)}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center', minWidth: '100px' }}>
                          <button
                            onClick={() => openReturnModal(borrow)}
                            disabled={processingReturn === borrow.id}
                            style={{
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 16px',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              cursor: processingReturn === borrow.id ? 'not-allowed' : 'pointer',
                              opacity: processingReturn === borrow.id ? 0.6 : 1,
                            }}
                          >
                            {processingReturn === borrow.id ? '🔄 Processing...' : '✅ Return'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {filteredBorrows.length > itemsPerPage && (
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
            </div>
          )}
        </>
      )}

      {/* Return Processing Modal */}
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
                <h2 style={{ color: '#2A1F16', margin: '0 0 10px 0' }}>Process Book Return</h2>
                <h3 style={{ color: '#2A1F16', fontSize: '1.2rem', margin: '0 0 5px 0' }}>
                  {selectedBorrow.bookTitle || 'N/A'}
                </h3>
                <p style={{ color: '#6c757d', margin: 0 }}>
                  by {selectedBorrow.bookAuthor || 'N/A'} • Student: {selectedBorrow.studentName || 'N/A'}
                </p>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ color: '#2A1F16', marginBottom: '15px' }}>Book Return Condition:</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {[
                    { value: 'GOOD', label: 'Good condition', desc: 'Book is returned in excellent condition' },
                    { value: 'DAMAGED', label: 'Damaged', desc: 'Book has minor damage (scratches, stains, etc.)' },
                    { value: 'LOST', label: 'Lost/Destroyed', desc: 'Book is lost or severely damaged' }
                  ].map(option => (
                    <label
                      key={option.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        border: `2px solid ${returnCondition === option.value ? '#8B4513' : '#ddd'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: returnCondition === option.value ? '#f8f9fa' : 'white'
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
                    opacity: processingReturn === selectedBorrow.id ? 0.6 : 1,
                  }}
                  disabled={processingReturn === selectedBorrow.id}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReturnBook}
                  disabled={processingReturn === selectedBorrow.id}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: processingReturn === selectedBorrow.id ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: processingReturn === selectedBorrow.id ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                  }}
                >
                  {processingReturn === selectedBorrow.id ? '🔄 Processing...' : '✅ Confirm Return'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ReturnsPage;
