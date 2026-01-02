// src/pages/admin/AddBookPage.tsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AddBook from "../books/AddBook";

export default function AddBookPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const menu = [
    { label: "Dashboard", path: "/admin" },
    { label: "Users", path: "/admin/users" },
    { label: "Books", path: "/admin/books" },
    { label: "Requests", path: "/admin/requests" },
    { label: "Reports", path: "/admin/reports" },
    { label: "Settings", path: "/admin/settings" },
    { label: "System", path: "/admin/system" },
  ];

  const isActive = (p: string) =>
    location.pathname === p || location.pathname.startsWith(p);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "'Inter', system-ui, Arial",
        background: "#f3f4f6",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          background: "linear-gradient(180deg,#B07A47,#E8D1A7)",
          color: "#2b1a12",
          padding: "22px 12px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 24 }}>
          Admin Panel
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {menu.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                textAlign: "left",
                padding: "12px 14px",
                background: isActive(item.path)
                  ? "rgba(255,255,255,0.25)"
                  : "transparent",
                border: "none",
                color: "#2b1a12",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: 22, boxSizing: "border-box" }}>
        <h1
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 800,
            color: "#111827",
          }}
        >
          Add New Book
        </h1>
        <div style={{ color: "#6b7280", marginBottom: 20 }}>
          Create a new book entry in the system
        </div>

        {/* ✔ Clean embed of AddBook (NO extra borders, NO nested white box) */}
        <AddBook />

        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => navigate("/admin/books")}
            style={{
              padding: "10px 18px",
              background: "#10B981",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ← Back to Books
          </button>
        </div>
      </main>
    </div>
  );
}
