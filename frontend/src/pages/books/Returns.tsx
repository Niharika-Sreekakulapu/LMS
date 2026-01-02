import React, { useState, useEffect } from 'react';
import { getAllBorrowTransactions } from '../../api/libraryApi';
import type { BorrowHistory } from '../../types/dto';

type ReturnStatusFilter = 'all' | 'returned' | 'lost' | 'damaged';

const Returns: React.FC = () => {
  const [transactions, setTransactions] = useState<BorrowHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [returnStatusFilter, setReturnStatusFilter] = useState<ReturnStatusFilter>('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      console.log('🔄 Loading all borrow transactions...');
      // Load all transactions to show return status of all books
      const response = await getAllBorrowTransactions();
      console.log('📊 API Response:', response);
      console.log('📊 Transaction count:', response.data?.length || 0);
      console.log('📊 Sample transaction:', response.data?.[0]);
      setTransactions(response.data || []);
    } catch (error) {
      console.error('❌ Error loading transactions:', error);
      setTransactions([]); // Ensure we have an empty array on error
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

  // Books that have already been returned (particularly lost/damaged)
  const returnedBooks = transactions.filter((transaction) => {
    return transaction.returnedAt && (transaction.status === 'RETURNED' || transaction.status === 'LOST' || transaction.status === 'DAMAGED' || transaction.status === 'LATE_RETURNED');
  });

  const filteredReturnedBooks = returnedBooks.filter((transaction) => {
    const lowerSearch = searchTerm.toLowerCase();
    const searchMatch = !searchTerm ||
      (transaction.bookTitle && transaction.bookTitle.toLowerCase().includes(lowerSearch));

    let statusMatch = true;
    if (returnStatusFilter === 'lost') {
      statusMatch = transaction.status === 'LOST';
    } else if (returnStatusFilter === 'damaged') {
      statusMatch = transaction.status === 'DAMAGED';
    } else if (returnStatusFilter === 'returned') {
      statusMatch = transaction.status === 'RETURNED' || transaction.status === 'LATE_RETURNED';
    }

    return searchMatch && statusMatch;
  });

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
            Loading returnable books...
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
          📋 Book Return Status Overview
        </h1>
        <p
          style={{
            color: '#666',
            fontSize: '0.95rem',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          Monitor all book returns including lost, damaged, overdue, and on-time returns
        </p>
      </div>

      {/* Statistics Dashboard */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg,#2e7d32 0%,#1b5e20 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(46,125,50,0.3)',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              marginBottom: '8px',
            }}
          >
            {returnedBooks.filter((t) => t.status === 'RETURNED').length}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            ✅ Good Returns
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg,#f57c00 0%,#ef6c00 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(245,124,0,0.3)',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              marginBottom: '8px',
            }}
          >
            {returnedBooks.filter((t) => t.status === 'LATE_RETURNED').length}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>⏰ Late Returns</div>
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
            {returnedBooks.filter((t) => t.status === 'DAMAGED').length}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>⚠️ Damaged</div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg,#d32f2f 0%,#b71c1c 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(211,47,47,0.3)',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              marginBottom: '8px',
            }}
          >
            {returnedBooks.filter((t) => t.status === 'LOST').length}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>❌ Lost</div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg,#007bff 0%,#0056b3 100%)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(0,123,255,0.3)',
          }}
        >
          <div
            style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '8px',
            }}
          >
            {returnedBooks.length}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            📚 Total Returns
          </div>
        </div>
      </div>

      {/* Returned Books Controls */}
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
            gridTemplateColumns: '1fr auto auto auto',
            gap: '20px',
            alignItems: 'center',
          }}
        >
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

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#2A1F16',
              }}
            >
              📋 Status:
            </span>
            <select
              value={returnStatusFilter}
              onChange={(e) => setReturnStatusFilter(e.target.value as ReturnStatusFilter)}
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
              <option value="all">All Returns</option>
              <option value="returned">✅ Good Returns</option>
              <option value="lost">❌ Lost Books</option>
              <option value="damaged">⚠️ Damaged Books</option>
            </select>
          </div>

          {/* Clear Filter Button */}
          <button
            onClick={() => {
              setSearchTerm('');
              setReturnStatusFilter('all');
            }}
            style={{
              padding: '10px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#5a6268';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#6c757d';
            }}
          >
            Clear Filter
          </button>

          {/* Stats */}
          <div style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#2A1F16',
            textAlign: 'center'
          }}>
            📊 {filteredReturnedBooks.length} of {returnedBooks.length} returned books
          </div>
        </div>
      </div>

      {/* Main Returned Books Table */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #E8D1A7',
          boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
          overflow: 'hidden',
        }}
      >
        {filteredReturnedBooks.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 40px',
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: '0.6' }}>
              📚
            </div>
            <h3 style={{ color: '#2A1F16', marginBottom: '15px', fontSize: '1.8rem', fontWeight: '600' }}>
              No Returned Books Found
            </h3>
            <p style={{ color: '#666', fontSize: '1rem', maxWidth: '400px', margin: '0 auto 30px auto', lineHeight: '1.6' }}>
              Try adjusting your filter criteria to see returned books, or clear all filters to view all returns.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setReturnStatusFilter('all');
              }}
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
              onMouseOver={(e) => (e.currentTarget as HTMLElement).style.background = '#442D1C'}
              onMouseOut={(e) => (e.currentTarget as HTMLElement).style.background = '#9A5B34'}
            >
              Show All Books
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    📖 Book Details
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    👤 Member
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    📅 Issue Date
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    📅 Return Date
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    📊 Return Status
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '0.95rem', color: '#2A1F16', borderBottom: '2px solid #E8D1A7' }}>
                    💰 Penalty
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReturnedBooks.map((transaction, index) => {
                  const penaltyValue = transaction.penaltyAmount && typeof transaction.penaltyAmount === 'number' ? transaction.penaltyAmount : 0;

                  return (
                    <tr
                      key={transaction.id}
                      style={{
                        borderBottom: '1px solid #E8D1A7',
                        backgroundColor: index % 2 === 0 ? '#fdfdfb' : 'white'
                      }}
                    >
                      <td style={{ padding: '16px 12px', fontSize: '0.95rem' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#2A1F16', marginBottom: '4px' }}>
                            {transaction.bookTitle || 'Unknown Title'}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                            By {transaction.bookAuthor || 'Unknown'} • ISBN: {transaction.bookIsbn || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px', fontSize: '0.95rem' }}>
                        <div style={{ fontWeight: '600', color: '#2A1F16', marginBottom: '2px' }}>
                          {transaction.studentName || 'Unknown Student'}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                          Student ID: {transaction.studentId || 'N/A'} • Record #{transaction.id}
                        </div>
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '0.95rem' }}>
                        {formatDateShort(transaction.borrowedAt)}
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '0.95rem' }}>
                        {transaction.returnedAt ? formatDateShort(transaction.returnedAt) : 'N/A'}
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                        {(() => {
                          switch (transaction.status) {
                            case 'LOST':
                              return (
                                <span style={{
                                  color: '#d32f2f',
                                  fontWeight: '600',
                                  backgroundColor: '#ffebee',
                                  border: '1px solid #f44336',
                                  padding: '6px 12px',
                                  borderRadius: '25px',
                                  fontSize: '0.85em',
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
                                  backgroundColor: '#fff8e1',
                                  border: '1px solid #ff9800',
                                  padding: '6px 12px',
                                  borderRadius: '25px',
                                  fontSize: '0.85em',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}>
                                  ⚠️ DAMAGED BOOK
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
                                  fontSize: '0.85em',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}>
                                  ⏰ OVERDUE RETURN
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
                                  fontSize: '0.85em',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}>
                                  ✅ GOOD CONDITION
                                </span>
                              );
                          }
                        })()}
                      </td>
                      <td style={{ padding: '16px 12px', textAlign: 'center', fontSize: '0.95rem' }}>
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
          </div>
        )}
      </div>


    </div>
  );
};

export default Returns;
