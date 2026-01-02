import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function SystemPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // For now, we'll use placeholder data since full system monitoring
    // would require additional infrastructure
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', system-ui, Arial, sans-serif", background: "#f3f4f6" }}>
      

      {/* Main */}
      <main style={{ flex: 1, padding: 22, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" }}>System Management</h1>
            <div style={{ color: "#6b7280", marginTop: 6, fontSize: 13 }}>Monitor system performance and manage configurations</div>
          </div>
        </div>

        {/* System Status Overview */}
        <div style={{ background: "white", padding: 24, borderRadius: 12, marginBottom: 20, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 16 }}>System Status Overview</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 16, height: 16, background: "#10B981", borderRadius: "50%", margin: "0 auto 8px auto" }}></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Database</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Operational</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 16, height: 16, background: "#10B981", borderRadius: "50%", margin: "0 auto 8px auto" }}></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>API Server</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Operational</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 16, height: 16, background: "#10B981", borderRadius: "50%", margin: "0 auto 8px auto" }}></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>File Storage</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Operational</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 16, height: 16, background: "#10B981", borderRadius: "50%", margin: "0 auto 8px auto" }}></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Email Service</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Operational</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 16, height: 16, background: "#F59E0B", borderRadius: "50%", margin: "0 auto 8px auto" }}></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Backup</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Running</div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div style={{ background: "white", padding: 24, borderRadius: 12, marginBottom: 20, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Performance Metrics</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#111827", marginBottom: 4 }}>N/A</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Avg Response Time</div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>TODO: Implement API monitoring</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#111827", marginBottom: 4 }}>0</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Requests Today</div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>TODO: Track API call metrics</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#111827", marginBottom: 4 }}>0</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Active Users</div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>TODO: Track user session counts</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#111827", marginBottom: 4 }}>0%</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Error Rate</div>
              <div style={{ fontSize: 12, color: "#9CA3AF" }}>TODO: Implement error rate monitoring</div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 16 }}>System Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Version</div>
              <div style={{ fontWeight: 700, color: "#111827" }}>N/A</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>TODO: Get from build properties</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Last Updated</div>
              <div style={{ fontWeight: 700, color: "#111827" }}>N/A</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>TODO: Track system updates</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Uptime</div>
              <div style={{ fontWeight: 700, color: "#111827" }}>N/A</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>TODO: Monitor application uptime</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Memory Usage</div>
              <div style={{ fontWeight: 700, color: "#111827" }}>N/A</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>TODO: Track JVM memory metrics</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Storage Used</div>
              <div style={{ fontWeight: 700, color: "#111827" }}>N/A</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>TODO: Monitor disk usage</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Active Connections</div>
              <div style={{ fontWeight: 700, color: "#111827" }}>0</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>TODO: Track database connections</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
