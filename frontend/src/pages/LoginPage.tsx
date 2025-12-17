// src/pages/LoginPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { setBasicAuthFromToken, clearAuth, saveAuth } from "../api/axiosClient";
import axios from "axios";
import { login as loginApi } from "../api/authApi";
import { useAuth } from "../hooks/useAuth";
import libImage from "../assets/lib.webp";

type Role = "librarian" | "student" | "admin";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student"); // required for login validation
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();
  const { login } = useAuth();

  // Restore legacy token if present
  useEffect(() => {
    const storedLegacy = localStorage.getItem("basicAuth");
    if (storedLegacy) {
      // keep legacy header so old pages still work
      setBasicAuthFromToken(storedLegacy);
    }
    // axiosClient init already applies canonical token on import
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    try {
      // call backend login endpoint with selected role
      const resp = await loginApi({ email, password, role });
      const data = resp.data;

      if (!data || !data.token) {
        throw new Error("Login response missing token");
      }

      // Check user approval status before allowing login
      const userStatus = data.user?.status?.toUpperCase();

      if (userStatus === 'PENDING') {
        setErr('Your account is pending admin approval. Please wait for approval before logging in.');
        return;
      }

      if (userStatus === 'REJECTED') {
        setErr('Your account registration was rejected by the administrator. Please contact support for more information.');
        return;
      }

      if (!userStatus || userStatus !== 'APPROVED') {
        setErr('Your account status is invalid. Please contact support.');
        return;
      }

      // Only proceed if user is APPROVED
      // Update auth context (this triggers re-renders for Private routes)
      login(data.token, data.user ?? null);

      // Also persist canonical token via axiosClient for legacy compatibility
      saveAuth(data.token, data.user ?? null, data.tokenType ?? "Bearer", data.expiresAt ?? null);

      // Remove legacy basic token if present (silently)
      try {
        localStorage.removeItem("basicAuth");
      } catch (remErr) {
        console.warn("Failed to remove legacy basicAuth key", remErr);
      }

      // Role-based redirect after login
      const userRole = data.user?.role?.toUpperCase();
      if (userRole === 'ADMIN') {
        nav("/admin");
      } else if (userRole === 'LIBRARIAN') {
        nav("/library-dashboard");
      } else if (userRole === 'STUDENT') {
        nav("/student-dashboard");
      } else {
        nav("/");
      }

    } catch (error: unknown) {
      clearAuth();
      if (axios.isAxiosError(error)) {
        const serverMsg =
          (error.response && (error.response.data?.error || error.response.data?.message)) ||
          error.response?.statusText ||
          null;

        setErr((serverMsg as string) || "Invalid credentials or server error");
      } else if (error instanceof Error) {
        setErr(error.message);
      } else {
        setErr("Login failed");
      }
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');

        /* RESET & BASE */
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .lp-container {
          display: flex;
          min-height: 100vh;
          width: 100%;
          font-family: 'Inter', sans-serif;
          background-color: #F5F2EB; /* Cream background */
        }

        /* LEFT SIDE: IMAGE */
        .lp-image-section {
          flex: 1;
          /* Updated image to match the library chair/shelves vibe if possible, or keep existing */
          background-image: url(${libImage});
          background-size: cover;
          background-position: center;
          position: relative;
        }

        /* RIGHT SIDE: CONTENT */
        .lp-content-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          background-color: #F5F2EB;
        }

        /* WHITE CARD */
        .lp-card {
          background-color: #FFFFFF;
          padding: 60px 50px;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          width: 100%;
          max-width: 450px;
          border: 1px solid rgba(0,0,0,0.02);
        }

        /* TYPOGRAPHY */
        .lp-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.2rem;
          color: #3E2723; /* Dark Coffee Brown */
          margin-bottom: 30px;
          font-weight: 700;
        }

        .lp-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: #3E2723;
          margin-bottom: 6px;
          display: block;
        }

        /* FORM INPUTS */
        .lp-input-group {
          margin-bottom: 20px;
        }

        .lp-input, .lp-select {
          width: 100%;
          padding: 12px 15px;
          background-color: #F5F2EB; /* Cream input bg */
          border: 1px solid #D7CCC8;
          border-radius: 12px;
          font-size: 1rem;
          color: #3E2723;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .lp-input:focus, .lp-select:focus {
          border-color: #D7CCC8; /* Tan focus */
          box-shadow: 0 0 0 3px rgba(215, 204, 200, 0.1);
        }

        /* BUTTONS */
        .lp-submit-btn {
          width: 100%;
          padding: 14px;
          background-color: #D7CCC8; /* Tan accent */
          color: #3E2723;
          border: none;
          border-radius: 25px; /* Pill shape */
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
          margin-bottom: 15px;
          margin-top: 10px;
        }

        .lp-submit-btn:hover {
          background-color: #B8A99A;
        }

        .lp-home-btn {
          width: 100%;
          padding: 12px;
          background-color: transparent;
          color: #3E2723;
          border: 2px solid #3E2723;
          border-radius: 25px; /* Pill shape */
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: block;
          text-align: center;
        }

        .lp-home-btn:hover {
          background-color: #F5F2EB;
        }

        .lp-forgot-pass {
          display: block;
          text-align: right;
          color: #3E2723;
          font-size: 0.85rem;
          text-decoration: underline;
          cursor: pointer;
          margin-bottom: 20px;
          background: none;
          border: none;
          width: 100%;
        }

        /* ERROR MSG */
        .msg-box {
          margin-top: 15px;
          padding: 10px;
          border-radius: 8px;
          font-size: 0.9rem;
          text-align: center;
          background-color: #FFEBEE;
          color: #C62828;
        }

        /* RESPONSIVE */
        @media (max-width: 850px) {
          .lp-container { flex-direction: column; }
          .lp-image-section { height: 250px; flex: none; }
          .lp-content-section { flex: 1; padding: 20px; }
          .lp-card { padding: 40px 30px; max-width: 100%; }
        }
      `}</style>

      <div className="lp-container">
        
        {/* LEFT: IMAGE */}
        <div className="lp-image-section">
          {/* Optional overlay if image is too bright */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)' }} />
        </div>

        {/* RIGHT: CONTENT */}
        <div className="lp-content-section">
          <div className="lp-card">
            
            <h1 className="lp-title">Log In Account</h1>

            <form onSubmit={onSubmit}>
              
              {/* Email */}
              <div className="lp-input-group">
                <label className="lp-label">Email</label>
                <input
                  className="lp-input"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Role Select - Required for login validation */}
              <div className="lp-input-group">
                 <label className="lp-label">Role</label>
                <select
                  className="lp-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  <option value="student">Student</option>
                  <option value="librarian">Librarian</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Password */}
              <div className="lp-input-group">
                <label className="lp-label">Password</label>
                <input
                  className="lp-input"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <button type="submit" className="lp-submit-btn">
                Log In
              </button>

              {/* Forgot Password */}
              <button 
                type="button" 
                className="lp-forgot-pass"
                onClick={() => nav("/forgot-password")}
              >
                Forgot Password?
              </button>

              {/* Home Button */}
              <button 
                type="button" 
                className="lp-home-btn"
                onClick={() => nav("/")}
              >
                Home
              </button>

            </form>

            {/* ERROR MESSAGE */}
            {err && (
              <div className="msg-box">
                {err}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
