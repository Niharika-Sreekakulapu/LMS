import libImage from "../assets/lib.webp";

export default function RegisterPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap');

        /* RESET & BASE */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .rp-container {
          display: flex;
          min-height: 100vh;
          width: 100%;
          font-family: 'Inter', sans-serif;
          background-color: #F5F2EB; /* Cream background */
        }

        /* LEFT SIDE: IMAGE */
        .rp-image-section {
          flex: 1;
          background-image: url('${libImage}'); /* Library image */
          background-size: cover;
          background-position: center;
          position: relative;
        }

        /* Overlay to ensure text readability if needed, or just specific tint */
        .rp-image-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(74, 51, 40, 0.3); /* Slight brown tint */
        }

        /* RIGHT SIDE: CONTENT */
        .rp-content-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 40px;
          background-color: #F5F2EB;
        }

        /* WHITE CARD */
        .rp-card {
          background-color: #FFFFFF;
          padding: 60px 50px;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          width: 100%;
          max-width: 480px;
          text-align: center;
          border: 1px solid rgba(0,0,0,0.02);
        }

        /* TYPOGRAPHY */
        .rp-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.5rem;
          color: #3E2723; /* Dark Coffee Brown */
          margin-bottom: 10px;
          font-weight: 700;
        }

        .rp-subtitle {
          color: #5D4037;
          margin-bottom: 40px;
          font-size: 1rem;
          line-height: 1.5;
        }

        /* BUTTONS */
        .rp-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 16px;
          margin-bottom: 16px;
          background-color: #D7CCC8; /* Tan accent */
          color: #3E2723;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
          box-shadow: 0 4px 6px rgba(215, 204, 200, 0.2);
          gap: 10px;
        }

        .rp-btn:hover {
          background-color: #B8A99A; /* Darker tan on hover */
          transform: translateY(-2px);
        }

        .rp-back-link {
          background: none;
          border: none;
          color: #5D4037;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 500;
          margin-top: 10px;
          transition: color 0.2s;
        }

        .rp-back-link:hover {
          color: #3E2723;
          text-decoration: underline;
        }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .rp-container { flex-direction: column; }
          .rp-image-section { height: 300px; flex: none; }
          .rp-content-section { flex: 1; padding: 20px; }
          .rp-card { padding: 40px 20px; }
        }
      `}</style>

      <div className="rp-container">

        {/* LEFT: IMAGE */}
        <div className="rp-image-section">
          <div className="rp-image-overlay" />
        </div>

        {/* RIGHT: CONTENT */}
        <div className="rp-content-section">
          <div className="rp-card">
            
            <h1 className="rp-title">Register Account</h1>
            <p className="rp-subtitle">Choose how you want to create your account.</p>

            {/* Student Button */}
            <button 
              className="rp-btn" 
              onClick={() => (window.location.href = "/register/student")}
            >
              🎓 Register as Student
            </button>

            {/* Librarian Button */}
            <button 
              className="rp-btn" 
              onClick={() => (window.location.href = "/register/librarian")}
            >
              📚 Register as Librarian
            </button>

            {/* Back Button */}
            <button 
              className="rp-back-link" 
              onClick={() => (window.location.href = "/")}
            >
              ← Back to Home
            </button>

          </div>
        </div>
      </div>
    </>
  );
}
