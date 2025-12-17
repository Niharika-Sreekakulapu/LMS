// src/App.tsx
import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ScrollToTop from "./components/ScrollToTop";
import PrivateRoute from "./components/guards/PrivateRoute";

// ---------------- PUBLIC ----------------
import LandingPage from "./pages/LandingPage";
import CatalogPage from "./pages/CatalogPage";
import About from "./pages/About";
import Contact from "./pages/Contact";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import StudentRegisterPage from "./pages/StudentRegisterPage";
import LibrarianRegisterPage from "./pages/LibrarianRegisterPage";

// ---------------- SHARED BOOK MGMT PAGES (NEW UI) ----------------
import ManageBook from "./pages/ManageBook";
import EditBook from "./pages/EditBook";
import AddBook from "./pages/books/AddBook";

// ---------------- ADMIN ----------------
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import SettingsPage from "./pages/admin/SettingsPage";
import Reports from "./pages/admin/ReportsPage";
import AcquisitionRequestsManagementPage from "./pages/admin/AcquisitionRequestsManagementPage";
import ReturnsPage from "./pages/admin/ReturnsPage";

import SystemPage from "./pages/admin/SystemPage";
import BooksCatalogPage from "./pages/admin/BooksCatalogPage";

// ---------------- LIBRARIAN ----------------
import LibraryDashboard from "./pages/LibraryDashboard";
import IssueBook from "./pages/books/IssueBook";
import Requests from "./pages/books/Requests";
import Members from "./pages/books/Members";
// Use the same ReturnsPage component for consistency - Borrows removed
import Penalty from "./pages/books/Penalty";
import ProMembershipBooks from "./pages/books/ProMembershipBooks";

// ---------------- STUDENT ----------------
import StudentDashboard from "./pages/StudentDashboard";
import StudentHome from "./pages/student/StudentHome";
import StudentRequests from "./pages/student/StudentRequests";
import StudentBorrows from "./pages/student/StudentBorrows";
import StudentFines from "./pages/student/StudentFines";
import StudentProfile from "./pages/student/StudentProfile";
import StudentMembershipRequests from "./pages/student/StudentMembershipRequests";

export default function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") ?? "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  return (
    <div className="page-container">
      <ScrollToTop />

      <main style={{ minHeight: "calc(100vh - 80px)", overflowX: "hidden" }}>
        <Routes>

          {/* ---------------- PUBLIC ---------------- */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/student" element={<StudentRegisterPage />} />
          <Route path="/register/librarian" element={<LibrarianRegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/admin-login" element={<LoginPage />} />

          {/* ---------------- ADMIN LAYOUT ---------------- */}
          <Route path="/admin" element={<PrivateRoute roles={["ADMIN"]}><AdminDashboard /></PrivateRoute>}>
            <Route index element={<Navigate to="books" replace />} />

            <Route path="users" element={<UserManagement />} />

            {/* ADMIN USES SAME NEW UI */}
            <Route path="books" element={<ManageBook />} />
            <Route path="books/add" element={<AddBook />} />
            <Route path="books/edit/:id" element={<EditBook />} />

            <Route path="books/catalog" element={<BooksCatalogPage />} />
            <Route path="requests" element={<Requests />} />
            <Route path="penalties" element={<Penalty />} />
            <Route path="acquisition-requests" element={<AcquisitionRequestsManagementPage />} />

            <Route path="returns" element={<ReturnsPage />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* ---------------- LIBRARIAN LAYOUT ---------------- */}
          <Route path="/library-dashboard" element={<PrivateRoute roles={["LIBRARIAN"]}><LibraryDashboard /></PrivateRoute>}>
            <Route index element={<Navigate to="manage-book" replace />} />

            <Route path="requests" element={<Requests />} />
            <Route path="acquisition-requests" element={<AcquisitionRequestsManagementPage />} />

            <Route path="members" element={<Members />} />
            <Route path="returns" element={<ReturnsPage />} />
            <Route path="penalty" element={<Penalty />} />
            <Route path="pro-membership-books" element={<ProMembershipBooks />} />

            {/* LIBRARIAN USES SAME NEW UI */}
            <Route path="manage-book" element={<ManageBook />} />
            <Route path="add-book" element={<AddBook />} />
            <Route path="edit-book/:id" element={<EditBook />} />
            <Route path="issue-book" element={<IssueBook />} />

            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="system" element={<SystemPage />} />
          </Route>

          {/* ---------------- STUDENT LAYOUT ---------------- */}
          <Route path="/student-dashboard" element={<PrivateRoute roles={["STUDENT"]}><StudentDashboard /></PrivateRoute>}>
            <Route index element={<StudentHome />} />
            <Route path="requests" element={<StudentRequests />} />
            <Route path="membership" element={<StudentMembershipRequests />} />
            <Route path="borrows" element={<StudentBorrows />} />
            <Route path="fines" element={<StudentFines />} />
            <Route path="profile" element={<StudentProfile />} />
          </Route>

          {/* ---------------- FALLBACK ---------------- */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </main>
    </div>
  );
}
