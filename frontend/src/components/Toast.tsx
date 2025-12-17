import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Show the toast
    setIsVisible(true);

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      // eslint-disable-next-line react-hooks/immutability
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsRemoving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300); // Wait for exit animation
  };

  const getToastStyles = () => {
    const baseStyles: React.CSSProperties = {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 10000,
      padding: '16px 20px',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      minWidth: '300px',
      maxWidth: '500px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
      backdropFilter: 'blur(10px)',
      transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      border: '1px solid rgba(255,255,255,0.2)',
    };

    const typeStyles = {
      success: {
        background: 'linear-gradient(135deg, rgba(46, 204, 113, 0.9), rgba(39, 174, 96, 0.9))',
        color: '#ffffff',
        borderColor: 'rgba(46, 204, 113, 0.3)',
      },
      error: {
        background: 'linear-gradient(135deg, rgba(231, 76, 60, 0.9), rgba(192, 57, 43, 0.9))',
        color: '#ffffff',
        borderColor: 'rgba(231, 76, 60, 0.3)',
      },
      warning: {
        background: 'linear-gradient(135deg, rgba(243, 156, 18, 0.9), rgba(230, 126, 34, 0.9))',
        color: '#ffffff',
        borderColor: 'rgba(243, 156, 18, 0.3)',
      },
      info: {
        background: 'linear-gradient(135deg, rgba(52, 152, 219, 0.9), rgba(41, 128, 185, 0.9))',
        color: '#ffffff',
        borderColor: 'rgba(52, 152, 219, 0.3)',
      },
    };

    const visibilityStyles = isVisible ? {
      opacity: isRemoving ? 0 : 1,
      transform: isRemoving ? 'translateX(100%)' : 'translateX(0)',
    } : {
      opacity: 0,
      transform: 'translateX(100%)',
    };

    return {
      ...baseStyles,
      ...typeStyles[type],
      ...visibilityStyles,
    };
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  return (
    <div
      style={getToastStyles()}
      onClick={handleClose}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = isRemoving ? 'translateX(100%)' : 'translateX(-4px) scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = isRemoving ? 'translateX(100%)' : 'translateX(0) scale(1)';
      }}
    >
      <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>
        {getIcon()}
      </span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>
        {message}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: '1.2rem',
          padding: '0',
          marginLeft: '8px',
          opacity: 0.8,
          transition: 'opacity 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
      >
        ✕
      </button>
    </div>
  );
};

export default Toast;
