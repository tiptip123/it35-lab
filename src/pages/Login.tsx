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
  useIonRouter
} from '@ionic/react';
import { personCircleOutline } from 'ionicons/icons'; // Changed to a more professional user icon
import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

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

  const doLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setAlertMessage(error.message);
      setShowAlert(true);
      setIsLoading(false);
      return;
    }

    setShowToast(true);
    setIsLoading(false);
    setTimeout(() => {
      navigation.push('/it35-lab/app', 'forward', 'replace');
    }, 300);
  };
  
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
                style={{ '--color': '#000000' }}  // Added black text color
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
                style={{ '--color': '#000000' }}  // Added black text color
              >
                <IonInputPasswordToggle slot="end"></IonInputPasswordToggle>
              </IonInput>
            </div>
            
            <IonButton 
              className="login-button"
              onClick={doLogin} 
              expand="block" 
              shape="round"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </IonButton>
            
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
      </IonContent>
    </IonPage>
  );
};

export default Login;


const styles = `
  .login-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
    padding: 20px;
  }
  
  .login-card {
    width: 100%;
    max-width: 400px;
    background: white;
    border-radius: 16px;
    padding: 32px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }
  
  .logo-container {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
  }
  
  .logo-avatar {
    width: 100px;
    height: 100px;
    background: #f8f9fa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .logo-icon {
    font-size: 80px;
    color: #5e72e4;
  }
  
  .login-title {
    text-align: center;
    color: #2d3748;
    margin-bottom: 8px;
    font-size: 24px;
    font-weight: 600;
  }
  
  .login-subtitle {
    text-align: center;
    color: #718096;
    margin-bottom: 32px;
    font-size: 14px;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  .custom-input {
    --border-radius: 8px;
    --border-color: #e2e8f0;
    --highlight-color-focused: #5e72e4;
    --color: #000000; /* Ensures text is black */
  }
  
  .login-button {
    --background: #5e72e4;
    --background-activated: #4a5acf;
    --background-focused: #4a5acf;
    --background-hover: #4a5acf;
    margin-top: 16px;
    height: 48px;
    font-weight: 600;
     --color: #000000; 
  }
  
  .register-link {
    text-align: center;
    margin-top: 24px;
  }
  
  .register-button {
    --color: #718096;
    font-size: 14px;
  }
`;

// Inject styles
const styleElement = document.createElement('style');
styleElement.innerHTML = styles;
document.head.appendChild(styleElement);