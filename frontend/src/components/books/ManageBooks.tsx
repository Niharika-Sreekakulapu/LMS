import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  searchBooks,
  deleteBook,
} from "../../api/libraryApi";
import Toast from "../../components/Toast";

interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  genre: string | null;
  availableCopies: number;
  totalCopies: number;
}

interface Props {
  basePath: string;
}


const ManageBooks: React.FC<Props> = ({ basePath }) => {

  const navigate = useNavigate();

  // Data
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Sorting
  const [sortField, setSortField] = useState<keyof Book>("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);

  const showToast = (
  message: string,
  type: "success" | "error" | "info" | "warning" = "info"
) => setToast({ message, type });


  // Load books
  const loadBooks = async () => {
    setLoading(true);
    try {
      const res = await searchBooks();
      setBooks(res.data || []);
    } catch {
      showToast("Failed to load books", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
  (async () => {
    await loadBooks();
  })();
}, []);


  // Filter + Sort + Pagination
  const filteredBooks = useMemo(() => {
    let list = [...books];

    if (search.trim().length > 0) {
      const s = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(s) ||
          b.author.toLowerCase().includes(s) ||
          b.isbn.toLowerCase().includes(s)
      );
    }

    // sorting
    list.sort((a, b) => {
      const v1 = (a[sortField] ?? "").toString().toLowerCase();
      const v2 = (b[sortField] ?? "").toString().toLowerCase();

      if (v1 < v2) return sortOrder === "asc" ? -1 : 1;
      if (v1 > v2) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [books, search, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredBooks.length / perPage);
  const paginatedBooks = filteredBooks.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const toggleSort = (field: keyof Book) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Delete
  const handleDelete = async (id: number, available: number, total: number) => {
    if (available < total) {
      showToast("Cannot delete — this book is currently borrowed.", "error");
      return;
    }

    if (!window.confirm("Delete this book?")) return;

    try {
      await deleteBook(id);
      showToast("Book deleted", "success");
      loadBooks();
    } catch {
      showToast("Delete failed", "error");
    }
  };

  const handleEdit = (id: number) => {
    navigate(`${basePath}/edit-book/${id}`);
  };

  return (
    <div
      style={{
        background: "#F9F6F0",
        padding: "30px",
        borderRadius: "12px",
        border: "1px solid rgba(0,0,0,0.05)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ color: "#2A1F16", marginBottom: "20px", fontSize: "2rem" }}>
        Books Management
      </h2>

      {/* Search + Add Book */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <input
          type="text"
          placeholder="Search by title, author, ISBN..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{
            padding: "10px 14px",
            width: "300px",
            borderRadius: "8px",
            border: "1px solid #d6c8b4",
            background: "#FFF",
          }}
        />

        <button
          onClick={() => navigate(`${basePath}/add-book`)}
          style={{
            background: "#E8D1A7",
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ➕ Add Book
        </button>
      </div>

      {/* Display */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {[
                ["title", "Title"],
                ["author", "Author"],
                ["isbn", "ISBN"],
                ["genre", "Category"],
                ["availableCopies", "Available"],
              ].map(([field, label]) => (
                <th
                  key={field}
                  onClick={() => toggleSort(field as keyof Book)}
                  style={{
                    border: "1px solid #ddd",
                    padding: "12px",
                    background: "#E8D1A7",
                    cursor: "pointer",
                  }}
                >
                  {label}{" "}
                  {sortField === field &&
                    (sortOrder === "asc" ? "▲" : "▼")}
                </th>
              ))}

              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "12px",
                  background: "#E8D1A7",
                }}
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedBooks.map((b) => (
              <tr key={b.id}>
                <td style={{ border: "1px solid #ddd", padding: "12px" }}>
                  {b.title}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "12px" }}>
                  {b.author}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "12px" }}>
                  {b.isbn}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "12px" }}>
                  {(b as any).genre || "-"}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "12px" }}>
                  {b.availableCopies}
                </td>

                <td style={{ border: "1px solid #ddd", padding: "12px" }}>
                  <button
                    onClick={() => handleEdit(b.id)}
                    style={{
                      background: "#E8D1A7",
                      padding: "6px 12px",
                      border: "none",
                      borderRadius: "6px",
                      marginRight: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      handleDelete(b.id, b.availableCopies, b.totalCopies)
                    }
                    style={{
                      background: "#8B7355",
                      padding: "6px 12px",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "white",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div
        style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "center",
          gap: "10px",
        }}
      >
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          style={{ padding: "6px 14px" }}
        >
          Prev
        </button>

        <span style={{ padding: "6px 12px" }}>
          Page {page} / {totalPages}
        </span>

        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          style={{ padding: "6px 14px" }}
        >
          Next
        </button>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ManageBooks;
