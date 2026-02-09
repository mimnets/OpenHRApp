
import React, { useState, useEffect } from 'react';
import { verificationService } from '../../services/verification.service';

interface UnverifiedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created: string;
  updated: string;
}

export const AdminVerificationPanel: React.FC = () => {
  const [users, setUsers] = useState<UnverifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    loadUnverifiedUsers();
    // Refresh every 30 seconds
    const interval = setInterval(loadUnverifiedUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnverifiedUsers = async () => {
    setLoading(true);
    const result = await verificationService.getUnverifiedUsers();
    
    if (result.success) {
      setUsers(result.users);
      setMessage('');
    } else {
      setMessage(`Error: ${result.error}`);
      setUsers([]);
    }
    
    setLoading(false);
  };

  const handleVerifyUser = async (userId: string, email: string) => {
    setVerifyingId(userId);
    setMessage('Verifying user...');

    const result = await verificationService.manuallyVerifyUser(userId);
    
    if (result.success) {
      setMessage(`✅ ${email} verified successfully`);
      // Refresh list
      await loadUnverifiedUsers();
    } else {
      setMessage(`❌ Error: ${result.message}`);
    }
    
    setVerifyingId(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>Pending User Verification</h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Manually verify users who haven't clicked their email link</p>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          color: message.includes('✅') ? '#155724' : '#721c24'
        }}>
          {message}
        </div>
      )}

      <div style={styles.controls}>
        <button
          onClick={loadUnverifiedUsers}
          disabled={loading}
          style={{
            ...styles.button,
            ...styles.buttonPrimary,
            opacity: loading ? 0.6 : 1
          }}
        >
          🔄 Refresh
        </button>
        <span style={styles.count}>
          {loading ? 'Loading...' : `${users.length} users pending verification`}
        </span>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading unverified users...</div>
      ) : users.length === 0 ? (
        <div style={styles.empty}>
          <p>✅ All users have verified their emails!</p>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Registered</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={styles.tableRow}>
                  <td style={styles.td}>
                    <code style={styles.email}>{user.email}</code>
                  </td>
                  <td style={styles.td}>{user.name}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: user.role === 'ADMIN' ? '#ffc107' : '#6c757d'
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={styles.td} title={user.created}>
                    {formatDate(user.created)}
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => handleVerifyUser(user.id, user.email)}
                      disabled={verifyingId === user.id}
                      style={{
                        ...styles.button,
                        ...styles.buttonSmall,
                        ...styles.buttonSuccess,
                        opacity: verifyingId === user.id ? 0.6 : 1
                      }}
                    >
                      {verifyingId === user.id ? '⏳' : '✓'} Verify
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={styles.infoBox}>
        <h4 style={{ fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ℹ️ About Manual Verification</h4>
        <ul style={styles.infoList}>
          <li>Use this when user hasn't received or clicked verification email</li>
          <li>Verification email will be auto-sent to user when verified</li>
          <li>User can then log in immediately</li>
          <li>Email verification is preferred - use manual as fallback only</li>
          <li>Check PocketBase Settings → Mail if most users need manual verification</li>
        </ul>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#fff',
    borderRadius: '2rem',
    border: '1px solid #f1f5f9',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  } as React.CSSProperties,
  header: { marginBottom: '20px' } as React.CSSProperties,
  message: {
    padding: '12px 15px',
    borderRadius: '8px',
    marginBottom: '15px',
    border: '1px solid',
    fontSize: '0.9rem'
  } as React.CSSProperties,
  controls: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
    marginBottom: '20px'
  } as React.CSSProperties,
  button: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    fontSize: '14px'
  } as React.CSSProperties,
  buttonPrimary: {
    backgroundColor: '#667eea',
    color: 'white'
  } as React.CSSProperties,
  buttonSuccess: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '6px 12px'
  } as React.CSSProperties,
  buttonSmall: { fontSize: '12px', padding: '6px 12px' } as React.CSSProperties,
  count: { color: '#64748b', fontSize: '14px', fontWeight: 500 } as React.CSSProperties,
  loading: { textAlign: 'center', padding: '30px', color: '#94a3b8' } as React.CSSProperties,
  empty: {
    textAlign: 'center',
    padding: '30px',
    backgroundColor: '#d1fae5',
    borderRadius: '8px',
    color: '#065f46'
  } as React.CSSProperties,
  tableWrapper: { overflowX: 'auto', marginBottom: '20px' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' } as React.CSSProperties,
  headerRow: { backgroundColor: '#f8f9fa', borderBottom: '2px solid #e2e8f0' } as React.CSSProperties,
  th: { padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#334155' } as React.CSSProperties,
  tableRow: { borderBottom: '1px solid #f1f5f9' } as React.CSSProperties,
  td: { padding: '12px', color: '#334155' } as React.CSSProperties,
  email: {
    backgroundColor: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px'
  } as React.CSSProperties,
  badge: {
    padding: '4px 8px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  } as React.CSSProperties,
  infoBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
    color: '#64748b'
  } as React.CSSProperties,
  infoList: { margin: '10px 0', paddingLeft: '20px', lineHeight: '1.8', fontSize: '0.85rem' } as React.CSSProperties
};
