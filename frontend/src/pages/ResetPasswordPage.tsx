import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { resetPassword } from "../api/authApi";
// We will use a custom styled back button inside the layout
// import BackButton from "../components/BackButton";
import libImage from "../assets/lib.webp";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (newPassword.length < 8) {
      setErr("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirm) {
      setErr("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token, newPassword });
      setMsg("Password reset successful. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setErr(err.response?.data?.message || err.message || "Reset failed");
      } else if (err instanceof Error) {
        setErr(err.message);
      } else {
        setErr("Reset failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');

        /* RESET & BASE */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .rp-container {
          display: flex;
          min-height: 100vh;
          width: 100%;
          font-family: 'Inter', sans-serif;
          background-color: #FAF9F6; /* Cream background */
        }

        /* LEFT SIDE: IMAGE */
        .rp-image-section {
          flex: 1;
          background-image: url(${libImage});
          background-size: cover;
          background-position: center;
          position: relative;
        }

        .rp-image-overlay {
          position: absolute;
          inset: 0;
          background: rgba(74, 51, 40, 0.2); /* Slight brown tint */
        }

        /* RIGHT SIDE: CONTENT */
        .rp-content-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          background-color: #FAF9F6;
        }

        /* WHITE CARD */
        .rp-card {
          background-color: #FFFFFF;
          padding: 60px 50px;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          width: 100%;
          max-width: 480px;
          border: 1px solid rgba(0,0,0,0.02);
          text-align: center;
        }

        /* TYPOGRAPHY */
        .rp-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.2rem;
          color: #4A3328; /* Deep Brown */
          margin-bottom: 15px;
          font-weight: 700;
        }

        .rp-subtitle {
          font-size: 0.95rem;
          color: #6D4C41;
          margin-bottom: 30px;
          line-height: 1.5;
        }

        /* INPUTS */
        .rp-input-group {
          margin-bottom: 20px;
          text-align: left;
        }

        .rp-input {
          width: 100%;
          padding: 12px 15px;
          background-color: #FAF9F6;
          border: 1px solid #8D6E63;
          border-radius: 12px;
          font-size: 1rem;
          color: #4A3328;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .rp-input:focus {
          border-color: #B8860B; /* Gold focus */
          box-shadow: 0 0 0 3px rgba(184, 134, 11, 0.1);
        }

        /* BUTTONS */
        .rp-submit-btn {
          width: 100%;
          padding: 14px;
          background-color: #B8860B; /* Solid Gold */
          color: white;
          border: none;
          border-radius: 25px; /* Pill shape */
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          margin-bottom: 20px;
        }

        .rp-submit-btn:hover {
          background-color: #9A7009;
          transform: translateY(-1px);
        }

        .rp-submit-btn:disabled {
          background-color: #D3C1A5;
          cursor: not-allowed;
          transform: none;
        }

        .rp-back-btn {
          background: none;
          border: none;
          color: #4A3328;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          transition: color 0.2s;
        }

        .rp-back-btn:hover {
          color: #B8860B;
          text-decoration: underline;
        }

        /* ALERTS */
        .rp-alert {
          margin-top: 15px;
          padding: 12px;
          border-radius: 10px;
          font-size: 0.9rem;
        }
        .rp-success { background-color: #E8F5E9; color: #2E7D32; border: 1px solid #C8E6C9; }
        .rp-error { background-color: #FFEBEE; color: #C62828; border: 1px solid #FFCDD2; }

        /* RESPONSIVE */
        @media (max-width: 850px) {
          .rp-container { flex-direction: column; }
          .rp-image-section { height: 250px; flex: none; }
          .rp-content-section { flex: 1; padding: 20px; }
          .rp-card { padding: 40px 30px; }
        }
      `}</style>

      <div className="rp-container">
        
        {/* LEFT: IMAGE */}
        <div className="rp-image-section">
          <div className="rp-image-overlay" />
        </div>

        {/* RIGHT: CONTENT */}
        <div className="rp-content-section">
          <div className="rp-card">
            
            <h1 className="rp-title">Set New Password</h1>
            <p className="rp-subtitle">
              Enter your reset token and your new secure password below.
            </p>

            <form onSubmit={submit}>
              
              {/* Token Input */}
              <div className="rp-input-group">
                <input
                  className="rp-input"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste Reset Token"
                  required
                />
              </div>

              {/* New Password */}
              <div className="rp-input-group">
                <input
                  className="rp-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password"
                  placeholder="New Password (min 8 chars)"
                  required
                />
              </div>

              {/* Confirm Password */}
              <div className="rp-input-group">
                <input
                  className="rp-input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type="password"
                  placeholder="Confirm New Password"
                  required
                />
              </div>

              <button type="submit" className="rp-submit-btn" disabled={loading}>
                {loading ? "Updating..." : "Confirm Change"}
              </button>
            </form>

            <button 
              className="rp-back-btn" 
              onClick={() => navigate("/login")} 
            >
              ← Back to Login
            </button>

            {/* MESSAGES */}
            {msg && <div className="rp-alert rp-success">{msg}</div>}
            {err && <div className="rp-alert rp-error">{err}</div>}

          </div>
        </div>
      </div>
    </>
  );
}
