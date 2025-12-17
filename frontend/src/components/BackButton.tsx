// src/components/BackButton.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  customPath?: string;
  label?: string;
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  customPath,
  label = "Back",
  className = ""
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (customPath) {
      navigate(customPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      onClick={handleBack}
      className={className}
      style={{
        background: "linear-gradient(135deg, #8B4513 0%, #442D1C 100%)",
        color: "#F4E4BC",
        border: "1.5px solid rgba(232, 209, 167, 0.3)",
        borderRadius: "10px",
        padding: "10px 18px",
        cursor: "pointer",
        fontSize: "0.95rem",
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.3s ease",
        boxShadow: "0 2px 10px rgba(139, 69, 19, 0.2)",
        marginBottom: "15px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "linear-gradient(135deg, #754219 0%, #3A2415 100%)";
        e.currentTarget.style.borderColor = "rgba(232, 209, 167, 0.5)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 15px rgba(139, 69, 19, 0.3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "linear-gradient(135deg, #8B4513 0%, #442D1C 100%)";
        e.currentTarget.style.borderColor = "rgba(232, 209, 167, 0.3)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 10px rgba(139, 69, 19, 0.2)";
      }}
    >
      <span style={{ fontSize: "1.1rem" }}>⬅️</span>
      {label}
    </button>
  );
};

export default BackButton;
