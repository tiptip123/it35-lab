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
  IonLabel
} from '@ionic/react';
import { personCircleOutline } from 'ionicons/icons'; // Changed to a more professional user icon
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';

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

  const [isLocked, setIsLocked] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const [incidentType, setIncidentType] = useState('Phishing');
  const [impactLevel, setImpactLevel] = useState('Low');
  const [asset, setAsset] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [incidentDescription, setIncidentDescription] = useState('');

  const [logoutReason, setLogoutReason] = useState('');

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
    const { error } = await supabase
      .from('locked_users')
      .insert([
        {
          email,
          locked_at: new Date().toISOString(),
          attempts: failedAttempts
        }
      ]);

    if (!error) {
      await reportIncident();
    }
  };

  const doLogin = async () => {
    setIsLoading(true);
    setShow2FAModal(false);
    setTwoFACode('');
    setChallengeId('');
    setFactorId('');

    // Check if user is locked
    const { data: lockedUser } = await supabase
      .from('locked_users')
      .select('*')
      .eq('email', email)
      .single();

    if (lockedUser) {
      setAlertMessage('This account has been locked. Please contact an administrator.');
      setShowAlert(true);
      setIsLoading(false);
      setIsLocked(true);
      return;
    }

    setIsLocked(false);
    // Normal user login
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setFailedAttempts(prev => prev + 1);
      setInputError(true);
      if (failedAttempts + 1 >= 5) {
        await lockUserAccount();
        setAlertMessage('Account locked due to too many failed attempts. Please contact an administrator.');
        setShowAlert(true);
      }
      setIsLoading(false);
      return;
    }

    // Reset failed attempts and error state on successful login
    setFailedAttempts(0);
    setInputError(false);

    // Step 2: Check if MFA challenge is required
    if (data && 'mfa' in data && (data as any).mfa) {
      const mfaData = (data as any).mfa;
      setChallengeId(mfaData.id);
      // Get the user's TOTP factorId
      const fetchedFactorId = await fetchTOTPFactorId();
      setFactorId(fetchedFactorId);
      setShow2FAModal(true);
      setIsLoading(false);
      return;
    }

    // Step 3: Success, no 2FA required
    setShowToast(true);
    setIsLoading(false);
    setTimeout(() => {
      navigation.push('/it35-lab/app', 'forward', 'replace');
    }, 300);
  };

  // 2FA verification handler
  const handle2FAVerify = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: twoFACode
    });
    if (error) {
      setAlertMessage(error.message);
      setShowAlert(true);
      setIsLoading(false);
      return;
    }
    setShow2FAModal(false);
    setShowToast(true);
    setIsLoading(false);
    setTimeout(() => {
      navigation.push('/it35-lab/app', 'forward', 'replace');
    }, 300);
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
  }, []);

  return (
    <IonPage>
      <IonContent className="ion-padding" color="light">
        <div className="login-container">
          <div className="login-card">
            <div className="logo-container">
              <IonAvatar className="logo-avatar">
                <IonIcon 
                  icon={personCircleOutline}  // Changed to a more professional user icon
                  className="logo-icon"
                />
              </IonAvatar>
            </div>
            
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Please sign in to continue</p>
            
            <div className="form-group">
              <IonInput
                className="custom-input"
                label="Email" 
                labelPlacement="floating" 
                fill="outline"
                type="email"
                placeholder="Enter Email"
                value={email}
                onIonChange={e => setEmail(e.detail.value!)}
                style={{ '--color': '#000000', '--border-color': inputError ? 'red' : '#e2e8f0' }}
              />
            </div>
            
            <div className="form-group">
              <IonInput
                className="custom-input"
                fill="outline"
                type="password"
                placeholder="Password"
                value={password}
                onIonChange={e => setPassword(e.detail.value!)}
                style={{ '--color': '#000000', '--border-color': inputError ? 'red' : '#e2e8f0' }}
              >
                <IonInputPasswordToggle slot="end"></IonInputPasswordToggle>
              </IonInput>
            </div>
            
            <IonButton 
              className="login-button"
              onClick={handleLoginClick}
              expand="block" 
              shape="round"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </IonButton>
            
            {isLocked && !requestSubmitted && (
              <div style={{ marginTop: 16 }}>
                <IonButton color="medium" expand="block" onClick={handleUnlockRequest}>
                  Contact Admin
                </IonButton>
              </div>
            )}
            {requestSubmitted && (
              <div style={{ marginTop: 16, color: 'green', textAlign: 'center' }}>
                Request submitted, please check email for admin response
              </div>
            )}
            
            <div className="register-link">
              <IonButton 
                routerLink="/it35-lab/register" 
                fill="clear" 
                size="small"
                className="register-button"
              >
                Don't have an account? <strong>Register</strong>
              </IonButton>
            </div>
          </div>
        </div>

        {/* 2FA Modal */}
        <IonAlert
          isOpen={show2FAModal}
          onDidDismiss={() => setShow2FAModal(false)}
          header="Two-Factor Authentication Required"
          message={
            `<div>Please enter the 6-digit code from your authenticator app.</div>` +
            `<input id='totp-input' type='number' placeholder='Enter 2FA code' style='width: 100%; margin-top: 10px; padding: 8px;' />`
          }
          buttons={[
            {
              text: 'Verify',
              handler: async () => {
                // Get the value from the input
                const input = document.getElementById('totp-input') as HTMLInputElement;
                setTwoFACode(input.value);
                // Wait for state to update, then call verify
                setTimeout(handle2FAVerify, 100);
                return false;
              }
            },
            {
              text: 'Cancel',
              role: 'cancel',
              handler: () => setShow2FAModal(false)
            }
          ]}
          // Prevent closing by clicking outside
          backdropDismiss={false}
        />

        {/* Reusable AlertBox Component */}
        <AlertBox message={alertMessage} isOpen={showAlert} onClose={() => setShowAlert(false)} />

        {/* IonToast for success message */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message="Login successful! Redirecting..."
          duration={1500}
          position="top"
          color="primary"
        />

        {/* IonToast for logout reason */}
        <IonToast
          isOpen={!!logoutReason}
          onDidDismiss={() => setLogoutReason('')}
          message={logoutReason}
          duration={3000}
          position="top"
          color="danger"
        />

        {/* Incident Reporting Form UI */}
        <IonCard style={{ marginTop: 24 }}>
          <IonCardHeader>
            <IonCardTitle>Report Security Incident</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonLabel position="stacked">Incident Type</IonLabel>
            <IonSelect value={incidentType} onIonChange={e => setIncidentType(e.detail.value)}>
              <IonSelectOption value="Phishing">Phishing</IonSelectOption>
              <IonSelectOption value="Data Breach">Data Breach</IonSelectOption>
              <IonSelectOption value="Unauthorized Access">Unauthorized Access</IonSelectOption>
              <IonSelectOption value="Malware">Malware</IonSelectOption>
              <IonSelectOption value="Other">Other</IonSelectOption>
            </IonSelect>
            <IonLabel position="stacked" style={{ marginTop: 16 }}>Impact Level</IonLabel>
            <IonSelect value={impactLevel} onIonChange={e => setImpactLevel(e.detail.value)}>
              <IonSelectOption value="Low">Low</IonSelectOption>
              <IonSelectOption value="Medium">Medium</IonSelectOption>
              <IonSelectOption value="High">High</IonSelectOption>
              <IonSelectOption value="Critical">Critical</IonSelectOption>
            </IonSelect>
            <IonLabel position="stacked" style={{ marginTop: 16 }}>Affected Asset</IonLabel>
            <IonSelect value={asset} onIonChange={e => setAsset(e.detail.value)}>
              {assets.map(a => (
                <IonSelectOption key={a.id} value={a.name}>{a.name}</IonSelectOption>
              ))}
            </IonSelect>
            <IonLabel position="stacked" style={{ marginTop: 16 }}>Description</IonLabel>
            <IonTextarea value={incidentDescription} onIonChange={e => setIncidentDescription(e.detail.value!)} />
            <IonButton expand="block" style={{ marginTop: 24 }} onClick={reportIncident} disabled={isLoading}>
              Report Incident
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default Login;


