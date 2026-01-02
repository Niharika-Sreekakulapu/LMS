// src/pages/LibrarianRegisterPage.tsx
import React, { useState, useRef } from "react";
import { register } from "../api/authApi";
import type { RegistrationRequest } from "../types/dto";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import loginImage from "../assets/login.jpg";

type FieldErrors = Record<string, string>;

export default function LibrarianRegisterPage() {
  const [form, setForm] = useState<RegistrationRequest>({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "LIBRARIAN",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!f) {
      setIdProofFile(null);
      return;
    }

    const allowed = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowed.includes(f.type)) {
      setFileError("Only PNG/JPEG images or PDF allowed");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setFileError("File must be < 5MB");
      return;
    }
    setIdProofFile(f);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMsg(null);

    // Validation checks
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(form.phone)) {
      setErrors({ phone: "Phone number must be exactly 10 digits" });
      return;
    }
    if (form.password.length < 8) {
      setErrors({ password: "Password must be at least 8 characters long" });
      return;
    }

    try {
      let res;
      if (idProofFile) {
        const fd = new FormData();

        // Only append keys that exist on RegistrationRequest
        (Object.keys(form) as Array<keyof RegistrationRequest>).forEach(
          (k) => {
            const v = form[k];
            if (v !== undefined && v !== null) {
              fd.append(String(k), String(v));
            }
          }
        );

        fd.append("idProof", idProofFile, idProofFile.name);
        res = await register(fd);
      } else {
        res = await register(form);
      }

      setMsg(`Registered. Status: ${res.data.status ?? "OK"}`);
      setTimeout(() => nav("/login"), 900);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as Record<string, unknown> | undefined;
        const map: FieldErrors = {};

        if (data && typeof data === "object") {
          for (const key of Object.keys(data)) {
            const val = data[key];
            if (typeof val === "string") {
              map[key] = val;
            } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") {
              map[key] = val[0];
            }
          }
        }

        if (Object.keys(map).length) {
          setErrors(map);
          return;
        }

        // Use message if available, otherwise generic
        const message =
          (data && typeof data === "object" && "message" in data && typeof data.message === "string"
            ? (data.message as string)
            : undefined) ?? "Registration failed";

        setMsg(message);
      } else {
        setMsg("Registration failed");
      }
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');

        /* RESET & BASE */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .lr-container {
          display: flex;
          min-height: 100vh;
          width: 100%;
          font-family: 'Inter', sans-serif;
          background-color: #FAF9F6; /* Cream background */
        }

        /* LEFT SIDE: IMAGE */
        .lr-image-section {
          flex: 1;
          background-size: cover;
          background-position: center;
          position: relative;
        }

        .lr-image-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(74, 51, 40, 0.2); /* Slight brown tint */
        }

        /* RIGHT SIDE: CONTENT */
        .lr-content-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          background-color: #FAF9F6;
        }

        /* WHITE CARD */
        .lr-card {
          background-color: #FFFFFF;
          padding: 50px 40px;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          width: 100%;
          max-width: 450px;
          border: 1px solid rgba(0,0,0,0.02);
        }

        /* TYPOGRAPHY */
        .lr-title {
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          color: #B8860B; /* Gold Color Title */
          margin-bottom: 10px;
          font-weight: 700;
        }

        .lr-subtitle {
          color: #4A3328;
          margin-bottom: 25px;
          font-size: 0.95rem;
          font-weight: 500;
        }

        /* FORM INPUTS */
        .lr-input-group {
          margin-bottom: 15px;
        }

        .lr-input {
          width: 100%;
          padding: 12px 15px;
          background-color: #FAF9F6; /* Cream input bg */
          border: 1px solid #8D6E63; /* Brown border */
          border-radius: 12px;
          font-size: 1rem;
          color: #4A3328;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .lr-input:focus {
          border-color: #B8860B; /* Gold focus */
          box-shadow: 0 0 0 3px rgba(184, 134, 11, 0.1);
        }

        /* Password field eye icon wrapper */
        .password-wrapper {
          position: relative;
          width: 100%;
        }

        /* Ensure input inside wrapper has enough right padding to avoid overlap */
        .password-wrapper .lr-input {
          padding-right: 48px !important;
        }

        .password-toggle-btn {
          position: absolute;
          right: 8px;
          top: 30%;
          bottom: 40%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          color: #666;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: right;
          width: 28px;
          height: 28px;
          border-radius: 4px;
          transition: color 0.2s;
        }

        .password-toggle-btn:hover {
          color: #4A3328;
        }

        /* BUTTONS */
        .lr-upload-btn {
          width: 100%;
          padding: 12px;
          background-color: transparent;
          color: #B8860B;
          border: 2px solid #B8860B;
          border-radius: 25px; /* Pill shape */
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .lr-upload-btn:hover {
          background-color: #FFF8E1;
        }

        .lr-submit-btn {
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
          margin-bottom: 15px;
        }

        .lr-submit-btn:hover {
          background-color: #9A7009;
        }

        .lr-back-link {
          background: none;
          border: none;
          color: #4A3328;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          width: 100%;
        }
        
        .lr-back-link:hover {
          text-decoration: underline;
        }

        .error-text {
          color: #D32F2F;
          font-size: 0.85rem;
          margin-top: 4px;
          padding-left: 4px;
        }

        .msg-box {
          margin-top: 15px;
          padding: 10px;
          border-radius: 8px;
          font-size: 0.9rem;
          text-align: center;
        }

        /* RESPONSIVE */
        @media (max-width: 850px) {
          .lr-container { flex-direction: column; }
          .lr-image-section { height: 250px; flex: none; }
          .lr-content-section { flex: 1; padding: 20px; }
          .lr-card { padding: 30px 20px; max-width: 100%; }
        }
      `}</style>

      <div className="lr-container">
        
        {/* LEFT: IMAGE */}
        <div
          className="lr-image-section"
          style={{ backgroundImage: `url(${loginImage})` }}
        >
          <div className="lr-image-overlay" />
        </div>

        {/* RIGHT: CONTENT */}
        <div className="lr-content-section">
          <div className="lr-card">
            
            <h1 className="lr-title">Librarian Registration</h1>
            <p className="lr-subtitle">Create your official account.</p>

            <form onSubmit={onSubmit}>
              
              {/* Name */}
              <div className="lr-input-group">
                <input
                  className="lr-input"
                  name="name"
                  placeholder="Name"
                  value={form.name}
                  onChange={onChange}
                />
                {errors.name && <p className="error-text">{errors.name}</p>}
              </div>

              {/* Email */}
              <div className="lr-input-group">
                <input
                  className="lr-input"
                  name="email"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={onChange}
                />
                {errors.email && <p className="error-text">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div className="lr-input-group">
                <input
                  className="lr-input"
                  name="phone"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={onChange}
                />
                {errors.phone && <p className="error-text">{errors.phone}</p>}
              </div>

              {/* Password */}
              <div className="lr-input-group">
                <div className="password-wrapper">
                  <input
                    className="lr-input"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={form.password}
                    onChange={onChange}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                  </button>
                </div>
                {errors.password && <p className="error-text">{errors.password}</p>}
              </div>

              {/* FILE UPLOAD */}
              <div style={{ marginBottom: 15 }}>
                <button
                  type="button"
                  className="lr-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📂 {idProofFile ? "Change File" : "Upload ID Proof"}
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/png,image/jpeg,application/pdf"
                  onChange={onFileChange}
                />

                {idProofFile && (
                  <p style={{ fontSize: "0.85rem", color: "#388E3C", textAlign: 'center' }}>
                    Selected: {idProofFile.name}
                  </p>
                )}

                {fileError && <p className="error-text" style={{ textAlign: 'center' }}>{fileError}</p>}
              </div>

              {/* SUBMIT */}
              <button type="submit" className="lr-submit-btn">
                Register as Librarian
              </button>
            </form>

            {/* BACK BUTTON */}
            <button className="lr-back-link" onClick={() => nav("/register")}>
              Back to Registration →
            </button>

            {/* MESSAGE */}
            {msg && (
              <div
                className="msg-box"
                style={{
                  backgroundColor: msg.includes("fail") || msg.includes("Error") ? "#FFEBEE" : "#E8F5E9",
                  color: msg.includes("fail") || msg.includes("Error") ? "#C62828" : "#2E7D32",
                }}
              >
                {msg}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
