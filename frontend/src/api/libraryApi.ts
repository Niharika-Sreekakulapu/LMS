// src/api/libraryApi.ts
import client from "./axiosClient";
import type { MembershipRequestCreateDto } from "../types/dto";

/* Users / admin endpoints (kept for completeness) */
export const getAllBorrowTransactions = (params?: { status?: string; overdue?: boolean; studentId?: number; bookId?: number }) =>
  client.get("/api/borrow", { params });
export const getBorrowTransactionById = (id: number) => client.get(`/api/borrows/${id}`);
export const getIssueRequests = (status?: string, page?: number, size?: number) => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (page !== undefined) params.append('page', page.toString());
  if (size !== undefined) params.append('size', size.toString());
  const queryString = params.toString();
  return client.get(`/api/issue-requests${queryString ? `?${queryString}` : ""}`);
};
export const approveIssueRequest = (id: number, data?: { expectedDueDate?: string }) =>
  client.patch(`/api/issue-requests/${id}/approve`, data);
export const rejectIssueRequest = (id: number, rejectReason: string) =>
  client.patch(`/api/issue-requests/${id}/reject`, { rejectReason });
export const bulkApproveRequests = (requestIds: number[]) =>
  client.post("/api/issue-requests/bulk-approve", { requestIds });

/* Members */
export const getAllMembers = () => client.get("/api/members");
export const getMemberById = (id: number) => client.get(`/api/members/${id}`);
export const approveMember = (id: number) => client.patch(`/api/members/${id}/approve`);
export const suspendMember = (id: number) => client.patch(`/api/members/${id}/suspend`);
export const resetMemberPassword = (id: number, newPassword: string) =>
  client.patch(`/api/members/${id}/reset-password`, { newPassword });
export const getMemberBorrowHistory = (id: number) => client.get(`/api/members/${id}/history`);

/* Books / library */
// Search books (server-side query params supported) - returns domain Book objects
export const searchBooks = (params?: { title?: string; genre?: string; available?: boolean }) =>
  client.get("/api/books", { params });

// Search books with DTO (better for frontend) - returns BookDTO objects
export const searchBooksDTO = (params?: { title?: string; genre?: string; available?: boolean; author?: string }) =>
  client.get("/api/books/search", { params });

// Get book details by id
export const getBookDetails = (id: number) => client.get(`/api/books/${id}`);

// Get monthly request count for current user
export const getMonthlyRequestCount = () => client.get("/api/issue-requests/monthly-count");

// Create / Update / Delete book (admin / librarian)
export const createBook = (payload: {
  title: string;
  author: string;
  isbn?: string;
  totalCopies?: number;
  availableCopies?: number;
  genre?: string | null;
  publisher?: string | null;
  mrp?: number | null;
  tags?: string | null;
  accessLevel?: string | null;
}) => client.post("/api/books", payload);

export const updateBook = (id: number, payload: Record<string, unknown>) =>
  client.put(`/api/books/${id}`, payload);

export const deleteBook = (id: number) => client.delete(`/api/books/${id}`);

/* Issue / borrows */
export const issueBookDirectly = (data: { studentId: number; bookId: number; dueDate?: string }) =>
  client.post("/api/borrow", data);

/* Issue / borrows for current user */
export const createIssueRequest = (bookId: number) => client.post("/api/issue-requests", { bookId });
export const getMyIssueRequests = () => client.get("/api/issue-requests/my");
export const cancelIssueRequest = (id: number) => client.patch(`/api/issue-requests/${id}/cancel`);
export const getMyBorrowHistory = () => client.get("/api/borrows/my");
export const returnBook = (borrowRecordId: number, data?: { damaged?: boolean; lost?: boolean }) =>
  client.post('/api/return', { borrowRecordId, ...data });

/* Returns management for admin/librarian */
export const getAllBorrowRecords = (params?: { status?: string; overdue?: boolean; studentId?: number; bookId?: number; page?: number; size?: number }) =>
  client.get("/api/borrow", { params });
export const getPendingReturns = (params?: { overdue?: boolean; daysOverdue?: number; page?: number; size?: number }) =>
  client.get("/api/borrow/pending-returns", { params });
export const processReturn = (borrowRecordId: number, data?: { damaged?: boolean; lost?: boolean }) =>
  client.post('/api/return', { borrowRecordId, ...data });

/* Acquisition Requests */
export const createAcquisitionRequest = (payload: {
  bookName: string;
  author?: string;
  publisher?: string;
  version?: string;
  genre?: string;
  justification?: string;
}) => client.post("/api/acquisition-requests", payload);

export const getMyAcquisitionRequests = () => client.get("/api/acquisition-requests/mine");

export const getAllAcquisitionRequests = (status?: string) => {
  if (status) {
    return client.get('/api/acquisition-requests', { params: { status } });
  }
  return client.get('/api/acquisition-requests');
};

export const approveAcquisitionRequest = (id: number) =>
  client.patch(`/api/acquisition-requests/${id}/approve`);

export const rejectAcquisitionRequest = (id: number, reason?: string) =>
  client.patch(`/api/acquisition-requests/${id}/reject`, reason ? { reason } : {});

/* Membership Requests */
export const createMembershipRequest = (payload: MembershipRequestCreateDto) =>
  client.post("/api/membership-requests", payload);

export const getMyMembershipRequests = () => client.get("/api/membership-requests/mine");

export const getAllMembershipRequests = (status?: string) =>
  client.get(`/api/membership-requests${status ? `?status=${status}` : ""}`);

export const approveMembershipRequest = (id: number) =>
  client.patch(`/api/membership-requests/${id}/approve`);

export const rejectMembershipRequest = (id: number, reason?: string) =>
  client.patch(`/api/membership-requests/${id}/reject`, reason ? { reason } : {});

/* Penalties */
export const getMemberPenalties = (memberId: number) => client.get(`/api/members/${memberId}/penalties`);
export const getAllPendingPenalties = () => client.get("/api/penalties/pending");
export const payPenalty = (borrowRecordId: number, amount: number) => client.post(`/api/borrow/${borrowRecordId}/pay`, { amount });
export const computePenalty = (borrowRecordId: number) => client.post(`/api/borrow/${borrowRecordId}/penalty/compute`);
export const reconcilePenalties = () => client.post("/api/borrow/reconcile");

/* Subscription Management */
export const getSubscriptionStatus = () => client.get("/api/subscriptions/status");
export const activateSubscription = (packageName: 'ONE_MONTH' | 'SIX_MONTHS' | 'ONE_YEAR') =>
  client.post("/api/subscriptions/activate", { package: packageName });
export const extendSubscription = (packageName: 'ONE_MONTH' | 'SIX_MONTHS' | 'ONE_YEAR') =>
  client.post("/api/subscriptions/extend", { package: packageName });
export const getSubscriptionPackages = () => client.get("/api/subscriptions/packages");

/* Reports */
export const downloadReport = (type: string, format: 'csv' | 'excel' = 'csv', filters?: unknown) =>
  client.get(`/api/reports/download?type=${type}&format=${format}`, {
    params: filters,
    responseType: 'blob'
  });

/* Note: all responses are axios responses; callers should use `.data` or handle defensively */
