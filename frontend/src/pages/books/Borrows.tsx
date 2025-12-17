import React, { useState, useEffect } from 'react';
import { getAllBorrowTransactions } from '../../api/libraryApi';
import type { BorrowHistory } from '../../types/dto';

const Borrows: React.FC = () => {
  const [transactions, setTransactions] = useState<BorrowHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await getAllBorrowTransactions();
      setTransactions(response.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, dueDate?: string) => {
    const isOverdue = status === 'ACTIVE' && dueDate && new Date(dueDate) < new Date();
    const actualStatus = isOverdue ? 'OVERDUE' : status;

    switch (actualStatus) {
      case 'ACTIVE':
        return (
          <span
            style={{
              color: '#9A5B34',
              fontWeight: '600',
              backgroundColor: '#E8D1A7',
              border: '1px solid #9A5B34',
              padding: '6px 14px',
              borderRadius: '25px',
              fontSize: '0.8em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            📖 BORROWED
          </span>
        );
      case 'RETURNED':
        return (
          <span
            style={{
              color: '#9A5B34',
              fontWeight: '600',
              backgroundColor: '#E8D1A7',
              border: '1px solid #9A5B34',
              padding: '6px 14px',
              borderRadius: '25px',
              fontSize: '0.8em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            ✅ RETURNED
          </span>
        );
      case 'OVERDUE':
        return (
          <span
            style={{
              color: '#9A5B34',
              fontWeight: '600',
              backgroundColor: '#E8D1A7',
              border: '1px solid #9A5B34',
              padding: '6px 14px',
              borderRadius: '25px',
              fontSize: '0.8em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 8px rgba(154, 91, 52, 0.15)',
            }}
          >
            🚨 OVERDUE
          </span>
        );
      case 'LOST':
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
      case 'DAMAGED':
        return (
          <span
            style={{
              color: '#e65100',
              fontWeight: '600',
              backgroundColor: '#fff8e1',
              border: '1px solid #ff9800',
              padding: '6px 14px',
              borderRadius: '25px',
              fontSize: '0.8em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            ⚠️ DAMAGED
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

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredTransactions = transactions.filter((transaction) => {
    // Status filter
    const statusMatch =
      filterStatus === 'ALL' ||
      (filterStatus === 'OVERDUE' &&
        transaction.status === 'BORROWED' &&
        transaction.dueDate &&
        new Date(transaction.dueDate) < new Date()) ||
      (filterStatus === 'ACTIVE' && transaction.status === 'BORROWED') ||
      transaction.status === filterStatus;

    // Search filter
    const lowerSearch = searchTerm.toLowerCase();
    const searchMatch =
      !searchTerm ||
      (transaction.bookTitle && transaction.bookTitle.toLowerCase().includes(lowerSearch));

    return statusMatch && searchMatch;
  });

  const getOverdueDays = (dueDate: string, returnDate?: string) => {
    const due = new Date(dueDate);
    const reference = returnDate ? new Date(returnDate) : new Date();
    const diffTime = reference.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
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
            Loading borrowed books...
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
          📚 Borrowed Books Management
        </h1>
        <p
          style={{
            color: '#666',
            fontSize: '0.95rem',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          Comprehensive overview of all book transactions with detailed member
          information
        </p>
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
            background: 'linear-gradient(135deg, #9A5B34 0%, #442D1C 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(154, 91, 52, 0.3)',
            border: '1px solid #E8D1A7',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              marginBottom: '8px',
            }}
          >
            {transactions.filter((t) => t.status === 'ACTIVE').length}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            📖 Currently Borrowed
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #dc3545 0%, #b02a37 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              marginBottom: '8px',
            }}
          >
            {
              transactions.filter(
                (t) =>
                  t.status === 'ACTIVE' &&
                  t.dueDate &&
                  new Date(t.dueDate) < new Date(),
              ).length
            }
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>⚠️ Overdue</div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              marginBottom: '8px',
            }}
          >
            {transactions.filter((t) => t.status === 'RETURNED').length}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>✅ Returned</div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #E8D1A7 0%, #B8860B 100%)',
            color: '#2A1F16',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(232, 209, 167, 0.3)',
          }}
        >
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: '700',
              marginBottom: '8px',
            }}
          >
            ₹
            {transactions
              .reduce((total, t) => total + (t.penaltyAmount || 0), 0)
              .toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>💰 Total Fines</div>
        </div>
      </div>

      {/* Controls Section */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          border: '1px solid #E8D1A7',
          boxShadow: '0 4px 15px rgba(154, 91, 52, 0.1)',
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
              }}
            >
              📋 Filter:
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
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
              <option value="ALL">🎯 All Books</option>
              <option value="ACTIVE">📖 Currently Borrowed</option>
              <option value="RETURNED">✅ Returned</option>
              <option value="OVERDUE">⚠️ Overdue</option>
              <option value="LOST">❌ Lost</option>
              <option value="DAMAGED">🔧 Damaged</option>
            </select>
          </div>

          {/* Search Control */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="🔍 Search books, members..."
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
                top: '50%',
                transform: 'translateY(-50%)',
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
            📊 {filteredTransactions.length} of {transactions.length} transactions
          </span>
        </div>
      </div>

      {/* Books Table */}
      {filteredTransactions.length === 0 ? (
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
            📚
          </div>
          <h3 style={{ color: '#2A1F16', marginBottom: '15px', fontSize: '1.5rem', fontWeight: '600' }}>
            No Books Found
          </h3>
          <p style={{ color: '#666', fontSize: '1rem', maxWidth: '400px', margin: '0 auto 30px auto', lineHeight: '1.6' }}>
            Try adjusting your search terms or filter criteria to find the transactions you're looking for.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterStatus('ALL')}
              style={{
                padding: '12px 20px',
                background: '#9A5B34',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#442D1C'}
              onMouseOut={(e) => e.currentTarget.style.background = '#9A5B34'}
            >
              Show All Books
            </button>
            <button
              onClick={() => setSearchTerm('')}
              style={{
                padding: '12px 20px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#1e7e34'}
              onMouseOut={(e) => e.currentTarget.style.background = '#28a745'}
            >
              Clear Search
            </button>
          </div>
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
              📖 Active Loan Records ({filteredTransactions.length})
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    📚 Book Details
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    👤 Transaction
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    📅 Issue Date
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    📅 Due Date
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    📊 Status
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    💰 Penalty
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction, index) => {
                  const overdueDays = getOverdueDays(transaction.dueDate, transaction.returnedAt);
                  const isOverdue = transaction.status === 'BORROWED' && new Date(transaction.dueDate) < new Date();

                  return (
                    <tr
                      key={transaction.id}
                      style={{
                        borderBottom: '1px solid #E8D1A7',
                        backgroundColor: isOverdue ? '#fff5f5' : (index % 2 === 0 ? '#fdfdfb' : 'white')
                      }}
                    >
                      <td style={{ padding: '16px 12px', fontSize: '0.95rem' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#2A1F16', marginBottom: '4px' }}>
                            {transaction.bookTitle || 'Unknown Title'}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                            By {transaction.bookAuthor || 'Unknown'} • Genre: {transaction.bookGenre || 'N/A'} • ISBN: {transaction.bookIsbn || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px', fontSize: '0.95rem' }}>
                        <div style={{ fontWeight: '600', color: '#2A1F16', marginBottom: '2px' }}>
                          Transaction #{transaction.id}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                          Book ID: {transaction.bookId}
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '0.95rem' }}>
                        {formatDateShort(transaction.borrowedAt)}
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '0.95rem' }}>
                        <div style={{ color: isOverdue ? '#dc3545' : '#2A1F16', fontWeight: isOverdue ? '600' : 'normal' }}>
                          {formatDateShort(transaction.dueDate)}
                        </div>
                        {isOverdue && (
                          <div style={{ fontSize: '0.85rem', color: '#dc3545', fontWeight: '600', marginTop: '2px' }}>
                            Overdue: {overdueDays} days
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                        {getStatusBadge(transaction.status, transaction.dueDate)}
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '0.95rem' }}>
                        {transaction.penaltyAmount && transaction.penaltyAmount > 0 ? (
                          <span style={{ color: '#e65100', fontWeight: '600' }}>
                            ₹{transaction.penaltyAmount}
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
          </div>
        </div>
      )}
    </div>
  );
};

export default Borrows;
