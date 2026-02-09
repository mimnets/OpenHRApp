
import React, { useState, useEffect } from 'react';
import { verificationService } from '../../services/verification.service';

interface RegistrationVerificationPageProps {
  email: string;
  onVerificationComplete: () => void;
}

export const RegistrationVerificationPage: React.FC<RegistrationVerificationPageProps> = ({
  email,
  onVerificationComplete
}) => {
  const [status, setStatus] = useState<'waiting' | 'verified' | 'manual' | 'resending'>('waiting');
  const [message, setMessage] = useState('');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showManualOption, setShowManualOption] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  // Auto-check for verification every 10 seconds
  useEffect(() => {
    let interval: any;

    const checkStatus = async () => {
      // Placeholder for active checking logic if endpoint available
    };

    interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
      
      if (timeElapsed % 10 === 0) {
        checkStatus();
      }

      // After 2 minutes, show manual verification option
      if (timeElapsed > 120) {
        setShowManualOption(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeElapsed, email]);

  const handleResendEmail = async () => {
    setStatus('resending');
    setMessage('Sending verification email...');

    const result = await verificationService.resendVerificationEmail(email);
    
    if (result.success) {
      setMessage('✅ ' + result.message);
      setStatus('waiting');
      setTimeElapsed(0);
      setShowManualOption(false);
    } else {
      setMessage('❌ ' + result.message);
      setStatus('waiting'); // Allow retry
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setMessage('Testing email configuration...');

    const result = await verificationService.testEmailConfiguration(email);
    
    if (result.success) {
      setMessage('✅ ' + result.message);
    } else {
      setMessage('⚠️ Email not configured: ' + result.message);
    }
    
    setTestingEmail(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1>📧 Verify Your Email</h1>
          <p style={styles.subtitle}>Account Registration Successful</p>
        </div>

        <div style={styles.content}>
          <p style={styles.text}>
            A verification link has been sent to <strong>{email}</strong>
          </p>

          {status === 'waiting' && (
            <>
              <div style={styles.spinner}>
                <div style={styles.spinnerInner}></div>
              </div>
              <p style={styles.waitingText}>
                Checking for verification... {formatTime(timeElapsed)}
              </p>
            </>
          )}

          {status === 'verified' && (
             <div style={{...styles.message, backgroundColor: '#d4edda', color: '#155724', borderColor: '#c3e6cb', textAlign: 'center'}}>
                <h3>✅ Verified!</h3>
                <p>Redirecting to login...</p>
             </div>
          )}

          {status === 'resending' && (
            <>
              <p style={{ ...styles.text, color: '#666' }}>
                Resending verification email...
              </p>
            </>
          )}

          {message && status !== 'verified' && (
            <div style={{
              ...styles.message,
              backgroundColor: message.includes('✅') ? '#d4edda' : 
                              message.includes('⚠️') ? '#fff3cd' : '#f8d7da',
              borderColor: message.includes('✅') ? '#c3e6cb' : 
                          message.includes('⚠️') ? '#ffeaa7' : '#f5c6cb',
              color: message.includes('✅') ? '#155724' : 
                    message.includes('⚠️') ? '#856404' : '#721c24'
            }}>
              {message}
            </div>
          )}

          <div style={styles.actions}>
            <button
              onClick={handleResendEmail}
              disabled={status === 'resending' || testingEmail}
              style={{
                ...styles.button,
                ...styles.buttonSecondary,
                opacity: (status === 'resending' || testingEmail) ? 0.6 : 1
              }}
            >
              🔄 Resend Email
            </button>

            <button
              onClick={handleTestEmail}
              disabled={status === 'resending' || testingEmail}
              style={{
                ...styles.button,
                ...styles.buttonSecondary,
                opacity: (status === 'resending' || testingEmail) ? 0.6 : 1
              }}
            >
              🧪 Test Email Config
            </button>
          </div>

          <div style={{marginTop: '15px'}}>
             <button
                onClick={onVerificationComplete}
                style={{...styles.button, backgroundColor: '#4f46e5', color: 'white'}}
             >
                I have verified my email (Login)
             </button>
          </div>

          {showManualOption && (
            <div style={styles.manualSection}>
              <hr style={styles.divider} />
              <h3>Haven't received the email?</h3>
              <p style={styles.text}>
                An admin can manually verify your account. Contact your organization's administrator.
              </p>
              <p style={{ ...styles.text, fontSize: '12px', color: '#999' }}>
                Note: Email verification is the recommended way. Manual verification requires admin action.
              </p>
            </div>
          )}

          <div style={styles.infoBox}>
            <h4>What's next?</h4>
            <ol style={styles.list}>
              <li>Check your email for a verification link</li>
              <li>Click the link to verify your account</li>
              <li>Return here and click "Login"</li>
            </ol>
          </div>

          <div style={styles.helpBox}>
            <p><strong>💡 Tips:</strong></p>
            <ul style={styles.list}>
              <li>Check your spam/junk folder if you don't see the email</li>
              <li>Verification links expire after 24 hours</li>
              <li>You can request a new link using the "Resend Email" button</li>
              <li>Email might take 1-2 minutes to arrive</li>
            </ul>
          </div>
        </div>

        <div style={styles.footer}>
          <p style={{ fontSize: '12px', color: '#999' }}>
            Having issues? Contact support or check if email is configured in system settings.
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px'
  } as React.CSSProperties,
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    maxWidth: '500px',
    width: '100%',
    overflow: 'hidden'
  } as React.CSSProperties,
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '30px 20px',
    textAlign: 'center'
  } as React.CSSProperties,
  subtitle: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    opacity: 0.9
  } as React.CSSProperties,
  content: { padding: '30px 20px' } as React.CSSProperties,
  text: { margin: '15px 0', lineHeight: '1.6', color: '#333' } as React.CSSProperties,
  waitingText: { textAlign: 'center', color: '#666', marginTop: '20px', fontSize: '14px' } as React.CSSProperties,
  spinner: { display: 'flex', justifyContent: 'center', margin: '20px 0' } as React.CSSProperties,
  spinnerInner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  } as React.CSSProperties,
  message: {
    padding: '12px 15px',
    borderRadius: '4px',
    border: '1px solid',
    marginBottom: '15px',
    marginTop: '15px'
  } as React.CSSProperties,
  actions: { display: 'flex', gap: '10px', marginTop: '20px' } as React.CSSProperties,
  button: {
    flex: 1,
    padding: '12px 15px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    width: '100%'
  } as React.CSSProperties,
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
    color: '#333',
    border: '1px solid #ddd'
  } as React.CSSProperties,
  manualSection: { marginTop: '20px', paddingTop: '20px' } as React.CSSProperties,
  divider: { border: 'none', borderTop: '1px solid #eee', margin: '0 0 20px 0' } as React.CSSProperties,
  infoBox: {
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '15px',
    marginTop: '20px'
  } as React.CSSProperties,
  helpBox: {
    backgroundColor: '#e8f4f8',
    border: '1px solid #b3d9e6',
    borderRadius: '4px',
    padding: '15px',
    marginTop: '15px',
    color: '#333'
  } as React.CSSProperties,
  list: { margin: '10px 0', paddingLeft: '20px', lineHeight: '1.8' } as React.CSSProperties,
  footer: {
    borderTop: '1px solid #eee',
    padding: '15px 20px',
    backgroundColor: '#fafafa',
    textAlign: 'center'
  } as React.CSSProperties
};

const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
