import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchBooks } from "../../api/libraryApi";
import { getBookStats } from "../../api/adminApi";
import axios from "axios";

type Book = {
  id: number;
  title: string;
  author: string;
  isbn?: string;
  genre?: string;
  publisher?: string;
  mrp?: number;
  // category removed in favor of `genre`
  tags?: string;
  totalCopies: number;
  availableCopies: number;
};

export default function BooksCatalogPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [bookStats, setBookStats] = useState<{
    totalBooks: number;
    normalBooks: number;
    premiumBooks: number;
  }>({
    totalBooks: 0,
    normalBooks: 0,
    premiumBooks: 0
  });
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showAvailableOnly, setShowAvailableOnly] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  useEffect(() => {
    const fetchBookStats = async () => {
      setStatsLoading(true);
      try {
        const response = await getBookStats();
        setBookStats({
          totalBooks: response.data.totalBooks || 0,
          normalBooks: response.data.normalBooks || 0,
          premiumBooks: response.data.premiumBooks || 0
        });
      } catch (err) {
        console.error("Failed to fetch book stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchBookStats();
  }, []);

  useEffect(() => {
        const fetchBooks = async () => {
      setLoading(true);
      setError(null);
      try {
        		const params: { title?: string; genre?: string; available?: boolean } = {};
        if (searchQuery) params.title = searchQuery;
            if (selectedCategory) params.genre = selectedCategory;
        if (showAvailableOnly) params.available = true;

        const response = await searchBooks(params);
        const booksData = Array.isArray(response.data) ? response.data : [];
        setBooks(booksData);
      } catch (err: unknown) {
        console.error("Failed to fetch books:", err);
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || err.message);
        } else {
          setError("Failed to load books");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [searchQuery, selectedCategory, showAvailableOnly]);

  useEffect(() => {
    setFilteredBooks(books);
    setCurrentPage(1);
  }, [books]);

  const totalPages = Math.ceil(filteredBooks.length / pageSize);
  const paginatedBooks = filteredBooks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  const categories = [...new Set(books.map(b => b.genre).filter(Boolean))];

  // Helper function to truncate text with tooltip
  const TruncateText = ({ text, maxLength = 30 }: { text: string; maxLength?: number }) => {
    const truncated = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    return (
      <span title={text.length > maxLength ? text : undefined} style={{ cursor: text.length > maxLength ? 'pointer' : 'default' }}>
        {truncated}
      </span>
    );
  };

  return (
    <div style={{ padding: 20, paddingBottom: 60 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#111827" }}>Books Catalog</h1>
            <div style={{ color: "#6b7280", marginTop: 6, fontSize: 14 }}>Complete listing of all library books</div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => navigate("/admin/books/add")}
              style={{
                padding: "12px 24px",
                border: "none",
                background: "linear-gradient(145deg, #8B4513, #654321)",
                borderRadius: 10,
                fontSize: 16,
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
              📚 Add New Book
            </button>
            <button
              onClick={() => navigate("/admin/books")}
              style={{ padding: "8px 16px", borderRadius: 8, background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", cursor: "pointer", fontWeight: 700 }}
            >
              Back to Management
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
          <div style={{ background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", padding: 20, borderRadius: 12, boxShadow: "0 6px 18px rgba(139,69,19,0.1)", textAlign: "center", border: "1px solid #d4a574" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#8B4513" }}>
              {statsLoading ? "..." : bookStats.totalBooks.toLocaleString()}
            </div>
            <div style={{ color: "#5D4E37", fontSize: 14 }}>Total Books</div>
          </div>
          <div style={{ background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", padding: 20, borderRadius: 12, boxShadow: "0 6px 18px rgba(139,69,19,0.1)", textAlign: "center", border: "1px solid #d4a574" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#654321" }}>
              {statsLoading ? "..." : bookStats.normalBooks.toLocaleString()}
            </div>
            <div style={{ color: "#5D4E37", fontSize: 14 }}>Normal Books</div>
          </div>
          <div style={{ background: "linear-gradient(135deg, #f8f9fa, #e9ecef)", padding: 20, borderRadius: 12, boxShadow: "0 6px 18px rgba(139,69,19,0.1)", textAlign: "center", border: "1px solid #d4a574" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#A0522D" }}>
              {statsLoading ? "..." : bookStats.premiumBooks.toLocaleString()}
            </div>
            <div style={{ color: "#5D4E37", fontSize: 14 }}>Premium Books</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "nowrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search books by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 15,
              flex: 3,
              minWidth: 300
            }}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 15,
              background: "white",
              minWidth: 160
            }}
          >
            <option value="">All Genres</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showAvailableOnly}
              onChange={(e) => setShowAvailableOnly(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            <span style={{ fontSize: 15, color: "#374151" }}>Available only</span>
          </label>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 18 }}>Loading books...</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 20, color: "#b91c1c", background: "#fef2f2", padding: 12, borderRadius: 8, fontWeight: 700 }}>
            {error}
          </div>
        )}

        {/* Books Table */}
        {!loading && !error && (
          <>
            <div style={{ overflowX: "auto", background: "white", borderRadius: 12, boxShadow: "0 4px 6px rgba(0,0,0,0.07)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12 }}>ID</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12 }}>Title</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12 }}>Author</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12 }}>Genre</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12 }}>Status</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12 }}>Copies</th>
                    <th style={{ padding: 12, textAlign: "center", fontWeight: 600, color: "#374151", fontSize: 12 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBooks.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 48, textAlign: "center", color: "#6b7280" }}>
                        No books found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    paginatedBooks.map((book) => (
                      <tr key={book.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: 12, color: "#6b7280", fontSize: 13 }}>{book.id}</td>
                        <td style={{ padding: 12, fontWeight: 500, color: "#111827", fontSize: 13 }}>
                          <TruncateText text={book.title} maxLength={25} />
                        </td>
                        <td style={{ padding: 12, color: "#6b7280", fontSize: 13 }}>
                          <TruncateText text={book.author} maxLength={20} />
                        </td>
                        <td style={{ padding: 12, color: "#6b7280", fontSize: 13 }}>{book.genre || "N/A"}</td>
                        <td style={{ padding: 12 }}>
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            background: book.availableCopies > 0 ? '#d1fae5' : '#fee2e2',
                            color: book.availableCopies > 0 ? '#065f46' : '#dc2626'
                          }}>
                            {book.availableCopies > 0 ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                        <td style={{ padding: 12, color: "#6b7280", fontSize: 13 }}>
                          {book.availableCopies}/{book.totalCopies}
                        </td>
                        <td style={{ padding: 12, textAlign: "center" }}>
                          <button
                            onClick={() => navigate(`/admin/books/edit/${book.id}`)}
                            style={{
                              marginRight: 6,
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid #2563EB",
                              background: "#2563EB",
                              color: "white",
                              fontWeight: 700,
                              cursor: "pointer",
                              fontSize: 12
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {/* TODO: implement delete */}}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid rgba(0,0,0,0.08)",
                              background: "#fff",
                              color: "#EF4444",
                              fontWeight: 700,
                              cursor: "pointer",
                              fontSize: 12
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "#6b7280", fontSize: 14 }}>
                  Showing {Math.min((currentPage - 1) * pageSize + 1, filteredBooks.length)} to {Math.min(currentPage * pageSize, filteredBooks.length)} of {filteredBooks.length} books
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #d1d5db",
                      background: currentPage === 1 ? "#f3f4f6" : "#ffffff",
                      color: "#111827",
                      borderRadius: 6,
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      fontSize: 15,
                      fontWeight: 600
                    }}
                  >
                    ← Previous
                  </button>
                  <div style={{ display: "flex", gap: 4 }}>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          style={{
                            padding: "6px 10px",
                            border: "1px solid #d1d5db",
                            background: currentPage === pageNum ? "#111827" : "#ffffff",
                            color: currentPage === pageNum ? "#ffffff" : "#111827",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontSize: 15,
                            fontWeight: 600
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid #d1d5db",
                      background: currentPage === totalPages ? "#f3f4f6" : "#ffffff",
                      color: "#111827",
                      borderRadius: 6,
                      cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                      fontSize: 15,
                      fontWeight: 600
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
