import { useState, useEffect, useMemo } from "react";
import { getPopularBooksAnalytics, getCategoryTrendsAnalytics, getPopularBooksTimeSeries } from "../../api/libraryApi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function AIAnalyticsPage() {
  const [popularBooks, setPopularBooks] = useState<Record<string, number>>({});
  const [categoryTrends, setCategoryTrends] = useState<Record<string, number>>({});
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Time-series data for charts
  const [timeSeries, setTimeSeries] = useState<Array<{date: string; count: number}>>([]);

  // Pie data derived from category trends
  const pieData = useMemo(() => Object.entries(categoryTrends || {}).map(([name, value]) => ({ name, value })), [categoryTrends]);

  // Full month data with all days
  const fullMonthData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    // Create map of existing data
    const dataMap = new Map(timeSeries.map(item => [item.date, item.count]));

    // Generate full month data
    const fullData = [];
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      fullData.push({
        date: dateStr,
        count: dataMap.get(dateStr) || 0
      });
    }
    return fullData;
  }, [timeSeries]);

  useEffect(() => {
    loadRecommendationAnalytics();
  }, []);

  const loadRecommendationAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      // keep global filters for counts, but ensure time-series covers current month by default
      const seriesParams: Record<string, string> = {};
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      seriesParams.since = firstDayOfMonth.toISOString().split('T')[0];

      const [popularResponse, trendsResponse, seriesResponse] = await Promise.all([
        getPopularBooksAnalytics(undefined),
        getCategoryTrendsAnalytics(undefined),
        getPopularBooksTimeSeries(Object.keys(seriesParams).length ? seriesParams : undefined)
      ]);

      setPopularBooks(popularResponse.data);
      setCategoryTrends(trendsResponse.data);
      setTimeSeries(seriesResponse.data || []);
    } catch (error) {
      console.error('Error loading recommendation analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, Arial, sans-serif", padding: "20px" }}>
      {/* Simple Header */}
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{
          color: "#2A1F16",
          margin: "0 0 8px 0",
          fontSize: "2.5rem",
          fontWeight: "800",
          display: "flex",
          alignItems: "center",
          gap: "15px",
        }}>
          📚 Library Analytics Hub
        </h1>
        <p style={{
          color: "#666",
          fontSize: "1.1rem",
          margin: "0",
          lineHeight: "1.5",
        }}>
          Discover insights from our intelligent recommendation system. Understand user preferences,
          track popular books, and optimize your library collection with data-driven decisions! 📈✨
        </p>
      </div>

      {/* Spacer */}
      <div style={{ height: 16 }} />

      {analyticsLoading ? (
        <div style={{
          textAlign: "center",
          padding: "80px",
          background: "white",
          borderRadius: "20px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          marginBottom: "40px"
        }}>
          <div style={{
            fontSize: "4rem",
            marginBottom: "20px",
            animation: "pulse 1.5s ease-in-out infinite"
          }}>
            🔄
          </div>
          <div style={{
            fontSize: "1.5rem",
            color: "#666",
            fontWeight: "600"
          }}>
            Analyzing AI Recommendation Data...
          </div>
          <div style={{
            fontSize: "1rem",
            color: "#999",
            marginTop: "10px"
          }}>
            Our AI is processing user preferences and book patterns
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "40px" }}>
          {/* Key Metrics Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "24px",
            marginBottom: "20px"
          }}>
            <div style={{
              background: "white",
              color: "#2A1F16",
              padding: "30px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 4px 15px rgba(139, 69, 19, 0.1)",
              border: "1px solid #E8D1A7"
            }}>
              <div style={{ fontSize: "3rem", marginBottom: "15px", color: "#8B4513" }}>📚</div>
              <div style={{ fontSize: "2.5rem", fontWeight: "900", marginBottom: "8px", color: "#2A1F16" }}>
                {Object.keys(popularBooks).length}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#666" }}>
                Books Analyzed
              </div>
              <div style={{ fontSize: "0.9rem", color: "#999", marginTop: "8px" }}>
                AI-processed library collection
              </div>
            </div>

            <div style={{
              background: "white",
              color: "#2A1F16",
              padding: "30px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 4px 15px rgba(139, 69, 19, 0.1)",
              border: "1px solid #E8D1A7"
            }}>
              <div style={{ fontSize: "3rem", marginBottom: "15px", color: "#8B4513" }}>📊</div>
              <div style={{ fontSize: "2.5rem", fontWeight: "900", marginBottom: "8px", color: "#2A1F16" }}>
                {Object.keys(categoryTrends).length}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#666" }}>
                Categories Tracked
              </div>
              <div style={{ fontSize: "0.9rem", color: "#999", marginTop: "8px" }}>
                Genre-based analytics
              </div>
            </div>

            <div style={{
              background: "white",
              color: "#2A1F16",
              padding: "30px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 4px 15px rgba(139, 69, 19, 0.1)",
              border: "1px solid #E8D1A7"
            }}>
              <div style={{ fontSize: "3rem", marginBottom: "15px", color: "#8B4513" }}>🚀</div>
              <div style={{ fontSize: "2.5rem", fontWeight: "900", marginBottom: "8px", color: "#2A1F16" }}>
                {Object.values(popularBooks).reduce((sum, count) => sum + count, 0)}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#666" }}>
                Total Recommendations
              </div>
              <div style={{ fontSize: "0.9rem", color: "#999", marginTop: "8px" }}>
                AI-generated suggestions
              </div>
            </div>

            <div style={{
              background: "white",
              color: "#2A1F16",
              padding: "30px",
              borderRadius: "12px",
              textAlign: "center",
              boxShadow: "0 4px 15px rgba(139, 69, 19, 0.1)",
              border: "1px solid #E8D1A7"
            }}>
              <div style={{ fontSize: "3rem", marginBottom: "15px", color: "#8B4513" }}>🎯</div>
              <div style={{ fontSize: "2.5rem", fontWeight: "900", marginBottom: "8px", color: "#2A1F16" }}>
                {Math.round(Object.values(categoryTrends).reduce((sum, count) => sum + count, 0) / Math.max(Object.keys(categoryTrends).length, 1))}
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: "600", color: "#666" }}>
                Avg Category Score
              </div>
              <div style={{ fontSize: "0.9rem", color: "#999", marginTop: "8px" }}>
                Popularity per genre
              </div>
            </div>
          </div>

          {/* Trend & Genre (side-by-side) */}
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 50%', minWidth: 280 }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '18px',
                border: '1px solid #E8D1A7',
                boxShadow: '0 6px 20px rgba(139, 69, 19, 0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#2A1F16' }}>Monthly Borrow Trend</div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Current Month</div>
                </div>
                <div style={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <LineChart data={fullMonthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#8B4513" strokeWidth={3} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div style={{ flex: '1 1 50%', minWidth: 280 }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '18px',
                border: '1px solid #E8D1A7',
                boxShadow: '0 6px 20px rgba(139, 69, 19, 0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#2A1F16' }}>Genre Distribution</div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>Last 90 days → Now</div>
                </div>

                {pieData && pieData.length > 0 && pieData.reduce((s, d) => s + (d.value || 0), 0) > 0 ? (
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Tooltip />
                        <Legend layout="vertical" align="right" verticalAlign="middle" />
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                          {pieData.map((entry, idx) => (
                            <Cell key={`cell-${entry.name}`} fill={["#8B4513", "#D2691E", "#CD853F", "#F4E4BC", "#A0522D"][idx % 5]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px', opacity: 0.6 }}>📊</div>
                    <div style={{ fontWeight: 700, color: '#2A1F16' }}>No Genre Data</div>
                    <div style={{ color: '#999' }}>Genre distribution will appear here once borrowing data is available.</div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Main Analytics Sections */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "32px" }}>
            {/* Popular Books Section */}
            <div style={{
              background: "linear-gradient(145deg, #ffffff 0%, #fefefe 100%)",
              borderRadius: "16px",
              padding: "32px",
              boxShadow: "0 8px 32px rgba(139, 69, 19, 0.15), 0 2px 8px rgba(139, 69, 19, 0.1)",
              border: "2px solid #E8D1A7",
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Classic top accent */}
              <div style={{
                position: "absolute",
                top: "0",
                left: "0",
                right: "0",
                height: "6px",
                background: "linear-gradient(90deg, #8B4513, #D2691E, #654321)",
                borderRadius: "16px 16px 0 0"
              }} />

              <div style={{
                position: "relative",
                zIndex: 2
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px"
                }}>
                  <div style={{
                    fontSize: "2.5rem",
                    marginRight: "16px",
                    color: "#8B4513"
                  }}>
                    📚
                  </div>
                  <div>
                    <h2 style={{
                      color: "#2A1F16",
                      margin: "0 0 4px 0",
                      fontSize: "1.8rem",
                      fontWeight: "800",
                      textAlign: "center"
                    }}>
                      Trending Books
                    </h2>
                    <p style={{
                      color: "#666",
                      margin: 0,
                      fontSize: "1rem",
                      textAlign: "center",
                      fontWeight: "500"
                    }}>
                      Most Popular Reads
                    </p>
                  </div>
                </div>



                <div style={{
                  maxHeight: "420px",
                  overflowY: "auto",
                  paddingRight: "8px"
                }}>
                  {Object.keys(popularBooks).length > 0 ? (
                    Object.entries(popularBooks)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 10)
                      .map(([bookTitle], index) => (
                        <div key={bookTitle} style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "18px 20px",
                          marginBottom: "12px",
                          background: index < 3 ? "linear-gradient(135deg, #fff8dc 0%, #f5f5dc 100%)" : "#f8f9fa",
                          borderRadius: "12px",
                          border: index < 3 ? "2px solid #daa520" : "1px solid #e9ecef",
                          boxShadow: index < 3 ? "0 4px 12px rgba(218, 165, 32, 0.2)" : "0 2px 4px rgba(0,0,0,0.05)",
                          position: "relative"
                        }}>
                          {index < 3 && (
                            <div style={{
                              position: "absolute",
                              top: "-8px",
                              left: "20px",
                              background: index === 0 ? "#ffd700" : index === 1 ? "#c0c0c0" : "#cd7f32",
                              color: index === 0 ? "#1a1a1a" : "white",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "0.8rem",
                              fontWeight: "900",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                            }}>
                              #{index + 1}
                            </div>
                          )}

                          <div style={{
                            flex: 1,
                            fontSize: "1rem",
                            fontWeight: index < 3 ? "700" : "600",
                            color: "#2A1F16",
                            marginTop: index < 3 ? "8px" : "0"
                          }}>
                            {bookTitle}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div style={{
                      textAlign: "center",
                      padding: "80px 20px",
                      color: "#666"
                    }}>
                      <div style={{
                        fontSize: "4rem",
                        marginBottom: "20px",
                        opacity: "0.7"
                      }}>
                        📚
                      </div>
                      <div style={{
                        fontSize: "1.3rem",
                        fontWeight: "700",
                        marginBottom: "12px",
                        color: "#2A1F16"
                      }}>
                        No Reading Data Yet
                      </div>
                      <div style={{
                        fontSize: "1rem",
                        color: "#999",
                        lineHeight: "1.5"
                      }}>
                        Popular books will appear here as users start borrowing from your library collection
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Category Trends Section */}
            <div style={{
              background: "linear-gradient(145deg, #ffffff 0%, #fefefe 100%)",
              borderRadius: "16px",
              padding: "32px",
              boxShadow: "0 8px 32px rgba(139, 69, 19, 0.15), 0 2px 8px rgba(139, 69, 19, 0.1)",
              border: "2px solid #E8D1A7",
              position: "relative",
              overflow: "hidden"
            }}>
              {/* Classic top accent */}
              <div style={{
                position: "absolute",
                top: "0",
                left: "0",
                right: "0",
                height: "6px",
                background: "linear-gradient(90deg, #D2691E, #8B4513, #442D1C)",
                borderRadius: "16px 16px 0 0"
              }} />

              <div style={{
                position: "relative",
                zIndex: 2
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px"
                }}>
                  <div style={{
                    fontSize: "2.5rem",
                    marginRight: "16px",
                    color: "#8B4513"
                  }}>
                    📊
                  </div>
                  <div>
                    <h2 style={{
                      color: "#2A1F16",
                      margin: "0 0 4px 0",
                      fontSize: "1.8rem",
                      fontWeight: "800",
                      textAlign: "center"
                    }}>
                      Genre Insights
                    </h2>
                    <p style={{
                      color: "#666",
                      margin: 0,
                      fontSize: "1rem",
                      textAlign: "center",
                      fontWeight: "500"
                    }}>
                      Popular Categories
                    </p>
                  </div>
                </div>

                <div style={{
                  maxHeight: "420px",
                  overflowY: "auto",
                  paddingRight: "8px"
                }}>
                  {Object.keys(categoryTrends).length > 0 ? (
                    Object.entries(categoryTrends)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 10)
                      .map(([category], index) => (
                        <div key={category} style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "18px 20px",
                          marginBottom: "12px",
                          background: index < 3 ? "linear-gradient(135deg, #fff8dc 0%, #f5f5dc 100%)" : "#f8f9fa",
                          borderRadius: "12px",
                          border: index < 3 ? "2px solid #daa520" : "1px solid #e9ecef",
                          boxShadow: index < 3 ? "0 4px 12px rgba(218, 165, 32, 0.2)" : "0 2px 4px rgba(0,0,0,0.05)",
                          position: "relative"
                        }}>
                          {index < 3 && (
                            <div style={{
                              position: "absolute",
                              top: "-8px",
                              left: "20px",
                              background: index === 0 ? "#ffd700" : index === 1 ? "#c0c0c0" : "#cd7f32",
                              color: index === 0 ? "#1a1a1a" : "white",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "0.8rem",
                              fontWeight: "900",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                            }}>
                              #{index + 1}
                            </div>
                          )}

                          <div style={{
                            fontSize: "1rem",
                            fontWeight: index < 3 ? "700" : "600",
                            color: "#2A1F16",
                            marginTop: index < 3 ? "8px" : "0"
                          }}>
                            {category}
                          </div>
                        </div>
                      ))
                  ) : (
                    <div style={{
                      textAlign: "center",
                      padding: "80px 20px",
                      color: "#666"
                    }}>
                      <div style={{
                        fontSize: "4rem",
                        marginBottom: "20px",
                        opacity: "0.7"
                      }}>
                        📊
                      </div>
                      <div style={{
                        fontSize: "1.3rem",
                        fontWeight: "700",
                        marginBottom: "12px",
                        color: "#2A1F16"
                      }}>
                        No Genre Data Yet
                      </div>
                      <div style={{
                        fontSize: "1rem",
                        color: "#999",
                        lineHeight: "1.5"
                      }}>
                        Category insights will appear as users borrow books from different genres
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights Section */}
          <div style={{
            background: "linear-gradient(135deg, #f8f5efff 0%, #eee4d1ff 100%)",
            borderRadius: "20px",
            padding: "40px",
            textAlign: "center",
            boxShadow: "0 12px 40px rgba(139, 69, 19, 0.2)",
            position: "relative",
            overflow: "hidden",
            border: "2px solid rgba(139, 69, 19, 0.1)"
          }}>
            <div style={{
              position: "absolute",
              top: "-30px",
              right: "-30px",
              width: "100px",
              height: "100px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: "50%",
              animation: "float 6s ease-in-out infinite"
            }} />
            <div style={{
              position: "absolute",
              bottom: "-20px",
              left: "-20px",
              width: "80px",
              height: "80px",
              background: "rgba(255,255,255,0.15)",
              borderRadius: "50%",
              animation: "float 8s ease-in-out infinite reverse"
            }} />

            <div style={{ position: "relative", zIndex: 2 }}>
              <div style={{ fontSize: "3rem", marginBottom: "20px" }}>🧠</div>
              <h2 style={{
                fontSize: "2.2rem",
                fontWeight: "800",
                margin: "0 0 16px 0",
                color: "#1a1a1a"
              }}>
                AI-Powered Insights
              </h2>
              <p style={{
                fontSize: "1.2rem",
                color: "#555",
                margin: "0 0 24px 0",
                lineHeight: "1.6",
                maxWidth: "600px",
                marginLeft: "auto",
                marginRight: "auto"
              }}>
                Our advanced AI analyzes user borrowing patterns, preferences, and book popularity to generate
                personalized recommendations. This data helps you understand what your users really want and
                optimize your library collection for maximum engagement.
              </p>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "20px",
                marginTop: "32px"
              }}>
                <div style={{
                  background: "rgba(255,255,255,0.8)",
                  padding: "20px",
                  borderRadius: "16px",
                  backdropFilter: "blur(10px)"
                }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎯</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#1a1a1a" }}>
                    Personalized
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#666", marginTop: "4px" }}>
                    Tailored to each user
                  </div>
                </div>

                <div style={{
                  background: "rgba(255,255,255,0.8)",
                  padding: "20px",
                  borderRadius: "16px",
                  backdropFilter: "blur(10px)"
                }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📈</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#1a1a1a" }}>
                    Data-Driven
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#666", marginTop: "4px" }}>
                    Based on real usage
                  </div>
                </div>

                <div style={{
                  background: "rgba(255,255,255,0.8)",
                  padding: "20px",
                  borderRadius: "16px",
                  backdropFilter: "blur(10px)"
                }}>
                  <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🚀</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#1a1a1a" }}>
                    Optimized
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#666", marginTop: "4px" }}>
                    Continuous learning
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
