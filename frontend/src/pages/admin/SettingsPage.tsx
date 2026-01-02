// src/pages/admin/SettingsPage.tsx
import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "../../api/adminApi";
import type { AdminSettings } from "../../types/dto";
import axios from "axios";

type UnknownRecord = Record<string, unknown>;

function extractMessageFromUnknown(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const obj = data as UnknownRecord;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.message === "string") return obj.message;
    try {
      return JSON.stringify(obj);
    } catch {
      return null;
    }
  }
  return null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>({
    defaultLoanDays: 14,
    finePerDay: 10.0, // 10% of book MRP per day
    maxBooksPerUser: 3,
    membershipRules: "",
    lastUpdated: new Date().toISOString(),
  });
  const [originalSettings, setOriginalSettings] = useState<AdminSettings>(settings);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const loadSettings = async () => {
      setError(null);
      setLoading(true);
      try {
        const resp = await getSettings();
        if (resp.data) {
          setSettings(resp.data);
          setOriginalSettings(resp.data);
        }
      } catch (err: unknown) {
        console.warn("Failed to load settings, using defaults:", err);
        // Use default settings if API fails
        setSettings(originalSettings);
        setOriginalSettings(originalSettings);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const handleSave = async () => {
    if (!confirm("Are you sure you want to save these settings? Only admin users can change these.")) return;

    setError(null);
    setSaving(true);
    try {
      await updateSettings(settings);
      setOriginalSettings(settings);
      alert("Settings saved successfully!");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = extractMessageFromUnknown(err.response?.data) ?? err.message ?? "Failed to save settings";
        setError(msg);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save settings");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', system-ui, Arial, sans-serif", background: "#f3f4f6" }}>
      

      {/* Main */}
      <main style={{ flex: 1, padding: 22, boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" }}>Global Settings</h1>
            <div style={{ color: "#6b7280", marginTop: 6, fontSize: 13 }}>Configure library policies and rules</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {hasChanges && (
              <button
                onClick={handleReset}
                style={{ padding: "8px 14px", borderRadius: 8, background: "#6b7280", color: "white", border: "none", cursor: "pointer", fontWeight: 700 }}
              >
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: hasChanges ? "#10B981" : "#d1d5db",
                color: "white",
                border: "none",
                cursor: hasChanges ? "pointer" : "not-allowed",
                fontWeight: 700
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Settings Form */}
        <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>Loading settings...</div>
          ) : (
            <div style={{ display: "grid", gap: 24 }}>
              {/* Basic Settings */}
              <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Basic Settings</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                      Loan Period (Days)
                    </label>
                    <input
                      type="number"
                      value={settings.defaultLoanDays}
                      onChange={(e) => setSettings(s => ({ ...s, defaultLoanDays: parseInt(e.target.value) || 0 }))}
                      min="1"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                      Max Books per User
                    </label>
                    <input
                      type="number"
                      value={settings.maxBooksPerUser}
                      onChange={(e) => setSettings(s => ({ ...s, maxBooksPerUser: parseInt(e.target.value) || 0 }))}
                      min="1"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                      Late Fee Rate (% of Book MRP)
                    </label>
                    <input
                      type="number"
                      value={settings.finePerDay}
                      onChange={(e) => setSettings(s => ({ ...s, finePerDay: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      max="100"
                      step="0.1"
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}
                    />
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      Current: {settings.finePerDay}% of book's MRP charged per day overdue
                    </div>
                  </div>

                </div>
              </div>

              {/* Last Updated */}
              {settings.lastUpdated && (
                <div style={{ marginTop: 16, padding: "12px 16px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>Last updated on:</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>
                    {new Date(settings.lastUpdated).toLocaleString()}
                    {settings.lastUpdatedBy && <span> by {settings.lastUpdatedBy}</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginTop: 12, color: "#b91c1c", background: "#fef2f2", padding: 12, borderRadius: 8, fontWeight: 700 }}>
            {error}
          </div>
        )}

        {/* Version Control Warning */}
        <div style={{ marginTop: 16, padding: "16px 20px", background: "#fef3c7", borderRadius: 8, border: "1px solid #f59e0b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 20 }}>⚠️</div>
            <div>
              <div style={{ fontWeight: 600, color: "#92400e" }}>Important Notice</div>
              <div style={{ fontSize: 14, color: "#92400e", marginTop: 2 }}>
                Policy changes are versioned and logged. Only administrators can modify these settings.
                All changes require explicit confirmation.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
