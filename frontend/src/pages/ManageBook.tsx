// src/pages/ManageBook.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchBooks, deleteBook } from "../api/libraryApi";
import { getBookStats } from "../api/adminApi";
import Toast from "../components/Toast";

type ToastType = "success" | "error" | "info" | "warning";

interface Book {
  id: number;
  title: string;
  author: string;
  isbn?: string | null;
  genre?: string | null;
  accessLevel?: 'premium' | 'normal';
  access_level?: 'premium' | 'normal';
  access?: 'premium' | 'normal'; // fallback for backward compatibility
  tags?: string | null; // This might contain NORMAL/PREMIUM values
  availableCopies: number;
  totalCopies: number;
  // Allow any additional properties from API
  [key: string]: unknown;
}

export default function ManageBook() {
  const navigate = useNavigate();

  // data
  const [books, setBooks] = useState<Book[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
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

  // search/sort/pagination
  const [query, setQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [accessFilter, setAccessFilter] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [sortField, setSortField] = useState<keyof Book>("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // toast
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const showToast = (message: string, type: ToastType = "info") => setToast({ message, type });

  // Get unique categories and access types for filters
  const [allBooks, setAllBooks] = useState<Book[]>([]);

  useEffect(() => {
    void loadAllBooks();
  }, []);

  async function loadAllBooks() {
    try {
      const resp = await searchBooks({});
      const booksData = Array.isArray(resp.data) ? resp.data :
                       (resp.data && Array.isArray(resp.data.content)) ? resp.data.content :
                       (resp.data && Array.isArray(resp.data.books)) ? resp.data.books : [];
      setAllBooks(booksData);
    } catch (err) {
      console.error("Error loading all books:", err);
    }
  }

  // Extract unique categories and access types
  const categories = useMemo(() => {
    const cats = [...new Set(allBooks.map(b => (b.genre as string | undefined)).filter(Boolean))].sort() as string[];
    return cats;
  }, [allBooks]);

  const accessTypes = useMemo(() => [
    { value: "", label: "All Access Types" },
    { value: "normal", label: "Normal" },
    { value: "premium", label: "Premium" }
  ], []);

  // debounce search
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    // when query/size/page/sort/filters change, fetch — debounce query only
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void loadBooks();
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, genreFilter, accessFilter, page, size, sortField, sortOrder]);

  // initial load
  useEffect(() => {
    void loadBooks();
    void loadBookStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBookStats() {
    setStatsLoading(true);
    console.log("Loading book stats for:", window.location.pathname);
    try {
      // Get fresh book data for calculations
      const booksResponse = await searchBooks({});
      const booksData = Array.isArray(booksResponse.data) ? booksResponse.data :
                       (booksResponse.data && Array.isArray(booksResponse.data.content)) ? booksResponse.data.content :
                       (booksResponse.data && Array.isArray(booksResponse.data.books)) ? booksResponse.data.books : [];

      // console.log("Books data structure:", booksData.slice(0, 3)); // Show first 3 books to debug

      // For admin dashboard, first try the API, but if it returns 0s, calculate manually
      const apiResponse = await getBookStats();
      console.log("Admin getBookStats response:", apiResponse);

      let stats;
      // Check if API returned valid stats (not all zeros)
      if (apiResponse.data.totalBooks > 0 && (apiResponse.data.normalBooks > 0 || apiResponse.data.premiumBooks > 0)) {
        // API returned proper stats, use them
        stats = {
          totalBooks: apiResponse.data.totalBooks,
          normalBooks: apiResponse.data.normalBooks,
          premiumBooks: apiResponse.data.premiumBooks
        };
        console.log("Using admin API stats:", stats);
      } else {
        // API returned invalid data, calculate manually
        let normalCount = 0;
        let premiumCount = 0;

        booksData.forEach((book: Record<string, unknown>) => {
          // Use actual access level from database/API
          const accessLevel = (book.accessLevel || book.access_level || book.access || '').toString().toLowerCase();
          const isPremium = accessLevel === 'premium';

          if (isPremium) {
            premiumCount++;
          } else {
            normalCount++;
          }
        });

        stats = {
          totalBooks: booksData.length,
          normalBooks: normalCount,
          premiumBooks: premiumCount
        };

        console.log("Calculated admin stats (API invalid):", stats);
      }

      setBookStats(stats);
      setTotalCount(booksData.length);
    } catch (err) {
      console.error("Failed to fetch book stats:", err);

      // Fallback: calculate from fresh book data if API fails (librarian context)
      try {
        // Load book data directly using library API (available to all users)
        const booksResponse = await searchBooks({});
        const booksData = Array.isArray(booksResponse.data) ? booksResponse.data :
                         (booksResponse.data && Array.isArray(booksResponse.data.content)) ? booksResponse.data.content :
                         (booksResponse.data && Array.isArray(booksResponse.data.books)) ? booksResponse.data.books : [];

        let normalCount = 0;
        let premiumCount = 0;

        booksData.forEach((book: Record<string, unknown>) => {
          // Use actual access level from database/API
          const accessLevel = (book.accessLevel || book.access_level || book.access || '').toString().toLowerCase();
          const isPremium = accessLevel === 'premium';

          if (isPremium) {
            premiumCount++;
          } else {
            normalCount++;
          }
        });

        const fallbackStats = {
          totalBooks: booksData.length,
          normalBooks: normalCount,
          premiumBooks: premiumCount
        };

        console.log("Setting fallback stats (librarian):", fallbackStats);
        setBookStats(fallbackStats);
        setTotalCount(booksData.length);
        setAllBooks(booksData); // Update allBooks state
      } catch (fallbackErr) {
        console.error("Fallback stats calculation also failed:", fallbackErr);
      }
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadBooks() {
    setLoading(true);
    try {
      // For now, load all books and implement client-side search/filtering
      const resp = await searchBooks({}); // Load all books
      const data = Array.isArray(resp.data) ? resp.data :
                   (resp.data && Array.isArray(resp.data.content)) ? resp.data.content :
                   (resp.data && Array.isArray(resp.data.books)) ? resp.data.books : [];

      let filteredBooks = data;

      // Apply client-side category filter
      if (genreFilter) {
        filteredBooks = filteredBooks.filter((book: Record<string, unknown>) =>
          book.genre && typeof book.genre === 'string' && book.genre.toLowerCase() === genreFilter.toLowerCase()
        );
      }

      // Apply client-side access filter
      if (accessFilter) {
        filteredBooks = filteredBooks.filter((book: Record<string, unknown>) => {
          // Detect access level from API fields, with fallbacks
          const accessVal = (book.accessLevel || book.access_level || book.access || '').toString().toLowerCase();
          if (accessVal === 'premium') {
            return accessFilter === 'premium';
          } else if (accessVal === 'normal') {
            return accessFilter === 'normal';
          } else if (book.tags && typeof book.tags === 'string') {
            // Fallback: check if tags contain access level
            if (book.tags.toUpperCase().includes('PREMIUM')) {
              return accessFilter === 'premium';
            } else if (book.tags.toUpperCase().includes('NORMAL')) {
              return accessFilter === 'normal';
            }
          }
          // Default to 'normal' if no access level found
          return accessFilter === 'normal';
        });
      }

      // Apply client-side search if query is provided
      if (query.trim()) {
        const searchTerm = query.toLowerCase().trim();
        filteredBooks = filteredBooks.filter((book: Record<string, unknown>) =>
          (book.title && typeof book.title === 'string' && book.title.toLowerCase().includes(searchTerm)) ||
          (book.author && typeof book.author === 'string' && book.author.toLowerCase().includes(searchTerm)) ||
          (book.isbn && typeof book.isbn === 'string' && book.isbn.toLowerCase().includes(searchTerm))
        );
      }

      // Apply client-side sorting
      filteredBooks.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aVal = a[sortField] as string | number | null;
        const bVal = b[sortField] as string | number | null;
        if (aVal === null || aVal === undefined) return sortOrder === 'asc' ? 1 : -1;
        if (bVal === null || bVal === undefined) return sortOrder === 'asc' ? -1 : 1;

        if (sortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });

      // Apply pagination
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedBooks = filteredBooks.slice(startIndex, endIndex);

      setBooks(paginatedBooks);
      setTotalCount(filteredBooks.length);
    } catch (err) {
      console.error("loadBooks error", err);
      showToast("Failed to load books", "error");
    } finally {
      setLoading(false);
    }
  }

  // Delete logic, disallow delete if any copies borrowed
  const handleDelete = async (b: Book) => {
    if (b.availableCopies < b.totalCopies) {
      showToast("Cannot delete — some copies are currently borrowed.", "error");
      return;
    }
    if (!window.confirm(`Delete "${b.title}"? This action cannot be undone.`)) return;
    try {
      await deleteBook(b.id);
      showToast("Book deleted", "success");
      // reload current page
      void loadBooks();
    } catch (err) {
      console.error("delete error", err);
      showToast("Delete failed", "error");
    }
  };

  const isAdminContext = window.location.pathname.startsWith("/admin");

  const handleEdit = (id: number) => navigate(isAdminContext ? `/admin/books/edit/${id}` : `/library-dashboard/edit-book/${id}`);

  const handleAddBook = () => navigate(isAdminContext ? "/admin/books/add" : "/library-dashboard/add-book");

  // sorting toggle
  const toggleSort = (field: keyof Book) => {
    if (sortField === field) setSortOrder((s) => (s === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / size)), [size, totalCount]);

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
    <div style={{ background: "#F9F6F0", borderRadius: 12, padding: 30, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.05)" }}>
      <div style={{ marginBottom: 24, textAlign: "left" }}>
        <h2 style={{ margin: 0, color: "#2A1F16", fontSize: 28, fontWeight: 900 }}>Books Management</h2>
      </div>

      {/* Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "linear-gradient(135deg, #8B4513 0%, #654321 100%)", color: "white", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 4px 15px rgba(139, 69, 19, 0.3)", border: "1px solid #E8D1A7" }}>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
            {statsLoading ? "..." : bookStats.totalBooks.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>📚 Total Books</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #DEB887 0%, #D2B48C 100%)", color: "#3E2723", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 4px 15px rgba(222, 184, 135, 0.3)" }}>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
            {statsLoading ? "..." : bookStats.normalBooks.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>📖 Normal Books</div>
        </div>
        <div style={{ background: "linear-gradient(135deg, #A0522D 0%, #8B4513 100%)", color: "white", padding: 20, borderRadius: 12, textAlign: "center", boxShadow: "0 4px 15px rgba(160, 82, 45, 0.3)" }}>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
            {statsLoading ? "..." : bookStats.premiumBooks.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>💎 Premium Books</div>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", width: "100%" }}>
          {/* Search Input - takes up half the width */}
          <input
            placeholder="Search title, author, isbn..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #ddd",
              flex: 2,
              fontSize: 16,
              backgroundColor: "white",
              minWidth: 300
            }}
          />

          {/* Genre Filter */}
          <select
            value={genreFilter}
            onChange={(e) => { setGenreFilter(e.target.value); setPage(1); }}
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #ddd",
              flex: 1,
              fontSize: 16,
              backgroundColor: "white",
              minWidth: 150,
              cursor: "pointer"
            }}
          >
            <option value="">All Genres</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Access Filter */}
          <select
            value={accessFilter}
            onChange={(e) => { setAccessFilter(e.target.value); setPage(1); }}
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #ddd",
              flex: 1,
              fontSize: 16,
              backgroundColor: "white",
              minWidth: 150,
              cursor: "pointer"
            }}
          >
            {accessTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          {/* Add Book Button */}
          <button onClick={handleAddBook} style={{
            padding: "12px 20px",
            background: "linear-gradient(145deg, #8B4513, #654321)",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            color: "white",
            boxShadow: "0 4px 15px rgba(139,69,19,0.3)",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: 0.8,
            minWidth: 140,
            justifyContent: "center"
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
            ➕ Add Book
          </button>
        </div>
      </div>

      {/* table */}
      <div style={{ overflowX: "auto" }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: "center" }}>Loading...</div>
        ) : books.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "#8B7355" }}>No books found</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {[
                  { label: "Title", field: "title" as keyof Book },
                  { label: "Author", field: "author" as keyof Book },
                  { label: "ISBN", field: "isbn" as keyof Book },
                  { label: "Category", field: "category" as keyof Book },
                  { label: "Access", field: "access_level" as keyof Book },
                  { label: "Available", field: "availableCopies" as keyof Book, center: true },
                  { label: "Actions", field: null, center: true },
                ].map((h) => (
                  <th
                    key={String(h.label)}
                    style={{ border: "1px solid #e6e2da", padding: 12, background: "#E8D1A7", textAlign: h.center ? "center" : "left", cursor: h.field ? "pointer" : "default" }}
                    onClick={() => h.field && toggleSort(h.field)}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {h.label}
                      {h.field && sortField === h.field && <small style={{ opacity: 0.7 }}>{sortOrder === "asc" ? "▲" : "▼"}</small>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {books.map((b) => (
                <tr key={b.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 12, fontSize: "13px", fontWeight: 500, color: "#2A1F16" }}><TruncateText text={b.title} maxLength={25} /></td>
                  <td style={{ padding: 12, fontSize: "13px", fontWeight: 500, color: "#6c757d" }}><TruncateText text={b.author} maxLength={20} /></td>
                  <td style={{ padding: 12, fontSize: "13px", fontWeight: 500, wordBreak: "break-all", color: "#6c757d" }}>{b.isbn || "-"}</td>
                  <td style={{ padding: 12, fontSize: "13px", fontWeight: 500, color: "#6c757d" }}>{(b as any).genre || "-"}</td>
                  <td style={{ padding: 12, fontSize: "13px" }}>
                    {(() => {
                      // Determine access level from API fields with fallbacks
                      const accessVal = (b.accessLevel || b.access_level || b.access || '').toString().toLowerCase();
                      let accessType = 'Normal'; // default

                      if (accessVal === 'premium') {
                        accessType = 'Premium';
                      } else if (accessVal === 'normal') {
                        accessType = 'Normal';
                      } else if (b.tags && typeof b.tags === 'string') {
                        // Fallback: check tags for access level
                        if (b.tags.toUpperCase().includes('PREMIUM')) {
                          accessType = 'Premium';
                        } else if (b.tags.toUpperCase().includes('NORMAL')) {
                          accessType = 'Normal';
                        }
                      }

                      const isPremium = accessType === 'Premium';

                      return (
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: isPremium ? "#FBBF24" : "#10B981",
                          color: isPremium ? "#92400E" : "#064E3B"
                        }}>
                          {accessType}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: 12, textAlign: "center", fontSize: "13px", fontWeight: 500, color: "#6c757d" }}>{b.availableCopies}</td>
                  <td style={{ padding: 12, whiteSpace: "nowrap", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <button onClick={() => handleEdit(b.id)} disabled={loading} style={{ marginRight: 10, padding: "12px 16px", borderRadius: 8, border: "none", background: "#2563EB", color: "white", fontWeight: 700, cursor: loading ? "wait" : "pointer", fontSize: "16px", minHeight: "45px", minWidth: "110px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      {loading ? "…" : <><span>✏️</span>Edit</>}
                    </button>
                    <button onClick={() => handleDelete(b)} disabled={loading} style={{ padding: "12px 16px", borderRadius: 8, border: "none", background: "#DC2626", color: "white", fontWeight: 700, cursor: loading ? "wait" : "pointer", fontSize: "16px", minHeight: "45px", minWidth: "110px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      {loading ? "…" : <><span>❌</span>Delete</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          padding: '12px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
            Showing {Math.min((page - 1) * size + 1, totalCount)} to {Math.min(page * size, totalCount)} of {totalCount} books
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '8px 12px',
                border: '1px solid #dee2e6',
                background: page === 1 ? '#f8f9fa' : 'white',
                color: page === 1 ? '#6c757d' : '#2A1F16',
                borderRadius: '6px',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
              }}
            >
              ← Previous
            </button>
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #dee2e6',
                      background: page === pageNum ? '#2A1F16' : 'white',
                      color: page === pageNum ? 'white' : '#2A1F16',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      minWidth: '36px',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                padding: '8px 12px',
                border: '1px solid #dee2e6',
                background: page === totalPages ? '#f8f9fa' : 'white',
                color: page === totalPages ? '#6c757d' : '#2A1F16',
                borderRadius: '6px',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
