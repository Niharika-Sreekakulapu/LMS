import React, { useState, useEffect } from 'react';
import { searchBooks, getBookDetails, createIssueRequest, getMonthlyRequestCount, getSubscriptionStatus } from '../../api/libraryApi';
import type { Book } from '../../types/dto';

const StudentHome: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [requestingBookId, setRequestingBookId] = useState<number | null>(null);
  const [monthlyCount, setMonthlyCount] = useState<{monthlyRequests: number, limit: number, remaining: number} | null>(null);
  const [userSubscription, setUserSubscription] = useState<{
    membershipType: 'NORMAL' | 'PREMIUM';
    isPremium: boolean;
  } | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    loadBooks();
    loadMonthlyCount();
    loadUserSubscriptionStatus();
  }, []);

  useEffect(() => {
    loadBooks();
  }, [searchQuery, selectedCategory, showAvailableOnly]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const response = await searchBooks({
        title: searchQuery || undefined,
        genre: selectedCategory || undefined,
        available: showAvailableOnly || undefined
      });

      // Display all books without pagination
      setBooks(response.data);
    } catch (error) {
      console.error('❌ Error loading books:', error);
      showToast('error', 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyCount = async () => {
    try {
      const response = await getMonthlyRequestCount();
      setMonthlyCount(response.data);
    } catch (error) {
      console.error('Error loading monthly count:', error);
    }
  };

  const loadUserSubscriptionStatus = async () => {
    try {
      const response = await getSubscriptionStatus();
      setUserSubscription(response.data);
    } catch (error) {
      console.error('Error loading subscription status:', error);
      // Default to NORMAL if can't load
      setUserSubscription({ membershipType: 'NORMAL', isPremium: false });
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleSearch = () => {
    loadBooks();
  };

  const handleBookClick = async (book: Book) => {
    try {
      const response = await getBookDetails(book.id);
      setSelectedBook(response.data);
      setShowBookModal(true);
    } catch (error) {
      console.error('Error loading book details:', error);
      showToast('error', 'Failed to load book details');
    }
  };

  const handleRequestBook = async (bookId: number) => {
    // Check if user can request premium books
    if (userSubscription && !userSubscription.isPremium) {
      const book = books.find(b => b.id === bookId);
      if (book && book.accessLevel && book.accessLevel.toUpperCase() === 'PREMIUM') {
        setToastMessage({ type: 'error', message: 'Premium books are only available for premium users. Upgrade your subscription to access these books.' });
        setTimeout(() => setToastMessage(null), 5000);
        return;
      }
    }

    setRequestingBookId(bookId);
    try {
      await createIssueRequest(bookId);

      // Close modal immediately and refresh data
      setShowBookModal(false);
      setSelectedBook(null);
      loadBooks();
      loadMonthlyCount();

      // Show success toast in global area (right corner)
      setToastMessage({ type: 'success', message: 'Book request submitted successfully!' });
      setTimeout(() => setToastMessage(null), 5000);

    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError.response?.data?.message || '';
      if (errorMessage.includes('already requested')) {
        // Show error toast in global area
        setToastMessage({ type: 'error', message: 'You have already requested this book' });
        setTimeout(() => setToastMessage(null), 5000);
      } else if (errorMessage.includes('overdue')) {
        setToastMessage({ type: 'error', message: 'Cannot request books while you have overdue items' });
        setTimeout(() => setToastMessage(null), 5000);
      } else if (errorMessage.includes('Monthly request limit exceeded')) {
        setToastMessage({ type: 'error', message: 'Monthly request limit exceeded (3 books per month)' });
        setTimeout(() => setToastMessage(null), 5000);
      } else {
        setToastMessage({ type: 'error', message: 'Failed to submit book request' });
        setTimeout(() => setToastMessage(null), 5000);
      }
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

  const getAccessLevelBadge = (book: Book) => {
    // Case-insensitive check for PREMIUM
    if (book.accessLevel && book.accessLevel.toUpperCase() === 'PREMIUM') {
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
    }

    // Default to NORMAL for any other case including null, undefined, "normal", etc.
    return (
      <span
        style={{
          color: '#2e7d32',
          fontWeight: '600',
          backgroundColor: '#e8f5e8',
          border: '1px solid #4caf50',
          padding: '3px 10px',
          borderRadius: '15px',
          fontSize: '0.7em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        🆓 NORMAL
      </span>
    );
  };

  const renderBookCard = (book: Book) => (
    <div
      key={book.id}
      style={{
        background: 'linear-gradient(145deg, #fefefe 0%, #fdfdfd 100%)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
        border: '1px solid #f0f0f0',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={() => handleBookClick(book)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)';
        e.currentTarget.style.borderColor = '#8B4513';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.08)';
        e.currentTarget.style.borderColor = '#f0f0f0';
      }}
    >
      {/* Book Title */}
      <h3 style={{
        color: '#1a1a1a',
        fontSize: '1.3rem',
        fontWeight: '600',
        margin: '0 0 8px 0',
        lineHeight: '1.4',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: '42px'
      }}>
        {book.title}
      </h3>

      {/* Author */}
      <p style={{
        color: '#666',
        fontSize: '0.95rem',
        margin: '0 0 12px 0',
        fontStyle: 'italic',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span>✍️</span>
        by {book.author}
      </p>

      {/* Publisher & Category */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        {book.publisher && (
          <span style={{
            fontSize: '0.85rem',
            color: '#888',
            background: '#f8f9fa',
            padding: '4px 8px',
            borderRadius: '6px'
          }}>
            📚 {book.publisher}
          </span>
        )}
        {book.genre && (
          <span style={{
            fontSize: '0.8rem',
            color: '#8B4513',
            background: '#fdf6f0',
            padding: '4px 8px',
            borderRadius: '6px',
            fontWeight: '600',
            border: '1px solid #f0e6d6'
          }}>
            {book.genre}
          </span>
        )}
      </div>

      {/* Status Badges - Moved below publisher/category */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px'
      }}>
        {getAvailabilityBadge(book)}
        {getAccessLevelBadge(book)}
      </div>

      {/* Statistics Card */}
      <div style={{
        background: 'linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid #e9ecef',
        marginTop: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            textAlign: 'center',
            flex: 1
          }}>
            <div style={{
              fontSize: '1.8rem',
              fontWeight: '700',
              color: '#1a1a1a',
              lineHeight: '1'
            }}>
              {book.totalCopies}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#666',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginTop: '2px'
            }}>
              Total
            </div>
          </div>
          <div style={{
            width: '1px',
            height: '40px',
            background: '#dee2e6'
          }} />
          <div style={{
            textAlign: 'center',
            flex: 1
          }}>
            <div style={{
              fontSize: '1.8rem',
              fontWeight: '700',
              color: (book.availableCopies || 0) > 0 ? '#2e7d32' : '#c62828',
              lineHeight: '1'
            }}>
              {book.availableCopies}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#666',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginTop: '2px'
            }}>
              Available
            </div>
          </div>
        </div>
      </div>

      {/* Hover indicator */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        opacity: 0,
        transition: 'opacity 0.3s ease',
        fontSize: '1.1rem',
        color: '#8B4513'
      }}>
        👁️
      </div>
    </div>
  );

  if (loading && books.length === 0) {
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
            Loading books...
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

      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1
          style={{
            color: '#2A1F16',
            margin: '0 0 8px 0',
            fontSize: '2.5rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
          }}
        >
          📚 Library Books
        </h1>
        <p
          style={{
            color: '#666',
            fontSize: '1.1rem',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          Discover and request books from our diverse collection
        </p>
      </div>

      {/* Monthly Quota Status */}
      {monthlyCount && (
        <div style={{
          background: userSubscription?.isPremium
            ? 'linear-gradient(135deg, #fff8e1, #fefae0)'
            : monthlyCount.remaining > 0 ? '#e3f2fd' : '#ffebee',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '25px',
          border: userSubscription?.isPremium ? '1px solid #ffd54f' : '1px solid #bbdefb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Premium badge */}
          {userSubscription?.isPremium && (
            <div style={{
              position: 'absolute',
              top: '0',
              right: '0',
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              color: 'white',
              padding: '4px 12px',
              fontSize: '0.8rem',
              fontWeight: '600',
              clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)'
            }}>
              💎 PREMIUM
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
            <div style={{
              fontSize: '2rem',
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: userSubscription?.isPremium
                ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                : monthlyCount.remaining > 0 ? '#2196f3' : '#f44336',
              color: 'white'
            }}>
              {userSubscription?.isPremium
                ? '✨'
                : monthlyCount.remaining >= 3 ? '📚' : monthlyCount.remaining === 2 ? '📖' : monthlyCount.remaining === 1 ? '📓' : '🚫'
              }
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                margin: '0 0 5px 0',
                color: userSubscription?.isPremium ? '#f57c00' : '#1565c0',
                fontSize: '1.3rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {userSubscription?.isPremium ? 'Premium Book Requests' : 'Monthly Book Request Limit'}
                {userSubscription?.isPremium && (
                  <span style={{
                    fontSize: '0.8rem',
                    background: '#fff3c4',
                    color: '#f57c00',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: '600'
                  }}>
                    UNLIMITED
                  </span>
                )}
              </h3>
              <p style={{ margin: 0, color: '#424242' }}>
                {userSubscription?.isPremium ? (
                  <>
                    As a <strong>Premium Member</strong>, you enjoy unlimited book requests with no monthly limits!
                    <br />
                    <em style={{ color: '#666', fontSize: '0.9rem' }}>
                      Your subscription is active and all premium benefits are unlocked.
                    </em>
                  </>
                ) : (
                  <>
                    You've made <strong>{monthlyCount.monthlyRequests}</strong> book requests this month.
                    {monthlyCount.remaining > 0
                      ? ` You can make ${monthlyCount.remaining} more request${monthlyCount.remaining !== 1 ? 's' : ''}.`
                      : ' You have reached your monthly limit.'
                    }
                  </>
                )}
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: userSubscription?.isPremium ? '#f57c00' : '#1565c0'
            }}>
              {userSubscription?.isPremium ? '∞' : `${monthlyCount.monthlyRequests}/${monthlyCount.limit}`}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              {userSubscription?.isPremium ? 'Unlimited' : 'This Month'}
            </div>
          </div>
        </div>
      )}

      {/* Search Controls */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '25px',
        border: '1px solid #E8D1A7',
        boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: '20px',
          alignItems: 'center'
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by title, author, or ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '14px 16px',
              border: '2px solid #ddd',
              borderRadius: '12px',
              background: 'white',
              fontSize: '1rem',
              minWidth: '150px',
            }}
          >
            <option value="">All Genres</option>
            <option value="Fiction">Fiction</option>
            <option value="Non-Fiction">Non-Fiction</option>
            <option value="Science">Science</option>
            <option value="History">History</option>
            <option value="Biography">Biography</option>
          </select>

          {/* Availability Toggle */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500'
          }}>
            <input
              type="checkbox"
              checked={showAvailableOnly}
              onChange={(e) => setShowAvailableOnly(e.target.checked)}
              style={{ margin: 0 }}
            />
            Available only
          </label>
        </div>
      </div>

      {/* Results */}
      {books.length === 0 && !loading ? (
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
            No Books Found
          </h3>
          <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
            Try adjusting your search criteria or check back later for new arrivals.
          </p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            {books.map(renderBookCard)}
          </div>

          {/* Pagination would go here */}
        </>
      )}

      {/* Book Detail Modal */}
      {showBookModal && selectedBook && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.85), rgba(26, 26, 26, 0.95))',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px',
          backdropFilter: 'blur(8px)'
        }}>
          {/* Modal Toast Notification */}
          {toastMessage && (
            <div
              style={{
                position: 'absolute',
                top: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: toastMessage.type === 'success' ? '#d4edda' : '#f8d7da',
                color: toastMessage.type === 'success' ? '#155724' : '#721c24',
                padding: '12px 24px',
                borderRadius: '50px',
                border: `2px solid ${toastMessage.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
                boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                zIndex: 1100,
                fontSize: '0.95rem',
                fontWeight: '600',
                textShadow: '0 1px 1px rgba(0,0,0,0.1)'
              }}
            >
              {toastMessage.message}
            </div>
          )}

          <div style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #fefefe 100%)',
            borderRadius: '24px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
            border: '1px solid rgba(139,69,19,0.2)',
            position: 'relative'
          }}>

            {/* Close Button */}
            <button
              onClick={() => {
                setShowBookModal(false);
                setSelectedBook(null);
                setToastMessage(null);
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.9)',
                color: '#8B4513',
                border: '2px solid rgba(255,255,255,0.8)',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                cursor: 'pointer',
                fontSize: '1.8rem',
                fontWeight: 'bold',
                zIndex: 1001,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,1)';
                e.currentTarget.style.borderColor = 'rgba(139,69,19,0.6)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.8)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ×
            </button>

            {/* Modal Content */}
            <div style={{
              position: 'relative',
              zIndex: 2,
              padding: '40px'
            }}>
              {/* Book Header */}
              <div style={{
                textAlign: 'center',
                marginBottom: '36px',
                padding: '0 20px'
              }}>
                <h1 style={{
                  color: '#2A1F16',
                  fontSize: '2.0rem',
                  fontWeight: '700',
                  margin: '0 0 12px 0',
                  lineHeight: '1.2',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {selectedBook.title}
                </h1>
                <div style={{
                  color: '#666',
                  fontSize: '1.1rem',
                  fontStyle: 'italic',
                  fontWeight: '500',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <span>✍️</span>
                  <span>{selectedBook.author}</span>
                </div>
                {selectedBook.publisher && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#8B4513',
                    fontSize: '1rem',
                    background: 'rgba(139,69,19,0.1)',
                    padding: '8px 16px',
                    borderRadius: '25px',
                    border: '1px solid rgba(139,69,19,0.2)',
                    fontWeight: '500'
                  }}>
                    <span>🏢</span>
                    <span>{selectedBook.publisher}</span>
                    {selectedBook.publishedYear && <span>• {selectedBook.publishedYear}</span>}
                  </div>
                )}
              </div>

              {/* Statistics Section - Single Line */}
              <div style={{ marginBottom: '36px' }}>
                <h3 style={{
                  color: '#2A1F16',
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  marginBottom: '20px',
                  paddingBottom: '8px',
                  borderBottom: '2px solid #8B4513'
                }}>
                  📊 Statistics
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px'
                }}>
                  {/* Availability Status */}
                  <div style={{
                    background: 'linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '2px solid #e9ecef',
                    boxShadow: '0 3px 15px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span style={{
                        fontSize: '2rem',
                        color: (selectedBook.availableCopies || 0) > 0 ? '#2e7d32' : '#c62828'
                      }}>
                        {(selectedBook.availableCopies || 0) > 0 ? '🟢' : '🔴'}
                      </span>
                      <div>
                        <div style={{
                          fontSize: '1.4rem',
                          fontWeight: '700',
                          color: (selectedBook.availableCopies || 0) > 0 ? '#2e7d32' : '#c62828'
                        }}>
                          {selectedBook.availableCopies}
                        </div>
                        <div style={{
                          fontSize: '0.9rem',
                          color: '#666',
                          fontWeight: '500'
                        }}>
                          Available Copies
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Copies */}
                  <div style={{
                    background: 'linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '2px solid #e9ecef',
                    boxShadow: '0 3px 15px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <span style={{ fontSize: '2rem' }}>📚</span>
                      <div>
                        <div style={{
                          fontSize: '1.4rem',
                          fontWeight: '700',
                          color: '#2A1F16'
                        }}>
                          {selectedBook.totalCopies}
                        </div>
                        <div style={{
                          fontSize: '0.9rem',
                          color: '#666',
                          fontWeight: '500'
                        }}>
                          Total Copies
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Book Details Section */}
              <div style={{ marginBottom: '36px' }}>
                <h3 style={{
                  color: '#2A1F16',
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  marginBottom: '20px',
                  paddingBottom: '8px',
                  borderBottom: '2px solid #8B4513'
                }}>
                  📖 Book Details
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px'
                }}>
                  {/* Category */}
                  {selectedBook.genre && (
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: '#666',
                        marginBottom: '8px'
                      }}>
                        Category
                      </label>
                      <span style={{
                        background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                        color: '#FFF8DC',
                        padding: '10px 16px',
                        borderRadius: '20px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        {selectedBook.genre}
                      </span>
                    </div>
                  )}

                  {/* ISBN */}
                  {selectedBook.isbn && (
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: '#666',
                        marginBottom: '8px'
                      }}>
                        ISBN
                      </label>
                      <div style={{
                        background: 'rgba(139,69,19,0.05)',
                        border: '1px solid rgba(139,69,19,0.1)',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        color: '#2A1F16',
                        fontWeight: '500',
                        fontFamily: 'monospace'
                      }}>
                        {selectedBook.isbn}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description Section */}
              {selectedBook.description && (
                <div style={{ marginBottom: '36px' }}>
                  <h3 style={{
                    color: '#2A1F16',
                    fontSize: '1.3rem',
                    fontWeight: '600',
                    marginBottom: '16px',
                    paddingBottom: '8px',
                    borderBottom: '2px solid #8B4513'
                  }}>
                    📝 Description
                  </h3>
                  <div style={{
                    background: 'linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%)',
                    padding: '24px',
                    borderRadius: '12px',
                    border: '2px solid #e9ecef',
                    color: '#444',
                    lineHeight: '1.7',
                    fontSize: '1rem',
                    boxShadow: '0 3px 15px rgba(0,0,0,0.05)'
                  }}>
                    {selectedBook.description}
                  </div>
                </div>
              )}

              {/* Action Section */}
              <div style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column'
              }}>
                {(selectedBook.availableCopies || 0) > 0 ? (
                  <>
                    <button
                      onClick={() => handleRequestBook(selectedBook.id)}
                      disabled={requestingBookId === selectedBook.id}
                      style={{
                        background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50px',
                        padding: '18px 36px',
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        cursor: requestingBookId === selectedBook.id ? 'not-allowed' : 'pointer',
                        boxShadow: '0 6px 20px rgba(40,167,69,0.4)',
                        opacity: requestingBookId === selectedBook.id ? 0.6 : 1,
                        transition: 'all 0.3s ease',
                        minWidth: '240px'
                      }}
                      onMouseEnter={(e) => {
                        if (requestingBookId !== selectedBook.id) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(40,167,69,0.5)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(40,167,69,0.4)';
                      }}
                    >
                      {requestingBookId === selectedBook.id ? '⏳ Processing Request...' : '📖 Request This Book'}
                    </button>
                    <div style={{
                      color: '#666',
                      fontSize: '0.9rem',
                      textAlign: 'center',
                      maxWidth: '400px'
                    }}>
                      Available now! Your request will be processed by the library staff.
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleRequestBook(selectedBook.id)}
                      disabled={requestingBookId === selectedBook.id}
                      style={{
                        background: 'linear-gradient(135deg, #E8D1A7 0%, #F4E4BC 100%)',
                        color: '#2A1F16',
                        border: '3px solid #8B4513',
                        borderRadius: '50px',
                        padding: '18px 36px',
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        cursor: requestingBookId === selectedBook.id ? 'not-allowed' : 'pointer',
                        boxShadow: '0 6px 20px rgba(139,69,19,0.3)',
                        opacity: requestingBookId === selectedBook.id ? 0.6 : 1,
                        transition: 'all 0.3s ease',
                        minWidth: '240px'
                      }}
                      onMouseEnter={(e) => {
                        if (requestingBookId !== selectedBook.id) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 25px rgba(139,69,19,0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(139,69,19,0.3)';
                      }}
                    >
                      {requestingBookId === selectedBook.id ? '⏳ Joining Waitlist...' : '📋 Join Waitlist'}
                    </button>
                    <div style={{
                      color: '#c62828',
                      fontSize: '0.95rem',
                      textAlign: 'center',
                      maxWidth: '400px',
                      background: '#fff3f3',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid #ffcdd2'
                    }}>
                      🚫 Currently unavailable. Joining the waitlist will notify you when it's returned.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentHome;
