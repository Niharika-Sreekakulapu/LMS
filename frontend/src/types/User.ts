export type Role = "ADMIN" | "LIBRARIAN" | "STUDENT";

export interface UserSummary {
  id: number;
  name?: string;
  email?: string;
  role?: string;
  membershipType?: string;
}
