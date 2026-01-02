// src/api/adminApi.ts
import client from "./axiosClient";

/**
 * GET admin metrics
 */
export const getAdminMetrics = () => client.get("/api/admin/metrics");

/**
 * GET all users for admin management
 */
export const listUsers = () => client.get("/api/admin/users");

/**
 * Approve a user by ID
 */
export const approveUser = (id: number) =>
  client.post(`/api/admin/approve/${encodeURIComponent(id)}`);

/**
 * Bulk approve users
 */
export const bulkApproveUsers = (ids: number[]) =>
  client.post("/api/admin/bulk-approve", { userIds: ids });

/**
 * Reject a user by ID
 */
export const rejectUser = (id: number, reason?: string) => {
  const url =
    `/api/admin/reject/${encodeURIComponent(id)}` +
    (reason ? `?reason=${encodeURIComponent(reason)}` : "");
  return client.post(url);
};

/**
 * Change user role
 */
export const changeUserRole = (id: number, role: string) =>
  client.put(`/api/admin/users/${id}/role`, { role });

/**
 * Disable user account
 */
export const disableUser = (id: number) =>
  client.put(`/api/admin/users/${id}/disable`);

/**
 * Reset user password
 */
export const resetUserPassword = (id: number) =>
  client.put(`/api/admin/users/${id}/reset-password`);

/**
 * Impersonate user (dev only)
 */
export const impersonateUser = (id: number) =>
  client.post(`/api/admin/users/${id}/impersonate`);

/**
 * GET global settings/policies
 */
export const getSettings = () => client.get("/api/admin/settings");

/**
 * UPDATE global settings/policies
 */
export const updateSettings = (settings: unknown) =>
  client.put("/api/admin/settings", settings);

/**
 * Get reports (overdue, most borrowed, fines collected, etc.)
 */
export const getReport = (type: string, filters?: unknown) =>
  client.get(`/api/reports?type=${type}`, { params: filters });

/**
 * Get book statistics (total, normal, premium)
 */
export const getBookStats = () => client.get('/api/admin/book-stats');

/**
 * Download report as CSV/Excel
 */
export const downloadReport = (type: string, format: 'csv' | 'excel', filters?: unknown) =>
  client.get(`/api/reports/download?type=${type}&format=${format}`, {
    params: filters,
    responseType: 'blob'
  });

/**
 * GET audit logs
 */
export const getAuditLogs = (filters?: unknown) =>
  client.get("/api/audit", { params: filters });

/**
 * GET API tokens
 */
export const getApiTokens = () => client.get("/api/admin/tokens");

/**
 * Create new API token
 */
export const createApiToken = (data: { name: string; permissions?: string[] }) =>
  client.post("/api/admin/tokens", data);

/**
 * Revoke API token
 */
export const revokeApiToken = (id: string) =>
  client.delete(`/api/admin/tokens/${id}`);

/**
 * GET health checks
 */
export const getHealthChecks = () => client.get("/api/admin/health");

/**
 * GET DB migrations status
 */
export const getMigrationsStatus = () => client.get("/api/admin/migrations");

/**
 * GET all book requests (for admin management)
 */
export const getAllBookRequests = (status?: string) =>
  client.get(`/api/issue-requests${status ? `?status=${status}` : ''}`);

/**
 * Approve a book request
 */
export const approveBookRequest = (id: number, expectedDueDate?: string) => {
  const body = expectedDueDate ? { expectedDueDate } : {};
  return client.patch(`/api/issue-requests/${id}/approve`, body);
};

/**
 * Reject a book request
 */
export const rejectBookRequest = (id: number, reason?: string) =>
  client.patch(`/api/issue-requests/${id}/reject`, reason ? { reason } : undefined);

/**
 * Bulk approve book requests (using individual calls since bulk endpoint doesn't exist)
 */
export const bulkApproveBookRequests = async (requestIds: number[]) => {
  const results = await Promise.allSettled(
    requestIds.map(id => client.patch(`/api/issue-requests/${id}/approve`))
  );

  const fulfilled = results.filter(result => result.status === 'fulfilled').length;
  const rejected = results.filter(result => result.status === 'rejected').length;

  if (rejected > 0) {
    console.warn(`Bulk approve: ${fulfilled} succeeded, ${rejected} failed`);
  }

  return { fulfilled, rejected };
};

/**
 * Get all membership requests
 */
export const getAllMembershipRequests = (status?: string) =>
  client.get(`/api/membership-requests${status ? `?status=${status}` : ''}`);

/**
 * Approve a membership request
 */
export const approveMembershipRequest = (id: number) =>
  client.patch(`/api/membership-requests/${id}/approve`);

/**
 * Reject a membership request
 */
export const rejectMembershipRequest = (id: number, reason?: string) =>
  client.patch(`/api/membership-requests/${id}/reject${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`);
