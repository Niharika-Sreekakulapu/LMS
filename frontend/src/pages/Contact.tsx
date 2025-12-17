import { useState } from "react";


export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const [loading, setLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitMessage(null);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (formData.name && formData.email && formData.message) {
      setSubmitMessage({
        type: 'success',
        text: 'Thank you! Your message has been sent successfully. We\'ll get back to you shortly.'
      });
      setFormData({ name: "", email: "", subject: "", message: "" });
    } else {
      setSubmitMessage({
        type: 'error',
        text: 'Please fill in all required fields.'
      });
    }

    setLoading(false);
  };

  // Reusable Input Style for consistency
  const inputStyle = {
    width: "100%",
    padding: "14px 20px",
    background: "#fff",
    border: "1px solid #D7CCB8", // Light beige border
    borderRadius: "8px",
    fontSize: "1rem",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "'Inter', sans-serif",
    color: "#3A2618",
  };

  return (
    <>
       {/* Ensure fonts are loaded */}
       <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap');
        `}
      </style>

      
      
      <div
        style={{
          minHeight: "100vh",
          background: "#FDFBF7", // Cream background
          paddingTop: "20px", // Reduced padding since NavBar is transparent
          fontFamily: "'Inter', sans-serif",
          color: "#3A2618",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* BACKGROUND DECORATION (Subtle Curves) */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}>
            <svg width="100%" height="100%" viewBox="0 0 1440 900" preserveAspectRatio="none">
                <path d="M -100 600 Q 400 300 900 900" stroke="rgba(58, 38, 24, 0.05)" strokeWidth="1.5" fill="none" />
                <circle cx="90%" cy="10%" r="400" stroke="rgba(58, 38, 24, 0.03)" strokeWidth="1" fill="none" />
            </svg>
        </div>

        <div
          style={{
            width: "100%",
            minHeight: "calc(100vh - 60px)",
            padding: "40px 20px",
            position: "relative",
            zIndex: 1
          }}
        >
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            
            {/* Header Section */}
            <div style={{ textAlign: "center", marginBottom: "60px" }}>
              <p style={{ textTransform: "uppercase", letterSpacing: "2px", fontSize: "0.85rem", color: "#8B5E3C", fontWeight: 600, marginBottom: "10px" }}>
                Get In Touch
              </p>
              <h1
                style={{
                  fontSize: "3rem",
                  fontFamily: "'Playfair Display', serif",
                  color: "#2C1810",
                  marginBottom: "16px",
                  fontWeight: 700
                }}
              >
                We'd love to hear from you.
              </h1>
              <p
                style={{
                  fontSize: "1.1rem",
                  color: "#5D4037",
                  maxWidth: "500px",
                  margin: "0 auto",
                  lineHeight: "1.6",
                }}
              >
                Have questions about BookHive? Need support or want to learn more?
                Fill out the form below.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 2fr))", gap: "50px", alignItems: "start" }}>
              
              {/* Left Column: Contact Form */}
              <div style={{
                background: "rgba(255, 255, 255, 0.5)", // Semi-transparent
                backdropFilter: "blur(10px)",
                borderRadius: "24px",
                padding: "40px",
                border: "1px solid rgba(58, 38, 24, 0.1)",
              }}>
                <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#3A2618", marginBottom: "30px", fontSize: "1.8rem" }}>Send a Message</h2>

                {submitMessage && (
                  <div style={{
                    padding: "15px",
                    borderRadius: "8px",
                    marginBottom: "25px",
                    backgroundColor: submitMessage.type === 'success' ? '#F1F8E9' : '#FBE9E7',
                    color: submitMessage.type === 'success' ? '#33691E' : '#BF360C',
                    border: `1px solid ${submitMessage.type === 'success' ? '#DCEDC8' : '#FFCCBC'}`,
                    fontSize: "0.95rem"
                  }}>
                    {submitMessage.text}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#5D4037" }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        style={inputStyle}
                        onFocus={(e) => {
                            e.target.style.borderColor = '#3A2618';
                            e.target.style.boxShadow = '0 0 0 3px rgba(58, 38, 24, 0.1)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = '#D7CCB8';
                            e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#5D4037" }}>
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        style={inputStyle}
                        onFocus={(e) => {
                            e.target.style.borderColor = '#3A2618';
                            e.target.style.boxShadow = '0 0 0 3px rgba(58, 38, 24, 0.1)';
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = '#D7CCB8';
                            e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#5D4037" }}>
                      Subject
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      style={{
                          ...inputStyle,
                          cursor: "pointer",
                          appearance: "none", // Remove default arrow
                          // Custom Arrow SVG
                          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233A2618' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 15px center",
                          backgroundSize: "16px"
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3A2618';
                        e.target.style.boxShadow = '0 0 0 3px rgba(58, 38, 24, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#D7CCB8';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <option value="">Select a topic</option>
                      <option value="general">General Inquiry</option>
                      <option value="support">Technical Support</option>
                      <option value="demo">Request Demo</option>
                      <option value="pricing">Pricing Information</option>
                      <option value="partnership">Partnership Opportunities</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: "30px" }}>
                    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "0.9rem", color: "#5D4037" }}>
                      Message *
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={6}
                      style={{...inputStyle, resize: "vertical", lineHeight: "1.6"}}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3A2618';
                        e.target.style.boxShadow = '0 0 0 3px rgba(58, 38, 24, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#D7CCB8';
                        e.target.style.boxShadow = 'none';
                      }}
                      placeholder="Tell us how we can help you..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      background: loading ? "#ccc" : "#3A2618", // Dark brown button
                      color: "white",
                      border: "none",
                      padding: "16px 30px",
                      borderRadius: "50px", // Pill shape
                      fontSize: "1rem",
                      fontWeight: "500",
                      cursor: loading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      transition: "transform 0.2s, background 0.2s",
                      boxShadow: "0 4px 14px rgba(58, 38, 24, 0.2)",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.backgroundColor = "#2C1810";
                      }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.backgroundColor = "#3A2618";
                    }}
                  >
                    {loading ? "Sending..." : "Send Message"}
                  </button>
                </form>
              </div>

              {/* Right Column: Contact Information */}
              {/* Changed to a dark card for contrast */}
              <div style={{ flex: "1" }}>
                <div style={{
                  background: "#3A2618", // Solid Dark Brown
                  color: "#FDFBF7", // Cream Text
                  padding: "40px",
                  borderRadius: "24px",
                  boxShadow: "0 20px 40px rgba(58, 38, 24, 0.15)",
                  marginBottom: "30px",
                  position: "relative",
                  overflow: "hidden"
                }}>
                  {/* Subtle noise/texture overlay optional, or decorative circle */}
                  <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "150px", height: "150px", borderRadius: "50%", background: "rgba(255,255,255,0.05)"}}></div>

                  <h2 style={{ fontFamily: "'Playfair Display', serif", margin: "0 0 30px 0", fontSize: "1.6rem" }}>Contact Information</h2>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                    
                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "1.2rem", background: "rgba(255,255,255,0.1)", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>📧</span>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "0.9rem", opacity: 0.7, marginBottom: "4px" }}>Email</div>
                        <div style={{ fontSize: "1.1rem" }}>support@bookhive.com</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.2rem", background: "rgba(255,255,255,0.1)", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>📱</span>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "0.9rem", opacity: 0.7, marginBottom: "4px" }}>Phone</div>
                        <div style={{ fontSize: "1.1rem" }}>+1 (555) 123-BOOK</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.2rem", background: "rgba(255,255,255,0.1)", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>📍</span>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "0.9rem", opacity: 0.7, marginBottom: "4px" }}>HQ Address</div>
                        <div style={{ lineHeight: "1.5" }}>
                          123 Library Lane<br />
                          Tech City, TC 12345
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.2rem", background: "rgba(255,255,255,0.1)", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%" }}>🕐</span>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "0.9rem", opacity: 0.7, marginBottom: "4px" }}>Hours</div>
                        <div style={{ lineHeight: "1.5" }}>
                          Mon-Fri: 9AM - 6PM<br />
                          Sat-Sun: Closed
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* "Why Choose" Section - Lighter Card */}
                <div style={{
                  border: "1px solid rgba(58, 38, 24, 0.1)",
                  padding: "30px",
                  borderRadius: "24px",
                }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#3A2618", marginBottom: "20px", fontSize: "1.3rem" }}>
                    Why Choose BookHive?
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", color: "#5D4037" }}>
                    {[
                        "Response within 24 hours",
                        "24/7 live chat support",
                        "Free implementation consultation",
                        "Comprehensive documentation"
                    ].map((item, index) => (
                        <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{ width: "6px", height: "6px", background: "#3A2618", borderRadius: "50%" }}></div>
                            {item}
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            </div> 
          </div>
        </div>
      </div>
    </>
  );
}