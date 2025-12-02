import React, { useState, useRef } from "react";
import { register } from "../api/authApi";
import type { RegistrationRequest } from "../types/dto";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
      {/* BACKGROUND */}
      <div style={{ position: "fixed", inset: 0, zIndex: -2, overflow: "hidden" }}>
        <img
          src="/assets/download.webp"
          alt="Background"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(6px) brightness(0.75)",
            transform: "scale(1.02)",
          }}
        />
      </div>

      {/* DARK OVERLAY */}
      <div style={{ position: "fixed", inset: 0, zIndex: -1, background: "rgba(0,0,0,0.45)" }} />

      {/* PAGE CONTENT */}
      <div
        style={{
          minHeight: "90vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "5px 5px 5px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "900px",
            margin: "70px auto",
            display: "flex",
            flexWrap: "wrap",
            borderRadius: "22px",
            overflow: "hidden",
            background: "rgba(255,255,255,0.10)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
          }}
        >
          {/* LEFT IMAGE */}
          <div style={{ flex: "1 1 50%", minWidth: "260px" }}>
            <img
              src="/assets/download.webp"
              alt="Preview"
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.9)" }}
            />
          </div>

          {/* RIGHT PANEL */}
          <div
            style={{
              flex: "1 1 50%",
              minWidth: "260px",
              padding: "24px",
              color: "white",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              boxSizing: "border-box",
            }}
          >
            <h1 style={{ fontSize: "2.1rem", fontWeight: 800, marginBottom: "10px" }}>
              <span style={{ background: "linear-gradient(135deg,#ffae42,#ffd98e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Librarian
              </span>{" "}
              Registration
            </h1>

            <p style={{ fontSize: "1.02rem", opacity: 0.9, marginBottom: "16px" }}>
              Fill in your details to create a librarian account.
            </p>

            <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { name: "name", label: "Name" },
                { name: "email", label: "Email", type: "email" },
                { name: "phone", label: "Phone" },
                { name: "password", label: "Password", type: "password" },
              ].map((f) => {
                const key = f.name as keyof RegistrationRequest;
                return (
                  <div key={f.name}>
                    <input
                      name={f.name}
                      placeholder={f.label}
                      type={(f as { type?: string }).type || "text"}
                      value={(form[key] as string) ?? ""}
                      onChange={onChange}
                      style={{
                        width: "90%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "rgba(255,255,255,0.85)",
                        border: "1px solid rgba(255,255,255,0.6)",
                        fontSize: "1rem",
                        boxSizing: "border-box",
                      }}
                    />
                    {errors[f.name] && (
                      <p style={{ color: "#ff8787", fontSize: "0.9rem", marginTop: "4px" }}>{errors[f.name]}</p>
                    )}
                  </div>
                );
              })}

              {/* ID PROOF UPLOAD */}
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: "rgba(255,255,255,0.16)",
                    border: "1.5px solid rgba(255,255,255,0.55)",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontSize: "1rem",
                    color: "white",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  📂 Upload ID Proof (optional)
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/png,image/jpeg,application/pdf"
                  onChange={onFileChange}
                />

                {idProofFile && <p style={{ color: "#7dff87", marginTop: "6px", fontSize: "0.9rem" }}>Selected: {idProofFile.name}</p>}
                {fileError && <p style={{ color: "#ff8787", marginTop: "6px", fontSize: "0.9rem" }}>{fileError}</p>}
              </div>

              <button
                type="submit"
                style={{
                  background: "rgba(255,255,255,0.16)",
                  border: "1.5px solid rgba(255,255,255,0.55)",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  fontSize: "1rem",
                  color: "white",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Register as Librarian
              </button>
            </form>

            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <button
                onClick={() => nav("/register")}
                style={{
                  display: "inline-block",
                  background: "rgba(255,255,255,0.16)",
                  border: "1.5px solid rgba(255,255,255,0.55)",
                  padding: "7px 16px",
                  fontSize: "1rem",
                  color: "white",
                  borderRadius: "12px",
                  cursor: "pointer",
                }}
              >
                ← Back to Registration
              </button>
            </div>

            {msg && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  background: msg.includes("fail") ? "rgba(220,38,38,0.25)" : "rgba(22,163,74,0.25)",
                  textAlign: "center",
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
