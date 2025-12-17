import { Link } from "react-router-dom";
import NavBar from "./NavBar";
import { motion } from "framer-motion";
import landImage from "../assets/land.jpg";

export default function LandingPage() {
  // Theme colors from the image
  const theme = {
    bg: "#F5F2EB",       // Cream/Beige background
    textMain: "#3E2723", // Dark Coffee Brown
    textSub: "#5D4037",  // Lighter Brown
    accent: "#D7CCC8",   // Tan accent
  };

  return (
    <>
      <NavBar />
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: theme.bg,
          color: theme.textMain,
          fontFamily: "'Inter', sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* DECORATIVE BACKGROUND LINES (The wireframe circles) */}
        <div style={{ position: "absolute", left: "-10%", top: "10%", opacity: 0.4, zIndex: 0, pointerEvents: "none" }}>
            <svg width="600" height="600" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="300" cy="300" r="299.5" stroke="#8D6E63" strokeOpacity="0.3"/>
                <circle cx="300" cy="300" r="240" stroke="#8D6E63" strokeOpacity="0.3"/>
                <path d="M50 300C50 161.929 161.929 50 300 50" stroke="#8D6E63" strokeOpacity="0.3"/>
                <path d="M300 550C438.071 550 550 438.071 550 300" stroke="#8D6E63" strokeOpacity="0.3"/>
            </svg>
        </div>

        {/* MAIN CONTAINER */}
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "160px 20px 40px", // Top padding accounts for absolute Navbar
            display: "flex",
            flexDirection: "row", // Side by side layout
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: "85vh",
            position: "relative",
            zIndex: 1,
            flexWrap: "wrap",
            gap: "40px"
          }}
        >
          {/* LEFT COLUMN: TEXT */}
          <div style={{ flex: "1", minWidth: "300px", maxWidth: "600px" }}>
            <h1
              style={{
                fontFamily: "'Playfair Display', serif", // Serif font for heading
                fontSize: "4.5rem",
                fontWeight: 700,
                lineHeight: 1.1,
                color: theme.textMain,
                margin: "0 0 24px 0",
              }}
            >
              Your Gateway <br />
              to Knowledge.
            </h1>

            <p
              style={{
                fontSize: "1.1rem",
                lineHeight: 1.6,
                color: theme.textSub,
                maxWidth: "450px",
                marginBottom: "40px",
              }}
            >
              Redefining library management with minimalism and efficiency.
              Manage books, students, and staff effortlessly with a clean,
              modern interface tailored for campuses.
            </p>

            {/* BUTTONS */}
            <div style={{ display: "flex", gap: "16px" }}>
              <Link
                to="/register"
                style={{
                  background: theme.textMain,
                  color: "#fff",
                  padding: "16px 32px",
                  borderRadius: "999px",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "1rem",
                  boxShadow: "0 10px 20px rgba(62, 39, 35, 0.2)",
                  transition: "transform 0.2s",
                }}
              >
                Get Started
              </Link>
              
              <Link
                to="/catalog"
                style={{
                    padding: "16px 32px",
                    borderRadius: "999px",
                    border: `1px solid ${theme.textMain}`,
                    color: theme.textMain,
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "1rem",
                }}
              >
                Browse Books
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: IMAGE (With subtle float animation) */}
          <motion.div
            style={{ 
                flex: "1", 
                display: "flex", 
                justifyContent: "flex-end",
                minWidth: "300px"
            }}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <div style={{
                position: "relative",
                width: "100%",
                maxWidth: "450px",
                height: "500px",
                borderRadius: "32px",
                overflow: "hidden",
            }}>
                {/* Image Placeholder - Replace src with a real library/book image */}
                <img
                    src={landImage}
                    alt="Library Books"
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                    }}
                />
            </div>
          </motion.div>
        </div>

      </div>
    </>
  );
}
