import React, { useState, useEffect } from 'react';
import { getAllBorrowRecords } from '../../api/libraryApi';
import type { BorrowHistory } from '../../types/dto';

const Penalty: React.FC = () => {
  const [transactions, setTransactions] = useState<BorrowHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'OVERDUE' | 'LOST' | 'ALL'>('ALL');
  const [selectedTransaction, setSelectedTransaction] = useState<BorrowHistory | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'collect' | 'waive' | 'mark_returned' | 'mark_paid'>('collect');
  const [paymentAmount, setPaymentAmount] = useState('');

  // Tab and Pagination state
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeSort, setActiveSort] = useState<'dueDate_desc' | 'dueDate_asc' | 'fine_desc' | 'fine_asc'>('dueDate_desc');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      // Get all borrow records (same as Returns page) - we'll filter for penalty cases on frontend
      const response = await getAllBorrowRecords({
        page: 0,
        size: 1000 // Get a large set, use frontend pagination
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setTransactions(data);
    } catch (error) {
      console.error('Error loading borrow records for penalties:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Filter transactions with penalties or fine situations
  const penaltyTransactions = transactions.filter((transaction) => {
    // Check if book is overdue (not returned and past due date)
    const isOverdue = !transaction.returnedAt && new Date(transaction.dueDate) < new Date();
    const isLost = transaction.status === 'LOST';

    if (statusFilter === 'ALL') {
      return isOverdue || isLost;
    }
    return (
      (statusFilter === 'OVERDUE' && isOverdue) ||
      (statusFilter === 'LOST' && isLost)
    );
  });

  const filteredPenalties = penaltyTransactions.filter((transaction) => {
    const lowerSearch = searchTerm.toLowerCase();
    return (
      !searchTerm ||
      transaction.bookTitle?.toLowerCase().includes(lowerSearch) ||
      transaction.studentName?.toLowerCase().includes(lowerSearch) ||
      transaction.bookAuthor?.toLowerCase().includes(lowerSearch)
    );
  });

  const getOverdueDays = (dueDate: string, returnedAt?: string) => {
    const due = new Date(dueDate);
    const reference = returnedAt ? new Date(returnedAt) : new Date();
    const diffTime = reference.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const calculateOverdueFine = (overdueDays: number, bookMrp?: number) => {
    // Penalty is 10% of MRP per day overdue
    if (!bookMrp || bookMrp <= 0) {
      return 0; // No fine if no MRP available
    }
    // Calculate 10% of MRP per day
    const dailyFine = bookMrp * 0.1;
    return Math.max(0, overdueDays * dailyFine);
  };

  const getStatusBadge = (transaction: BorrowHistory) => {
    const isOverdue = !transaction.returnedAt && new Date(transaction.dueDate) < new Date();
    const overdueDays = isOverdue ? getOverdueDays(transaction.dueDate) : 0;

    if (transaction.status === 'LOST') {
      return (
        <span
          style={{
            color: '#d32f2f',
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
          ❌ LOST
        </span>
      );
    } else if (overdueDays > 0) {
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
            boxShadow: '0 2px 8px rgba(244, 67, 54, 0.15)',
          }}
        >
          ⚠️ OVERDUE ({overdueDays} days)
        </span>
      );
    }
    return null;
  };

  const handleAction = (transaction: BorrowHistory, action: 'collect' | 'waive' | 'mark_returned' | 'mark_paid') => {
    setSelectedTransaction(transaction);
    setActionType(action);
    if (action === 'mark_paid') {
      const isOverdue = !transaction.returnedAt && new Date(transaction.dueDate) < new Date();
      const overdueDays = getOverdueDays(transaction.dueDate);
      const overdueFine = isOverdue ? calculateOverdueFine(overdueDays, transaction.bookMrp) : 0;
      setPaymentAmount(overdueFine.toString());
    }
    setShowActionModal(true);
  };

  const processAction = async () => {
    if (!selectedTransaction) return;

    // TODO: Implement actual API calls for these actions
    switch (actionType) {
      case 'collect': {
        const isOverdue = !selectedTransaction.returnedAt && new Date(selectedTransaction.dueDate) < new Date();
        const overdueDays = getOverdueDays(selectedTransaction.dueDate);
        const overdueFine = isOverdue ? calculateOverdueFine(overdueDays, selectedTransaction.bookMrp) : 0;
        alert(`${formatCurrency(overdueFine)} collected from ${selectedTransaction.studentName}`);
        break;
      }
      case 'mark_paid': {
        const paymentAmt = parseFloat(paymentAmount) || 0;
        alert(`₹${paymentAmt} marked as paid for ${selectedTransaction.bookTitle}`);
        break;
      }
      case 'waive': {
        alert(`Fine waived for ${selectedTransaction.bookTitle}`);
        break;
      }
      case 'mark_returned': {
        alert(`${selectedTransaction.bookTitle} marked as returned`);
        break;
      }
    }

    setShowActionModal(false);
    setSelectedTransaction(null);
    setPaymentAmount('');
    loadTransactions(); // Refresh the list
  };

  const getTotalOutstandingFines = () => {
    return filteredPenalties.reduce((total, transaction) => {
      const isOverdue = !transaction.returnedAt && new Date(transaction.dueDate) < new Date();
      const overdueDays = getOverdueDays(transaction.dueDate);
      const overdueFine = isOverdue ? calculateOverdueFine(overdueDays, transaction.bookMrp) : 0;
      return total + overdueFine;
    }, 0);
  };

  // Create fines history - includes all fines (both active and historical)
  const allFineHistory = transactions.filter((transaction) => {
    // Books that were returned overdue, or currently overdue, or lost
    const wasOverdue = transaction.returnedAt && new Date(transaction.dueDate) < new Date(transaction.returnedAt);
    const isCurrentlyOverdue = !transaction.returnedAt && new Date(transaction.dueDate) < new Date();
    const isLost = transaction.status === 'LOST';

    return wasOverdue || isCurrentlyOverdue || isLost;
  });

  // Filtered and sorted fines history
  const filteredFinesHistory = allFineHistory
    .filter((transaction) => {
      const lowerSearch = searchTerm.toLowerCase();
      return (
        !searchTerm ||
        transaction.bookTitle?.toLowerCase().includes(lowerSearch) ||
        transaction.studentName?.toLowerCase().includes(lowerSearch) ||
        transaction.bookAuthor?.toLowerCase().includes(lowerSearch)
      );
    })
    .filter((transaction) => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'OVERDUE') {
        return !transaction.returnedAt && new Date(transaction.dueDate) < new Date();
      }
      return transaction.status === 'LOST';
    })
    .sort((a, b) => {
      switch (activeSort) {
        case 'dueDate_desc':
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        case 'dueDate_asc':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'fine_desc': {
          const aFine = calculateOverdueFine(getOverdueDays(a.dueDate, a.returnedAt), a.bookMrp);
          const bFine = calculateOverdueFine(getOverdueDays(b.dueDate, b.returnedAt), b.bookMrp);
          return bFine - aFine;
        }
        case 'fine_asc': {
          const aFine = calculateOverdueFine(getOverdueDays(a.dueDate, a.returnedAt), a.bookMrp);
          const bFine = calculateOverdueFine(getOverdueDays(b.dueDate, b.returnedAt), b.bookMrp);
          return aFine - bFine;
        }
        default:
          return 0;
      }
    });

  const getFineHistoryStatus = (transaction: BorrowHistory) => {
    const wasOverdue = transaction.returnedAt && new Date(transaction.dueDate) < new Date(transaction.returnedAt);
    const isCurrentlyOverdue = !transaction.returnedAt && new Date(transaction.dueDate) < new Date();
    const isLost = transaction.status === 'LOST';

    if (isLost) {
      return (
        <span style={{
          color: '#ff8f00',
          fontWeight: '600',
          backgroundColor: '#fff3e0',
          border: '1px solid #ffb74d',
          padding: '6px 14px',
          borderRadius: '25px',
          fontSize: '0.8em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          🏷️ BOOK LOST
        </span>
      );
    } else if (isCurrentlyOverdue) {
      return (
        <span style={{
          color: '#c62828',
          fontWeight: '600',
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          padding: '6px 14px',
          borderRadius: '25px',
          fontSize: '0.8em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          ⚠️ PENDING
        </span>
      );
    } else if (wasOverdue) {
      // Assuming fine was collected if returned late (in reality we'd have a status field)
      return (
        <span style={{
          color: '#2e7d32',
          fontWeight: '600',
          backgroundColor: '#e8f5e8',
          border: '1px solid #4caf50',
          padding: '6px 14px',
          borderRadius: '25px',
          fontSize: '0.8em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          ✅ COLLECTED
        </span>
      );
    }
    return null;
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
            Loading penalty records...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#F9F6F0',
        borderRadius: '8px',
        padding: '16px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header Section */}
      <div style={{ marginBottom: '20px' }}>
        <h1
          style={{
            color: '#2A1F16',
            margin: '0 0 8px 0',
            fontSize: '2rem',
            fontWeight: '700',
          }}
        >
          💰 Penalty & Fine Management
        </h1>
        <p
          style={{
            color: '#666',
            fontSize: '0.95rem',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          Manage fines, penalties, and outstanding charges for lost or overdue books
        </p>
      </div>

      {/* Statistics Dashboard - only show for active fines */}
      {activeTab === 'active' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg,#dc3545 0%,#b02a37 100%)',
              color: 'white',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 4px 15px rgba(220,53,69,0.3)',
            }}
          >
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                marginBottom: '8px',
              }}
            >
              {formatCurrency(getTotalOutstandingFines())}
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
              💵 Total Outstanding Fines
            </div>
          </div>

          <div
            style={{
              background: 'linear-gradient(135deg,#e65100 0%,#bf360c 100%)',
              color: 'white',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 4px 15px rgba(230,81,0,0.3)',
            }}
          >
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                marginBottom: '8px',
              }}
            >
              {filteredPenalties.filter((t) => !t.returnedAt && new Date(t.dueDate) < new Date()).length}
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>⚠️ Overdue Returns</div>
          </div>

          <div
            style={{
              background: 'linear-gradient(135deg,#424242 0%,#212121 100%)',
              color: 'white',
              padding: '20px',
              borderRadius: '12px',
              textAlign: 'center',
              boxShadow: '0 4px 15px rgba(66,66,66,0.3)',
            }}
          >
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                marginBottom: '8px',
              }}
            >
              {filteredPenalties.filter((t) => t.status === 'LOST').length}
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>❌ Lost Books</div>
          </div>
        </div>
      )}

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
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          💰 Active Fines
          {filteredPenalties.length > 0 && (
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
              {filteredPenalties.length}
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
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          📚 Fines History
          <span style={{
            background: activeTab === 'history' ? '#2A1F16' : '#999',
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
            {allFineHistory.length}
          </span>
        </button>
      </div>

      {/* Controls Section - only show for active fines */}
      {activeTab === 'active' && (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid #E8D1A7',
            boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '20px',
              alignItems: 'center',
            }}
          >
            {/* Filter Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: '#2A1F16',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                📋 Filter:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'OVERDUE' | 'LOST' | 'ALL')}
                style={{
                  padding: '10px 12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  background: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#2A1F16',
                  cursor: 'pointer',
                  minWidth: '160px',
                }}
              >
                <option value="ALL">🎯 All Penalties</option>
                <option value="OVERDUE">⚠️ Overdue</option>
                <option value="LOST">❌ Lost</option>
              </select>
            </div>

            {/* Search Control */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search books, members..."
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
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '12px',
                  color: '#999',
                  fontSize: '1rem',
                }}
              >
                🔍
              </span>
            </div>
          </div>

          {/* Results Summary */}
          <div
            style={{
              marginTop: '15px',
              padding: '10px',
              background: '#f8f9fa',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #e9ecef',
            }}
          >
            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#2A1F16',
              }}
            >
              📊 {filteredPenalties.length} penalty records • Total: {formatCurrency(getTotalOutstandingFines())}
            </span>
          </div>
        </div>
      )}

      {/* Fines History Controls */}
      {activeTab === 'history' && (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid #E8D1A7',
            boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '15px',
            }}
          >
            {/* Search Control for History */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search books, members..."
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
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '12px',
                  color: '#999',
                  fontSize: '1rem',
                }}
              >
                🔍
              </span>
            </div>

            {/* Status Filter for History */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: '#2A1F16',
                  whiteSpace: 'nowrap',
                }}
              >
                📊 Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'OVERDUE' | 'LOST' | 'ALL')}
                style={{
                  padding: '10px 12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  background: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#2A1F16',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                <option value="ALL">🎯 All Status</option>
                <option value="OVERDUE">⚠️ Pending</option>
                <option value="LOST">❌ Lost Book</option>
              </select>
            </div>

            {/* Sort By Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: '#2A1F16',
                  whiteSpace: 'nowrap',
                }}
              >
                🔄 Sort by:
              </span>
              <select
                value={activeSort}
                onChange={(e) => setActiveSort(e.target.value as 'dueDate_desc' | 'dueDate_asc' | 'fine_desc' | 'fine_asc')}
                style={{
                  padding: '10px 12px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  background: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#2A1F16',
                  cursor: 'pointer',
                  flex: 1,
                }}
              >
                <option value="dueDate_desc">📅 Recent First</option>
                <option value="dueDate_asc">📅 Oldest First</option>
                <option value="fine_desc">💰 Highest Fine</option>
                <option value="fine_asc">💰 Lowest Fine</option>
              </select>
            </div>
          </div>

          {/* Results Summary for History */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              padding: '15px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: '#1ccf90',
                  marginBottom: '4px',
                }}
              >
                {filteredFinesHistory.filter((t) => {
                  // Books that were returned overdue (collected) or were returned on time
                  const wasOverdue = t.returnedAt && new Date(t.dueDate) < new Date(t.returnedAt);
                  const returnedOnTime = t.returnedAt && new Date(t.dueDate) >= new Date(t.returnedAt);
                  return wasOverdue || returnedOnTime;
                }).length}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2A1F16' }}>
                ✅ Collected
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: '#c62828',
                  marginBottom: '4px',
                }}
              >
                {filteredFinesHistory.filter((t) => {
                  // Currently overdue books (not returned and past due date)
                  return !t.returnedAt && new Date(t.dueDate) < new Date();
                }).length}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2A1F16' }}>
                ⚠️ Pending
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: '#ff8f00',
                  marginBottom: '4px',
                }}
              >
                {filteredFinesHistory.filter((t) => {
                  // Lost books
                  return t.status === 'LOST';
                }).length}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2A1F16' }}>
                🏷️ Lost Books
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: '#2A1F16',
                  marginBottom: '4px',
                }}
              >
                {formatCurrency(filteredFinesHistory.reduce((total, t) => total + calculateOverdueFine(getOverdueDays(t.dueDate, t.returnedAt), t.bookMrp), 0))}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#2A1F16' }}>
                💵 Total Amount
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Fines Table */}
      {activeTab === 'active' && (
        <>
          {filteredPenalties.length === 0 ? (
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '60px 40px',
                textAlign: 'center',
                border: '2px solid #f8f9fa',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  fontSize: '4rem',
                  marginBottom: '20px',
                  opacity: '0.6',
                }}
              >
                💰
              </div>
              <h3
                style={{
                  color: '#2A1F16',
                  marginBottom: '12px',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                }}
              >
                No Outstanding Penalties
              </h3>
              <p
                style={{
                  color: '#6c757d',
                  fontSize: '1rem',
                  maxWidth: '350px',
                  margin: '0 auto',
                }}
              >
                All books are returned on time or penalties have been resolved.
              </p>
            </div>
          ) : (
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 15px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderBottom: '1px solid #e9ecef',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: '#2A1F16',
                }}
              >
                Active Penalty Records ({filteredPenalties.length})
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.95rem',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f1f3f4' }}>
                      <th style={{ padding: '15px 12px', textAlign: 'left', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Book Details</th>
                      <th style={{ padding: '15px 12px', textAlign: 'left', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Member</th>
                      <th style={{ padding: '15px 12px', textAlign: 'center', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Status</th>
                      <th style={{ padding: '15px 12px', textAlign: 'center', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Due Date</th>
                      <th style={{ padding: '15px 12px', textAlign: 'center', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Fine Amount</th>
                      <th style={{ padding: '15px 12px', textAlign: 'center', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPenalties.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((transaction, index) => {
                      const isOverdue = !transaction.returnedAt && new Date(transaction.dueDate) < new Date();
                      const overdueDays = getOverdueDays(transaction.dueDate);
                      // For overdue books that haven't been returned yet, calculate the fine
                      const overdueFine = isOverdue ? calculateOverdueFine(overdueDays, transaction.bookMrp) : 0;
                      const totalFine = overdueFine;

                      return (
                        <tr
                          key={transaction.id}
                          style={{
                            borderBottom: index < filteredPenalties.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length - 1 ? '1px solid #f1f3f4' : 'none',
                            backgroundColor: isOverdue
                              ? '#fff5f5'
                              : transaction.status === 'LOST'
                              ? '#fffbeb'
                              : 'transparent',
                          }}
                        >
                          {/* Book Details */}
                          <td style={{ padding: '20px 12px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '42px',
                                  backgroundColor: '#e9ecef',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.2rem',
                                }}
                              >
                                📖
                              </div>
                              <div>
                                <div style={{ fontWeight: '600', color: '#2A1F16', marginBottom: '4px' }}>
                                  {transaction.bookTitle || 'Unknown Book'}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '2px' }}>
                                  by {transaction.bookAuthor || 'Unknown Author'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#8e9093' }}>
                                  Student ID: {transaction.id || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Member */}
                          <td style={{ padding: '20px 12px', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: '600', color: '#2A1F16', marginBottom: '2px' }}>
                              {transaction.studentName || 'Unknown Member'}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                              Borrow ID: {transaction.id}
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '20px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                            {getStatusBadge(transaction)}
                          </td>

                          {/* Due Date */}
                          <td style={{ padding: '20px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: '600', color: '#2A1F16' }}>
                              {formatDateShort(transaction.dueDate)}
                            </div>
                            {isOverdue && (
                              <div style={{ fontSize: '0.8rem', color: '#dc3545', marginTop: '4px', fontWeight: '500' }}>
                                {overdueDays} days overdue
                              </div>
                            )}
                          </td>

                          {/* Fine Amount */}
                          <td style={{ padding: '20px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: '700', color: '#dc3545', fontSize: '1.1rem', marginBottom: '4px' }}>
                              {formatCurrency(totalFine)}
                            </div>
                            {totalFine > 0 && overdueFine > 0 && (
                              <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                                Overdue: {formatCurrency(overdueFine)}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '20px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <select
                                onChange={(e) => {
                                  const action = e.target.value as 'collect' | 'waive' | 'mark_returned' | 'mark_paid';
                                  if (action) {
                                    handleAction(transaction, action);
                                    e.target.value = ''; // Reset selection
                                  }
                                }}
                                style={{
                                  padding: '8px 12px',
                                  border: '2px solid #ddd',
                                  borderRadius: '6px',
                                  background: 'white',
                                  fontSize: '0.85rem',
                                  fontWeight: '500',
                                  color: '#2A1F16',
                                  cursor: 'pointer',
                                  minWidth: '120px',
                                  transition: 'border-color 0.2s',
                                }}
                                onMouseOver={(e) => (e.currentTarget.style.borderColor = '#E8D1A7')}
                                onMouseOut={(e) => (e.currentTarget.style.borderColor = '#ddd')}
                              >
                                <option value="">Select Action</option>
                                {totalFine > 0 && (
                                  <>
                                    <option value="collect">💰 Collect Fine</option>
                                    <option value="waive">🆓 Waive Fine</option>
                                    <option value="mark_paid">💳 Mark as Paid</option>
                                  </>
                                )}
                                {!transaction.returnedAt && (
                                  <option value="mark_returned">✅ Mark Returned</option>
                                )}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Fines History Table */}
      {activeTab === 'history' && (
        <>
          {allFineHistory.length === 0 ? (
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                padding: '60px 40px',
                textAlign: 'center',
                border: '2px solid #f8f9fa',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  fontSize: '4rem',
                  marginBottom: '20px',
                  opacity: '0.6',
                }}
              >
                📚
              </div>
              <h3
                style={{
                  color: '#2A1F16',
                  marginBottom: '12px',
                  fontSize: '1.5rem',
                  fontWeight: '600',
                }}
              >
                No Fine History Yet
              </h3>
              <p
                style={{
                  color: '#6c757d',
                  fontSize: '1rem',
                  maxWidth: '350px',
                  margin: '0 auto',
                }}
              >
                Fine history will appear here when fines are processed or collected.
              </p>
            </div>
          ) : (
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 15px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  background: '#f8f9fa',
                  padding: '20px',
                  borderBottom: '1px solid #e9ecef',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: '#2A1F16',
                }}
              >
                Fines History ({filteredFinesHistory.length})
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.95rem',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f1f3f4' }}>
                      <th style={{ padding: '15px 12px', textAlign: 'left', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Book Details</th>
                      <th style={{ padding: '15px 12px', textAlign: 'left', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Member</th>
                      <th style={{ padding: '15px 12px', textAlign: 'center', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Due Date</th>
                      <th style={{ padding: '15px 12px', textAlign: 'center', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Fine Amount</th>
                      <th style={{ padding: '15px 12px', textAlign: 'center', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Issue Date</th>
                      <th style={{ padding: '15px 12px', textAlign: 'center', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Return Date</th>
                      <th style={{ padding: '15px 12px', textAlign: 'center', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFinesHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((transaction, index) => {
                      const isCurrentlyOverdue = !transaction.returnedAt && new Date(transaction.dueDate) < new Date();
                      const overdueDays = getOverdueDays(transaction.dueDate, transaction.returnedAt);
                      const overdueFine = calculateOverdueFine(overdueDays, transaction.bookMrp);

                      return (
                        <tr
                          key={transaction.id}
                          style={{
                            borderBottom: index < allFineHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).length - 1 ? '1px solid #f1f3f4' : 'none',
                            backgroundColor: isCurrentlyOverdue ? '#fff5f5' : '#f8fffe',
                          }}
                        >
                          {/* Book Details */}
                          <td style={{ padding: '20px 12px', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '42px',
                                  backgroundColor: '#e9ecef',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '1.2rem',
                                }}
                              >
                                📖
                              </div>
                              <div>
                                <div style={{ fontWeight: '600', color: '#2A1F16', marginBottom: '4px' }}>
                                  {transaction.bookTitle || 'Unknown Book'}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#6c757d', marginBottom: '2px' }}>
                                  by {transaction.bookAuthor || 'Unknown Author'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#8e9093' }}>
                                  Student ID: {transaction.id || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Member */}
                          <td style={{ padding: '20px 12px', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: '600', color: '#2A1F16', marginBottom: '2px' }}>
                              {transaction.studentName || 'Unknown Member'}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                              Borrow ID: {transaction.id}
                            </div>
                          </td>

                          {/* Due Date */}
                          <td style={{ padding: '20px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: '600', color: '#2A1F16' }}>
                              {formatDateShort(transaction.dueDate)}
                            </div>
                            {overdueDays > 0 && (
                              <div style={{ fontSize: '0.8rem', color: '#dc3545', marginTop: '4px', fontWeight: '500' }}>
                                {overdueDays} days overdue
                              </div>
                            )}
                          </td>

                          {/* Fine Amount */}
                          <td style={{ padding: '20px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: '700', color: '#dc3545', fontSize: '1.1rem', marginBottom: '4px' }}>
                              {formatCurrency(overdueFine)}
                            </div>
                            {overdueFine > 0 && transaction.bookMrp && (
                              <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                                {formatCurrency(transaction.bookMrp * 0.1)}/day × {overdueDays} days
                              </div>
                            )}
                          </td>

                          {/* Issue Date (Due date context) */}
                          <td style={{ padding: '20px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: '600', color: '#2A1F16' }}>
                              {formatDateShort(transaction.dueDate)}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '4px' }}>
                              Due date
                            </div>
                          </td>

                          {/* Return Date */}
                          <td style={{ padding: '20px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: '600', color: '#2A1F16' }}>
                              {transaction.returnedAt ? formatDateShort(transaction.returnedAt) : 'Not returned'}
                            </div>
                            {!transaction.returnedAt && (
                              <div style={{ fontSize: '0.8rem', color: '#ff8f00', marginTop: '4px', fontWeight: '500' }}>
                                Still borrowed
                              </div>
                            )}
                          </td>

                          {/* Status (moved to last column) */}
                          <td style={{ padding: '20px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                            {getFineHistoryStatus(transaction)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Pagination for Active Fines */}
      {activeTab === 'active' && filteredPenalties.length > itemsPerPage && (
        <div
          style={{
            marginTop: '20px',
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
              const totalPages = Math.ceil(filteredPenalties.length / itemsPerPage);
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
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredPenalties.length / itemsPerPage), prev + 1))}
            disabled={currentPage === Math.ceil(filteredPenalties.length / itemsPerPage)}
            style={{
              padding: '8px 16px',
              border: '1px solid #dee2e6',
              backgroundColor: currentPage === Math.ceil(filteredPenalties.length / itemsPerPage) ? '#f8f9fa' : '#ffffff',
              color: currentPage === Math.ceil(filteredPenalties.length / itemsPerPage) ? '#6c757d' : '#495057',
              borderRadius: '6px',
              cursor: currentPage === Math.ceil(filteredPenalties.length / itemsPerPage) ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
          >
            Next ➡️
          </button>

          <div style={{ marginLeft: '15px', fontSize: '0.9rem', color: '#6c757d' }}>
            Page {currentPage} of {Math.ceil(filteredPenalties.length / itemsPerPage)} • {filteredPenalties.length} total records
          </div>
        </div>
      )}

      {/* Pagination for History */}
      {activeTab === 'history' && filteredFinesHistory.length > itemsPerPage && (
        <div
          style={{
            marginTop: '20px',
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
              const totalPages = Math.ceil(filteredFinesHistory.length / itemsPerPage);
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
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredFinesHistory.length / itemsPerPage), prev + 1))}
            disabled={currentPage === Math.ceil(filteredFinesHistory.length / itemsPerPage)}
            style={{
              padding: '8px 16px',
              border: '1px solid #dee2e6',
              backgroundColor: currentPage === Math.ceil(filteredFinesHistory.length / itemsPerPage) ? '#f8f9fa' : '#ffffff',
              color: currentPage === Math.ceil(filteredFinesHistory.length / itemsPerPage) ? '#6c757d' : '#495057',
              borderRadius: '6px',
              cursor: currentPage === Math.ceil(filteredFinesHistory.length / itemsPerPage) ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.2s',
            }}
          >
            Next ➡️
          </button>

          <div style={{ marginLeft: '15px', fontSize: '0.9rem', color: '#6c757d' }}>
            Page {currentPage} of {Math.ceil(filteredFinesHistory.length / itemsPerPage)} • {filteredFinesHistory.length} total records
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && selectedTransaction && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            }}
          >
            <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>
              {actionType === 'collect' ? '💰 Collect Fine' :
               actionType === 'mark_paid' ? '💳 Mark as Paid' :
               actionType === 'waive' ? '🆓 Waive Fine' :
               '✅ Mark as Returned'}
            </h3>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📖</div>
                <h4 style={{ color: '#2A1F16' }}>{selectedTransaction.bookTitle}</h4>
                <p style={{ color: '#666', margin: '5px 0' }}>
                  by {selectedTransaction.bookAuthor}
                </p>
                <p style={{ color: '#666' }}>
                  Issued to: {selectedTransaction.studentName}
                </p>
                {actionType === 'collect' && (
                  <p style={{ color: '#28a745', fontWeight: 'bold', marginTop: '10px' }}>
                    Amount to Collect: {formatCurrency(calculateOverdueFine(getOverdueDays(selectedTransaction.dueDate, selectedTransaction.returnedAt), selectedTransaction.bookMrp))}
                  </p>
                )}
              </div>

              {actionType === 'mark_paid' && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    Payment Amount (₹):
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    style={{ padding: '10px', width: '100%', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem' }}
                    step="0.01"
                    min="0"
                    placeholder="Enter amount paid"
                  />
                  <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                    Full amount: {formatCurrency(calculateOverdueFine(getOverdueDays(selectedTransaction.dueDate, selectedTransaction.returnedAt), selectedTransaction.bookMrp))}
                  </small>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowActionModal(false)}
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
                onClick={processAction}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: actionType === 'collect' ? '#28a745' :
                             actionType === 'waive' ? '#17a2b8' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Confirm {actionType === 'collect' ? 'Collect' :
                        actionType === 'waive' ? 'Waive' : 'Mark Returned'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Penalty;
