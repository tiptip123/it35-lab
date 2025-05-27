import { 
  IonAlert,
  IonAvatar,
  IonButton,
  IonContent, 
  IonIcon, 
  IonInput, 
  IonInputPasswordToggle,  
  IonPage,  
  IonToast,  
  useIonRouter,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonLabel,
  IonModal
} from '@ionic/react';
import { personCircleOutline } from 'ionicons/icons'; // Changed to a more professional user icon
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import IncidentReportModal from '../components/IncidentReportModal';
import './Login.css';

// Add Asset type
interface Asset {
  id: string;
  name: string;
}

const AlertBox: React.FC<{ message: string; isOpen: boolean; onClose: () => void }> = ({ message, isOpen, onClose }) => {
  return (
    <IonAlert
      isOpen={isOpen}
      onDidDismiss={onClose}
      header="Notification"
      message={message}
      buttons={['OK']}
    />
  );
};

// Browser-compatible UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper to get device ID
function getDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = generateUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}

// Helper to get public IP with fallback
async function getPublicIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (!res.ok) throw new Error('IP fetch failed');
    const data = await res.json();
    return data.ip;
  } catch (error) {
    console.warn('Failed to get public IP:', error);
    return 'unknown';
  }
}

const Login: React.FC = () => {
  const navigation = useIonRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const loginClickCount = useRef(0);
  const loginClickTimer = useRef<NodeJS.Timeout | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [inputError, setInputError] = useState(false);

  // 2FA states
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [factorId, setFactorId] = useState('');
  const [is2FARequired, setIs2FARequired] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAError, setTwoFAError] = useState('');

  const [isLocked, setIsLocked] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const [incidentType, setIncidentType] = useState('Phishing');
  const [impactLevel, setImpactLevel] = useState('Low');
  const [asset, setAsset] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [incidentDescription, setIncidentDescription] = useState('');

  const [logoutReason, setLogoutReason] = useState('');

  const [showIncidentModal, setShowIncidentModal] = useState(false);

  const [rememberMe, setRememberMe] = useState(false);

  const [showContactAdminBtn, setShowContactAdminBtn] = useState(false);

  // Helper to fetch the user's TOTP factorId
  const fetchTOTPFactorId = async () => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (factors && factors.totp.length > 0) {
      return factors.totp[0].id;
    }
    return '';
  };

  const handleLoginClick = () => {
    // Only count if both fields are blank
    if (email === '' && password === '') {
      loginClickCount.current += 1;

      if (loginClickTimer.current) {
        clearTimeout(loginClickTimer.current);
      }

      loginClickTimer.current = setTimeout(() => {
        loginClickCount.current = 0;
      }, 2000);

      if (loginClickCount.current >= 5) {
        navigation.push('/it35-lab/admin', 'forward', 'replace');
        loginClickCount.current = 0;
      }
    } else {
      // If fields are not blank, do normal login
      doLogin();
      loginClickCount.current = 0;
    }
  };

  const reportIncident = async () => {
    const { error } = await supabase
      .from('security_incidents')
      .insert([
        {
          user_email: email,
          type: incidentType,
          status: 'pending',
          description: incidentDescription,
          impact_level: impactLevel,
          asset: asset,
          timestamp: new Date().toISOString()
        }
      ]);
  };

  const lockUserAccount = async () => {
    try {
      const { error } = await supabase
        .from('locked_users')
        .insert([
          {
            email: email.toLowerCase().trim(),
            locked_at: new Date().toISOString(),
            attempts: failedAttempts + 1,
            reason: 'password failed'
          }
        ]);

      if (error) {
        console.error('Error locking account:', error);
        throw error;
      }

      await reportIncident();
    } catch (error) {
      console.error('Failed to lock account:', error);
      setAlertMessage('Failed to lock account. Please try again later.');
      setShowAlert(true);
    }
  };

  const doLogin = async () => {
    setIsLoading(true);
    setShow2FAModal(false);
    setIs2FARequired(false);
    setTwoFALoading(false);
    setTwoFAError('');
    setTwoFACode('');
    setChallengeId('');
    setFactorId('');

    try {
      const deviceId = getDeviceId();
      const ip = await getPublicIP();

      // Check for other active sessions with same email but different device ID
      const { data: sessions, error: sessionsError } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('email', email.toLowerCase().trim());

      if (sessionsError) {
        throw new Error('Failed to check active sessions');
      }

      if (sessions && sessions.length > 0) {
        const otherSession = sessions.find((s: any) => s.device_id !== deviceId);
        if (otherSession) {
          // 1. Lock the account in the database
          await supabase.from('locked_users').insert([
            {
              email: email.toLowerCase().trim(),
              locked_at: new Date().toISOString(),
              attempts: 5,
              reason: 'open in new device'
            }
          ]);

          // 2. Delete all sessions for this email
          await supabase.from('active_sessions').delete().eq('email', email.toLowerCase().trim());

          // 3. Sign out this session
          await supabase.auth.signOut();

          // 4. Set localStorage for UI feedback
          localStorage.setItem('forceContactAdmin', 'true');
          localStorage.setItem(
            'logoutReason',
            'Your account has been locked because it was accessed from another device. Please contact the admin.'
          );

          // 5. Redirect to login
          window.location.href = '/it35-lab';
          return;
        }
      }

      // Check if user is locked
      const { data: lockedUser, error: lockedError } = await supabase
        .from('locked_users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (lockedError) {
        console.error('Error checking locked status:', lockedError);
        setIsLocked(false);
      } else if (lockedUser) {
        setAlertMessage('This account has been locked. Please contact an administrator.');
        setShowAlert(true);
        setIsLoading(false);
        setIsLocked(true);
        setShowContactAdminBtn(true);
        return;
      }

      setIsLocked(false);

      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setFailedAttempts(prev => prev + 1);
        setInputError(true);
        if (failedAttempts + 1 >= 5) {
          await lockUserAccount();
          setAlertMessage('Account locked due to too many failed attempts. Please contact an administrator.');
          setShowAlert(true);
          setIsLocked(true);
          setShowContactAdminBtn(true);
        }
        setIsLoading(false);
        return;
      }

      // Update or insert active session
      const sessionData = {
        email,
        ip_address: ip,
        device_id: deviceId,
        last_active: new Date().toISOString()
      };

      if (sessions && sessions.length > 0) {
        await supabase
          .from('active_sessions')
          .update(sessionData)
          .eq('email', email)
          .eq('device_id', deviceId);
      } else {
        await supabase
          .from('active_sessions')
          .insert([sessionData]);
      }

      // Reset failed attempts and error state
      setFailedAttempts(0);
      setInputError(false);

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Check for 2FA factors
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        
        if (factorsError) {
          setAlertMessage('Error checking 2FA status: ' + factorsError.message);
          setShowAlert(true);
          setIsLoading(false);
          return;
        }

        if (factors && factors.totp && factors.totp.length > 0) {
          setIs2FARequired(true);
          setTwoFALoading(true);
          const totpFactor = factors.totp[0];
          const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
            factorId: totpFactor.id
          });
          setTwoFALoading(false);
          if (challengeError) {
            setTwoFAError('Failed to start 2FA challenge: ' + challengeError.message);
            setShow2FAModal(true);
            setIsLoading(false);
            return;
          }
          if (challengeData) {
            setChallengeId(challengeData.id);
            setFactorId(totpFactor.id);
            setShow2FAModal(true);
            setIsLoading(false);
            return;
          }
        }
      }

      // If no 2FA required or verification successful
      setShowToast(true);
      setIsLoading(false);
      
      // Use requestAnimationFrame for smoother navigation
      requestAnimationFrame(() => {
        navigation.push('/it35-lab/app', 'forward', 'replace');
      });
    } catch (error) {
      console.error('Login error:', error);
      setAlertMessage('An error occurred during login: ' + (error as Error).message);
      setShowAlert(true);
      setIsLoading(false);
    }
  };

  // 2FA verification handler
  const handle2FAVerify = async () => {
    if (!twoFACode || twoFACode.length !== 6) {
      setAlertMessage('Please enter a valid 6-digit code');
      setShowAlert(true);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: twoFACode
      });

      if (error) {
        throw new Error(error.message);
      }

      setShow2FAModal(false);
      setShowToast(true);
      setIsLoading(false);
      
      // Use requestAnimationFrame for smoother navigation
      requestAnimationFrame(() => {
        navigation.push('/it35-lab/app', 'forward', 'replace');
      });
    } catch (error) {
      console.error('2FA verification error:', error);
      setAlertMessage('An error occurred during 2FA verification: ' + (error as Error).message);
      setShowAlert(true);
      setIsLoading(false);
    }
  };

  const handleUnlockRequest = async () => {
    await supabase.from('security_incidents').insert([
      {
        user_email: email,
        type: 'Unlock Request',
        status: 'pending',
        description: 'User requested account unlock',
        impact_level: 'Low',
        asset: '',
        timestamp: new Date().toISOString()
      }
    ]);
    setRequestSubmitted(true);
  };

  const handleForgotPassword = () => {
    setAlertMessage('Forgot password? Contact admin.');
    setShowAlert(true);
  };

  useEffect(() => {
    const fetchAssets = async () => {
      const { data } = await supabase.from('assets').select('*');
      if (data) setAssets(data);
    };
    fetchAssets();
  }, []);

  useEffect(() => {
    const reason = localStorage.getItem('logoutReason');
    if (reason) {
      setLogoutReason(reason);
      localStorage.removeItem('logoutReason');
    }
    if (localStorage.getItem('forceContactAdmin') === 'true') {
      setShowContactAdminBtn(true);
      setIsLocked(true);
      setAlertMessage('Your account was logged out because it was accessed from another device. If this was not you, please contact the admin.');
      setShowAlert(true);
      localStorage.removeItem('forceContactAdmin');
    }
  }, []);

  // On logout, delete session from active_sessions
  const handleLogoutSessionCleanup = async () => {
    const deviceId = getDeviceId();
    if (email && deviceId) {
      await supabase.from('active_sessions').delete().eq('email', email.toLowerCase().trim()).eq('device_id', deviceId);
    }
  };

  return (
    <IonPage>
      <IonContent className="login-gradient-bg" fullscreen>
        <div className="login-center-container">
          <div className="login-card-modern">
            <div className="login-user-icon">
              <IonIcon icon={personCircleOutline} style={{ fontSize: 90, color: '#fff' }} />
            </div>
            <h2 className="login-title-modern">Username</h2>
            <input
              className={`login-input-modern${inputError ? ' login-input-error' : ''}`}
              type="email"
              placeholder="Username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setInputError(false)}
            />
            <h2 className="login-title-modern" style={{ marginTop: 18 }}>Password</h2>
            <input
              className={`login-input-modern${inputError ? ' login-input-error' : ''}`}
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setInputError(false)}
            />
            {inputError && !isLocked && (
              <div className="login-error-message">Incorrect email or password. Please try again.</div>
            )}
            {isLocked && showContactAdminBtn && !requestSubmitted && (
              <div style={{ marginTop: 16 }}>
                <button className="login-btn-modern contact-admin-btn" onClick={handleUnlockRequest}>
                  Contact Admin
                </button>
              </div>
            )}
            {requestSubmitted && (
              <div style={{ marginTop: 16, color: 'green', textAlign: 'center' }}>
                Request submitted, please check email for admin response
              </div>
            )}
            <div className="login-row-options">
              <label className="login-remember-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <button className="login-forgot-btn" type="button" onClick={handleForgotPassword}>
                Forgot Password?
              </button>
            </div>
            <button
              className="login-btn-modern"
              type="button"
              onClick={handleLoginClick}
              disabled={isLoading}
            >
              LOGIN
            </button>
            <div className="register-link-modern">
              <a href="/it35-lab/register">Don't have an account? <strong>Register</strong></a>
            </div>
          </div>
        </div>
        {/* Floating help button for incident report */}
        <IonButton
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            borderRadius: '50%',
            width: 48,
            height: 48,
            minWidth: 48,
            minHeight: 48,
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            background: '#fff',
            color: '#1976d2',
            fontWeight: 'bold',
            fontSize: 24
          }}
          onClick={() => setShowIncidentModal(true)}
        >
          ?
        </IonButton>
        <IncidentReportModal
          isOpen={showIncidentModal}
          onClose={() => setShowIncidentModal(false)}
          userEmail={email}
        />
        {/* Alerts and Toasts remain as before */}
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => {
            setShowAlert(false);
            if (isLocked) setShowContactAdminBtn(true);
          }}
          header="Notification"
          message={alertMessage}
          buttons={['OK']}
        />
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message="Login successful! Redirecting..."
          duration={1500}
          position="top"
          color="primary"
        />
        <IonToast
          isOpen={!!logoutReason}
          onDidDismiss={() => setLogoutReason('')}
          message={logoutReason}
          duration={3000}
          position="top"
          color="danger"
        />
        <IonModal isOpen={show2FAModal || is2FARequired} backdropDismiss={false}>
          <IonContent className="ion-padding">
            {twoFALoading ? (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <h2>Two-Factor Authentication</h2>
                <p>Preparing 2FA challenge...</p>
                <IonButton expand="block" color="medium" onClick={() => { setShow2FAModal(false); setIs2FARequired(false); }}>Cancel</IonButton>
              </div>
            ) : twoFAError ? (
              <div style={{ color: 'red', textAlign: 'center', marginTop: 32 }}>
                <h2>Two-Factor Authentication</h2>
                <p>{twoFAError}</p>
                <IonButton expand="block" onClick={() => { setShow2FAModal(false); setIs2FARequired(false); }}>Close</IonButton>
                <IonButton expand="block" color="medium" onClick={() => { setShow2FAModal(false); setIs2FARequired(false); }}>Cancel</IonButton>
              </div>
            ) : (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <h2>Enter your 2FA code</h2>
                <IonInput
                  value={twoFACode}
                  onIonChange={e => setTwoFACode(e.detail.value!)}
                  placeholder="6-digit code"
                  type="number"
                  style={{ margin: '16px 0' }}
                />
                <IonButton expand="block" onClick={handle2FAVerify} disabled={isLoading || twoFACode.length !== 6}>
                  Verify
                </IonButton>
                <IonButton expand="block" color="medium" onClick={() => { setShow2FAModal(false); setIs2FARequired(false); }}>Cancel</IonButton>
              </div>
            )}
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Login;


