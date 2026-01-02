// src/pages/StudentRegisterPage.tsx
import React, { useState, useRef } from "react";
import { register } from "../api/authApi";
import type { RegistrationRequest } from "../types/dto";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import loginImage from "../assets/login.jpg";

type FieldErrors = Record<string, string>;

type FieldDef = {
  name: keyof RegistrationRequest;
  label: string;
  type?: string;
};

export default function StudentRegisterPage() {
  const [form, setForm] = useState<RegistrationRequest>({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "STUDENT",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [studentIdFile, setStudentIdFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!f) return setStudentIdFile(null);

    const allowed = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowed.includes(f.type)) {
      setFileError("Only PNG/JPEG images or PDF allowed");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setFileError("File must be < 5MB");
      return;
    }
    setStudentIdFile(f);
  };

  const fields: FieldDef[] = [
    { name: "name", label: "Name" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone" },
    { name: "password", label: "Password", type: "password" },
  ];

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

      if (studentIdFile) {
        const fd = new FormData();

        // Append fields as strings
        Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));

        // backend expects "idProof"
        fd.append("idProof", studentIdFile, studentIdFile.name);

        res = await register(fd);
      } else {
        res = await register(form);
      }

      setMsg(`Registered. Status: ${res.data?.status ?? "unknown"}`);
      setTimeout(() => nav("/login"), 1000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data;
        const map: FieldErrors = {};

        if (data != null && typeof data === "object") {
          for (const key in data as Record<string, unknown>) {
            const val = (data as Record<string, unknown>)[key];
            if (typeof val === "string") map[key] = val;
            else if (Array.isArray(val) && typeof val[0] === "string")
              map[key] = val[0];
          }
        }

        if (Object.keys(map).length) {
          setErrors(map);
          return;
        }

        setMsg(err.response?.data?.message || err.response?.data?.error || "Registration failed");
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
        
        .sp-container {
          display: flex;
          min-height: 100vh;
          width: 100%;
          font-family: 'Inter', sans-serif;
          background-color: #FAF9F6; /* Cream background */
        }

        /* LEFT SIDE: IMAGE */
        .sp-image-section {
          flex: 1;
          background-size: cover;
          background-position: center;
          position: relative;
        }

        .sp-image-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(74, 51, 40, 0.2); /* Slight brown tint */
        }

        /* RIGHT SIDE: CONTENT */
        .sp-content-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          background-color: #FAF9F6;
        }

        /* WHITE CARD */
        .sp-card {
          background-color: #FFFFFF;
          padding: 50px 40px;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          width: 100%;
          max-width: 450px;
          border: 1px solid rgba(0,0,0,0.02);
        }

        /* TYPOGRAPHY */
        .sp-title {
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          color: #B8860B; /* Gold Color Title */
          margin-bottom: 10px;
          font-weight: 700;
        }

        .sp-subtitle {
          color: #4A3328;
          margin-bottom: 25px;
          font-size: 0.95rem;
          font-weight: 500;
        }

        /* FORM INPUTS */
        .sp-input-group {
          margin-bottom: 15px;
        }

        .sp-input {
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

        .sp-input:focus {
          border-color: #B8860B; /* Gold focus */
          box-shadow: 0 0 0 3px rgba(184, 134, 11, 0.1);
        }

        /* Password field eye icon wrapper */
        .password-wrapper {
          position: relative;
          width: 100%;
        }

        /* Ensure input inside wrapper has enough right padding to avoid overlap */
        .password-wrapper .sp-input {
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
        .sp-upload-btn {
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

        .sp-upload-btn:hover {
          background-color: #FFF8E1;
        }

        .sp-submit-btn {
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

        .sp-submit-btn:hover {
          background-color: #9A7009;
        }

        .sp-back-link {
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
        
        .sp-back-link:hover {
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
          .sp-container { flex-direction: column; }
          .sp-image-section { height: 250px; flex: none; }
          .sp-content-section { flex: 1; padding: 20px; }
          .sp-card { padding: 30px 20px; max-width: 100%; }
        }
      `}</style>

      <div className="sp-container">
        
        {/* LEFT: IMAGE */}
        <div
          className="sp-image-section"
          style={{ backgroundImage: `url(${loginImage})` }}
        >
          <div className="sp-image-overlay" />
        </div>

        {/* RIGHT: CONTENT */}
        <div className="sp-content-section">
          <div className="sp-card">
            
            <h1 className="sp-title">Student Registration</h1>
            <p className="sp-subtitle">Fill in your details...</p>

            <form onSubmit={onSubmit}>
              {fields.map((f) => (
                <div key={String(f.name)} className="sp-input-group">
                  {f.name === 'password' ? (
                    <div className="password-wrapper">
                      <input
                        className="sp-input"
                        name={String(f.name)}
                        placeholder={f.label}
                        type={showPassword ? "text" : "password"}
                        value={(form[f.name] as unknown) as string}
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
                  ) : (
                    <input
                      className="sp-input"
                      name={String(f.name)}
                      placeholder={f.label}
                      type={f.type ?? "text"}
                      value={(form[f.name] as unknown) as string}
                      onChange={onChange}
                    />
                  )}
                  {errors[String(f.name)] && (
                    <p className="error-text">{errors[String(f.name)]}</p>
                  )}
                </div>
              ))}

              {/* FILE UPLOAD */}
              <div style={{ marginBottom: 15 }}>
                <button
                  type="button"
                  className="sp-upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📂 {studentIdFile ? "Change File" : "Upload Student ID"}
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/png,image/jpeg,application/pdf"
                  onChange={onFileChange}
                />

                {studentIdFile && (
                  <p style={{ fontSize: "0.85rem", color: "#388E3C", textAlign: 'center' }}>
                    Selected: {studentIdFile.name}
                  </p>
                )}

                {fileError && <p className="error-text" style={{ textAlign: 'center' }}>{fileError}</p>}
              </div>

              {/* SUBMIT */}
              <button type="submit" className="sp-submit-btn">
                Register as Student
              </button>
            </form>

            {/* BACK BUTTON */}
            <button className="sp-back-link" onClick={() => nav("/register")}>
              Back to Registration →
            </button>

            {/* MESSAGE */}
            {msg && (
              <div
                className="msg-box"
                style={{
                  backgroundColor: msg.includes("fail") ? "#FFEBEE" : "#E8F5E9",
                  color: msg.includes("fail") ? "#C62828" : "#2E7D32",
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
