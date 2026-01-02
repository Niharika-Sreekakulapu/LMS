import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getSubscriptionStatus, activateSubscription, extendSubscription, createIssueRequest, searchBooksDTO } from '../../api/libraryApi';
import type { Book } from '../../types/dto';

const StudentMembershipRequests: React.FC = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    membershipType: 'NORMAL' | 'PREMIUM';
    isPremium: boolean;
    subscriptionPackage?: string;
    subscriptionStart?: string;
    subscriptionEnd?: string;
  } | null>(null);
  const [premiumBooks, setPremiumBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [activating, setActivating] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<'ONE_MONTH' | 'SIX_MONTHS' | 'ONE_YEAR' | null>(null);
  const [requestingBook, setRequestingBook] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'subscription' | 'books'>('subscription');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [extendingSubscription, setExtendingSubscription] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestingBookData, setRequestingBookData] = useState<Book | null>(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const { auth } = useAuth();
  const currentMembership = subscriptionStatus?.membershipType || 'NORMAL';

  const packages = [
    {
      id: 'ONE_MONTH',
      name: '1 Month Premium',
      duration: 1,
      price: 349,
      color: '#007bff',
      features: [
        'Unlimited book requests',
        'Premium books access',
        'Priority support',
        'Extended borrowing duration',
        'Access to new arrivals'
      ]
    },
    {
      id: 'SIX_MONTHS',
      name: '6 Months Premium',
      duration: 6,
      price: 899,
      color: '#28a745',
      features: [
        'All features from 1 Month Plan',
        'Exclusive member events',
        'Personalized recommendations',
        'Early access to popular books',
        'Advanced search features'
      ],
      recommended: true
    },
    {
      id: 'ONE_YEAR',
      name: '1 Year Premium',
      duration: 12,
      price: 1299,
      color: '#6f42c1',
      features: [
        'All features from 6 Month Plan',
        'VIP member status',
        'Dedicated librarian support',
        'Exclusive premium collections',
        'Annual member rewards'
      ]
    }
  ];

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  useEffect(() => {
    if (currentMembership === 'PREMIUM' && activeTab === 'books') {
      loadPremiumBooks();
    }
  }, [currentMembership, activeTab]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const response = await getSubscriptionStatus();
      setSubscriptionStatus(response.data);
    } catch (error) {
      console.error('Error loading subscription status:', error);
      showToast('error', 'Failed to load subscription status');
    } finally {
      setLoading(false);
    }
  };

  const loadPremiumBooks = async () => {
    if (currentMembership !== 'PREMIUM') return;

    try {
      setLoadingBooks(true);
      const response = await searchBooksDTO({
        available: true
      });

      // Filter to only show premium books (case-insensitive)
      const premiumBooks = response.data.filter((book: Book) =>
        book.accessLevel && book.accessLevel.toUpperCase() === 'PREMIUM'
      );
      setPremiumBooks(premiumBooks);
    } catch (error) {
      console.error('Error loading premium books:', error);
      showToast('error', 'Failed to load premium books');
    } finally {
      setLoadingBooks(false);
    }
  };



  const handlePurchasePackage = async (packageId: 'ONE_MONTH' | 'SIX_MONTHS' | 'ONE_YEAR') => {
    if (!selectedPackage) {
      setSelectedPackage(packageId);
      setShowPaymentModal(true);
      return;
    }

    // Confirm payment and activate
    setActivating(true);
    try {
      await activateSubscription(packageId);
      setSubscriptionStatus({ membershipType: 'PREMIUM', isPremium: true });
      setShowPaymentModal(false);
      setSelectedPackage(null);
      showToast('success', 'Premium subscription activated successfully!');
    } catch (error) {
      console.error('Error activating subscription:', error);
      showToast('error', 'Failed to activate subscription. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  const handleTabChange = (tab: 'subscription' | 'books') => {
    setActiveTab(tab);
    if (tab === 'books' && currentMembership === 'PREMIUM') {
      loadPremiumBooks();
    }
  };

  const handleExtendSubscription = async (packageName: string) => {
    if (extendingSubscription) return;

    setExtendingSubscription(packageName);
    try {
      await extendSubscription(packageName as 'ONE_MONTH' | 'SIX_MONTHS' | 'ONE_YEAR');

      // Refresh subscription status
      await loadSubscriptionStatus();

      // Close modal and show success message
      setShowExtensionModal(false);
      showToast('success', 'Membership extended successfully! Your premium benefits have been renewed.');

    } catch (error: unknown) {
      console.error('Error extending subscription:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError.response?.data?.message || 'Failed to extend membership';
      showToast('error', errorMessage);
    } finally {
      setExtendingSubscription(null);
    }
  };

  const confirmRequestBook = async () => {
    if (!requestingBookData) return;

    setRequestingBook(requestingBookData.id);
    setShowRequestModal(false);
    setRequestingBookData(null);

    try {
      await createIssueRequest(requestingBookData.id);

      // Refresh data
      await loadPremiumBooks();

      // Show success toast
      setToastMessage({ type: 'success', message: 'Premium book request submitted successfully! Enjoy extended borrowing benefits.' });
      setTimeout(() => setToastMessage(null), 5000);

    } catch (error: unknown) {
      console.error('Error requesting book:', error);
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
      setRequestingBook(null);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
          <div style={{ fontSize: '1.2rem', color: '#666' }}>
            Loading your subscription status...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#F9F6F0',
      borderRadius: '12px',
      padding: '20px'
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
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
        }}>
          {toastMessage.message}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{
          color: '#2A1F16',
          margin: '0 0 8px 0',
          fontSize: '2rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          💎 Premium Subscription
        </h1>
        <p style={{
          color: '#666',
          fontSize: '0.95rem',
          margin: '0',
          lineHeight: '1.5'
        }}>
          {currentMembership === 'PREMIUM'
            ? 'Enjoy your premium benefits! Access exclusive features and unlimited book requests.'
            : 'Choose a premium plan to unlock unlimited book requests and exclusive access.'
          }
        </p>

        {/* Current Membership Status */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '12px',
          padding: '8px 16px',
          background: currentMembership === 'PREMIUM' ? '#e8f5e8' : '#fdf2e1',
          border: `1px solid ${currentMembership === 'PREMIUM' ? '#4caf50' : '#f97316'}`,
          borderRadius: '20px',
          fontSize: '0.9rem',
          fontWeight: '600'
        }}>
          <span>Current Status:</span>
          <span style={{
            color: currentMembership === 'PREMIUM' ? '#2e7d32' : '#f97316'
          }}>
            {currentMembership}
          </span>
        </div>
      </div>

      {/* Premium Members - Tab Navigation */}
      {currentMembership === 'PREMIUM' && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #e9ecef'
          }}>
            <button
              onClick={() => setActiveTab('subscription')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'subscription' ? '#007bff' : '#f8f9fa',
                color: activeTab === 'subscription' ? 'white' : '#6c757d',
                border: 'none',
                borderBottom: activeTab === 'subscription' ? '3px solid #0056b3' : 'none',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              📊 Subscription Status
            </button>
            <button
              onClick={() => handleTabChange('books')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'books' ? '#007bff' : '#f8f9fa',
                color: activeTab === 'books' ? 'white' : '#6c757d',
                border: 'none',
                borderBottom: activeTab === 'books' ? '3px solid #0056b3' : 'none',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              👑 Premium Books
            </button>
          </div>
        </div>
      )}

      {/* Subscription Selection */}
      {activeTab === 'subscription' && (
        <>
          {currentMembership === 'PREMIUM' ? (
            /* Current Premium Status */
            <div style={{
              background: 'linear-gradient(135deg, #fff8e1 0%, #fefae0 100%)',
              borderRadius: '20px',
              padding: '40px',
              border: '3px solid #fbbf24',
              boxShadow: '0 8px 32px rgba(251, 191, 36, 0.15)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative elements */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                borderRadius: '50%',
                opacity: 0.1
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '-30px',
                left: '-30px',
                width: '120px',
                height: '120px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                borderRadius: '50%',
                opacity: 0.08
              }}></div>

              {/* Premium badge */}
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                ✨ ACTIVE PREMIUM
              </div>

              {/* Header section */}
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{
                  fontSize: '5rem',
                  marginBottom: '15px',
                  textShadow: '0 2px 10px rgba(251, 191, 36, 0.3)'
                }}>👑</div>
                <h2 style={{
                  color: '#92400e',
                  margin: '0 0 10px 0',
                  fontSize: '2.2rem',
                  fontWeight: '700',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  Premium Member
                </h2>
                <p style={{
                  color: '#a16207',
                  fontSize: '1.1rem',
                  margin: '0',
                  fontWeight: '500',
                  maxWidth: '500px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  Welcome back, {auth.user?.name || 'Valued Member'}! Your premium benefits are active and ready to use.
                </p>
              </div>

              {/* Subscription info and benefits in a grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '30px',
                marginBottom: '30px'
              }}>
                {/* Subscription Details */}
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '25px',
                  border: '2px solid #fef3c7',
                  boxShadow: '0 4px 16px rgba(251, 191, 36, 0.1)'
                }}>
                  <h3 style={{
                    color: '#92400e',
                    margin: '0 0 20px 0',
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    📋 Subscription Details
                  </h3>
                  <div style={{ display: 'space-y-3' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid #fef3c7'
                    }}>
                      <span style={{ color: '#a16207', fontWeight: '500' }}>Status:</span>
                      <span style={{
                        color: '#16a34a',
                        fontWeight: '700',
                        background: '#dcfce7',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.9rem'
                      }}>ACTIVE</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: '1px solid #fef3c7'
                    }}>
                      <span style={{ color: '#a16207', fontWeight: '500' }}>Valid Until:</span>
                      <span style={{
                        color: '#92400e',
                        fontWeight: '700',
                        fontSize: '0.95rem'
                      }}>
                        {subscriptionStatus?.subscriptionEnd ?
                          new Date(subscriptionStatus.subscriptionEnd).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'
                        }
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0'
                    }}>
                      <span style={{ color: '#a16207', fontWeight: '500' }}>Package:</span>
                      <span style={{
                        color: '#92400e',
                        fontWeight: '700',
                        fontSize: '0.95rem'
                      }}>
                        {subscriptionStatus?.subscriptionPackage ?
                          subscriptionStatus.subscriptionPackage.replace('_', ' ') : 'Premium'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '25px',
                  border: '2px solid #fef3c7',
                  boxShadow: '0 4px 16px rgba(251, 191, 36, 0.1)'
                }}>
                  <h3 style={{
                    color: '#92400e',
                    margin: '0 0 20px 0',
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🌟 Your Benefits
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '12px'
                  }}>
                    {[
                      { icon: '📚', text: 'Unlimited Requests' },
                      { icon: '💎', text: 'Premium Books Access' },
                      { icon: '⚡', text: 'Priority Processing' },
                      { icon: '⏰', text: 'Extended Periods' }
                    ].map((benefit, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 0'
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>{benefit.icon}</span>
                        <span style={{
                          color: '#92400e',
                          fontWeight: '500',
                          fontSize: '0.95rem'
                        }}>{benefit.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Extension Section */}
              <div style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                borderRadius: '16px',
                padding: '30px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  right: '0',
                  bottom: '0',
                  background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                  opacity: 0.3
                }}></div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <h3 style={{
                    color: 'white',
                    margin: '0 0 15px 0',
                    fontSize: '1.6rem',
                    fontWeight: '700'
                  }}>
                    🔄 Ready to Extend Your Premium Journey?
                  </h3>
                  <p style={{
                    color: '#dcfce7',
                    margin: '0 0 25px 0',
                    fontSize: '1rem',
                    lineHeight: '1.5'
                  }}>
                    Keep enjoying all your premium benefits without interruption. Choose your extension period below.
                  </p>

                  <button
                    onClick={() => setShowExtensionModal(true)}
                    style={{
                      background: 'white',
                      color: '#16a34a',
                      border: 'none',
                      borderRadius: '30px',
                      padding: '16px 40px',
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.3s ease',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🔄</span>
                    Extend Membership Now
                    <span style={{ fontSize: '1.2rem' }}>→</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Subscription Plans */
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              border: '1px solid #E8D1A7',
              boxShadow: '0 4px 15px rgba(154,91,52,0.1)'
            }}>
              <h2 style={{
                color: '#2A1F16',
                margin: '0 0 20px 0',
                textAlign: 'center',
                fontSize: '1.8rem',
                fontWeight: '600'
              }}>
                Choose Your Premium Plan
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
              }}>
                {packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    style={{
                      border: `2px solid ${selectedPackage === pkg.id ? pkg.color : '#e9ecef'}`,
                      borderRadius: '12px',
                      padding: '25px',
                      cursor: 'pointer',
                      background: selectedPackage === pkg.id ? `${pkg.color}10` : 'white',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      ...(pkg.recommended ? {
                        transform: 'scale(1.02)',
                        boxShadow: `0 8px 25px ${pkg.color}30`
                      } : {})
                    }}
                    onClick={() => setSelectedPackage(pkg.id as 'ONE_MONTH' | 'SIX_MONTHS' | 'ONE_YEAR')}
                  >
                    {pkg.recommended && (
                      <div style={{
                        position: 'absolute',
                        top: '-10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: pkg.color,
                        color: 'white',
                        padding: '5px 15px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        boxShadow: `0 2px 8px ${pkg.color}50`
                      }}>
                        MOST POPULAR
                      </div>
                    )}

                    <div style={{
                      textAlign: 'center',
                      marginBottom: '20px'
                    }}>
                      <h3 style={{
                        color: pkg.color,
                        margin: '0 0 10px 0',
                        fontSize: '1.5rem',
                        fontWeight: '700'
                      }}>
                        {pkg.name}
                      </h3>
                      <div style={{
                        fontSize: '2.5rem',
                        fontWeight: '800',
                        color: pkg.color,
                        marginBottom: '5px'
                      }}>
                        ₹{pkg.price}
                      </div>
                      <div style={{
                        color: '#666',
                        fontSize: '0.9rem'
                      }}>
                        per {pkg.duration} month{pkg.duration > 1 ? 's' : ''}
                      </div>
                    </div>

                    <ul style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      lineHeight: '1.8'
                    }}>
                      {pkg.features.map((feature, index) => (
                        <li key={index} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '0.9rem',
                          color: '#555'
                        }}>
                          <span style={{ color: '#28a745' }}>✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {selectedPackage === pkg.id && (
                      <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        background: pkg.color,
                        color: 'white',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontWeight: '600'
                      }}>
                        Selected Package
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedPackage && (
                <div style={{
                  textAlign: 'center'
                }}>
                  <button
                    onClick={() => handlePurchasePackage(selectedPackage)}
                    disabled={activating}
                    style={{
                      background: packages.find(p => p.id === selectedPackage)?.color || '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '16px 40px',
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      cursor: activating ? 'not-allowed' : 'pointer',
                      opacity: activating ? 0.6 : 1,
                      transition: 'all 0.3s ease',
                      boxShadow: `0 4px 15px ${packages.find(p => p.id === selectedPackage)?.color}50`
                    }}
                    onMouseEnter={(e) => {
                      if (!activating) {
                        const pkg = packages.find(p => p.id === selectedPackage);
                        e.currentTarget.style.boxShadow = `0 6px 20px ${pkg?.color}70`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!activating) {
                        const pkg = packages.find(p => p.id === selectedPackage);
                        e.currentTarget.style.boxShadow = `0 4px 15px ${pkg?.color}50`;
                      }
                    }}
                  >
                    {activating ? '🔄 Processing Payment...' :
                     `💳 Purchase ${packages.find(p => p.id === selectedPackage)?.name} - ₹${packages.find(p => p.id === selectedPackage)?.price}`}
                  </button>

                  <p style={{
                    color: '#666',
                    fontSize: '0.9rem',
                    marginTop: '15px'
                  }}>
                    Payment processing will be integrated in a future update. For now, this will directly activate your premium membership.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Premium Books Tab */}
      {activeTab === 'books' && currentMembership === 'PREMIUM' && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '30px',
          border: '1px solid #E8D1A7',
          boxShadow: '0 4px 15px rgba(154,91,52,0.1)'
        }}>
          <h3 style={{
            color: '#2A1F16',
            margin: '0 0 20px 0',
            fontSize: '1.4rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            👑 Premium Books Collection
          </h3>

          {loadingBooks ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📚</div>
              <div>Loading premium books...</div>
            </div>
          ) : premiumBooks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.7 }}>🎁</div>
              <h4>Premium Collection Coming Soon!</h4>
              <p style={{ color: '#666', marginTop: '10px' }}>
                We're curating an exclusive collection of premium books just for our valued members.
                Stay tuned for updates!
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {premiumBooks.map((book) => (
                <div key={book.id} style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '2px solid #fbbf24',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 4px 10px rgba(251,191,36,0.2)',
                  transition: 'transform 0.3s ease'
                }}>
                  <div style={{
                    display: 'flex',
                    gap: '15px',
                    alignItems: 'start'
                  }}>
                    <div style={{ fontSize: '2.5rem', color: '#92400e' }}>
                      📖
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        color: '#92400e',
                        margin: '0 0 8px 0',
                        fontSize: '1.1rem',
                        fontWeight: '600'
                      }}>
                        {book.title}
                      </h4>
                      <p style={{
                        color: '#d97706',
                        margin: '0 0 8px 0',
                        fontSize: '0.9rem'
                      }}>
                        by {book.author}
                      </p>
                      <div style={{
                        color: '#78350f',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        marginBottom: '10px'
                      }}>
                        {book.genre} • ISBN: {book.isbn}
                      </div>
                      <div style={{
                        color: book.availableCopies && book.availableCopies > 0 ? '#28a745' : '#dc3545',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        marginBottom: '15px'
                      }}>
                        {book.availableCopies}/{book.totalCopies} copies available
                      </div>

                      <button
                        onClick={() => {
                          console.log('Opening request modal for book:', book.title);
                          setRequestingBookData(book);
                          setShowRequestModal(true);
                        }}
                        disabled={!(book.availableCopies && book.availableCopies > 0) || requestingBook === book.id}
                        style={{
                          background: book.availableCopies && book.availableCopies > 0 ? '#28a745' : '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 20px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: book.availableCopies && book.availableCopies > 0 ? 'pointer' : 'not-allowed',
                          opacity: requestingBook === book.id ? 0.6 : 1,
                          width: '100%'
                        }}
                      >
                        {requestingBook === book.id ? '🚀 Requesting...' :
                         !(book.availableCopies && book.availableCopies > 0) ? '❌ Unavailable' : '⭐ Request Premium Book'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPackage && (
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
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            <div style={{
              background: packages.find(p => p.id === selectedPackage)?.color || '#007bff',
              padding: '20px',
              color: 'white',
              textAlign: 'center'
            }}>
              <h2 style={{ margin: '0', fontSize: '1.5rem' }}>Complete Your Purchase</h2>
            </div>

            <div style={{ padding: '30px' }}>
              <div style={{
                textAlign: 'center',
                marginBottom: '30px'
              }}>
                <div style={{
                  fontSize: '3rem',
                  marginBottom: '15px'
                }}>💳</div>
                <h3 style={{
                  color: '#2A1F16',
                  margin: '0 0 10px 0'
                }}>
                  {packages.find(p => p.id === selectedPackage)?.name}
                </h3>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '800',
                  color: packages.find(p => p.id === selectedPackage)?.color || '#007bff'
                }}>
                  ₹{packages.find(p => p.id === selectedPackage)?.price}
                </div>
              </div>

              <div style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '25px'
              }}>
                <h4 style={{
                  color: '#2A1F16',
                  margin: '0 0 15px 0',
                  fontSize: '1.1rem'
                }}>
                  What you get:
                </h4>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  lineHeight: '1.6'
                }}>
                  {(packages.find(p => p.id === selectedPackage)?.features || []).map((feature, index) => (
                    <li key={index} style={{ color: '#555' }}>{feature}</li>
                  ))}
                </ul>
              </div>

              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '25px'
              }}>
                <p style={{
                  margin: 0,
                  color: '#856404',
                  fontSize: '0.9rem',
                  textAlign: 'center'
                }}>
                  <strong>Note:</strong> Payment integration will be added in a future update.
                  Clicking "Complete Purchase" will activate your premium subscription.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPackage(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handlePurchasePackage(selectedPackage)}
                  disabled={activating}
                  style={{
                    flex: 2,
                    padding: '12px',
                    background: packages.find(p => p.id === selectedPackage)?.color || '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: activating ? 'not-allowed' : 'pointer',
                    opacity: activating ? 0.6 : 1,
                    fontSize: '0.95rem',
                    fontWeight: '600'
                  }}
                >
                  {activating ? 'Processing...' : 'Complete Purchase & Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extension Modal */}
      {showExtensionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '95%',
            maxHeight: '85vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            position: 'relative',
            border: '2px solid #fbbf24'
          }}>
            {/* Decorative Background Elements */}
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              borderRadius: '50%',
              opacity: 0.1
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '-25px',
              left: '-25px',
              width: '70px',
              height: '70px',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              borderRadius: '50%',
              opacity: 0.1
            }}></div>

            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              padding: '25px 20px',
              textAlign: 'center',
              position: 'relative',
              color: 'white',
              borderRadius: '18px 18px 0 0'
            }}>
              <div style={{
                position: 'absolute',
                top: '-15px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                color: 'white',
                boxShadow: '0 4px 15px rgba(251, 191, 36, 0.4)',
                border: '3px solid white'
              }}>
                🔄
              </div>
              <h2 style={{
                margin: '15px 0 8px 0',
                fontSize: '1.6rem',
                fontWeight: '800',
                textShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }}>
                Extend Your Premium Journey
              </h2>
              <p style={{
                margin: '0',
                fontSize: '0.95rem',
                opacity: 0.9,
                fontWeight: '500'
              }}>
                Keep enjoying all your premium benefits without interruption
              </p>
            </div>

            <div style={{ padding: '15px' }}>
              {/* Current Subscription Info */}
              <div style={{
                background: 'linear-gradient(135deg, #fff8e1 0%, #fefae0 100%)',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '20px',
                border: '2px solid #fbbf24',
                boxShadow: '0 4px 16px rgba(251, 191, 36, 0.15)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    fontSize: '1.5rem',
                    color: '#f59e0b'
                  }}>📋</div>
                  <h4 style={{
                    color: '#92400e',
                    margin: '0',
                    fontSize: '1.1rem',
                    fontWeight: '700'
                  }}>
                    Current Subscription
                  </h4>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ color: '#a16207', fontSize: '0.9rem' }}>Valid Until:</span>
                  <span style={{
                    color: '#92400e',
                    fontSize: '0.95rem',
                    fontWeight: '700'
                  }}>
                    {subscriptionStatus?.subscriptionEnd ?
                      new Date(subscriptionStatus.subscriptionEnd).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'N/A'
                    }
                  </span>
                </div>
              </div>

              {/* Extension Options */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{
                  color: '#2A1F16',
                  margin: '0 0 15px 0',
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  textAlign: 'center'
                }}>
                  Choose Your Extension Period
                </h4>

                <div style={{
                  display: 'grid',
                  gap: '12px',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'
                }}>
                  {[
                    {
                      package: 'ONE_MONTH',
                      label: '1 Month',
                      price: '₹349',
                      duration: '30 days',
                      color: '#007bff',
                      popular: false
                    },
                    {
                      package: 'SIX_MONTHS',
                      label: '6 Months',
                      price: '₹899',
                      duration: '180 days',
                      color: '#28a745',
                      popular: true
                    },
                    {
                      package: 'ONE_YEAR',
                      label: '1 Year',
                      price: '₹1299',
                      duration: '365 days',
                      color: '#6f42c1',
                      popular: false
                    }
                  ].map((option) => (
                    <div
                      key={option.package}
                      style={{
                        border: `2px solid ${extendingSubscription === option.package ? option.color : '#e9ecef'}`,
                        borderRadius: '12px',
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        background: extendingSubscription === option.package ?
                          `linear-gradient(135deg, ${option.color}10, ${option.color}05)` : 'white',
                        position: 'relative',
                        transform: extendingSubscription === option.package ? 'scale(1.02)' : 'scale(1)',
                        boxShadow: extendingSubscription === option.package ?
                          `0 6px 20px ${option.color}25` : '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                      onMouseEnter={(e) => {
                        if (extendingSubscription !== option.package) {
                          e.currentTarget.style.borderColor = option.color;
                          e.currentTarget.style.boxShadow = `0 4px 15px ${option.color}20`;
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (extendingSubscription !== option.package) {
                          e.currentTarget.style.borderColor = '#e9ecef';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                      onClick={() => handleExtendSubscription(option.package)}
                    >
                      {option.popular && (
                        <div style={{
                          position: 'absolute',
                          top: '-8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: 'white',
                          padding: '3px 10px',
                          borderRadius: '15px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          🔥 Popular
                        </div>
                      )}

                      <div style={{ textAlign: 'center' }}>
                        <h5 style={{
                          margin: '0 0 3px 0',
                          color: option.color,
                          fontSize: '1.1rem',
                          fontWeight: '700'
                        }}>
                          {option.label}
                        </h5>
                        <div style={{
                          fontSize: '1.6rem',
                          fontWeight: '800',
                          color: option.color,
                          marginBottom: '3px'
                        }}>
                          {option.price}
                        </div>
                        <div style={{
                          color: '#666',
                          fontSize: '0.8rem',
                          fontWeight: '500'
                        }}>
                          {option.duration}
                        </div>

                        {extendingSubscription === option.package && (
                          <div style={{
                            marginTop: '10px',
                            padding: '8px',
                            background: option.color,
                            color: 'white',
                            borderRadius: '6px',
                            textAlign: 'center',
                            fontWeight: '600',
                            fontSize: '0.8rem',
                            animation: 'pulse 1.5s infinite'
                          }}>
                            Processing...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => setShowExtensionModal(false)}
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

              {/* Footer Note */}
              <div style={{
                textAlign: 'center',
                marginTop: '20px',
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <p style={{
                  margin: 0,
                  color: '#6c757d',
                  fontSize: '0.9rem',
                  lineHeight: '1.4'
                }}>
                  <strong>💳 Secure Payment:</strong> Your extension will be processed immediately.
                  Payment integration coming soon for a seamless experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Confirmation Modal - Matching StudentHome.tsx style */}
      {showRequestModal && requestingBookData && (
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
                  lineHeight: '1.2'
                }}>
                  {requestingBookData.title}
                </h1>
                <p style={{
                  fontSize: '1.1rem',
                  margin: '0',
                  opacity: 0.9,
                  fontWeight: '300'
                }}>
                  by {requestingBookData.author}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '25px', overflowY: 'auto', maxHeight: 'calc(85vh - 150px)' }}>


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
                    {(requestingBookData.availableCopies || 0) > 0 ? '🟢' : '🔴'}
                  </div>
                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    color: (requestingBookData.availableCopies || 0) > 0 ? '#28a745' : '#dc3545'
                  }}>
                    {requestingBookData.availableCopies}
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
                    {requestingBookData.totalCopies}
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
                  {requestingBookData.genre && (
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
                        {requestingBookData.genre}
                      </div>
                    </div>
                  )}

                  {requestingBookData.publisher && (
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
                        {requestingBookData.publisher}
                      </div>
                    </div>
                  )}
                </div>
              </div>


              {/* Action Section */}
              <div style={{
                display: 'flex',
                gap: '15px',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <button
                  onClick={confirmRequestBook}
                  disabled={requestingBook === requestingBookData.id}
                  style={{
                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '15px 25px',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    cursor: requestingBook === requestingBookData.id ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 15px rgba(40,167,69,0.3)',
                    opacity: requestingBook === requestingBookData.id ? 0.6 : 1,
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    flex: 2
                  }}
                  onMouseEnter={(e) => {
                    if (requestingBook !== requestingBookData.id) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(40,167,69,0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(40,167,69,0.3)';
                  }}
                >
                  {requestingBook === requestingBookData.id ? (
                    <>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Processing Request...
                    </>
                  ) : (
                    <>
                      ⭐ Confirm Premium Book Request
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setRequestingBookData(null);
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

              <div style={{
                color: '#28a745',
                fontSize: '0.9rem',
                textAlign: 'center',
                fontWeight: '500',
                marginTop: '15px'
              }}>
                ✅ Your premium request will be processed with priority!
              </div>
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

export default StudentMembershipRequests;
