// src/types/dto.ts
export interface RegistrationRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: "STUDENT" | "LIBRARIAN";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserSummary {
  id: number;
  email: string;
  name?: string;
  role?: string;
  firstLogin?: boolean;
  status?: string;
  membershipType?: string;
  subscriptionPackage?: 'ONE_MONTH' | 'SIX_MONTHS' | 'ONE_YEAR';
  subscriptionStart?: string;
  subscriptionEnd?: string;
  isPremium?: boolean;
}

export interface Member {
  id: number;
  name?: string;
  email: string;
  phone?: string;
  role: 'STUDENT' | 'LIBRARIAN';
  status: string; // Can be PENDING, APPROVED, REJECTED, SUSPENDED, etc.
  idProofPath?: string;
  createdAt: string;
  membershipType?: string;
  // Aggregate fields used in reports
  totalBorrows?: number;
  activeBorrows?: number;
  outstandingFines?: number;
  currentBooks?: BorrowTransaction[];
}

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  genre?: string;
  totalCopies?: number;
  availableCopies?: number;
  publishedYear?: number;
  publisher?: string;
  description?: string;
  status?: 'AVAILABLE' | 'BORROWED' | 'RESERVED' | 'DAMAGED';
  mrp?: number;
  accessLevel?: 'NORMAL' | 'PREMIUM';
}

export interface BorrowHistory {
  id: number;
  studentId?: number;
  studentName?: string;
  bookId: number;
  bookTitle: string;
  bookAuthor?: string;
  bookMrp?: number;
  bookGenre?: string;
  bookPublisher?: string;
  bookIsbn?: string;
  bookDescription?: string;
  borrowedAt: string; // ISO date string
  dueDate: string; // ISO date string
  returnedAt?: string; // ISO date string, null if not returned
  status: string;
  isOverdue?: boolean;
  penaltyAmount?: number;
  penaltyType?: string;
  penaltyStatus?: string;
}

// Legacy interface - keeping for compatibility
export interface BorrowTransaction {
  id: number;
  bookId: number;
  userId: number;
  issueDate: string; // ISO date string
  dueDate: string; // ISO date string
  returnDate?: string; // ISO date string, null if not returned
  status: 'BORROWED' | 'RETURNED' | 'ISSUED' | 'LOST' | 'OVERDUE' | 'LATE_RETURNED' | 'DAMAGED';
  overDueDays?: number;
  fineAmount?: number;
  book?: Book;
  user?: UserSummary;
  bookAuthor?: string;
  bookMrp?: number;
  bookGenre?: string;
  bookPublisher?: string;
}

export interface IssueRequest {
  id: number;
  userId: number;
  bookId: number;
  requestDate?: string; // ISO date string - for frontend compatibility
  status: string;
  reason?: string;
  processedAt?: string;
  processedByName?: string;
  // Backend provides flat structure, not nested objects
  studentName: string;
  bookTitle: string;
  bookAuthor: string;
  bookPublisher?: string;
  edition?: string;
  bookGenre?: string;
  genre?: string;
  requestedAt: string; // ISO date string
  issuedRecordId?: number;
}

// Admin-specific interfaces
export interface AdminMetrics {
  totalBooks: number;
  availableBooks: number;
  activeBorrowTransactions: number;
  overdueCount: number;
  pendingPenalties: number;
  newMemberRequests: number;
  borrowTrend7Days: { date: string; count: number }[];
  borrowTrend30Days: { date: string; count: number }[];
}

export interface AdminSettings {
  defaultLoanDays: number;
  finePerDay: number;
  maxBooksPerUser: number;
  membershipRules: string;
  lastUpdated: string;
  lastUpdatedBy?: string;
}

export interface ApiToken {
  id: string;
  name: string;
  token: string; // masked or partial
  createdAt: string;
  lastUsed?: string;
  permissions: string[];
  status: 'ACTIVE' | 'REVOKED';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  userId: number;
  userEmail: string;
  details: Record<string, unknown>;
  ipAddress?: string;
}

export interface ReportData {
  type: 'overdue' | 'most-borrowed' | 'fines-collected' | 'inventory-anomaly';
  data: Record<string, unknown>[];
  summary?: Record<string, unknown>;
  generatedAt: string;
}

export interface MembershipRequestResponseDto {
  id: number;
  studentId: number;
  studentName: string;
  requestedPackage: 'ONE_MONTH' | 'SIX_MONTHS' | 'ONE_YEAR';
  packageDurationMonths: number;
  packagePrice: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: number;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipRequestCreateDto {
  requestedPackage?: 'ONE_MONTH' | 'SIX_MONTHS' | 'ONE_YEAR';
}

export interface PenaltyDTO {
  borrowRecordId: number;
  studentId: number;
  studentName: string;
  bookId: number;
  bookTitle: string;
  borrowedAt: string; // ISO date string
  dueDate: string; // ISO date string
  penaltyAmount: number;
  penaltyType: 'NONE' | 'LATE' | 'DAMAGE' | 'LOST';
  penaltyStatus: 'NONE' | 'PENDING' | 'PAID';
}

export interface PaymentRequestDTO {
  amount: number;
}
