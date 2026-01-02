import React, { useState, useEffect, useContext } from 'react';
import { searchBooks, getBookDetails, createIssueRequest, getMonthlyRequestCount, getSubscriptionStatus, getRecommendations, joinWaitlist } from '../../api/libraryApi';
import { AuthContext } from '../../context/AuthContext';
import type { Book } from '../../types/dto';
import Toast from '../../components/Toast';

const StudentHome: React.FC = () => {
  const { auth } = useContext(AuthContext);
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
  const [recommendations, setRecommendations] = useState<Book[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    loadBooks();
    loadMonthlyCount();
    loadUserSubscriptionStatus();
    loadRecommendations();
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

      // Extract unique genres from all books
      const genres: string[] = response.data
        .map((book: Book) => book.genre)
        .filter((genre): genre is string => genre != null && genre !== undefined && genre.trim() !== '')
        .filter((genre, index, arr) => arr.indexOf(genre) === index) // Remove duplicates
        .sort();

      // Fallback genres if no genres found in data
      const fallbackGenres = ['Fiction', 'Non-Fiction', 'Science', 'History', 'Biography', 'Romance', 'Mystery', 'Fantasy'];
      const finalGenres = genres.length > 0 ? genres : fallbackGenres.slice(0, 5); // Use first 5 fallbacks

      console.log('📚 Books data sample:', response.data.slice(0, 3).map(b => ({ title: b.title, genre: b.genre })));
      console.log('📚 Extracted genres:', genres);
      console.log('📚 Final genres for dropdown:', finalGenres);
      setAvailableGenres(finalGenres);
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

  const loadRecommendations = async () => {
    if (!auth.user?.id) return;

    try {
      setLoadingRecommendations(true);
      const response = await getRecommendations(auth.user.id);
      setRecommendations(response.data);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoadingRecommendations(false);
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

    const book = books.find(b => b.id === bookId);
    const isAvailable = (book?.availableCopies || 0) > 0;

    setRequestingBookId(bookId);
    try {
      if (isAvailable) {
        // Book is available - use regular request API
        await createIssueRequest(bookId);
        setToastMessage({ type: 'success', message: 'Book request submitted successfully!' });
      } else {
        // Book is unavailable - join waitlist
        await joinWaitlist(bookId);
        setToastMessage({ type: 'success', message: 'Successfully joined the waitlist! You will be notified when the book becomes available.' });
      }

      // Close modal immediately and refresh data
      setShowBookModal(false);
      setSelectedBook(null);
      loadBooks();
      loadMonthlyCount();

      setTimeout(() => setToastMessage(null), 5000);

    } catch (error: unknown) {
      console.error('❌ Request error:', error);
      const axiosError = error as {
        response?: {
          status?: number;
          data?: { message?: string };
          statusText?: string;
        };
        message?: string;
      };

      console.log('Error details:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        message: axiosError.message
      });

      const errorMessage = axiosError.response?.data?.message || '';

      if (errorMessage.includes('already requested') || errorMessage.includes('already in the waitlist')) {
        setToastMessage({ type: 'error', message: 'You have already requested this book or are in the waitlist' });
      } else if (errorMessage.includes('overdue')) {
        setToastMessage({ type: 'error', message: 'Cannot request books while you have overdue items' });
      } else if (errorMessage.includes('Monthly request limit exceeded')) {
        setToastMessage({ type: 'error', message: 'Monthly request limit exceeded (3 books per month)' });
      } else {
        const status = axiosError.response?.status;
        if (status === 404) {
          setToastMessage({ type: 'error', message: 'Backend API not available. Please ensure backend is running.' });
        } else if (status === 500) {
          setToastMessage({ type: 'error', message: 'Server error. Please check backend logs.' });
        } else {
          setToastMessage({ type: 'error', message: `${isAvailable ? 'Failed to submit book request' : 'Failed to join waitlist'}: ${axiosError.message || 'Unknown error'}` });
        }
      }
      setTimeout(() => setToastMessage(null), 8000);
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
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
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

      {/* Recommended Books Section - Enhanced Premium Design */}
      {!loadingRecommendations && recommendations.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
          borderRadius: '20px',
          padding: '2px',
          marginBottom: '30px',
          boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4), 0 0 0 1px rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
          animation: 'glow 2s ease-in-out infinite alternate'
        }}>
          {/* Animated background elements */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'float 6s ease-in-out infinite'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-30px',
            left: '-30px',
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'float 8s ease-in-out infinite reverse'
          }} />
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: '60px',
            height: '60px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'float 5s ease-in-out infinite'
          }} />

          {/* Inner content container */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
            borderRadius: '18px',
            padding: '35px',
            position: 'relative',
            zIndex: 2,
            backdropFilter: 'blur(10px)'
          }}>
            {/* Premium Badge */}
            <div style={{
              position: 'absolute',
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
              color: '#333',
              padding: '8px 20px',
              borderRadius: '25px',
              fontSize: '0.9rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
              border: '2px solid rgba(255,255,255,0.8)',
              zIndex: 3
            }}>
              ✨ AI-Powered Recommendations ✨
            </div>

            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginBottom: '25px',
              marginTop: '15px'
            }}>
              <div style={{
                fontSize: '3rem',
                background: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb, #f5576c)',
                borderRadius: '50%',
                width: '80px',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
                color: 'white',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                🤖
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{
                  color: '#333',
                  margin: '0 0 8px 0',
                  fontSize: '2.2rem',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  Recommended for You
                </h2>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '8px'
                }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '15px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    🎯 Smart AI
                  </span>
                  <span style={{
                    background: 'linear-gradient(135deg, #FF9800, #F57C00)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '15px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    📊 Personalized
                  </span>
                </div>
                <p style={{
                  color: '#666',
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: '500',
                  lineHeight: '1.5'
                }}>
                  Our advanced AI analyzes your reading patterns, preferences, and borrowing history to suggest books you'll absolutely love! 📚✨
                </p>
              </div>
            </div>

            {/* Recommendations Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              {recommendations.slice(0, 8).map((book) => (
                <div
                  key={`rec-${book.id}`}
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    backdropFilter: 'blur(10px)'
                  }}
                  onClick={() => handleBookClick(book)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                    e.currentTarget.style.borderColor = '#2196f3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  }}
                >

                  {/* Book Title */}
                  <h3 style={{
                    color: '#1a1a1a',
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    margin: '0 0 8px 0',
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '38px'
                  }}>
                    {book.title}
                  </h3>

                  {/* Author and Genre in consistent layout */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginBottom: '15px',
                    minHeight: '60px'
                  }}>
                    {/* Author - always in same position */}
                    <p style={{
                      color: '#666',
                      fontSize: '0.9rem',
                      margin: '0',
                      fontStyle: 'italic',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      height: '24px',
                      lineHeight: '24px'
                    }}>
                      <span>✍️</span>
                      by {book.author}
                    </p>

                    {/* Genre Badge - always in same position */}
                    {book.genre && (
                      <span style={{
                        alignSelf: 'flex-start',
                        background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 100%)',
                        color: '#FFF8DC',
                        padding: '6px 12px',
                        borderRadius: '15px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        border: '1px solid rgba(139,69,19,0.3)',
                        height: '28px',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}>
                        {book.genre}
                      </span>
                    )}
                  </div>

                  {/* Availability */}
                  <div style={{
                    marginTop: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {getAvailabilityBadge(book)}
                    {getAccessLevelBadge(book)}
                  </div>
                </div>
              ))}
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
            {availableGenres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
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

      {/* Book Detail Modal - Redesigned */}
      {showBookModal && selectedBook && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px',
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #fefefe 100%)',
            borderRadius: '20px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '85vh',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: '2px solid rgba(139,69,19,0.1)',
            position: 'relative'
          }}>
            


            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)',
              color: 'white',
              /* Updated Padding: 
                 30px top/bottom.
                 60px left/right ensures text is centered and doesn't hit the close button.
              */
              padding: '30px 60px', 
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative background */}
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-20%',
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-30%',
                left: '-15%',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
              }} />

              <div style={{ position: 'relative', zIndex: 2 }}>
                <h1 style={{
                  fontSize: '1.8rem',
                  fontWeight: '700',
                  margin: '0 0 8px 0',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  lineHeight: '1.2' // Added line height for multi-line titles
                }}>
                  {selectedBook.title}
                </h1>
                <p style={{
                  fontSize: '1.1rem',
                  margin: '0',
                  opacity: 0.9,
                  fontWeight: '300'
                }}>
                  by {selectedBook.author}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '25px', overflowY: 'auto', maxHeight: 'calc(85vh - 150px)' }}> 
            {/* Added overflow auto here just in case content gets too long */}
            
              {/* Book Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
                marginBottom: '25px'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                  borderRadius: '12px',
                  padding: '15px',
                  textAlign: 'center',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{
                    fontSize: '2rem',
                    marginBottom: '5px'
                  }}>
                    {(selectedBook.availableCopies || 0) > 0 ? '🟢' : '🔴'}
                  </div>
                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    color: (selectedBook.availableCopies || 0) > 0 ? '#28a745' : '#dc3545'
                  }}>
                    {selectedBook.availableCopies}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#6c757d',
                    fontWeight: '500'
                  }}>
                    Available
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                  borderRadius: '12px',
                  padding: '15px',
                  textAlign: 'center',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{
                    fontSize: '2rem',
                    marginBottom: '5px'
                  }}>
                    📚
                  </div>
                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    color: '#2A1F16'
                  }}>
                    {selectedBook.totalCopies}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#6c757d',
                    fontWeight: '500'
                  }}>
                    Total Copies
                  </div>
                </div>
              </div>

              {/* Book Details */}
              <div style={{ marginBottom: '25px' }}>
                <h3 style={{
                  color: '#2A1F16',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  margin: '0 0 15px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📖 Book Information
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '15px'
                }}>
                  {selectedBook.genre && (
                    <div style={{
                      background: '#fff3e0',
                      padding: '10px 15px',
                      borderRadius: '8px',
                      border: '1px solid #ffcc02'
                    }}>
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#f57c00',
                        fontWeight: '600',
                        marginBottom: '3px'
                      }}>
                        CATEGORY
                      </div>
                      <div style={{
                        fontSize: '0.9rem',
                        color: '#2A1F16',
                        fontWeight: '500'
                      }}>
                        {selectedBook.genre}
                      </div>
                    </div>
                  )}

                  {selectedBook.publisher && (
                    <div style={{
                      background: '#f3e5f5',
                      padding: '10px 15px',
                      borderRadius: '8px',
                      border: '1px solid #ba68c8'
                    }}>
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#7b1fa2',
                        fontWeight: '600',
                        marginBottom: '3px'
                      }}>
                        PUBLISHER
                      </div>
                      <div style={{
                        fontSize: '0.9rem',
                        color: '#2A1F16',
                        fontWeight: '500'
                      }}>
                        {selectedBook.publisher}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Access Level Badge */}
              <div style={{ marginBottom: '25px' }}>
                {getAccessLevelBadge(selectedBook)}
              </div>

              {/* Action Section */}
              <div style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'center',
                alignItems: 'center'
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
                        borderRadius: '12px',
                        padding: '15px 25px',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        cursor: requestingBookId === selectedBook.id ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 15px rgba(40,167,69,0.3)',
                        opacity: requestingBookId === selectedBook.id ? 0.6 : 1,
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        flex: 2
                      }}
                      onMouseEnter={(e) => {
                        if (requestingBookId !== selectedBook.id) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(40,167,69,0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(40,167,69,0.3)';
                      }}
                    >
                      {requestingBookId === selectedBook.id ? (
                        <>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                          Processing...
                        </>
                      ) : (
                        <>
                          📖 Request This Book
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleRequestBook(selectedBook.id)}
                      disabled={requestingBookId === selectedBook.id}
                      style={{
                        background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '15px 25px',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        cursor: requestingBookId === selectedBook.id ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 15px rgba(255,152,0,0.3)',
                        opacity: requestingBookId === selectedBook.id ? 0.6 : 1,
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        flex: 2
                      }}
                      onMouseEnter={(e) => {
                        if (requestingBookId !== selectedBook.id) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,152,0,0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(255,152,0,0.3)';
                      }}
                    >
                      {requestingBookId === selectedBook.id ? (
                        <>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                          Joining Waitlist...
                        </>
                      ) : (
                        <>
                          📋 Join Waitlist
                        </>
                      )}
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowBookModal(false);
                    setSelectedBook(null);
                    setToastMessage(null);
                  }}
                  style={{
                    padding: '14px 30px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(108, 117, 125, 0.3)',
                    flex: 1,
                    maxWidth: '150px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#5a6268';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(108, 117, 125, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#6c757d';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.3)';
                  }}
                >
                  Cancel
                </button>
              </div>

              {(selectedBook.availableCopies || 0) > 0 ? (
                <div style={{
                  color: '#28a745',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  fontWeight: '500',
                  marginTop: '15px'
                }}>
                  ✅ Available now! Your request will be processed immediately.
                </div>
              ) : (
                <div style={{
                  color: '#f57c00',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  fontWeight: '500',
                  background: '#fff8e1',
                  padding: '10px 15px',
                  borderRadius: '8px',
                  border: '1px solid #ffcc02',
                  marginTop: '15px'
                }}>
                  🚫 Currently unavailable. You'll be notified when it becomes available!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add spin animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default StudentHome;
