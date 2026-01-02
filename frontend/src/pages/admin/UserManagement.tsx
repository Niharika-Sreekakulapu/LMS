import { useEffect, useState } from "react";
import { listUsers, approveUser, rejectUser } from "../../api/adminApi";
import type { Member } from "../../types/dto";
import axios from "axios";
import { useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";

type UnknownRecord = Record<string, unknown>;

function extractMessageFromUnknown(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === "string") return data;
  if (typeof data === "object") {
    const obj = data as UnknownRecord;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.message === "string") return obj.message;
    try {
      return JSON.stringify(obj);
    } catch {
      return null;
    }
  }
  return null;
}

function getStatus(u: Partial<Member>): string {
  const rec = u as unknown as UnknownRecord;
  if (rec.status && typeof rec.status === "string") return rec.status;
  return "UNKNOWN";
}

export default function UserManagement() {
  const [users, setUsers] = useState<Member[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const { auth } = useAuth();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);

  const loadUsers = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const resp = await listUsers();
      setUsers(Array.isArray(resp.data) ? (resp.data as Member[]) : []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = extractMessageFromUnknown(err.response?.data) ?? err.message ?? "Could not load users";
        setError(msg);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not load users");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth || !auth.token) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await listUsers();
        if (!cancelled) setUsers(Array.isArray(resp.data) ? (resp.data as Member[]) : []);
      } catch (err: unknown) {
        if (!cancelled) {
          if (axios.isAxiosError(err)) {
            const msg = extractMessageFromUnknown(err.response?.data) ?? err.message ?? "Could not load users";
            setError(msg);
          } else if (err instanceof Error) {
            setError(err.message);
          } else {
            setError("Could not load users");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth?.token, loadUsers]);

  // Filter users based on search, role, and status
  useEffect(() => {
    let filtered = users;
    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedRole) {
      filtered = filtered.filter(u => u.role === selectedRole);
    }
    if (selectedStatus) {
      filtered = filtered.filter(u => u.status === selectedStatus);
    }
    // Reset to page 1 when filters change
    setCurrentPage(1);
    setFilteredUsers(filtered);
  }, [users, searchQuery, selectedRole, selectedStatus]);

  // Calculate paginated users
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  const onApprove = async (id: number) => {
    setError(null);
    setActionLoading(id);
    try {
      await approveUser(id);
      await loadUsers();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = extractMessageFromUnknown(err.response?.data) ?? err.message ?? "Approve failed";
        setError(msg);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Approve failed");
      }
    } finally {
      setActionLoading(null);
    }
  };



  const onReject = async (id: number) => {
    const reason = prompt("Enter rejection reason (optional):");
    if (reason === null) return; // Cancelled

    setError(null);
    setActionLoading(id);
    try {
      await rejectUser(id, reason || undefined);
      await loadUsers();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = extractMessageFromUnknown(err.response?.data) ?? err.message ?? "Reject failed";
        setError(msg);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Reject failed");
      }
    } finally {
      setActionLoading(null);
    }
  };





  // Calculate statistics
  const totalMembers = users.length;
  const approvedMembers = users.filter(u => getStatus(u) === 'APPROVED').length;
  const pendingMembers = users.filter(u => getStatus(u) === 'PENDING').length;
  const rejectedMembers = users.filter(u => getStatus(u) === 'REJECTED').length;

  return (
    <div
      style={{
        background: '#F9F6F0',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.05)'
      }}
    >
      {/* Header */}
      <h1
        style={{
          color: '#2A1F16',
          margin: '0 0 24px 0',
          fontSize: '2rem',
          fontWeight: '700',
        }}
      >
        👥 Users Management Dashboard
      </h1>

      {/* Statistics Dashboard */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg,#8B4513 0%,#654321 100%)',
            color: '#F4E4BC',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(154,91,52,0.3)',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              marginBottom: '8px',
            }}
          >
            {totalMembers}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            👥 Total Member Requests
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg,#9A5B34 0%,#6B4423 100%)',
            color: '#F4E4BC',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(154,91,52,0.3)',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              marginBottom: '8px',
            }}
          >
            {approvedMembers}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>✅ Approved</div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg,#E8D1A7 0%,#CDA776 100%)',
            color: '#2A1F16',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(154,91,52,0.3)',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              marginBottom: '8px',
            }}
          >
            {pendingMembers}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>⏳ Pending</div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg,#D2691E 0%,#A0522D 100%)',
            color: '#F4E4BC',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(210,105,30,0.3)',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              marginBottom: '8px',
            }}
          >
            {rejectedMembers}
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>❌ Rejected</div>
        </div>


      </div>

      {/* Controls Section */}
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          border: '1px solid #E8D1A7',
          boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto',
            gap: '20px',
            alignItems: 'center',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder=" Search members by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '12px 16px',
                paddingLeft: '40px',
                border: '2px solid #ddd',
                borderRadius: '25px',
                width: '100%',
                fontSize: '1.2rem',
                background: 'white',
              }}
            />
            <span style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#999',
              fontSize: '1.2rem',
            }}>
            🔍
            </span>
          </div>

          {/* Role Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2A1F16', whiteSpace: 'nowrap' }}>
              Role:
            </span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                background: 'white',
                fontSize: '1.1rem',
                fontWeight: '500',
                color: '#2A1F16',
                cursor: 'pointer',
                minWidth: '120px',
              }}
            >
              <option value="">All Roles</option>
              <option value="STUDENT">👨‍🎓 Student</option>
              <option value="LIBRARIAN">📚 Librarian</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2A1F16', whiteSpace: 'nowrap' }}>
              Status:
            </span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: '10px 12px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                background: 'white',
                fontSize: '1.1rem',
                fontWeight: '500',
                color: '#2A1F16',
                cursor: 'pointer',
                minWidth: '120px',
              }}
            >
              <option value="">All Status</option>
              <option value="APPROVED">✅ Approved</option>
              <option value="PENDING">⏳ Pending</option>
              <option value="REJECTED">❌ Rejected</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div
          style={{
            marginTop: '15px',
            padding: '10px',
            background: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'center',
            border: '1px solid #e9ecef',
          }}
        >
          <span
            style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#2A1F16',
            }}
          >
            📊 {paginatedUsers.length} of {filteredUsers.length} members displayed ({users.length} total)
          </span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
            <div style={{ fontSize: '1.1rem', color: '#2A1F16' }}>
              Loading members...
            </div>
          </div>
        </div>
      )}

      {/* Members Table */}
      {!loading && (
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #E8D1A7',
            boxShadow: '0 4px 15px rgba(154,91,52,0.1)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8f9fa' }}>
                <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '16px 8px', textAlign: 'left', fontWeight: '700', color: '#2A1F16', fontSize: '1.1rem', fontFamily: 'Arial, sans-serif' }}>ID</th>
                  <th style={{ padding: '16px 8px', textAlign: 'left', fontWeight: '700', color: '#2A1F16', fontSize: '1.1rem', fontFamily: 'Arial, sans-serif' }}>Name</th>
                  <th style={{ padding: '16px 8px', textAlign: 'left', fontWeight: '700', color: '#2A1F16', fontSize: '1.1rem', fontFamily: 'Arial, sans-serif' }}>Email</th>
                  <th style={{ padding: '16px 8px', textAlign: 'left', fontWeight: '700', color: '#2A1F16', fontSize: '1.1rem', fontFamily: 'Arial, sans-serif' }}>Role</th>
                  <th style={{ padding: '16px 8px', textAlign: 'center', fontWeight: '700', color: '#2A1F16', fontSize: '1.1rem', fontFamily: 'Arial, sans-serif' }}>Created</th>
                  <th style={{ padding: '16px 8px', textAlign: 'center', fontWeight: '700', color: '#2A1F16', fontSize: '1.1rem', fontFamily: 'Arial, sans-serif' }}>Status</th>
                  <th style={{ padding: '16px 8px', textAlign: 'center', fontWeight: '700', color: '#2A1F16', fontSize: '1.1rem', fontFamily: 'Arial, sans-serif' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u) => (
                  <tr key={u.id} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: 12, fontSize: '14px', fontWeight: 500, textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>{u.id}</td>
                    <td style={{ padding: 12, fontSize: '14px', fontWeight: 500, color: '#2A1F16', fontFamily: 'Arial, sans-serif' }}>{u.name}</td>
                    <td style={{ padding: 12, fontSize: '14px', fontWeight: 500, wordBreak: 'break-all', color: '#6c757d', fontFamily: 'Arial, sans-serif' }}>{u.email}</td>
                    <td style={{ padding: 12, fontSize: '14px', fontWeight: 500, color: '#6c757d', fontFamily: 'Arial, sans-serif' }}>{u.role}</td>
                    <td style={{ padding: 12, fontSize: '14px', fontWeight: 500, color: '#6c757d', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                    <td style={{ padding: 12, fontSize: '14px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        background: getStatus(u) === 'APPROVED' ? '#d4edda' : getStatus(u) === 'PENDING' ? '#fff3cd' : '#f8d7da',
                        color: getStatus(u) === 'APPROVED' ? '#155724' : getStatus(u) === 'PENDING' ? '#856404' : '#721c24'
                      }}>
                        {getStatus(u)}
                      </span>
                    </td>
                    <td style={{ padding: 12, whiteSpace: 'nowrap', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {u.status === 'PENDING' && (
                        <>
                          <button onClick={() => onApprove(u.id)} disabled={actionLoading === u.id} style={{ marginRight: 8, padding: "10px 14px", borderRadius: 8, border: "none", background: "#2563EB", color: "white", fontWeight: 700, cursor: actionLoading === u.id ? "wait" : "pointer", fontSize: "14px", minHeight: "40px", minWidth: "95px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                            {actionLoading === u.id ? "…" : <><span>✓</span>Approve</>}
                          </button>
                          <button onClick={() => void onReject(u.id)} disabled={actionLoading === u.id} style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "#DC2626", color: "white", fontWeight: 700, cursor: actionLoading === u.id ? "wait" : "pointer", fontSize: "14px", minHeight: "40px", minWidth: "95px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                            {actionLoading === u.id ? "…" : <><span>✕</span>Reject</>}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* No Members Message */}
          {!loading && paginatedUsers.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 40px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                margin: '20px auto',
                maxWidth: '600px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontSize: '6rem', marginBottom: '24px', opacity: '0.7' }}>👥</div>
              <h3 style={{ color: '#2A1F16', marginBottom: '12px', fontSize: '1.8rem', fontWeight: '600' }}>
                No Members Found
              </h3>
              <p style={{ color: '#6c757d', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>
                No member registrations match your current filters. Try adjusting your search criteria.
              </p>
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedRole(''); setSelectedStatus(''); }}
                  style={{
                    padding: '10px 20px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '25px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          padding: '12px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
            Showing {Math.min((currentPage - 1) * pageSize + 1, filteredUsers.length)} to {Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length} members
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                border: '1px solid #dee2e6',
                background: currentPage === 1 ? '#f8f9fa' : 'white',
                color: currentPage === 1 ? '#6c757d' : '#2A1F16',
                borderRadius: '6px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
              }}
            >
              ← Previous
            </button>
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #dee2e6',
                      background: currentPage === pageNum ? '#2A1F16' : 'white',
                      color: currentPage === pageNum ? 'white' : '#2A1F16',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      minWidth: '36px',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                border: '1px solid #dee2e6',
                background: currentPage === totalPages ? '#f8f9fa' : 'white',
                color: currentPage === totalPages ? '#6c757d' : '#2A1F16',
                borderRadius: '6px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: '#ffebee',
            borderRadius: '8px',
            border: '1px solid #ffcdd2',
            color: '#c62828',
            textAlign: 'center',
            fontWeight: '600',
          }}
        >
          ❌ {error}
        </div>
      )}
    </div>
  );
}
