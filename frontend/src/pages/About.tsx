
import { Link } from "react-router-dom";

export default function About() {
  return (
    <>
      {/* Inject Fonts */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
        `}
      </style>


      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#FDFBF7", // Theme Cream
          paddingTop: "20px",
          fontFamily: "'Inter', sans-serif",
          color: "#3A2618", // Dark Brown
          position: "relative",
          overflowX: "hidden",
        }}
      >
        {/* BACKGROUND DECORATION (Geometric Lines) */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}>
            <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="none">
                <path d="M -200 200 Q 400 800 1600 200" stroke="rgba(58, 38, 24, 0.05)" strokeWidth="1.5" fill="none" />
                <circle cx="5%" cy="90%" r="200" stroke="rgba(58, 38, 24, 0.03)" strokeWidth="1" fill="none" />
            </svg>
        </div>

        <div
          style={{
            width: "100%",
            minHeight: "calc(100vh - 60px)",
            padding: "40px 20px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              maxWidth: "1100px",
              margin: "0 auto",
            }}
          >
            {/* Header Section */}
            <div style={{ textAlign: "center", marginBottom: "60px" }}>
              <p style={{ textTransform: "uppercase", letterSpacing: "2px", fontSize: "0.85rem", color: "#8B5E3C", fontWeight: 600, marginBottom: "15px" }}>
                Our Story
              </p>
              <h1
                style={{
                  fontSize: "3.5rem",
                  fontFamily: "'Playfair Display', serif",
                  color: "#2C1810",
                  marginBottom: "20px",
                  lineHeight: "1.1",
                  fontWeight: 700
                }}
              >
                About BookHive.
              </h1>
              <p
                style={{
                  fontSize: "1.15rem",
                  color: "#5D4037",
                  maxWidth: "600px",
                  margin: "0 auto",
                  lineHeight: "1.6",
                }}
              >
                Transforming library management for the digital age with elegance, 
                simplicity, and powerful automation.
              </p>
            </div>

            {/* Content Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                gap: "40px",
                alignItems: "stretch",
                marginBottom: "80px",
              }}
            >
              {/* Mission - Light Card */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.6)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(58, 38, 24, 0.1)",
                  padding: "40px",
                  borderRadius: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center"
                }}
              >
                <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#3A2618", marginBottom: "25px", fontSize: "2rem" }}>
                  Our Mission
                </h2>
                <p style={{ lineHeight: "1.7", marginBottom: "25px", fontSize: "1.05rem", color: "#5D4037" }}>
                  BookHive is a comprehensive Library Management System designed
                  to revolutionize how educational institutions and libraries
                  manage their resources. Our platform combines cutting-edge
                  technology with intuitive design to create a seamless
                  experience for librarians, staff, and students alike.
                </p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {[
                        "Seamless Book Management",
                        "Automated Workflows",
                        "User-Friendly Interface",
                        "Real-time Analytics"
                    ].map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", color: "#3A2618", fontWeight: 500 }}>
                            <div style={{ width: "20px", height: "1px", background: "#8B5E3C" }}></div>
                            {item}
                        </div>
                    ))}
                </div>
              </div>

              {/* Difference - Dark Card (High Contrast) */}
              <div
                style={{
                  background: "#3A2618", // Dark Brown
                  color: "#FDFBF7", // Cream Text
                  padding: "40px",
                  borderRadius: "24px",
                  boxShadow: "0 20px 40px rgba(58, 38, 24, 0.15)",
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                 {/* Decorative Circle overlay */}
                 <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(255,255,255,0.03)"}}></div>

                <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#FDFBF7", marginBottom: "30px", fontSize: "2rem" }}>
                  What Makes Us Different
                </h2>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                  <div style={{ display: "flex", gap: "15px" }}>
                    <span style={{ fontSize: "1.4rem", background: "rgba(255,255,255,0.1)", width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", flexShrink: 0 }}>⚡</span>
                    <div>
                      <strong style={{ display: "block", fontSize: "1.1rem", marginBottom: "4px" }}>Lightning Fast</strong>
                      <span style={{ opacity: 0.8, lineHeight: "1.5", fontSize: "0.95rem" }}>Optimized performance for even the largest catalogs.</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "15px" }}>
                    <span style={{ fontSize: "1.4rem", background: "rgba(255,255,255,0.1)", width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", flexShrink: 0 }}>🛡</span>
                    <div>
                      <strong style={{ display: "block", fontSize: "1.1rem", marginBottom: "4px" }}>Secure</strong>
                      <span style={{ opacity: 0.8, lineHeight: "1.5", fontSize: "0.95rem" }}>End-to-end encryption and secure data handling standards.</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "15px" }}>
                    <span style={{ fontSize: "1.4rem", background: "rgba(255,255,255,0.1)", width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", flexShrink: 0 }}>📱</span>
                    <div>
                      <strong style={{ display: "block", fontSize: "1.1rem", marginBottom: "4px" }}>Mobile Ready</strong>
                      <span style={{ opacity: 0.8, lineHeight: "1.5", fontSize: "0.95rem" }}>Access your library anywhere, anytime on any device.</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "15px" }}>
                    <span style={{ fontSize: "1.4rem", background: "rgba(255,255,255,0.1)", width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", flexShrink: 0 }}>🔧</span>
                    <div>
                      <strong style={{ display: "block", fontSize: "1.1rem", marginBottom: "4px" }}>Customizable</strong>
                      <span style={{ opacity: 0.8, lineHeight: "1.5", fontSize: "0.95rem" }}>Adapt the system to your specific institutional needs.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action - Clean Minimalist */}
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(58,38,24,0.03) 100%)",
                borderRadius: "30px",
                border: "1px dashed rgba(58, 38, 24, 0.15)",
              }}
            >
              <h2 style={{ fontFamily: "'Playfair Display', serif", marginBottom: "15px", fontSize: "2.5rem", color: "#2C1810" }}>
                Ready to Transform Your Library?
              </h2>
              <p
                style={{
                  margin: "0 auto 30px auto",
                  lineHeight: "1.6",
                  maxWidth: "550px",
                  color: "#5D4037",
                  fontSize: "1.1rem"
                }}
              >
                Join hundreds of institutions worldwide.
                Experience the future of library management today.
              </p>

              <div style={{ display: "flex", gap: "15px", justifyContent: "center", marginBottom: "20px" }}>
                <button
                  onClick={() => window.location.href = "/"}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "transparent",
                    color: "#3A2618",
                    border: "2px solid #3A2618",
                    textDecoration: "none",
                    padding: "12px 24px",
                    borderRadius: "25px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#3A2618";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#3A2618";
                  }}
                >
                  🏠 Home
                </button>

                <Link
                  to="/register"
                  style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#3A2618",
                      color: "white",
                      textDecoration: "none",
                      padding: "12px 24px",
                      borderRadius: "25px",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      boxShadow: "0 10px 20px rgba(58, 38, 24, 0.2)",
                      transition: "transform 0.2s, background 0.2s"
                  }}
                  onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.backgroundColor = "#2C1810";
                  }}
                  onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.backgroundColor = "#3A2618";
                  }}
                >
                  🚀 Get Started
                </Link>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}
