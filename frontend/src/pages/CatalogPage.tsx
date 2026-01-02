import React, { useEffect, useState } from "react";
import { searchBooksDTO } from "../api/libraryApi";

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

export default function CatalogPage() {
  const [books, setBooks] = useState<BookDTO[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  }

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
          <h1 style={{
            color: "#3E2723",
            fontSize: "2.5rem",
            fontWeight: 700,
            margin: 0,
            fontFamily: "'Playfair Display', serif"
          }}>
            Book Catalog
          </h1>

          <button
            onClick={() => window.location.href = "/"}
            style={{
              padding: "12px 24px",
              background: "transparent",
              color: "#3E2723",
              border: "2px solid #3E2723",
              borderRadius: "25px",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#3E2723";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#3E2723";
            }}
          >
            🏠 Home
          </button>
        </div>

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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
