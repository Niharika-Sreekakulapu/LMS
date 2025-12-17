import React, { useState, useEffect } from 'react';
import { searchBooks, createIssueRequest, getSubscriptionStatus, extendSubscription, getSubscriptionPackages } from '../../api/libraryApi';
import { useAuth } from '../../hooks/useAuth';
import type { Book } from '../../types/dto';

const StudentProMembership: React.FC = () => {
  const { auth } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [requestingBookId, setRequestingBookId] = useState<number | null>(null);
  const [userSubscription, setUserSubscription] = useState<{
    membershipType: 'NORMAL' | 'PREMIUM';
    isPremium: boolean;
    subscriptionPackage?: string;
    subscriptionStart?: string;
    subscriptionEnd?: string;
  } | null>(null);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extendingSubscription, setExtendingSubscription] = useState(false);
  const [subscriptionPackages, setSubscriptionPackages] = useState<string[]>([]);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    loadUserSubscriptionStatus();
    if (auth?.user) {
      loadPremiumBooks();
    }
  }, [auth?.user]);

  useEffect(() => {
    loadPremiumBooks();
  }, [searchQuery, selectedCategory]);

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

  const loadPremiumBooks = async () => {
    try {
      setLoading(true);
      const response = await searchBooks({
        title: searchQuery || undefined,
        genre: selectedCategory || undefined
      });

      // Filter to only show premium books (case-insensitive)
      const premiumBooks = response.data.filter((book: Book) =>
        book.accessLevel && book.accessLevel.toUpperCase() === 'PREMIUM'
      );
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

  const handleSearch = () => {
    loadPremiumBooks();
  };

  const handleBookClick = async (book: Book) => {
    // This would open a modal or navigate to book details
    console.log('Book clicked:', book);
  };

  const handleRequestBook = async (bookId: number) => {
    // Check if user is premium
    if (!userSubscription?.isPremium) {
      showToast('error', 'Premium membership required to request premium books');
      return;
    }

    setRequestingBookId(bookId);
    try {
      await createIssueRequest(bookId);

      // Close modal immediately and refresh data
      loadPremiumBooks();

      // Show success toast
      setToastMessage({ type: 'success', message: 'Premium book request submitted successfully! Enjoy extended borrowing benefits.' });
      setTimeout(() => setToastMessage(null), 5000);

    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError.response?.data?.message || '';
      if (errorMessage.includes('already requested')) {
        // Show error toast
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

  const handleExtendSubscription = async (packageName: string) => {
    if (extendingSubscription) return;

    setExtendingSubscription(true);
    try {
      await extendSubscription(packageName as 'ONE_MONTH' | 'SIX_MONTHS' | 'ONE_YEAR');

      // Refresh subscription status
      await loadUserSubscriptionStatus();

      // Close modal and show success message
      setShowExtensionModal(false);
      showToast('success', 'Membership extended successfully! Your premium benefits have been renewed.');

    } catch (error: unknown) {
      console.error('Error extending subscription:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError.response?.data?.message || 'Failed to extend membership';
      showToast('error', errorMessage);
    } finally {
      setExtendingSubscription(false);
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
    return null; // Only show badge for premium books
  };

  const renderBookCard = (book: Book) => (
    <div
      key={book.id}
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
        border: '2px solid #FFD700',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
      onClick={() => handleBookClick(book)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)';
        e.currentTarget.style.borderColor = '#FFA500';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.08)';
        e.currentTarget.style.borderColor = '#FFD700';
      }}
    >
      {/* Premium Badge Overlay */}
      <div style={{
        position: 'absolute',
        top: '0',
        right: '0',
        background: 'linear-gradient(135deg, #FFD700, #FFA500)',
        color: 'white',
        padding: '6px 14px',
        fontSize: '0.75rem',
        fontWeight: '600',
        clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)'
      }}>
        ⭐ PREMIUM
      </div>

      {/* Book Icon Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <div style={{
          width: '70px',
          height: '70px',
          background: 'linear-gradient(135deg, #FFD700, #FFA500)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '2.2rem',
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

      {/* Status Badges */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
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
        marginBottom: '20px',
        flexGrow: 1
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
              fontSize: '1.6rem',
              fontWeight: '700',
              color: '#2A1F16',
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
            height: '35px',
            background: '#dee2e6'
          }} />
          <div style={{
            textAlign: 'center',
            flex: 1
          }}>
            <div style={{
              fontSize: '1.6rem',
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

      {/* Request Button */}
      <div style={{ textAlign: 'center', marginTop: 'auto' }}>
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
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (requestingBookId !== book.id) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,215,0,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(255,215,0,0.3)';
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

      {/* Hover indicator */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        opacity: 0,
        transition: 'opacity 0.3s ease',
        fontSize: '1.1rem',
        color: '#8B4513'
      }}>
        👁️
      </div>
    </div>
  );

  // If user is not logged in or subscription status isn't loaded, show loading
  if (!auth?.user || userSubscription === null) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
          <div style={{ fontSize: '1.2rem', color: '#666' }}>
            Loading membership status...
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

      {/* Membership Header */}
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
          👑 Premium Membership
        </h1>
        <p
          style={{
            color: '#666',
            fontSize: '1.1rem',
            margin: '0',
            lineHeight: '1.5',
          }}
        >
          Welcome to your exclusive premium member area with access to premium content and enhanced benefits.
        </p>
      </div>

      {/* Membership Status Card */}
      <div style={{
        background: 'linear-gradient(135deg, #fff8e1 0%, #fefae0 100%)',
        borderRadius: '16px',
        padding: '30px',
        marginBottom: '25px',
        border: '2px solid #fbbf24',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Premium badge */}
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          background: 'linear-gradient(135deg, #FFD700, #FFA500)',
          color: 'white',
          padding: '8px 20px',
          fontSize: '1rem',
          fontWeight: '700',
          clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)'
        }}>
          ✨ ACTIVE PREMIUM
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            fontSize: '3rem',
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            👑
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{
              margin: '0 0 8px 0',
              color: '#f57c00',
              fontSize: '1.8rem',
              fontWeight: '700'
            }}>
              Premium Member - {auth.user.name || 'Student'}
            </h2>
            <p style={{
              margin: '0 0 15px 0',
              color: '#666',
              fontSize: '1rem'
            }}>
              {userSubscription?.subscriptionEnd ? (
                <>
                  Valid until: {new Date(userSubscription.subscriptionEnd).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  {userSubscription.subscriptionPackage && (
                    <> | Package: {userSubscription.subscriptionPackage.replace('_', ' ')}</>
                  )}
                </>
              ) : (
                'Active since: Today | Member since: Today'
              )}
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '10px',
              fontSize: '0.9rem',
              marginBottom: '20px'
            }}>
              <div style={{ padding: '8px 12px', background: '#fef9c3', borderRadius: '6px', textAlign: 'center' }}>
                <strong>📅 {userSubscription?.subscriptionPackage ?
                  userSubscription.subscriptionPackage.replace('_', ' ') : '60-day terms'}</strong>
              </div>
              <div style={{ padding: '8px 12px', background: '#fef9c3', borderRadius: '6px', textAlign: 'center' }}>
                <strong>🚫 Zero fines</strong>
              </div>
              <div style={{ padding: '8px 12px', background: '#fef9c3', borderRadius: '6px', textAlign: 'center' }}>
                <strong>⭐ Priority access</strong>
              </div>
              <div style={{ padding: '8px 12px', background: '#fef9c3', borderRadius: '6px', textAlign: 'center' }}>
                <strong>📖 Exclusive content</strong>
              </div>
            </div>

            {/* Extension Button */}
            <div style={{ marginTop: '15px' }}>
              <button
                onClick={() => setShowExtensionModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #28a745, #20c997)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '25px',
                  padding: '12px 30px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.3)';
                }}
              >
                🔄 Extend Membership
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Books Section */}
      <div style={{ marginBottom: '30px' }}>
        <h2
          style={{
            color: '#2A1F16',
            margin: '0 0 16px 0',
            fontSize: '1.8rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          📖 Premium Books Collection
        </h2>
        <p
          style={{
            color: '#666',
            fontSize: '1rem',
            margin: '0 0 25px 0',
            lineHeight: '1.5',
          }}
        >
          Browse and request exclusive premium books available only to premium members.
        </p>

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
            gridTemplateColumns: '1fr auto',
            gap: '20px',
            alignItems: 'center'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="🔍 Search premium books..."
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
              <option value="Technology">Technology</option>
              <option value="Programming">Programming</option>
              <option value="AI/Machine Learning">AI/Machine Learning</option>
              <option value="Cybersecurity">Cybersecurity</option>
              <option value="History">History</option>
              <option value="Biography">Biography</option>
              <option value="Self-Help">Self-Help</option>
              <option value="Business">Business</option>
              <option value="Health">Health</option>
              <option value="Education">Education</option>
              <option value="Children">Children's Books</option>
              <option value="Horror">Horror</option>
              <option value="Mystery">Mystery</option>
              <option value="Romance">Romance</option>
              <option value="Fantasy">Fantasy</option>
              <option value="Science Fiction">Science Fiction</option>
              <option value="Thriller">Thriller</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
              <div style={{ fontSize: '1.2rem', color: '#666' }}>
                Loading Premium Books...
              </div>
            </div>
          </div>
        ) : books.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '80px 40px',
            textAlign: 'center',
            border: '2px dashed #FFD700',
            boxShadow: '0 8px 32px rgba(255,215,0,0.1)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>👑</div>
            <h3 style={{ color: '#2A1F16', marginBottom: '16px', fontSize: '1.6rem', fontWeight: '600' }}>
              No Premium Books Available
            </h3>
            <p style={{ color: '#666', fontSize: '1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
              There are currently no premium books in our collection. Check back soon for exclusive additions!
            </p>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              {books.map(renderBookCard)}
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              border: '1px solid #E8D1A7',
              boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
            }}>
              <span style={{
                fontSize: '0.95rem',
                fontWeight: '600',
                color: '#2A1F16',
              }}>
                📊 Displaying {books.length} premium books
              </span>
            </div>
          </>
        )}
      </div>

      {/* Extension Modal */}
      {showExtensionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              textAlign: 'center',
              marginBottom: '30px',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #28a745, #20c997)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                color: 'white',
                boxShadow: '0 8px 25px rgba(40, 167, 69, 0.4)'
              }}>
                🔄
              </div>
              <h2 style={{
                color: '#2A1F16',
                margin: '20px 0 10px 0',
                fontSize: '1.8rem',
                fontWeight: '700'
              }}>
                Extend Premium Membership
              </h2>
              <p style={{
                color: '#666',
                fontSize: '1rem',
                margin: '0'
              }}>
                Choose an extension package to continue enjoying premium benefits
              </p>
            </div>

            {/* Current Subscription Info */}
            <div style={{
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '25px',
              border: '1px solid #dee2e6'
            }}>
              <h4 style={{
                color: '#2A1F16',
                margin: '0 0 10px 0',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}>
                Current Subscription
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#666' }}>Valid until:</span>
                <span style={{ fontWeight: '600', color: '#2A1F16' }}>
                  {userSubscription?.subscriptionEnd ?
                    new Date(userSubscription.subscriptionEnd).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A'
                  }
                </span>
              </div>
            </div>

            {/* Extension Options */}
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{
                color: '#2A1F16',
                margin: '0 0 15px 0',
                fontSize: '1.1rem',
                fontWeight: '600'
              }}>
                Choose Extension Period
              </h4>

              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { package: 'ONE_MONTH', label: '1 Month Extension', price: '₹349', duration: '1 month' },
                  { package: 'SIX_MONTHS', label: '6 Months Extension', price: '₹899', duration: '6 months' },
                  { package: 'ONE_YEAR', label: '1 Year Extension', price: '₹1299', duration: '12 months' }
                ].map((option) => (
                  <div
                    key={option.package}
                    style={{
                      border: '2px solid #e9ecef',
                      borderRadius: '12px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#28a745';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e9ecef';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    onClick={() => handleExtendSubscription(option.package)}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h5 style={{
                          margin: '0 0 4px 0',
                          color: '#2A1F16',
                          fontSize: '1.1rem',
                          fontWeight: '600'
                        }}>
                          {option.label}
                        </h5>
                        <p style={{
                          margin: '0',
                          color: '#666',
                          fontSize: '0.9rem'
                        }}>
                          {option.duration}
                        </p>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #28a745, #20c997)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '1rem',
                        fontWeight: '700'
                      }}>
                        {option.price}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits Reminder */}
            <div style={{
              background: 'linear-gradient(135deg, #e8f5e8 0%, #d4edda 100%)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '25px',
              border: '1px solid #c3e6cb'
            }}>
              <h5 style={{
                color: '#155724',
                margin: '0 0 10px 0',
                fontSize: '1rem',
                fontWeight: '600'
              }}>
                ✅ What you'll keep:
              </h5>
              <ul style={{
                color: '#155724',
                margin: '0',
                paddingLeft: '20px',
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}>
                <li>Unlimited book requests</li>
                <li>Access to premium books</li>
                <li>Priority processing</li>
                <li>Extended borrowing periods</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowExtensionModal(false)}
                style={{
                  padding: '12px 24px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#5a6268';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#6c757d';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProMembership;
