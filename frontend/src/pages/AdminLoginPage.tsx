import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!email || !password) {
      setErr("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("http://localhost:8081/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!resp.ok) {
        const text = await resp.text();
        try {
          const json = JSON.parse(text || "{}");
          setErr(json.message || "Invalid admin credentials");
        } catch {
          setErr(text || "Invalid admin credentials");
        }
        return;
      }

      // SAVE BASIC AUTH TOKEN HERE
      const basicToken = btoa(`${email}:${password}`);
      sessionStorage.setItem("adminBasic", basicToken);

      nav("/admin");
    } catch (error) {
      console.error("Login error:", error);
      setErr("Unable to reach server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "20px auto" }}>
      <h2 style={{ marginBottom: 12 }}>Admin Login</h2>

      <form onSubmit={submit}>
        <div className="form-row" style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            placeholder="Admin email"
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 8, borderRadius: 6 }}
          />
        </div>

        <div className="form-row" style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8, borderRadius: 6 }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "8px 12px", borderRadius: 6 }}
        >
          {loading ? "Logging in…" : "Login as Admin"}
        </button>

        {err && <div style={{ color: "red", marginTop: 12 }}>{err}</div>}
      </form>
    </div>
  );
}
