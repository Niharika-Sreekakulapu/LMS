import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function NavBar() {
  const { auth } = useAuth();

  // Colors based on the image
  const colors = {
    text: "#3E2723", // Dark Brown
    bg: "#F5F2EB",    // Beige
    accent: "#D7CCC8"
  };

  return (
    <nav
      style={{
        width: "100%",
        padding: "20px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "transparent", // Transparent to blend with page
        position: "absolute", // Absolute to sit on top of hero
        top: 0,
        zIndex: 9999,
        boxSizing: "border-box",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* LEFT: Text Logo (Matching "Libris." style) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
            <div
            style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: colors.text,
                fontFamily: "'Playfair Display', serif", // Serif for the Logo
                letterSpacing: "-0.5px"
            }}
            >
            BookHive.
            </div>
        </Link>
      </div>

      {/* CENTER LINKS */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        <ul
          style={{
            display: "flex",
            gap: 40,
            listStyle: "none",
            margin: 0,
            padding: 0,
            alignItems: "center",
          }}
        >
          {[
            { to: "/", label: "Home" },
            { to: "/catalog", label: "Catalog" },
            { to: "/about", label: "About" },
            { to: "/contact", label: "Contact" },
          ].map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                style={{
                  fontSize: "1rem",
                  fontWeight: 500,
                  color: colors.text,
                  textDecoration: "none",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.opacity = "0.7"}
                onMouseLeave={(e) => (e.target as HTMLElement).style.opacity = "1"}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* RIGHT: Login Button Always Visible */}
      <Link
        to="/login"
        style={{
          padding: "10px 28px",
          borderRadius: "999px",
          border: `1px solid ${colors.text}`,
          color: colors.text,
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "0.95rem",
          transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.background = colors.text;
          (e.target as HTMLElement).style.color = "#FFF";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.background = "transparent";
          (e.target as HTMLElement).style.color = colors.text;
        }}
      >
        Login
      </Link>
    </nav>
  );
}
