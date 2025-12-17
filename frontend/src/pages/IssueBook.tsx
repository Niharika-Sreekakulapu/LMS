import React from 'react';
import { useNavigate } from 'react-router-dom';

const IssueBook: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        border: '1px solid rgba(0,0,0,0.05)'
      }}
    >
      <h2 style={{ color: '#2A1F16', marginBottom: '20px', fontSize: '2rem' }}>Books Management</h2>
      {/* Sub-navigation */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/library-dashboard/add-book')}
          style={{ background: '#f0f0f0', color: '#666', border: 'none', padding: '10px 15px', margin: '0 5px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Add Book
        </button>
        <button
          onClick={() => navigate('/library-dashboard/manage-book')}
          style={{ background: '#f0f0f0', color: '#666', border: 'none', padding: '10px 15px', margin: '0 5px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Manage Book
        </button>
        <button
          onClick={() => navigate('/library-dashboard/issue-book')}
          style={{ background: '#E8D1A7', color: '#2A1F16', border: 'none', padding: '10px 15px', margin: '0 5px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Issue Book
        </button>
      </div>
      <form>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Book ID/ISBN:</label>
          <input type="text" placeholder="Enter Book ID or ISBN (e.g., 1234567890123)" style={{ padding: '8px', width: '100%', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Student ID:</label>
          <input type="text" style={{ padding: '8px', width: '100%', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Student Name:</label>
          <input type="text" style={{ padding: '8px', width: '100%', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Issue Date:</label>
          <input type="date" style={{ padding: '8px', width: '100%', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Due Date:</label>
          <input type="date" style={{ padding: '8px', width: '100%', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <button type="submit" style={{ background: '#9A5B34', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Issue Book</button>
      </form>
    </div>
  );
};

export default IssueBook;
