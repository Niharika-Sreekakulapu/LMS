import React, { useState } from "react";
import axios from "axios";
import { forgotPassword } from "../api/authApi";
// We will use a custom styled back button inside the layout to match the theme
import { useNavigate } from "react-router-dom";
import loginImage from "../assets/login.jpg";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const resp = await forgotPassword({ email });
      setMsg(resp.data?.message || "If the email exists, a reset link was sent.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setErr(err.response?.data?.message || err.message || "Failed to send reset email");
      } else if (err instanceof Error) {
        setErr(err.message);
      } else {
        setErr("Failed to send reset email");
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
        
        .fp-container {
          display: flex;
          min-height: 100vh;
          width: 100%;
          font-family: 'Inter', sans-serif;
          background-color: #FAF9F6; /* Cream background */
        }

        /* LEFT SIDE: IMAGE */
        .fp-image-section {
          flex: 1;
          background-image: url(${loginImage});
          background-size: cover;
          background-position: center;
          position: relative;
        }

        .fp-image-overlay {
          position: absolute;
          inset: 0;
          background: rgba(74, 51, 40, 0.2); /* Slight brown tint */
        }

        /* RIGHT SIDE: CONTENT */
        .fp-content-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          background-color: #FAF9F6;
        }

        /* WHITE CARD */
        .fp-card {
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
        .fp-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.2rem;
          color: #4A3328; /* Deep Brown */
          margin-bottom: 15px;
          font-weight: 700;
        }

        .fp-subtitle {
          font-size: 0.95rem;
          color: #6D4C41;
          margin-bottom: 30px;
          line-height: 1.5;
        }

        /* INPUTS */
        .fp-input-group {
          margin-bottom: 20px;
          text-align: left;
        }

        .fp-input {
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

        .fp-input:focus {
          border-color: #B8860B; /* Gold focus */
          box-shadow: 0 0 0 3px rgba(184, 134, 11, 0.1);
        }

        /* BUTTONS */
        .fp-submit-btn {
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

        .fp-submit-btn:hover {
          background-color: #9A7009;
          transform: translateY(-1px);
        }

        .fp-submit-btn:disabled {
          background-color: #D3C1A5;
          cursor: not-allowed;
          transform: none;
        }

        .fp-back-btn {
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

        .fp-back-btn:hover {
          color: #B8860B;
          text-decoration: underline;
        }

        /* ALERTS */
        .fp-alert {
          margin-top: 15px;
          padding: 12px;
          border-radius: 10px;
          font-size: 0.9rem;
        }
        .fp-success { background-color: #E8F5E9; color: #2E7D32; border: 1px solid #C8E6C9; }
        .fp-error { background-color: #FFEBEE; color: #C62828; border: 1px solid #FFCDD2; }

        /* RESPONSIVE */
        @media (max-width: 850px) {
          .fp-container { flex-direction: column; }
          .fp-image-section { height: 250px; flex: none; }
          .fp-content-section { flex: 1; padding: 20px; }
          .fp-card { padding: 40px 30px; }
        }
      `}</style>

      <div className="fp-container">
        
        {/* LEFT: IMAGE */}
        <div className="fp-image-section">
          <div className="fp-image-overlay" />
        </div>

        {/* RIGHT: CONTENT */}
        <div className="fp-content-section">
          <div className="fp-card">
            
            <h1 className="fp-title">Reset Password</h1>
            <p className="fp-subtitle">
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </p>

            <form onSubmit={submit}>
              <div className="fp-input-group">
                <input
                  className="fp-input"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="fp-submit-btn" disabled={loading}>
                {loading ? "Sending..." : "📩 Send Reset Link"}
              </button>
            </form>

            <button 
              className="fp-back-btn" 
              onClick={() => nav("/login")} 
            >
              ← Back to Login
            </button>

            {/* MESSAGES */}
            {msg && <div className="fp-alert fp-success">{msg}</div>}
            {err && <div className="fp-alert fp-error">{err}</div>}

          </div>
        </div>
      </div>
    </>
  );
}
