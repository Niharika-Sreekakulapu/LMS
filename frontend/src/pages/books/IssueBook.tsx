import React, { useState, useCallback } from 'react';
import { searchBooks, getAllMembers, issueBookDirectly } from '../../api/libraryApi';
import type { Book, Member } from '../../types/dto';

const IssueBook: React.FC = () => {
  const [formData, setFormData] = useState({
    bookIdentifier: '', // ISBN, title, or book ID
    studentIdentifier: '', // Student ID or email
    studentName: '',
    libraryCardId: '',
    issueNotes: '',
    expectedDueDate: '',
    phoneNumber: '',
    email: ''
  });

  const [loading, setLoading] = useState(false);
  const [bookFound, setBookFound] = useState<Book | null>(null);
  const [studentFound, setStudentFound] = useState<Member | null>(null);
  const [searchingBook, setSearchingBook] = useState(false);
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string>('');

  // Load members once
  const loadMembers = useCallback(async () => {
    try {
      const response = await getAllMembers();
      setMembers(response.data);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  }, []);

  React.useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Helper to check if member can borrow
  const canMemberBorrow = (member: Member | null): boolean => {
    return member ? member.status === 'APPROVED' : false;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear previous results when input changes
    if (name === 'bookIdentifier') {
      setBookFound(null);
    } else if (name === 'studentIdentifier' || name === 'email') {
      setStudentFound(null);
    }
  };

  const searchBook = async () => {
    if (!formData.bookIdentifier.trim()) {
      setError('Please enter a book identifier');
      return;
    }

    setSearchingBook(true);
    setError('');

    try {
      // Search by title first (partial match)
      let result = await searchBooks({ title: formData.bookIdentifier.trim() });

      let books: Book[] = [];
      if (result && result.data) {
        books = Array.isArray(result.data) ? result.data : [result.data];
      }

      // If no results, try searching by ISBN
      if (books.length === 0) {
        result = await searchBooks({});
        if (result && result.data) {
          const allBooks = Array.isArray(result.data) ? result.data : [result.data];
          books = allBooks.filter(book => book.isbn === formData.bookIdentifier.trim());
        }
      }

      // If still no results, try by ID
      if (books.length === 0) {
        const potentialId = parseInt(formData.bookIdentifier.trim());
        if (!isNaN(potentialId)) {
          result = await searchBooks({});
          if (result && result.data) {
            const allBooks = Array.isArray(result.data) ? result.data : [result.data];
            books = allBooks.filter(book => book.id === potentialId);
          }
        }
      }

      if (books.length > 0) {
        const foundBook = books[0]; // Take first match
        setBookFound(foundBook);
        if ((foundBook.availableCopies ?? 0) <= 0) {
          setError('This book is currently unavailable (all copies are borrowed)');
        }
      } else {
        setError('Book not found. Please check the ISBN, title, or book ID.');
        setBookFound(null);
      }
    } catch (err) {
      console.error('Error searching for book:', err);
      setError('Error searching for book. Please try again.');
      setBookFound(null);
    } finally {
      setSearchingBook(false);
    }
  };

  const searchStudent = async () => {
    if (!formData.studentIdentifier.trim()) {
      setError('Please enter student identifier');
      return;
    }

    setSearchingStudent(true);
    setError('');

    try {
      // Search through loaded members
      const identifier = formData.studentIdentifier.trim().toLowerCase();

      const foundStudent = members.find(member =>
        member.id.toString() === formData.studentIdentifier.trim() ||
        member.email.toLowerCase() === identifier ||
        (member.name && member.name.toLowerCase().includes(identifier))
      );

      if (foundStudent) {
        setStudentFound(foundStudent);
        setFormData(prev => ({
          ...prev,
          studentName: foundStudent.name || '',
          email: foundStudent.email
        }));

        // Check if student can borrow (APPROVED status allows borrowing)
        if (!canMemberBorrow(foundStudent)) {
          setError(`This member cannot borrow books. Status: ${foundStudent.status}`);
        }
      } else {
        setError('Member not found. Please check the member ID or email.');
        setStudentFound(null);
      }
    } catch (err) {
      console.error('Error searching for student:', err);
      setError('Error searching for member. Please try again.');
      setStudentFound(null);
    } finally {
      setSearchingStudent(false);
    }
  };

  const calculateDueDate = (days = 14) => {
    const today = new Date();
    today.setDate(today.getDate() + days);
    return today.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!bookFound || !studentFound) {
        setError('Please search and select both a book and a member');
        return;
      }

      if ((bookFound.availableCopies ?? 0) <= 0) {
        setError('Selected book is not available for borrowing');
        return;
      }

      if (!canMemberBorrow(studentFound)) {
        setError('Selected member is not eligible to borrow books');
        return;
      }

      const dueDate = formData.expectedDueDate || calculateDueDate();

      // Issue book via API
      await issueBookDirectly({
        studentId: studentFound.id,
        bookId: bookFound.id,
        dueDate: dueDate
      });

      // Success - clear error and show success
      setError('');
      alert(`✅ Book "${bookFound.title}" issued successfully to ${studentFound.name || 'member'}! Due date: ${new Date(dueDate).toLocaleDateString()}`);

      // Reset form
      setFormData({
        bookIdentifier: '',
        studentIdentifier: '',
        studentName: '',
        libraryCardId: '',
        issueNotes: '',
        expectedDueDate: '',
        phoneNumber: '',
        email: ''
      });
      setBookFound(null);
      setStudentFound(null);

    } catch (err: unknown) {
      console.error('Failed to issue book:', err);
      let errorMessage = 'Failed to issue book. Please try again.';

      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#F9F6F0',
      borderRadius: '12px',
      padding: '20px'
    }}>
      {/* Header Section */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{
          color: '#2A1F16',
          margin: '0 0 8px 0',
          fontSize: '2rem',
          fontWeight: '700'
        }}>
          📖 Issue Book
        </h1>
        <p style={{
          color: '#666',
          fontSize: '0.95rem',
          margin: '0',
          lineHeight: '1.5'
        }}>
          Process book borrowing with member verification and due date calculation
        </p>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        border: '1px solid #E8D1A7',
        boxShadow: '0 4px 15px rgba(154,91,52,0.1)'
      }}>
        <form onSubmit={handleSubmit}>

          {/* Book Search Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#2A1F16', marginBottom: '15px', fontSize: '1.2rem' }}>📚 Book Selection</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '15px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2A1F16' }}>
                  Book ID, ISBN, or Title *
                </label>
                <input
                  type="text"
                  name="bookIdentifier"
                  value={formData.bookIdentifier}
                  onChange={handleInputChange}
                  placeholder="Enter ISBN (e.g., 1234567890123), Book ID, or Title"
                  style={{ padding: '12px', width: '100%', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem' }}
                  required
                />
                <small style={{ color: '#666', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>
                  Enter ISBN, book ID, or search by title
                </small>
              </div>
              <button
                type="button"
                onClick={searchBook}
                disabled={searchingBook}
                style={{
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  cursor: searchingBook ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  opacity: searchingBook ? 0.6 : 1
                }}
              >
                {searchingBook ? '🔍 Searching...' : '🔍 Search Book'}
              </button>
            </div>

            {/* Book Found Display */}
            {bookFound && (
              <div style={{
                marginTop: '15px',
                padding: '15px',
                background: bookFound.availableCopies > 0 ? '#d4edda' : '#f8d7da',
                border: `1px solid ${bookFound.availableCopies > 0 ? '#c3e6cb' : '#f5c6cb'}`,
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '2rem' }}>
                    {bookFound.availableCopies > 0 ? '✅' : '❌'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#2A1F16', marginBottom: '4px' }}>
                      {bookFound.title}
                    </div>
                    <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '4px' }}>
                      by {bookFound.author} • ISBN: {bookFound.isbn}
                    </div>
                    <div style={{
                      color: bookFound.availableCopies > 0 ? '#155724' : '#721c24',
                      fontWeight: '500',
                      fontSize: '0.9rem'
                    }}>
                      Available: {bookFound.availableCopies} copies
                      {bookFound.availableCopies === 0 && ' • All copies currently borrowed'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Student Search Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#2A1F16', marginBottom: '15px', fontSize: '1.2rem' }}>👤 Member Selection</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '15px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2A1F16' }}>
                  Student ID or Email *
                </label>
                <input
                  type="text"
                  name="studentIdentifier"
                  value={formData.studentIdentifier}
                  onChange={handleInputChange}
                  placeholder="Enter Student ID (e.g., 2023001) or Email"
                  style={{ padding: '12px', width: '100%', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem' }}
                  required
                />
              </div>
              <button
                type="button"
                onClick={searchStudent}
                disabled={searchingStudent}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  cursor: searchingStudent ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  opacity: searchingStudent ? 0.6 : 1
                }}
              >
                {searchingStudent ? '🔍 Searching...' : '🔍 Search Member'}
              </button>
            </div>

            {/* Student Found Display */}
            {studentFound && (
              <div style={{
                marginTop: '15px',
                padding: '15px',
                background: canMemberBorrow(studentFound) ? '#d4edda' : '#f8d7da',
                border: `1px solid ${canMemberBorrow(studentFound) ? '#c3e6cb' : '#f5c6cb'}`,
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '2rem' }}>
                    {canMemberBorrow(studentFound) ? '✅' : '❌'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#2A1F16', marginBottom: '4px' }}>
                      {studentFound.name}
                    </div>
                    <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '4px' }}>
                      ID: {studentFound.id} • {studentFound.email}
                    </div>
                    <div style={{
                      color: canMemberBorrow(studentFound) ? '#155724' : '#721c24',
                      fontWeight: '500',
                      fontSize: '0.9rem'
                    }}>
                      Status: {studentFound.status}
                      {!canMemberBorrow(studentFound) && ' • Cannot borrow books'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Issue Details Section */}
          {(bookFound?.availableCopies > 0 && canMemberBorrow(studentFound)) && (
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#2A1F16', marginBottom: '15px', fontSize: '1.2rem' }}>📝 Issue Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2A1F16' }}>
                    Due Date *
                  </label>
                  <input
                    type="date"
                    name="expectedDueDate"
                    value={formData.expectedDueDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    style={{ padding: '12px', width: '100%', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem' }}
                    required
                  />
                  <div style={{ marginTop: '5px' }}>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, expectedDueDate: calculateDueDate() }))}
                      style={{
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      14 days standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, expectedDueDate: calculateDueDate(7) }))}
                      style={{
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        marginLeft: '5px'
                      }}
                    >
                      7 days fast
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ marginBottom: '5px', fontWeight: '600', color: '#2A1F16' }}>
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="For contact purposes"
                    style={{ padding: '12px', width: '100%', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#2A1F16' }}>
                  Issue Notes (Optional)
                </label>
                <textarea
                  name="issueNotes"
                  value={formData.issueNotes}
                  onChange={handleInputChange}
                  placeholder="Any special notes about this book issue..."
                  rows={3}
                  style={{ padding: '12px', width: '100%', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>
            </div>
          )}

          {/* Issue Confirmation */}
          {bookFound && studentFound && bookFound.availableCopies > 0 && canMemberBorrow(studentFound) && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                padding: '20px',
                background: '#e3f2fd',
                border: '1px solid #90caf9',
                borderRadius: '8px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#2A1F16' }}>📋 Issue Summary</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '0.9rem' }}>
                  <div>
                    <strong>Book:</strong> {bookFound.title}<br />
                    <strong>Student:</strong> {studentFound.name}<br />
                    <strong>Due Date:</strong> {formData.expectedDueDate || 'Not set'}
                  </div>
                  <div>
                    <strong>Issue Date:</strong> {new Date().toLocaleDateString()}<br />
                    <strong>Student ID:</strong> {studentFound.id}<br />
                    <strong>Overdue Policy:</strong> ₹10 per day
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  bookIdentifier: '',
                  studentIdentifier: '',
                  studentName: '',
                  libraryCardId: '',
                  issueNotes: '',
                  expectedDueDate: '',
                  phoneNumber: '',
                  email: ''
                });
                setBookFound(null);
                setStudentFound(null);
              }}
              style={{
                background: '#6c757d',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={loading || !bookFound || !studentFound || bookFound.availableCopies <= 0 || !canMemberBorrow(studentFound)}
              style={{
                background: (bookFound && studentFound && bookFound.availableCopies > 0 && canMemberBorrow(studentFound)) ? '#17a2b8' : '#ccc',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '🔄 Processing...' : '📖 Issue Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueBook;
