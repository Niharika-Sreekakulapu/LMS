// src/pages/admin/ReportsPage.tsx
import { useState } from "react";
import { downloadReport } from "../../api/adminApi";

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);

  const handleDownload = async (reportType: string, format: 'csv' | 'excel') => {
    setLoading(true);
    try {
      const response = await downloadReport(reportType, format);
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report.${format === 'excel' ? 'xlsx' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download report. Please try again.');
      console.error('Report download failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#111827" }}>Reports & Analytics</h1>
        <div style={{ color: "#6b7280", marginTop: 4, fontSize: 14 }}>Generate and download detailed library reports</div>
      </div>

      {/* Reports Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
        <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>📊 Library Usage Report</h3>
            <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: 14 }}>Overview of books, users, and borrowing activity</p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleDownload('library-usage', 'csv')}
              disabled={loading}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: "white",
                color: "#374151",
                cursor: loading ? "wait" : "pointer",
                fontWeight: 600,
                fontSize: 12
              }}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>📚 Overdue Books Report</h3>
            <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: 14 }}>Books that are past their return date</p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleDownload('overdue-books', 'csv')}
              disabled={loading}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: "white",
                color: "#374151",
                cursor: loading ? "wait" : "pointer",
                fontWeight: 600,
                fontSize: 12
              }}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>💰 Fines & Payments Report</h3>
            <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: 14 }}>Revenue from late fees and payments</p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleDownload('fines-payments', 'csv')}
              disabled={loading}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: "white",
                color: "#374151",
                cursor: loading ? "wait" : "pointer",
                fontWeight: 600,
                fontSize: 12
              }}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>📈 Popular Books Report</h3>
            <p style={{ margin: "8px 0 0 0", color: "#6b7280", fontSize: 14 }}>Most borrowed books and trends</p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleDownload('popular-books', 'csv')}
              disabled={loading}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: "white",
                color: "#374151",
                cursor: loading ? "wait" : "pointer",
                fontWeight: 600,
                fontSize: 12
              }}
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
