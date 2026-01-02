// src/components/InputField.tsx
import React, { useState } from "react";

type Props = {
  label?: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  icon?: string;
  disabled?: boolean;
};

export default function InputField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  error,
  icon,
  disabled = false
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(value.length > 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e);
    setHasValue(e.target.value.length > 0);
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  return (
    <div className="input-field-container" style={{ marginBottom: 16, position: 'relative' }}>
      {label && (
        <label
          className={`input-label ${isFocused || hasValue ? 'active' : ''}`}
          style={{
            display: "block",
            marginBottom: 6,
            fontSize: "1.1rem",
            fontWeight: 600,
            color: isFocused ? "#9A5B34" : "#442D1C",
            transition: "all 0.3s ease",
            transform: isFocused || hasValue ? "translateY(-2px)" : "translateY(0)",
          }}
        >
          {label} {required && <span style={{ color: "#ff4757" }}>*</span>}
        </label>
      )}

      <div
        className={`input-wrapper ${isFocused ? 'focused' : ''} ${error ? 'error' : ''} ${disabled ? 'disabled' : ''}`}
        style={{
          position: 'relative',
          width: '75%',
          maxWidth: '400px',
          transition: 'all 0.3s ease',
        }}
      >
        {icon && (
          <div
            className="input-icon"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '1.2rem',
              color: isFocused ? '#9A5B34' : '#8B7355',
              transition: 'color 0.3s ease',
              zIndex: 2,
            }}
          >
            {icon}
          </div>
        )}

        <input
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`enhanced-input ${isFocused ? 'focused' : ''} ${error ? 'error' : ''}`}
          style={{
            width: "100%",
            padding: `16px ${icon ? '16px 16px 16px 45px' : '16px'}`,
            borderRadius: "12px",
            border: `2px solid ${error ? '#ff4757' : isFocused ? '#9A5B34' : '#E8D1A7'}`,
            background: disabled ? '#f8f9fa' : '#ffffff',
            color: "#442D1C",
            fontSize: "1.1rem",
            fontWeight: 500,
            outline: "none",
            transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            boxShadow: isFocused
              ? "0 0 0 3px rgba(154, 91, 52, 0.1)"
              : "0 2px 8px rgba(0,0,0,0.05)",
          }}
        />

        {type === 'password' && (
          <button
            type="button"
            className="password-toggle"
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#8B7355',
              fontSize: '1.2rem',
              padding: '4px',
              borderRadius: '4px',
              transition: 'color 0.3s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#9A5B34')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8B7355')}
          >
            👁️
          </button>
        )}
      </div>

      {error && (
        <div
          className="input-error"
          style={{
            color: "#ff4757",
            fontSize: "0.9rem",
            marginTop: "6px",
            animation: "shake 0.3s ease-in-out",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Success indicator for valid input */}
      {!error && hasValue && (
        <div
          className="input-success"
          style={{
            position: 'absolute',
            right: '-25px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#10ac84',
            fontSize: '1.1rem',
            opacity: 0.8,
          }}
        >
          ✓
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .enhanced-input {
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .input-field-container:hover .input-wrapper {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .input-field-container:hover .input-wrapper input {
          border-color: ${error ? '#ff4757' : '#C19A6B'} !important;
        }

        .password-toggle:hover {
          background: rgba(154, 91, 52, 0.1) !important;
        }
      `
      }} />
    </div>
  );
}
