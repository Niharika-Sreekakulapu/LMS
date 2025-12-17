import React from 'react';
import { useNavigate } from 'react-router-dom';

const AddBook: React.FC = () => {
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
          style={{ background: '#E8D1A7', color: '#2A1F16', border: 'none', padding: '10px 15px', margin: '0 5px', borderRadius: '8px', cursor: 'pointer' }}
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
          style={{ background: '#f0f0f0', color: '#666', border: 'none', padding: '10px 15px', margin: '0 5px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Issue Book
        </button>
      </div>
      <form>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Title:</label>
          <input type="text" style={{ padding: '10px', width: '70%', maxWidth: '350px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Author:</label>
          <input type="text" style={{ padding: '10px', width: '70%', maxWidth: '350px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>ISBN:</label>
          <input type="text" placeholder="e.g., 1234567890123" style={{ padding: '10px', width: '70%', maxWidth: '350px', border: '1px solid #ddd', borderRadius: '4px' }} />
          <small style={{ color: '#666', display: 'block', marginTop: '2px' }}>ISBN (International Standard Book Number) is a unique identifier for books.</small>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Category:</label>
          <input type="text" style={{ padding: '10px', width: '70%', maxWidth: '350px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Quantity:</label>
          <input type="number" style={{ padding: '10px', width: '70%', maxWidth: '350px', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
        <button type="submit" style={{ background: '#9A5B34', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Add Book</button>
      </form>
    </div>
  );
};

export default AddBook;
