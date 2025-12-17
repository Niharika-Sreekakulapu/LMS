import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBookStats } from "../../api/adminApi";

export default function BooksPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalBooks: 0,
    normalBooks: 0,
    premiumBooks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await getBookStats();
        setMetrics({
          totalBooks: response.data.totalBooks || 0,
          normalBooks: response.data.normalBooks || 0,
          premiumBooks: response.data.premiumBooks || 0
        });
      } catch (error) {
        console.error("Failed to fetch book stats:", error);
        // Keep default values if API fails
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const handleAddNewBook = () => {
    navigate("/admin/books/add");
  };

  const handleBulkImport = () => {
    navigate("/admin/books/bulk-import");
  };

  const handleUpdateInventory = () => {
    navigate("/admin/books/inventory");
  };

  const handleManageCategories = () => {
    navigate("/admin/books/categories");
  };

  const handleLowStockAlerts = () => {
    navigate("/admin/books/low-stock");
  };

  const handleViewAllBooks = () => {
    navigate("/admin/books/catalog");
  };

  return (
    <div style={{ padding: 20, paddingBottom: 60 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" }}>Books Management</h1>
            <div style={{ color: "#6b7280", marginTop: 6, fontSize: 13 }}>Manage library books and inventory</div>
          </div>
          <button
            onClick={handleAddNewBook}
            style={{
              padding: "12px 24px",
              border: "none",
              background: "linear-gradient(145deg, #8B4513, #654321)",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              color: "white",
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 15px rgba(139,69,19,0.3)",
              transform: "translateY(0)"
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = "linear-gradient(145deg, #A0522D, #8B4513)";
              (e.target as HTMLElement).style.transform = "translateY(-2px)";
              (e.target as HTMLElement).style.boxShadow = "0 6px 20px rgba(139,69,19,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = "linear-gradient(145deg, #8B4513, #654321)";
              (e.target as HTMLElement).style.transform = "translateY(0)";
              (e.target as HTMLElement).style.boxShadow = "0 4px 15px rgba(139,69,19,0.3)";
            }}
            onMouseDown={(e) => {
              (e.target as HTMLElement).style.transform = "translateY(0)";
              (e.target as HTMLElement).style.boxShadow = "0 2px 10px rgba(139,69,19,0.4)";
            }}
          >
            📖 Add New Book
          </button>
        </div>

        {/* Quick Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #8B4513 0%, #654321 100%)", color: "white", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 4px 15px rgba(139, 69, 19, 0.3)", border: "1px solid #E8D1A7" }}>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
            {loading ? "..." : metrics.totalBooks.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>📚 Total Books</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #DEB887 0%, #D2B48C 100%)", color: "#3E2723", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 4px 15px rgba(222, 184, 135, 0.3)" }}>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
            {loading ? "..." : metrics.normalBooks.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>📖 Normal Books</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #A0522D 0%, #8B4513 100%)", color: "white", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 4px 15px rgba(160, 82, 45, 0.3)" }}>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
            {loading ? "..." : metrics.premiumBooks.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>💎 Premium Books</div>
        </div>
        </div>

        {/* Management Options */}
        <div style={{ background: "white", padding: 24, borderRadius: 12, marginBottom: 20, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 16 }}>Quick Actions</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
            <button onClick={handleBulkImport} style={{
              padding: "12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "white",
              color: "#374151",
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13
            }}>
              <span style={{ fontSize: 18 }}>➕</span>
              <div>
                <div>Add Multiple Books</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Bulk import from file</div>
              </div>
            </button>
            <button onClick={handleUpdateInventory} style={{
              padding: "12px",
              borderRadius: 8,
              border: "1px solid #2563EB",
              background: "#2563EB",
              color: "white",
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13
            }}>
              <span style={{ fontSize: 18 }}>🔄</span>
              <div>
                <div>Update Inventory</div>
                <div style={{ fontSize: 11, color: "#e9ecef" }}>Sync stock levels</div>
              </div>
            </button>
            <button onClick={handleManageCategories} style={{
              padding: "12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "white",
              color: "#374151",
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13
            }}>
              <span style={{ fontSize: 18 }}>🏷️</span>
              <div>
                <div>Categories</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Manage book categories</div>
              </div>
            </button>
            <button onClick={handleLowStockAlerts} style={{
              padding: "12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "white",
              color: "#374151",
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13
            }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <div>
                <div>Low Stock Alerts</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>Books running low</div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Books */}
        <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111827" }}>Recent Additions</h3>
            <button onClick={handleViewAllBooks} style={{ padding: "6px 12px", borderRadius: 6, background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", cursor: "pointer", fontSize: 12 }}>
              View All Books
            </button>
          </div>
          <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📚</div>
            <p>No recent book additions</p>
            <p style={{ fontSize: "14px", color: "#9CA3AF" }}>
              TODO: Query Book repository for recent additions with timestamps
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
