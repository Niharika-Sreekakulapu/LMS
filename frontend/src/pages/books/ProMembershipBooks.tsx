import React, { useState, useEffect } from 'react';
import { searchBooksDTO, createIssueRequest } from '../../api/libraryApi';
import { useAuth } from '../../hooks/useAuth';
import type { Book } from '../../types/dto';

const ProMembershipBooks: React.FC = () => {
  const { auth } = useAuth();

  const isPremiumMember = auth?.user?.membershipType === 'PREMIUM';

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [requestingBookId, setRequestingBookId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    loadBooks();
  }, [searchTerm]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const response = await searchBooksDTO({
        title: searchTerm || undefined,
        available: true
      });

      // Filter to only show premium books (accessLevel === 'PREMIUM')
      const premiumBooks = response.data.filter((book: Book) => book.accessLevel === 'PREMIUM');
      setBooks(premiumBooks);
    } catch (error) {
      console.error('❌ Error loading premium books:', error);
      showToast('error', 'Failed to load premium books');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleRequestBook = async (bookId: number) => {
    setRequestingBookId(bookId);
    try {
      await createIssueRequest(bookId);

      // Refresh books list and show success message
      loadBooks();
      showToast('success', 'Premium book requested successfully! Enjoy extended borrowing terms.');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError.response?.data?.message || 'Failed to request book';
      showToast('error', errorMessage);
    } finally {
      setRequestingBookId(null);
    }
  };

  const getAvailabilityBadge = (book: Book) => {
    const available = (book.availableCopies || 0) > 0;
    return (
      <span
        style={{
          color: available ? '#2e7d32' : '#c62828',
          fontWeight: '600',
          backgroundColor: available ? '#e8f5e8' : '#ffebee',
          border: available ? '1px solid #4caf50' : '1px solid #f44336',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.75em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        {available ? '🟢 AVAILABLE' : '🔴 OUT'}
      </span>
    );
  };

  const getAccessLevelBadge = () => {
    return (
      <span
        style={{
          color: '#d32f2f',
          fontWeight: '600',
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          padding: '3px 10px',
          borderRadius: '15px',
          fontSize: '0.7em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        💎 PREMIUM
      </span>
    );
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
            Loading Premium Books...
          </div>
        </div>
      </div>
    );
  }

  // If user is not a premium member, show upgrade prompt
  if (!isPremiumMember) {
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

        <div style={{ marginBottom: '20px' }}>
          <h1
            style={{
              color: '#2A1F16',
              margin: '0 0 8px 0',
              fontSize: '2rem',
              fontWeight: '700',
            }}
          >
            🚫 Access Restricted
          </h1>
          <p
            style={{
              color: '#666',
              fontSize: '0.95rem',
              margin: '0',
              lineHeight: '1.5',
            }}
          >
            Premium membership required to access this section
          </p>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
            border: '2px solid #f44336',
            borderRadius: '16px',
            padding: '30px',
            textAlign: 'center',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔒</div>
          <h2 style={{ color: '#c62828', fontSize: '1.6rem', marginBottom: '15px' }}>
            Upgrade to Premium Membership
          </h2>
          <p style={{ color: '#d32f2f', fontSize: '1rem', lineHeight: '1.6', marginBottom: '20px' }}>
            You need a premium membership to access exclusive premium books and enhanced borrowing benefits.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              marginBottom: '25px',
            }}
          >
            <div style={{
              background: '#fff',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #e53935'
            }}>
              <strong>📅 Extended Terms:</strong> 60 days instead of 14
            </div>
            <div style={{
              background: '#fff',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #e53935'
            }}>
              <strong>🚫 Zero Fines:</strong> Never pay late fees
            </div>
            <div style={{
              background: '#fff',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #e53935'
            }}>
              <strong>⭐ Priority Access:</strong> Instant approval
            </div>
            <div style={{
              background: '#fff',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #e53935'
            }}>
              <strong>📖 Exclusive Content:</strong> Premium books only
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/student-dashboard/membership'}
            style={{
              background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '14px 30px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(244,67,54,0.4)',
            }}
          >
            Request Premium Upgrade 🏷️
          </button>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #E8D1A7',
          boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
        }}>
          <h3 style={{ color: '#2A1F16', marginBottom: '10px' }}>Current Membership: Normal</h3>
          <p style={{ color: '#666', margin: '0' }}>
            Your current membership only provides access to basic library features with 14-day borrowing periods.
          </p>
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
          }}
        >
          👑 Premium Books
        </h1>
        <p
          style={{
            color: '#666',
            fontSize: '0.95rem',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          Exclusive premium content available only to premium members
        </p>
      </div>

      {/* Premium Membership Benefits */}
      <div
        style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '25px',
          border: '2px solid #fbbf24',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '15px',
          }}
        >
          <span style={{ fontSize: '2rem' }}>🎁</span>
          <h3
            style={{
              color: '#92400e',
              fontSize: '1.3rem',
              fontWeight: '700',
              margin: '0',
            }}
          >
            Premium Membership Benefits
          </h3>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            color: '#78350f',
            fontSize: '0.9rem',
          }}
        >
          <div style={{ padding: '12px', background: '#fef9c3', borderRadius: '8px', textAlign: 'center' }}>
            <strong>📅 Extended Terms:</strong> 60 days instead of 14
          </div>
          <div style={{ padding: '12px', background: '#fef9c3', borderRadius: '8px', textAlign: 'center' }}>
            <strong>🚫 Zero Fines:</strong> Never pay late fees for premium books
          </div>
          <div style={{ padding: '12px', background: '#fef9c3', borderRadius: '8px', textAlign: 'center' }}>
            <strong>⭐ Priority Access:</strong> Instant approval for requests
          </div>
          <div style={{ padding: '12px', background: '#fef9c3', borderRadius: '8px', textAlign: 'center' }}>
            <strong>📖 Exclusive Content:</strong> Access to premium-only books
          </div>
        </div>
      </div>

      {/* Search Control */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '25px',
          border: '1px solid #E8D1A7',
          boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
        }}
      >
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="🔍 Search premium books..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '14px 20px',
              paddingLeft: '50px',
              border: '2px solid #ddd',
              borderRadius: '30px',
              width: '100%',
              fontSize: '1rem',
              background: 'white',
            }}
          />
          <span style={{
            position: 'absolute',
            left: '18px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#999',
            fontSize: '1.2rem'
          }}>
            🔍
          </span>
        </div>
        <div style={{
          marginTop: '15px',
          padding: '10px',
          background: '#f8f9fa',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid #e9ecef',
        }}>
          <span style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#2A1F16',
          }}>
            📊 {books.length} premium books available
          </span>
        </div>
      </div>

      {/* Books Grid */}
      {books.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '80px 40px',
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '6rem', marginBottom: '24px', opacity: '0.7' }}>
            👑
          </div>
          <h3 style={{ color: '#2A1F16', marginBottom: '16px', fontSize: '1.8rem', fontWeight: '600' }}>
            No Premium Books Available
          </h3>
          <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
            There are no premium books available at the moment. Check back later for new additions!
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          {books.map((book) => (
            <div
              key={book.id}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '2px solid #FFD700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                height: '100%',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.15)';
                e.currentTarget.style.borderColor = '#FFA500';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = '#FFD700';
              }}
            >
              {/* Premium Badge */}
              <div style={{
                position: 'absolute',
                top: '0',
                right: '0',
                background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                color: 'white',
                padding: '8px 16px',
                fontSize: '0.8rem',
                fontWeight: '600',
                clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)'
              }}>
                💎 PREMIUM
              </div>

              {/* Book Icon Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '2.5rem',
                  boxShadow: '0 4px 15px rgba(255,215,0,0.3)'
                }}>
                  📚
                </div>
              </div>

              {/* Book Title */}
              <h3 style={{
                color: '#2A1F16',
                fontSize: '1.25rem',
                fontWeight: '700',
                margin: '0 0 12px 0',
                lineHeight: '1.3',
                textAlign: 'center',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '42px'
              }}>
                {book.title}
              </h3>

              {/* Author */}
              <div style={{
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                <p style={{
                  color: '#6c757d',
                  fontSize: '1rem',
                  margin: '0',
                  fontWeight: '500',
                  fontStyle: 'italic',
                  borderBottom: '1px solid #f8f9fa',
                  paddingBottom: '8px'
                }}>
                  by <span style={{ color: '#2A1F16', fontWeight: '600' }}>{book.author}</span>
                </p>
              </div>

              {/* Publisher */}
              {book.publisher && (
                <div style={{
                  fontSize: '0.9rem',
                  color: '#666',
                  textAlign: 'center',
                  marginBottom: '16px',
                  fontWeight: '500'
                }}>
                  📖 {book.publisher}
                </div>
              )}

              {/* Availability and Access Level */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '20px',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                {getAvailabilityBadge(book)}
                {getAccessLevelBadge()}
              </div>

              {/* Book Stats */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                marginBottom: '20px',
                padding: '12px',
                background: '#fef3c7',
                borderRadius: '8px',
                border: '1px solid #fbbf24'
              }}>
                <div style={{
                  textAlign: 'center',
                  flex: 1
                }}>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#2A1F16',
                    lineHeight: '1'
                  }}>
                    {book.totalCopies}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#666',
                    marginTop: '2px',
                    fontWeight: '500'
                  }}>
                    Total
                  </div>
                </div>
                <div style={{
                  height: '40px',
                  width: '1px',
                  background: '#dee2e6'
                }} />
                <div style={{
                  textAlign: 'center',
                  flex: 1
                }}>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: (book.availableCopies || 0) > 0 ? '#2e7d32' : '#c62828',
                    lineHeight: '1'
                  }}>
                    {book.availableCopies}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#666',
                    marginTop: '2px',
                    fontWeight: '500'
                  }}>
                    Available
                  </div>
                </div>
              </div>

              {/* Premium Benefits */}
              <div style={{
                background: 'rgba(251, 191, 36, 0.1)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                border: '1px solid #fbbf24'
              }}>
                <div style={{
                  color: '#92400e',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  🎁 Premium Benefits
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                  <span style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: '500'
                  }}>
                    60-day term
                  </span>
                  <span style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: '500'
                  }}>
                    Zero fines
                  </span>
                </div>
              </div>

              {/* Category Badge */}
              {book.genre && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: '16px'
                }}>
                  <div style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg,#FFD700, #FFA500)',
                    color: '#8B4513',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    boxShadow: '0 2px 8px rgba(255,215,0,0.2)'
                  }}>
                    🏷️ {book.genre}
                  </div>
                </div>
              )}

              {/* Request Button */}
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                {(book.availableCopies || 0) > 0 ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRequestBook(book.id);
                    }}
                    disabled={requestingBookId === book.id}
                    style={{
                      background: requestingBookId === book.id
                        ? '#ccc'
                        : 'linear-gradient(135deg, #FFD700, #FFA500)',
                      color: requestingBookId === book.id ? '#666' : '#2A1F16',
                      border: 'none',
                      borderRadius: '25px',
                      padding: '12px 25px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: requestingBookId === book.id ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 15px rgba(255,215,0,0.3)',
                      width: '100%',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {requestingBookId === book.id ? '⏳ Requesting...' : '⭐ Request Premium Book'}
                  </button>
                ) : (
                  <span style={{
                    color: '#666',
                    fontStyle: 'italic',
                    padding: '12px 25px',
                    display: 'inline-block',
                    background: '#f8f9fa',
                    borderRadius: '25px',
                    border: '2px dashed #ccc'
                  }}>
                    Currently Unavailable
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProMembershipBooks;
