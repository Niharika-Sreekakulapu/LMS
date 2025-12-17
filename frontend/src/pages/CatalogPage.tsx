import React, { useEffect, useState } from "react";
import { searchBooksDTO } from "../api/libraryApi";
import { useAuth } from "../hooks/useAuth";
import { createIssueRequest } from "../api/libraryApi";
import Toast from "../components/Toast";

interface BookDTO {
  id: number;
  title: string;
  author?: string;
  isbn?: string;
  genre?: string;
  publisher?: string;
  totalCopies: number;
  availableCopies: number;
  accessLevel?: string;
  mrp?: number;
}

type ToastType = "success" | "error" | "info" | "warning";

export default function CatalogPage() {
  const { auth } = useAuth();
  const [books, setBooks] = useState<BookDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType = "info") => setToast({ message, type });

  useEffect(() => {
    void loadBooks();
  }, []);

  async function loadBooks() {
    setLoading(true);
    try {
      const resp = await searchBooksDTO({});
      setBooks(resp.data);
    } catch (err) {
      console.error("Error loading books:", err);
      showToast("Failed to load books", "error");
    } finally {
      setLoading(false);
    }
  }

  const handleRequestBook = async (bookId: number) => {
    if (!auth.user) {
      showToast("Please login to request books", "warning");
      return;
    }
    try {
      await createIssueRequest(bookId);
      showToast("Book request submitted successfully!", "success");
      // Optionally reload books to update available copies, but since it's not real-time, maybe not
    } catch (err) {
      console.error("Error requesting book:", err);
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to request book";
      showToast(errorMsg, "error");
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F9F6F0"
      }}>
        <div>Loading catalog...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#F9F6F0",
      minHeight: "100vh",
      padding: "40px 20px"
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        <h1 style={{
          textAlign: "center",
          color: "#3E2723",
          fontSize: "2.5rem",
          fontWeight: 700,
          marginBottom: "40px",
          fontFamily: "'Playfair Display', serif"
        }}>
          Book Catalog
        </h1>

        {books.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "40px",
            color: "#6c757d"
          }}>
            No books available in the catalog.
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "24px"
          }}>
            {books.map((book) => (
              <div key={book.id} style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                border: "1px solid #e6e2da",
                display: "flex",
                flexDirection: "column",
                height: "100%"
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    color: "#3E2723",
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    margin: "0 0 8px 0",
                    lineHeight: 1.3
                  }}>
                    {book.title}
                  </h3>

                  <p style={{
                    color: "#5D4037",
                    fontSize: "1rem",
                    margin: "0 0 12px 0",
                    fontWeight: 500
                  }}>
                    by {book.author || "Unknown Author"}
                  </p>

                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    marginBottom: "16px"
                  }}>
                    {book.genre && (
                      <span style={{
                        fontSize: "0.9rem",
                        color: "#8D6E63",
                        fontWeight: 500
                      }}>
                        Genre: {book.genre}
                      </span>
                    )}

                    {book.publisher && (
                      <span style={{
                        fontSize: "0.9rem",
                        color: "#8D6E63",
                        fontWeight: 500
                      }}>
                        Publisher: {book.publisher}
                      </span>
                    )}

                    <span style={{
                      fontSize: "0.9rem",
                      color: "#8D6E63",
                      fontWeight: 500
                    }}>
                      Available: {book.availableCopies} / {book.totalCopies}
                    </span>

                    {book.accessLevel && (
                      <span style={{
                        fontSize: "0.85rem",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: book.accessLevel.toLowerCase() === 'premium' ? "#FBBF24" : "#10B981",
                        color: book.accessLevel.toLowerCase() === 'premium' ? "#92400E" : "#064E3B",
                        fontWeight: 600,
                        alignSelf: "flex-start"
                      }}>
                        {book.accessLevel}
                      </span>
                    )}
                  </div>
                </div>

                {auth.user && book.availableCopies > 0 && (
                  <button
                    onClick={() => handleRequestBook(book.id)}
                    style={{
                      padding: "12px 20px",
                      background: "linear-gradient(145deg, #8B4513, #654321)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      marginTop: "16px"
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background = "linear-gradient(145deg, #A0522D, #8B4513)";
                      (e.target as HTMLElement).style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background = "linear-gradient(145deg, #8B4513, #654321)";
                      (e.target as HTMLElement).style.transform = "translateY(0)";
                    }}
                  >
                    Request Book
                  </button>
                )}

                {(!auth.user || book.availableCopies === 0) && (
                  <div style={{
                    padding: "12px 20px",
                    background: book.availableCopies === 0 ? "#f3f4f6" : "#e5e7eb",
                    color: book.availableCopies === 0 ? "#dc2626" : "#6b7280",
                    borderRadius: "8px",
                    fontWeight: 500,
                    textAlign: "center",
                    marginTop: "16px",
                    fontSize: "0.9rem"
                  }}>
                    {book.availableCopies === 0 ? "Currently Unavailable" : "Login to Request"}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
