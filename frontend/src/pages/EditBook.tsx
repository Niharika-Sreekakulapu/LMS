// src/pages/EditBook.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBookDetails, updateBook } from "../api/libraryApi";
import { useAuth } from "../hooks/useAuth";
import Toast from "../components/Toast";

type ToastType = "success" | "error" | "info" | "warning";

const EditBook: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { auth } = useAuth();

  const canManageBooks = !!auth?.user && (auth.user.role === "ADMIN" || auth.user.role === "LIBRARIAN");

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    isbn: "",
    genre: "",
    quantity: "",
    accessType: "normal",
    availableCopies: 0,
    price: "",
    description: ""
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    if (!id) return;
    void loadBookData();
  }, [id]);

  const loadBookData = async () => {
    setLoading(true);
    try {
      const resp = await getBookDetails(Number(id));
      const d = resp.data;
      setFormData({
        title: d.title ?? "",
        author: d.author ?? "",
        isbn: d.isbn ?? "",
        genre: d.genre ?? "",
        quantity: String(d.totalCopies ?? 0),
        // BookDTO uses accessLevel; normalize to lower-case option values
        accessType: (d.accessLevel && String(d.accessLevel).toLowerCase() === 'premium') ? 'premium' : 'normal',
        availableCopies: d.availableCopies ?? 0,
        price: String(d.mrp ?? ""),
        description: d.tags ?? ""
      });
    } catch (err) {
      console.error("Load error:", err);
      setToast({ message: "Failed to load book", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageBooks) {
      alert("You do not have permission to update books.");
      return;
    }

    setSaving(true);
    try {
      if (!formData.title.trim() || !formData.author.trim()) {
        alert("Please provide title and author");
        setSaving(false);
        return;
      }
      const qty = Number(formData.quantity || 0);
      if (!qty || qty <= 0) {
        alert("Quantity must be a positive number");
        setSaving(false);
        return;
      }

      const price = formData.price.trim() ? Number(formData.price) : null;
      if (price === null || price < 0) {
        alert("Price is required and must be non-negative for penalty calculations");
        setSaving(false);
        return;
      }

      await updateBook(Number(id), {
        title: formData.title.trim(),
        author: formData.author.trim(),
        isbn: formData.isbn.trim() || undefined,
        genre: formData.genre || null,
        totalCopies: qty,
        availableCopies: qty, // When admin changes total copies, set available copies to match
        mrp: price,
        accessLevel: (formData.accessType || 'normal').toLowerCase()
        ,
        tags: formData.description?.trim() || undefined
      });

      setToast({ message: "Book updated successfully!", type: "success" });

      // Navigate back after successful update
      if (auth?.user?.role === "ADMIN") navigate("/admin/books");
      else navigate("/library-dashboard/manage-book");

    } catch (err) {
      console.error("Update error:", err);
      setToast({ message: "Update failed", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      padding: "20px",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      background: "#F9F6F0"
    }}>
      <div style={{ width: "100%", maxWidth: "1200px" }}>
        <div style={{
          background: "#F9F6F0",
          borderRadius: 20,
          boxShadow: "0 20px 40px rgba(0,0,0,0.1), 0 10px 20px rgba(0,0,0,0.05)",
          padding: "50px 60px",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 120,
            height: 120,
            background: "linear-gradient(45deg, #D2691E20, #8B451320)",
            borderRadius: "50%",
            filter: "blur(30px)"
          }} />

          <h1 style={{
            fontSize: 32,
            fontWeight: 800,
            color: "#2A1F16",
            marginBottom: 32,
            textAlign: "center",
            position: "relative",
            zIndex: 1
          }}>
            ✏️ Edit Book
          </h1>

          <form onSubmit={handleSubmit}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px", fontSize: "18px", color: "#6c757d" }}>
                Loading book details...
              </div>
            ) : (
              <div>
                {/* Book Details Section */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 16,
                    borderBottom: "2px solid #f3f4f6",
                    paddingBottom: 8
                  }}>
                    Book Information
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    {/* Left Column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* Title */}
                      <div>
                        <label style={{
                          display: "block",
                          fontSize: 18,
                          fontWeight: 600,
                          color: "#374151",
                          marginBottom: 8
                        }}>
                          Book Title *
                        </label>
                        <input
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          required
                          placeholder="Enter book title"
                          style={{
                            width: "100%",
                            padding: "16px 20px",
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            fontSize: 18,
                            background: "white",
                            transition: "border-color 0.2s",
                            outline: "none",
                            boxSizing: "border-box"
                          }}
                          onFocus={(e) => (e.target as HTMLElement).style.borderColor = "#3b82f6"}
                          onBlur={(e) => (e.target as HTMLElement).style.borderColor = "#d1d5db"}
                        />
                      </div>

                      {/* Author */}
                      <div>
                        <label style={{
                          display: "block",
                          fontSize: 18,
                          fontWeight: 600,
                          color: "#374151",
                          marginBottom: 8
                        }}>
                          Author *
                        </label>
                        <input
                          name="author"
                          value={formData.author}
                          onChange={handleInputChange}
                          required
                          placeholder="Enter author name"
                          style={{
                            width: "100%",
                            padding: "16px 20px",
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            fontSize: 18,
                            background: "white",
                            transition: "border-color 0.2s",
                            outline: "none",
                            boxSizing: "border-box"
                          }}
                          onFocus={(e) => (e.target as HTMLElement).style.borderColor = "#3b82f6"}
                          onBlur={(e) => (e.target as HTMLElement).style.borderColor = "#d1d5db"}
                        />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* ISBN */}
                      <div>
                        <label style={{
                          display: "block",
                          fontSize: 18,
                          fontWeight: 600,
                          color: "#374151",
                          marginBottom: 8
                        }}>
                          ISBN
                        </label>
                        <input
                          name="isbn"
                          value={formData.isbn}
                          onChange={handleInputChange}
                          placeholder="Enter ISBN"
                          style={{
                            width: "100%",
                            padding: "16px 20px",
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            fontSize: 18,
                            background: "white",
                            transition: "border-color 0.2s",
                            outline: "none",
                            boxSizing: "border-box"
                          }}
                          onFocus={(e) => (e.target as HTMLElement).style.borderColor = "#3b82f6"}
                          onBlur={(e) => (e.target as HTMLElement).style.borderColor = "#d1d5db"}
                        />
                      </div>

                      {/* Genre */}
                      <div>
                        <label style={{
                          display: "block",
                          fontSize: 18,
                          fontWeight: 600,
                          color: "#374151",
                          marginBottom: 8
                        }}>
                          Genre
                        </label>
                        <select
                          name="genre"
                          value={formData.genre}
                          onChange={handleInputChange}
                          style={{
                            width: "100%",
                            padding: "12px 16px",
                            border: "1px solid #d1d5db",
                            borderRadius: 8,
                            fontSize: 18,
                            background: "white",
                            transition: "border-color 0.2s",
                            outline: "none",
                            boxSizing: "border-box"
                          }}
                          onFocus={(e) => (e.target as HTMLElement).style.borderColor = "#3b82f6"}
                          onBlur={(e) => (e.target as HTMLElement).style.borderColor = "#d1d5db"}
                        >
                          <option value="">Select genre</option>
                          <option value="Fiction">Fiction</option>
                          <option value="Non-Fiction">Non-Fiction</option>
                          <option value="Science">Science</option>
                          <option value="Technology">Technology</option>
                          <option value="Programming">Programming</option>
                          <option value="AI/Machine Learning">AI/Machine Learning</option>
                          <option value="Cybersecurity">Cybersecurity</option>
                          <option value="History">History</option>
                          <option value="Biography">Biography</option>
                          <option value="Self-Help">Self-Help</option>
                          <option value="Business">Business</option>
                          <option value="Health">Health</option>
                          <option value="Education">Education</option>
                          <option value="Children">Children's Books</option>
                          <option value="Horror">Horror</option>
                          <option value="Mystery">Mystery</option>
                          <option value="Romance">Romance</option>
                          <option value="Fantasy">Fantasy</option>
                          <option value="Science Fiction">Science Fiction</option>
                          <option value="Thriller">Thriller</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                    {/* Description (full width) */}
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{
                        display: "block",
                        fontSize: 18,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 8
                      }}>
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={4}
                        placeholder="Enter book description (optional)"
                        style={{
                          width: "100%",
                          padding: "16px 20px",
                          border: "1px solid #d1d5db",
                          borderRadius: 8,
                          fontSize: 18,
                          background: "white",
                          transition: "border-color 0.2s",
                          outline: "none",
                          boxSizing: "border-box",
                          resize: "vertical",
                          fontFamily: "inherit"
                        }}
                        onFocus={(e) => (e.target as HTMLElement).style.borderColor = "#3b82f6"}
                        onBlur={(e) => (e.target as HTMLElement).style.borderColor = "#d1d5db"}
                      />
                    </div>
                {/* Additional Details Section */}
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: 16,
                    borderBottom: "2px solid #f3f4f6",
                    paddingBottom: 8
                  }}>
                    Additional Details
                  </h3>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, alignItems: "start" }}>
                    {/* Quantity */}
                    <div>
                      <label style={{
                        display: "block",
                        fontSize: 18,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 8
                      }}>
                        Quantity *
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        min={1}
                        required
                        placeholder="Enter number of copies"
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          border: "1px solid #d1d5db",
                          borderRadius: 8,
                          fontSize: 18,
                          background: "white",
                          transition: "border-color 0.2s",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                        onFocus={(e) => (e.target as HTMLElement).style.borderColor = "#3b82f6"}
                        onBlur={(e) => (e.target as HTMLElement).style.borderColor = "#d1d5db"}
                      />
                    </div>

                    {/* Price */}
                    <div>
                      <label style={{
                        display: "block",
                        fontSize: 18,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 8
                      }}>
                        Price (₹) *
                      </label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        min={0}
                        step="0.01"
                        required
                        placeholder="Enter price (required for fines)"
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          border: "1px solid #d1d5db",
                          borderRadius: 8,
                          fontSize: 18,
                          background: "white",
                          transition: "border-color 0.2s",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                        onFocus={(e) => (e.target as HTMLElement).style.borderColor = "#3b82f6"}
                        onBlur={(e) => (e.target as HTMLElement).style.borderColor = "#d1d5db"}
                      />
                    </div>

                    {/* Access Type */}
                    <div>
                      <label style={{
                        display: "block",
                        fontSize: 18,
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: 8
                      }}>
                        Access Type
                      </label>
                      <select
                        name="accessType"
                        value={formData.accessType}
                        onChange={handleInputChange}
                        style={{
                          width: "100%",
                          padding: "12px 16px",
                          border: "1px solid #d1d5db",
                          borderRadius: 8,
                          fontSize: 18,
                          background: "white",
                          transition: "border-color 0.2s",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                        onFocus={(e) => (e.target as HTMLElement).style.borderColor = "#3b82f6"}
                        onBlur={(e) => (e.target as HTMLElement).style.borderColor = "#d1d5db"}
                      >
                        <option value="normal">📖 Normal</option>
                        <option value="premium">💎 Premium</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 16,
                  paddingTop: 24,
                  borderTop: "1px solid #f3f4f6"
                }}>
                  <button
                    type="submit"
                    disabled={saving || !canManageBooks}
                    style={{
                      padding: "12px 24px",
                      border: "none",
                      background: saving || !canManageBooks ?
                        "linear-gradient(145deg, #A0522D, #8B4513)" :
                        "linear-gradient(145deg, #8B4513, #654321)",
                      borderRadius: 10,
                      fontSize: 18,
                      fontWeight: 700,
                      color: "white",
                      cursor: saving || !canManageBooks ? "not-allowed" : "pointer",
                      transition: "all 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "0 4px 15px rgba(139,69,19,0.3)",
                      transform: "translateY(0)"
                    }}
                    onMouseEnter={(e) => {
                      if (!saving && canManageBooks) {
                        (e.target as HTMLElement).style.background = "linear-gradient(145deg, #A0522D, #8B4513)";
                        (e.target as HTMLElement).style.transform = "translateY(-2px)";
                        (e.target as HTMLElement).style.boxShadow = "0 6px 20px rgba(139,69,19,0.4)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!saving && canManageBooks) {
                        (e.target as HTMLElement).style.background = "linear-gradient(145deg, #8B4513, #654321)";
                        (e.target as HTMLElement).style.transform = "translateY(0)";
                        (e.target as HTMLElement).style.boxShadow = "0 4px 15px rgba(139,69,19,0.3)";
                      }
                    }}
                    onMouseDown={(e) => {
                      if (!saving && canManageBooks) {
                        (e.target as HTMLElement).style.transform = "translateY(0)";
                        (e.target as HTMLElement).style.boxShadow = "0 2px 10px rgba(139,69,19,0.4)";
                      }
                    }}
                  >
                    {saving ? "⏳" : "💾"}
                    {saving ? "Updating Book..." : "Update Book"}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    style={{
                      padding: "12px 24px",
                      border: "1px solid #d1d5db",
                      background: "white",
                      borderRadius: 10,
                      fontSize: 18,
                      fontWeight: 600,
                      color: "#374151",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      transform: "translateY(0)"
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.background = "#f9fafb";
                      (e.target as HTMLElement).style.borderColor = "#9ca3af";
                      (e.target as HTMLElement).style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.background = "white";
                      (e.target as HTMLElement).style.borderColor = "#d1d5db";
                      (e.target as HTMLElement).style.transform = "translateY(0)";
                    }}
                  >
                    ⬅️ Back
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default EditBook;
