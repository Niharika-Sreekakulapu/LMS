// src/api/adminApi.ts
import client from "./axiosClient";

// Returns { headers: { Authorization: "Basic <token>" }}
function authHeaders() {
  const token = sessionStorage.getItem("adminBasic");
  return token ? { Authorization: `Basic ${token}` } : {};
}

// Approve user
export const approveUser = (id: number) =>
  client.post(`/admin/approve/${id}`, null, { headers: authHeaders() });

// Reject user
export const rejectUser = (id: number, reason?: string) => {
  const url = `/admin/reject/${id}${
    reason ? `?reason=${encodeURIComponent(reason)}` : ""
  }`;
  return client.post(url, null, { headers: authHeaders() });
};

// List pending users
export const listUsers = () =>
  client.get("/admin/users", { headers: authHeaders() });
